import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../../types/database';
import { templateService } from '../../services/templateService';

interface TemplatesState {
  templates: ChecklistTemplateHeader[];
  templatesWithPreview: (ChecklistTemplateHeader & {
    preview_items: { text: string; is_required: boolean }[];
    item_count: number;
  })[];
  currentTemplate: ChecklistTemplateHeader | null;
  currentTemplateItems: ChecklistTemplateItem[];
  loading: boolean;
  error: string | null;
}

const initialState: TemplatesState = {
  templates: [],
  templatesWithPreview: [],
  currentTemplate: null,
  currentTemplateItems: [],
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
    const response = await templateService.getPublicTemplatesWithPreview();
    return response;
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
        state.templatesWithPreview = action.payload;
      })
      .addCase(fetchPublicTemplatesWithPreview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch templates with preview';
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      });
  },
});

export const { clearError } = templatesSlice.actions;
export default templatesSlice.reducer;