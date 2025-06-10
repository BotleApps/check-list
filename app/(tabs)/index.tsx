import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  FlatList,
  TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useFocusEffect } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { fetchChecklistsWithStats } from '../../store/slices/checklistsSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { ChecklistCard } from '../../components/ChecklistCard';
import { BucketCard } from '../../components/BucketCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Plus, ChevronDown, ArrowUpDown, Search } from 'lucide-react-native';

export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'folder' | 'created' | 'target' | 'modified'>('folder');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loadedItems, setLoadedItems] = useState(20); // For lazy loading

  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { checklists, loading: checklistsLoading, error: checklistsError } = useSelector(
    (state: RootState) => state.checklists
  );
  const { buckets, loading: bucketsLoading } = useSelector((state: RootState) => state.buckets);

  // Debug logs
  console.log('🔍 HomeScreen Debug:', {
    checklistsCount: checklists.length,
    bucketsCount: buckets.length,
    loading: checklistsLoading,
    error: checklistsError,
    user: user?.user_id,
    sampleChecklist: checklists[0] || null,
    sampleBucket: buckets[0] || null
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(fetchChecklistsWithStats(user.user_id));
      dispatch(fetchBuckets(user.user_id));
    }
  }, [isAuthenticated, user, dispatch]);

  // Refresh data when screen comes into focus (backup strategy)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        dispatch(fetchChecklistsWithStats(user.user_id));
      }
    }, [isAuthenticated, user, dispatch])
  );

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchChecklistsWithStats(user.user_id)),
      dispatch(fetchBuckets(user.user_id)),
    ]);
    setRefreshing(false);
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

  const getBucketName = (bucketId: string | null | undefined) => {
    if (!bucketId) return undefined;
    const bucket = buckets.find(b => b.bucket_id === bucketId);
    const name = bucket?.name;
    console.log('🗂️ getBucketName:', { bucketId, foundBucket: !!bucket, name });
    return name;
  };

  const getBucketChecklistCount = (bucketId: string) => {
    return checklists.filter(c => c.bucket_id === bucketId).length;
  };

  // Helper function to format date for grouping
  const formatDateGroupKey = (dateString: string | null | undefined, fallbackText: string) => {
    if (!dateString) return fallbackText;
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare only dates
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Get group key based on sort type
  const getGroupKey = (checklist: any) => {
    let groupKey;
    switch (sortBy) {
      case 'folder':
        groupKey = getBucketName(checklist.bucket_id) || 'No Folder';
        break;
      case 'created':
        groupKey = formatDateGroupKey(checklist.created_at, 'No Date');
        break;
      case 'target':
        groupKey = formatDateGroupKey(checklist.due_date, 'No Due Date');
        break;
      case 'modified':
        groupKey = formatDateGroupKey(checklist.updated_at, 'No Date');
        break;
      default:
        groupKey = 'Others';
    }
    console.log('🏷️ getGroupKey:', { 
      checklistId: checklist.checklist_id, 
      checklistName: checklist.name,
      sortBy, 
      groupKey,
      bucketId: checklist.bucket_id 
    });
    return groupKey;
  };

  // Sorting and grouping logic
  const sortedAndGroupedChecklists = useMemo(() => {
    console.log('🔄 Starting sorting and grouping:', {
      originalChecklists: checklists.length,
      searchQuery: searchQuery.trim(),
      sortBy,
      sortDirection
    });

    // Filter checklists based on search query
    let filteredChecklists = checklists;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredChecklists = checklists.filter(checklist => 
        checklist.name.toLowerCase().includes(query) ||
        getBucketName(checklist.bucket_id)?.toLowerCase().includes(query)
      );
      console.log('🔍 After search filter:', filteredChecklists.length);
    }

    // Sort checklists
    const sorted = [...filteredChecklists].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'folder':
          const bucketA = getBucketName(a.bucket_id) || 'No Folder';
          const bucketB = getBucketName(b.bucket_id) || 'No Folder';
          comparison = bucketA.localeCompare(bucketB);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'target':
          const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'modified':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Group by the selected sort field
    const grouped = sorted.reduce((acc, checklist) => {
      const groupKey = getGroupKey(checklist);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(checklist);
      return acc;
    }, {} as Record<string, typeof checklists>);

    console.log('📊 Grouped data:', {
      groupKeys: Object.keys(grouped),
      groupCounts: Object.entries(grouped).map(([key, items]) => ({ key, count: items.length })),
      totalItems: sorted.length
    });

    // Sort the groups themselves
    const sortedGroupEntries = Object.entries(grouped).sort(([keyA], [keyB]) => {
      // Handle "No" prefixed groups - they should come last
      const isNoGroupA = keyA.startsWith('No ');
      const isNoGroupB = keyB.startsWith('No ');
      
      if (isNoGroupA && !isNoGroupB) return 1;  // A goes after B
      if (!isNoGroupA && isNoGroupB) return -1; // A goes before B
      if (isNoGroupA && isNoGroupB) return keyA.localeCompare(keyB); // Both "No" groups, sort alphabetically
      
      // For date-based sorting, handle special cases
      if (sortBy !== 'folder') {
        if (keyA === 'Today') return -1;
        if (keyB === 'Today') return 1;
        if (keyA === 'Yesterday') return keyB === 'Today' ? 1 : -1;
        if (keyB === 'Yesterday') return keyA === 'Today' ? -1 : 1;
        
        // For other dates, try to parse and compare
        const dateA = new Date(keyA);
        const dateB = new Date(keyB);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return sortDirection === 'asc' ? 
            dateA.getTime() - dateB.getTime() : 
            dateB.getTime() - dateA.getTime();
        }
      }
      
      // Default alphabetical sorting
      return sortDirection === 'asc' ? 
        keyA.localeCompare(keyB) : 
        keyB.localeCompare(keyA);
    });

    const finalResult = Object.fromEntries(sortedGroupEntries);
    console.log('✅ Final grouped result:', {
      groupCount: Object.keys(finalResult).length,
      groups: Object.keys(finalResult),
      isEmpty: Object.keys(finalResult).length === 0
    });

    return finalResult;
  }, [checklists, buckets, sortBy, sortDirection, searchQuery]);

  const toggleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
    setShowSortMenu(false);
  };

  const loadMore = () => {
    setLoadedItems(prev => prev + 20);
  };

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
        onRetry={() => user && dispatch(fetchChecklistsWithStats(user.user_id))}
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
        {/* Header with App Name */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Checklist</Text>
          
          {/* Search and Sort Controls */}
          <View style={styles.searchSortContainer}>
            <View style={styles.searchContainer}>
              <Search size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search checklists..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={styles.sortIconButton}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {showSortMenu && (
              <View style={styles.sortMenu}>
                {[
                  { key: 'folder', label: 'Folder Name' },
                  { key: 'created', label: 'Created Date' },
                  { key: 'target', label: 'Due Date' },
                  { key: 'modified', label: 'Modified Date' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={styles.sortOption}
                    onPress={() => toggleSort(option.key as typeof sortBy)}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      sortBy === option.key && styles.sortOptionTextActive
                    ]}>
                      {option.label}
                      {sortBy === option.key && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Grouped Checklists */}
        {(() => {
          const hasChecklists = checklists.length > 0;
          const hasGroups = Object.keys(sortedAndGroupedChecklists).length > 0;
          console.log('🎨 Render decision:', {
            hasChecklists,
            hasGroups,
            willRenderGroups: hasChecklists && hasGroups,
            willRenderSearchEmpty: hasChecklists && !hasGroups,
            willRenderCompleteEmpty: !hasChecklists
          });
          return null;
        })()}
        {checklists.length > 0 ? (
          Object.keys(sortedAndGroupedChecklists).length > 0 ? (
            <>
              {console.log('🎨 Rendering groups:', Object.keys(sortedAndGroupedChecklists))}
              {Object.entries(sortedAndGroupedChecklists).map(([groupName, groupChecklists]) => (
              <View key={groupName} style={styles.section}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{groupName}</Text>
                  <Text style={styles.groupCount}>({groupChecklists.length})</Text>
                </View>
                
                {groupChecklists.slice(0, loadedItems).map(checklist => (
                  <ChecklistCard
                    key={checklist.checklist_id}
                    checklist={checklist}
                    progress={getChecklistProgress(checklist.checklist_id)}
                    itemCount={getChecklistItemCount(checklist.checklist_id)}
                    completedCount={getChecklistCompletedCount(checklist.checklist_id)}
                    bucketName={getBucketName(checklist.bucket_id)}
                    onPress={() => router.push(`/checklist/${checklist.checklist_id}`)}
                  />
                ))}
              </View>
            ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery.trim() 
                  ? `No checklists found for "${searchQuery}"`
                  : 'No checklists match the current filters'
                }
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )
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

        {/* Load More Button */}
        {checklists.length > loadedItems && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/checklist-edit/new')}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  sortContainer: {
    position: 'relative',
  },
  searchSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  sortIconButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sortMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 150,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  sortOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  groupCount: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  folderCount: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
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
  clearSearchButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  clearSearchButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  loadMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});