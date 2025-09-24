# DateDisplay Component

A reusable component for consistent date formatting across the platform. Ensures all dates are displayed in dd/mm/yyyy format.

## Usage

```tsx
import { DateDisplay } from '@/components/shared/DateDisplay'

// Basic usage
<DateDisplay date="2024-01-15" />

// With time
<DateDisplay date="2024-01-15T14:30:00Z" format="time" showTime={true} />

// Short format (dd/mm/yyyy)
<DateDisplay date="2024-01-15" format="short" />

// Relative time (e.g., "2h ago", "3d ago")
<DateDisplay date="2024-01-15" format="relative" />

// With custom styling
<DateDisplay
  date="2024-01-15"
  className="text-sm text-muted-foreground"
  fallback="No date available"
/>
```

## Props

| Prop        | Type                                            | Default  | Description                       |
| ----------- | ----------------------------------------------- | -------- | --------------------------------- |
| `date`      | `string \| Date \| number \| null \| undefined` | -        | The date to display               |
| `format`    | `'full' \| 'short' \| 'time' \| 'relative'`     | `'full'` | Format type                       |
| `className` | `string`                                        | -        | Additional CSS classes            |
| `fallback`  | `string`                                        | `'N/A'`  | Text to show when date is invalid |
| `showTime`  | `boolean`                                       | `false`  | Whether to show time with date    |

## Format Types

- **`full`**: `15/01/2024` (default)
- **`short`**: `15/01/2024` (same as full)
- **`time`**: `15/01/2024 14:30:00` (with time)
- **`relative`**: `2h ago`, `3d ago`, `15/01/2024` (for older dates)

## Hook Usage

```tsx
import { useDateFormatter } from '@/components/shared/DateDisplay'

const { formatDate } = useDateFormatter()

const formattedDate = formatDate('2024-01-15', { format: 'short' })
```

## Migration Guide

Replace all instances of:

- `new Date(date).toLocaleDateString()`
- `new Date(date).toLocaleString()`
- `new Date(date).toLocaleTimeString()`

With:

- `<DateDisplay date={date} format="short" />`
- `<DateDisplay date={date} format="time" showTime={true} />`
- `<DateDisplay date={date} format="time" showTime={true} />`
