import { type NextRequest, NextResponse } from 'next/server'

const dropdownCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Comprehensive HubSpot language list provided by user
const HUBSPOT_LANGUAGES = [
  'af',
  'af-na',
  'af-za',
  'agq',
  'agq-cm',
  'ak',
  'ak-gh',
  'am',
  'am-et',
  'ar',
  'ar-001',
  'ar-ae',
  'ar-bh',
  'ar-dj',
  'ar-dz',
  'ar-eg',
  'ar-eh',
  'ar-er',
  'ar-il',
  'ar-iq',
  'ar-jo',
  'ar-km',
  'ar-kw',
  'ar-lb',
  'ar-ly',
  'ar-ma',
  'ar-mr',
  'ar-om',
  'ar-ps',
  'ar-qa',
  'ar-sa',
  'ar-sd',
  'ar-so',
  'ar-ss',
  'ar-sy',
  'ar-td',
  'ar-tn',
  'ar-ye',
  'as',
  'as-in',
  'asa',
  'asa-tz',
  'ast',
  'ast-es',
  'az',
  'az-az',
  'bas',
  'bas-cm',
  'be',
  'be-by',
  'bem',
  'bem-zm',
  'bez',
  'bez-tz',
  'bg',
  'bg-bg',
  'bm',
  'bm-ml',
  'bn',
  'bn-bd',
  'bn-in',
  'bo',
  'bo-cn',
  'bo-in',
  'br',
  'br-fr',
  'brx',
  'brx-in',
  'bs',
  'bs-ba',
  'ca',
  'ca-ad',
  'ca-es',
  'ca-fr',
  'ca-it',
  'ccp',
  'ccp-bd',
  'ccp-in',
  'ce',
  'ce-ru',
  'ceb',
  'ceb-ph',
  'cgg',
  'cgg-ug',
  'chr',
  'chr-us',
  'ckb',
  'ckb-iq',
  'ckb-ir',
  'cs',
  'cs-cz',
  'cu',
  'cu-ru',
  'cy',
  'cy-gb',
  'da',
  'da-dk',
  'da-gl',
  'dav',
  'dav-ke',
  'de',
  'de-at',
  'de-be',
  'de-ch',
  'de-de',
  'de-gr',
  'de-it',
  'de-li',
  'de-lu',
  'dje',
  'dje-ne',
  'doi',
  'doi-in',
  'dsb',
  'dsb-de',
  'dua',
  'dua-cm',
  'dyo',
  'dyo-sn',
  'dz',
  'dz-bt',
  'ebu',
  'ebu-ke',
  'ee',
  'ee-gh',
  'ee-tg',
  'el',
  'el-cy',
  'el-gr',
  'en',
  'en-001',
  'en-150',
  'en-ae',
  'en-ag',
  'en-ai',
  'en-as',
  'en-at',
  'en-au',
  'en-bb',
  'en-be',
  'en-bi',
  'en-bm',
  'en-bs',
  'en-bw',
  'en-bz',
  'en-ca',
  'en-cc',
  'en-ch',
  'en-ck',
  'en-cm',
  'en-cn',
  'en-cx',
  'en-cy',
  'en-de',
  'en-dg',
  'en-dk',
  'en-dm',
  'en-er',
  'en-fi',
  'en-fj',
  'en-fk',
  'en-fm',
  'en-gb',
  'en-gd',
  'en-gg',
  'en-gh',
  'en-gi',
  'en-gm',
  'en-gu',
  'en-gy',
  'en-hk',
  'en-ie',
  'en-il',
  'en-im',
  'en-in',
  'en-io',
  'en-je',
  'en-jm',
  'en-ke',
  'en-ki',
  'en-kn',
  'en-ky',
  'en-lc',
  'en-lr',
  'en-ls',
  'en-lu',
  'en-mg',
  'en-mh',
  'en-mo',
  'en-mp',
  'en-ms',
  'en-mt',
  'en-mu',
  'en-mw',
  'en-mx',
  'en-my',
  'en-na',
  'en-nf',
  'en-ng',
  'en-nl',
  'en-nr',
  'en-nu',
  'en-nz',
  'en-pg',
  'en-ph',
  'en-pk',
  'en-pn',
  'en-pr',
  'en-pw',
  'en-rw',
  'en-sb',
  'en-sc',
  'en-sd',
  'en-se',
  'en-sg',
  'en-sh',
  'en-si',
  'en-sl',
  'en-ss',
  'en-sx',
  'en-sz',
  'en-tc',
  'en-tk',
  'en-to',
  'en-tt',
  'en-tv',
  'en-tz',
  'en-ug',
  'en-um',
  'en-us',
  'en-vc',
  'en-vg',
  'en-vi',
  'en-vu',
  'en-ws',
  'en-za',
  'en-zm',
  'en-zw',
  'eo',
  'eo-001',
  'es',
  'es-419',
  'es-ar',
  'es-bo',
  'es-br',
  'es-bz',
  'es-cl',
  'es-co',
  'es-cr',
  'es-cu',
  'es-do',
  'es-ea',
  'es-ec',
  'es-es',
  'es-gq',
  'es-gt',
  'es-hn',
  'es-ic',
  'es-mx',
  'es-ni',
  'es-pa',
  'es-pe',
  'es-ph',
  'es-pr',
  'es-py',
  'es-sv',
  'es-us',
  'es-uy',
  'es-ve',
  'et',
  'et-ee',
  'eu',
  'eu-es',
  'ewo',
  'ewo-cm',
  'fa',
  'fa-af',
  'fa-ir',
  'ff',
  'ff-bf',
  'ff-cm',
  'ff-gh',
  'ff-gm',
  'ff-gn',
  'ff-gw',
  'ff-lr',
  'ff-mr',
  'ff-ne',
  'ff-ng',
  'ff-sl',
  'ff-sn',
  'fi',
  'fi-fi',
  'fil',
  'fil-ph',
  'fo',
  'fo-dk',
  'fo-fo',
  'fr',
  'fr-be',
  'fr-bf',
  'fr-bi',
  'fr-bj',
  'fr-bl',
  'fr-ca',
  'fr-cd',
  'fr-cf',
  'fr-cg',
  'fr-ch',
  'fr-ci',
  'fr-cm',
  'fr-dj',
  'fr-dz',
  'fr-fr',
  'fr-ga',
  'fr-gf',
  'fr-gn',
  'fr-gp',
  'fr-gq',
  'fr-ht',
  'fr-km',
  'fr-lu',
  'fr-ma',
  'fr-mc',
  'fr-mf',
  'fr-mg',
  'fr-ml',
  'fr-mq',
  'fr-mr',
  'fr-mu',
  'fr-nc',
  'fr-ne',
  'fr-pf',
  'fr-pm',
  'fr-re',
  'fr-rw',
  'fr-sc',
  'fr-sn',
  'fr-sy',
  'fr-td',
  'fr-tg',
  'fr-tn',
  'fr-vu',
  'fr-wf',
  'fr-yt',
  'fur',
  'fur-it',
  'fy',
  'fy-nl',
  'ga',
  'ga-gb',
  'ga-ie',
  'gd',
  'gd-gb',
  'gl',
  'gl-es',
  'gsw',
  'gsw-ch',
  'gsw-fr',
  'gsw-li',
  'gu',
  'gu-in',
  'guz',
  'guz-ke',
  'gv',
  'gv-im',
  'ha',
  'ha-gh',
  'ha-ne',
  'ha-ng',
  'haw',
  'haw-us',
  'he',
  'hi',
  'hi-in',
  'hr',
  'hr-ba',
  'hr-hr',
  'hsb',
  'hsb-de',
  'hu',
  'hu-hu',
  'hy',
  'hy-am',
  'ia',
  'ia-001',
  'id',
  'ig',
  'ig-ng',
  'ii',
  'ii-cn',
  'id-id',
  'is',
  'is-is',
  'it',
  'it-ch',
  'it-it',
  'it-sm',
  'it-va',
  'he-il',
  'ja',
  'ja-jp',
  'jgo',
  'jgo-cm',
  'yi',
  'yi-001',
  'jmc',
  'jmc-tz',
  'jv',
  'jv-id',
  'ka',
  'ka-ge',
  'kab',
  'kab-dz',
  'kam',
  'kam-ke',
  'kde',
  'kde-tz',
  'kea',
  'kea-cv',
  'khq',
  'khq-ml',
  'ki',
  'ki-ke',
  'kk',
  'kk-kz',
  'kkj',
  'kkj-cm',
  'kl',
  'kl-gl',
  'kln',
  'kln-ke',
  'km',
  'km-kh',
  'kn',
  'kn-in',
  'ko',
  'ko-kp',
  'ko-kr',
  'kok',
  'kok-in',
  'ks',
  'ks-in',
  'ksb',
  'ksb-tz',
  'ksf',
  'ksf-cm',
  'ksh',
  'ksh-de',
  'kw',
  'kw-gb',
  'ku',
  'ku-tr',
  'ky',
  'ky-kg',
  'lag',
  'lag-tz',
  'lb',
  'lb-lu',
  'lg',
  'lg-ug',
  'lkt',
  'lkt-us',
  'ln',
  'ln-ao',
  'ln-cd',
  'ln-cf',
  'ln-cg',
  'lo',
  'lo-la',
  'lrc',
  'lrc-iq',
  'lrc-ir',
  'lt',
  'lt-lt',
  'lu',
  'lu-cd',
  'luo',
  'luo-ke',
  'luy',
  'luy-ke',
  'lv',
  'lv-lv',
  'mai',
  'mai-in',
  'mas',
  'mas-ke',
  'mas-tz',
  'mer',
  'mer-ke',
  'mfe',
  'mfe-mu',
  'mg',
  'mg-mg',
  'mgh',
  'mgh-mz',
  'mgo',
  'mgo-cm',
  'mi',
  'mi-nz',
  'mk',
  'mk-mk',
  'ml',
  'ml-in',
  'mn',
  'mn-mn',
  'mni',
  'mni-in',
  'mr',
  'mr-in',
  'ms',
  'ms-bn',
  'ms-id',
  'ms-my',
  'ms-sg',
  'mt',
  'mt-mt',
  'mua',
  'mua-cm',
  'my',
  'my-mm',
  'mzn',
  'mzn-ir',
  'naq',
  'naq-na',
  'nb',
  'nb-no',
  'nb-sj',
  'nd',
  'nd-zw',
  'nds',
  'nds-de',
  'nds-nl',
  'ne',
  'ne-in',
  'ne-np',
  'nl',
  'nl-aw',
  'nl-be',
  'nl-ch',
  'nl-bq',
  'nl-cw',
  'nl-lu',
  'nl-nl',
  'nl-sr',
  'nl-sx',
  'nmg',
  'nmg-cm',
  'nn',
  'nn-no',
  'nnh',
  'nnh-cm',
  'no',
  'no-no',
  'nus',
  'nus-ss',
  'nyn',
  'nyn-ug',
  'om',
  'om-et',
  'om-ke',
  'or',
  'or-in',
  'os',
  'os-ge',
  'os-ru',
  'pa',
  'pa-in',
  'pa-pk',
  'pcm',
  'pcm-ng',
  'pl',
  'pl-pl',
  'prg',
  'prg-001',
  'ps',
  'ps-af',
  'ps-pk',
  'pt',
  'pt-ao',
  'pt-br',
  'pt-ch',
  'pt-cv',
  'pt-gq',
  'pt-gw',
  'pt-lu',
  'pt-mo',
  'pt-mz',
  'pt-pt',
  'pt-st',
  'pt-tl',
  'qu',
  'qu-bo',
  'qu-ec',
  'qu-pe',
  'rm',
  'rm-ch',
  'rn',
  'rn-bi',
  'ro',
  'ro-md',
  'ro-ro',
  'rof',
  'rof-tz',
  'ru',
  'ru-by',
  'ru-kg',
  'ru-kz',
  'ru-md',
  'ru-ru',
  'ru-ua',
  'rw',
  'rw-rw',
  'rwk',
  'rwk-tz',
  'sa',
  'sa-in',
  'sah',
  'sah-ru',
  'saq',
  'saq-ke',
  'sat',
  'sat-in',
  'sbp',
  'sbp-tz',
  'sd',
  'sd-in',
  'sd-pk',
  'se',
  'se-fi',
  'se-no',
  'se-se',
  'seh',
  'seh-mz',
  'ses',
  'ses-ml',
  'sg',
  'sg-cf',
  'shi',
  'shi-ma',
  'si',
  'si-lk',
  'sk',
  'sk-sk',
  'sl',
  'sl-si',
  'smn',
  'smn-fi',
  'sn',
  'sn-zw',
  'so',
  'so-dj',
  'so-et',
  'so-ke',
  'so-so',
  'sq',
  'sq-al',
  'sq-mk',
  'sq-xk',
  'sr',
  'sr-ba',
  'sr-cs',
  'sr-me',
  'sr-rs',
  'sr-xk',
  'su',
  'su-id',
  'sv',
  'sv-ax',
  'sv-fi',
  'sv-se',
  'sw',
  'sw-cd',
  'sw-ke',
  'sw-tz',
  'sw-ug',
  'sy',
  'ta',
  'ta-in',
  'ta-lk',
  'ta-my',
  'ta-sg',
  'te',
  'te-in',
  'teo',
  'teo-ke',
  'teo-ug',
  'tg',
  'tg-tj',
  'th',
  'th-th',
  'ti',
  'ti-er',
  'ti-et',
  'tk',
  'tk-tm',
  'tl',
  'to',
  'to-to',
  'tr',
  'tr-cy',
  'tr-tr',
  'tt',
  'tt-ru',
  'twq',
  'twq-ne',
  'tzm',
  'tzm-ma',
  'ug',
  'ug-cn',
  'uk',
  'uk-ua',
  'ur',
  'ur-in',
  'ur-pk',
  'uz',
  'uz-af',
  'uz-uz',
  'vai',
  'vai-lr',
  'vi',
  'vi-vn',
  'vo',
  'vo-001',
  'vun',
  'vun-tz',
  'wae',
  'wae-ch',
  'wo',
  'wo-sn',
  'xh',
  'xh-za',
  'xog',
  'xog-ug',
  'yav',
  'yav-cm',
  'yo',
  'yo-bj',
  'yo-ng',
  'yue',
  'yue-cn',
  'yue-hk',
  'zgh',
  'zgh-ma',
  'zh',
  'zh-cn',
  'zh-hk',
  'zh-mo',
  'zh-sg',
  'zh-tw',
  'zh-hans',
  'zh-hant',
  'zu',
  'zu-za',
]

