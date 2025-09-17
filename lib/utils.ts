import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { IN_APP_EDITABLE_FIELDS } from './constants'
import { HUBSPOT_HEADERS } from './hubspot-headers'
import { HubSpotHeader } from './hubspot-headers'
import { NextRequest } from 'next/server'

// Helper functions to work with the headers
export const getHeadersByContentType = (contentType: string): HubSpotHeader[] => {
  return HUBSPOT_HEADERS.filter(header => header.contentType.includes(contentType))
}

export const getRecommendedHeaders = (contentType: string): string[] => {
  return getHeadersByContentType(contentType)
    .filter(header => header.category === 'Recommended' && header.inAppEdit === false)
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

export const getHeaderInfo = (
  headerName: string,
  contentType: string
): HubSpotHeader | undefined => {
  return HUBSPOT_HEADERS.find(h => h.header === headerName && h.contentType.includes(contentType))
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getHubSpotInAppEditFields = (contentType: string): Set<string> => {
  return new Set(getInAppEditHeaders(contentType).map(header => header.header))
}

// Combined in-app edit fields (existing + HubSpot specific)
export const getCombinedInAppEditFields = (contentType: string): Set<string> => {
  const hubSpotInAppEdit = getHubSpotInAppEditFields(contentType)
  return new Set([...IN_APP_EDITABLE_FIELDS, ...hubSpotInAppEdit])
}

// Simple UUID v4 generator that works in browser and server environments
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const getRequestOrigin = (request: NextRequest): string => {
  const url = new URL(request.url)
  const origin = url.origin // dynamic origin (e.g., https://yourdomain.vercel.app)
  return origin
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
