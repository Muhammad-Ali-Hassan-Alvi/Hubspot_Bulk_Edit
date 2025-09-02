import {
  getHeadersByContentType,
  isHeaderReadOnly,
  getHeaderInfo,
  getReadOnlyHeaders,
  getEditableHeaders,
  getRecommendedHeaders,
  getAdditionalHeaders,
} from './utils'
import { HUBSPOT_HEADERS } from './hubspot-headers'

/**
 * Utility class for working with HubSpot content headers
 */
export class HubSpotHeaderManager {
  private contentType: string

  constructor(contentType: string) {
    this.contentType = contentType
  }

  /**
   * Get all headers for this content type
   */
  getAllHeaders() {
    return getHeadersByContentType(this.contentType)
  }

  /**
   * Get read-only headers for this content type
   */
  getReadOnlyHeaders() {
    return getReadOnlyHeaders(this.contentType)
  }

  /**
   * Get editable headers for this content type
   */
  getEditableHeaders() {
    return getEditableHeaders(this.contentType)
  }

  /**
   * Get recommended headers for this content type
   */
  getRecommendedHeaders() {
    return getRecommendedHeaders(this.contentType)
  }

  /**
   * Get additional headers for this content type
   */
  getAdditionalHeaders() {
    return getAdditionalHeaders(this.contentType)
  }

  /**
   * Check if a specific header is read-only
   */
  isHeaderReadOnly(headerName: string) {
    return isHeaderReadOnly(headerName, this.contentType)
  }

  /**
   * Get detailed information about a specific header
   */
  getHeaderInfo(headerName: string) {
    return getHeaderInfo(headerName, this.contentType)
  }

  /**
   * Process incoming data and categorize headers
   */
  processIncomingData(data: any) {
    const result = {
      editable: {} as Record<string, any>,
      readOnly: {} as Record<string, any>,
      unknown: {} as Record<string, any>,
      headerInfo: {} as Record<string, any>,
    }

    Object.keys(data).forEach(key => {
      const value = data[key]
      const headerInfo = this.getHeaderInfo(key)

      if (headerInfo) {
        result.headerInfo[key] = {
          category: headerInfo.category,
          isReadOnly: headerInfo.isReadOnly,
          dataType: headerInfo.dataType,
        }

        if (headerInfo.isReadOnly) {
          result.readOnly[key] = value
        } else {
          result.editable[key] = value
        }
      } else {
        result.unknown[key] = value
      }
    })

    return result
  }

  /**
   * Get headers grouped by category
   */
  getHeadersByCategory() {
    const headers = this.getAllHeaders()
    return {
      recommended: headers.filter(h => h.category === 'Recommended'),
      additional: headers.filter(h => h.category === 'Additional'),
    }
  }

  /**
   * Get headers grouped by read-only status
   */
  getHeadersByReadOnlyStatus() {
    const headers = this.getAllHeaders()
    return {
      readOnly: headers.filter(h => h.isReadOnly),
      editable: headers.filter(h => !h.isReadOnly),
    }
  }
}

/**
 * Create a header manager for a specific content type
 */
export const createHeaderManager = (contentType: string) => {
  return new HubSpotHeaderManager(contentType)
}

/**
 * Quick utility to check if a field is read-only for any content type
 */
export const isFieldReadOnly = (fieldName: string, contentType: string) => {
  return isHeaderReadOnly(fieldName, contentType)
}

/**
 * Get all available content types
 */
export const getAvailableContentTypes = () => {
  const contentTypes = new Set<string>()
  HUBSPOT_HEADERS.forEach(header => {
    header.contentType.forEach(type => contentTypes.add(type))
  })
  return Array.from(contentTypes)
}

/**
 * Get all available headers across all content types
 */
export const getAllAvailableHeaders = () => {
  const headers = new Set<string>()
  HUBSPOT_HEADERS.forEach(header => {
    headers.add(header.header)
  })
  return Array.from(headers)
}

/**
 * Validate if a header exists for a content type
 */
export const validateHeader = (headerName: string, contentType: string) => {
  return getHeaderInfo(headerName, contentType) !== undefined
}

/**
 * Get headers that are common across multiple content types
 */
export const getCommonHeaders = (contentTypes: string[]) => {
  const headerCounts = new Map<string, number>()

  HUBSPOT_HEADERS.forEach(header => {
    const commonTypes = header.contentType.filter(type => contentTypes.includes(type))
    if (commonTypes.length > 0) {
      headerCounts.set(header.header, (headerCounts.get(header.header) || 0) + commonTypes.length)
    }
  })

  return Array.from(headerCounts.entries())
    .filter(([_, count]) => count === contentTypes.length)
    .map(([header]) => header)
}
