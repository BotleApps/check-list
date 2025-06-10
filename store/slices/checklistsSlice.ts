import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ChecklistHeader, ChecklistItem } from '../../types/database';
import { checklistService } from '../../services/checklistService';

interface ChecklistsState {
  checklists: ChecklistHeader[];
  currentChecklist: ChecklistHeader | null;
  currentItems: ChecklistItem[];
  loading: boolean;
  error: string | null;
}

const initialState: ChecklistsState = {
  checklists: [],
  currentChecklist: null,
  currentItems: [],
  loading: false,
  error: null,
};

export const fetchChecklists = createAsyncThunk(
  'checklists/fetchChecklists',
  async (userId: string) => {
    const response = await checklistService.getUserChecklists(userId);
    return response;
  }
);

export const fetchChecklistsWithStats = createAsyncThunk(
  'checklists/fetchChecklistsWithStats',
  async (userId: string) => {
    const response = await checklistService.getUserChecklistsWithStats(userId);
    return response;
  }
);

export const fetchChecklistWithItems = createAsyncThunk(
  'checklists/fetchChecklistWithItems',
  async (checklistId: string) => {
    const response = await checklistService.getChecklistWithItems(checklistId);
    return response;
  }
);

export const createChecklist = createAsyncThunk(
  'checklists/createChecklist',
  async (checklist: Omit<ChecklistHeader, 'checklist_id' | 'created_at' | 'updated_at'>) => {
    const response = await checklistService.createChecklist(
      checklist.user_id,
      checklist.name,
      checklist.bucket_id
    );
    return response;
  }
);

export const createChecklistWithItems = createAsyncThunk(
  'checklists/createChecklistWithItems',
  async (data: {
    name: string;
    user_id: string;
    bucket_id?: string;
    category_id?: string;
    due_date?: string;
    tags?: string[];
    items: Array<{ text: string; completed?: boolean; description?: string }>;
  }) => {
    const response = await checklistService.createChecklistWithItems(
      data.user_id,
      data.name,
      data.items,
      data.bucket_id,
      data.category_id,
      data.tags,
      undefined, // fromTemplateId
      data.due_date
    );
    return response;
  }
);

export const updateChecklistItem = createAsyncThunk(
  'checklists/updateChecklistItem',
  async (item: ChecklistItem) => {
    const response = await checklistService.updateChecklistItem(item);
    return response;
  }
);

export const updateChecklist = createAsyncThunk(
  'checklists/updateChecklist',
  async (data: {
    checklistId: string;
    name?: string;
    bucketId?: string;
    categoryId?: string;
    tags?: string[];
    dueDate?: string;
  }) => {
    const response = await checklistService.updateChecklist(
      data.checklistId,
      data.name,
      data.bucketId,
      data.categoryId,
      data.tags,
      data.dueDate
    );
    return response;
  }
);

export const createChecklistItem = createAsyncThunk(
  'checklists/createChecklistItem',
  async (item: Omit<ChecklistItem, 'item_id' | 'created_at' | 'updated_at'>) => {
    const response = await checklistService.addChecklistItem(
      item.checklist_id,
      item.text,
      item.description,
      item.order_index
    );
    return response;
  }
);

export const deleteChecklistItem = createAsyncThunk(
  'checklists/deleteChecklistItem',
  async (itemId: string) => {
    await checklistService.deleteChecklistItem(itemId);
    return itemId;
  }
);

