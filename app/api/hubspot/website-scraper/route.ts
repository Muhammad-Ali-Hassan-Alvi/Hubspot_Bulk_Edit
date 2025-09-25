import { type NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  console.log('=== Website Scraper API Called ===')

  try {
    const { domain } = await request.json()

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid domain is required' },
        { status: 400 }
      )
    }

    console.log(`Scraping website: ${domain}`)

    // Ensure domain has protocol
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`
    let discoveredPages: string[] = []

    // Step 1: Try to get sitemap.xml
    console.log('\n🗺️ Step 1: Looking for sitemap...')
    try {
      const sitemapUrl = `${baseUrl}/sitemap.xml`
      const sitemapResponse = await fetch(sitemapUrl)

      if (sitemapResponse.ok) {
        const sitemapText = await sitemapResponse.text()
        const $ = cheerio.load(sitemapText, { xmlMode: true })

        $('url loc').each((_, element) => {
          const url = $(element).text().trim()
          if (url && url.includes(domain)) {
            discoveredPages.push(url)
          }
        })

        console.log(`✅ Found ${discoveredPages.length} pages in sitemap`)
      } else {
        console.log('❌ No sitemap.xml found')
      }
    } catch (sitemapError) {
      console.log('❌ Sitemap fetch failed:', sitemapError)
    }

    // Step 2: If no sitemap, crawl homepage for links
    if (discoveredPages.length === 0) {
      console.log('\n🔗 Step 2: Crawling homepage for links...')
      try {
        const homepageResponse = await fetch(baseUrl)
        if (homepageResponse.ok) {
          const homepageHtml = await homepageResponse.text()
          const $ = cheerio.load(homepageHtml)

          // Add homepage itself
          discoveredPages.push(baseUrl)

          // Find internal links
          $('a[href]').each((_, element) => {
            const href = $(element).attr('href')
            if (href) {
              let fullUrl = ''
              if (href.startsWith('/')) {
                fullUrl = baseUrl + href
              } else if (href.startsWith('http') && href.includes(domain)) {
                fullUrl = href
              }

              if (fullUrl && !discoveredPages.includes(fullUrl)) {
                discoveredPages.push(fullUrl)
              }
            }
          })

          console.log(`✅ Found ${discoveredPages.length} pages from homepage crawl`)
        }
      } catch (crawlError) {
        console.log('❌ Homepage crawl failed:', crawlError)
      }
    }

    // Limit to first 20 pages for demo
    discoveredPages = discoveredPages.slice(0, 20)

    // Step 3: Scrape content from discovered pages
    console.log(`\n📄 Step 3: Scraping content from ${discoveredPages.length} pages...`)
    const scrapedPages = []

    for (let i = 0; i < discoveredPages.length; i++) {
      const pageUrl = discoveredPages[i]
      console.log(`Scraping page ${i + 1}/${discoveredPages.length}: ${pageUrl}`)

      try {
        const pageResponse = await fetch(pageUrl)
        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text()
          const $ = cheerio.load(pageHtml)

          // Extract page content
          const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page'
          const metaDescription = $('meta[name="description"]').attr('content') || ''
          const h1 = $('h1').first().text().trim() || ''

          // Get main content (try different selectors)
          let bodyText = ''
          const contentSelectors = [
            'main',
            '.content',
            '#content',
            'article',
            '.post-content',
            'body',
          ]
          for (const selector of contentSelectors) {
            const content = $(selector).first().text().trim()
            if (content && content.length > bodyText.length) {
              bodyText = content
            }
          }

          // Fallback to body text
          if (!bodyText) {
            bodyText = $('body').text().trim()
          }

          // Clean up text (remove extra whitespace)
          bodyText = bodyText.replace(/\s+/g, ' ').substring(0, 2000) // Limit to 2000 chars

          const scrapedPage = {
            id: `scraped_${i + 1}`,
            name: title,
            url: pageUrl,
            slug: new URL(pageUrl).pathname,
            domain: new URL(pageUrl).hostname,
            language: $('html').attr('lang') || 'en',
            updatedAt: new Date().toISOString(),
            status: 'SCRAPED',
            content: {
              title,
              metaDescription,
              h1,
              bodyText: bodyText.substring(0, 1000), // Limit for storage
              wordCount: bodyText.split(' ').length,
              lastScraped: new Date().toISOString(),
            },
          }

          scrapedPages.push(scrapedPage)
          console.log(`✅ Scraped: ${title} (${bodyText.length} chars)`)
        } else {
          console.log(`❌ Failed to fetch ${pageUrl}: ${pageResponse.status}`)
        }
      } catch (pageError) {
        console.log(`❌ Error scraping ${pageUrl}:`, pageError)
      }
    }

    console.log(`\n✅ Successfully scraped ${scrapedPages.length} pages`)

    return NextResponse.json({
      success: true,
      pages: scrapedPages,
      total: scrapedPages.length,
      domain,
      scrapingMethod: discoveredPages.length > 1 ? 'sitemap' : 'homepage-crawl',
      summary: {
        totalDiscovered: discoveredPages.length,
        successfullyScraped: scrapedPages.length,
        averageContentLength: Math.round(
          scrapedPages.reduce((sum, page) => sum + (page.content.bodyText?.length || 0), 0) /
            scrapedPages.length
        ),
      },
    })
  } catch (error) {
    console.error('Website scraper error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scrape website',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
