-- =====================================================
-- ZERRA DATABASE SCHEMA
-- Backup created from Supabase MCP
-- Project: axnpahnmktvtmnkrgtba
-- =====================================================

-- =====================================================
-- PUBLIC SCHEMA TABLES
-- =====================================================

-- Table: uploaded_files
-- Stores metadata about uploaded CSV/Excel files
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    row_count INTEGER,
    schema_info JSONB,
    user_id UUID NOT NULL
);

-- Enable RLS on uploaded_files
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Table: data_records
-- Stores the actual row data from uploaded files
CREATE TABLE IF NOT EXISTS public.data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
    row_data JSONB NOT NULL
);

-- Enable RLS on data_records
ALTER TABLE public.data_records ENABLE ROW LEVEL SECURITY;

-- Table: visualizations
-- Stores chart configurations and insights
CREATE TABLE IF NOT EXISTS public.visualizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
    chart_type TEXT NOT NULL,
    chart_config JSONB NOT NULL,
    insight TEXT
);

-- Enable RLS on visualizations
ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;

-- Table: data_sources
-- Stores data source metadata (files, databases, etc.)
CREATE TABLE IF NOT EXISTS public.data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'file',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'syncing', 'error', 'inactive')),
    row_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID NOT NULL,
    schema_info JSONB,
    metadata JSONB
);

-- Enable RLS on data_sources
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- Table: industries
-- Lookup table for industry types
CREATE TABLE IF NOT EXISTS public.industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on industries
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- Table: user_profiles
-- Extended user profile information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    tenant_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view their own files" ON public.uploaded_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON public.uploaded_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON public.uploaded_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON public.uploaded_files
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for data_records
CREATE POLICY "Users can view records from their files" ON public.data_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = data_records.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert records to their files" ON public.data_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = data_records.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete records from their files" ON public.data_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = data_records.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

-- RLS Policies for visualizations
CREATE POLICY "Users can view their visualizations" ON public.visualizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = visualizations.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their visualizations" ON public.visualizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = visualizations.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their visualizations" ON public.visualizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = visualizations.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their visualizations" ON public.visualizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.uploaded_files 
            WHERE uploaded_files.id = visualizations.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

-- RLS Policies for data_sources
CREATE POLICY "Users can view their own data sources" ON public.data_sources
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own data sources" ON public.data_sources
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own data sources" ON public.data_sources
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own data sources" ON public.data_sources
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for industries (public read)
CREATE POLICY "Anyone can view industries" ON public.industries
    FOR SELECT USING (true);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_data_records_file_id ON public.data_records(file_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_file_id ON public.visualizations(file_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_created_by ON public.data_sources(created_by);

-- =====================================================
-- SEED DATA FOR INDUSTRIES
-- =====================================================

INSERT INTO public.industries (name) VALUES
    ('All Industries'),
    ('Retail'),
    ('Manufacturing'),
    ('Financial Services'),
    ('Healthcare'),
    ('Technology'),
    ('E-commerce'),
    ('Logistics'),
    ('Education'),
    ('Real Estate')
ON CONFLICT (name) DO NOTHING;
