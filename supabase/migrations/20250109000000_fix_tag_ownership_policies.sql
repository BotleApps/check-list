-- Fix tag_master RLS policies for proper user ownership
-- This migration updates the tag_master table policies to ensure users only see their own tags

-- Drop existing policies first
DROP POLICY IF EXISTS "view_active_tags" ON public.tag_master;
DROP POLICY IF EXISTS "users_create_tags" ON public.tag_master;
DROP POLICY IF EXISTS "users_update_own_tags" ON public.tag_master;

-- Create new policies with proper user ownership
CREATE POLICY "users_view_own_active_tags" ON public.tag_master
    FOR SELECT TO authenticated
    USING (is_active = TRUE AND created_by = auth.uid());

CREATE POLICY "users_create_tags" ON public.tag_master
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_update_own_tags" ON public.tag_master
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_delete_own_tags" ON public.tag_master
    FOR DELETE TO authenticated
    USING (created_by = auth.uid());
