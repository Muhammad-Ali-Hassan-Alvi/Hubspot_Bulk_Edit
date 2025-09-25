export const IN_APP_EDITABLE_FIELDS = new Set([
  'blogAuthorId',
  'enableGoogleAmpOutputOverride',
  'tagIds',
  'language',
  'campaign',
  'pageExpiryEnabled',
  'archivedInDashboard',
  'domain',
  'publishDate',
  'state',
  'useFeaturedImage',
])

export const EDITABLE_FIELDS_BY_TYPE: {
  [key: string]: { key: string; label: string; type: string; options?: string[] }[]
} = {
  'landing-pages': [
    { key: 'state', label: 'State', type: 'select', options: ['PUBLISHED', 'DRAFT'] },
    { key: 'domain', label: 'Domain', type: 'string' },
    { key: 'publishDate', label: 'Publish Date', type: 'datetime-local' },
    { key: 'archivedInDashboard', label: 'Archived', type: 'boolean' },
    { key: 'campaign', label: 'Campaign', type: 'string' },
    { key: 'useFeaturedImage', label: 'Use Featured Image', type: 'boolean' },
    { key: 'pageExpiryEnabled', label: 'Page Expiry Enabled', type: 'boolean' },
  ],
  'site-pages': [
    { key: 'state', label: 'State', type: 'select', options: ['PUBLISHED', 'DRAFT'] },
    { key: 'language', label: 'Language', type: 'string' },
    { key: 'domain', label: 'Domain', type: 'string' },
    { key: 'publishDate', label: 'Publish Date', type: 'datetime-local' },
    { key: 'archivedInDashboard', label: 'Archived', type: 'boolean' },
    { key: 'useFeaturedImage', label: 'Use Featured Image', type: 'boolean' },
  ],
  'blog-posts': [
    { key: 'state', label: 'State', type: 'select', options: ['PUBLISHED', 'DRAFT'] },
    { key: 'blogAuthorId', label: 'Blog Author ID', type: 'string' },
    { key: 'tagIds', label: 'Tag IDs (comma-separated)', type: 'string' },
    { key: 'domain', label: 'Domain', type: 'string' },
    { key: 'language', label: 'Language', type: 'string' },
    { key: 'publishDate', label: 'Publish Date', type: 'datetime-local' },
    { key: 'archivedInDashboard', label: 'Archived', type: 'boolean' },
    { key: 'useFeaturedImage', label: 'Use Featured Image', type: 'boolean' },
    { key: 'enableGoogleAmpOutputOverride', label: 'Enable Google AMP', type: 'boolean' },
  ],
  blogs: [
    { key: 'language', label: 'Language', type: 'string' },
    { key: 'allowComments', label: 'Allow Comments', type: 'boolean' },
  ],
  'all-pages': [
    { key: 'state', label: 'State', type: 'select', options: ['PUBLISHED', 'DRAFT'] },
    { key: 'domain', label: 'Domain', type: 'string' },
    { key: 'publishDate', label: 'Publish Date', type: 'datetime-local' },
    { key: 'archivedInDashboard', label: 'Archived', type: 'boolean' },
    { key: 'useFeaturedImage', label: 'Use Featured Image', type: 'boolean' },
  ],
}
