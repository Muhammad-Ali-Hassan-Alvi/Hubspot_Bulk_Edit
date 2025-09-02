-- Enhanced database schema for HubSpot backup system

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create page snapshots table for tracking page states
CREATE TABLE IF NOT EXISTS page_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    page_name TEXT,
    page_slug TEXT,
    page_url TEXT,
    page_content JSONB NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, page_id, snapshot_date)
);

-- Create change history table for field-level tracking
CREATE TABLE IF NOT EXISTS change_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    backup_session_id UUID
);

-- Create backup sessions table
CREATE TABLE IF NOT EXISTS backup_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sheet_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    backup_date DATE NOT NULL,
    pages_backed_up INTEGER DEFAULT 0,
    changes_detected INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Update existing sync_sessions table
ALTER TABLE sync_sessions ADD COLUMN IF NOT EXISTS backup_session_id UUID REFERENCES backup_sessions(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_page_snapshots_user_page_date ON page_snapshots(user_id, page_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_change_history_user_page ON change_history(user_id, page_id);
CREATE INDEX IF NOT EXISTS idx_change_history_date ON change_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_sessions_user_date ON backup_sessions(user_id, backup_date DESC);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own roles" ON user_roles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own snapshots" ON page_snapshots
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own change history" ON change_history
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = changed_by);

CREATE POLICY "Users can manage their own backup sessions" ON backup_sessions
    FOR ALL USING (auth.uid() = user_id);
