import { Bucket } from '../types/database';
import { supabase } from '../lib/supabase';

class BucketService {
  async getUserBuckets(userId: string): Promise<Bucket[]> {
    const { data, error } = await supabase
      .from('buckets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async createBucket(userId: string, bucketName: string): Promise<Bucket> {
    const newBucket = {
      user_id: userId,
      name: bucketName,
    };

    const { data, error } = await supabase
      .from('buckets')
      .insert(newBucket)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateBucket(bucketId: string, bucketName: string): Promise<Bucket> {
    const { data, error } = await supabase
      .from('buckets')
      .update({ name: bucketName })
      .eq('bucket_id', bucketId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteBucket(bucketId: string): Promise<void> {
    const { error } = await supabase
      .from('buckets')
      .delete()
      .eq('bucket_id', bucketId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const bucketService = new BucketService();