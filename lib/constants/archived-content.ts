/**
 * Configuration for archived content filtering across the application
 *
 * Set to false to exclude archived content from all API calls
 * Set to true to include archived content in all API calls
 *
 * This affects:
 * - Content counts API
 * - Pages API
 * - Export data functionality
 * - Dashboard displays
 */
export const INCLUDE_ARCHIVED_CONTENT = false

/**
 * Helper function to get the archived parameter for HubSpot API calls
 * @returns The archived parameter value or undefined if not needed
 */
export const getArchivedParam = (): string | undefined => {
  return INCLUDE_ARCHIVED_CONTENT ? undefined : 'false'
}

/**
 * Helper function to get the disclaimer text for content counts
 * @returns The appropriate disclaimer based on archived content setting
 */
export const getArchivedContentDisclaimer = (): string => {
  return INCLUDE_ARCHIVED_CONTENT
    ? 'All counts include archived content.'
    : 'All counts exclude archived content.'
}
