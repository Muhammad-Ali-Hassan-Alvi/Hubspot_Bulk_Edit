export const EXCLUDED_KEYS_FROM_TABLE = new Set([
  'id',
  'archivedAt',
  'archivedInDashboard',
  'attachedStylesheets',
  'categoryId',
  'contentGroupId',
  'created',
  'createdById',
  'currentState',
  'currentlyPublished',
  'enableGoogleAmpOutputOverride',
  'layoutSections',
  'publicAccessRules',
  'publicAccessRulesEnabled',
  'tagIds',
  'translations',
  'updatedById',
  'useFeaturedImage',
  'widgetContainers',
  'widgets',
])

export const CONTENT_TYPES = [
  // { value: 'all-pages', label: 'All Pages' },
  { value: 'landing-pages', label: 'Landing Pages' },
  { value: 'site-pages', label: 'Website Pages' },
  { value: 'blog-posts', label: 'Blog Posts' },
  { value: 'blogs', label: 'Blogs' },
  { value: 'tags', label: 'Tags' },
  { value: 'authors', label: 'Authors' },
  { value: 'url-redirects', label: 'URL Redirects' },
  { value: 'hubdb-tables', label: 'HubDB Tables' },
] as const

// Fields that are in-app editable (should be excluded from export headers)
// This is now dynamically generated from the HubSpot headers system
export const IN_APP_EDITABLE_FIELDS = new Set([
  'subcategory',
  'useFeaturedImage',
  'allowComments',
  'campaign',
  'enableGoogleAmpOutputOverride',
  'pageExpiryEnabled',
  'allowChildTables',
  'allowPublicApiAccess',
  'dynamicMetaTags',
  'enableChildTablePages',
  'useForPages',
  'archivedInDashboard',
  'domain',
  'language',
  'publishDate',
  'state',
  'blogAuthorId',
  'isMatchFullUrl',
  'isMatchQueryString',
  'isOnlyAfterNotFound',
  'isPattern',
  'isProtocolAgnostic',
  'isTrailingSlashOptional',
  'precedence',
  'redirectStyle',
  'tagIds',
])

// Fields that should always be included in exports (required fields)
export const REQUIRED_EXPORT_FIELDS = new Set(['id', 'name'])

// Fields that are recommended for exports (commonly used fields)
export const RECOMMENDED_EXPORT_FIELDS = new Set([
  'slug',
  'url',
  'htmlTitle',
  'metaDescription',
  'createdAt',
  'updatedAt',
  'contentType',
  'authorName',
  'published',
  'featuredImage',
  'featuredImageAltText',
  'linkRelCanonicalUrl',
  'templatePath',
  'pageRedirected',
])

// Content type mapping for API endpoints
export const CONTENT_TYPE_MAPPING = {
  'all-pages': 'All Pages',
  'landing-pages': 'Landing Pages',
  'site-pages': 'Website Pages',
  'blog-posts': 'Blog Posts',
  blogs: 'Blogs',
  tags: 'Tags',
  authors: 'Authors',
  'url-redirects': 'URL Redirects',
  'hubdb-tables': 'HubDB Tables',
} as const

// Unified editable fields based on specific requirements
export const EDITABLE_FIELDS = [
  { key: 'redirectStyle', label: 'Redirect Style', type: 'number' },
  { key: 'language', label: 'Language', type: 'string' },
  { key: 'state', label: 'State', type: 'select', options: ['DRAFT', 'PUBLISHED_OR_SCHEDULED'] },
  { key: 'publishDate', label: 'Publish Date', type: 'datetime' },
  { key: 'domain', label: 'Domain', type: 'string' },
  { key: 'tagIds', label: 'Tag IDs', type: 'array' },
  { key: 'useForPages', label: 'Use For Pages', type: 'boolean' },
  { key: 'dynamicMetaTags', label: 'Dynamic Meta Tags', type: 'object' },
  { key: 'enableChildTablePages', label: 'Enable Child Table Pages', type: 'boolean' },
  { key: 'allowPublicApiAccess', label: 'Allow Public API Access', type: 'boolean' },
  { key: 'allowChildTables', label: 'Allow Child Tables', type: 'boolean' },
  { key: 'isPattern', label: 'Is Pattern', type: 'boolean' },
  { key: 'precedence', label: 'Precedence', type: 'number' },
  { key: 'isTrailingSlashOptional', label: 'Is Trailing Slash Optional', type: 'boolean' },
  { key: 'isProtocolAgnostic', label: 'Is Protocol Agnostic', type: 'boolean' },
  { key: 'isOnlyAfterNotFound', label: 'Is Only After Not Found', type: 'boolean' },
  { key: 'isMatchQueryString', label: 'Is Match Query String', type: 'boolean' },
  { key: 'isMatchFullUrl', label: 'Is Match Full URL', type: 'boolean' },
  { key: 'archivedInDashboard', label: 'Archived in Dashboard', type: 'boolean' },
  { key: 'useFeaturedImage', label: 'Use Featured Image', type: 'boolean' },
  { key: 'blogAuthorId', label: 'Blog Author ID', type: 'string' },
  {
    key: 'enableGoogleAmpOutputOverride',
    label: 'Enable Google AMP Output Override',
    type: 'boolean',
  },
  { key: 'allowComments', label: 'Allow Comments', type: 'boolean' },
  { key: 'subcategory', label: 'Subcategory', type: 'string' },
  { key: 'pageExpiryEnabled', label: 'Page Expiry Enabled', type: 'boolean' },
  { key: 'campaign', label: 'Campaign', type: 'string' },
] as const

// Filter fields based on specific requirements
export const FILTER_FIELDS = [
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'routePrefix', label: 'Route Prefix', type: 'string' },
  { key: 'redirectStyle', label: 'Redirect Style', type: 'number' },
  { key: 'destination', label: 'Destination', type: 'string' },
  { key: 'slug', label: 'Slug', type: 'string' },
  { key: 'language', label: 'Language', type: 'string' },
  { key: 'htmlTitle', label: 'HTML Title', type: 'string' },
  { key: 'state', label: 'State', type: 'select', options: ['DRAFT', 'PUBLISHED_OR_SCHEDULED'] },
  { key: 'publishDate', label: 'Publish Date', type: 'datetime' },
  { key: 'domain', label: 'Domain', type: 'string' },
  { key: 'authorName', label: 'Author Name', type: 'string' },
  { key: 'metaDescription', label: 'Meta Description', type: 'string' },
  { key: 'tagIds', label: 'Tag IDs', type: 'array' },
  { key: 'publicTitle', label: 'Public Title', type: 'string' },
] as const
