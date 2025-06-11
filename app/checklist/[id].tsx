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
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchChecklistWithItems, updateChecklistItem, createChecklistItem, updateChecklist, clearCurrentData, updateItemCompletion, updateItemText, updateChecklistTitle, updateChecklistMetadata, deleteChecklist, shareChecklist } from '../../store/slices/checklistsSlice';
import { fetchBuckets, createBucket } from '../../store/slices/bucketsSlice';
import { fetchTags, createTag } from '../../store/slices/tagsSlice';
import { fetchCategories } from '../../store/slices/categoriesSlice';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChecklistItem } from '../../components/ChecklistItem';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { FolderSelectionModal } from '../../components/FolderSelectionModal';
import { TagSelectionModal } from '../../components/TagSelectionModal';
import { 
  validateChecklistTitle, 
  validateItemText, 
  canAddMoreItems,
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
  getCharacterCountText,
  shouldHighlightCharacterCount
} from '../../lib/validations';
import { 
  ArrowLeft, 
  Share2, 
  Copy,
  Trash2,
  Plus,
  Calendar,
  Tag,
  FolderOpen,
  Check,
  Edit3,
  Save,
  X
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
  
  // Header edit mode states
  const [editingHeader, setEditingHeader] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [editingBucketId, setEditingBucketId] = useState<string>('');
  const [editingTargetDate, setEditingTargetDate] = useState<Date | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  
  // Share functionality states
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [sharing, setSharing] = useState(false);
  
  // Validation states
  const [titleValidationError, setTitleValidationError] = useState<string | null>(null);
  const [itemValidationError, setItemValidationError] = useState<string | null>(null);
  
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [addingNewItem, setAddingNewItem] = useState(false);
  const newItemInputRef = useRef<TextInput>(null);
  const editItemInputRef = useRef<TextInput>(null);
  const editTitleInputRef = useRef<TextInput>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const { checklists, currentChecklist, currentItems, loading, error } = useSelector(
    (state: RootState) => state.checklists
  );
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { tags } = useSelector((state: RootState) => state.tags);
  const { categories, loading: categoriesLoading } = useSelector((state: RootState) => state.categories);

  const checklist = currentChecklist;
  const items = currentItems;
  const bucket = buckets.find(b => b.bucket_id === checklist?.bucket_id);

  useEffect(() => {
    if (id && user) {
      console.log('Fetching checklist with ID:', id);
      // Clear current data first to avoid showing stale data
      // dispatch(clearCurrentData());
      dispatch(fetchChecklistWithItems(id))
        .unwrap()
        .then((result) => {
          console.log('Checklist fetched successfully:', result);
        })
        .catch((error) => {
          console.error('Error fetching checklist:', error);
        });
    }
  }, [id, user, dispatch]);

  useEffect(() => {
    if (user) {
      console.log('📋 Fetching supporting data for user:', user.user_id);
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
      dispatch(fetchCategories())
        .unwrap()
        .then((categories) => {
          console.log('📂 Global categories fetched successfully:', categories);
        })
        .catch((error) => {
          console.error('❌ Error fetching categories:', error);
        });
    }
  }, [user, dispatch]);

  const onRefresh = async () => {
    if (!id || !user) return;
    setRefreshing(true);
    await dispatch(fetchChecklistWithItems(id));
    setRefreshing(false);
  };

  const handleItemToggle = async (itemId: string, currentCompleted: boolean) => {
    if (!user || savingItem === itemId || !checklist) return;
    
    const item = items.find(i => i.item_id === itemId);
    if (!item) return;
    
    const newCompletedState = !currentCompleted;
    const completedAt = newCompletedState ? new Date().toISOString() : undefined;
    
    // Optimistic update - immediately update UI
    dispatch(updateItemCompletion({
      checklistId: checklist.checklist_id,
      itemId,
      isCompleted: newCompletedState,
      completedAt
    }));
    
    setSavingItem(itemId);
    try {
      // Send to server
      await dispatch(updateChecklistItem({
        ...item,
        is_completed: newCompletedState,
        completed_at: completedAt
      })).unwrap();
    } catch (error) {
      // Revert optimistic update on error
      dispatch(updateItemCompletion({
        checklistId: checklist.checklist_id,
        itemId,
        isCompleted: currentCompleted,
        completedAt: item.completed_at
      }));
      Alert.alert('Error', 'Failed to update item status');
    } finally {
      setSavingItem(null);
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
    if (!id || addingNewItem) return;
    
    // Validate item text
    const itemError = validateItemText(newItemText);
    if (itemError) {
      setItemValidationError(itemError);
      Alert.alert('Validation Error', itemError);
      return;
    }
    
    // Check if we can add more items
    if (!canAddMoreItems(items.length)) {
      Alert.alert('Limit Reached', VALIDATION_MESSAGES.MAX_ITEMS_REACHED);
      return;
    }
    
    setItemValidationError(null);
    setAddingNewItem(true);
    
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
    } finally {
      setAddingNewItem(false);
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
    if (!editingItemId || savingItem === editingItemId) return;
    
    // Validate item text
    const itemError = validateItemText(editingItemText);
    if (itemError) {
      setItemValidationError(itemError);
      Alert.alert('Validation Error', itemError);
      return;
    }
    
    const item = items.find(i => i.item_id === editingItemId);
    if (!item) return;
    
    setItemValidationError(null);
    const newText = editingItemText.trim();
    const originalText = item.text;
    
    // Optimistic update - immediately update UI
    dispatch(updateItemText({
      itemId: editingItemId,
      text: newText
    }));
    
    setEditingItemId(null);
    setEditingItemText('');
    
    setSavingItem(editingItemId);
    try {
      await dispatch(updateChecklistItem({
        ...item,
        text: newText
      })).unwrap();
    } catch (error) {
      // Revert optimistic update on error
      dispatch(updateItemText({
        itemId: editingItemId,
        text: originalText
      }));
      Alert.alert('Error', 'Failed to update item. Please try again.');
    } finally {
      setSavingItem(null);
    }
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemText('');
  };

  // Header editing functions
  const handleEditHeader = () => {
    if (!checklist) return;
    
    console.log('Starting edit mode with current checklist data:', {
      name: checklist.name,
      bucket_id: checklist.bucket_id,
      due_date: checklist.due_date,
      tags: checklist.tags
    });
    
    setEditingHeader(true);
    setEditingTitleText(checklist.name);
    setEditingBucketId(checklist.bucket_id || '');
    setEditingTargetDate(checklist.due_date ? new Date(checklist.due_date) : null);
    setEditingTags([...checklist.tags]);
    
    console.log('Edit mode initialized with:', {
      editingTitleText: checklist.name,
      editingBucketId: checklist.bucket_id || '',
      editingTargetDate: checklist.due_date ? new Date(checklist.due_date) : null,
      editingTags: [...checklist.tags]
    });
  };

  const handleSaveHeader = async () => {
    if (!checklist) return;
    
    // Validate title
    const titleError = validateChecklistTitle(editingTitleText);
    if (titleError) {
      setTitleValidationError(titleError);
      Alert.alert('Validation Error', titleError);
      return;
    }
    
    setTitleValidationError(null);
    
    const originalData = {
      name: checklist.name,
      bucket_id: checklist.bucket_id,
      due_date: checklist.due_date,
      tags: checklist.tags
    };
    
    const newData = {
      name: editingTitleText.trim(),
      bucket_id: editingBucketId || null,
      due_date: editingTargetDate?.toISOString() || null,
      tags: editingTags
    };
    
    console.log('Saving header with bucket data:', {
      originalBucketId: originalData.bucket_id,
      editingBucketId,
      newBucketId: newData.bucket_id,
      bucketIdForDispatch: newData.bucket_id || undefined
    });
    
    // Optimistic update
    dispatch(updateChecklistMetadata({
      checklistId: checklist.checklist_id,
      name: newData.name,
      bucket_id: newData.bucket_id,
      due_date: newData.due_date,
      tags: newData.tags
    }));
    
    setEditingHeader(false);
    setSavingHeader(true);
    
    try {
      await dispatch(updateChecklist({
        checklistId: checklist.checklist_id,
        name: newData.name,
        bucketId: newData.bucket_id,
        tags: newData.tags,
        dueDate: newData.due_date || undefined
      })).unwrap();
    } catch (error) {
      console.error('Error saving header:', error);
      // Revert optimistic update on error
      dispatch(updateChecklistMetadata({
        checklistId: checklist.checklist_id,
        name: originalData.name,
        bucket_id: originalData.bucket_id,
        due_date: originalData.due_date,
        tags: originalData.tags
      }));
      Alert.alert('Error', 'Failed to update checklist. Please try again.');
    } finally {
      setSavingHeader(false);
    }
  };

  const handleCancelEditHeader = () => {
    console.log('Canceling edit mode, reverting to original values');
    setEditingHeader(false);
    setEditingTitleText('');
    setEditingBucketId('');
    setEditingTargetDate(null);
    setEditingTags([]);
  };

  const toggleEditingTag = (tagName: string) => {
    setEditingTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getBucketName = (bucketId?: string) => {
    console.log('getBucketName called with bucketId:', bucketId);
    console.log('Available buckets:', buckets);
    
    if (!bucketId) {
      console.log('No bucketId provided, returning "No folder"');
      return 'No folder';
    }
    
    const bucket = buckets.find(b => b.bucket_id === bucketId);
    const bucketName = bucket?.name || 'Unknown folder';
    
    console.log('Found bucket:', bucket, 'returning name:', bucketName);
    return bucketName;
  };

  const getProgress = () => {
    if (items.length === 0) return 0;
    const completedItems = items.filter(item => item.is_completed).length;
    return (completedItems / items.length) * 100;
  };

  const handleShareAction = () => {
    setShowShareModal(true);
  };

  const handleDuplicateAction = () => {
    // TODO: Implement duplicate functionality
    Alert.alert('Feature Coming Soon', 'Duplicate functionality will be available soon');
  };

  const handleDeleteAction = () => {
    Alert.alert(
      'Delete Checklist',
      'Are you sure you want to delete this checklist? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!checklist) return;
            
            try {
              await dispatch(deleteChecklist(checklist.checklist_id)).unwrap();
              Alert.alert('Success', 'Checklist deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.back()
                }
              ]);
            } catch (error) {
              console.error('Error deleting checklist:', error);
              Alert.alert('Error', 'Failed to delete checklist. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    if (!checklist) return;
    
    setSharing(true);
    try {
      const result = await dispatch(shareChecklist({
        checklistId: checklist.checklist_id,
        categoryId: selectedCategoryId || undefined
      })).unwrap();
      
      Alert.alert(
        'Success!', 
        `Checklist "${result.name}" has been shared as a public template.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowShareModal(false);
              setSelectedCategoryId('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sharing checklist:', error);
      Alert.alert('Error', 'Failed to share checklist. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setEditingTargetDate(selectedDate);
    }
  };

  // Handle back navigation with unsaved changes check
  const handleBackPress = () => {
    if (editingHeader) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. What would you like to do?',
        [
          {
            text: 'Save & Exit',
            onPress: async () => {
              await handleSaveHeader();
              router.back();
            },
          },
          {
            text: 'Discard Changes',
            style: 'destructive',
            onPress: () => {
              handleCancelEditHeader();
              router.back();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Handle back navigation during editing
  useEffect(() => {
    // This effect is just for cleanup, no auto-save functionality
    return () => {
      // Remove auto-save since we now have explicit save/cancel buttons
      // If the user wants to save, they should click the save button
    };
  }, []);

  if (loading && !checklist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading checklist...</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              if (id && user) {
                dispatch(fetchChecklistWithItems(id));
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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
        {/* Loading Overlay */}
        {loading && checklist && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingIndicator}>
              <LoadingSpinner />
              <Text style={styles.overlayText}>Loading...</Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleShareAction}
            style={styles.actionButton}
          >
            <Share2 size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDuplicateAction}
            style={styles.actionButton}
          >
            <Copy size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDeleteAction}
            style={[styles.actionButton, styles.deleteActionButton]}
          >
            <Trash2 size={20} color="#DC2626" />
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
          {/* Title Row */}
          <View style={styles.titleRow}>
            {editingHeader ? (
              <View style={styles.titleEditContainer}>
                <TextInput
                  ref={editTitleInputRef}
                  style={[
                    styles.titleInput,
                    titleValidationError && styles.inputError
                  ]}
                  value={editingTitleText}
                  onChangeText={(text) => {
                    setEditingTitleText(text);
                    if (titleValidationError) {
                      setTitleValidationError(null);
                    }
                  }}
                  placeholder="Enter title..."
                  returnKeyType="done"
                  multiline={false}
                  autoFocus={true}
                  maxLength={VALIDATION_LIMITS.CHECKLIST_TITLE_MAX_LENGTH}
                />
                <View style={styles.inputMeta}>
                  <Text style={[
                    styles.characterCount,
                    shouldHighlightCharacterCount(
                      editingTitleText.length, 
                      VALIDATION_LIMITS.CHECKLIST_TITLE_MAX_LENGTH
                    ) && styles.characterCountHighlight
                  ]}>
                    {getCharacterCountText(
                      editingTitleText.length, 
                      VALIDATION_LIMITS.CHECKLIST_TITLE_MAX_LENGTH
                    )}
                  </Text>
                </View>
                {titleValidationError && (
                  <Text style={styles.validationError}>{titleValidationError}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.title}>{checklist.name}</Text>
            )}
            
            <View style={styles.headerActionButtons}>
              {editingHeader ? (
                <>
                  <TouchableOpacity 
                    onPress={handleSaveHeader}
                    style={[styles.headerActionButton, styles.headerSaveButton]}
                    disabled={savingHeader}
                  >
                    {savingHeader ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <Save size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleCancelEditHeader}
                    style={[styles.headerActionButton, styles.cancelActionButton]}
                  >
                    <X size={18} color="#6B7280" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  onPress={handleEditHeader}
                  style={[styles.headerActionButton, styles.editActionButton]}
                >
                  <Edit3 size={18} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {checklist.description && (
            <Text style={styles.description}>{checklist.description}</Text>
          )}

          {/* Folder and Date Row */}
          <View style={styles.metadataRow}>
            {/* Folder - Left side */}
            <View style={styles.leftField}>
              {editingHeader ? (
                <TouchableOpacity 
                  style={styles.editableField}
                  onPress={() => setShowBucketModal(true)}
                >
                  <FolderOpen size={16} color="#6B7280" />
                  <Text style={styles.editableFieldText}>
                    {getBucketName(editingBucketId)}
                  </Text>
                </TouchableOpacity>
              ) : (
                bucket && (
                  <View style={styles.fieldContainer}>
                    <FolderOpen size={16} color="#6B7280" />
                    <Text style={styles.fieldText}>{bucket.name}</Text>
                  </View>
                )
              )}
            </View>
            
            {/* Date - Right side (always shown if exists) */}
            <View style={styles.rightField}>
              {editingHeader ? (
                <TouchableOpacity 
                  style={styles.editableField}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.editableFieldText}>
                    {editingTargetDate ? formatDate(editingTargetDate.toISOString()) : 'Set date'}
                  </Text>
                </TouchableOpacity>
              ) : (
                checklist.due_date && (
                  <View style={styles.fieldContainer}>
                    <Calendar size={16} color="#6B7280" />
                    <Text style={styles.fieldText}>
                      {formatDate(checklist.due_date)}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Tags Row */}
          {(editingHeader || (checklist.tags && checklist.tags.length > 0)) && (
            <View style={styles.tagsSection}>
              {editingHeader ? (
                <TouchableOpacity 
                  style={styles.editableTagsField}
                  onPress={() => setShowTagModal(true)}
                >
                  <Tag size={16} color="#6B7280" />
                  <View style={styles.tagsContainer}>
                    {editingTags.length > 0 ? (
                      <View style={styles.tagsFlow}>
                        {editingTags.map((tag, index) => (
                          <View key={index} style={styles.tagChip}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.editableFieldText}>Add tags</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.tagsDisplayContainer}>
                  <Tag size={16} color="#6B7280" />
                  <View style={styles.tagsFlow}>
                    {checklist.tags?.map((tag, index) => (
                      <View key={index} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
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
        </View>

        {/* Items List */}
        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>Tasks</Text>
            <TouchableOpacity 
              onPress={handleAddNewItem}
              style={styles.addButton}
              disabled={isAddingItem || addingNewItem}
            >
              <Plus size={20} color={(isAddingItem || addingNewItem) ? "#9CA3AF" : "#2563EB"} />
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
              {[...items]
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
                          style={[
                            styles.newItemInput,
                            itemValidationError && styles.inputError
                          ]}
                          value={editingItemText}
                          onChangeText={(text) => {
                            setEditingItemText(text);
                            if (itemValidationError) {
                              setItemValidationError(null);
                            }
                          }}
                          onSubmitEditing={handleSaveEditItem}
                          onBlur={handleCancelEditItem}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          multiline={false}
                          maxLength={VALIDATION_LIMITS.ITEM_TEXT_MAX_LENGTH}
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
                      isLoading={savingItem === item.item_id}
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
                    <View style={styles.newItemInputContainer}>
                      <TextInput
                        ref={newItemInputRef}
                        style={[
                          styles.newItemInput,
                          itemValidationError && styles.inputError
                        ]}
                        placeholder="Enter task..."
                        value={newItemText}
                        onChangeText={(text) => {
                          setNewItemText(text);
                          if (itemValidationError) {
                            setItemValidationError(null);
                          }
                        }}
                        onSubmitEditing={handleSaveNewItem}
                        onBlur={handleCancelNewItem}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        multiline={false}
                        maxLength={VALIDATION_LIMITS.ITEM_TEXT_MAX_LENGTH}
                      />
                      <View style={styles.inputMeta}>
                        <Text style={styles.itemLimit}>
                          {items.length}/{VALIDATION_LIMITS.MAX_ITEMS_PER_CHECKLIST} items
                        </Text>
                        <Text style={[
                          styles.characterCount,
                          shouldHighlightCharacterCount(
                            newItemText.length, 
                            VALIDATION_LIMITS.ITEM_TEXT_MAX_LENGTH
                          ) && styles.characterCountHighlight
                        ]}>
                          {getCharacterCountText(
                            newItemText.length, 
                            VALIDATION_LIMITS.ITEM_TEXT_MAX_LENGTH
                          )}
                        </Text>
                      </View>
                      {itemValidationError && (
                        <Text style={styles.validationError}>{itemValidationError}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      
      {/* Reusable Modals */}
      <FolderSelectionModal
        visible={showBucketModal}
        selectedFolderId={editingBucketId}
        onSelect={(folderId) => setEditingBucketId(folderId)}
        onClose={() => setShowBucketModal(false)}
      />
      
      <TagSelectionModal
        visible={showTagModal}
        selectedTagNames={editingTags}
        onSelect={(tagNames) => setEditingTags(tagNames)}
        onClose={() => setShowTagModal(false)}
      />
      
      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Checklist</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowShareModal(false);
                setSelectedCategoryId('');
              }}
              style={styles.modalCloseButton}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.shareModalContent}>
            <Text style={styles.shareDescription}>
              Share this checklist as a public template. Other users will be able to use it to create their own checklists.
            </Text>
            
            <Text style={styles.shareLabel}>Select a category (optional):</Text>
            
            {/* Debug info */}
            <Text style={{fontSize: 12, color: '#666', marginBottom: 8}}>
              Categories found: {categories.length} | Loading: {categoriesLoading ? 'Yes' : 'No'}
            </Text>
            {categories.length === 0 && (
              <Text style={{fontSize: 12, color: '#ff6b6b', marginBottom: 8}}>
                ⚠️ No categories available. Check console for loading errors.
              </Text>
            )}
            {(() => {
              console.log('📂 Categories in share modal:', { 
                categoriesCount: categories.length, 
                categories: categories.map(c => ({ id: c.category_id, name: c.name })),
                loading: categoriesLoading 
              });
              return null;
            })()}
            
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategoryId === '' && styles.categoryOptionSelected
                ]}
                onPress={() => setSelectedCategoryId('')}
              >
                <Text style={[
                  styles.categoryOptionText,
                  selectedCategoryId === '' && styles.categoryOptionTextSelected
                ]}>
                  No category
                </Text>
                {selectedCategoryId === '' && (
                  <Check size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
              
              {categories.map(category => (
                <TouchableOpacity
                  key={category.category_id}
                  style={[
                    styles.categoryOption,
                    selectedCategoryId === category.category_id && styles.categoryOptionSelected
                  ]}
                  onPress={() => setSelectedCategoryId(category.category_id)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategoryId === category.category_id && styles.categoryOptionTextSelected
                  ]}>
                    {category.name}
                  </Text>
                  {selectedCategoryId === category.category_id && (
                    <Check size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.shareActions}>
              <TouchableOpacity
                style={styles.shareCancel}
                onPress={() => {
                  setShowShareModal(false);
                  setSelectedCategoryId('');
                }}
              >
                <Text style={styles.shareCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Text style={styles.shareButtonText}>Share as Template</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Due Date</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setEditingTargetDate(null);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>No due date</Text>
                {!editingTargetDate && (
                  <Check size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
              
              <DateTimePicker
                value={editingTargetDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
  deleteActionButton: {
    // Additional styling for delete button if needed
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
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
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
    color: '#DC2626',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  overlayText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
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
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Header edit styles
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
  },
  editableMetadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  modalOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  datePickerContainer: {
    padding: 16,
  },
  datePicker: {
    backgroundColor: '#FFFFFF',
  },
  // New header edit styles
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  headerSaveButton: {
    backgroundColor: '#2563EB',
  },
  cancelActionButton: {
    backgroundColor: '#F3F4F6',
  },
  editActionButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  leftField: {
    flex: 1,
  },
  rightField: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editableField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flex: 1,
  },
  editableFieldText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fieldText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagsSection: {
    marginBottom: 16,
  },
  editableTagsField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagsContainer: {
    flex: 1,
  },
  tagsFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  tagsDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  // Share modal styles
  shareModalContent: {
    flex: 1,
    padding: 16,
  },
  shareDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  shareLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  categoryList: {
    maxHeight: 300,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  categoryOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  categorySelectButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 24,
  },
  categorySelectText: {
    fontSize: 16,
    color: '#111827',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareCancel: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  // Validation styles
  titleEditContainer: {
    flex: 1,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  characterCountHighlight: {
    color: '#EF4444',
    fontWeight: '600',
  },
  validationError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  newItemInputContainer: {
    flex: 1,
  },
  itemLimit: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 12,
  },
});
