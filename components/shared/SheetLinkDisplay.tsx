import { Button } from '@/components/ui/button'
import { FileSpreadsheet, ExternalLink } from 'lucide-react'

interface SheetLinkDisplayProps {
  sheetId: string
  sheetName: string
  className?: string
}

export default function SheetLinkDisplay({
  sheetId,
  sheetName,
  className = '',
}: SheetLinkDisplayProps) {
  const getSheetUrl = () => {
    if (sheetId) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}`
    }
    return ''
  }

  const handleOpenSheet = () => {
    const url = getSheetUrl()
    if (url) {
      window.open(url, '_blank')
    }
  }

  if (!sheetId) {
    return null
  }

  return (
    <div
      className={`flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg ${className}`}
    >
      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
      <span className="text-sm text-blue-800">View Sheet:</span>
      <Button
        variant="link"
        size="sm"
        onClick={handleOpenSheet}
        className="p-0 h-auto text-blue-800 hover:text-blue-900"
      >
        {sheetName}
      </Button>
      <ExternalLink className="h-3 w-3 text-blue-600" />
    </div>
  )
}
