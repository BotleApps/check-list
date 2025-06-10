export interface Bucket {
  bucket_id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagMaster {
  tag_id: string;
  name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryMaster {
  category_id: string;
  name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistHeader {
  checklist_id: string;
  user_id: string;
  name: string;
  description?: string;
  due_date?: string;
  bucket_id?: string;
  template_id?: string;
  category_id?: string;
  status?: string;
  completed_at?: string;
  progress_percentage?: number;
  tags: string[]; // Array of tag IDs
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  item_id: string;
  checklist_id: string;
  text: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  order_index: number;
  is_required: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistShare {
  share_id: string;
  checklist_id: string;
  shared_with_user_id: string;
  share_token: string;
  permission: 'view' | 'edit' | 'admin';
  created_at: string;
}

export interface ChecklistTemplateHeader {
  template_id: string;
  name: string;
  description?: string;
  category_id?: string;
  is_public: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateItem {
  item_id: string;
  template_id: string;
  text: string;
  description?: string;
  order_index: number;
  is_required: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: string;
  preferences?: any;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}