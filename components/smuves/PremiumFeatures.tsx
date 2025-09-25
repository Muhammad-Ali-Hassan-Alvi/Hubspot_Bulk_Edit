'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Crown, Check, Zap, Shield, Clock, BarChart3, RefreshCw, Calendar } from 'lucide-react'
import { DateDisplay } from '@/components/shared/DateDisplay'

interface PremiumFeaturesProps {
  user: User
  userSettings: any
  onUpgrade: () => void
}

export default function PremiumFeatures({ user, userSettings, onUpgrade }: PremiumFeaturesProps) {
  console.log(user)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would integrate with Stripe/Paddle
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Coming Soon! 🚀',
        description: "Premium features will be available soon. We'll notify you when ready!",
      })

      onUpgrade()
    } catch (error) {
      console.error('Upgrade failed:', error)
      toast({
        title: 'Error',
        description: 'Failed to process upgrade',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const premiumFeatures = [
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: 'Advanced Rollback Engine',
      description: 'One-click rollback to any previous version with detailed change tracking',
      category: 'Recovery',
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'Automated Daily Backups',
      description: 'Automatic backups every day with 30-day retention and change detection',
      category: 'Automation',
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: 'Enhanced Analytics & Reports',
      description: 'Detailed reports on changes, usage patterns, and content performance',
      category: 'Analytics',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Advanced Validation Rules',
      description: 'Custom validation rules and approval workflows for sensitive changes',
      category: 'Safety',
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: 'Scheduled Syncing',
      description: 'Schedule automatic syncs at specific times and intervals',
      category: 'Automation',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Multi-Content Type Support',
      description: 'Sync blogs, landing pages, redirects, and other HubSpot content types',
      category: 'Content',
    },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      current: !userSettings.is_premium,
      features: [
        'Manual page syncing',
        'Basic field editing',
        'Manual backups',
        'Basic audit logs',
        'Up to 100 pages',
      ],
      limitations: [
        'No automatic backups',
        'No rollback features',
        'Limited to basic fields',
        'No scheduled syncing',
      ],
    },
    {
      name: 'Premium',
      price: '$29',
      period: 'per month',
      current: userSettings.is_premium,
      popular: true,
      features: [
        'Everything in Free',
        'Automatic daily backups',
        'Advanced rollback engine',
        'All content types',
        'Scheduled syncing',
        'Enhanced analytics',
        'Priority support',
        'Unlimited pages',
      ],
      limitations: [],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card
        className={userSettings.is_premium ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown
              className={`h-5 w-5 ${
                userSettings.is_premium ? 'text-yellow-600' : 'text-muted-foreground/70'
              }`}
            />
            Current Plan: {userSettings.is_premium ? 'Premium' : 'Free'}
          </CardTitle>
          <CardDescription>
            {userSettings.is_premium
              ? `Your premium plan ${
                  userSettings.premium_expires_at
                    ? `expires on ${(<DateDisplay date={userSettings.premium_expires_at} format="short" />)}`
                    : 'is active'
                }`
              : 'Upgrade to unlock advanced features and automation'}
          </CardDescription>
        </CardHeader>
        {!userSettings.is_premium && (
          <CardContent>
            <Button onClick={handleUpgrade} disabled={loading} size="lg" className="w-full">
              {loading ? 'Processing...' : 'Upgrade to Premium'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Premium Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Features</CardTitle>
          <CardDescription>
            Advanced capabilities to make your content management safer and more efficient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {premiumFeatures.map((feature, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  userSettings.is_premium
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-popover'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      userSettings.is_premium
                        ? 'bg-green-100 text-green-600'
                        : 'bg-muted text-muted-foreground/70'
                    }`}
                  >
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{feature.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {feature.category}
                      </Badge>
                      {userSettings.is_premium && <Check className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pricingPlans.map((plan, index) => (
          <Card
            key={index}
            className={`relative ${
              plan.popular
                ? 'border-blue-200 bg-accent'
                : plan.current
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-foreground">Most Popular</Badge>
              </div>
            )}
            {plan.current && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-foreground">Current Plan</Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                {plan.price}
                <span className="text-lg font-normal text-muted-foreground">/{plan.period}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-900">Included:</h4>
                <ul className="space-y-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {plan.limitations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-muted-foreground">Limitations:</h4>
                  <ul className="space-y-1">
                    {plan.limitations.map((limitation, limitIndex) => (
                      <li
                        key={limitIndex}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="w-4 h-4 text-center">×</span>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!plan.current && (
                <Button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {loading ? 'Processing...' : `Upgrade to ${plan.name}`}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROI Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Return on Investment</CardTitle>
          <CardDescription>See how Premium features save you time and reduce risks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-accent border border-blue-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">5+ hours</div>
              <div className="text-sm text-blue-700">Saved per week with automation</div>
            </div>
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-900">99.9%</div>
              <div className="text-sm text-green-700">Uptime with automatic backups</div>
            </div>
            <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">$500+</div>
              <div className="text-sm text-purple-700">Potential cost of content mistakes</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-popover border border-gray-200 rounded-lg">
            <h4 className="font-medium mb-2">Typical Premium User Saves:</h4>
            <ul className="text-sm space-y-1">
              <li>• 5+ hours per week on manual backup tasks</li>
              <li>• Eliminates risk of losing content changes</li>
              <li>• Reduces website downtime from content errors</li>
              <li>• Enables non-technical team members to manage content safely</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your Premium subscription at any time. You'll continue to have
              access to Premium features until the end of your billing period.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">What happens to my backups if I downgrade?</h4>
            <p className="text-sm text-muted-foreground">
              Your existing backups will remain accessible, but automatic backups will stop. You can
              still create manual backups on the Free plan.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Is there a setup fee?</h4>
            <p className="text-sm text-muted-foreground">
              No setup fees. Premium features are activated immediately upon upgrade.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Do you offer team discounts?</h4>
            <p className="text-sm text-muted-foreground">
              Team features and discounts will be available in a future update. Contact us for early
              access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
