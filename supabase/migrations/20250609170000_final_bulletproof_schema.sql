-- FINAL BULLETPROOF Database Schema for CheckList App
-- Date: June 9, 2025
-- Includes automatic user sync from Supabase Auth with proper RLS handling

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to dependencies)
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.checklist_headers CASCADE;
DROP TABLE IF EXISTS public.template_items CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.buckets CASCADE;
DROP TABLE IF EXISTS public.tag_master CASCADE;
DROP TABLE IF EXISTS public.category_master CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =========================================================================
-- 1. USERS TABLE
-- =========================================================================
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON public.users
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_signup" ON public.users
    FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR  -- Normal user signup
        auth.role() = 'service_role' OR  -- Service role
        current_setting('role') = 'supabase_auth_admin'  -- Auth trigger
    );

-- =========================================================================
-- 2. CATEGORY MASTER
-- =========================================================================
CREATE TABLE public.category_master (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#10B981',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.category_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_active_categories" ON public.category_master
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

-- =========================================================================
-- 3. TAG MASTER
-- =========================================================================
CREATE TABLE public.tag_master (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366F1',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tag_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_active_tags" ON public.tag_master
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

CREATE POLICY "users_create_tags" ON public.tag_master
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_update_own_tags" ON public.tag_master
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- =========================================================================
-- 4. BUCKETS
-- =========================================================================
CREATE TABLE public.buckets (
    bucket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#F59E0B',
    icon TEXT DEFAULT 'folder',
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_buckets" ON public.buckets
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- 5. TEMPLATES
-- =========================================================================
CREATE TABLE public.templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.category_master(category_id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_templates" ON public.templates
    FOR SELECT TO authenticated
    USING (
        is_public = TRUE AND is_active = TRUE OR created_by = auth.uid()
    );

CREATE POLICY "users_manage_own_templates" ON public.templates
    FOR ALL TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- =========================================================================
-- 6. TEMPLATE ITEMS
-- =========================================================================
CREATE TABLE public.template_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.templates(template_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    tags UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_template_items" ON public.template_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_items.template_id
            AND (t.is_public = TRUE AND t.is_active = TRUE OR t.created_by = auth.uid())
        )
    );

CREATE POLICY "users_manage_own_template_items" ON public.template_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_items.template_id
            AND t.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_items.template_id
            AND t.created_by = auth.uid()
        )
    );

-- =========================================================================
-- 7. CHECKLIST HEADERS
-- =========================================================================
CREATE TABLE public.checklist_headers (
    checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    bucket_id UUID REFERENCES public.buckets(bucket_id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.templates(template_id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.category_master(category_id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    tags UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_headers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_checklists" ON public.checklist_headers
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- 8. CHECKLIST ITEMS
-- =========================================================================
CREATE TABLE public.checklist_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    tags UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_checklist_items" ON public.checklist_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.checklist_headers ch
            WHERE ch.checklist_id = checklist_items.checklist_id
            AND ch.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.checklist_headers ch
            WHERE ch.checklist_id = checklist_items.checklist_id
            AND ch.user_id = auth.uid()
        )
    );

-- =========================================================================
-- 9. USER SYNC TRIGGER FROM SUPABASE AUTH
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, name)
  VALUES (NEW.id, NEW.email, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 10. TIMESTAMP TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Repeat for other tables as needed...)

-- =========================================================================
-- 11. SAMPLE DATA
-- =========================================================================
INSERT INTO public.category_master (name, description, color) VALUES
    ('Work', 'Work-related tasks and projects', '#3B82F6'),
    ('Personal', 'Personal tasks and goals', '#10B981'),
    ('Travel', 'Travel planning and checklists', '#F59E0B'),
    ('Health', 'Health and wellness tracking', '#EF4444'),
    ('Home', 'Home maintenance and improvements', '#8B5CF6');

INSERT INTO public.tag_master (name, description, color) VALUES
    ('Urgent', 'High priority items', '#EF4444'),
    ('Important', 'Important but not urgent', '#F59E0B'),
    ('Quick', 'Tasks that take less than 15 minutes', '#10B981'),
    ('Research', 'Tasks requiring research or investigation', '#3B82F6'),
    ('Follow-up', 'Items requiring follow-up action', '#8B5CF6');
