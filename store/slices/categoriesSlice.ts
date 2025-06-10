import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CategoryMaster } from '../../types/database';
import { categoryService } from '../../services/categoryService';

interface CategoriesState {
  categories: CategoryMaster[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  categories: [],
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async () => {
    const response = await categoryService.getAllCategories();
    return response;
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (name: string) => {
    const response = await categoryService.createCategory(name);
    return response;
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      });
  },
});

export const { clearError } = categoriesSlice.actions;
export default categoriesSlice.reducer;