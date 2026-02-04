-- =====================================================
-- SETUP SCRIPT FOR SETTINGS MODULE
-- Run this in your Supabase SQL Editor to ensure all 
-- Settings features work correctly from Day 1.
-- =====================================================

-- 1. Create Tenants Table (if missing)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view tenants (for now, simply)
CREATE POLICY "Users can view tenants" ON public.tenants
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Create GDPR Consents Table (Required for Privacy Tab)
CREATE TABLE IF NOT EXISTS public.gdpr_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    consent_type TEXT NOT NULL, -- 'data_processing', 'marketing', 'analytics'
    granted BOOLEAN DEFAULT false,
    version TEXT DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, consent_type)
);

ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;

-- RLS for GDPR Consents
CREATE POLICY "Users can view own consents" ON public.gdpr_consents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own consents" ON public.gdpr_consents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents update" ON public.gdpr_consents
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Synthetic Data for Testing
-- Insert a dummy tenant that users can be linked to manually if needed
INSERT INTO public.tenants (id, name, subscription_tier, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Acme Corp (Test Tenant)', 'enterprise', 'active')
ON CONFLICT DO NOTHING;

-- Instructions:
-- 1. Run this script in Supabase SQL Editor.
-- 2. If you want to test the "Organization" display in Profile, 
--    manually update your user's `tenant_id` in `user_profiles` to '00000000-0000-0000-0000-000000000001'.
