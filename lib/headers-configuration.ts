import { NextResponse } from 'next/server'

export const HEADERS_BACKOFF_MS = 8000
export const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

// In-memory cache to prevent excessive API calls
export let cachedHeaders: any = null
export let cacheTimestamp: number = 0

export const types = [
  { label: 'Website Page', urls: ['https://api.hubapi.com/cms/v3/pages/site-pages?limit=1'] },
  { label: 'Landing Page', urls: ['https://api.hubapi.com/cms/v3/pages/landing-pages?limit=1'] },
  { label: 'Blog Post', urls: ['https://api.hubapi.com/cms/v3/blogs/posts?limit=1'] },
  { label: 'Blogs', urls: ['https://api.hubapi.com/cms/v3/blog-settings/settings?limit=1'] },
  { label: 'Tags', urls: ['https://api.hubapi.com/cms/v3/blogs/tags?limit=1'] },
  { label: 'Authors', urls: ['https://api.hubapi.com/cms/v3/blogs/authors?limit=1'] },
  { label: 'URL Redirects', urls: ['https://api.hubapi.com/cms/v3/url-redirects?limit=1'] },
  { label: 'HubDB Tables', urls: ['https://api.hubapi.com/cms/v3/hubdb/tables?limit=1'] },
]

// --- Helpers ---
export async function fetchFirstObject(urls: string[], headers: Record<string, string>) {
  let lastError: Error | null = null

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    let retryCount = 0
    const maxRetries = 3

    while (retryCount <= maxRetries) {
      let timeoutId: NodeJS.Timeout | undefined

      try {
        console.log(`Fetching from: ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`)

        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

        const res = await fetch(url, {
          headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (res.status === 200) {
          const js = await res.json()
          if (Array.isArray(js.results) && js.results.length) {
            console.log(`Successfully fetched data from: ${url}`)
            return js.results[0]
          }
          if (js && !js.results) {
            console.log(`Successfully fetched single object from: ${url}`)
            return js // single object case
          }
        } else if (res.status === 429) {
          const waitTime = HEADERS_BACKOFF_MS * (retryCount + 1) // Exponential backoff
          console.log(`Rate limited (429) on ${url}, waiting ${waitTime}ms before retry`)
          await new Promise(r => setTimeout(r, waitTime))
          retryCount++
          continue
        } else {
          console.error(`HTTP ${res.status} error from ${url}: ${res.statusText}`)
          lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
        }

        break // Exit retry loop if we get here (success or non-retryable error)
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error fetching from ${url} (attempt ${retryCount + 1}): ${errorMessage}`)
        lastError = error instanceof Error ? error : new Error(errorMessage)

        if (retryCount < maxRetries) {
          const waitTime = HEADERS_BACKOFF_MS * (retryCount + 1)
          console.log(`Retrying in ${waitTime}ms...`)
          await new Promise(r => setTimeout(r, waitTime))
          retryCount++
        } else {
          break // Max retries reached, try next URL
        }
      }
    }
  }

  console.error('All URLs failed to fetch data. Last error:', lastError?.message)
  return null
}

export function detectType(v: any) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return 'array'
  if (typeof v === 'object') return 'object'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return 'date-time'
    return 'string'
  }
  return typeof v
}

export function compositeKey(name: string, type: string) {
  return `${name}||${type || ''}`
}

export async function refreshHeaders(request: Request) {
  const url = new URL(request.url)
  const forceRefresh = url.searchParams.get('force') === 'true'

  // Check cache first to prevent excessive API calls
  const now = Date.now()
  if (!forceRefresh && cachedHeaders && now - cacheTimestamp < CACHE_TTL_MS) {
    console.log('Returning cached headers to prevent excessive API calls')
    return NextResponse.json(cachedHeaders)
  }

  const headersAuth = {
    Authorization: `Bearer ${process.env.HUBSPOT_PAT_FOR_SMUVES_ENTERPRISE_DEVELOPMENT_ACCOUNT}`,
    'Content-Type': 'application/json',
  }

  // 1) Fetch one sample per type
  const samples: { type: string; obj: Record<string, any> }[] = []
  for (const t of types) {
    const sample = await fetchFirstObject(t.urls, headersAuth)
    if (sample) samples.push({ type: t.label, obj: sample })
  }

  if (!samples.length) {
    console.error('Failed to fetch any samples from HubSpot API endpoints')
    return NextResponse.json(
      {
        error:
          'Could not fetch any headers from HubSpot API. This may be due to network issues, rate limiting, or authentication problems. Please try again in a few minutes.',
        details: 'No samples could be retrieved from any HubSpot endpoint',
      },
      { status: 500 }
    )
  }

  // 2) Build headers matrix
  const matrix: Record<string, { header: string; headerType: string; presence: Set<string> }> = {}

  for (const { type, obj } of samples) {
    Object.keys(obj || {}).forEach(h => {
      const t = detectType(obj[h])
      const k = compositeKey(h, t)
      if (!matrix[k]) matrix[k] = { header: h, headerType: t, presence: new Set() }
      matrix[k].presence.add(type)
    })
  }

  // 3) Transform matrix into output object
  const PRESENCE_LABELS = types.map(t => t.label)

  const headersOutput = Object.keys(matrix).map(k => {
    const m = matrix[k]
    return {
      header: m.header,
      headerType: m.headerType,
      presence: PRESENCE_LABELS.reduce(
        (acc, lbl) => {
          acc[lbl] = m.presence.has(lbl)
          return acc
        },
        {} as Record<string, boolean>
      ),
    }
  })

  console.log('headers count', headersOutput.length)

  // Cache the result to prevent excessive API calls
  const result = { headers: headersOutput }
  cachedHeaders = result
  cacheTimestamp = Date.now()
  return result
}
