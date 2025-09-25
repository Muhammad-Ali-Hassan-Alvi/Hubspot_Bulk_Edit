# HubSpot Headers System

This system provides a comprehensive way to manage HubSpot content headers with their properties, read-only status, and categorization.

## Overview

The HubSpot Headers System consists of three main files:

1. **`lib/hubspot-headers.ts`** - Core header definitions and helper functions
2. **`lib/hubspot-utils.ts`** - Utility classes and functions for working with headers
3. **`lib/constants.ts`** - Integration with existing constants

## Structure

Each header has the following properties:

```typescript
interface HubSpotHeader {
  header: string // The field name
  contentType: string[] // Which content types this field applies to
  category: 'Recommended' | 'Additional' // Field category
  isReadOnly: boolean // Whether the field is read-only
  dataType: string // Data type (string, number, boolean, etc.)
}
```

## Content Types Supported

- Website Page
- Landing Page
- Blog Post
- Blog
- Tags
- Authors
- URL Redirects
- HubDB Tables

## Usage Examples

### Basic Usage

```typescript
import { isHeaderReadOnly, getHeaderInfo } from '@/lib/hubspot-headers'

// Check if a field is read-only
const isReadOnly = isHeaderReadOnly('htmlTitle', 'Landing Page') // false

// Get detailed header information
const headerInfo = getHeaderInfo('id', 'Blog Post')
// Returns: { header: 'id', category: 'Recommended', isReadOnly: true, dataType: 'string' }
```

### Using the Header Manager

```typescript
import { createHeaderManager } from '@/lib/hubspot-utils'

const manager = createHeaderManager('Landing Page')

// Get all headers for Landing Pages
const allHeaders = manager.getAllHeaders()

// Get only editable headers
const editableHeaders = manager.getEditableHeaders()

// Get only read-only headers
const readOnlyHeaders = manager.getReadOnlyHeaders()

// Get recommended headers
const recommendedHeaders = manager.getRecommendedHeaders()

// Process incoming data
const data = { id: '123', name: 'Test Page', htmlTitle: 'Test' }
const processed = manager.processIncomingData(data)
// Returns: { editable: {...}, readOnly: {...}, unknown: {...}, headerInfo: {...} }
```

### Integration with API Routes

The system is already integrated into your HubSpot pages API route (`app/api/hubspot/pages/route.ts`). When you fetch content, it now returns:

```typescript
{
  id: '123',
  name: 'Test Page',
  allHeaders: { /* all fields */ },
  exportHeaders: { /* fields for export */ },
  inAppEditHeaders: { /* editable fields */ },
  readOnlyHeaders: { /* read-only fields */ },
  headerInfo: { /* metadata about each field */ },
  contentType: 'Landing Page'
}
```

## Helper Functions

### From `hubspot-headers.ts`

- `getHeadersByContentType(contentType)` - Get all headers for a content type
- `getReadOnlyHeaders(contentType)` - Get read-only headers
- `getEditableHeaders(contentType)` - Get editable headers
- `getRecommendedHeaders(contentType)` - Get recommended headers
- `getAdditionalHeaders(contentType)` - Get additional headers
- `isHeaderReadOnly(headerName, contentType)` - Check if header is read-only
- `getHeaderInfo(headerName, contentType)` - Get detailed header info

### From `hubspot-utils.ts`

- `createHeaderManager(contentType)` - Create a header manager instance
- `getAvailableContentTypes()` - Get all available content types
- `getAllAvailableHeaders()` - Get all available headers
- `validateHeader(headerName, contentType)` - Validate header exists
- `getCommonHeaders(contentTypes)` - Get headers common to multiple types

## Integration with Existing Constants

The system integrates with your existing `IN_APP_EDITABLE_FIELDS` constant:

```typescript
import { getCombinedEditableFields } from '@/lib/constants'

// Get all editable fields (existing + HubSpot specific)
const editableFields = getCombinedEditableFields('Landing Page')
```

## Example Component

See `components/examples/HubSpotHeadersExample.tsx` for a complete example of how to use the system in a React component.

## Benefits

1. **Centralized Management** - All HubSpot header information in one place
2. **Type Safety** - Full TypeScript support with interfaces
3. **Flexibility** - Easy to add new headers or modify existing ones
4. **Performance** - Efficient lookups using Maps
5. **Integration** - Works seamlessly with existing code
6. **Categorization** - Headers are categorized as Recommended or Additional
7. **Read-Only Detection** - Automatic detection of read-only fields

## Adding New Headers

To add a new header, simply add it to the `HUBSPOT_HEADERS` array in `lib/hubspot-headers.ts`:

```typescript
{
  header: 'newField',
  contentType: ['Website Page', 'Landing Page'],
  category: 'Additional',
  isReadOnly: false,
  dataType: 'string'
}
```

## Migration from Old System

The system is backward compatible. Your existing `IN_APP_EDITABLE_FIELDS` constant continues to work, and the new system enhances it rather than replacing it.

## Performance Considerations

- The system uses Maps for O(1) lookups
- Headers are cached after first access
- No unnecessary re-computations
- Memory efficient with shared references
