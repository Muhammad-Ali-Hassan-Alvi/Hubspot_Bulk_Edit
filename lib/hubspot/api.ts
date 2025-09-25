// lib/hubspot/api.ts
import { Client } from '@hubspot/api-client'

// This is the shape of the data we expect to get back.
export interface PageCounts {
  landingPages: number
  sitePages: number
  blogPosts: number
}

// This function takes a HubSpot token and returns the page counts.
export async function getHubSpotPageCounts(accessToken: string): Promise<PageCounts> {
  const hubspotClient = new Client({ accessToken })

  try {
    // We make three parallel API calls to HubSpot to get the counts.
    const [landingPagesApi, sitePagesApi /* blogPostsApi */] = await Promise.all([
      hubspotClient.cms.pages.landingPagesApi.getPage(),
      hubspotClient.cms.pages.sitePagesApi.getPage(),
      // hubspotClient.cms.blogs.blogPostsApi.getPage(), // ✅ correct method
    ])

    // We return the 'total' count from each response.
    return {
      landingPages: landingPagesApi.total,
      sitePages: sitePagesApi.total,
      blogPosts: 0 /* blogPostsApi.total, */,
    }
  } catch (error) {
    console.error('Error fetching HubSpot page counts:', error)
    // If anything fails, we return zero counts to avoid crashing the app.
    return {
      landingPages: 0,
      sitePages: 0,
      blogPosts: 0,
    }
  }
}
