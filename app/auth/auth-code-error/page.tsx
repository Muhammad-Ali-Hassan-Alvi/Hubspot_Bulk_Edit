import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-popover flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>There was a problem with your login link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">What happened?</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• The login link may have expired</li>
              <li>• The link may have been used already</li>
              <li>• There was a network error</li>
            </ul>
          </div>

          <div className="bg-accent border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What to do next:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Go back and request a new magic link</li>
              <li>• Try signing in with email/password instead</li>
              <li>• Check your email for the latest link</li>
            </ul>
          </div>

          <Button asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
