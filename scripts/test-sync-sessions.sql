-- Test script to verify sync_sessions table works
-- This should be run after authentication

-- Check current user
SELECT auth.uid() as current_user_id;

-- Try to insert a test record 
INSERT INTO sync_sessions (
    user_id,
    sheet_id,
    tab_name,
    content_type,
    filters_used,
    rows_synced
) VALUES (
    auth.uid(),
    'test_sheet_id',
    'Test Tab',
    'pages',
    '{"language": "en", "domain": "test.com"}'::jsonb,
    5
);

-- Check if the record was inserted
SELECT * FROM sync_sessions WHERE user_id = auth.uid();

-- Clean up test data
DELETE FROM sync_sessions WHERE sheet_id = 'test_sheet_id';
