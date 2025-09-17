import { NextResponse } from 'next/server'

const HEADERS_BACKOFF_MS = 8000
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

// In-memory cache to prevent excessive API calls
let cachedHeaders: any = null
let cacheTimestamp: number = 0

const types = [
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
async function fetchFirstObject(urls: string[], headers: Record<string, string>) {
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i], { headers })

      if (res.status === 200) {
        const js = await res.json()
        if (Array.isArray(js.results) && js.results.length) return js.results[0]
        if (js && !js.results) return js // single object case
      } else if (res.status === 429) {
        await new Promise(r => setTimeout(r, HEADERS_BACKOFF_MS))
        i-- // retry
      }
    } catch {
      // try next
    }
  }
  return null
}

function detectType(v: any) {
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

function compositeKey(name: string, type: string) {
  return `${name}||${type || ''}`
}

// --- GET route ---
export async function GET(request: Request) {
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
    return NextResponse.json(
      { error: 'Could not fetch any headers (check token/scopes).' },
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

  return NextResponse.json(result)
}
