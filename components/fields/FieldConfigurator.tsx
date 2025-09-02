'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Settings,
  AlertTriangle,
  Shield,
  Plus,
  Edit,
  Trash2,
  Crown,
  CheckCircle,
} from 'lucide-react'

interface FieldConfiguratorProps {
  user: User
  fieldConfigs?: any[]
  isPremium?: boolean
}
interface FieldConfig {
  id: string
  field_name: string
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'json' | 'html'
  is_required: boolean
  is_high_risk: boolean
  validation_rules: string
  default_value: string
  description: string
  created_at: string
  updated_at: string
}
const fieldTypes = [
  { value: 'text', label: 'Text', description: 'Plain text content' },
  { value: 'number', label: 'Number', description: 'Numeric values' },
  { value: 'date', label: 'Date', description: 'Date and time values' },
  { value: 'boolean', label: 'Boolean', description: 'True/false values' },
  { value: 'json', label: 'JSON', description: 'Structured data objects' },
  { value: 'html', label: 'HTML', description: 'Rich text and HTML content' },
]
const commonFields = [
  { name: 'page_title', type: 'text', description: 'Page title and SEO title' },
  { name: 'meta_description', type: 'text', description: 'SEO meta description' },
  { name: 'page_content', type: 'html', description: 'Main page content and body' },
  { name: 'page_url', type: 'text', description: 'Page URL and slug' },
  { name: 'publish_date', type: 'date', description: 'Page publication date' },
  { name: 'last_modified', type: 'date', description: 'Last modification timestamp' },
  { name: 'is_published', type: 'boolean', description: 'Publication status' },
  { name: 'page_template', type: 'text', description: 'Template used for the page' },
]

