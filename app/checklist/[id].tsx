import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchChecklistWithItems, updateChecklistItem, createChecklistItem } from '../../store/slices/checklistsSlice';
import { ChecklistItem } from '../../components/ChecklistItem';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { 
  ArrowLeft, 
  Share2, 
  MoreVertical, 
  Plus,
  Calendar,
  Tag,
  FolderOpen,
  Check
} from 'lucide-react-native';

export default function ChecklistDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [refreshing, setRefreshing] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const newItemInputRef = useRef<TextInput>(null);
  const editItemInputRef = useRef<TextInput>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const { checklists, currentChecklist, currentItems, loading, error } = useSelector(
    (state: RootState) => state.checklists
  );
  const { buckets } = useSelector((state: RootState) => state.buckets);

  const checklist = currentChecklist || checklists.find(c => c.checklist_id === id);
  const items = currentItems;
  const bucket = buckets.find(b => b.bucket_id === checklist?.bucket_id);

  useEffect(() => {
    if (id && user) {
      dispatch(fetchChecklistWithItems(id));
    }
  }, [id, user, dispatch]);

  const onRefresh = async () => {
    if (!id || !user) return;
    setRefreshing(true);
    await dispatch(fetchChecklistWithItems(id));
    setRefreshing(false);
  };

  const handleItemToggle = async (itemId: string, currentCompleted: boolean) => {
    if (!user) return;
    
    const item = items.find(i => i.item_id === itemId);
    if (!item) return;
    
    try {
      await dispatch(updateChecklistItem({
        ...item,
        is_completed: !currentCompleted
      })).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to update item status');
    }
  };

  const handleAddNewItem = () => {
    setIsAddingItem(true);
    setNewItemText('');
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      newItemInputRef.current?.focus();
    }, 100);
  };

  const handleSaveNewItem = async () => {
    if (!newItemText.trim() || !id) return;
    
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map(item => item.order_index)) : 0;
      
      await dispatch(createChecklistItem({
        checklist_id: id,
        text: newItemText.trim(),
        description: '',
        is_completed: false,
        order_index: maxOrder + 1,
        is_required: false,
        tags: [],
      })).unwrap();
      
      setIsAddingItem(false);
      setNewItemText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
  };

  const handleCancelNewItem = () => {
    setIsAddingItem(false);
    setNewItemText('');
  };

  const handleItemPress = (item: any) => {
    setEditingItemId(item.item_id);
    setEditingItemText(item.text);
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      editItemInputRef.current?.focus();
    }, 100);
  };

  const handleSaveEditItem = async () => {
    if (!editingItemText.trim() || !editingItemId) return;
    
    const item = items.find(i => i.item_id === editingItemId);
    if (!item) return;
    
    try {
      await dispatch(updateChecklistItem({
        ...item,
        text: editingItemText.trim()
      })).unwrap();
      
      setEditingItemId(null);
      setEditingItemText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update item. Please try again.');
    }
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemText('');
  };

  const getProgress = () => {
    if (items.length === 0) return 0;
    const completedItems = items.filter(item => item.is_completed).length;
    return (completedItems / items.length) * 100;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMoreActions = () => {
    Alert.alert(
      'Checklist Actions',
      'Choose an action',
      [
        {
          text: 'Share Checklist',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Share functionality will be available soon');
          }
        },
        {
          text: 'Duplicate',
          onPress: () => {
            // TODO: Implement duplicate functionality
            Alert.alert('Feature Coming Soon', 'Duplicate functionality will be available soon');
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Checklist',
              'Are you sure you want to delete this checklist? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement delete functionality
                    Alert.alert('Feature Coming Soon', 'Delete functionality will be available soon');
                  }
                }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (loading && items.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorMessage 
          message={error} 
          onRetry={() => onRefresh()} 
        />
      </SafeAreaView>
    );
  }

  if (!checklist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Checklist not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => Alert.alert('Feature Coming Soon', 'Share functionality will be available soon')}
            style={styles.actionButton}
          >
            <Share2 size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMoreActions} style={styles.actionButton}>
            <MoreVertical size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Checklist Info */}
        <View style={styles.checklistInfo}>
          <Text style={styles.title}>{checklist.name}</Text>
          
          {checklist.description && (
            <Text style={styles.description}>{checklist.description}</Text>
          )}

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {items.filter(item => item.is_completed).length} of {items.length} completed
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round(getProgress())}%
              </Text>
            </View>
            <ProgressBar progress={getProgress()} />
          </View>

          {/* Metadata */}
          <View style={styles.metadata}>
            {bucket && (
              <View style={styles.metadataItem}>
                <FolderOpen size={16} color="#6B7280" />
                <Text style={styles.metadataText}>{bucket.bucket_name}</Text>
              </View>
            )}
            
            {checklist.target_date && (
              <View style={styles.metadataItem}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.metadataText}>
                  Due {formatDate(checklist.target_date)}
                </Text>
              </View>
            )}

            {checklist.tags && checklist.tags.length > 0 && (
              <View style={styles.metadataItem}>
                <Tag size={16} color="#6B7280" />
                <Text style={styles.metadataText}>
                  {checklist.tags.join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>Tasks</Text>
            <TouchableOpacity 
              onPress={handleAddNewItem}
              style={styles.addButton}
              disabled={isAddingItem}
            >
              <Plus size={20} color={isAddingItem ? "#9CA3AF" : "#2563EB"} />
            </TouchableOpacity>
          </View>

          {items.length === 0 && !isAddingItem ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first task
              </Text>
            </View>
          ) : (
            <>
              {items
                .sort((a, b) => a.order_index - b.order_index)
                .map((item) => (
                  editingItemId === item.item_id ? (
                    // Editing mode for this item
                    <View key={item.item_id} style={styles.newItemContainer}>
                      <View style={styles.newItemRow}>
                        <TouchableOpacity
                          style={styles.newItemCheckbox}
                          onPress={() => handleItemToggle(item.item_id, item.is_completed)}
                        >
                          {item.is_completed ? (
                            <View style={styles.checkedBox}>
                              <Check size={16} color="#FFFFFF" strokeWidth={2} />
                            </View>
                          ) : (
                            <View style={styles.uncheckedBox} />
                          )}
                        </TouchableOpacity>
                        <TextInput
                          ref={editItemInputRef}
                          style={styles.newItemInput}
                          value={editingItemText}
                          onChangeText={setEditingItemText}
                          onSubmitEditing={handleSaveEditItem}
                          onBlur={handleCancelEditItem}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          multiline={false}
                        />
                      </View>
                    </View>
                  ) : (
                    // Normal display mode
                    <ChecklistItem
                      key={item.item_id}
                      item={item}
                      onToggle={() => handleItemToggle(item.item_id, item.is_completed)}
                      onPress={() => handleItemPress(item)}
                    />
                  )
                ))}
              
              {/* New Item Input */}
              {isAddingItem && (
                <View style={styles.newItemContainer}>
                  <View style={styles.newItemRow}>
                    <View style={styles.newItemCheckbox}>
                      <View style={styles.uncheckedBox} />
                    </View>
                    <TextInput
                      ref={newItemInputRef}
                      style={styles.newItemInput}
                      placeholder="Enter task..."
                      value={newItemText}
                      onChangeText={setNewItemText}
                      onSubmitEditing={handleSaveNewItem}
                      onBlur={handleCancelNewItem}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      multiline={false}
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  checklistInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  metadata: {
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 0,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  newItemInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  newItemContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  newItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newItemCheckbox: {
    marginRight: 12,
  },
  uncheckedBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  checkedBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
});
