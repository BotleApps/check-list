import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TemplateGroup, GroupedTemplateItems } from '../../types/database';
import { templateGroupService } from '../../services/templateGroupService';

interface TemplateGroupsState {
  groups: TemplateGroup[];
  groupedItems: Record<string, GroupedTemplateItems[]>; // Key: templateId
  loading: boolean;
  error: string | null;
  isNetworkError: boolean;
}

const initialState: TemplateGroupsState = {
  groups: [],
  groupedItems: {},
  loading: false,
  error: null,
  isNetworkError: false,
};

// Async thunks
export const fetchTemplateGroups = createAsyncThunk(
  'templateGroups/fetchTemplateGroups',
  async (templateId: string, { rejectWithValue }) => {
    try {
      const groups = await templateGroupService.getTemplateGroups(templateId);
      return { templateId, groups };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch template groups';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const fetchGroupedTemplateItems = createAsyncThunk(
  'templateGroups/fetchGroupedTemplateItems',
  async (templateId: string, { rejectWithValue }) => {
    try {
      console.log('🔍 Redux: Fetching grouped template items for:', templateId);
      const groupedItems = await templateGroupService.getGroupedTemplateItems(templateId);
      console.log('📊 Redux: Grouped items result:', groupedItems);
      console.log('🏷️ Redux: Template has groups:', groupedItems.some(group => group.group !== null));
      return { templateId, groupedItems };
    } catch (error) {
      console.error('❌ Redux: Error fetching grouped template items:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch grouped template items';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const createTemplateGroup = createAsyncThunk(
  'templateGroups/createTemplateGroup',
  async (
    {
      templateId,
      name,
      description,
      colorCode,
    }: {
      templateId: string;
      name: string;
      description?: string;
      colorCode?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const group = await templateGroupService.createTemplateGroup(templateId, name, description, colorCode);
      if (!group) {
        throw new Error('Failed to create template group');
      }
      return group;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create template group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const updateTemplateGroup = createAsyncThunk(
  'templateGroups/updateTemplateGroup',
  async (
    {
      groupId,
      updates,
    }: {
      groupId: string;
      updates: Partial<Pick<TemplateGroup, 'name' | 'description' | 'color_code' | 'order_index'>>;
    },
    { rejectWithValue }
  ) => {
    try {
      const group = await templateGroupService.updateTemplateGroup(groupId, updates);
      if (!group) {
        throw new Error('Failed to update template group');
      }
      return group;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update template group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const deleteTemplateGroup = createAsyncThunk(
  'templateGroups/deleteTemplateGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const success = await templateGroupService.deleteTemplateGroup(groupId);
      if (!success) {
        throw new Error('Failed to delete template group');
      }
      return groupId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete template group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const assignItemToTemplateGroup = createAsyncThunk(
  'templateGroups/assignItemToTemplateGroup',
  async (
    { itemId, groupId }: { itemId: string; groupId: string | null },
    { rejectWithValue }
  ) => {
    try {
      const success = await templateGroupService.assignItemToGroup(itemId, groupId);
      if (!success) {
        throw new Error('Failed to assign item to template group');
      }
      return { itemId, groupId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign item to template group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const reorderTemplateGroups = createAsyncThunk(
  'templateGroups/reorderTemplateGroups',
  async (
    { templateId, groupIds }: { templateId: string; groupIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      const success = await templateGroupService.reorderTemplateGroups(templateId, groupIds);
      if (!success) {
        throw new Error('Failed to reorder template groups');
      }
      return { templateId, groupIds };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder template groups';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const copyGroupsFromChecklist = createAsyncThunk(
  'templateGroups/copyGroupsFromChecklist',
  async ({ templateId, checklistId }: { templateId: string; checklistId: string }, { rejectWithValue }) => {
    try {
      const success = await templateGroupService.copyGroupsFromAnyChecklist(templateId, checklistId);
      if (!success) {
        throw new Error('Failed to copy groups from checklist');
      }
      return templateId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy groups from checklist';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const organizeTemplateIntoGroups = createAsyncThunk(
  'templateGroups/organizeTemplateIntoGroups',
  async (templateId: string, { rejectWithValue }) => {
    try {
      const success = await templateGroupService.organizeTemplateIntoGroups(templateId);
      if (!success) {
        throw new Error('Failed to organize template into groups');
      }
      return templateId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to organize template into groups';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

const templateGroupsSlice = createSlice({
  name: 'templateGroups',
  initialState,
  reducers: {
    clearTemplateGroupsError: (state) => {
      state.error = null;
      state.isNetworkError = false;
    },
    clearTemplateGroupsState: (state) => {
      state.groups = [];
      state.groupedItems = {};
      state.loading = false;
      state.error = null;
      state.isNetworkError = false;
    },
    updateTemplateGroupLocal: (state, action: PayloadAction<TemplateGroup>) => {
      const index = state.groups.findIndex(g => g.group_id === action.payload.group_id);
      if (index !== -1) {
        state.groups[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch template groups
      .addCase(fetchTemplateGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(fetchTemplateGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload.groups;
      })
      .addCase(fetchTemplateGroups.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to fetch template groups';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Fetch grouped template items
      .addCase(fetchGroupedTemplateItems.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(fetchGroupedTemplateItems.fulfilled, (state, action) => {
        state.loading = false;
        const { templateId, groupedItems } = action.payload;
        state.groupedItems[templateId] = groupedItems;
      })
      .addCase(fetchGroupedTemplateItems.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to fetch grouped template items';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Create template group
      .addCase(createTemplateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(createTemplateGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups.push(action.payload);
      })
      .addCase(createTemplateGroup.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to create template group';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Update template group
      .addCase(updateTemplateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(updateTemplateGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(g => g.group_id === action.payload.group_id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
      })
      .addCase(updateTemplateGroup.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to update template group';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Delete template group
      .addCase(deleteTemplateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(deleteTemplateGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = state.groups.filter(g => g.group_id !== action.payload);
      })
      .addCase(deleteTemplateGroup.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to delete template group';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Assign item to template group
      .addCase(assignItemToTemplateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(assignItemToTemplateGroup.fulfilled, (state) => {
        state.loading = false;
        // Note: We'll need to refetch grouped items to see the changes
      })
      .addCase(assignItemToTemplateGroup.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to assign item to template group';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Reorder template groups
      .addCase(reorderTemplateGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(reorderTemplateGroups.fulfilled, (state, action) => {
        state.loading = false;
        const { groupIds } = action.payload;
        // Reorder groups in state based on the new order
        const groupMap = new Map(state.groups.map(g => [g.group_id, g]));
        state.groups = groupIds.map(id => groupMap.get(id)!).filter(Boolean);
      })
      .addCase(reorderTemplateGroups.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to reorder template groups';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Copy groups from checklist
      .addCase(copyGroupsFromChecklist.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(copyGroupsFromChecklist.fulfilled, (state) => {
        state.loading = false;
        // Note: We'll need to refetch grouped items to see the changes
      })
      .addCase(copyGroupsFromChecklist.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to copy groups from checklist';
        state.isNetworkError = payload?.isNetworkError || false;
      })

      // Organize template into groups
      .addCase(organizeTemplateIntoGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(organizeTemplateIntoGroups.fulfilled, (state) => {
        state.loading = false;
        // Note: We'll need to refetch grouped items to see the changes
      })
      .addCase(organizeTemplateIntoGroups.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { message: string; isNetworkError: boolean };
        state.error = payload?.message || 'Failed to organize template into groups';
        state.isNetworkError = payload?.isNetworkError || false;
      });
  },
});

export const {
  clearTemplateGroupsError,
  clearTemplateGroupsState,
  updateTemplateGroupLocal,
} = templateGroupsSlice.actions;

export default templateGroupsSlice.reducer;
