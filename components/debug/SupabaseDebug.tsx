'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

export default function SupabaseDebug() {
  const [status, setStatus] = useState<{
    connection: boolean
    auth: boolean
    database: boolean
    error?: string
  }>({
    connection: false,
    auth: false,
    database: false,
  })
  const [loading, setLoading] = useState(true)

  const testSupabaseConnection = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      console.log('=== SUPABASE DEBUG ===')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')

      // Test 1: Basic connection
      console.log('Testing basic connection...')
      const { error: healthError } = await supabase.from('user_settings').select('count').limit(1)

      if (healthError) {
        console.error('Health check failed:', healthError)
        throw new Error(`Database connection failed: ${healthError.message}`)
      }

      console.log('✅ Basic connection successful')

      // Test 2: Auth service
      console.log('Testing auth service...')
      const { data: authData, error: authError } = await supabase.auth.getSession()

      if (authError) {
        console.error('Auth service failed:', authError)
        setStatus({
          connection: true,
          auth: false,
          database: true,
          error: `Auth service error: ${authError.message}`,
        })
      } else {
        console.log('✅ Auth service working')
        console.log('Current session:', authData.session ? 'Active' : 'None')

        // Test 3: Database operations
        console.log('Testing database operations...')
        const { error: dbError } = await supabase
          .from('user_settings')
          .select('id')
          .limit(1)
          .maybeSingle()

        if (dbError && dbError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is fine
          console.error('Database operation failed:', dbError)
          setStatus({
            connection: true,
            auth: true,
            database: false,
            error: `Database error: ${dbError.message}`,
          })
        } else {
          console.log('✅ Database operations working')
          setStatus({
            connection: true,
            auth: true,
            database: true,
          })
        }
      }
    } catch (error) {
      console.error('=== SUPABASE ERROR ===')
      console.error('Error:', error)
      setStatus({
        connection: false,
        auth: false,
        database: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Supabase Connection Debug
        </CardTitle>
        <CardDescription>Testing your Supabase configuration and connection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Check */}
        <div className="space-y-2">
          <h4 className="font-medium">Environment Variables</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-2 bg-popover rounded">
              <span className="text-sm">NEXT_PUBLIC_SUPABASE_URL</span>
              <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'default' : 'destructive'}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-popover rounded">
              <span className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <Badge
                variant={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'default' : 'destructive'}
              >
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Connection Status</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-2 bg-popover rounded">
              <span className="text-sm">Basic Connection</span>
              <Badge
                variant={status.connection ? 'default' : loading ? 'secondary' : 'destructive'}
              >
                {loading ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : status.connection ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {loading ? 'Testing...' : status.connection ? 'Connected' : 'Failed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-popover rounded">
              <span className="text-sm">Auth Service</span>
              <Badge variant={status.auth ? 'default' : loading ? 'secondary' : 'destructive'}>
                {loading ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : status.auth ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {loading ? 'Testing...' : status.auth ? 'Working' : 'Failed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-popover rounded">
              <span className="text-sm">Database Access</span>
              <Badge variant={status.database ? 'default' : loading ? 'secondary' : 'destructive'}>
                {loading ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : status.database ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {loading ? 'Testing...' : status.database ? 'Working' : 'Failed'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error Details */}
        {status.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
            <p className="text-sm text-red-800">{status.error}</p>
          </div>
        )}

        {/* Configuration Help */}
        <div className="bg-accent border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Configuration Checklist</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Verify your Supabase project is active</li>
            <li>• Check that RLS policies allow anonymous access where needed</li>
            <li>• Ensure redirect URLs include: http://localhost:3000/auth/callback</li>
            <li>• Verify your database tables exist (run the SQL scripts)</li>
          </ul>
        </div>

        {/* Retry Button */}
        <Button onClick={testSupabaseConnection} disabled={loading} className="w-full">
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection Test
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
