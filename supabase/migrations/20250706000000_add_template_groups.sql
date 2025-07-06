-- Migration: Add Template Groups for organizing template items
-- Created: 2025-07-06

-- Create template_groups table (similar to task_groups but for templates)
CREATE TABLE public.template_groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.templates(template_id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
    description TEXT,
    color_code TEXT DEFAULT '#6B7280' CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique group names per template
    CONSTRAINT unique_template_group_name_per_template UNIQUE (template_id, name)
);

-- Add group_id to existing template_items table
ALTER TABLE public.template_items 
ADD COLUMN group_id UUID REFERENCES public.template_groups(group_id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_template_groups_template_id ON public.template_groups(template_id);
CREATE INDEX idx_template_groups_order_index ON public.template_groups(template_id, order_index);
CREATE INDEX idx_template_items_group_id ON public.template_items(group_id);

-- Create updated_at trigger for template_groups
CREATE OR REPLACE FUNCTION update_template_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_groups_updated_at
    BEFORE UPDATE ON public.template_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_template_groups_updated_at();

-- Enable RLS on template_groups
ALTER TABLE public.template_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_groups
CREATE POLICY "template_groups_select_policy" ON public.template_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_groups.template_id
            AND (t.is_public = true OR t.created_by = auth.uid())
        )
    );

CREATE POLICY "template_groups_insert_policy" ON public.template_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_groups.template_id
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "template_groups_update_policy" ON public.template_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_groups.template_id
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "template_groups_delete_policy" ON public.template_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.templates t
            WHERE t.template_id = template_groups.template_id
            AND t.created_by = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.template_groups TO authenticated;
