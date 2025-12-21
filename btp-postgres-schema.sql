-- BTP PostgreSQL Schema for CheckList App
-- Adapted from Supabase schema - removes RLS and auth.users dependencies
-- Date: November 8, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table (standalone, not extending auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    external_id TEXT UNIQUE, -- IAS user ID from JWT token
    provider TEXT, -- 'google', 'facebook', 'ias'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buckets Table
CREATE TABLE IF NOT EXISTS public.buckets (
    bucket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    bucket_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_bucket UNIQUE (user_id, bucket_name)
);

-- Partial unique index for global buckets
CREATE UNIQUE INDEX IF NOT EXISTS idx_buckets_global_name 
ON public.buckets (bucket_name) WHERE user_id IS NULL;

-- Tags Master Table (User-specific, for checklists only)
CREATE TABLE IF NOT EXISTS public.tags_master (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_tag UNIQUE (user_id, name)
);

-- Categories Master Table (Global)
CREATE TABLE IF NOT EXISTS public.categories_master (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist Headers Table
CREATE TABLE IF NOT EXISTS public.checklist_headers (
    checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE,
    bucket_id UUID REFERENCES public.buckets(bucket_id) ON DELETE SET NULL,
    tags UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist Items Table
CREATE TABLE IF NOT EXISTS public.checklist_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    due_days INTEGER CHECK (due_days >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist Template Headers Table (Publicly accessible, no tags)
CREATE TABLE IF NOT EXISTS public.checklist_template_headers (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories_master(category_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist Template Items Table
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.checklist_template_headers(template_id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    due_days INTEGER CHECK (due_days >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON public.users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_buckets_user_id ON public.buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_master_user_id ON public.tags_master(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_user_id ON public.checklist_headers(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_bucket_id ON public.checklist_headers(bucket_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_template_headers_user_id ON public.checklist_template_headers(user_id);
CREATE INDEX IF NOT EXISTS idx_template_headers_category_id ON public.checklist_template_headers(category_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON public.checklist_template_items(template_id);

-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_headers_updated_at 
    BEFORE UPDATE ON public.checklist_headers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at 
    BEFORE UPDATE ON public.checklist_items 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_headers_updated_at 
    BEFORE UPDATE ON public.checklist_template_headers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_items_updated_at 
    BEFORE UPDATE ON public.checklist_template_items 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default data
INSERT INTO public.categories_master (name, created_at) 
VALUES 
    ('Personal', NOW()),
    ('Work', NOW()),
    ('Shopping', NOW()),
    ('Travel', NOW()),
    ('Health', NOW()),
    ('Education', NOW())
ON CONFLICT (name) DO NOTHING;

-- Grant permissions (adjust role name as per your BTP PostgreSQL setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO checklist_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO checklist_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO checklist_app_user;