async function fetchAllFromEndpoint(url: string, headers: HeadersInit): Promise<any[]> {
  const allResults: any[] = []
  let currentUrl: string | null = url

  while (currentUrl) {
    try {
      const response: Response = await fetch(currentUrl, { headers })
      if (!response.ok) {
        console.error(`Failed to fetch from ${currentUrl}: ${response.status}`)
        break
      }

      const data: any = await response.json()
      if (data.results && Array.isArray(data.results)) {
        allResults.push(...data.results)
      }

      // Check for pagination
      if (data.paging && data.paging.next && data.paging.next.link) {
        currentUrl = data.paging.next.link
      } else {
        currentUrl = null
      }
    } catch (error) {
      console.error(`Error fetching from ${currentUrl}:`, error)
      break
    }
  }
  return allResults
}

export async function POST(request: NextRequest) {
  try {
    const { hubspotToken, contentType = 'all-pages', useCache = true } = await request.json()

    if (!hubspotToken || typeof hubspotToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid token is required' },
        { status: 400 }
      )
    }

    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
      'Content-Type': 'application/json',
    }

    // Create cache key based on token (first 8 chars for privacy)
    const cacheKey = `bulk-dropdown-${hubspotToken.substring(0, 8)}-${contentType}`

    // Use cache if enabled
    if (useCache) {
      const cached = dropdownCache.get(cacheKey)
      const now = Date.now()

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({
          success: true,
          dropdownOptions: cached.data,
          cached: true,
          message: 'All dropdown options loaded from cache',
        })
      }
    }

    console.log('🚀 Fetching ALL dropdown options at once...')

    // Define all endpoints to fetch from
    const configEndpoints = {
      domains: 'https://api.hubapi.com/cms/v3/domains',
      campaigns: 'https://api.hubapi.com/marketing/v3/campaigns',
      authors: 'https://api.hubapi.com/cms/v3/blogs/authors',
      contentGroups: 'https://api.hubapi.com/cms/v3/content-groups',
      tags: 'https://api.hubapi.com/cms/v3/blogs/tags',
      topics: 'https://api.hubapi.com/cms/v3/blogs/topics',
      redirects: 'https://api.hubapi.com/cms/v3/url-redirects',
    }

    // Fetch ALL endpoints in parallel for maximum efficiency
    const [domains, campaigns, authors, contentGroups, tags, topics, redirects] = await Promise.all(
      [
        fetchAllFromEndpoint(configEndpoints.domains, headers),
        fetchAllFromEndpoint(configEndpoints.campaigns, headers),
        fetchAllFromEndpoint(configEndpoints.authors, headers),
        fetchAllFromEndpoint(configEndpoints.contentGroups, headers),
        fetchAllFromEndpoint(configEndpoints.tags, headers),
        fetchAllFromEndpoint(configEndpoints.topics, headers),
        fetchAllFromEndpoint(configEndpoints.redirects, headers),
      ]
    )

    console.log(
      `✅ Fetched: ${domains.length} domains, ${campaigns.length} campaigns, ${authors.length} authors, ${contentGroups.length} content groups, ${tags.length} tags, ${topics.length} topics, ${redirects.length} redirects`
    )

    // Now fetch content from all content types to get field values
    const contentEndpoints = {
      'landing-pages': 'https://api.hubapi.com/cms/v3/pages/landing-pages',
      'website-pages': 'https://api.hubapi.com/cms/v3/pages/site-pages',
      'blog-posts': 'https://api.hubapi.com/cms/v3/blogs/posts',
    }

    let allContent: any[] = []

    if (contentType === 'all-pages') {
      // Fetch from all content types in parallel
      const [landingPages, websitePages, blogPosts] = await Promise.all([
        fetchAllFromEndpoint(contentEndpoints['landing-pages'], headers),
        fetchAllFromEndpoint(contentEndpoints['website-pages'], headers),
        fetchAllFromEndpoint(contentEndpoints['blog-posts'], headers),
      ])
      allContent = [...landingPages, ...websitePages, ...blogPosts]
    } else if (contentEndpoints[contentType as keyof typeof contentEndpoints]) {
      allContent = await fetchAllFromEndpoint(
        contentEndpoints[contentType as keyof typeof contentEndpoints],
        headers
      )
    }

    console.log(`📄 Fetched ${allContent.length} content items for field analysis`)

    // Process all dropdown options
    const dropdownOptions: { [key: string]: string[] } = {}

    // 1. Domains
    dropdownOptions.domain = domains.map(domain => domain.domain).filter(Boolean)

    // 2. Campaigns
    dropdownOptions.campaign = campaigns.map(campaign => campaign.name).filter(Boolean)

    // 3. Authors
    dropdownOptions.authorName = authors
      .map(author => author.displayName || author.name)
      .filter(Boolean)
    dropdownOptions.blogAuthorId = authors.map(author => author.id).filter(Boolean)

    // 4. Content Groups
    dropdownOptions.contentGroupId = contentGroups.map(group => group.id).filter(Boolean)

    // 5. Tags
    dropdownOptions.tagIds = tags.map(tag => tag.id).filter(Boolean)

    // 6. Topics
    dropdownOptions.topicIds = topics.map(topic => topic.id).filter(Boolean)

    // 7. Languages - Use comprehensive HubSpot language list
    dropdownOptions.language = HUBSPOT_LANGUAGES

    // 8. States - Official HubSpot states from documentation
    dropdownOptions.state = [
      // Draft states
      'DRAFT',
      'DRAFT_AB',
      'DRAFT_AB_VARIANT',
      'LOSER_AB_VARIANT',
      // Scheduled states
      'PUBLISHED_OR_SCHEDULED',
      'SCHEDULED_AB',
      // Published states
      'PUBLISHED_AB',
      'PUBLISHED_AB_VARIANT',
      // Additional common states
      // 'ARCHIVED'
    ]

    // 9. Boolean options
    dropdownOptions.useFeaturedImage = ['true', 'false']
    dropdownOptions.pageExpiryEnabled = ['true', 'false']
    dropdownOptions.archivedInDashboard = ['true', 'false']

    // 10. Extract unique values from content
    const uniqueValues: { [key: string]: Set<string> } = {
      htmlTitle: new Set(),
      name: new Set(),
      routePrefix: new Set(),
      metaDescription: new Set(),
      publicTitle: new Set(),
    }

    allContent.forEach(item => {
      if (item.htmlTitle) uniqueValues.htmlTitle.add(item.htmlTitle)
      if (item.name) uniqueValues.name.add(item.name)
      if (item.routePrefix) uniqueValues.routePrefix.add(item.routePrefix)
      if (item.metaDescription) uniqueValues.metaDescription.add(item.metaDescription)
      if (item.publicTitle) uniqueValues.publicTitle.add(item.publicTitle)
    })

    // Convert sets to arrays and limit to reasonable sizes
    dropdownOptions.htmlTitle = Array.from(uniqueValues.htmlTitle).slice(0, 100)
    dropdownOptions.name = Array.from(uniqueValues.name).slice(0, 100)
    dropdownOptions.routePrefix = Array.from(uniqueValues.routePrefix).slice(0, 50)
    dropdownOptions.metaDescription = Array.from(uniqueValues.metaDescription).slice(0, 100)
    dropdownOptions.publicTitle = Array.from(uniqueValues.publicTitle).slice(0, 100)

    // 11. Redirect options
    dropdownOptions.redirectStyle = redirects
      .map(redirect => redirect.redirectStyle)
      .filter(Boolean)
    dropdownOptions.precedence = redirects
      .map(redirect => redirect.precedence?.toString())
      .filter(Boolean)

    // Cache the results
    dropdownCache.set(cacheKey, { data: dropdownOptions, timestamp: Date.now() })

    console.log(
      `🎉 Successfully processed ${Object.keys(dropdownOptions).length} dropdown categories`
    )

    return NextResponse.json({
      success: true,
      dropdownOptions,
      cached: false,
      message: 'All dropdown options fetched successfully in one request',
      stats: {
        domains: domains.length,
        campaigns: campaigns.length,
        authors: authors.length,
        contentGroups: contentGroups.length,
        tags: tags.length,
        topics: topics.length,
        redirects: redirects.length,
        contentItems: allContent.length,
        languages: HUBSPOT_LANGUAGES.length,
        totalOptions: Object.keys(dropdownOptions).length,
        totalValues: Object.values(dropdownOptions).reduce((sum, arr) => sum + arr.length, 0),
      },
    })
  } catch (error) {
    console.error('Bulk dropdown options API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear-cache') {
      dropdownCache.clear()
      return NextResponse.json({
        success: true,
        message: 'Bulk dropdown options cache cleared successfully',
      })
    }

    if (action === 'cache-stats') {
      return NextResponse.json({
        success: true,
        cacheSize: dropdownCache.size,
        cacheKeys: Array.from(dropdownCache.keys()),
        message: 'Bulk dropdown cache statistics retrieved',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use ?action=clear-cache or ?action=cache-stats',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Bulk dropdown cache management error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
