-- Migration: Add Task Groups for organizing checklist items
-- Created: 2025-06-29

-- Create task_groups table
CREATE TABLE public.task_groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklist_headers(checklist_id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    color_code TEXT DEFAULT '#6B7280' CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_collapsed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique group names per checklist
    CONSTRAINT unique_group_name_per_checklist UNIQUE (checklist_id, name)
);

-- Add group_id to existing checklist_items table
ALTER TABLE public.checklist_items 
ADD COLUMN group_id UUID REFERENCES public.task_groups(group_id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_task_groups_checklist_id ON public.task_groups(checklist_id);
CREATE INDEX idx_task_groups_order_index ON public.task_groups(checklist_id, order_index);
CREATE INDEX idx_checklist_items_group_id ON public.checklist_items(group_id);

-- Create updated_at trigger for task_groups
CREATE OR REPLACE FUNCTION update_task_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_groups_updated_at
    BEFORE UPDATE ON public.task_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_task_groups_updated_at();

-- Enable RLS on task_groups
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_groups
CREATE POLICY "task_groups_select_policy" ON public.task_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.checklist_headers ch
            WHERE ch.checklist_id = task_groups.checklist_id
            AND ch.user_id = auth.uid()
        )
    );

CREATE POLICY "task_groups_insert_policy" ON public.task_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.checklist_headers ch
            WHERE ch.checklist_id = task_groups.checklist_id
            AND ch.user_id = auth.uid()
        )
    );

CREATE POLICY "task_groups_update_policy" ON public.task_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.checklist_headers ch
            WHERE ch.checklist_id = task_groups.checklist_id
            AND ch.user_id = auth.uid()
        )
    );

CREATE POLICY "task_groups_delete_policy" ON public.task_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.checklist_headers ch
            WHERE ch.checklist_id = task_groups.checklist_id
            AND ch.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.task_groups TO authenticated;
