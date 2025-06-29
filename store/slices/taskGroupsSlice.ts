import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TaskGroup, GroupedTasks } from '../../types/database';
import { taskGroupService } from '../../services/taskGroupService';

interface TaskGroupsState {
  groups: TaskGroup[];
  groupedTasks: Record<string, GroupedTasks[]>; // Key: checklistId
  loading: boolean;
  error: string | null;
  isNetworkError: boolean;
}

const initialState: TaskGroupsState = {
  groups: [],
  groupedTasks: {},
  loading: false,
  error: null,
  isNetworkError: false,
};

// Async thunks
export const fetchTaskGroups = createAsyncThunk(
  'taskGroups/fetchTaskGroups',
  async (checklistId: string, { rejectWithValue }) => {
    try {
      const groups = await taskGroupService.getChecklistGroups(checklistId);
      return { checklistId, groups };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch task groups';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const fetchGroupedTasks = createAsyncThunk(
  'taskGroups/fetchGroupedTasks',
  async (checklistId: string, { rejectWithValue }) => {
    try {
      const groupedTasks = await taskGroupService.getGroupedTasks(checklistId);
      return { checklistId, groupedTasks };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch grouped tasks';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const createTaskGroup = createAsyncThunk(
  'taskGroups/createTaskGroup',
  async (
    params: {
      checklistId: string;
      name: string;
      description?: string;
      targetDate?: string;
      colorCode?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const group = await taskGroupService.createTaskGroup(
        params.checklistId,
        params.name,
        params.description,
        params.targetDate,
        params.colorCode
      );
      if (!group) {
        throw new Error('Failed to create task group');
      }
      return group;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const updateTaskGroup = createAsyncThunk(
  'taskGroups/updateTaskGroup',
  async (
    params: {
      groupId: string;
      updates: Partial<Omit<TaskGroup, 'group_id' | 'checklist_id' | 'created_at' | 'updated_at'>>;
    },
    { rejectWithValue }
  ) => {
    try {
      const group = await taskGroupService.updateTaskGroup(params.groupId, params.updates);
      if (!group) {
        throw new Error('Failed to update task group');
      }
      return group;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const deleteTaskGroup = createAsyncThunk(
  'taskGroups/deleteTaskGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const success = await taskGroupService.deleteTaskGroup(groupId);
      if (!success) {
        throw new Error('Failed to delete task group');
      }
      return groupId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const moveTaskToGroup = createAsyncThunk(
  'taskGroups/moveTaskToGroup',
  async (
    params: { taskId: string; groupId?: string; checklistId: string },
    { rejectWithValue }
  ) => {
    try {
      const success = await taskGroupService.moveTaskToGroup(params.taskId, params.groupId);
      if (!success) {
        throw new Error('Failed to move task to group');
      }
      return params;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move task to group';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const reorderTaskGroups = createAsyncThunk(
  'taskGroups/reorderTaskGroups',
  async (
    params: { 
      checklistId: string;
      groupUpdates: { group_id: string; order_index: number }[] 
    },
    { rejectWithValue }
  ) => {
    try {
      const success = await taskGroupService.reorderTaskGroups(params.groupUpdates);
      if (!success) {
        throw new Error('Failed to reorder task groups');
      }
      return params;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder task groups';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

export const toggleGroupCollapsed = createAsyncThunk(
  'taskGroups/toggleGroupCollapsed',
  async (
    params: { groupId: string; isCollapsed: boolean },
    { rejectWithValue }
  ) => {
    try {
      const success = await taskGroupService.toggleGroupCollapsed(params.groupId, params.isCollapsed);
      if (!success) {
        throw new Error('Failed to toggle group collapsed state');
      }
      return params;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle group collapsed state';
      return rejectWithValue({ message, isNetworkError: false });
    }
  }
);

const taskGroupsSlice = createSlice({
  name: 'taskGroups',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.isNetworkError = false;
    },
    clearGroupedTasks: (state, action: PayloadAction<string>) => {
      delete state.groupedTasks[action.payload];
    },
    clearAllGroupedTasks: (state) => {
      state.groupedTasks = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch task groups
      .addCase(fetchTaskGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(fetchTaskGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload.groups;
      })
      .addCase(fetchTaskGroups.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch task groups';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Fetch grouped tasks
      .addCase(fetchGroupedTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(fetchGroupedTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.groupedTasks[action.payload.checklistId] = action.payload.groupedTasks;
      })
      .addCase(fetchGroupedTasks.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch grouped tasks';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Create task group
      .addCase(createTaskGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(createTaskGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups.push(action.payload);
      })
      .addCase(createTaskGroup.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to create task group';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Update task group
      .addCase(updateTaskGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(updateTaskGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(g => g.group_id === action.payload.group_id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
      })
      .addCase(updateTaskGroup.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update task group';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Delete task group
      .addCase(deleteTaskGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(deleteTaskGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = state.groups.filter(g => g.group_id !== action.payload);
      })
      .addCase(deleteTaskGroup.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to delete task group';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Move task to group
      .addCase(moveTaskToGroup.pending, (state) => {
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(moveTaskToGroup.fulfilled, (state) => {
        // Task movement will be reflected when grouped tasks are refetched
      })
      .addCase(moveTaskToGroup.rejected, (state, action: any) => {
        state.error = action.payload?.message || 'Failed to move task to group';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Reorder task groups
      .addCase(reorderTaskGroups.pending, (state) => {
        state.error = null;
        state.isNetworkError = false;
      })
      .addCase(reorderTaskGroups.fulfilled, (state, action) => {
        // Update local order
        action.payload.groupUpdates.forEach(update => {
          const group = state.groups.find(g => g.group_id === update.group_id);
          if (group) {
            group.order_index = update.order_index;
          }
        });
        // Sort groups by order_index
        state.groups.sort((a, b) => a.order_index - b.order_index);
      })
      .addCase(reorderTaskGroups.rejected, (state, action: any) => {
        state.error = action.payload?.message || 'Failed to reorder task groups';
        state.isNetworkError = action.payload?.isNetworkError || false;
      })

      // Toggle group collapsed
      .addCase(toggleGroupCollapsed.fulfilled, (state, action) => {
        const group = state.groups.find(g => g.group_id === action.payload.groupId);
        if (group) {
          group.is_collapsed = action.payload.isCollapsed;
        }
      });
  },
});

export const { clearError, clearGroupedTasks, clearAllGroupedTasks } = taskGroupsSlice.actions;
export default taskGroupsSlice.reducer;
