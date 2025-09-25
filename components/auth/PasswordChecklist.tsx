'use client'

import { getPasswordChecks } from '@/lib/validators/password'
import { CheckCircle, Circle } from 'lucide-react'

interface PasswordChecklistProps {
  password: string
  className?: string
}

export default function PasswordChecklist({ password, className = '' }: PasswordChecklistProps) {
  const checks = getPasswordChecks(password)

  return (
    <div className={`space-y-2 text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      <ChecklistItem label="At least 8 characters" checked={checks.length} />
      <ChecklistItem label="One lowercase letter" checked={checks.lowercase} />
      <ChecklistItem label="One uppercase letter" checked={checks.uppercase} />
      <ChecklistItem label="One number" checked={checks.number} />
      <ChecklistItem label="One special character" checked={checks.special} />
    </div>
  )
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  const Icon = checked ? CheckCircle : Circle
  const iconClass = checked ? 'text-green-600' : 'text-gray-400'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`${iconClass} w-4 h-4`} />
      <span>{label}</span>
    </div>
  )
}
