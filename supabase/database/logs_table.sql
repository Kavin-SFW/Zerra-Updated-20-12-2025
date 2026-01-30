-- Table: logs (Audit Logs)
-- Stores application events, errors, and user actions with precise auditing data
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Nullable for anonymous users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    log_date TEXT NOT NULL, -- YYYY-MM-DD
    log_time TEXT NOT NULL, -- HH:MM:SS.mmm
    timezone TEXT,
    level TEXT DEFAULT 'info', -- 'info', 'warn', 'error'
    action TEXT NOT NULL,
    module TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_stack TEXT -- Specific field for stack traces
);

-- Enable RLS on logs
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid "already exists" errors when re-running
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON public.logs;

-- Allow anyone to insert logs (needed for login errors and public page actions)
CREATE POLICY "Anyone can insert logs" ON public.logs
    FOR INSERT WITH CHECK (true);

-- Allow users to view their own logs
CREATE POLICY "Users can view their own logs" ON public.logs
    FOR SELECT USING (auth.uid() = user_id);

-- Performance Indexes for Dashboard Filtering
-- These allow fast filtering by level, user, date, and time as requested
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON public.logs(log_date);
CREATE INDEX IF NOT EXISTS idx_logs_action ON public.logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);