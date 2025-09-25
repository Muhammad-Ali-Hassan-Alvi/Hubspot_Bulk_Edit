-- Create the sync_sessions table
CREATE TABLE IF NOT EXISTS sync_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sheet_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'pages',
    filters_used JSONB,
    rows_synced INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_sessions_user_id ON sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_timestamp ON sync_sessions(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own sync sessions
CREATE POLICY "Users can view their own sync sessions" ON sync_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own sync sessions
CREATE POLICY "Users can insert their own sync sessions" ON sync_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
