-- Create table for uploaded files
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for parsed data records
CREATE TABLE IF NOT EXISTS public.data_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for generated visualizations
CREATE TABLE IF NOT EXISTS public.visualizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chart_type TEXT NOT NULL,
  chart_config JSONB NOT NULL,
  insight TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view their own files"
  ON public.uploaded_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.uploaded_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.uploaded_files FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for data_records
CREATE POLICY "Users can view records from their files"
  ON public.data_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files
      WHERE uploaded_files.id = data_records.file_id
      AND uploaded_files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert records for their files"
  ON public.data_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files
      WHERE uploaded_files.id = data_records.file_id
      AND uploaded_files.user_id = auth.uid()
    )
  );

-- RLS Policies for visualizations
CREATE POLICY "Users can view their own visualizations"
  ON public.visualizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visualizations"
  ON public.visualizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visualizations"
  ON public.visualizations FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX idx_data_records_file_id ON public.data_records(file_id);
CREATE INDEX idx_visualizations_file_id ON public.visualizations(file_id);
CREATE INDEX idx_visualizations_user_id ON public.visualizations(user_id);