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

export const updateChecklistItem = createAsyncThunk(
  'checklists/updateChecklistItem',
  async (item: ChecklistItem) => {
    const response = await checklistService.updateChecklistItem(item);
    return response;
  }
);

export const createChecklistItem = createAsyncThunk(
  'checklists/createChecklistItem',
  async (item: Omit<ChecklistItem, 'item_id' | 'created_at' | 'updated_at'>) => {
    const response = await checklistService.addChecklistItem(
      item.checklist_id,
      item.text,
      item.notes,
      item.due_date,
      item.order
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
    reorderItems: (state, action: PayloadAction<ChecklistItem[]>) => {
      state.currentItems = action.payload;
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
      .addCase(fetchChecklistWithItems.fulfilled, (state, action) => {
        state.currentChecklist = action.payload.checklist;
        state.currentItems = action.payload.items;
      })
      .addCase(createChecklist.fulfilled, (state, action) => {
        state.checklists.push(action.payload);
      })
      .addCase(updateChecklistItem.fulfilled, (state, action) => {
        const index = state.currentItems.findIndex(i => i.item_id === action.payload.item_id);
        if (index !== -1) {
          state.currentItems[index] = action.payload;
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

export const { clearError, setCurrentChecklist, reorderItems } = checklistsSlice.actions;
export default checklistsSlice.reducer;