export default function FieldConfigurator({
  // user,
  // fieldConfigs,
  isPremium = false,
}: FieldConfiguratorProps) {
  const [configs, setConfigs] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [editingConfig, setEditingConfig] = useState<FieldConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'text' as FieldConfig['field_type'],
    is_required: false,
    is_high_risk: false,
    validation_rules: '',
    default_value: '',
    description: '',
  })
  const { toast } = useToast()

  const loadConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const mockConfigs: FieldConfig[] = [
        {
          id: '1',
          field_name: 'page_title',
          field_type: 'text',
          is_required: true,
          is_high_risk: false,
          validation_rules: 'min:1,max:60',
          default_value: '',
          description: 'Page title for SEO and display',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          field_name: 'page_content',
          field_type: 'html',
          is_required: true,
          is_high_risk: true,
          validation_rules: 'required',
          default_value: '',
          description: 'Main page content - high risk for data loss',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          field_name: 'publish_date',
          field_type: 'date',
          is_required: false,
          is_high_risk: false,
          validation_rules: 'date',
          default_value: '',
          description: 'When the page was published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      setConfigs(mockConfigs)
    } catch (error) {
      console.error('Load configs error:', error)
      toast({
        title: 'Failed to Load Configurations',
        description: 'Could not retrieve field configurations',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const saveConfig = async () => {
    if (!formData.field_name.trim()) {
      toast({ title: 'Error', description: 'Field name is required', variant: 'destructive' })
      return
    }
    try {
      const configData: FieldConfig = {
        id: editingConfig?.id || Date.now().toString(),
        ...formData,
        created_at: editingConfig?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      if (editingConfig) {
        setConfigs(configs.map(config => (config.id === editingConfig.id ? configData : config)))
        toast({
          title: 'Configuration Updated',
          description: `Field "${formData.field_name}" has been updated`,
        })
      } else {
        setConfigs([...configs, configData])
        toast({
          title: 'Configuration Created',
          description: `Field "${formData.field_name}" has been configured`,
        })
      }
      resetForm()
      setDialogOpen(false)
    } catch (error) {
      console.error('Save config error:', error)
      toast({
        title: 'Save Failed',
        description: 'Could not save field configuration',
        variant: 'destructive',
      })
    }
  }

  const editConfig = (config: FieldConfig) => {
    setEditingConfig(config)
    setFormData({
      field_name: config.field_name,
      field_type: config.field_type,
      is_required: config.is_required,
      is_high_risk: config.is_high_risk,
      validation_rules: config.validation_rules,
      default_value: config.default_value,
      description: config.description,
    })
    setDialogOpen(true)
  }

  const deleteConfig = async (configId: string) => {
    try {
      setConfigs(configs.filter(config => config.id !== configId))
      toast({ title: 'Configuration Deleted', description: 'Field configuration has been removed' })
    } catch (error) {
      console.error('Delete config error:', error)
      toast({
        title: 'Delete Failed',
        description: 'Could not delete field configuration',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_type: 'text',
      is_required: false,
      is_high_risk: false,
      validation_rules: '',
      default_value: '',
      description: '',
    })
    setEditingConfig(null)
  }

  const addCommonField = (field: (typeof commonFields)[0]) => {
    setFormData({
      field_name: field.name,
      field_type: field.type as any,
      is_required: false,
      is_high_risk: field.name === 'page_content',
      validation_rules: '',
      default_value: '',
      description: field.description,
    })
    setDialogOpen(true)
  }

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-100 text-blue-800'
      case 'number':
        return 'bg-green-100 text-green-800'
      case 'date':
        return 'bg-purple-100 text-purple-800'
      case 'boolean':
        return 'bg-yellow-100 text-yellow-800'
      case 'json':
        return 'bg-orange-100 text-orange-800'
      case 'html':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-muted text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Field Configuration
          </CardTitle>
          <CardDescription>
            Configure how your HubSpot fields are handled during backup & restore operations. Set
            validation rules, mark high-risk fields, and define field types.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-accent border border-blue-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{configs.length}</div>
              <p className="text-sm text-blue-700">Configured Fields</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">
                {configs.filter(c => c.is_high_risk).length}
              </div>
              <p className="text-sm text-red-700">High-Risk Fields</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {configs.filter(c => c.is_required).length}
              </div>
              <p className="text-sm text-green-700">Required Fields</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">
                {configs.filter(c => c.validation_rules).length}
              </div>
              <p className="text-sm text-purple-700">With Validation</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Field Configuration
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingConfig ? 'Edit' : 'Add'} Field Configuration</DialogTitle>
                    <DialogDescription>
                      Configure how this field should be handled during backup & restore operations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="field-name">Field Name</Label>
                        <Input
                          id="field-name"
                          value={formData.field_name}
                          onChange={e => setFormData({ ...formData, field_name: e.target.value })}
                          placeholder="page_title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-type">Field Type</Label>
                        <Select
                          value={formData.field_type}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, field_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-gray-500">{type.description}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of this field"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="required"
                          checked={formData.is_required}
                          onCheckedChange={checked =>
                            setFormData({ ...formData, is_required: checked })
                          }
                        />
                        <Label htmlFor="required">Required Field</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="high-risk"
                          checked={formData.is_high_risk}
                          onCheckedChange={checked =>
                            setFormData({ ...formData, is_high_risk: checked })
                          }
                          disabled={!isPremium}
                        />
                        <Label htmlFor="high-risk" className="flex items-center gap-1">
                          High-Risk Field{' '}
                          {!isPremium && <Crown className="h-3 w-3 text-yellow-500" />}
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="validation">Validation Rules</Label>
                      <Textarea
                        id="validation"
                        value={formData.validation_rules}
                        onChange={e =>
                          setFormData({ ...formData, validation_rules: e.target.value })
                        }
                        placeholder="required,min:1,max:100"
                        disabled={!isPremium}
                        rows={2}
                      />
                      {!isPremium && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Validation rules available with Premium
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="default-value">Default Value</Label>
                      <Input
                        id="default-value"
                        value={formData.default_value}
                        onChange={e => setFormData({ ...formData, default_value: e.target.value })}
                        placeholder="Default value if field is empty"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveConfig}>
                        {editingConfig ? 'Update' : 'Create'} Configuration
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common HubSpot Fields</CardTitle>
          <CardDescription>
            Quickly add configurations for commonly used HubSpot page fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commonFields.map((field, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-popover cursor-pointer"
                onClick={() => addCommonField(field)}
              >
                <div>
                  <p className="font-medium">{field.name}</p>
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getFieldTypeColor(field.type)}>{field.type}</Badge>
                  <Plus className="h-4 w-4 text-muted-foreground/70" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field Configurations</CardTitle>
          <CardDescription>{configs.length} fields configured</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3 p-4">
              <div className="h-4 bg-muted/50 rounded w-3/4"></div>
              <div className="h-4 bg-muted/50 rounded w-1/2"></div>
              <div className="h-4 bg-muted/50 rounded w-2/3"></div>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Field Configurations</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding configurations for your HubSpot fields.
              </p>
              <Button onClick={() => setDialogOpen(true)}>Add Your First Configuration</Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Validation</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map(config => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="font-medium font-mono">{config.field_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFieldTypeColor(config.field_type)}>
                          {config.field_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {config.is_required && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {config.is_high_risk && (
                            <Badge
                              variant="destructive"
                              className="text-xs flex items-center gap-1"
                            >
                              <AlertTriangle className="h-2 w-2" />
                              High Risk
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {config.validation_rules ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {config.validation_rules}
                          </code>
                        ) : (
                          <span className="text-muted-foreground/70 text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground">
                          {config.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => editConfig(config)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConfig(config.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Shield className="h-5 w-5" />
            Field Safety Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-800">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <span>
                <strong>High-Risk Fields:</strong> Mark fields like page_content or custom_html as
                high-risk.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <span>
                <strong>Required Fields:</strong> Mark essential fields as required to prevent
                incomplete backups.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <span>
                <strong>Validation Rules:</strong> Use validation to ensure data integrity (e.g.,
                "required,max:60").
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <span>
                <strong>Field Types:</strong> Choose the correct type to enable proper data handling
                and validation.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
