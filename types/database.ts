export interface Bucket {
  bucket_id: string;
  user_id: string;
  bucket_name: string;
  created_at: string;
}

export interface TagMaster {
  tag_id: string;
  name: string;
  created_at: string;
}

export interface CategoryMaster {
  category_id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface ChecklistHeader {
  checklist_id: string;
  user_id: string;
  name: string;
  target_date?: string;
  bucket_id?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  item_id: string;
  checklist_id: string;
  text: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'cancelled';
  due_days?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  order: number;
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
  user_id: string;
  name: string;
  category_id?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateItem {
  item_id: string;
  template_id: string;
  text: string;
  status: 'pending' | 'completed' | 'cancelled';
  due_days?: number;
  notes?: string;
  order: number;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
}