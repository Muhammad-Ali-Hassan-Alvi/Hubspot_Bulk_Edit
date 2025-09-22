'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Clock, Database, Globe, Download } from 'lucide-react'
import { DateDisplay } from '@/components/shared/DateDisplay'

interface FreeTierBackupManagerProps {
  userId: string
  hubspotToken: string
  domain: string
  sheetId: string
}

export default function FreeTierBackupManager({
  userId,
  hubspotToken,
  domain,
  sheetId,
}: FreeTierBackupManagerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupData, setBackupData] = useState<any>(null)
  const { toast } = useToast()

  const runHubSpotAPIBackup = async () => {
    if (!hubspotToken) {
      toast({
        title: 'Error',
        description: 'HubSpot token is required',
        variant: 'destructive',
      })
      return
    }

    setIsRunning(true)
    try {
      // Fetch data from HubSpot free tier APIs
      const response = await fetch('/api/hubspot/free-tier-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: hubspotToken }),
      })

      const data = await response.json()
      if (data.success) {
        // Sync to Google Sheets
        const syncResponse = await fetch('/api/google/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetId,
            tabName: `hubspot-api-backup-${new Date().toISOString().split('T')[0]}`,
            pages: data.data,
            userId,
            filters: { source: 'hubspot_apis' },
          }),
        })

        const syncData = await syncResponse.json()
        if (syncData.success) {
          setBackupData(data)
          setLastBackup(new Date().toISOString())
          toast({
            title: 'HubSpot API Backup Complete! 🎉',
            description: `Backed up ${data.total} items to Google Sheets`,
          })
        } else {
          throw new Error(syncData.error)
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('HubSpot API backup error:', error)
      toast({
        title: 'Backup Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
    setIsRunning(false)
  }

  const runWebsiteBackup = async () => {
    if (!domain) {
      toast({
        title: 'Error',
        description: 'Website domain is required',
        variant: 'destructive',
      })
      return
    }

    setIsRunning(true)
    try {
      // Scrape website
      const response = await fetch('/api/hubspot/website-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, hubspotToken }),
      })

      const data = await response.json()
      if (data.success) {
        // Sync to Google Sheets
        const syncResponse = await fetch('/api/google/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetId,
            tabName: `website-backup-${new Date().toISOString().split('T')[0]}`,
            pages: data.pages,
            userId,
            filters: { source: 'website_scraping', domain },
          }),
        })

        const syncData = await syncResponse.json()
        if (syncData.success) {
          setBackupData(data)
          setLastBackup(new Date().toISOString())
          toast({
            title: 'Website Backup Complete! 🎉',
            description: `Backed up ${data.total} pages to Google Sheets`,
          })
        } else {
          throw new Error(syncData.error)
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Website backup error:', error)
      toast({
        title: 'Backup Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
    setIsRunning(false)
  }

  const runFullBackup = async () => {
    setIsRunning(true)
    try {
      // Run both backups sequentially
      await runHubSpotAPIBackup()
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
      await runWebsiteBackup()

      toast({
        title: 'Full Backup Complete! 🎉',
        description: 'Both HubSpot APIs and website have been backed up',
      })
    } catch (error) {
      console.error('Full backup error:', error)
      toast({
        title: 'Full Backup Failed',
        description: 'One or more backup methods failed',
        variant: 'destructive',
      })
    }
    setIsRunning(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Free Tier Backup System
        </CardTitle>
        <CardDescription>
          Backup your HubSpot data using free tier APIs and website scraping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? 'Running' : 'Ready'}
            </Badge>
          </div>
          {lastBackup && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Last Backup:</span>
              <span className="text-sm text-muted-foreground">
                <DateDisplay date={lastBackup} format="time" showTime={true} />
              </span>
            </div>
          )}
        </div>

        {/* Backup Options */}
        <Tabs defaultValue="full" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="full">Full Backup</TabsTrigger>
            <TabsTrigger value="api">HubSpot APIs</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Backup both HubSpot API data and website content
              </p>
              <Button
                onClick={runFullBackup}
                disabled={isRunning || !sheetId}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Full Backup...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Run Full Backup
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-accent border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-1">HubSpot API Backup</h4>
                <p className="text-sm text-blue-800">
                  Backs up: Blog posts, Contacts, Companies, Deals, Forms
                </p>
              </div>
              <Button
                onClick={runHubSpotAPIBackup}
                disabled={isRunning || !hubspotToken || !sheetId}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Backing up APIs...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Backup HubSpot APIs
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="website" className="space-y-4">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-medium text-green-900 mb-1">Website Scraping Backup</h4>
                <p className="text-sm text-green-800">
                  Scrapes your website pages and extracts content
                </p>
              </div>
              <Button
                onClick={runWebsiteBackup}
                disabled={isRunning || !domain || !sheetId}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scraping website...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Backup Website Pages
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Requirements Check */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Requirements:</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={hubspotToken ? 'default' : 'secondary'} className="w-3 h-3 p-0">
                {hubspotToken ? '✓' : '✗'}
              </Badge>
              <span>
                HubSpot Token {hubspotToken ? '(Connected)' : '(Required for API backup)'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={domain ? 'default' : 'secondary'} className="w-3 h-3 p-0">
                {domain ? '✓' : '✗'}
              </Badge>
              <span>Website Domain {domain ? `(${domain})` : '(Required for website backup)'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={sheetId ? 'default' : 'secondary'} className="w-3 h-3 p-0">
                {sheetId ? '✓' : '✗'}
              </Badge>
              <span>Google Sheet {sheetId ? '(Connected)' : '(Required)'}</span>
            </div>
          </div>
        </div>

        {/* Last Backup Results */}
        {backupData && (
          <div className="bg-popover border rounded-lg p-4">
            <h4 className="font-medium mb-2">Last Backup Results:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Items:</span> {backupData.total}
              </div>
              {backupData.breakdown &&
                Object.entries(backupData.breakdown).map(([type, count]) => (
                  <div key={type}>
                    <span className="font-medium capitalize">{type.replace('_', ' ')}:</span>{' '}
                    {count as number}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Free Tier Strategy:</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>
              • <strong>API Backup:</strong> Uses free HubSpot APIs for CRM data
            </li>
            <li>
              • <strong>Website Scraping:</strong> Extracts content from your live website
            </li>
            <li>
              • <strong>Sitemap Discovery:</strong> Finds pages automatically
            </li>
            <li>
              • <strong>Change Detection:</strong> Compares content over time
            </li>
            <li>
              • <strong>Google Sheets:</strong> Stores all data with timestamps
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
