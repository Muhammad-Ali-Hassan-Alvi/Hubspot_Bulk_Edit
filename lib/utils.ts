import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { IN_APP_EDITABLE_FIELDS } from './constants'
import { HUBSPOT_HEADERS } from './hubspot-headers'
import { HubSpotHeader } from './hubspot-headers'

// Helper functions to work with the headers
export const getHeadersByContentType = (contentType: string): HubSpotHeader[] => {
  return HUBSPOT_HEADERS.filter(header => header.contentType.includes(contentType))
}

export const getReadOnlyHeaders = (contentType: string): string[] => {
  return getHeadersByContentType(contentType)
    .filter(header => header.isReadOnly)
    .map(header => header.header)
}

export const getEditableHeaders = (contentType: string): string[] => {
  return getHeadersByContentType(contentType)
    .filter(header => !header.isReadOnly)
    .map(header => header.header)
}

export const getRecommendedHeaders = (contentType: string): string[] => {
  return getHeadersByContentType(contentType)
    .filter(header => header.category === 'Recommended' && header.inAppEdit === false)
    .map(header => header.header)
}

export const getAdditionalHeaders = (contentType: string): string[] => {
  return getHeadersByContentType(contentType)
    .filter(header => header.category === 'Additional')
    .map(header => header.header)
}

export const getAdditionalHeadersWithoutInAppEdits = (contentType: string): string[] => {
  return getHeadersByContentType(contentType)
    .filter(header => header.category === 'Additional' && header.inAppEdit === false)
    .map(header => header.header)
}

export const getInAppEditHeaders = (contentType: string): HubSpotHeader[] => {
  return getHeadersByContentType(contentType).filter(header => header.inAppEdit)
}

export const isHeaderReadOnly = (headerName: string, contentType: string): boolean => {
  const header = HUBSPOT_HEADERS.find(
    h => h.header === headerName && h.contentType.includes(contentType)
  )
  return header?.isReadOnly ?? false
}

export const isHeaderInAppEdit = (headerName: string, contentType: string): boolean => {
  const header = HUBSPOT_HEADERS.find(
    h => h.header === headerName && h.contentType.includes(contentType)
  )
  return header?.inAppEdit ?? false
}

export const getHeaderInfo = (
  headerName: string,
  contentType: string
): HubSpotHeader | undefined => {
  return HUBSPOT_HEADERS.find(h => h.header === headerName && h.contentType.includes(contentType))
}

// Create a map for quick lookups
export const HEADERS_MAP = new Map<string, Map<string, HubSpotHeader>>()

// Initialize the map
HUBSPOT_HEADERS.forEach(header => {
  header.contentType.forEach(contentType => {
    if (!HEADERS_MAP.has(contentType)) {
      HEADERS_MAP.set(contentType, new Map())
    }
    HEADERS_MAP.get(contentType)!.set(header.header, header)
  })
})

// Quick lookup function
export const getHeaderByTypeAndName = (
  contentType: string,
  headerName: string
): HubSpotHeader | undefined => {
  return HEADERS_MAP.get(contentType)?.get(headerName)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper functions to get HubSpot-specific fields
export const getHubSpotEditableFields = (contentType: string): Set<string> => {
  return new Set(getEditableHeaders(contentType))
}

export const getHubSpotReadOnlyFields = (contentType: string): Set<string> => {
  return new Set(getReadOnlyHeaders(contentType))
}

export const getHubSpotRecommendedFields = (contentType: string): Set<string> => {
  return new Set(getRecommendedHeaders(contentType))
}

export const getHubSpotAdditionalFields = (contentType: string): Set<string> => {
  return new Set(getAdditionalHeaders(contentType))
}

export const getHubSpotInAppEditFields = (contentType: string): Set<string> => {
  return new Set(getInAppEditHeaders(contentType).map(header => header.header))
}

export const getHubSpotFilterableFields = (contentType: string): Set<string> => {
  return new Set(
    getHeadersByContentType(contentType)
      .filter(header => header.filters)
      .map(header => header.header)
  )
}

// Convert HubSpotHeader objects to EditableField format
export const getHubSpotInAppEditFieldsAsObjects = (contentType: string) => {
  return getInAppEditHeaders(contentType).map(header => ({
    key: header.header,
    label:
      header.header.charAt(0).toUpperCase() + header.header.slice(1).replace(/([A-Z])/g, ' $1'),
    type:
      header.dataType === 'date-time'
        ? 'datetime'
        : header.dataType === 'boolean'
          ? 'boolean'
          : header.dataType === 'number'
            ? 'number'
            : 'string',
    options: header.dataType === 'boolean' ? (['true', 'false'] as const) : undefined,
  }))
}

// Combined editable fields (existing + HubSpot specific)
export const getCombinedEditableFields = (contentType: string): Set<string> => {
  const hubSpotEditable = getHubSpotEditableFields(contentType)
  return new Set([...IN_APP_EDITABLE_FIELDS, ...hubSpotEditable])
}

// Combined in-app edit fields (existing + HubSpot specific)
export const getCombinedInAppEditFields = (contentType: string): Set<string> => {
  const hubSpotInAppEdit = getHubSpotInAppEditFields(contentType)
  return new Set([...IN_APP_EDITABLE_FIELDS, ...hubSpotInAppEdit])
}

export const getFilterableFields = (contentType: string): Set<string> => {
  const hubSpotFilterable = getHubSpotFilterableFields(contentType)
  return new Set([...IN_APP_EDITABLE_FIELDS, ...hubSpotFilterable])
}

// Content type normalization utilities
export const normalizeContentType = {
  // Convert to lowercase with underscores (for database/filename use)
  toSnakeCase: (contentType: string): string => {
    return contentType.replace(/-/g, '_').replace(/\s+/g, '_').toLowerCase()
  },

  // Convert to lowercase with spaces (for display use)
  toDisplayFormat: (contentType: string): string => {
    return contentType.replace(/_/g, ' ').replace(/-/g, ' ').toLowerCase()
  },

  // Convert to lowercase with hyphens (for URL/API use)
  toKebabCase: (contentType: string): string => {
    return contentType.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
  },

  // Normalize for comparison (handles both formats)
  forComparison: (contentType: string): string => {
    return contentType
      .replace(/[-_\s]+/g, ' ')
      .toLowerCase()
      .trim()
  },
}
