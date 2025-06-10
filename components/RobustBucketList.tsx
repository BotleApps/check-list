import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { bucketService } from '../services/bucketService';
import { useApiState } from '../hooks/useApiState';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { NetworkAwareWrapper } from './NetworkAwareWrapper';
import { ApiErrorBoundary } from './ApiErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { Bucket } from '../types/database';

interface RobustBucketListProps {
  userId: string;
}

export function RobustBucketList({ userId }: RobustBucketListProps) {
  const [newBucketName, setNewBucketName] = useState('');
  const { isConnected } = useNetworkStatus();
  
  // Using the new API state management hook
  const {
    state: bucketsState,
    execute: executeBucketsCall,
    reset: resetBucketsState,
  } = useApiState<Bucket[]>([]);

  const {
    state: createState,
    execute: executeCreateCall,
    reset: resetCreateState,
  } = useApiState<Bucket>();

  // Load buckets on mount and when coming back online
  useEffect(() => {
    loadBuckets();
  }, [userId]);

  useEffect(() => {
    if (isConnected && bucketsState.error && bucketsState.isNetworkError) {
      // Automatically retry when connection is restored
      loadBuckets();
    }
  }, [isConnected]);

  const loadBuckets = async () => {
    await executeBucketsCall(async () => {
      // This will use the robust API wrapper with retries, timeouts, etc.
      const response = await bucketService.getUserBuckets(userId);
      return {
        success: true,
        data: response,
      };
    });
  };

  const createBucket = async () => {
    if (!newBucketName.trim()) {
      Alert.alert('Error', 'Please enter a bucket name');
      return;
    }

    const result = await executeCreateCall(async () => {
      const bucket = await bucketService.createBucket(userId, newBucketName.trim());
      return {
        success: !!bucket,
        data: bucket || undefined,
        error: bucket ? undefined : 'Failed to create bucket',
      };
    });

    if (result) {
      setNewBucketName('');
      // Refresh the list
      loadBuckets();
    }
  };

  const deleteBucket = async (bucketId: string) => {
    Alert.alert(
      'Delete Bucket',
      'Are you sure you want to delete this bucket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bucketService.deleteBucket(bucketId);
              // Refresh the list after successful deletion
              loadBuckets();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bucket');
            }
          },
        },
      ]
    );
  };

  const renderBucket = ({ item }: { item: Bucket }) => (
    <View style={styles.bucketItem}>
      <Text style={styles.bucketName}>{item.name}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteBucket(item.bucket_id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => {
    if (!bucketsState.error) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {bucketsState.isNetworkError 
            ? 'Connection problem. Check your internet and try again.'
            : bucketsState.error
          }
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBuckets}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ApiErrorBoundary>
      <NetworkAwareWrapper
        onRetry={loadBuckets}
        offlineMessage="You're offline. Changes will be synced when connection is restored."
      >
        <View style={styles.container}>
          <Text style={styles.title}>My Buckets</Text>
          
          {/* Connection status indicator */}
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? '#4CAF50' : '#FF5722' }
          ]}>
            <Text style={styles.statusText}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>

          {/* Create new bucket */}
          <View style={styles.createContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter bucket name"
              value={newBucketName}
              onChangeText={setNewBucketName}
              editable={!createState.loading}
            />
            <TouchableOpacity
              style={[styles.createButton, createState.loading && styles.disabledButton]}
              onPress={createBucket}
              disabled={createState.loading}
            >
              {createState.loading ? (
                <LoadingSpinner size="small" color="white" />
              ) : (
                <Text style={styles.createButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>

          {createState.error && (
            <Text style={styles.errorText}>{createState.error}</Text>
          )}

          {/* Buckets list */}
          {bucketsState.loading && !bucketsState.data?.length ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner />
              <Text style={styles.loadingText}>Loading buckets...</Text>
            </View>
          ) : (
            <>
              {renderError()}
              <FlatList
                data={bucketsState.data || []}
                renderItem={renderBucket}
                keyExtractor={(item) => item.bucket_id}
                style={styles.list}
                refreshing={bucketsState.loading}
                onRefresh={loadBuckets}
                ListEmptyComponent={
                  !bucketsState.loading && !bucketsState.error ? (
                    <Text style={styles.emptyText}>No buckets yet. Create your first one!</Text>
                  ) : null
                }
              />
            </>
          )}
        </View>
      </NetworkAwareWrapper>
    </ApiErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  createContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  bucketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  bucketName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 32,
  },
});

export default RobustBucketList;
