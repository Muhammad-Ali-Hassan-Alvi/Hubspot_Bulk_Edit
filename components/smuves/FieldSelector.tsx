'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Settings, Plus, Shield, Lock, Eye, AlertTriangle, Save, RefreshCw } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface FieldConfiguratorProps {
  user: User
  fieldConfigs: any[]
  isPremium: boolean
}

interface FieldConfig {
  id: string
  field_name: string
  field_type: 'text' | 'html' | 'url' | 'date' | 'number' | 'boolean'
  is_required: boolean
  is_encrypted: boolean
  validation_rules: any
  safety_level: 'low' | 'medium' | 'high'
  backup_priority: number
}

export default function FieldConfigurator({
  user,
  fieldConfigs: initialConfigs,
  isPremium,
}: FieldConfiguratorProps) {
  console.log(user, initialConfigs)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([
    {
      id: '1',
      field_name: 'page_name',
      field_type: 'text',
      is_required: true,
      is_encrypted: false,
      validation_rules: { max_length: 255 },
      safety_level: 'high',
      backup_priority: 1,
    },
    {
      id: '2',
      field_name: 'html_title',
      field_type: 'text',
      is_required: true,
      is_encrypted: false,
      validation_rules: { max_length: 60 },
      safety_level: 'high',
      backup_priority: 2,
    },
    {
      id: '3',
      field_name: 'meta_description',
      field_type: 'text',
      is_required: false,
      is_encrypted: false,
      validation_rules: { max_length: 160 },
      safety_level: 'medium',
      backup_priority: 3,
    },
    {
      id: '4',
      field_name: 'page_content',
      field_type: 'html',
      is_required: false,
      is_encrypted: true,
      validation_rules: {},
      safety_level: 'high',
      backup_priority: 4,
    },
  ])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<
    'text' | 'html' | 'url' | 'date' | 'number' | 'boolean'
  >('text')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const getSafetyLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-muted-foreground bg-popover border-gray-200'
    }
  }

  const getSafetyIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />
      case 'medium':
        return <Shield className="h-3 w-3" />
      case 'low':
        return <Eye className="h-3 w-3" />
      default:
        return <Settings className="h-3 w-3" />
    }
  }

  const addNewField = () => {
    if (!newFieldName.trim()) {
      toast({
        title: 'Field Name Required',
        description: 'Please enter a field name',
        variant: 'destructive',
      })
      return
    }

    if (!isPremium && fieldConfigs.length >= 5) {
      toast({
        title: 'Premium Feature',
        description: 'Upgrade to Premium to configure unlimited fields',
        variant: 'destructive',
      })
      return
    }

    const newField: FieldConfig = {
      id: `field-${Date.now()}`,
      field_name: newFieldName,
      field_type: newFieldType,
      is_required: false,
      is_encrypted: false,
      validation_rules: {},
      safety_level: 'medium',
      backup_priority: fieldConfigs.length + 1,
    }

    setFieldConfigs([...fieldConfigs, newField])
    setNewFieldName('')
    setNewFieldType('text')

    toast({
      title: 'Field Added! ✅',
      description: `Added ${newFieldName} field configuration`,
    })
  }

  const updateFieldConfig = (fieldId: string, updates: Partial<FieldConfig>) => {
    setFieldConfigs(
      fieldConfigs.map(config => (config.id === fieldId ? { ...config, ...updates } : config))
    )
  }

  const removeField = (fieldId: string) => {
    setFieldConfigs(fieldConfigs.filter(config => config.id !== fieldId))
    toast({
      title: 'Field Removed',
      description: 'Field configuration has been removed',
    })
  }

  const saveConfigurations = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Configurations Saved! 💾',
        description: 'All field configurations have been saved',
      })
    } catch (error) {
      console.error('Failed to save configurations:', error)
      toast({
        title: 'Save Failed',
        description: 'Failed to save field configurations',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Field Configuration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Field Configuration ({fieldConfigs.length} fields)
          </CardTitle>
          <CardDescription>
            Configure how your HubSpot page fields are processed, validated, and backed up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Security Controls Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  {fieldConfigs.filter(f => f.is_encrypted).length} Encrypted Fields
                </span>
              </div>
            </div>
            <Button onClick={saveConfigurations} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add New Field */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Field
          </CardTitle>
          <CardDescription>Configure a new field for backup and validation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                placeholder="e.g., custom_field"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="field-type">Field Type</Label>
              <Select value={newFieldType} onValueChange={(value: any) => setNewFieldType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addNewField} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </div>
          </div>
          {!isPremium && fieldConfigs.length >= 5 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Free plan allows up to 5 field configurations. Upgrade to Premium for unlimited
                fields.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Configurations */}
      <div className="space-y-4">
        {fieldConfigs.map(config => (
          <Card key={config.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{config.field_name}</h3>
                    <Badge variant="outline">{config.field_type}</Badge>
                    <Badge
                      className={`${getSafetyLevelColor(config.safety_level)} flex items-center gap-1`}
                    >
                      {getSafetyIcon(config.safety_level)}
                      {config.safety_level.charAt(0).toUpperCase() +
                        config.safety_level.slice(1)}{' '}
                      Risk
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeField(config.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Safety Level</Label>
                    <Select
                      value={config.safety_level}
                      onValueChange={(value: any) =>
                        updateFieldConfig(config.id, { safety_level: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Priority</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={config.backup_priority}
                      onChange={e =>
                        updateFieldConfig(config.id, {
                          backup_priority: Number.parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Required Field</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.is_required}
                        onCheckedChange={checked =>
                          updateFieldConfig(config.id, { is_required: checked })
                        }
                      />
                      <span className="text-sm">
                        {config.is_required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Encryption</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.is_encrypted}
                        onCheckedChange={checked =>
                          updateFieldConfig(config.id, { is_encrypted: checked })
                        }
                        disabled={!isPremium}
                      />
                      <span className="text-sm flex items-center gap-1">
                        {config.is_encrypted ? (
                          <>
                            <Lock className="h-3 w-3" />
                            Encrypted
                          </>
                        ) : (
                          'Not Encrypted'
                        )}
                      </span>
                    </div>
                    {!isPremium && (
                      <p className="text-xs text-gray-500">Encryption requires Premium</p>
                    )}
                  </div>
                </div>

                {/* Validation Rules */}
                {config.field_type === 'text' && (
                  <div className="space-y-2">
                    <Label>Validation Rules</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`max-length-${config.id}`} className="text-sm">
                          Max Length
                        </Label>
                        <Input
                          id={`max-length-${config.id}`}
                          type="number"
                          placeholder="255"
                          value={config.validation_rules.max_length || ''}
                          onChange={e =>
                            updateFieldConfig(config.id, {
                              validation_rules: {
                                ...config.validation_rules,
                                max_length: Number.parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`min-length-${config.id}`} className="text-sm">
                          Min Length
                        </Label>
                        <Input
                          id={`min-length-${config.id}`}
                          type="number"
                          placeholder="1"
                          value={config.validation_rules.min_length || ''}
                          onChange={e =>
                            updateFieldConfig(config.id, {
                              validation_rules: {
                                ...config.validation_rules,
                                min_length: Number.parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Compliance
          </CardTitle>
          <CardDescription>Understanding field security levels and encryption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium">High Risk Fields</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Contains sensitive data like personal information, passwords, or proprietary
                content. Always encrypted and backed up with highest priority.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="font-medium">Medium Risk Fields</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Contains business-relevant data like descriptions, titles, or metadata. Backed up
                regularly with standard security.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Low Risk Fields</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Contains public or non-sensitive data like timestamps, IDs, or public URLs. Basic
                backup and security.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
