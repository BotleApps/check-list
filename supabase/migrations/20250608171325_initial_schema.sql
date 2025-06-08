-- Supabase Database Schema for CheckList App
-- Run these commands in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extending auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buckets table
CREATE TABLE IF NOT EXISTS public.buckets (
    bucket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    bucket_name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_archived BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tag_master table
CREATE TABLE IF NOT EXISTS public.tag_master (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- Create category_master table
CREATE TABLE IF NOT EXISTS public.category_master (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    description TEXT,
    color TEXT DEFAULT '#10B981',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_headers table
CREATE TABLE IF NOT EXISTS public.checklist_headers (
    checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    bucket_id UUID REFERENCES public.buckets(bucket_id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.category_master(category_id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'canceled')),
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_template BOOLEAN DEFAULT FALSE,
    template_id UUID,
    reminder_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS public.checklist_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    order_index INTEGER NOT NULL,
    notes TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    tags TEXT[] DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.category_master(category_id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    use_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_items table (separate from templates for better normalization)
CREATE TABLE IF NOT EXISTS public.template_items (
    template_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(template_id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    notes TEXT,
    estimated_duration INTEGER, -- in minutes
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sharing table
CREATE TABLE IF NOT EXISTS public.sharing (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE,
    shared_by UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    shared_with UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
    permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'comment')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_comments table
CREATE TABLE IF NOT EXISTS public.checklist_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.checklist_items(item_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.checklist_comments(comment_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    checklist_id UUID REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.checklist_items(item_id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted', 'completed', 'shared', 'commented')),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Buckets policies
CREATE POLICY "Users can manage own buckets" ON public.buckets
    FOR ALL USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can manage own categories" ON public.category_master
    FOR ALL USING (auth.uid() = user_id);

-- Checklist headers policies
CREATE POLICY "Users can manage own checklists" ON public.checklist_headers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared checklists" ON public.checklist_headers
    FOR SELECT USING (
        auth.uid() = user_id OR
        checklist_id IN (
            SELECT checklist_id FROM public.sharing 
            WHERE shared_with = auth.uid() AND is_active = TRUE
        )
    );

-- Checklist items policies
CREATE POLICY "Users can manage own checklist items" ON public.checklist_items
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.checklist_headers 
            WHERE checklist_headers.checklist_id = checklist_items.checklist_id
        )
    );

CREATE POLICY "Users can view shared checklist items" ON public.checklist_items
    FOR SELECT USING (
        checklist_id IN (
            SELECT checklist_id FROM public.checklist_headers
            WHERE user_id = auth.uid()
        ) OR
        checklist_id IN (
            SELECT checklist_id FROM public.sharing 
            WHERE shared_with = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY "Users can edit shared checklist items with edit permission" ON public.checklist_items
    FOR UPDATE USING (
        checklist_id IN (
            SELECT checklist_id FROM public.checklist_headers
            WHERE user_id = auth.uid()
        ) OR
        checklist_id IN (
            SELECT checklist_id FROM public.sharing 
            WHERE shared_with = auth.uid() AND is_active = TRUE AND permission IN ('edit')
        )
    );

-- Templates policies
CREATE POLICY "Users can manage own templates" ON public.templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON public.templates
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

-- Template items policies
CREATE POLICY "Users can manage own template items" ON public.template_items
    FOR ALL USING (
        template_id IN (
            SELECT template_id FROM public.templates
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view public template items" ON public.template_items
    FOR SELECT USING (
        template_id IN (
            SELECT template_id FROM public.templates
            WHERE is_public = TRUE OR user_id = auth.uid()
        )
    );

-- Tag master policies
CREATE POLICY "All users can view tags" ON public.tag_master
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can create tags" ON public.tag_master
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Sharing policies
CREATE POLICY "Users can manage sharing for own checklists" ON public.sharing
    FOR ALL USING (
        auth.uid() = shared_by OR
        auth.uid() IN (
            SELECT user_id FROM public.checklist_headers 
            WHERE checklist_headers.checklist_id = sharing.checklist_id
        )
    );

CREATE POLICY "Users can view shares they are part of" ON public.sharing
    FOR SELECT USING (
        auth.uid() = shared_by OR 
        auth.uid() = shared_with
    );

-- Comments policies
CREATE POLICY "Users can manage comments on accessible checklists" ON public.checklist_comments
    FOR ALL USING (
        auth.uid() = user_id OR
        checklist_id IN (
            SELECT checklist_id FROM public.checklist_headers
            WHERE user_id = auth.uid()
        ) OR
        checklist_id IN (
            SELECT checklist_id FROM public.sharing 
            WHERE shared_with = auth.uid() AND is_active = TRUE
        )
    );

-- Activity log policies
CREATE POLICY "Users can view activity for accessible checklists" ON public.activity_log
    FOR SELECT USING (
        auth.uid() = user_id OR
        checklist_id IN (
            SELECT checklist_id FROM public.checklist_headers
            WHERE user_id = auth.uid()
        ) OR
        checklist_id IN (
            SELECT checklist_id FROM public.sharing 
            WHERE shared_with = auth.uid() AND is_active = TRUE
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_buckets_user_id ON public.buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_buckets_sort_order ON public.buckets(sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_user_id ON public.checklist_headers(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_bucket_id ON public.checklist_headers(bucket_id);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_status ON public.checklist_headers(status);
CREATE INDEX IF NOT EXISTS idx_checklist_headers_target_date ON public.checklist_headers(target_date);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON public.checklist_items(status);
CREATE INDEX IF NOT EXISTS idx_checklist_items_order_index ON public.checklist_items(order_index);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON public.templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON public.template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_order_index ON public.template_items(order_index);
CREATE INDEX IF NOT EXISTS idx_category_master_user_id ON public.category_master(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_checklist_id ON public.sharing(checklist_id);
CREATE INDEX IF NOT EXISTS idx_sharing_share_token ON public.sharing(share_token);
CREATE INDEX IF NOT EXISTS idx_sharing_shared_with ON public.sharing(shared_with);
CREATE INDEX IF NOT EXISTS idx_comments_checklist_id ON public.checklist_comments(checklist_id);
CREATE INDEX IF NOT EXISTS idx_comments_item_id ON public.checklist_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_checklist_id ON public.activity_log(checklist_id);

-- Create trigger functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.calculate_checklist_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    progress_percent DECIMAL(5,2);
BEGIN
    -- Calculate progress for the affected checklist
    SELECT COUNT(*) INTO total_items
    FROM public.checklist_items
    WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id);
    
    SELECT COUNT(*) INTO completed_items
    FROM public.checklist_items
    WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id)
    AND status = 'completed';
    
    IF total_items > 0 THEN
        progress_percent := (completed_items::DECIMAL / total_items::DECIMAL) * 100;
    ELSE
        progress_percent := 0;
    END IF;
    
    -- Update the checklist header
    UPDATE public.checklist_headers
    SET progress_percentage = progress_percent,
        updated_at = NOW(),
        completed_at = CASE 
            WHEN progress_percent = 100 AND status != 'completed' THEN NOW()
            WHEN progress_percent < 100 THEN NULL
            ELSE completed_at
        END,
        status = CASE 
            WHEN progress_percent = 100 AND status = 'active' THEN 'completed'
            WHEN progress_percent < 100 AND status = 'completed' THEN 'active'
            ELSE status
        END
    WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_log (
        user_id,
        checklist_id,
        item_id,
        action_type,
        details
    ) VALUES (
        auth.uid(),
        COALESCE(NEW.checklist_id, OLD.checklist_id),
        COALESCE(NEW.item_id, OLD.item_id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'created'
            WHEN TG_OP = 'UPDATE' THEN 'updated'
            WHEN TG_OP = 'DELETE' THEN 'deleted'
        END,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buckets_updated_at 
    BEFORE UPDATE ON public.buckets 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_category_master_updated_at 
    BEFORE UPDATE ON public.category_master 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_headers_updated_at 
    BEFORE UPDATE ON public.checklist_headers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at 
    BEFORE UPDATE ON public.checklist_items 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON public.templates 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_items_updated_at 
    BEFORE UPDATE ON public.template_items 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_comments_updated_at 
    BEFORE UPDATE ON public.checklist_comments 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create triggers for progress calculation
CREATE TRIGGER calculate_progress_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.checklist_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_checklist_progress();

-- Create triggers for activity logging
CREATE TRIGGER log_checklist_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.checklist_headers
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_item_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.checklist_items
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Insert default data
INSERT INTO public.category_master (name, user_id, description, is_default) 
VALUES ('General', auth.uid(), 'Default category for general checklists', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_master (name, color) VALUES
('Work', '#3B82F6'),
('Personal', '#10B981'),
('Urgent', '#EF4444'),
('Important', '#F59E0B'),
('Home', '#8B5CF6'),
('Health', '#06B6D4'),
('Finance', '#84CC16'),
('Travel', '#F97316')
ON CONFLICT (name) DO NOTHING;
