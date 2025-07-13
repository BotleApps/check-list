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
import { fetchChecklistWithItems, updateChecklistItem, createChecklistItem, updateChecklist, clearCurrentData, updateItemCompletion, updateItemText, updateChecklistTitle, updateChecklistMetadata, deleteChecklist, shareChecklist, createChecklistWithItems, deleteChecklistItem } from '../../store/slices/checklistsSlice';
import { fetchBuckets, createBucket } from '../../store/slices/bucketsSlice';
import { fetchTags, createTag } from '../../store/slices/tagsSlice';
import { fetchCategories } from '../../store/slices/categoriesSlice';
// Task groups imports
import { fetchTaskGroups, fetchGroupedTasks, moveTaskToGroup, createTaskGroup, updateTaskGroup, deleteTaskGroup } from '../../store/slices/taskGroupsSlice';
import { TaskGroup } from '../../types/database';
import { DatePicker } from '../../components/DatePicker';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { FolderSelectionModal } from '../../components/FolderSelectionModal';
import { TagSelectionModal } from '../../components/TagSelectionModal';
import { Toast } from '../../components/Toast';
import { ConfirmationModal } from '../../components/ConfirmationModal';
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
  X,
  // Task group icons
  // Create page style icons
  Circle,
  SquareCheck
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
  const [saveInProgress, setSaveInProgress] = useState(false);
  
  // Edit mode grouped items (similar to new checklist)
  const [editingGroupedItems, setEditingGroupedItems] = useState<{
    id: string;
    name: string;
    colorCode: string;
    items: string[];
    itemStates: boolean[];
    itemIds?: string[]; // Track original item IDs for deletion
    isNewGroup?: boolean;
  }[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [originalItemMapping, setOriginalItemMapping] = useState<Map<string, string>>(new Map()); // text -> itemId mapping
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showDeleteGroupConfirmation, setShowDeleteGroupConfirmation] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  
  // Group name character limit
  const MAX_GROUP_NAME_LENGTH = 50;
  
  // Share functionality states
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [sharing, setSharing] = useState(false);
  
  // Task groups states
  const [showTaskGroupManager, setShowTaskGroupManager] = useState(false);
  const [selectedGroupForNewTask, setSelectedGroupForNewTask] = useState<string | undefined>(undefined);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Duplicate confirmation state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  
  // Unsaved changes modal state
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // Date picker states
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);
  
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
  const { groups: taskGroups, groupedTasks, loading: taskGroupsLoading } = useSelector((state: RootState) => state.taskGroups);

  const checklist = currentChecklist;
  const items = currentItems;
  const bucket = buckets.find(b => b.bucket_id === checklist?.bucket_id);

  useEffect(() => {
    if (id && user) {
      dispatch(fetchChecklistWithItems(id));
    }
  }, [id, user, dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
      dispatch(fetchCategories());
    }
  }, [user, dispatch]);

  // Fetch task groups when checklist is loaded
  useEffect(() => {
    if (id && checklist) {
      dispatch(fetchTaskGroups(id));
      dispatch(fetchGroupedTasks(id));
    }
  }, [id, checklist, dispatch]);

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
    
    // Always refresh grouped tasks for instant UI feedback since we're always in grouped view
    if (id) {
      dispatch(fetchGroupedTasks(id));
    }
    
    setSavingItem(itemId);
    try {
      // Send to server
      await dispatch(updateChecklistItem({
        ...item,
        is_completed: newCompletedState,
        completed_at: completedAt
      })).unwrap();
      
      // Refresh grouped tasks again after server confirms to ensure data consistency
      if (id) {
        dispatch(fetchGroupedTasks(id));
      }
    } catch (error) {
      // Revert optimistic update on error
      dispatch(updateItemCompletion({
        checklistId: checklist.checklist_id,
        itemId,
        isCompleted: currentCompleted,
        completedAt: item.completed_at
      }));
      
      // Also refresh grouped tasks on error to revert UI
      if (id) {
        dispatch(fetchGroupedTasks(id));
      }
      
      showToastMessage('Failed to update item status', 'error');
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
      showToastMessage(itemError, 'error');
      return;
    }
    
    // Check if we can add more items
    if (!canAddMoreItems(items.length)) {
      showToastMessage(VALIDATION_MESSAGES.MAX_ITEMS_REACHED, 'error');
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
      showToastMessage('Failed to add item. Please try again.', 'error');
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

  // Task group handlers
  const handleMoveTaskToGroup = async (taskId: string, groupId?: string) => {
    if (!id) return;
    try {
      await dispatch(moveTaskToGroup({ taskId, groupId, checklistId: id }));
      // Refresh grouped tasks after moving
      dispatch(fetchGroupedTasks(id));
    } catch (error) {
      showToastMessage('Failed to move task to group', 'error');
    }
  };

  const handleSaveEditItem = async () => {
    if (!editingItemId || savingItem === editingItemId) return;
    
    // Validate item text
    const itemError = validateItemText(editingItemText);
    if (itemError) {
      setItemValidationError(itemError);
      showToastMessage(itemError, 'error');
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
      showToastMessage('Failed to update item. Please try again.', 'error');
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
    
    setEditingHeader(true);
    setEditingTitleText(checklist.name);
    setEditingBucketId(checklist.bucket_id || '');
    setEditingTargetDate(checklist.due_date ? new Date(checklist.due_date) : null);
    setEditingTags([...checklist.tags]);
    
    // Initialize editable groups when entering edit mode
    initializeEditableGroups();
  };

  const handleSaveHeader = async () => {
    if (!checklist) return;
    
    // Validate title
    const titleError = validateChecklistTitle(editingTitleText);
    if (titleError) {
      setTitleValidationError(titleError);
      showToastMessage(titleError, 'error');
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
    
    // Set loading states
    setSavingHeader(true);
    setSaveInProgress(true);
    
    // Optimistic update
    dispatch(updateChecklistMetadata({
      checklistId: checklist.checklist_id,
      name: newData.name,
      bucket_id: newData.bucket_id,
      due_date: newData.due_date,
      tags: newData.tags
    }));
    
    try {
      // Save header metadata changes
      await dispatch(updateChecklist({
        checklistId: checklist.checklist_id,
        name: newData.name,
        bucketId: newData.bucket_id,
        tags: newData.tags,
        dueDate: newData.due_date || undefined
      })).unwrap();

      // Save group and item changes if in edit mode
      if (editingGroupedItems.length > 0) {
        await saveEditModeChanges();
      }
      
      setEditingHeader(false);
      showToastMessage('Checklist updated successfully!', 'success');
      
      // Refresh the checklist and grouped tasks
      dispatch(fetchChecklistWithItems(checklist.checklist_id));
      if (id) {
        dispatch(fetchGroupedTasks(id));
      }
    } catch (error) {
      // Revert optimistic update on error
      dispatch(updateChecklistMetadata({
        checklistId: checklist.checklist_id,
        name: originalData.name,
        bucket_id: originalData.bucket_id,
        due_date: originalData.due_date,
        tags: originalData.tags
      }));
      showToastMessage('Failed to update checklist. Please try again.', 'error');
    } finally {
      setSavingHeader(false);
      setSaveInProgress(false);
    }
  };

  const handleCancelEditHeader = () => {
    setEditingHeader(false);
    setEditingTitleText('');
    setEditingBucketId('');
    setEditingTargetDate(null);
    setEditingTags([]);
    setEditingGroupedItems([]);
    setDeletedItemIds([]);
    setOriginalItemMapping(new Map());
  };

  const saveEditModeChanges = async () => {
    if (!checklist || !id || !user) return;
    
    setSaveInProgress(true);
    showToastMessage('Saving changes...', 'success');
    
    try {
      // Get original data to compare against
      const currentGroupedTasks = groupedTasks[id] || [];
      const originalGroups = new Map();
      const originalItems = new Map();
      
      // Build maps of original data for comparison
      currentGroupedTasks.forEach(groupData => {
        const { group, tasks } = groupData;
        if (group) {
          originalGroups.set(group.group_id, group);
          tasks.forEach(task => {
            originalItems.set(task.item_id, { ...task, groupId: group.group_id });
          });
        } else {
          // Ungrouped tasks
          tasks.forEach(task => {
            originalItems.set(task.item_id, { ...task, groupId: null });
          });
        }
      });
      
      // Track changes with proper typing
      const groupChanges: {
        created: Array<{
          tempId: string;
          name: string;
          colorCode: string;
          items: string[];
        }>;
        updated: Array<{
          groupId: string;
          updates: {
            name: string;
            color_code: string;
          };
        }>;
        deleted: string[];
      } = {
        created: [],
        updated: [],
        deleted: []
      };
      
      const itemChanges: {
        created: Array<{
          text: string;
          completed: boolean;
          groupId: string | null;
          tempGroupId: string;
          order: number;
        }>;
        updated: Array<{
          itemId: string;
          updates: {
            text: string;
            is_completed: boolean;
          };
        }>;
        moved: Array<{
          itemId: string;
          fromGroupId: string | null;
          toGroupId: string | null;
          tempGroupId: string;
        }>;
        deleted: string[];
      } = {
        created: [],
        updated: [],
        moved: [],
        deleted: []
      };
      
      // Step 1: Analyze group changes
      const processedGroupIds = new Set();
      
      for (const editedGroup of editingGroupedItems) {
        if (editedGroup.id.startsWith('new-group-') || editedGroup.isNewGroup) {
          // New group to create
          groupChanges.created.push({
            tempId: editedGroup.id,
            name: editedGroup.name,
            colorCode: editedGroup.colorCode,
            items: editedGroup.items.filter(text => text.trim().length > 0)
          });
        } else if (editedGroup.id !== 'ungrouped' && editedGroup.id !== 'default') {
          // Existing group - check for changes
          const originalGroup = originalGroups.get(editedGroup.id);
          if (originalGroup) {
            processedGroupIds.add(editedGroup.id);
            
            if (originalGroup.name !== editedGroup.name || 
                originalGroup.color_code !== editedGroup.colorCode) {
              groupChanges.updated.push({
                groupId: editedGroup.id,
                updates: {
                  name: editedGroup.name,
                  color_code: editedGroup.colorCode
                }
              });
            }
          }
        }
      }
      
      // Find deleted groups
      originalGroups.forEach((group, groupId) => {
        if (!processedGroupIds.has(groupId)) {
          groupChanges.deleted.push(groupId);
        }
      });
      
      // Step 2: Analyze item changes
      const processedItemIds = new Set();
      
      for (const editedGroup of editingGroupedItems) {
        const targetGroupId = editedGroup.id.startsWith('new-group-') || editedGroup.isNewGroup 
          ? null // Will be set after group creation
          : (editedGroup.id === 'ungrouped' || editedGroup.id === 'default' ? null : editedGroup.id);
        
        const validItems = editedGroup.items
          .map((text, index) => ({
            text: text.trim(),
            completed: editedGroup.itemStates[index],
            order: index
          }))
          .filter(item => item.text.length > 0);
        
        for (const editedItem of validItems) {
          // Try to find matching original item
          let matchedOriginalItem = null;
          
          // First try exact text match
          for (const [itemId, originalItem] of originalItems.entries()) {
            if (!processedItemIds.has(itemId) && originalItem.text === editedItem.text) {
              matchedOriginalItem = { itemId, ...originalItem };
              processedItemIds.add(itemId);
              break;
            }
          }
          
          // If no exact match, try partial match (for edited items)
          if (!matchedOriginalItem) {
            for (const [itemId, originalItem] of originalItems.entries()) {
              if (!processedItemIds.has(itemId)) {
                const similarity = calculateTextSimilarity(originalItem.text, editedItem.text);
                if (similarity > 0.7) { // 70% similarity threshold
                  matchedOriginalItem = { itemId, ...originalItem };
                  processedItemIds.add(itemId);
                  break;
                }
              }
            }
          }
          
          if (matchedOriginalItem) {
            // Existing item - check for changes
            const hasTextChanged = matchedOriginalItem.text !== editedItem.text;
            const hasCompletionChanged = matchedOriginalItem.is_completed !== editedItem.completed;
            const hasGroupChanged = matchedOriginalItem.groupId !== targetGroupId;
            
            if (hasTextChanged || hasCompletionChanged) {
              itemChanges.updated.push({
                itemId: matchedOriginalItem.itemId,
                updates: {
                  text: editedItem.text,
                  is_completed: editedItem.completed
                }
              });
            }
            
            if (hasGroupChanged) {
              itemChanges.moved.push({
                itemId: matchedOriginalItem.itemId,
                fromGroupId: matchedOriginalItem.groupId,
                toGroupId: targetGroupId,
                tempGroupId: editedGroup.id // For new groups
              });
            }
          } else {
            // New item to create
            itemChanges.created.push({
              text: editedItem.text,
              completed: editedItem.completed,
              groupId: targetGroupId,
              tempGroupId: editedGroup.id, // For new groups
              order: editedItem.order
            });
          }
        }
      }
      
      // Find deleted items
      originalItems.forEach((originalItem, itemId) => {
        if (!processedItemIds.has(itemId)) {
          itemChanges.deleted.push(itemId);
        }
      });
      
      // Step 3: Apply changes in order with rollback capability
      const createdGroupMapping = new Map(); // tempId -> realGroupId
      const rollbackActions: Array<() => Promise<void>> = [];
      
      // Create new groups first
      for (const groupToCreate of groupChanges.created) {
        try {
          const newGroup = await dispatch(createTaskGroup({
            checklistId: id,
            name: groupToCreate.name,
            description: '',
            colorCode: groupToCreate.colorCode
          })).unwrap();
          createdGroupMapping.set(groupToCreate.tempId, newGroup.group_id);
          rollbackActions.push(async () => {
            await dispatch(deleteTaskGroup(newGroup.group_id)).unwrap();
          });
        } catch (error) {
          console.error('Failed to create group:', groupToCreate.name, error);
          throw new Error(`Failed to create group "${groupToCreate.name}"`);
        }
      }
      
      // Update existing groups
      for (const groupToUpdate of groupChanges.updated) {
        try {
          await dispatch(updateTaskGroup({
            groupId: groupToUpdate.groupId,
            updates: groupToUpdate.updates
          })).unwrap();
        } catch (error) {
          console.error('Failed to update group:', groupToUpdate.groupId, error);
          throw new Error('Failed to update group');
        }
      }
      
      // Create new items
      const createdItems: string[] = [];
      for (const itemToCreate of itemChanges.created) {
        try {
          const maxOrder = items.length > 0 ? Math.max(...items.map(item => item.order_index)) : 0;
          const newItem = await dispatch(createChecklistItem({
            checklist_id: id,
            text: itemToCreate.text,
            description: '',
            is_completed: itemToCreate.completed,
            order_index: maxOrder + itemToCreate.order + 1,
            is_required: false,
            tags: [],
          })).unwrap();
          
          createdItems.push(newItem.item_id);
          
          // Move to group if needed
          let targetGroupId = itemToCreate.groupId;
          if (createdGroupMapping.has(itemToCreate.tempGroupId)) {
            targetGroupId = createdGroupMapping.get(itemToCreate.tempGroupId);
          }
          
          if (targetGroupId) {
            await dispatch(moveTaskToGroup({
              taskId: newItem.item_id,
              groupId: targetGroupId!,
              checklistId: id
            })).unwrap();
          }
        } catch (error) {
          console.error('Failed to create item:', itemToCreate.text, error);
          throw new Error(`Failed to create item "${itemToCreate.text.substring(0, 30)}..."`);
        }
      }
      
      // Update existing items
      for (const itemToUpdate of itemChanges.updated) {
        try {
          const originalItem = items.find(item => item.item_id === itemToUpdate.itemId);
          if (originalItem) {
            await dispatch(updateChecklistItem({
              ...originalItem,
              ...itemToUpdate.updates
            })).unwrap();
          }
        } catch (error) {
          console.error('Failed to update item:', itemToUpdate.itemId, error);
          throw new Error('Failed to update item');
        }
      }
      
      // Move items between groups
      for (const itemToMove of itemChanges.moved) {
        try {
          let targetGroupId = itemToMove.toGroupId;
          if (createdGroupMapping.has(itemToMove.tempGroupId)) {
            targetGroupId = createdGroupMapping.get(itemToMove.tempGroupId);
          }
          
          await dispatch(moveTaskToGroup({
            taskId: itemToMove.itemId,
            groupId: targetGroupId || undefined,
            checklistId: id
          })).unwrap();
        } catch (error) {
          console.error('Failed to move item:', itemToMove.itemId, error);
          throw new Error('Failed to move item');
        }
      }
      
      // Collect all deleted items - both explicitly deleted and orphaned
      const allDeletedItems = new Set([...deletedItemIds]);
      
      // Add items that were found in original but not in edited groups (orphaned items)
      originalItems.forEach((originalItem, itemId) => {
        if (!processedItemIds.has(itemId)) {
          allDeletedItems.add(itemId);
        }
      });
      
      // Delete items (both explicitly deleted and orphaned)
      for (const itemIdToDelete of allDeletedItems) {
        try {
          await dispatch(deleteChecklistItem(itemIdToDelete)).unwrap();
        } catch (error) {
          console.error('Failed to delete item:', itemIdToDelete, error);
          // Continue with other deletions even if one fails
        }
      }
      
      // Delete groups (this will also handle moving their items to ungrouped)
      for (const groupIdToDelete of groupChanges.deleted) {
        try {
          await dispatch(deleteTaskGroup(groupIdToDelete)).unwrap();
        } catch (error) {
          console.error('Failed to delete group:', groupIdToDelete, error);
          // Don't throw here as it's not critical if delete fails
        }
      }
      
      const changesSummary = [];
      if (groupChanges.created.length > 0) changesSummary.push(`${groupChanges.created.length} groups created`);
      if (groupChanges.updated.length > 0) changesSummary.push(`${groupChanges.updated.length} groups updated`);
      if (groupChanges.deleted.length > 0) changesSummary.push(`${groupChanges.deleted.length} groups deleted`);
      if (itemChanges.created.length > 0) changesSummary.push(`${itemChanges.created.length} items created`);
      if (itemChanges.updated.length > 0) changesSummary.push(`${itemChanges.updated.length} items updated`);
      if (itemChanges.moved.length > 0) changesSummary.push(`${itemChanges.moved.length} items moved`);
      if (allDeletedItems.size > 0) changesSummary.push(`${allDeletedItems.size} items deleted`);
      
      if (changesSummary.length > 0) {
        showToastMessage(`Changes saved: ${changesSummary.join(', ')}`, 'success');
      } else {
        showToastMessage('No changes to save', 'success');
      }
      
    } catch (error) {
      console.error('Error saving edit mode changes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes. Please try again.';
      showToastMessage(errorMessage, 'error');
      throw error;
    } finally {
      setSaveInProgress(false);
    }
  };

  // Helper function to calculate text similarity
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    if (text1 === text2) return 1;
    if (text1.length === 0 || text2.length === 0) return 0;
    
    // Simple similarity based on common substrings
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1;
    
    // Calculate edit distance (simplified)
    let matches = 0;
    const minLength = Math.min(text1.length, text2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (text1[i].toLowerCase() === text2[i].toLowerCase()) {
        matches++;
      }
    }
    
    return matches / longer.length;
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
    if (!bucketId) {
      return 'No folder';
    }
    
    const bucket = buckets.find(b => b.bucket_id === bucketId);
    return bucket?.name || 'Unknown folder';
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
    setShowDuplicateModal(true);
  };

  const confirmDuplicate = async () => {
    if (!checklist || !user || duplicating) return;
    
    setDuplicating(true);
    try {
      // Create a duplicate of the current checklist
      const duplicateData = {
        name: `${checklist.name} (Copy)`,
        user_id: user.user_id,
        bucket_id: checklist.bucket_id,
        due_date: checklist.due_date,
        tags: [...checklist.tags],
        items: items.map(item => ({
          text: item.text,
          completed: false, // Reset completion status for duplicates
        })),
      };

      const result = await dispatch(createChecklistWithItems(duplicateData)).unwrap();
      showToastMessage('Checklist duplicated successfully!');
      
      // Navigate to the newly created checklist after a short delay
      setTimeout(() => {
        router.push(`/checklist/${result.checklist.checklist_id}`);
      }, 1000);
    } catch (error) {
      showToastMessage('Failed to duplicate checklist. Please try again.', 'error');
    } finally {
      setDuplicating(false);
      setShowDuplicateModal(false);
    }
  };

  const handleDeleteAction = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!checklist || deleting) return;
    
    setDeleting(true);
    try {
      await dispatch(deleteChecklist(checklist.checklist_id)).unwrap();
      showToastMessage('Checklist deleted successfully!');
      // Navigate to home after a short delay to show the success message
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch (error) {
      showToastMessage('Failed to delete checklist. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleShare = async () => {
    if (!checklist) return;
    
    setSharing(true);
    try {
      const result = await dispatch(shareChecklist({
        checklistId: checklist.checklist_id,
        categoryId: selectedCategoryId || undefined
      })).unwrap();
      
      showToastMessage(`Checklist "${result.name}" has been shared as a public template!`);
      setShowShareModal(false);
      setSelectedCategoryId('');
    } catch (error) {
      showToastMessage('Failed to share checklist. Please try again.', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempSelectedDate(selectedDate);
    }
  };

  const handleDatePickerDone = () => {
    // Use the temporary selected date, or default to today if none was explicitly selected
    const dateToSet = tempSelectedDate || new Date();
    setEditingTargetDate(dateToSet);
    setShowDatePicker(false);
    setTempSelectedDate(null); // Reset temp date
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    setTempSelectedDate(null); // Reset temp date without saving
  };

  // Handle back navigation with unsaved changes check
  const handleBackPress = () => {
    if (editingHeader) {
      setShowUnsavedChangesModal(true);
    } else {
      router.replace('/');  // Navigate to home instead of going back to edit
    }
  };

  const handleSaveAndExit = async () => {
    setShowUnsavedChangesModal(false);
    await handleSaveHeader();
    router.replace('/');  // Navigate to home instead of going back
  };

  const handleDiscardAndExit = () => {
    setShowUnsavedChangesModal(false);
    handleCancelEditHeader();
    router.replace('/');  // Navigate to home instead of going back
  };

  // Task Groups Handlers
  const handleCreateGroup = async (name: string, description?: string, targetDate?: string, colorCode?: string) => {
    if (!id) return;
    
    try {
      await dispatch(createTaskGroup({
        checklistId: id,
        name,
        description,
        targetDate,
        colorCode
      })).unwrap();
      
      // Refresh grouped tasks
      dispatch(fetchGroupedTasks(id));
      showToastMessage('Group created successfully', 'success');
    } catch (error) {
      showToastMessage('Failed to create group', 'error');
    }
  };

  const handleUpdateGroup = async (groupId: string, updates: Partial<TaskGroup>) => {
    try {
      await dispatch(updateTaskGroup({ groupId, updates })).unwrap();
      
      // Refresh grouped tasks
      if (id) {
        dispatch(fetchGroupedTasks(id));
      }
      showToastMessage('Group updated successfully', 'success');
    } catch (error) {
      showToastMessage('Failed to update group', 'error');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await dispatch(deleteTaskGroup(groupId)).unwrap();
      
      // Refresh grouped tasks
      if (id) {
        dispatch(fetchGroupedTasks(id));
      }
      showToastMessage('Group deleted successfully', 'success');
    } catch (error) {
      showToastMessage('Failed to delete group', 'error');
    }
  };

  // Initialize editable groups from current grouped tasks
  const initializeEditableGroups = () => {
    if (!id) return;
    
    const currentGroupedTasks = groupedTasks[id] || [];
    const editableGroups: typeof editingGroupedItems = [];
    const itemMapping = new Map<string, string>(); // text -> itemId mapping
    
    // Clear deleted items when starting edit mode
    setDeletedItemIds([]);
    
    currentGroupedTasks.forEach(groupData => {
      const { group, tasks } = groupData;
      
      // Build item mapping for all tasks in this group
      tasks.forEach(task => {
        itemMapping.set(task.text, task.item_id);
      });
      
      if (group) {
        // Existing group
        editableGroups.push({
          id: group.group_id,
          name: group.name,
          colorCode: group.color_code || '#6B7280',
          items: [...tasks.map(task => task.text), ''], // Add empty item at end
          itemStates: [...tasks.map(task => task.is_completed), false], // Add state for empty item
          itemIds: [...tasks.map(task => task.item_id), ''], // Track original IDs
          isNewGroup: false
        });
      } else {
        // Ungrouped items
        if (tasks.length > 0) {
          editableGroups.push({
            id: 'ungrouped',
            name: 'Ungrouped',
            colorCode: '#6B7280',
            items: [...tasks.map(task => task.text), ''], // Add empty item at end
            itemStates: [...tasks.map(task => task.is_completed), false], // Add state for empty item
            itemIds: [...tasks.map(task => task.item_id), ''], // Track original IDs
            isNewGroup: false
          });
        }
      }
    });
    
    // If no groups exist but there are items, create an ungrouped section
    if (editableGroups.length === 0 && items.length > 0) {
      // Build mapping for ungrouped items
      items.forEach(item => {
        itemMapping.set(item.text, item.item_id);
      });
      
      editableGroups.push({
        id: 'ungrouped',
        name: 'Ungrouped',
        colorCode: '#6B7280',
        items: [...items.map(item => item.text), ''], // Add empty item at end
        itemStates: [...items.map(item => item.is_completed), false], // Add state for empty item
        itemIds: [...items.map(item => item.item_id), ''], // Track original IDs
        isNewGroup: false
      });
    }
    
    setEditingGroupedItems(editableGroups);
    setOriginalItemMapping(itemMapping);
  };

  // Group editing functions (similar to new checklist)
  const addTaskGroup = () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;
    
    if (trimmedName.length > MAX_GROUP_NAME_LENGTH) {
      showToastMessage(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or less`, 'error');
      return;
    }
    
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
    const colorIndex = editingGroupedItems.length % colors.length;
    
    const newGroup = {
      id: `new-group-${Date.now()}`,
      name: trimmedName,
      colorCode: colors[colorIndex],
      items: [''],
      itemStates: [false],
      itemIds: [''], // New group starts with empty item ID
      isNewGroup: true,
    };
    
    setEditingGroupedItems([...editingGroupedItems, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const removeTaskGroup = (groupIndex: number) => {
    if (editingGroupedItems.length <= 1) return; // Keep at least one group
    
    setGroupToDelete(groupIndex);
    setShowDeleteGroupConfirmation(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete === null) return;
    
    const updatedGroups = editingGroupedItems.filter((_, i) => i !== groupToDelete);
    setEditingGroupedItems(updatedGroups);
    
    setShowDeleteGroupConfirmation(false);
    setGroupToDelete(null);
  };

  const cancelDeleteGroup = () => {
    setShowDeleteGroupConfirmation(false);
    setGroupToDelete(null);
  };

  const startEditingGroup = (groupIndex: number) => {
    setEditingGroupIndex(groupIndex);
    setEditingGroupName(editingGroupedItems[groupIndex].name);
  };

  const confirmGroupEdit = () => {
    const trimmedName = editingGroupName.trim();
    if (editingGroupIndex === null || !trimmedName) return;
    
    if (trimmedName.length > MAX_GROUP_NAME_LENGTH) {
      showToastMessage(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or less`, 'error');
      return;
    }
    
    const updatedGroups = [...editingGroupedItems];
    updatedGroups[editingGroupIndex].name = trimmedName;
    setEditingGroupedItems(updatedGroups);
    
    setEditingGroupIndex(null);
    setEditingGroupName('');
  };

  const cancelGroupEdit = () => {
    setEditingGroupIndex(null);
    setEditingGroupName('');
  };

  const updateGroupItem = (groupIndex: number, itemIndex: number, value: string) => {
    const updatedGroups = [...editingGroupedItems];
    updatedGroups[groupIndex].items[itemIndex] = value;
    
    // If user is typing in the last item and it's not empty, add a new empty item
    const isLastItem = itemIndex === updatedGroups[groupIndex].items.length - 1;
    
    if (isLastItem && value.trim() !== '') {
      // Check if there's already an empty item at the end (after this one)
      const hasEmptyAtEnd = updatedGroups[groupIndex].items.length > itemIndex + 1 && 
                           updatedGroups[groupIndex].items[updatedGroups[groupIndex].items.length - 1] === '';
      
      if (!hasEmptyAtEnd) {
        updatedGroups[groupIndex].items.push('');
        updatedGroups[groupIndex].itemStates.push(false);
        if (updatedGroups[groupIndex].itemIds) {
          updatedGroups[groupIndex].itemIds!.push(''); // New item, no ID yet
        }
      }
    }
    
    setEditingGroupedItems(updatedGroups);
  };

  const toggleGroupItemState = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...editingGroupedItems];
    updatedGroups[groupIndex].itemStates[itemIndex] = !updatedGroups[groupIndex].itemStates[itemIndex];
    setEditingGroupedItems(updatedGroups);
  };

  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...editingGroupedItems];
    const group = updatedGroups[groupIndex];
    
    // Don't remove if this would leave no items (keep at least one empty item)
    if (group.items.length <= 1) {
      return;
    }
    
    // Track the removed item for deletion if it's not empty
    const removedItem = group.items[itemIndex];
    const removedItemId = group.itemIds ? group.itemIds[itemIndex] : null;
    
    if (removedItem && removedItem.trim() !== '') {
      let itemIdToDelete = null;
      
      // First try to use the stored item ID
      if (removedItemId && removedItemId !== '') {
        itemIdToDelete = removedItemId;
      } else {
        // Fallback to original mapping
        const mappedItemId = originalItemMapping.get(removedItem);
        if (mappedItemId) {
          itemIdToDelete = mappedItemId;
        } else {
          // Last resort: search through original grouped tasks
          const currentGroupedTasks = groupedTasks[id || ''] || [];
          for (const groupData of currentGroupedTasks) {
            const matchingTask = groupData.tasks.find(task => {
              if (task.text === removedItem) return true;
              const similarity = calculateTextSimilarity(task.text, removedItem);
              return similarity > 0.7;
            });
            
            if (matchingTask) {
              itemIdToDelete = matchingTask.item_id;
              break;
            }
          }
        }
      }
      
      // Add to deletion list if we found an ID
      if (itemIdToDelete && !deletedItemIds.includes(itemIdToDelete)) {
        setDeletedItemIds(prev => [...prev, itemIdToDelete]);
      }
    }
    
    // Remove the item from the editing group
    group.items.splice(itemIndex, 1);
    group.itemStates.splice(itemIndex, 1);
    if (group.itemIds) {
      group.itemIds.splice(itemIndex, 1);
    }
    
    // Ensure there's always an empty item at the end if the group is now empty or doesn't end with empty
    if (group.items.length === 0 || group.items[group.items.length - 1].trim() !== '') {
      group.items.push('');
      group.itemStates.push(false);
      if (group.itemIds) {
        group.itemIds.push('');
      }
    }
    
    setEditingGroupedItems(updatedGroups);
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
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
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
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
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
          {editingHeader ? (
            <>
              <TouchableOpacity 
                onPress={handleSaveHeader}
                style={[styles.actionButton, styles.saveActionButton]}
                disabled={savingHeader || saveInProgress}
              >
                {(savingHeader || saveInProgress) ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Save size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleCancelEditHeader}
                style={[styles.actionButton, styles.cancelHeaderActionButton]}
                disabled={savingHeader || saveInProgress}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                onPress={handleEditHeader}
                style={styles.actionButton}
              >
                <Edit3 size={18} color="#6B7280" />
              </TouchableOpacity>
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
            </>
          )}
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
                  onPress={() => {
                    // Initialize temp date with current editing date or today
                    setTempSelectedDate(editingTargetDate || new Date());
                    setShowDatePicker(true);
                  }}
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
          {editingHeader ? (
            /* Edit Mode - Show editable groups similar to new checklist */
            <>
              {/* Groups with Items */}
              {editingGroupedItems.map((group, groupIndex) => (
                <View 
                  key={group.id} 
                  style={[
                    styles.section,
                    styles.groupContainer,
                    { borderLeftColor: group.colorCode }
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.groupTitleContainer}>
                      {editingGroupIndex === groupIndex ? (
                        <>
                          <View style={styles.editGroupContainer}>
                            <View style={styles.editInputRow}>
                              <TextInput
                                style={styles.editGroupInput}
                                value={editingGroupName}
                                onChangeText={(text) => {
                                  if (text.length <= MAX_GROUP_NAME_LENGTH) {
                                    setEditingGroupName(text);
                                  }
                                }}
                                placeholderTextColor="#C7C7CC"
                                returnKeyType="done"
                                onSubmitEditing={confirmGroupEdit}
                                autoFocus
                                maxLength={MAX_GROUP_NAME_LENGTH}
                              />
                              <View style={styles.editButtonsContainer}>
                                <TouchableOpacity
                                  style={styles.confirmButton}
                                  onPress={confirmGroupEdit}
                                >
                                  <Check size={16} color="#22C55E" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.cancelGroupButton}
                                  onPress={cancelGroupEdit}
                                >
                                  <X size={16} color="#FF3B30" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.groupName}>{group.name}</Text>
                          <View style={styles.groupActionsContainer}>
                            <TouchableOpacity
                              style={styles.editGroupButton}
                              onPress={() => startEditingGroup(groupIndex)}
                            >
                              <Edit3 size={16} color="#007AFF" />
                            </TouchableOpacity>
                            {editingGroupedItems.length > 1 && (
                              <TouchableOpacity
                                style={styles.deleteGroupButton}
                                onPress={() => removeTaskGroup(groupIndex)}
                              >
                                <Trash2 size={16} color="#FF3B30" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.itemsList}>
                    {group.items.map((item, itemIndex) => (
                      <View key={`${group.id}-item-${itemIndex}`} style={styles.itemRow}>
                        <TouchableOpacity 
                          style={styles.checkboxContainer}
                          onPress={() => toggleGroupItemState(groupIndex, itemIndex)}
                          activeOpacity={0.7}
                        >
                          {group.itemStates[itemIndex] ? (
                            <SquareCheck size={20} color={group.colorCode} />
                          ) : (
                            <Circle size={20} color="#C7C7CC" />
                          )}
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.itemInput,
                            group.itemStates[itemIndex] && styles.itemInputCompleted
                          ]}
                          placeholder={itemIndex === 0 && groupIndex === 0 ? "Add your first item..." : "Add item..."}
                          value={item}
                          onChangeText={(value) => updateGroupItem(groupIndex, itemIndex, value)}
                          placeholderTextColor="#C7C7CC"
                          returnKeyType="next"
                          multiline={true}
                          textAlignVertical="top"
                          scrollEnabled={false}
                        />
                        {group.items.length > 1 && item.trim() !== '' && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeItemFromGroup(groupIndex, itemIndex)}
                          >
                            <X size={16} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              
              {/* Add New Group Button */}
              {!isAddingGroup ? (
                <TouchableOpacity 
                  style={styles.addGroupSection}
                  onPress={() => setIsAddingGroup(true)}
                >
                  <Plus size={20} color="#007AFF" />
                  <Text style={styles.addGroupSectionText}>Add Group</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.newGroupSection, { borderLeftColor: '#6B7280' }]}>
                  <View style={styles.newGroupHeader}>
                    <View style={styles.newGroupInputContainer}>
                      <View style={styles.newInputRow}>
                        <TextInput
                          style={styles.newGroupInput}
                          placeholder="Group name..."
                          value={newGroupName}
                          onChangeText={(text) => {
                            if (text.length <= MAX_GROUP_NAME_LENGTH) {
                              setNewGroupName(text);
                            }
                          }}
                          placeholderTextColor="#C7C7CC"
                          returnKeyType="done"
                          onSubmitEditing={addTaskGroup}
                          autoFocus
                          maxLength={MAX_GROUP_NAME_LENGTH}
                        />
                        <View style={styles.editButtonsContainer}>
                          <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={addTaskGroup}
                          >
                            <Check size={16} color="#22C55E" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelGroupButton}
                            onPress={() => {
                              setIsAddingGroup(false);
                              setNewGroupName('');
                            }}
                          >
                            <X size={16} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            /* View Mode - Show read-only grouped items */
            items.length === 0 && !isAddingItem ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No tasks yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button to add your first task
                </Text>
              </View>
            ) : (
            <>
              {checklist && groupedTasks[checklist.checklist_id] && groupedTasks[checklist.checklist_id].length > 0 ? (
                // Show actual groups as saved - each group displayed separately
                <>
                  {groupedTasks[checklist.checklist_id].map((groupData, groupIndex) => {
                    const { group, tasks } = groupData;
                    const groupId = group?.group_id || 'ungrouped';
                    const groupName = group?.name || 'Ungrouped Tasks';
                    const groupColor = group?.color_code || '#6B7280';
                    
                    return (
                      <View 
                        key={groupId}
                        style={[
                          styles.section,
                          styles.groupContainer,
                          { borderLeftColor: groupColor }
                        ]}
                      >
                        <View style={styles.sectionHeader}>
                          <View style={styles.groupTitleContainer}>
                            <Text style={styles.groupName}>{groupName}</Text>
                            <Text style={styles.groupStats}>
                              {tasks.filter(t => t.is_completed).length}/{tasks.length}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.itemsList}>
                          {tasks.map((item) => (
                            editingItemId === item.item_id ? (
                              // Editing mode for this item
                              <View key={item.item_id} style={styles.itemRow}>
                                <TouchableOpacity
                                  style={styles.checkboxContainer}
                                  onPress={() => handleItemToggle(item.item_id, item.is_completed)}
                                >
                                  {item.is_completed ? (
                                    <SquareCheck size={20} color={groupColor} />
                                  ) : (
                                    <Circle size={20} color="#C7C7CC" />
                                  )}
                                </TouchableOpacity>
                                <TextInput
                                  ref={editItemInputRef}
                                  style={[
                                    styles.itemInput,
                                    item.is_completed && styles.itemInputCompleted,
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
                            ) : (
                              // Normal display mode with create page styling
                              <View key={item.item_id} style={styles.itemRow}>
                                <TouchableOpacity 
                                  style={styles.checkboxContainer}
                                  onPress={() => handleItemToggle(item.item_id, item.is_completed)}
                                  activeOpacity={0.7}
                                >
                                  {item.is_completed ? (
                                    <SquareCheck size={20} color={groupColor} />
                                  ) : (
                                    <Circle size={20} color="#C7C7CC" />
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.itemTextContainer}
                                  onPress={() => handleItemPress(item)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[
                                    styles.itemText,
                                    item.is_completed && styles.itemTextCompleted
                                  ]}>
                                    {item.text}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : (
                // No groups exist - show items in simple list format (non-grouped)
                <>
                  {[...items]
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((item) => (
                      editingItemId === item.item_id ? (
                        // Editing mode for this item
                        <View key={item.item_id} style={styles.itemRow}>
                          <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => handleItemToggle(item.item_id, item.is_completed)}
                          >
                            {item.is_completed ? (
                              <SquareCheck size={20} color="#6B7280" />
                            ) : (
                              <Circle size={20} color="#C7C7CC" />
                            )}
                          </TouchableOpacity>
                          <TextInput
                            ref={editItemInputRef}
                            style={[
                              styles.itemInput,
                              item.is_completed && styles.itemInputCompleted,
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
                      ) : (
                        // Normal display mode - simple item styling without group container
                        <View key={item.item_id} style={styles.itemRow}>
                          <TouchableOpacity 
                            style={styles.checkboxContainer}
                            onPress={() => handleItemToggle(item.item_id, item.is_completed)}
                            activeOpacity={0.7}
                          >
                            {item.is_completed ? (
                              <SquareCheck size={20} color="#6B7280" />
                            ) : (
                              <Circle size={20} color="#C7C7CC" />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.itemTextContainer}
                            onPress={() => handleItemPress(item)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.itemText,
                              item.is_completed && styles.itemTextCompleted
                            ]}>
                              {item.text}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ))}
                </>
              )}
              
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
            )
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
      <DatePicker
        visible={showDatePicker}
        date={tempSelectedDate || editingTargetDate}
        minimumDate={new Date()}
        onDateChange={(date) => {
          setTempSelectedDate(date);
          setEditingTargetDate(date);
        }}
        onClose={() => {
          setShowDatePicker(false);
          if (editingTargetDate !== tempSelectedDate) {
            handleDatePickerDone();
          }
        }}
        title="Select Due Date"
      />
      
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
      
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Checklist"
        message="Are you sure you want to delete this checklist? This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      
      <ConfirmationModal
        visible={showDuplicateModal}
        title="Duplicate Checklist"
        message="Create a copy of this checklist? You'll be taken to the new checklist."
        confirmText={duplicating ? "Duplicating..." : "Duplicate"}
        cancelText="Cancel"
        confirmStyle="default"
        onConfirm={confirmDuplicate}
        onCancel={() => setShowDuplicateModal(false)}
      />
      
      <ConfirmationModal
        visible={showDeleteGroupConfirmation}
        title="Delete Group"
        message={`Are you sure you want to delete the "${groupToDelete !== null ? editingGroupedItems[groupToDelete]?.name : ''}" group? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={confirmDeleteGroup}
        onCancel={cancelDeleteGroup}
      />
      
      {/* Custom Unsaved Changes Modal */}
      <Modal
        visible={showUnsavedChangesModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <Pressable style={styles.overlay} onPress={() => setShowUnsavedChangesModal(false)}>
          <Pressable style={styles.unsavedModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.unsavedModalHeader}>
              <Text style={styles.unsavedModalTitle}>Unsaved Changes</Text>
              <TouchableOpacity onPress={() => setShowUnsavedChangesModal(false)} style={styles.closeButton}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.unsavedModalMessage}>
              You have unsaved changes. What would you like to do?
            </Text>
            
            <View style={styles.unsavedModalButtons}>
              <TouchableOpacity
                style={[styles.unsavedModalButton, styles.unsavedModalButtonPrimary]}
                onPress={handleSaveAndExit}
              >
                <Text style={styles.unsavedModalButtonTextPrimary}>Save & Exit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.unsavedModalButton, styles.unsavedModalButtonDestructive]}
                onPress={handleDiscardAndExit}
              >
                <Text style={styles.unsavedModalButtonTextDestructive}>Discard Changes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.unsavedModalButton, styles.unsavedModalButtonSecondary]}
                onPress={() => setShowUnsavedChangesModal(false)}
              >
                <Text style={styles.unsavedModalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  saveActionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
  },
  cancelHeaderActionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  activeActionButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  deleteActionButton: {
    // Additional styling for delete button if needed
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    includeFontPadding: false, // Better text positioning on Android
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
  // Title row style (simplified)
  titleRow: {
    marginBottom: 16,
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
    width: '100%',
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
  // Unsaved changes modal styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsavedModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  unsavedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  unsavedModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  unsavedModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  unsavedModalButtons: {
    gap: 12,
  },
  unsavedModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  unsavedModalButtonPrimary: {
    backgroundColor: '#2563EB',
  },
  unsavedModalButtonDestructive: {
    backgroundColor: '#DC2626',
  },
  unsavedModalButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  unsavedModalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  unsavedModalButtonTextDestructive: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  unsavedModalButtonTextSecondary: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  // Create page style for grouped view
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  groupContainer: {
    borderLeftWidth: 4,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    borderLeftColor: '#007AFF', // Will be overridden by inline style
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minHeight: 44, // Ensure consistent height for vertical centering
  },
  groupName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'left',
  },
  groupStats: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  itemsList: {
    paddingTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    paddingVertical: 4,
    minHeight: 36,
  },
  checkboxContainer: {
    marginTop: 4,
    marginRight: 12,
    padding: 4,
    borderRadius: 4,
  },
  itemInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    lineHeight: 22,
    paddingVertical: 4,
    minHeight: 22,
    maxHeight: 110,
  },
  itemInputCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  itemTextContainer: {
    flex: 1,
    paddingVertical: 4,
  },
  itemText: {
    fontSize: 17,
    color: '#000000',
    lineHeight: 22,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  // Missing styles
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Web date picker styles
  webDateInputContainer: {
    padding: 20,
    alignItems: 'center',
  },
  webDateTrigger: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  webDateTriggerText: {
    fontSize: 16,
    color: '#000000',
  },
  // Edit mode styles (copied from new checklist screen) - only new styles not already existing
  // Group editing styles
  editGroupContainer: {
    flex: 1,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editGroupInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'left',
    backgroundColor: 'transparent',
    borderWidth: 0,
    height: 44,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  confirmButton: {
    padding: 6,
    backgroundColor: '#E8F5E8',
    borderRadius: 4,
  },
  cancelGroupButton: {
    padding: 6,
    backgroundColor: '#FFE8E8',
    borderRadius: 4,
  },
  groupActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editGroupButton: {
    padding: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  deleteGroupButton: {
    padding: 6,
    backgroundColor: '#FFE8E8',
    borderRadius: 4,
  },
  // Add group styles
  addGroupSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
    marginHorizontal: 16,
  },
  addGroupSectionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  // New group section styles
  newGroupSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 12,
  },
  newGroupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  newGroupInputContainer: {
    flex: 1,
  },
  newInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newGroupInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'left',
    backgroundColor: 'transparent',
    borderWidth: 0,
    height: 44,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
});
