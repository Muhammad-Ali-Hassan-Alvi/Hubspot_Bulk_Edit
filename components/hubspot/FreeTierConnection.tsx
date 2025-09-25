'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Globe, Database, Zap } from 'lucide-react'

interface FreeTierConnectionProps {
  onConnectionChange: (connected: boolean) => void
  onTokenChange: (token: string) => void
  onDomainChange: (domain: string) => void
}

export default function FreeTierConnection({
  onConnectionChange,
  onTokenChange,
  onDomainChange,
}: FreeTierConnectionProps) {
  const [token, setToken] = useState('')
  const [domain, setDomain] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  const testFreeTierConnection = async () => {
    if (!token.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a HubSpot token',
        variant: 'destructive',
      })
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/hubspot/free-tier-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      setTestResults(data)

      if (data.success) {
        setIsConnected(true)
        onConnectionChange(true)
        onTokenChange(token)
        toast({
          title: 'HubSpot Connected! 🎉',
          description: `Found ${data.total} items across ${data.successfulEndpoints?.length || 0} data types`,
        })
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect to HubSpot',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error testing HubSpot connection:', error)
      toast({
        title: 'Error',
        description: 'Failed to test HubSpot connection',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const testWebsiteScraping = async () => {
    if (!domain.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your website domain',
        variant: 'destructive',
      })
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/hubspot/website-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, hubspotToken: token }),
      })

      const data = await response.json()
      setTestResults(data)

      if (data.success) {
        onDomainChange(domain)
        toast({
          title: 'Website Scraping Successful! 🎉',
          description: `Found ${data.total} pages on your website`,
        })
      } else {
        toast({
          title: 'Scraping Failed',
          description: data.error || 'Failed to scrape website',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error scraping website:', error)
      toast({
        title: 'Error',
        description: 'Failed to scrape website',
        variant: 'destructive',
      })
    }
    setTesting(false)
  }

  const disconnect = () => {
    setToken('')
    setDomain('')
    setIsConnected(false)
    setTestResults(null)
    onConnectionChange(false)
    onTokenChange('')
    onDomainChange('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          HubSpot Free Tier Setup
        </CardTitle>
        <CardDescription>
          Connect to HubSpot's free tier APIs and scrape your website
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Warning about CMS Pages */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">CMS Pages API Not Available</h4>
              <p className="text-sm text-amber-800 mt-1">
                The CMS Pages API requires a paid HubSpot plan. We'll use alternative methods:
              </p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>
                  • <strong>Free APIs:</strong> Blog posts, contacts, companies, deals, forms
                </li>
                <li>
                  • <strong>Website Scraping:</strong> Extract pages from your website directly
                </li>
                <li>
                  • <strong>Sitemap Parsing:</strong> Discover pages from sitemap.xml
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Tabs defaultValue="api" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              HubSpot APIs
            </TabsTrigger>
            <TabsTrigger value="scraping" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website Scraping
            </TabsTrigger>
          </TabsList>

          {/* HubSpot API Tab */}
          <TabsContent value="api" className="space-y-4">
            {!isConnected ? (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  testFreeTierConnection()
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="hubspot-token">HubSpot Private App Token</Label>
                  <Input
                    id="hubspot-token"
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    This will access: Blog posts, Contacts, Companies, Deals, Forms
                  </p>
                </div>
                <Button type="submit" disabled={testing} className="w-full">
                  {testing ? 'Testing Connection...' : 'Test HubSpot APIs'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">✓ Connected to HubSpot APIs</span>
                  <Button variant="outline" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Website Scraping Tab */}
          <TabsContent value="scraping" className="space-y-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                testWebsiteScraping()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="website-domain">Your Website Domain</Label>
                <Input
                  id="website-domain"
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="example.com or 12345.hs-sites.com"
                />
                <p className="text-xs text-gray-500">
                  Enter your HubSpot website domain (without https://)
                </p>
              </div>
              <Button type="submit" disabled={testing} className="w-full">
                {testing ? 'Scraping Website...' : 'Scrape Website Pages'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Test Results */}
        {testResults && (
          <div className="mt-6 p-4 bg-popover rounded-lg">
            <h4 className="font-medium mb-3">Connection Results:</h4>
            {testResults.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Success</Badge>
                  <span className="text-sm">Found {testResults.total} items</span>
                </div>

                {testResults.breakdown && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(testResults.breakdown).map(
                      ([type, count]) =>
                        (count as number) > 0 && (
                          <div key={type} className="flex justify-between">
                            <span className="capitalize">{type.replace('_', ' ')}:</span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        )
                    )}
                  </div>
                )}

                {testResults.successfulEndpoints && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      Working APIs: {testResults.successfulEndpoints.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="destructive">Failed</Badge>
                <p className="text-sm text-red-600">{testResults.error}</p>
                {testResults.suggestion && (
                  <p className="text-xs text-muted-foreground">{testResults.suggestion}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-accent border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Free Tier Backup Strategy:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>HubSpot APIs:</strong> Backup CRM data, blog posts, forms
            </li>
            <li>
              • <strong>Website Scraping:</strong> Backup actual website pages and content
            </li>
            <li>
              • <strong>Combined Approach:</strong> Get comprehensive backup coverage
            </li>
            <li>
              • <strong>Change Detection:</strong> Compare scraped content over time
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
