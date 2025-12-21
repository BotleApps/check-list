import { btpApi } from '../lib/btpApiClient';
import { Bucket } from '../types/database';

type BucketPayload = {
  bucket_id: number | string;
  user_id: number | string | null;
  bucket_name: string;
  created_at?: string;
  updated_at?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean | null;
};

class BucketService {
  private normalizeBucket(raw: BucketPayload): Bucket {
    return {
      bucket_id: String(raw.bucket_id),
      user_id: raw.user_id ? String(raw.user_id) : '',
      name: raw.bucket_name,
      description: raw.description ?? undefined,
      color: raw.color ?? undefined,
      icon: raw.icon ?? undefined,
      is_active: raw.is_active ?? true,
      created_at: raw.created_at ?? new Date().toISOString(),
      updated_at: raw.updated_at ?? raw.created_at ?? new Date().toISOString(),
    };
  }

  async getUserBuckets(_userId: string): Promise<Bucket[]> {
    const response = await btpApi.getBuckets();
    if (response.error) {
      throw new Error(response.error);
    }

    const buckets = Array.isArray(response.data) ? response.data : [];
    return buckets.map((bucket) => this.normalizeBucket(bucket as BucketPayload));
  }

  async createBucket(_userId: string, bucketName: string): Promise<Bucket> {
    const response = await btpApi.createBucket(bucketName);
    if (response.error) {
      throw new Error(response.error);
    }

    const bucket = response.data as BucketPayload;
    return this.normalizeBucket(bucket);
  }

  async updateBucket(bucketId: string, bucketName: string): Promise<Bucket> {
    const numericId = Number(bucketId);
    if (Number.isNaN(numericId)) {
      throw new Error('Invalid bucket identifier');
    }

    const response = await btpApi.updateBucket(numericId, bucketName);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error('Bucket update failed. No data returned.');
    }

    return this.normalizeBucket(response.data as BucketPayload);
  }

  async deleteBucket(bucketId: string): Promise<void> {
    const numericId = Number(bucketId);
    if (Number.isNaN(numericId)) {
      throw new Error('Invalid bucket identifier');
    }

    const response = await btpApi.deleteBucket(numericId);
    if (response.error) {
      throw new Error(response.error);
    }
  }
}

export const bucketService = new BucketService();