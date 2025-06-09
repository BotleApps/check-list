-- Supabase Database Schema for CheckList App
-- Date: June 9, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (extending auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL USING (
        (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'admin'
    );

-- Buckets policies
CREATE POLICY "Users can manage own buckets" ON public.buckets
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "All users can view global buckets" ON public.buckets
    FOR SELECT USING (user_id IS NULL);

-- Tags Master policies
CREATE POLICY "Users can manage own tags" ON public.tags_master
    FOR ALL USING (auth.uid() = user_id);

-- Categories Master policies
CREATE POLICY "All users can view categories" ON public.categories_master
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage categories" ON public.categories_master
    FOR ALL USING (
        (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'admin'
    );

-- Checklist Headers policies
CREATE POLICY "Users can manage own checklists" ON public.checklist_headers
    FOR ALL USING (auth.uid() = user_id);

-- Checklist Items policies
CREATE POLICY "Users can manage own checklist items" ON public.checklist_items
    FOR ALL USING (
        checklist_id IN (
            SELECT checklist_id FROM public.checklist_headers 
            WHERE user_id = auth.uid()
        )
    );

-- Checklist Template Headers policies
CREATE POLICY "All users can view templates" ON public.checklist_template_headers
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own templates" ON public.checklist_template_headers
    FOR ALL USING (auth.uid() = user_id);

-- Checklist Template Items policies
CREATE POLICY "All users can view template items" ON public.checklist_template_items
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own template items" ON public.checklist_template_items
    FOR ALL USING (
        template_id IN (
            SELECT template_id FROM public.checklist_template_headers 
            WHERE user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_buckets_user_id ON public.buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_master_user_id ON public.tags_master(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_user_id ON public.checklist_headers(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_bucket_id ON public.checklist_headers(bucket_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_template_headers_user_id ON public.checklist_template_headers(user_id);
CREATE INDEX IF NOT EXISTS idx_template_headers_category_id ON public.checklist_template_headers(category_id);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON public.checklist_template_items(template_id);

-- Function to validate UUID[] tags (for checklists only)
CREATE OR REPLACE FUNCTION public.validate_tags()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tags IS NOT NULL THEN
        PERFORM 1 FROM public.tags_master 
        WHERE tag_id = ANY(NEW.tags) AND user_id = auth.uid();
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid or unauthorized tag_id in tags array';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.sync_auth_users()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, email, name, role, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        role = COALESCE(EXCLUDED.role, public.users.role),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER sync_auth_users_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_auth_users();

CREATE TRIGGER validate_checklist_tags
    BEFORE INSERT OR UPDATE ON public.checklist_headers
    FOR EACH ROW EXECUTE FUNCTION public.validate_tags();

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
    ('Shopping', NOW())
ON CONFLICT (name) DO NOTHING;