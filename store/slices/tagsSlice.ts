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
      });
  },
});

export const { clearError } = tagsSlice.actions;
export default tagsSlice.reducer;