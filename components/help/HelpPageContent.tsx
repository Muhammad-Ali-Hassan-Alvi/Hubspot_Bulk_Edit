// components/help/HelpPageContent.tsx

import { Lightbulb, CloudUpload, Clock, RefreshCw } from 'lucide-react'

const steps = [
  {
    icon: <Lightbulb className="w-6 h-6 text-yellow-500" />,
    title: 'Connect HubSpot',
    description: 'Link your HubSpot account to begin managing content.',
  },
  {
    icon: <CloudUpload className="w-6 h-6 text-blue-500" />,
    title: 'Enable Backups',
    description: 'Set up daily automated backups to Google Sheets.',
  },
  {
    icon: <Clock className="w-6 h-6 text-green-500" />,
    title: 'View History',
    description: 'Browse version history and review past changes.',
  },
  {
    icon: <RefreshCw className="w-6 h-6 text-purple-500" />,
    title: 'Rollback Changes',
    description: 'Revert pages to any previous version instantly.',
  },
]

export default function HelpPageContent() {
  return (
    <div className="space-y-8 bg">
      <h1 className="text-3xl font-bold text-center">Welcome to Smuves 🎉</h1>
      <p className="text-center text-muted-foreground">
        Here’s a quick guide to help you get started.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-background rounded-2xl shadow-md p-6 flex items-start space-x-4"
          >
            <div>{step.icon}</div>
            <div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
