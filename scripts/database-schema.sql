-- Supabase Database Schema for HubSpot Backup System

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_sheet_id TEXT,
    selected_fields JSONB DEFAULT '[]'::jsonb,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMP WITH TIME ZONE,
    auto_backup_enabled BOOLEAN DEFAULT TRUE,
    google_refresh_token TEXT,
    hubspot_token_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Field Configurations Table
CREATE TABLE IF NOT EXISTS field_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_editable BOOLEAN DEFAULT TRUE,
    is_dangerous BOOLEAN DEFAULT FALSE,
    field_type TEXT DEFAULT 'text',
    validation_rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_name)
);

-- Backup Sessions Table
CREATE TABLE IF NOT EXISTS backup_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sheet_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    backup_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    pages_backed_up INTEGER DEFAULT 0,
    changes_detected INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Page Snapshots Table (for change tracking)
CREATE TABLE IF NOT EXISTS page_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    page_name TEXT,
    page_slug TEXT,
    page_url TEXT,
    page_content JSONB NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, page_id, snapshot_date)
);

-- Change History Table
CREATE TABLE IF NOT EXISTS change_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'delete', 'revert')),
    changed_by UUID REFERENCES auth.users(id),
    backup_session_id UUID REFERENCES backup_sessions(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reverted_at TIMESTAMP WITH TIME ZONE
);

-- Sync Sessions Table
CREATE TABLE IF NOT EXISTS sync_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sheet_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    content_type TEXT DEFAULT 'pages',
    filters_used JSONB DEFAULT '{}'::jsonb,
    pages_synced INTEGER DEFAULT 0,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own field configs" ON field_configurations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own backup sessions" ON backup_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own page snapshots" ON page_snapshots
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own change history" ON change_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own sync sessions" ON sync_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own audit logs" ON audit_logs
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_backup_sessions_user_id ON backup_sessions(user_id);
CREATE INDEX idx_backup_sessions_date ON backup_sessions(backup_date DESC);
CREATE INDEX idx_page_snapshots_user_page ON page_snapshots(user_id, page_id);
CREATE INDEX idx_change_history_user_page ON change_history(user_id, page_id);
CREATE INDEX idx_change_history_date ON change_history(changed_at DESC);
CREATE INDEX idx_sync_sessions_user_id ON sync_sessions(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