const checklistsSlice = createSlice({
  name: 'checklists',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentChecklist: (state, action: PayloadAction<ChecklistHeader | null>) => {
      state.currentChecklist = action.payload;
    },
    clearCurrentData: (state) => {
      state.currentChecklist = null;
      state.currentItems = [];
    },
    reorderItems: (state, action: PayloadAction<ChecklistItem[]>) => {
      state.currentItems = action.payload;
    },
    // Optimistic updates
    updateChecklistTitle: (state, action: PayloadAction<{ checklistId: string; name: string }>) => {
      const { checklistId, name } = action.payload;
      
      // Update in checklists array
      const checklistIndex = state.checklists.findIndex(c => c.checklist_id === checklistId);
      if (checklistIndex !== -1) {
        state.checklists[checklistIndex].name = name;
      }
      
      // Update current checklist if it's the same one
      if (state.currentChecklist?.checklist_id === checklistId) {
        state.currentChecklist.name = name;
      }
    },
    updateItemCompletion: (state, action: PayloadAction<{ 
      checklistId: string; 
      itemId: string; 
      isCompleted: boolean; 
      completedAt?: string 
    }>) => {
      const { checklistId, itemId, isCompleted, completedAt } = action.payload;
      
      // Update in current items
      const itemIndex = state.currentItems.findIndex(item => item.item_id === itemId);
      if (itemIndex !== -1) {
        state.currentItems[itemIndex].is_completed = isCompleted;
        state.currentItems[itemIndex].completed_at = completedAt || undefined;
      }
      
      // Update stats in checklists array if we have stats
      const checklistIndex = state.checklists.findIndex(c => c.checklist_id === checklistId);
      if (checklistIndex !== -1) {
        const checklist = state.checklists[checklistIndex] as any;
        if (checklist.total_items !== undefined) {
          const completedCount = state.currentItems.filter(item => item.is_completed).length;
          checklist.completed_items = completedCount;
        }
      }
    },
    updateItemText: (state, action: PayloadAction<{ itemId: string; text: string }>) => {
      const { itemId, text } = action.payload;
      const itemIndex = state.currentItems.findIndex(item => item.item_id === itemId);
      if (itemIndex !== -1) {
        state.currentItems[itemIndex].text = text;
      }
    },
    updateChecklistMetadata: (state, action: PayloadAction<{ 
      checklistId: string; 
      name?: string;
      bucket_id?: string | null;
      due_date?: string | null;
      tags?: string[];
    }>) => {
      const { checklistId, name, bucket_id, due_date, tags } = action.payload;
      
      // Update in checklists array
      const checklistIndex = state.checklists.findIndex(c => c.checklist_id === checklistId);
      if (checklistIndex !== -1) {
        if (name !== undefined) state.checklists[checklistIndex].name = name;
        if (bucket_id !== undefined) state.checklists[checklistIndex].bucket_id = bucket_id || undefined;
        if (due_date !== undefined) state.checklists[checklistIndex].due_date = due_date || undefined;
        if (tags !== undefined) state.checklists[checklistIndex].tags = tags;
      }
      
      // Update current checklist if it's the same one
      if (state.currentChecklist?.checklist_id === checklistId) {
        if (name !== undefined) state.currentChecklist.name = name;
        if (bucket_id !== undefined) state.currentChecklist.bucket_id = bucket_id || undefined;
        if (due_date !== undefined) state.currentChecklist.due_date = due_date || undefined;
        if (tags !== undefined) state.currentChecklist.tags = tags;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChecklists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklists.fulfilled, (state, action) => {
        state.loading = false;
        state.checklists = action.payload;
      })
      .addCase(fetchChecklists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch checklists';
      })
      .addCase(fetchChecklistsWithStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklistsWithStats.fulfilled, (state, action) => {
        state.loading = false;
        state.checklists = action.payload as ChecklistHeader[];
      })
      .addCase(fetchChecklistsWithStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch checklists with stats';
      })
      .addCase(fetchChecklistWithItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChecklistWithItems.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChecklist = action.payload.checklist;
        state.currentItems = action.payload.items;
      })
      .addCase(fetchChecklistWithItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch checklist details';
      })
      .addCase(createChecklist.fulfilled, (state, action) => {
        state.checklists.push(action.payload);
      })
      .addCase(createChecklistWithItems.fulfilled, (state, action) => {
        state.checklists.push(action.payload.checklist);
        state.currentItems = action.payload.items;
      })
      .addCase(updateChecklistItem.fulfilled, (state, action) => {
        const index = state.currentItems.findIndex(i => i.item_id === action.payload.item_id);
        if (index !== -1) {
          state.currentItems[index] = action.payload;
        }
      })
      .addCase(updateChecklist.fulfilled, (state, action) => {
        state.currentChecklist = action.payload;
        const checklistIndex = state.checklists.findIndex(c => c.checklist_id === action.payload.checklist_id);
        if (checklistIndex !== -1) {
          state.checklists[checklistIndex] = action.payload;
        }
      })
      .addCase(createChecklistItem.fulfilled, (state, action) => {
        state.currentItems.push(action.payload);
      })
      .addCase(deleteChecklistItem.fulfilled, (state, action) => {
        state.currentItems = state.currentItems.filter(i => i.item_id !== action.payload);
      });
  },
});

export const { 
  clearError, 
  setCurrentChecklist, 
  clearCurrentData, 
  reorderItems,
  updateChecklistTitle,
  updateItemCompletion,
  updateItemText,
  updateChecklistMetadata
} = checklistsSlice.actions;
export default checklistsSlice.reducer;