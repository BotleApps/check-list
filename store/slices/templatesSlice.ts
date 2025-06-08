import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../../types/database';
import { templateService } from '../../services/templateService';

interface TemplatesState {
  templates: ChecklistTemplateHeader[];
  currentTemplate: ChecklistTemplateHeader | null;
  currentTemplateItems: ChecklistTemplateItem[];
  loading: boolean;
  error: string | null;
}

const initialState: TemplatesState = {
  templates: [],
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

export const fetchTemplateWithItems = createAsyncThunk(
  'templates/fetchTemplateWithItems',
  async (templateId: string) => {
    const response = await templateService.getTemplateWithItems(templateId);
    return response;
  }
);

export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (template: Omit<ChecklistTemplateHeader, 'template_id' | 'created_at' | 'updated_at'>) => {
    const response = await templateService.createTemplate(template);
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
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      });
  },
});

export const { clearError } = templatesSlice.actions;
export default templatesSlice.reducer;