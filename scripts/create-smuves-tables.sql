-- Enhanced tables for Smuves V1 Beta
-- Add additional columns to existing tables and create new ones

-- Add columns to sync_sessions for enhanced tracking
ALTER TABLE public.sync_sessions ADD COLUMN IF NOT EXISTS sync_type TEXT DEFAULT 'manual';
ALTER TABLE public.sync_sessions ADD COLUMN IF NOT EXISTS field_count INTEGER DEFAULT 0;
ALTER TABLE public.sync_sessions ADD COLUMN IF NOT EXISTS validation_errors JSONB;
ALTER TABLE public.sync_sessions ADD COLUMN IF NOT EXISTS is_premium_feature BOOLEAN DEFAULT FALSE;

-- Create field_configurations table for managing which fields to sync
CREATE TABLE IF NOT EXISTS public.field_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    is_editable BOOLEAN DEFAULT TRUE,
    is_dangerous BOOLEAN DEFAULT FALSE,
    field_type TEXT DEFAULT 'text', -- 'text', 'url', 'date', 'select', 'readonly'
    display_name TEXT,
    validation_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, field_name)
);

-- Create user_settings table for storing user preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_sheet_id TEXT,
    backup_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'manual'
    auto_backup_enabled BOOLEAN DEFAULT TRUE,
    selected_fields JSONB, -- Array of field names to sync
    sheet_formatting_preferences JSONB,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create audit_logs table for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'sync', 'edit', 'revert', 'backup', 'connect'
    resource_type TEXT NOT NULL, -- 'page', 'sheet', 'hubspot', 'google'
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create validation_rules table for field validation
CREATE TABLE IF NOT EXISTS public.validation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    field_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'required', 'max_length', 'pattern', 'url', 'slug'
    rule_value TEXT,
    error_message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(field_name, rule_type)
);

-- Insert default field configurations
INSERT INTO public.field_configurations (user_id, field_name, is_editable, is_dangerous, field_type, display_name) 
SELECT 
    auth.uid(),
    field_name,
    is_editable,
    is_dangerous,
    field_type,
    display_name
FROM (VALUES
    ('name', TRUE, FALSE, 'text', 'Page Name'),
    ('slug', TRUE, TRUE, 'text', 'URL Slug'),
    ('htmlTitle', TRUE, FALSE, 'text', 'HTML Title'),
    ('metaDescription', TRUE, FALSE, 'text', 'Meta Description'),
    ('language', TRUE, FALSE, 'select', 'Language'),
    ('status', TRUE, TRUE, 'select', 'Status'),
    ('url', FALSE, FALSE, 'readonly', 'Page URL'),
    ('id', FALSE, FALSE, 'readonly', 'Page ID'),
    ('updatedAt', FALSE, FALSE, 'readonly', 'Last Updated'),
    ('body', FALSE, TRUE, 'readonly', 'Page Body (Read-Only)')
) AS default_fields(field_name, is_editable, is_dangerous, field_type, display_name)
WHERE NOT EXISTS (
    SELECT 1 FROM public.field_configurations 
    WHERE user_id = auth.uid() AND field_name = default_fields.field_name
);

-- Insert default validation rules
INSERT INTO public.validation_rules (field_name, rule_type, rule_value, error_message) VALUES
    ('name', 'required', '', 'Page name is required'),
    ('name', 'max_length', '100', 'Page name must be less than 100 characters'),
    ('slug', 'required', '', 'URL slug is required'),
    ('slug', 'pattern', '^[a-z0-9-]+$', 'Slug can only contain lowercase letters, numbers, and hyphens'),
    ('htmlTitle', 'max_length', '60', 'HTML title should be less than 60 characters for SEO'),
    ('metaDescription', 'max_length', '160', 'Meta description should be less than 160 characters')
ON CONFLICT (field_name, rule_type) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_field_configurations_user_id ON public.field_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.field_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own field configurations" ON public.field_configurations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Everyone can view validation rules" ON public.validation_rules
    FOR SELECT USING (TRUE);

-- Grant permissions
GRANT ALL ON public.field_configurations TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT SELECT ON public.validation_rules TO authenticated;
