import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { fetchChecklists } from '../../store/slices/checklistsSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { ChecklistCard } from '../../components/ChecklistCard';
import { BucketCard } from '../../components/BucketCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Plus } from 'lucide-react-native';

export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { checklists, loading: checklistsLoading, error: checklistsError } = useSelector(
    (state: RootState) => state.checklists
  );
  const { buckets, loading: bucketsLoading } = useSelector((state: RootState) => state.buckets);

  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(fetchChecklists(user.user_id));
      dispatch(fetchBuckets(user.user_id));
    }
  }, [isAuthenticated, user, dispatch]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchChecklists(user.user_id)),
      dispatch(fetchBuckets(user.user_id)),
    ]);
    setRefreshing(false);
  };

  const getChecklistProgress = (checklistId: string) => {
    // TODO: Calculate from actual checklist items
    return 0;
  };

  const getChecklistItemCount = (checklistId: string) => {
    // TODO: Get actual item count from database
    return 0;
  };

  const getBucketChecklistCount = (bucketId: string) => {
    return checklists.filter(c => c.bucket_id === bucketId).length;
  };

  const recentChecklists = checklists.slice(0, 3);
  const recentBuckets = buckets.slice(0, 3);

  if (!isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }

  if (checklistsLoading && checklists.length === 0) {
    return <LoadingSpinner />;
  }

  if (checklistsError) {
    return (
      <ErrorMessage
        message={checklistsError}
        onRetry={() => user && dispatch(fetchChecklists(user.user_id))}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning!</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/checklist-edit/new')}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Recent Checklists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Checklists</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/buckets')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentChecklists.length > 0 ? (
            recentChecklists.map(checklist => (
              <ChecklistCard
                key={checklist.checklist_id}
                checklist={checklist}
                progress={getChecklistProgress(checklist.checklist_id)}
                itemCount={getChecklistItemCount(checklist.checklist_id)}
                onPress={() => router.push(`/checklist/${checklist.checklist_id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No checklists yet</Text>
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => router.push('/checklist-edit/new')}
              >
                <Text style={styles.createFirstButtonText}>Create your first checklist</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Popular Buckets */}
        {recentBuckets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Buckets</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/buckets')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentBuckets.map(bucket => (
              <BucketCard
                key={bucket.bucket_id}
                bucket={bucket}
                checklistCount={getBucketChecklistCount(bucket.bucket_id)}
                onPress={() => router.push(`/(tabs)/buckets?bucket=${bucket.bucket_id}`)}
              />
            ))}
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
  scrollView: {
    flex: 1,
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
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
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