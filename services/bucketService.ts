import { Bucket } from '../types/database';

class BucketService {
  private mockBuckets: Bucket[] = [
    {
      bucket_id: '1',
      user_id: '1',
      bucket_name: 'Personal',
      created_at: new Date().toISOString(),
    },
    {
      bucket_id: '2',
      user_id: '1',
      bucket_name: 'Work',
      created_at: new Date().toISOString(),
    },
    {
      bucket_id: '3',
      user_id: '1',
      bucket_name: 'Home Projects',
      created_at: new Date().toISOString(),
    },
  ];

  async getUserBuckets(userId: string): Promise<Bucket[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockBuckets.filter(b => b.user_id === userId);
  }

  async createBucket(userId: string, bucketName: string): Promise<Bucket> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newBucket: Bucket = {
      bucket_id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      bucket_name: bucketName,
      created_at: new Date().toISOString(),
    };

    this.mockBuckets.push(newBucket);
    return newBucket;
  }

  async updateBucket(bucketId: string, bucketName: string): Promise<Bucket> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const bucket = this.mockBuckets.find(b => b.bucket_id === bucketId);
    if (!bucket) {
      throw new Error('Bucket not found');
    }

    bucket.bucket_name = bucketName;
    return bucket;
  }

  async deleteBucket(bucketId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = this.mockBuckets.findIndex(b => b.bucket_id === bucketId);
    if (index === -1) {
      throw new Error('Bucket not found');
    }

    this.mockBuckets.splice(index, 1);
  }
}

export const bucketService = new BucketService();