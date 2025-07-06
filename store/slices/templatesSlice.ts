import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../../types/database';
import { templateService } from '../../services/templateService';
import { authService } from '../../services/authService';

interface TemplatesState {
  templates: ChecklistTemplateHeader[];
  templatesWithPreview: (ChecklistTemplateHeader & {
    preview_items: { text: string; is_required: boolean }[];
    item_count: number;
  })[];
  currentTemplate: ChecklistTemplateHeader | null;
  currentTemplateItems: ChecklistTemplateItem[];
  // Store user information for template creators
  creatorInfo: Record<string, { name?: string; avatar_url?: string }>;
  loading: boolean;
  error: string | null;
}

const initialState: TemplatesState = {
  templates: [],
  templatesWithPreview: [],
  currentTemplate: null,
  currentTemplateItems: [],
  creatorInfo: {},
  loading: false,
  error: null,
};

export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (userId: string) => {
    const response = await templateService.getUserTemplates(userId);
    return response;
  }
);

export const fetchPublicTemplates = createAsyncThunk(
  'templates/fetchPublicTemplates',
  async () => {
    const response = await templateService.getPublicTemplates();
    return response;
  }
);

export const fetchTemplateWithItems = createAsyncThunk(
  'templates/fetchTemplateWithItems',
  async (templateId: string) => {
    const response = await templateService.getTemplateWithItems(templateId);
    return response;
  }
);

export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (template: { userId: string; name: string; categoryId?: string; description?: string }) => {
    const response = await templateService.createTemplate(
      template.userId,
      template.name,
      template.categoryId,
      template.description
    );
    return response;
  }
);

export const fetchPublicTemplatesWithPreview = createAsyncThunk(
  'templates/fetchPublicTemplatesWithPreview',
  async () => {
    const templates = await templateService.getPublicTemplatesWithPreview();
    
    // Extract unique creator IDs
    const creatorIds = [...new Set(templates.map(template => template.created_by))];
    
    // Fetch creator information
    const creatorInfo = await authService.getUsersPublicInfo(creatorIds);
    
    return { templates, creatorInfo };
  }
);

export const createChecklistFromTemplate = createAsyncThunk(
  'templates/createChecklistFromTemplate',
  async ({ 
    templateId, 
    userId, 
    bucketId, 
    tags 
  }: { 
    templateId: string; 
    userId: string; 
    bucketId?: string; 
    tags?: string[] 
  }) => {
    const response = await templateService.createChecklistFromTemplate(
      templateId,
      userId,
      bucketId,
      tags
    );
    return response;
  }
);

export const createTemplateFromChecklist = createAsyncThunk(
  'templates/createTemplateFromChecklist',
  async ({ 
    checklistId, 
    userId, 
    templateName, 
    templateDescription, 
    categoryId, 
    isPublic 
  }: { 
    checklistId: string; 
    userId: string; 
    templateName: string; 
    templateDescription?: string; 
    categoryId?: string; 
    isPublic?: boolean; 
  }) => {
    const response = await templateService.createTemplateFromChecklist(
      checklistId,
      userId,
      templateName,
      templateDescription,
      categoryId,
      isPublic
    );
    return response;
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async ({ templateId, userId }: { templateId: string; userId: string }) => {
    await templateService.deleteTemplate(templateId, userId);
    return templateId;
  }
);

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch templates';
      })
      .addCase(fetchTemplateWithItems.fulfilled, (state, action) => {
        state.currentTemplate = action.payload.template;
        state.currentTemplateItems = action.payload.items;
      })
      .addCase(fetchPublicTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchPublicTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch public templates';
      })
      .addCase(fetchPublicTemplatesWithPreview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicTemplatesWithPreview.fulfilled, (state, action) => {
        state.loading = false;
        state.templatesWithPreview = Array.isArray(action.payload.templates) ? action.payload.templates : [];
        state.creatorInfo = { ...state.creatorInfo, ...action.payload.creatorInfo };
      })
      .addCase(fetchPublicTemplatesWithPreview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch templates with preview';
        // Ensure templatesWithPreview remains an array even on error
        if (!Array.isArray(state.templatesWithPreview)) {
          state.templatesWithPreview = [];
        }
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        if (Array.isArray(state.templates)) {
          state.templates.push(action.payload);
        } else {
          state.templates = [action.payload];
        }
      })
      .addCase(createTemplateFromChecklist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTemplateFromChecklist.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(state.templates)) {
          state.templates.push(action.payload);
        } else {
          state.templates = [action.payload];
        }
      })
      .addCase(createTemplateFromChecklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create template from checklist';
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.templates = (state.templates || []).filter(t => t.template_id !== action.payload);
        state.templatesWithPreview = (state.templatesWithPreview || []).filter(t => t.template_id !== action.payload);
      });
  },
});

export const { clearError } = templatesSlice.actions;
export default templatesSlice.reducer;