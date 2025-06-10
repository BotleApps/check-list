import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { fetchBuckets, createBucket } from '../../store/slices/bucketsSlice';
import { fetchChecklistsWithStats } from '../../store/slices/checklistsSlice';
import { BucketCard } from '../../components/BucketCard';
import { ChecklistCard } from '../../components/ChecklistCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Plus, Search, ArrowLeft } from 'lucide-react-native';

export default function BucketsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { bucket: selectedBucketId } = useLocalSearchParams();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets, loading: bucketsLoading, error: bucketsError } = useSelector(
    (state: RootState) => state.buckets
  );
  const { checklists, loading: checklistsLoading } = useSelector(
    (state: RootState) => state.checklists
  );

  const selectedBucket = selectedBucketId 
    ? buckets.find(b => b.bucket_id === selectedBucketId)
    : null;

  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchChecklistsWithStats(user.user_id));
    }
  }, [user, dispatch]);

  // Refresh data when screen comes into focus (backup strategy)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        dispatch(fetchChecklistsWithStats(user.user_id));
      }
    }, [user, dispatch])
  );

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchBuckets(user.user_id)),
      dispatch(fetchChecklistsWithStats(user.user_id)),
    ]);
    setRefreshing(false);
  };

  const handleCreateBucket = async () => {
    if (!user || !newBucketName.trim()) return;
    
    try {
      await dispatch(createBucket({
        userId: user.user_id,
        bucketName: newBucketName.trim(),
      }));
      setNewBucketName('');
      setShowCreateBucket(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create bucket');
    }
  };

  const getBucketChecklistCount = (bucketId: string) => {
    return checklists.filter(c => c.bucket_id === bucketId).length;
  };

  const getChecklistProgress = (checklistId: string) => {
    const checklist = checklists.find(c => c.checklist_id === checklistId) as any;
    if (checklist && checklist.total_items > 0) {
      return Math.round((checklist.completed_items / checklist.total_items) * 100);
    }
    return 0;
  };

  const getChecklistItemCount = (checklistId: string) => {
    const checklist = checklists.find(c => c.checklist_id === checklistId) as any;
    return checklist?.total_items || 0;
  };

  const getChecklistCompletedCount = (checklistId: string) => {
    const checklist = checklists.find(c => c.checklist_id === checklistId) as any;
    return checklist?.completed_items || 0;
  };

  const filteredBuckets = buckets.filter(bucket =>
    bucket.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bucketChecklists = selectedBucket
    ? checklists.filter(c => c.bucket_id === selectedBucket.bucket_id)
    : [];

  if (bucketsLoading && buckets.length === 0) {
    return <LoadingSpinner />;
  }

  if (bucketsError) {
    return (
      <ErrorMessage
        message={bucketsError}
        onRetry={() => user && dispatch(fetchBuckets(user.user_id))}
      />
    );
  }

  // Show bucket contents if a bucket is selected
  if (selectedBucket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.setParams({ bucket: undefined })}
          >
            <ArrowLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedBucket.name}</Text>
            <Text style={styles.headerSubtitle}>
              {bucketChecklists.length} checklist{bucketChecklists.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push(`/checklist-edit/new?bucket=${selectedBucket.bucket_id}`)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {bucketChecklists.length > 0 ? (
            bucketChecklists.map(checklist => (
              <ChecklistCard
                key={checklist.checklist_id}
                checklist={checklist}
                progress={getChecklistProgress(checklist.checklist_id)}
                itemCount={getChecklistItemCount(checklist.checklist_id)}
                completedCount={getChecklistCompletedCount(checklist.checklist_id)}
                onPress={() => router.push(`/checklist/${checklist.checklist_id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No checklists in this bucket</Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => router.push(`/checklist-edit/new?bucket=${selectedBucket.bucket_id}`)}
              >
                <Text style={styles.createFirstButtonText}>Create your first checklist</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buckets</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateBucket(true)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search buckets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Create Bucket Form */}
      {showCreateBucket && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.createInput}
            placeholder="Bucket name"
            value={newBucketName}
            onChangeText={setNewBucketName}
            autoFocus
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCreateBucket(false);
                setNewBucketName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, !newBucketName.trim() && styles.saveButtonDisabled]}
              onPress={handleCreateBucket}
              disabled={!newBucketName.trim()}
            >
              <Text style={styles.saveButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBuckets.length > 0 ? (
          filteredBuckets.map(bucket => (
            <BucketCard
              key={bucket.bucket_id}
              bucket={bucket}
              checklistCount={getBucketChecklistCount(bucket.bucket_id)}
              onPress={() => router.setParams({ bucket: bucket.bucket_id })}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No buckets found' : 'No buckets yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => setShowCreateBucket(true)}
              >
                <Text style={styles.createFirstButtonText}>Create your first bucket</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  createForm: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  createInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});