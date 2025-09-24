// Content type field availability mapping based on HubSpot headers data
// This determines which fields are available for filtering for each content type

export interface ContentTypeFieldAvailability {
  [contentType: string]: {
    [fieldName: string]: boolean
  }
}

// Field availability mapping based on the provided data
export const CONTENT_TYPE_FIELD_AVAILABILITY: ContentTypeFieldAvailability = {
  'site-pages': {
    publishDate: true,
    state: true,
    language: true,
    name: true,
    slug: true,
    htmlTitle: true,
    authorName: true,
    domain: true,
    metaDescription: true,
    tagIds: true,
    publicTitle: false,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  'landing-pages': {
    publishDate: true,
    state: true,
    language: true,
    name: true,
    slug: true,
    htmlTitle: true,
    authorName: true,
    domain: true,
    metaDescription: false,
    tagIds: false,
    publicTitle: false,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  'blog-posts': {
    publishDate: true,
    state: true,
    language: true,
    name: true,
    slug: true,
    htmlTitle: true,
    authorName: false,
    domain: false,
    metaDescription: true,
    tagIds: true,
    publicTitle: false,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  blogs: {
    publishDate: false,
    state: false,
    language: true,
    name: true,
    slug: true,
    htmlTitle: false,
    authorName: false,
    domain: false,
    metaDescription: false,
    tagIds: false,
    publicTitle: true,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  tags: {
    publishDate: false,
    state: false,
    language: true,
    name: true,
    slug: true,
    htmlTitle: false,
    authorName: false,
    domain: false,
    metaDescription: false,
    tagIds: false,
    publicTitle: true,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  authors: {
    publishDate: false,
    state: false,
    language: false,
    name: true,
    slug: false,
    htmlTitle: false,
    authorName: false,
    domain: false,
    metaDescription: false,
    tagIds: false,
    publicTitle: true,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  'url-redirects': {
    publishDate: false,
    state: false,
    language: false,
    name: true,
    slug: false,
    htmlTitle: false,
    authorName: false,
    domain: false,
    metaDescription: false,
    tagIds: false,
    publicTitle: false,
    destination: true,
    routePrefix: true,
    redirectStyle: true,
  },
  'hubdb-tables': {
    publishDate: false,
    state: false,
    language: false,
    name: true,
    slug: false,
    htmlTitle: false,
    authorName: false,
    domain: false,
    metaDescription: false,
    tagIds: false,
    publicTitle: false,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
  category: {
    publishDate: false,
    state: false,
    language: false,
    name: true,
    slug: false,
    htmlTitle: false,
    authorName: false,
    domain: false,
    metaDescription: false,
    tagIds: false,
    publicTitle: false,
    destination: false,
    routePrefix: false,
    redirectStyle: false,
  },
}

/**
 * Check if a field is available for filtering for a specific content type
 */
export function isFieldAvailableForContentType(contentType: string, fieldName: string): boolean {
  const contentTypeData = CONTENT_TYPE_FIELD_AVAILABILITY[contentType]
  if (!contentTypeData) {
    // If content type not found, default to true for common fields
    return ['name', 'slug', 'language'].includes(fieldName)
  }

  return contentTypeData[fieldName] === true
}

/**
 * Get all available filter fields for a content type
 */
export function getAvailableFilterFields(contentType: string): string[] {
  const contentTypeData = CONTENT_TYPE_FIELD_AVAILABILITY[contentType]
  if (!contentTypeData) {
    // Default fields if content type not found
    return ['name', 'slug', 'language']
  }

  return Object.entries(contentTypeData)
    .filter(([_, isAvailable]) => isAvailable)
    .map(([fieldName, _]) => fieldName)
}

/**
 * Check if State filter should be shown for a content type
 */
export function shouldShowStateFilter(contentType: string): boolean {
  return isFieldAvailableForContentType(contentType, 'state')
}

/**
 * Check if Publish Date filter should be shown for a content type
 */
export function shouldShowPublishDateFilter(contentType: string): boolean {
  return isFieldAvailableForContentType(contentType, 'publishDate')
}
