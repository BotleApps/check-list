import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Bucket } from '../../types/database';
import { bucketService } from '../../services/bucketService';

interface BucketsState {
  buckets: Bucket[];
  loading: boolean;
  error: string | null;
}

const initialState: BucketsState = {
  buckets: [],
  loading: false,
  error: null,
};

export const fetchBuckets = createAsyncThunk(
  'buckets/fetchBuckets',
  async (userId: string) => {
    const response = await bucketService.getUserBuckets(userId);
    return response;
  }
);

export const createBucket = createAsyncThunk(
  'buckets/createBucket',
  async ({ userId, bucketName }: { userId: string; bucketName: string }) => {
    const response = await bucketService.createBucket(userId, bucketName);
    return response;
  }
);

export const updateBucket = createAsyncThunk(
  'buckets/updateBucket',
  async ({ bucketId, bucketName }: { bucketId: string; bucketName: string }) => {
    const response = await bucketService.updateBucket(bucketId, bucketName);
    return response;
  }
);

export const deleteBucket = createAsyncThunk(
  'buckets/deleteBucket',
  async (bucketId: string) => {
    await bucketService.deleteBucket(bucketId);
    return bucketId;
  }
);

const bucketsSlice = createSlice({
  name: 'buckets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBuckets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuckets.fulfilled, (state, action) => {
        state.loading = false;
        state.buckets = action.payload;
      })
      .addCase(fetchBuckets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch buckets';
      })
      .addCase(createBucket.fulfilled, (state, action) => {
        state.buckets.push(action.payload);
      })
      .addCase(updateBucket.fulfilled, (state, action) => {
        const index = state.buckets.findIndex(b => b.bucket_id === action.payload.bucket_id);
        if (index !== -1) {
          state.buckets[index] = action.payload;
        }
      })
      .addCase(deleteBucket.fulfilled, (state, action) => {
        state.buckets = state.buckets.filter(b => b.bucket_id !== action.payload);
      });
  },
});

export const { clearError } = bucketsSlice.actions;
export default bucketsSlice.reducer;