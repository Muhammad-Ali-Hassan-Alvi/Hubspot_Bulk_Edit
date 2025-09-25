-- Fix RLS policies for audit_logs table
-- Run this in your Supabase SQL Editor

-- First, let's check if the table exists and its current structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'audit_logs';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'audit_logs';

-- Enable RLS if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (optional - uncomment if needed)
-- DROP POLICY IF EXISTS "Users can insert their own audit logs" ON audit_logs;
-- DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

-- Create policy for users to insert their own audit logs
CREATE POLICY "Users can insert their own audit logs" ON audit_logs
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create policy for users to view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'audit_logs';
