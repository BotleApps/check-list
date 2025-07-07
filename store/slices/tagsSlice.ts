import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TagMaster } from '../../types/database';
import { tagService } from '../../services/tagService';

interface TagsState {
  tags: TagMaster[];
  loading: boolean;
  error: string | null;
}

const initialState: TagsState = {
  tags: [],
  loading: false,
  error: null,
};

export const fetchTags = createAsyncThunk('tags/fetchTags', async () => {
  const response = await tagService.getAllTags();
  return response;
});

export const createTag = createAsyncThunk(
  'tags/createTag',
  async (name: string) => {
    console.log('createTag thunk called with:', name);
    const response = await tagService.createTag(name);
    console.log('createTag response:', response);
    return response;
  }
);

export const deleteTag = createAsyncThunk(
  'tags/deleteTag',
  async (tagId: string) => {
    await tagService.deleteTag(tagId);
    return tagId;
  }
);

export const updateTag = createAsyncThunk(
  'tags/updateTag',
  async ({ tagId, name }: { tagId: string; name: string }) => {
    const response = await tagService.updateTag(tagId, name);
    return response;
  }
);

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.tags = action.payload;
      })
      .addCase(createTag.fulfilled, (state, action) => {
        state.tags.push(action.payload);
      })
      .addCase(updateTag.fulfilled, (state, action) => {
        const index = state.tags.findIndex(tag => tag.tag_id === action.payload.tag_id);
        if (index !== -1) {
          state.tags[index] = action.payload;
        }
      })
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.tags = state.tags.filter(tag => tag.tag_id !== action.payload);
      });
  },
});

export const { clearError } = tagsSlice.actions;
export default tagsSlice.reducer;