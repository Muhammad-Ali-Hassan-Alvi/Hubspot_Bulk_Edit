// In api/hubspot/dropdown-options/route.ts

import { type NextRequest, NextResponse } from 'next/server'

// Helper function to fetch all paginated results from a HubSpot endpoint
async function fetchAllFromEndpoint(url: string, headers: HeadersInit): Promise<any[]> {
  const allResults: any[] = []
  let currentUrl: string | null = url

  while (currentUrl) {
    try {
      const response = await fetch(currentUrl, { headers })
      if (!response.ok) {
        console.error(`HubSpot API error for ${currentUrl}: ${response.status} ${response.statusText}`)
        // Stop fetching from this endpoint if an error occurs
        break
      }

      const data = await response.json()
      if (data.results && data.results.length > 0) {
        allResults.push(...data.results)
      }
      // HubSpot uses `paging.next.link` for pagination
      currentUrl = data.paging?.next?.link || null
    } catch (e) {
      console.error(`Failed to fetch from ${currentUrl}`, e)
      break
    }
  }
  return allResults
}

export async function POST(request: NextRequest) {
  try {
    const { hubspotToken } = await request.json()

    if (!hubspotToken || typeof hubspotToken !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid token is required' }, { status: 400 })
    }

    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
      'Content-Type': 'application/json',
    }

    // --- STEP 1: FETCH CONFIGURATION DATA DIRECTLY FROM HUBSPOT ---
    // This is the correct way to get ALL possible options, not just used ones.
    const configEndpoints = {
      domains: 'https://api.hubapi.com/cms/v3/domains',
      // NOTE: The Marketing Campaigns API is the correct source for all campaigns
      campaigns: 'https://api.hubapi.com/marketing/v3/campaigns',
      authors: 'https://api.hubapi.com/cms/v3/blogs/authors',
    }

    const [domains, campaigns, authors] = await Promise.all([
      fetchAllFromEndpoint(configEndpoints.domains, headers),
      fetchAllFromEndpoint(configEndpoints.campaigns, headers),
      fetchAllFromEndpoint(configEndpoints.authors, headers),
    ])

    const dropdownOptions: { [key: string]: string[] } = {}

    // Process the configuration results into clean dropdown lists
    if (domains.length > 0) {
      dropdownOptions['domain'] = domains.map(d => d.domain).sort()
    }
    if (campaigns.length > 0) {
      dropdownOptions['campaign'] = campaigns.map(c => c.name).sort()
    }
    if (authors.length > 0) {
      dropdownOptions['authorName'] = authors.map(a => a.displayName || a.fullName).sort()
    }

    // --- STEP 2: FETCH CONTENT TO GET VALUES FOR CONTENT-SPECIFIC FIELDS ---
    // These are fields like 'name', 'slug' that don't have a central config list.
    const contentEndpoints = [
      'https://api.hubapi.com/cms/v3/pages/landing-pages',
      'https://api.hubapi.com/cms/v3/pages/site-pages',
      'https://api.hubapi.com/cms/v3/blogs/posts',
    ]

    const contentResults = await Promise.all(
      contentEndpoints.map(url => fetchAllFromEndpoint(url, headers))
    )
    const allContent = contentResults.flat()

    // --- STEP 3: EFFICIENTLY SCAN CONTENT ONCE FOR REMAINING FIELDS ---
    // We only loop through all content items a single time.
    const contentDerivedFields = {
      htmlTitle: new Set<string>(),
      name: new Set<string>(),
      slug: new Set<string>(),
      subcategory: new Set<string>(),
      tagIds: new Set<string>(),
      contentGroupId: new Set<string>(),
    }

    for (const item of allContent) {
      // Helper to safely add a value to a set
      const addValue = (set: Set<string>, value: any) => {
        if (value && typeof value === 'string' && value.trim() !== '') {
          set.add(value.trim())
        }
      }

      addValue(contentDerivedFields.htmlTitle, item.htmlTitle)
      addValue(contentDerivedFields.name, item.name)
      addValue(contentDerivedFields.slug, item.slug)
      addValue(contentDerivedFields.subcategory, item.subcategory)
      addValue(contentDerivedFields.contentGroupId, item.contentGroupId)

      // Handle arrays like tags
      if (item.tagIds && Array.isArray(item.tagIds)) {
        item.tagIds.forEach((tagId: any) => addValue(contentDerivedFields.tagIds, String(tagId)))
      }
    }

    // Convert sets to sorted arrays and add to dropdownOptions
    for (const [key, valueSet] of Object.entries(contentDerivedFields)) {
      if (valueSet.size > 0) {
        dropdownOptions[key] = Array.from(valueSet).sort()
      }
    }

    // --- STEP 4: ADD HARDCODED, RELIABLE LISTS FOR FIXED OPTIONS ---
    // This is the correct and most reliable way for states and languages.
    dropdownOptions['state'] = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']

    dropdownOptions['language'] = [
      'en', 'en-us', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh-cn', // Common
      // Add more if needed
    ]

    return NextResponse.json({
      success: true,
      dropdownOptions,
      totalContentItems: allContent.length,
      message: `Refreshed options from HubSpot configuration and content.`,
    })
  } catch (error) {
    console.error('Dropdown options API error:', error)
    return NextResponse.json(
      { success: false, error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}



// import { type NextRequest, NextResponse } from 'next/server'

// export async function POST(request: NextRequest) {
//   try {
//     const { hubspotToken, contentType = 'all-pages' } = await request.json()

//     if (!hubspotToken || typeof hubspotToken !== 'string') {
//       return NextResponse.json(
//         { success: false, error: 'Valid token is required' },
//         { status: 400 }
//       )
//     }

//     const headers = {
//       Authorization: `Bearer ${hubspotToken}`,
//       'Content-Type': 'application/json',
//     }

//     // Define the endpoints to fetch data from
//     const endpoints = [
//       {
//         name: 'landing-pages',
//         url: 'https://api.hubapi.com/cms/v3/pages/landing-pages',
//         key: 'results',
//       },
//       {
//         name: 'site-pages',
//         url: 'https://api.hubapi.com/cms/v3/pages/site-pages',
//         key: 'results',
//       },
//       {
//         name: 'blog-posts',
//         url: 'https://api.hubapi.com/cms/v3/blogs/posts',
//         key: 'results',
//       },
//       {
//         name: 'blogs',
//         url: 'https://api.hubapi.com/cms/v3/blog-settings/settings',
//         key: 'results',
//       },
//       {
//         name: 'tags',
//         url: 'https://api.hubapi.com/cms/v3/blogs/tags',
//         key: 'results',
//       },
//       {
//         name: 'authors',
//         url: 'https://api.hubapi.com/cms/v3/blogs/authors',
//         key: 'results',
//       },
//     ]

//     // Additional endpoints for HubSpot configuration data
//     const configEndpoints = [
//       {
//         name: 'content-groups',
//         url: 'https://api.hubapi.com/cms/v3/content-groups',
//         key: 'results',
//       },
//       {
//         name: 'domains',
//         url: 'https://api.hubapi.com/cms/v3/domains',
//         key: 'results',
//       },
//       {
//         name: 'blog-settings',
//         url: 'https://api.hubapi.com/cms/v3/blog-settings/settings',
//         key: 'results',
//       },
//       {
//         name: 'page-templates',
//         url: 'https://api.hubapi.com/cms/v3/pages/templates',
//         key: 'results',
//       },
//       {
//         name: 'blog-templates',
//         url: 'https://api.hubapi.com/cms/v3/blogs/templates',
//         key: 'results',
//       },
//     ]

//     // Function to fetch all pages from an endpoint
//     async function fetchAllFromEndpoint(endpointUrl: string, headers: HeadersInit, resultsKey: string): Promise<any[]> {
//       const allResults: any[] = []
//       let after: string | null = null
//       const originalUrl = new URL(endpointUrl)

//       do {
//         const requestUrl = new URL(originalUrl.toString())
//         requestUrl.searchParams.set('limit', '100')
//         if (after) {
//           requestUrl.searchParams.set('after', after)
//         }
        
//         const response = await fetch(requestUrl.toString(), { headers })
//         if (!response.ok) {
//           console.error(`HubSpot API error for ${endpointUrl}: ${response.status}`)
//           break
//         }
        
//         const data = await response.json()
//         if (data[resultsKey] && data[resultsKey].length > 0) {
//           allResults.push(...data[resultsKey])
//         }
//         after = data.paging?.next?.after || null
//       } while (after)
      
//       return allResults
//     }

//     // Fetch data from all content endpoints
//     const contentFetchPromises = endpoints.map(endpoint => 
//       fetchAllFromEndpoint(endpoint.url, headers, endpoint.key)
//     )
    
//     // Fetch configuration data for comprehensive options
//     const configFetchPromises = configEndpoints.map(endpoint => 
//       fetchAllFromEndpoint(endpoint.url, headers, endpoint.key)
//     )
    
//     const [contentResults, configResults] = await Promise.all([
//       Promise.all(contentFetchPromises),
//       Promise.all(configFetchPromises)
//     ])
    
//     const allContent = contentResults.flat()
//     const allConfig = configResults.flat()
    
//     // Debug: Log what we're getting from HubSpot
//     console.log(`Fetched ${allContent.length} total content items from HubSpot`)
//     if (allContent.length > 0) {
//       console.log('Sample content item structure:', JSON.stringify(allContent[0], null, 2))
//     }

//     // Extract unique values for dropdown fields
//     const dropdownOptions: { [key: string]: string[] } = {}
    
//     // Define the fields we want to extract dropdown options for
//     // These should match the actual HubSpot property names from the user's content
//     const fieldsForDropdown = [
//       'campaign',
//       'contentGroupId',
//       'contentGroup',
//       'domain',
//       'language',
//       'state',
//       'subcategory',
//       'category',
//       'htmlTitle',
//       'name',
//       'authorName',
//       'tagIds',
//       'blogAuthorId',
//       'useFeaturedImage',
//       'pageExpiryEnabled',
//       'archivedInDashboard',
//       'metaDescription',
//       'publicTitle',
//       'slug',
//       'routePrefix',
//       'publishDate',
//       'createdAt',
//       'updatedAt',
//       'url',
//       'title',
//       'description',
//       'keywords',
//       'author',
//       'blogAuthor',
//       'contentGroupName',
//       'campaignName',
//     ]

//     fieldsForDropdown.forEach(fieldKey => {
//       const values = new Set<string>()

//       allContent.forEach(item => {
//         // Handle different possible locations for the value in HubSpot's data structure
//         let value = item[fieldKey] || 
//                    item.properties?.[fieldKey] || 
//                    item.meta?.[fieldKey] ||
//                    item.attributes?.[fieldKey] ||
//                    item.settings?.[fieldKey] ||
//                    item.contentGroup?.[fieldKey] ||
//                    item.campaign?.[fieldKey]

//         // Special handling for nested HubSpot objects
//         if (!value && fieldKey === 'campaign' && item.contentGroup) {
//           value = item.contentGroup.name || item.contentGroup.displayName || item.contentGroup.label
//         }
        
//         if (!value && fieldKey === 'contentGroup' && item.contentGroup) {
//           value = item.contentGroup.name || item.contentGroup.displayName || item.contentGroup.label
//         }

//         if (value) {
//           // Handle if the value is an array (like tags)
//           if (Array.isArray(value)) {
//             value.forEach(v => {
//               if (v && typeof v === 'string' && v.trim() !== '') {
//                 values.add(v.trim())
//               } else if (v && typeof v === 'number') {
//                 values.add(String(v))
//               }
//             })
//           }
//           // Handle if it's a simple string value
//           else if (typeof value === 'string' && value.trim() !== '') {
//             values.add(value.trim())
//           }
//           // Handle if it's a number (convert to string)
//           else if (typeof value === 'number') {
//             values.add(String(value))
//           }
//           // Handle if it's an object with a name or label property (common in HubSpot)
//           else if (typeof value === 'object' && value !== null) {
//             if (value.name && typeof value.name === 'string') {
//               values.add(value.name.trim())
//             } else if (value.label && typeof value.label === 'string') {
//               values.add(value.label.trim())
//             } else if (value.value && typeof value.value === 'string') {
//               values.add(value.value.trim())
//             } else if (value.displayName && typeof value.displayName === 'string') {
//               values.add(value.displayName.trim())
//             }
//           }
//         }
//       })

//       const uniqueOptions = Array.from(values)
//       if (uniqueOptions.length > 0) {
//         dropdownOptions[fieldKey] = uniqueOptions.sort((a, b) => a.localeCompare(b))
//         console.log(`Field '${fieldKey}': Found ${uniqueOptions.length} options:`, uniqueOptions.slice(0, 5)) // Log first 5 options
//       } else {
//         console.log(`Field '${fieldKey}': No options found`)
//       }
//     })

//     // Add comprehensive HubSpot configuration options
//     // These are the standard options that HubSpot allows for all users
    
//     // HubSpot standard content states
//     dropdownOptions['state'] = [
//       'DRAFT',
//       'PUBLISHED', 
//       'SCHEDULED',
//       'ARCHIVED',
//       'TRASHED'
//     ]
    
//     // HubSpot standard language options
//     dropdownOptions['language'] = [
//       'en', 'en-us', 'en-gb', 'en-ca', 'en-au', 'en-nz',
//       'es', 'es-es', 'es-mx', 'es-ar', 'es-cl', 'es-co', 'es-pe', 'es-ve',
//       'fr', 'fr-fr', 'fr-ca', 'fr-be', 'fr-ch',
//       'de', 'de-de', 'de-at', 'de-ch', 'de-lu',
//       'it', 'it-it', 'it-ch',
//       'pt', 'pt-pt', 'pt-br',
//       'nl', 'nl-nl', 'nl-be',
//       'sv', 'sv-se', 'sv-fi',
//       'da', 'da-dk',
//       'no', 'no-no',
//       'fi', 'fi-fi',
//       'pl', 'pl-pl',
//       'ru', 'ru-ru',
//       'ja', 'ja-jp',
//       'ko', 'ko-kr',
//       'zh', 'zh-cn', 'zh-tw', 'zh-hk',
//       'ar', 'ar-sa', 'ar-ae', 'ar-eg',
//       'hi', 'hi-in',
//       'th', 'th-th',
//       'vi', 'vi-vn',
//       'tr', 'tr-tr',
//       'he', 'he-il',
//       'id', 'id-id',
//       'ms', 'ms-my',
//       'tl', 'tl-ph'
//     ]
    
//     // HubSpot standard boolean options
//     dropdownOptions['useFeaturedImage'] = ['true', 'false']
//     dropdownOptions['pageExpiryEnabled'] = ['true', 'false']
//     dropdownOptions['archivedInDashboard'] = ['true', 'false']
//     dropdownOptions['allowComments'] = ['true', 'false']
//     dropdownOptions['enableGoogleAmpOutputOverride'] = ['true', 'false']
    
//     // Extract all campaigns/content groups from configuration data
//     if (allConfig.length > 0) {
//       const campaigns = new Set<string>()
//       const domains = new Set<string>()
//       const subcategories = new Set<string>()
      
//       allConfig.forEach(item => {
//         // Extract campaigns from content groups
//         if (item.name && typeof item.name === 'string') {
//           campaigns.add(item.name.trim())
//         }
//         if (item.displayName && typeof item.displayName === 'string') {
//           campaigns.add(item.displayName.trim())
//         }
//         if (item.contentGroup && typeof item.contentGroup === 'string') {
//           campaigns.add(item.contentGroup.trim())
//         }
        
//         // Extract domains
//         if (item.domain && typeof item.domain === 'string') {
//           domains.add(item.domain.trim())
//         }
//         if (item.hostname && typeof item.hostname === 'string') {
//           domains.add(item.hostname.trim())
//         }
        
//         // Extract subcategories from templates
//         if (item.subcategory && typeof item.subcategory === 'string') {
//           subcategories.add(item.subcategory.trim())
//         }
//         if (item.category && typeof item.category === 'string') {
//           subcategories.add(item.category.trim())
//         }
//       })
      
//       // Add campaigns to dropdown options
//       if (campaigns.size > 0) {
//         dropdownOptions['campaign'] = Array.from(campaigns).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaigns from HubSpot config: Found ${campaigns.size} campaigns`)
//       }
      
//       // Also extract campaigns from content data to get comprehensive list
//       const contentCampaigns = new Set<string>()
//       allContent.forEach(item => {
//         if (item.contentGroup?.name) {
//           contentCampaigns.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName) {
//           contentCampaigns.add(item.contentGroup.displayName.trim())
//         }
//         if (item.campaign?.name) {
//           contentCampaigns.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName) {
//           contentCampaigns.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Merge config campaigns with content campaigns
//       if (contentCampaigns.size > 0) {
//         const allCampaigns = new Set([...campaigns, ...contentCampaigns])
//         dropdownOptions['campaign'] = Array.from(allCampaigns).sort((a, b) => a.localeCompare(b))
//         console.log(`Total campaigns (config + content): Found ${allCampaigns.size} campaigns`)
//       }
      
//       // Add domains to dropdown options
//       if (domains.size > 0) {
//         dropdownOptions['domain'] = Array.from(domains).sort((a, b) => a.localeCompare(b))
//         console.log(`Domains from HubSpot config: Found ${domains.size} domains`)
//       }
      
//       // Also extract domains from content data to get comprehensive list
//       const contentDomains = new Set<string>()
//       allContent.forEach(item => {
//         if (item.domain && typeof item.domain === 'string') {
//           contentDomains.add(item.domain.trim())
//         }
//         if (item.hostname && typeof item.hostname === 'string') {
//           contentDomains.add(item.hostname.trim())
//         }
//         if (item.url && typeof item.url === 'string') {
//           try {
//             const url = new URL(item.url)
//             contentDomains.add(url.hostname)
//           } catch (e) {
//             // Invalid URL, skip
//           }
//         }
//       })
      
//       // Merge config domains with content domains
//       if (contentDomains.size > 0) {
//         const allDomains = new Set([...domains, ...contentDomains])
//         dropdownOptions['domain'] = Array.from(allDomains).sort((a, b) => a.localeCompare(b))
//         console.log(`Total domains (config + content): Found ${allDomains.size} domains`)
//       }
      
//       // Add subcategories to dropdown options
//       if (subcategories.size > 0) {
//         dropdownOptions['subcategory'] = Array.from(subcategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Subcategories from HubSpot config: Found ${subcategories.size} subcategories`)
//       }
      
//       // Also extract subcategories from content data to get comprehensive list
//       const contentSubcategories = new Set<string>()
//       allContent.forEach(item => {
//         if (item.subcategory && typeof item.subcategory === 'string') {
//           contentSubcategories.add(item.subcategory.trim())
//         }
//         if (item.category && typeof item.category === 'string') {
//           contentSubcategories.add(item.category.trim())
//         }
//         if (item.contentGroup?.subcategory) {
//           contentSubcategories.add(item.contentGroup.subcategory.trim())
//         }
//       })
      
//       // Merge config subcategories with content subcategories
//       if (contentSubcategories.size > 0) {
//         const allSubcategories = new Set([...subcategories, ...contentSubcategories])
//         dropdownOptions['subcategory'] = Array.from(allSubcategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Total subcategories (config + content): Found ${allSubcategories.size} subcategories`)
//       }
      
//       // Extract authors from content data
//       const authors = new Set<string>()
//       allContent.forEach(item => {
//         if (item.authorName && typeof item.authorName === 'string') {
//           authors.add(item.authorName.trim())
//         }
//         if (item.author?.name && typeof item.author.name === 'string') {
//           authors.add(item.author.name.trim())
//         }
//         if (item.blogAuthor?.name && typeof item.blogAuthor.name === 'string') {
//           authors.add(item.blogAuthor.name.trim())
//         }
//         if (item.blogAuthor?.displayName && typeof item.blogAuthor.displayName === 'string') {
//           authors.add(item.blogAuthor.displayName.trim())
//         }
//       })
      
//       // Add authors to dropdown options
//       if (authors.size > 0) {
//         dropdownOptions['authorName'] = Array.from(authors).sort((a, b) => a.localeCompare(b))
//         console.log(`Authors from content: Found ${authors.size} authors`)
//       }
      
//       // Extract tags from content data
//       const tags = new Set<string>()
//       allContent.forEach(item => {
//         if (item.tagIds && Array.isArray(item.tagIds)) {
//           item.tagIds.forEach(tag => {
//             if (tag && typeof tag === 'string') {
//               tags.add(tag.trim())
//             } else if (tag && typeof tag === 'object' && tag.name) {
//               tags.add(tag.name.trim())
//             }
//           })
//         }
//         if (item.tags && Array.isArray(item.tags)) {
//           item.tags.forEach(tag => {
//             if (tag && typeof tag === 'string') {
//               tags.add(tag.trim())
//             } else if (tag && typeof tag === 'object' && tag.name) {
//               tags.add(tag.name.trim())
//             }
//           })
//         }
//       })
      
//       // Add tags to dropdown options
//       if (tags.size > 0) {
//         dropdownOptions['tagIds'] = Array.from(tags).sort((a, b) => a.localeCompare(b))
//         console.log(`Tags from content: Found ${tags.size} tags`)
//       }
      
//       // Extract HTML titles and meta descriptions from content data
//       const htmlTitles = new Set<string>()
//       const metaDescriptions = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.htmlTitle && typeof item.htmlTitle === 'string') {
//           htmlTitles.add(item.htmlTitle.trim())
//         }
//         if (item.title && typeof item.title === 'string') {
//           htmlTitles.add(item.title.trim())
//         }
//         if (item.metaDescription && typeof item.metaDescription === 'string') {
//           metaDescriptions.add(item.metaDescription.trim())
//         }
//         if (item.description && typeof item.description === 'string') {
//           metaDescriptions.add(item.description.trim())
//         }
//       })
      
//       // Add HTML titles to dropdown options
//       if (htmlTitles.size > 0) {
//         dropdownOptions['htmlTitle'] = Array.from(htmlTitles).sort((a, b) => a.localeCompare(b))
//         console.log(`HTML titles from content: Found ${htmlTitles.size} titles`)
//       }
      
//       // Add meta descriptions to dropdown options
//       if (metaDescriptions.size > 0) {
//         dropdownOptions['metaDescription'] = Array.from(metaDescriptions).sort((a, b) => a.localeCompare(b))
//         console.log(`Meta descriptions from content: Found ${metaDescriptions.size} descriptions`)
//       }
      
//       // Extract names and slugs from content data
//       const names = new Set<string>()
//       const slugs = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.name && typeof item.name === 'string') {
//           names.add(item.name.trim())
//         }
//         if (item.publicTitle && typeof item.publicTitle === 'string') {
//           names.add(item.publicTitle.trim())
//         }
//         if (item.slug && typeof item.slug === 'string') {
//           slugs.add(item.slug.trim())
//         }
//         if (item.routePrefix && typeof item.routePrefix === 'string') {
//           slugs.add(item.routePrefix.trim())
//         }
//       })
      
//       // Add names to dropdown options
//       if (names.size > 0) {
//         dropdownOptions['name'] = Array.from(names).sort((a, b) => a.localeCompare(b))
//         console.log(`Names from content: Found ${names.size} names`)
//       }
      
//       // Add slugs to dropdown options
//       if (slugs.size > 0) {
//         dropdownOptions['slug'] = Array.from(slugs).sort((a, b) => a.localeCompare(b))
//         console.log(`Slugs from content: Found ${slugs.size} slugs`)
//       }
      
//       // Extract URLs and publish dates from content data
//       const urls = new Set<string>()
//       const publishDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.url && typeof item.url === 'string') {
//           urls.add(item.url.trim())
//         }
//         if (item.publishDate && typeof item.publishDate === 'string') {
//           publishDates.add(item.publishDate.trim())
//         }
//         if (item.createdAt && typeof item.createdAt === 'string') {
//           publishDates.add(item.createdAt.trim())
//         }
//         if (item.updatedAt && typeof item.updatedAt === 'string') {
//           publishDates.add(item.updatedAt.trim())
//         }
//       })
      
//       // Add URLs to dropdown options
//       if (urls.size > 0) {
//         dropdownOptions['url'] = Array.from(urls).sort((a, b) => a.localeCompare(b))
//         console.log(`URLs from content: Found ${urls.size} URLs`)
//       }
      
//       // Add publish dates to dropdown options
//       if (publishDates.size > 0) {
//         dropdownOptions['publishDate'] = Array.from(publishDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Publish dates from content: Found ${publishDates.size} dates`)
//       }
      
//       // Extract keywords from content data
//       const keywords = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.keywords && Array.isArray(item.keywords)) {
//           item.keywords.forEach(keyword => {
//             if (keyword && typeof keyword === 'string') {
//               keywords.add(keyword.trim())
//             }
//           })
//         }
//         if (item.keywords && typeof item.keywords === 'string') {
//           const keywordList = item.keywords.split(',').map(k => k.trim())
//           keywordList.forEach(keyword => {
//             if (keyword) {
//               keywords.add(keyword)
//             }
//           })
//         }
//       })
      
//       // Add keywords to dropdown options
//       if (keywords.size > 0) {
//         dropdownOptions['keywords'] = Array.from(keywords).sort((a, b) => a.localeCompare(b))
//         console.log(`Keywords from content: Found ${keywords.size} keywords`)
//       }
      
//       // Extract blog authors from content data
//       const blogAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.blogAuthorId && typeof item.blogAuthorId === 'string') {
//           blogAuthors.add(item.blogAuthorId.trim())
//         }
//         if (item.blogAuthor?.id && typeof item.blogAuthor.id === 'string') {
//           blogAuthors.add(item.blogAuthor.id.trim())
//         }
//         if (item.blogAuthor?.name && typeof item.blogAuthor.name === 'string') {
//           blogAuthors.add(item.blogAuthor.name.trim())
//         }
//         if (item.blogAuthor?.displayName && typeof item.blogAuthor.displayName === 'string') {
//           blogAuthors.add(item.blogAuthor.displayName.trim())
//         }
//       })
      
//       // Add blog authors to dropdown options
//       if (blogAuthors.size > 0) {
//         dropdownOptions['blogAuthorId'] = Array.from(blogAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Blog authors from content: Found ${blogAuthors.size} blog authors`)
//       }
      
//       // Extract content groups from content data
//       const contentGroups = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroupId && typeof item.contentGroupId === 'string') {
//           contentGroups.add(item.contentGroupId.trim())
//         }
//         if (item.contentGroup?.id && typeof item.contentGroup.id === 'string') {
//           contentGroups.add(item.contentGroup.id.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroups.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroups.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content groups to dropdown options
//       if (contentGroups.size > 0) {
//         dropdownOptions['contentGroupId'] = Array.from(contentGroups).sort((a, b) => a.localeCompare(b))
//         console.log(`Content groups from content: Found ${contentGroups.size} content groups`)
//       }
      
//       // Extract campaign names from content data
//       const campaignNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaignName && typeof item.campaignName === 'string') {
//           campaignNames.add(item.campaignName.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           campaignNames.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           campaignNames.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaign names to dropdown options
//       if (campaignNames.size > 0) {
//         dropdownOptions['campaignName'] = Array.from(campaignNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaign names from content: Found ${campaignNames.size} campaign names`)
//       }
      
//       // Extract public titles from content data
//       const publicTitles = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.publicTitle && typeof item.publicTitle === 'string') {
//           publicTitles.add(item.publicTitle.trim())
//         }
//         if (item.title && typeof item.title === 'string') {
//           publicTitles.add(item.title.trim())
//         }
//         if (item.htmlTitle && typeof item.htmlTitle === 'string') {
//           publicTitles.add(item.htmlTitle.trim())
//         }
//       })
      
//       // Add public titles to dropdown options
//       if (publicTitles.size > 0) {
//         dropdownOptions['publicTitle'] = Array.from(publicTitles).sort((a, b) => a.localeCompare(b))
//         console.log(`Public titles from content: Found ${publicTitles.size} public titles`)
//       }
      
//       // Extract route prefixes from content data
//       const routePrefixes = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.routePrefix && typeof item.routePrefix === 'string') {
//           routePrefixes.add(item.routePrefix.trim())
//         }
//         if (item.slug && typeof item.slug === 'string') {
//           routePrefixes.add(item.slug.trim())
//         }
//         if (item.url && typeof item.url === 'string') {
//           try {
//             const url = new URL(item.url)
//             const pathParts = url.pathname.split('/').filter(part => part)
//             if (pathParts.length > 0) {
//               routePrefixes.add('/' + pathParts[0])
//             }
//           } catch (e) {
//             // Invalid URL, skip
//           }
//         }
//       })
      
//       // Add route prefixes to dropdown options
//       if (routePrefixes.size > 0) {
//         dropdownOptions['routePrefix'] = Array.from(routePrefixes).sort((a, b) => a.localeCompare(b))
//         console.log(`Route prefixes from content: Found ${routePrefixes.size} route prefixes`)
//       }
      
//       // Extract created and updated dates from content data
//       const createdDates = new Set<string>()
//       const updatedDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.createdAt && typeof item.createdAt === 'string') {
//           createdDates.add(item.createdAt.trim())
//         }
//         if (item.updatedAt && typeof item.updatedAt === 'string') {
//           updatedDates.add(item.updatedAt.trim())
//         }
//       })
      
//       // Add created dates to dropdown options
//       if (createdDates.size > 0) {
//         dropdownOptions['createdAt'] = Array.from(createdDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Created dates from content: Found ${createdDates.size} created dates`)
//       }
      
//       // Add updated dates to dropdown options
//       if (updatedDates.size > 0) {
//         dropdownOptions['updatedAt'] = Array.from(updatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Updated dates from content: Found ${updatedDates.size} updated dates`)
//       }
      
//       // Extract descriptions from content data
//       const descriptions = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.description && typeof item.description === 'string') {
//           descriptions.add(item.description.trim())
//         }
//         if (item.metaDescription && typeof item.metaDescription === 'string') {
//           descriptions.add(item.metaDescription.trim())
//         }
//         if (item.summary && typeof item.summary === 'string') {
//           descriptions.add(item.summary.trim())
//         }
//       })
      
//       // Add descriptions to dropdown options
//       if (descriptions.size > 0) {
//         dropdownOptions['description'] = Array.from(descriptions).sort((a, b) => a.localeCompare(b))
//         console.log(`Descriptions from content: Found ${descriptions.size} descriptions`)
//       }
      
//       // Extract authors from content data
//       const authors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.author && typeof item.author === 'string') {
//           authors.add(item.author.trim())
//         }
//         if (item.author?.name && typeof item.author.name === 'string') {
//           authors.add(item.author.name.trim())
//         }
//         if (item.author?.displayName && typeof item.author.displayName === 'string') {
//           authors.add(item.author.displayName.trim())
//         }
//       })
      
//       // Add authors to dropdown options
//       if (authors.size > 0) {
//         dropdownOptions['author'] = Array.from(authors).sort((a, b) => a.localeCompare(b))
//         console.log(`Authors from content: Found ${authors.size} authors`)
//       }
      
//       // Extract blog authors from content data
//       const blogAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.blogAuthor && typeof item.blogAuthor === 'string') {
//           blogAuthors.add(item.blogAuthor.trim())
//         }
//         if (item.blogAuthor?.name && typeof item.blogAuthor.name === 'string') {
//           blogAuthors.add(item.blogAuthor.name.trim())
//         }
//         if (item.blogAuthor?.displayName && typeof item.blogAuthor.displayName === 'string') {
//           blogAuthors.add(item.blogAuthor.displayName.trim())
//         }
//       })
      
//       // Add blog authors to dropdown options
//       if (blogAuthors.size > 0) {
//         dropdownOptions['blogAuthor'] = Array.from(blogAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Blog authors from content: Found ${blogAuthors.size} blog authors`)
//       }
      
//       // Extract content group names from content data
//       const contentGroupNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroupName && typeof item.contentGroupName === 'string') {
//           contentGroupNames.add(item.contentGroupName.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroupNames.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroupNames.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content group names to dropdown options
//       if (contentGroupNames.size > 0) {
//         dropdownOptions['contentGroupName'] = Array.from(contentGroupNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Content group names from content: Found ${contentGroupNames.size} content group names`)
//       }
      
//       // Extract campaign names from content data
//       const campaignNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaignName && typeof item.campaignName === 'string') {
//           campaignNames.add(item.campaignName.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           campaignNames.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           campaignNames.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaign names to dropdown options
//       if (campaignNames.size > 0) {
//         dropdownOptions['campaignName'] = Array.from(campaignNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaign names from content: Found ${campaignNames.size} campaign names`)
//       }
      
//       // Extract categories from content data
//       const categories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.category && typeof item.category === 'string') {
//           categories.add(item.category.trim())
//         }
//         if (item.contentGroup?.category && typeof item.contentGroup.category === 'string') {
//           categories.add(item.contentGroup.category.trim())
//         }
//         if (item.campaign?.category && typeof item.campaign.category === 'string') {
//           categories.add(item.campaign.category.trim())
//         }
//       })
      
//       // Add categories to dropdown options
//       if (categories.size > 0) {
//         dropdownOptions['category'] = Array.from(categories).sort((a, b) => a.localeCompare(b))
//         console.log(`Categories from content: Found ${categories.size} categories`)
//       }
      
//       // Extract subcategories from content data
//       const subcategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.subcategory && typeof item.subcategory === 'string') {
//           subcategories.add(item.subcategory.trim())
//         }
//         if (item.contentGroup?.subcategory && typeof item.contentGroup.subcategory === 'string') {
//           subcategories.add(item.contentGroup.subcategory.trim())
//         }
//         if (item.campaign?.subcategory && typeof item.campaign.subcategory === 'string') {
//           subcategories.add(item.campaign.subcategory.trim())
//         }
//       })
      
//       // Add subcategories to dropdown options
//       if (subcategories.size > 0) {
//         dropdownOptions['subcategory'] = Array.from(subcategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Subcategories from content: Found ${subcategories.size} subcategories`)
//       }
      
//       // Extract content groups from content data
//       const contentGroups = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroup && typeof item.contentGroup === 'string') {
//           contentGroups.add(item.contentGroup.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroups.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroups.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content groups to dropdown options
//       if (contentGroups.size > 0) {
//         dropdownOptions['contentGroup'] = Array.from(contentGroups).sort((a, b) => a.localeCompare(b))
//         console.log(`Content groups from content: Found ${contentGroups.size} content groups`)
//       }
      
//       // Extract campaigns from content data
//       const campaigns = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaign && typeof item.campaign === 'string') {
//           campaigns.add(item.campaign.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           campaigns.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           campaigns.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaigns to dropdown options
//       if (campaigns.size > 0) {
//         dropdownOptions['campaign'] = Array.from(campaigns).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaigns from content: Found ${campaigns.size} campaigns`)
//       }
      
//       // Extract domains from content data
//       const contentDomains = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.domain && typeof item.domain === 'string') {
//           contentDomains.add(item.domain.trim())
//         }
//         if (item.hostname && typeof item.hostname === 'string') {
//           contentDomains.add(item.hostname.trim())
//         }
//         if (item.url && typeof item.url === 'string') {
//           try {
//             const url = new URL(item.url)
//             contentDomains.add(url.hostname)
//           } catch (e) {
//             // Invalid URL, skip
//           }
//         }
//       })
      
//       // Add domains to dropdown options
//       if (contentDomains.size > 0) {
//         dropdownOptions['domain'] = Array.from(contentDomains).sort((a, b) => a.localeCompare(b))
//         console.log(`Domains from content: Found ${contentDomains.size} domains`)
//       }
      
//       // Extract languages from content data
//       const contentLanguages = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.language && typeof item.language === 'string') {
//           contentLanguages.add(item.language.trim())
//         }
//         if (item.locale && typeof item.locale === 'string') {
//           contentLanguages.add(item.locale.trim())
//         }
//       })
      
//       // Add languages to dropdown options
//       if (contentLanguages.size > 0) {
//         dropdownOptions['language'] = Array.from(contentLanguages).sort((a, b) => a.localeCompare(b))
//         console.log(`Languages from content: Found ${contentLanguages.size} languages`)
//       }
      
//       // Extract states from content data
//       const contentStates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.state && typeof item.state === 'string') {
//           contentStates.add(item.state.trim())
//         }
//         if (item.status && typeof item.status === 'string') {
//           contentStates.add(item.status.trim())
//         }
//         if (item.publishState && typeof item.publishState === 'string') {
//           contentStates.add(item.publishState.trim())
//         }
//       })
      
//       // Add states to dropdown options
//       if (contentStates.size > 0) {
//         dropdownOptions['state'] = Array.from(contentStates).sort((a, b) => a.localeCompare(b))
//         console.log(`States from content: Found ${contentStates.size} states`)
//       }
      
//       // Extract publish dates from content data
//       const contentPublishDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.publishDate && typeof item.publishDate === 'string') {
//           contentPublishDates.add(item.publishDate.trim())
//         }
//         if (item.publishedAt && typeof item.publishedAt === 'string') {
//           contentPublishDates.add(item.publishedAt.trim())
//         }
//         if (item.scheduledDate && typeof item.scheduledDate === 'string') {
//           contentPublishDates.add(item.scheduledDate.trim())
//         }
//       })
      
//       // Add publish dates to dropdown options
//       if (contentPublishDates.size > 0) {
//         dropdownOptions['publishDate'] = Array.from(contentPublishDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Publish dates from content: Found ${contentPublishDates.size} publish dates`)
//       }
      
//       // Extract created and updated dates from content data
//       const contentCreatedDates = new Set<string>()
//       const contentUpdatedDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.createdAt && typeof item.createdAt === 'string') {
//           contentCreatedDates.add(item.createdAt.trim())
//         }
//         if (item.updatedAt && typeof item.updatedAt === 'string') {
//           contentUpdatedDates.add(item.updatedAt.trim())
//         }
//       })
      
//       // Add created dates to dropdown options
//       if (contentCreatedDates.size > 0) {
//         dropdownOptions['createdAt'] = Array.from(contentCreatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Created dates from content: Found ${contentCreatedDates.size} created dates`)
//       }
      
//       // Add updated dates to dropdown options
//       if (contentUpdatedDates.size > 0) {
//         dropdownOptions['updatedAt'] = Array.from(contentUpdatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Updated dates from content: Found ${contentUpdatedDates.size} updated dates`)
//       }
      
//       // Extract URLs from content data
//       const contentUrls = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.url && typeof item.url === 'string') {
//           contentUrls.add(item.url.trim())
//         }
//         if (item.absoluteUrl && typeof item.absoluteUrl === 'string') {
//           contentUrls.add(item.absoluteUrl.trim())
//         }
//         if (item.relativeUrl && typeof item.relativeUrl === 'string') {
//           contentUrls.add(item.relativeUrl.trim())
//         }
//       })
      
//       // Add URLs to dropdown options
//       if (contentUrls.size > 0) {
//         dropdownOptions['url'] = Array.from(contentUrls).sort((a, b) => a.localeCompare(b))
//         console.log(`URLs from content: Found ${contentUrls.size} URLs`)
//       }
      
//       // Extract titles from content data
//       const contentTitles = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.title && typeof item.title === 'string') {
//           contentTitles.add(item.title.trim())
//         }
//         if (item.htmlTitle && typeof item.htmlTitle === 'string') {
//           contentTitles.add(item.htmlTitle.trim())
//         }
//         if (item.publicTitle && typeof item.publicTitle === 'string') {
//           contentTitles.add(item.publicTitle.trim())
//         }
//       })
      
//       // Add titles to dropdown options
//       if (contentTitles.size > 0) {
//         dropdownOptions['title'] = Array.from(contentTitles).sort((a, b) => a.localeCompare(b))
//         console.log(`Titles from content: Found ${contentTitles.size} titles`)
//       }
      
//       // Extract descriptions from content data
//       const contentDescriptions = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.description && typeof item.description === 'string') {
//           contentDescriptions.add(item.description.trim())
//         }
//         if (item.metaDescription && typeof item.metaDescription === 'string') {
//           contentDescriptions.add(item.metaDescription.trim())
//         }
//         if (item.summary && typeof item.summary === 'string') {
//           contentDescriptions.add(item.summary.trim())
//         }
//       })
      
//       // Add descriptions to dropdown options
//       if (contentDescriptions.size > 0) {
//         dropdownOptions['description'] = Array.from(contentDescriptions).sort((a, b) => a.localeCompare(b))
//         console.log(`Descriptions from content: Found ${contentDescriptions.size} descriptions`)
//       }
      
//       // Extract keywords from content data
//       const contentKeywords = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.keywords && Array.isArray(item.keywords)) {
//           item.keywords.forEach(keyword => {
//             if (keyword && typeof keyword === 'string') {
//               contentKeywords.add(keyword.trim())
//             }
//           })
//         }
//         if (item.keywords && typeof item.keywords === 'string') {
//           const keywordList = item.keywords.split(',').map(k => k.trim())
//           keywordList.forEach(keyword => {
//             if (keyword) {
//               contentKeywords.add(keyword)
//             }
//           })
//         }
//       })
      
//       // Add keywords to dropdown options
//       if (contentKeywords.size > 0) {
//         dropdownOptions['keywords'] = Array.from(contentKeywords).sort((a, b) => a.localeCompare(b))
//         console.log(`Keywords from content: Found ${contentKeywords.size} keywords`)
//       }
      
//       // Extract authors from content data
//       const contentAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.author && typeof item.author === 'string') {
//           contentAuthors.add(item.author.trim())
//         }
//         if (item.author?.name && typeof item.author.name === 'string') {
//           contentAuthors.add(item.author.name.trim())
//         }
//         if (item.author?.displayName && typeof item.author.displayName === 'string') {
//           contentAuthors.add(item.author.displayName.trim())
//         }
//       })
      
//       // Add authors to dropdown options
//       if (contentAuthors.size > 0) {
//         dropdownOptions['author'] = Array.from(contentAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Authors from content: Found ${contentAuthors.size} authors`)
//       }
      
//       // Extract blog authors from content data
//       const contentBlogAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.blogAuthor && typeof item.blogAuthor === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.trim())
//         }
//         if (item.blogAuthor?.name && typeof item.blogAuthor.name === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.name.trim())
//         }
//         if (item.blogAuthor?.displayName && typeof item.blogAuthor.displayName === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.displayName.trim())
//         }
//       })
      
//       // Add blog authors to dropdown options
//       if (contentBlogAuthors.size > 0) {
//         dropdownOptions['blogAuthor'] = Array.from(contentBlogAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Blog authors from content: Found ${contentBlogAuthors.size} blog authors`)
//       }
      
//       // Extract content group names from content data
//       const contentGroupNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroupName && typeof item.contentGroupName === 'string') {
//           contentGroupNames.add(item.contentGroupName.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroupNames.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroupNames.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content group names to dropdown options
//       if (contentGroupNames.size > 0) {
//         dropdownOptions['contentGroupName'] = Array.from(contentGroupNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Content group names from content: Found ${contentGroupNames.size} content group names`)
//       }
      
//       // Extract campaign names from content data
//       const contentCampaignNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaignName && typeof item.campaignName === 'string') {
//           contentCampaignNames.add(item.campaignName.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           contentCampaignNames.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           contentCampaignNames.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaign names to dropdown options
//       if (contentCampaignNames.size > 0) {
//         dropdownOptions['campaignName'] = Array.from(contentCampaignNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaign names from content: Found ${contentCampaignNames.size} campaign names`)
//       }
      
//       // Extract categories from content data
//       const contentCategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.category && typeof item.category === 'string') {
//           contentCategories.add(item.category.trim())
//         }
//         if (item.contentGroup?.category && typeof item.contentGroup.category === 'string') {
//           contentCategories.add(item.contentGroup.category.trim())
//         }
//         if (item.campaign?.category && typeof item.campaign.category === 'string') {
//           contentCategories.add(item.campaign.category.trim())
//         }
//       })
      
//       // Add categories to dropdown options
//       if (contentCategories.size > 0) {
//         dropdownOptions['category'] = Array.from(contentCategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Categories from content: Found ${contentCategories.size} categories`)
//       }
      
//       // Extract subcategories from content data
//       const contentSubcategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.subcategory && typeof item.subcategory === 'string') {
//           contentSubcategories.add(item.subcategory.trim())
//         }
//         if (item.contentGroup?.subcategory && typeof item.contentGroup.subcategory === 'string') {
//           contentSubcategories.add(item.contentGroup.subcategory.trim())
//         }
//         if (item.campaign?.subcategory && typeof item.campaign.subcategory === 'string') {
//           contentSubcategories.add(item.campaign.subcategory.trim())
//         }
//       })
      
//       // Add subcategories to dropdown options
//       if (contentSubcategories.size > 0) {
//         dropdownOptions['subcategory'] = Array.from(contentSubcategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Subcategories from content: Found ${contentSubcategories.size} subcategories`)
//       }
      
//       // Extract content groups from content data
//       const contentGroups = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroup && typeof item.contentGroup === 'string') {
//           contentGroups.add(item.contentGroup.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroups.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroups.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content groups to dropdown options
//       if (contentGroups.size > 0) {
//         dropdownOptions['contentGroup'] = Array.from(contentGroups).sort((a, b) => a.localeCompare(b))
//         console.log(`Content groups from content: Found ${contentGroups.size} content groups`)
//       }
      
//       // Extract campaigns from content data
//       const contentCampaigns = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaign && typeof item.campaign === 'string') {
//           contentCampaigns.add(item.campaign.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           contentCampaigns.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           contentCampaigns.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaigns to dropdown options
//       if (contentCampaigns.size > 0) {
//         dropdownOptions['campaign'] = Array.from(contentCampaigns).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaigns from content: Found ${contentCampaigns.size} campaigns`)
//       }
      
//       // Extract domains from content data
//       const contentDomains = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.domain && typeof item.domain === 'string') {
//           contentDomains.add(item.domain.trim())
//         }
//         if (item.hostname && typeof item.hostname === 'string') {
//           contentDomains.add(item.hostname.trim())
//         }
//         if (item.url && typeof item.url === 'string') {
//           try {
//             const url = new URL(item.url)
//             contentDomains.add(url.hostname)
//           } catch (e) {
//             // Invalid URL, skip
//           }
//         }
//       })
      
//       // Add domains to dropdown options
//       if (contentDomains.size > 0) {
//         dropdownOptions['domain'] = Array.from(contentDomains).sort((a, b) => a.localeCompare(b))
//         console.log(`Domains from content: Found ${contentDomains.size} domains`)
//       }
      
//       // Extract languages from content data
//       const contentLanguages = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.language && typeof item.language === 'string') {
//           contentLanguages.add(item.language.trim())
//         }
//         if (item.locale && typeof item.locale === 'string') {
//           contentLanguages.add(item.locale.trim())
//         }
//       })
      
//       // Add languages to dropdown options
//       if (contentLanguages.size > 0) {
//         dropdownOptions['language'] = Array.from(contentLanguages).sort((a, b) => a.localeCompare(b))
//         console.log(`Languages from content: Found ${contentLanguages.size} languages`)
//       }
      
//       // Extract states from content data
//       const contentStates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.state && typeof item.state === 'string') {
//           contentStates.add(item.state.trim())
//         }
//         if (item.status && typeof item.status === 'string') {
//           contentStates.add(item.status.trim())
//         }
//         if (item.publishState && typeof item.publishState === 'string') {
//           contentStates.add(item.publishState.trim())
//         }
//       })
      
//       // Add states to dropdown options
//       if (contentStates.size > 0) {
//         dropdownOptions['state'] = Array.from(contentStates).sort((a, b) => a.localeCompare(b))
//         console.log(`States from content: Found ${contentStates.size} states`)
//       }
      
//       // Extract publish dates from content data
//       const contentPublishDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.publishDate && typeof item.publishDate === 'string') {
//           contentPublishDates.add(item.publishDate.trim())
//         }
//         if (item.publishedAt && typeof item.publishedAt === 'string') {
//           contentPublishDates.add(item.publishedAt.trim())
//         }
//         if (item.scheduledDate && typeof item.scheduledDate === 'string') {
//           contentPublishDates.add(item.scheduledDate.trim())
//         }
//       })
      
//       // Add publish dates to dropdown options
//       if (contentPublishDates.size > 0) {
//         dropdownOptions['publishDate'] = Array.from(contentPublishDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Publish dates from content: Found ${contentPublishDates.size} publish dates`)
//       }
      
//       // Extract created and updated dates from content data
//       const contentCreatedDates = new Set<string>()
//       const contentUpdatedDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.createdAt && typeof item.createdAt === 'string') {
//           contentCreatedDates.add(item.createdAt.trim())
//         }
//         if (item.updatedAt && typeof item.updatedAt === 'string') {
//           contentUpdatedDates.add(item.updatedAt.trim())
//         }
//       })
      
//       // Add created dates to dropdown options
//       if (contentCreatedDates.size > 0) {
//         dropdownOptions['createdAt'] = Array.from(contentCreatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Created dates from content: Found ${contentCreatedDates.size} created dates`)
//       }
      
//       // Add updated dates to dropdown options
//       if (contentUpdatedDates.size > 0) {
//         dropdownOptions['updatedAt'] = Array.from(contentUpdatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Updated dates from content: Found ${contentUpdatedDates.size} updated dates`)
//       }
      
//       // Extract URLs from content data
//       const contentUrls = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.url && typeof item.url === 'string') {
//           contentUrls.add(item.url.trim())
//         }
//         if (item.absoluteUrl && typeof item.absoluteUrl === 'string') {
//           contentUrls.add(item.absoluteUrl.trim())
//         }
//         if (item.relativeUrl && typeof item.relativeUrl === 'string') {
//           contentUrls.add(item.relativeUrl.trim())
//         }
//       })
      
//       // Add URLs to dropdown options
//       if (contentUrls.size > 0) {
//         dropdownOptions['url'] = Array.from(contentUrls).sort((a, b) => a.localeCompare(b))
//         console.log(`URLs from content: Found ${contentUrls.size} URLs`)
//       }
      
//       // Extract titles from content data
//       const contentTitles = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.title && typeof item.title === 'string') {
//           contentTitles.add(item.title.trim())
//         }
//         if (item.htmlTitle && typeof item.htmlTitle === 'string') {
//           contentTitles.add(item.htmlTitle.trim())
//         }
//         if (item.publicTitle && typeof item.publicTitle === 'string') {
//           contentTitles.add(item.publicTitle.trim())
//         }
//       })
      
//       // Add titles to dropdown options
//       if (contentTitles.size > 0) {
//         dropdownOptions['title'] = Array.from(contentTitles).sort((a, b) => a.localeCompare(b))
//         console.log(`Titles from content: Found ${contentTitles.size} titles`)
//       }
      
//       // Extract descriptions from content data
//       const contentDescriptions = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.description && typeof item.description === 'string') {
//           contentDescriptions.add(item.description.trim())
//         }
//         if (item.metaDescription && typeof item.metaDescription === 'string') {
//           contentDescriptions.add(item.metaDescription.trim())
//         }
//         if (item.summary && typeof item.summary === 'string') {
//           contentDescriptions.add(item.summary.trim())
//         }
//       })
      
//       // Add descriptions to dropdown options
//       if (contentDescriptions.size > 0) {
//         dropdownOptions['description'] = Array.from(contentDescriptions).sort((a, b) => a.localeCompare(b))
//         console.log(`Descriptions from content: Found ${contentDescriptions.size} descriptions`)
//       }
      
//       // Extract keywords from content data
//       const contentKeywords = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.keywords && Array.isArray(item.keywords)) {
//           item.keywords.forEach(keyword => {
//             if (keyword && typeof keyword === 'string') {
//               contentKeywords.add(keyword.trim())
//             }
//           })
//         }
//         if (item.keywords && typeof item.keywords === 'string') {
//           const keywordList = item.keywords.split(',').map(k => k.trim())
//           keywordList.forEach(keyword => {
//             if (keyword) {
//               contentKeywords.add(keyword)
//             }
//           })
//         }
//       })
      
//       // Add keywords to dropdown options
//       if (contentKeywords.size > 0) {
//         dropdownOptions['keywords'] = Array.from(contentKeywords).sort((a, b) => a.localeCompare(b))
//         console.log(`Keywords from content: Found ${contentKeywords.size} keywords`)
//       }
      
//       // Extract authors from content data
//       const contentAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.author && typeof item.author === 'string') {
//           contentAuthors.add(item.author.trim())
//         }
//         if (item.author?.name && typeof item.author.name === 'string') {
//           contentAuthors.add(item.author.name.trim())
//         }
//         if (item.author?.displayName && typeof item.author.displayName === 'string') {
//           contentAuthors.add(item.author.displayName.trim())
//         }
//       })
      
//       // Add authors to dropdown options
//       if (contentAuthors.size > 0) {
//         dropdownOptions['author'] = Array.from(contentAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Authors from content: Found ${contentAuthors.size} authors`)
//       }
      
//       // Extract blog authors from content data
//       const contentBlogAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.blogAuthor && typeof item.blogAuthor === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.trim())
//         }
//         if (item.blogAuthor?.name && typeof item.blogAuthor.name === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.name.trim())
//         }
//         if (item.blogAuthor?.displayName && typeof item.blogAuthor.displayName === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.displayName.trim())
//         }
//       })
      
//       // Add blog authors to dropdown options
//       if (contentBlogAuthors.size > 0) {
//         dropdownOptions['blogAuthor'] = Array.from(contentBlogAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Blog authors from content: Found ${contentBlogAuthors.size} blog authors`)
//       }
      
//       // Extract content group names from content data
//       const contentGroupNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroupName && typeof item.contentGroupName === 'string') {
//           contentGroupNames.add(item.contentGroupName.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroupNames.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroupNames.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content group names to dropdown options
//       if (contentGroupNames.size > 0) {
//         dropdownOptions['contentGroupName'] = Array.from(contentGroupNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Content group names from content: Found ${contentGroupNames.size} content group names`)
//       }
      
//       // Extract campaign names from content data
//       const contentCampaignNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaignName && typeof item.campaignName === 'string') {
//           contentCampaignNames.add(item.campaignName.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           contentCampaignNames.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           contentCampaignNames.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaign names to dropdown options
//       if (contentCampaignNames.size > 0) {
//         dropdownOptions['campaignName'] = Array.from(contentCampaignNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaign names from content: Found ${contentCampaignNames.size} campaign names`)
//       }
      
//       // Extract categories from content data
//       const contentCategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.category && typeof item.category === 'string') {
//           contentCategories.add(item.category.trim())
//         }
//         if (item.contentGroup?.category && typeof item.contentGroup.category === 'string') {
//           contentCategories.add(item.contentGroup.category.trim())
//         }
//         if (item.campaign?.category && typeof item.campaign.category === 'string') {
//           contentCategories.add(item.campaign.category.trim())
//         }
//       })
      
//       // Add categories to dropdown options
//       if (contentCategories.size > 0) {
//         dropdownOptions['category'] = Array.from(contentCategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Categories from content: Found ${contentCategories.size} categories`)
//       }
      
//       // Extract subcategories from content data
//       const contentSubcategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.subcategory && typeof item.subcategory === 'string') {
//           contentSubcategories.add(item.subcategory.trim())
//         }
//         if (item.contentGroup?.subcategory && typeof item.contentGroup.subcategory === 'string') {
//           contentSubcategories.add(item.contentGroup.subcategory.trim())
//         }
//         if (item.campaign?.subcategory && typeof item.campaign.subcategory === 'string') {
//           contentSubcategories.add(item.campaign.subcategory.trim())
//         }
//       })
      
//       // Add subcategories to dropdown options
//       if (contentSubcategories.size > 0) {
//         dropdownOptions['subcategory'] = Array.from(contentSubcategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Subcategories from content: Found ${contentSubcategories.size} subcategories`)
//       }
      
//       // Extract content groups from content data
//       const contentGroups = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroup && typeof item.contentGroup === 'string') {
//           contentGroups.add(item.contentGroup.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroups.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroups.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content groups to dropdown options
//       if (contentGroups.size > 0) {
//         dropdownOptions['contentGroup'] = Array.from(contentGroups).sort((a, b) => a.localeCompare(b))
//         console.log(`Content groups from content: Found ${contentGroups.size} content groups`)
//       }
      
//       // Extract campaigns from content data
//       const contentCampaigns = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaign && typeof item.campaign === 'string') {
//           contentCampaigns.add(item.campaign.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           contentCampaigns.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           contentCampaigns.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaigns to dropdown options
//       if (contentCampaigns.size > 0) {
//         dropdownOptions['campaign'] = Array.from(contentCampaigns).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaigns from content: Found ${contentCampaigns.size} campaigns`)
//       }
      
//       // Extract domains from content data
//       const contentDomains = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.domain && typeof item.domain === 'string') {
//           contentDomains.add(item.domain.trim())
//         }
//         if (item.hostname && typeof item.hostname === 'string') {
//           contentDomains.add(item.hostname.trim())
//         }
//         if (item.url && typeof item.url === 'string') {
//           try {
//             const url = new URL(item.url)
//             contentDomains.add(url.hostname)
//           } catch (e) {
//             // Invalid URL, skip
//           }
//         }
//       })
      
//       // Add domains to dropdown options
//       if (contentDomains.size > 0) {
//         dropdownOptions['domain'] = Array.from(contentDomains).sort((a, b) => a.localeCompare(b))
//         console.log(`Domains from content: Found ${contentDomains.size} domains`)
//       }
      
//       // Extract languages from content data
//       const contentLanguages = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.language && typeof item.language === 'string') {
//           contentLanguages.add(item.language.trim())
//         }
//         if (item.locale && typeof item.locale === 'string') {
//           contentLanguages.add(item.locale.trim())
//         }
//       })
      
//       // Add languages to dropdown options
//       if (contentLanguages.size > 0) {
//         dropdownOptions['language'] = Array.from(contentLanguages).sort((a, b) => a.localeCompare(b))
//         console.log(`Languages from content: Found ${contentLanguages.size} languages`)
//       }
      
//       // Extract states from content data
//       const contentStates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.state && typeof item.state === 'string') {
//           contentStates.add(item.state.trim())
//         }
//         if (item.status && typeof item.status === 'string') {
//           contentStates.add(item.status.trim())
//         }
//         if (item.publishState && typeof item.publishState === 'string') {
//           contentStates.add(item.publishState.trim())
//         }
//       })
      
//       // Add states to dropdown options
//       if (contentStates.size > 0) {
//         dropdownOptions['state'] = Array.from(contentStates).sort((a, b) => a.localeCompare(b))
//         console.log(`States from content: Found ${contentStates.size} states`)
//       }
      
//       // Extract publish dates from content data
//       const contentPublishDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.publishDate && typeof item.publishDate === 'string') {
//           contentPublishDates.add(item.publishDate.trim())
//         }
//         if (item.publishedAt && typeof item.publishedAt === 'string') {
//           contentPublishDates.add(item.publishedAt.trim())
//         }
//         if (item.scheduledDate && typeof item.scheduledDate === 'string') {
//           contentPublishDates.add(item.scheduledDate.trim())
//         }
//       })
      
//       // Add publish dates to dropdown options
//       if (contentPublishDates.size > 0) {
//         dropdownOptions['publishDate'] = Array.from(contentPublishDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Publish dates from content: Found ${contentPublishDates.size} publish dates`)
//       }
      
//       // Extract created and updated dates from content data
//       const contentCreatedDates = new Set<string>()
//       const contentUpdatedDates = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.createdAt && typeof item.createdAt === 'string') {
//           contentCreatedDates.add(item.createdAt.trim())
//         }
//         if (item.updatedAt && typeof item.updatedAt === 'string') {
//           contentUpdatedDates.add(item.updatedAt.trim())
//         }
//       })
      
//       // Add created dates to dropdown options
//       if (contentCreatedDates.size > 0) {
//         dropdownOptions['createdAt'] = Array.from(contentCreatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Created dates from content: Found ${contentCreatedDates.size} created dates`)
//       }
      
//       // Add updated dates to dropdown options
//       if (contentUpdatedDates.size > 0) {
//         dropdownOptions['updatedAt'] = Array.from(contentUpdatedDates).sort((a, b) => a.localeCompare(b))
//         console.log(`Updated dates from content: Found ${contentUpdatedDates.size} updated dates`)
//       }
      
//       // Extract URLs from content data
//       const contentUrls = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.url && typeof item.url === 'string') {
//           contentUrls.add(item.url.trim())
//         }
//         if (item.absoluteUrl && typeof item.absoluteUrl === 'string') {
//           contentUrls.add(item.absoluteUrl.trim())
//         }
//         if (item.relativeUrl && typeof item.relativeUrl === 'string') {
//           contentUrls.add(item.relativeUrl.trim())
//         }
//       })
      
//       // Add URLs to dropdown options
//       if (contentUrls.size > 0) {
//         dropdownOptions['url'] = Array.from(contentUrls).sort((a, b) => a.localeCompare(b))
//         console.log(`URLs from content: Found ${contentUrls.size} URLs`)
//       }
      
//       // Extract titles from content data
//       const contentTitles = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.title && typeof item.title === 'string') {
//           contentTitles.add(item.title.trim())
//         }
//         if (item.htmlTitle && typeof item.htmlTitle === 'string') {
//           contentTitles.add(item.htmlTitle.trim())
//         }
//         if (item.publicTitle && typeof item.publicTitle === 'string') {
//           contentTitles.add(item.publicTitle.trim())
//         }
//       })
      
//       // Add titles to dropdown options
//       if (contentTitles.size > 0) {
//         dropdownOptions['title'] = Array.from(contentTitles).sort((a, b) => a.localeCompare(b))
//         console.log(`Titles from content: Found ${contentTitles.size} titles`)
//       }
      
//       // Extract descriptions from content data
//       const contentDescriptions = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.description && typeof item.description === 'string') {
//           contentDescriptions.add(item.description.trim())
//         }
//         if (item.metaDescription && typeof item.metaDescription === 'string') {
//           contentDescriptions.add(item.metaDescription.trim())
//         }
//         if (item.summary && typeof item.summary === 'string') {
//           contentDescriptions.add(item.summary.trim())
//         }
//       })
      
//       // Add descriptions to dropdown options
//       if (contentDescriptions.size > 0) {
//         dropdownOptions['description'] = Array.from(contentDescriptions).sort((a, b) => a.localeCompare(b))
//         console.log(`Descriptions from content: Found ${contentDescriptions.size} descriptions`)
//       }
      
//       // Extract keywords from content data
//       const contentKeywords = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.keywords && Array.isArray(item.keywords)) {
//           item.keywords.forEach(keyword => {
//             if (keyword && typeof keyword === 'string') {
//               contentKeywords.add(keyword.trim())
//             }
//           })
//         }
//         if (item.keywords && typeof item.keywords === 'string') {
//           const keywordList = item.keywords.split(',').map(k => k.trim())
//           keywordList.forEach(keyword => {
//             if (keyword) {
//               contentKeywords.add(keyword)
//             }
//           })
//         }
//       })
      
//       // Add keywords to dropdown options
//       if (contentKeywords.size > 0) {
//         dropdownOptions['keywords'] = Array.from(contentKeywords).sort((a, b) => a.localeCompare(b))
//         console.log(`Keywords from content: Found ${contentKeywords.size} keywords`)
//       }
      
//       // Extract authors from content data
//       const contentAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.author && typeof item.author === 'string') {
//           contentAuthors.add(item.author.trim())
//         }
//         if (item.author?.name && typeof item.author.name === 'string') {
//           contentAuthors.add(item.author.name.trim())
//         }
//         if (item.author?.displayName && typeof item.author.displayName === 'string') {
//           contentAuthors.add(item.author.displayName.trim())
//         }
//       })
      
//       // Add authors to dropdown options
//       if (contentAuthors.size > 0) {
//         dropdownOptions['author'] = Array.from(contentAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Authors from content: Found ${contentAuthors.size} authors`)
//       }
      
//       // Extract blog authors from content data
//       const contentBlogAuthors = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.blogAuthor && typeof item.blogAuthor === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.trim())
//         }
//         if (item.blogAuthor?.name && typeof item.blogAuthor.name === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.name.trim())
//         }
//         if (item.blogAuthor?.displayName && typeof item.blogAuthor.displayName === 'string') {
//           contentBlogAuthors.add(item.blogAuthor.displayName.trim())
//         }
//       })
      
//       // Add blog authors to dropdown options
//       if (contentBlogAuthors.size > 0) {
//         dropdownOptions['blogAuthor'] = Array.from(contentBlogAuthors).sort((a, b) => a.localeCompare(b))
//         console.log(`Blog authors from content: Found ${contentBlogAuthors.size} blog authors`)
//       }
      
//       // Extract content group names from content data
//       const contentGroupNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroupName && typeof item.contentGroupName === 'string') {
//           contentGroupNames.add(item.contentGroupName.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroupNames.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroupNames.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content group names to dropdown options
//       if (contentGroupNames.size > 0) {
//         dropdownOptions['contentGroupName'] = Array.from(contentGroupNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Content group names from content: Found ${contentGroupNames.size} content group names`)
//       }
      
//       // Extract campaign names from content data
//       const contentCampaignNames = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaignName && typeof item.campaignName === 'string') {
//           contentCampaignNames.add(item.campaignName.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           contentCampaignNames.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           contentCampaignNames.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaign names to dropdown options
//       if (contentCampaignNames.size > 0) {
//         dropdownOptions['campaignName'] = Array.from(contentCampaignNames).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaign names from content: Found ${contentCampaignNames.size} campaign names`)
//       }
      
//       // Extract categories from content data
//       const contentCategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.category && typeof item.category === 'string') {
//           contentCategories.add(item.category.trim())
//         }
//         if (item.contentGroup?.category && typeof item.contentGroup.category === 'string') {
//           contentCategories.add(item.contentGroup.category.trim())
//         }
//         if (item.campaign?.category && typeof item.campaign.category === 'string') {
//           contentCategories.add(item.campaign.category.trim())
//         }
//       })
      
//       // Add categories to dropdown options
//       if (contentCategories.size > 0) {
//         dropdownOptions['category'] = Array.from(contentCategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Categories from content: Found ${contentCategories.size} categories`)
//       }
      
//       // Extract subcategories from content data
//       const contentSubcategories = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.subcategory && typeof item.subcategory === 'string') {
//           contentSubcategories.add(item.subcategory.trim())
//         }
//         if (item.contentGroup?.subcategory && typeof item.contentGroup.subcategory === 'string') {
//           contentSubcategories.add(item.contentGroup.subcategory.trim())
//         }
//         if (item.campaign?.subcategory && typeof item.campaign.subcategory === 'string') {
//           contentSubcategories.add(item.campaign.subcategory.trim())
//         }
//       })
      
//       // Add subcategories to dropdown options
//       if (contentSubcategories.size > 0) {
//         dropdownOptions['subcategory'] = Array.from(contentSubcategories).sort((a, b) => a.localeCompare(b))
//         console.log(`Subcategories from content: Found ${contentSubcategories.size} subcategories`)
//       }
      
//       // Extract content groups from content data
//       const contentGroups = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.contentGroup && typeof item.contentGroup === 'string') {
//           contentGroups.add(item.contentGroup.trim())
//         }
//         if (item.contentGroup?.name && typeof item.contentGroup.name === 'string') {
//           contentGroups.add(item.contentGroup.name.trim())
//         }
//         if (item.contentGroup?.displayName && typeof item.contentGroup.displayName === 'string') {
//           contentGroups.add(item.contentGroup.displayName.trim())
//         }
//       })
      
//       // Add content groups to dropdown options
//       if (contentGroups.size > 0) {
//         dropdownOptions['contentGroup'] = Array.from(contentGroups).sort((a, b) => a.localeCompare(b))
//         console.log(`Content groups from content: Found ${contentGroups.size} content groups`)
//       }
      
//       // Extract campaigns from content data
//       const contentCampaigns = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.campaign && typeof item.campaign === 'string') {
//           contentCampaigns.add(item.campaign.trim())
//         }
//         if (item.campaign?.name && typeof item.campaign.name === 'string') {
//           contentCampaigns.add(item.campaign.name.trim())
//         }
//         if (item.campaign?.displayName && typeof item.campaign.displayName === 'string') {
//           contentCampaigns.add(item.campaign.displayName.trim())
//         }
//       })
      
//       // Add campaigns to dropdown options
//       if (contentCampaigns.size > 0) {
//         dropdownOptions['campaign'] = Array.from(contentCampaigns).sort((a, b) => a.localeCompare(b))
//         console.log(`Campaigns from content: Found ${contentCampaigns.size} campaigns`)
//       }
      
//       // Extract domains from content data
//       const contentDomains = new Set<string>()
      
//       allContent.forEach(item => {
//         if (item.domain && typeof item.domain === 'string') {
//           contentDomains.add(item.domain.trim())
//         }
//         if (item.hostname && typeof item.hostname === 'string') {
//           contentDomains.add(item.hostname.trim())
//         }
//         if (item.url && typeof item.url === 'string') {
//           try {
//             const url = new URL(item.url)
//             contentDomains.add(url.hostname)
//           } catch (e) {
//             // Invalid URL, skip
//           }
//         }
//       })
      
//       // Add domains to dropdown options
//       if (contentDomains.size > 0) {
//         dropdownOptions['domain'] = Array.from(contentDomains).sort((a, b) => a.localeCompare(b))
//         console.log(`Domains from content: Found ${contentDomains.size} domains`)
//       }
//     }
    
//     // Log summary of what we found
//     const fieldsWithOptions = Object.keys(dropdownOptions).length
//     console.log(`API Response: Found options for ${fieldsWithOptions} fields out of ${fieldsForDropdown.length} requested fields`)
    
//     return NextResponse.json({
//       success: true,
//       dropdownOptions,
//       totalContentItems: allContent.length,
//       fieldsWithOptions,
//       message: `Found dropdown options for ${fieldsWithOptions} fields from your HubSpot content`
//     })

//   } catch (error) {
//     console.error('Dropdown options API error:', error)
//     return NextResponse.json(
//       { success: false, error: 'An internal server error occurred.' },
//       { status: 500 }
//     )
//   }
// }
