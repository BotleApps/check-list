import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { createChecklistWithItems } from '../../store/slices/checklistsSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { fetchTags } from '../../store/slices/tagsSlice';
// Task groups imports
import { fetchTaskGroups, createTaskGroup } from '../../store/slices/taskGroupsSlice';
import { TaskGroup } from '../../types/database';
import { FolderSelectionModal } from '../../components/FolderSelectionModal';
import { TagSelectionModal } from '../../components/TagSelectionModal';
import { Toast } from '../../components/Toast';
import { 
  validateChecklistTitle, 
  validateItemText, 
  canAddMoreItems,
  canAddMoreChecklists,
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
  getCharacterCountText,
  shouldHighlightCharacterCount
} from '../../lib/validations';
import { ArrowLeft, Calendar, Folder, Tag, Circle, SquareCheck, X, Plus, Layers, Settings, Edit, Trash, Check } from 'lucide-react-native';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function NewChecklistScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { tags } = useSelector((state: RootState) => state.tags);
  const { loading } = useSelector((state: RootState) => state.checklists);

  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string>('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  
  // Task groups states - restructured for grouped items
  const [groupedItems, setGroupedItems] = useState<{
    id: string;
    name: string;
    colorCode: string;
    items: string[];
    itemStates: boolean[];
  }[]>([
    {
      id: 'default',
      name: 'Items',
      colorCode: '#007AFF',
      items: [''],
      itemStates: [false]
    }
  ]);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Group editing states
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  // Group deletion confirmation states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  
  // Group name character limit
  const MAX_GROUP_NAME_LENGTH = 30;
  
  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // Loading overlay state
  const [isSaving, setIsSaving] = useState(false);
  
  // Validation states
  const [titleValidationError, setTitleValidationError] = useState<string | null>(null);

  // Computed validation state for save button
  const isSaveEnabled = useMemo(() => {
    const hasValidTitle = title && title.trim().length > 0;
    const hasValidItems = groupedItems.some(group => {
      // Filter out empty items (especially the placeholder empty item at the end)
      const nonEmptyItems = group.items.filter(item => item && item.trim().length > 0);
      return nonEmptyItems.length > 0;
    });
    
    return hasValidTitle && hasValidItems && !loading;
  }, [title, groupedItems, loading]);

  // Refs for managing focus
  const titleInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
    }
  }, [user, dispatch]);

  // Grouped items management functions

  // Task Groups Functions - Updated for new structure
  const addTaskGroup = () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;
    
    if (trimmedName.length > MAX_GROUP_NAME_LENGTH) {
      showToastMessage(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or less`, 'error');
      return;
    }
    
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
    const colorIndex = groupedItems.length % colors.length;
    
    const newGroup = {
      id: `group-${Date.now()}`,
      name: trimmedName,
      colorCode: colors[colorIndex],
      items: [''],
      itemStates: [false]
    };
    
    setGroupedItems([...groupedItems, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const removeTaskGroup = (groupIndex: number) => {
    if (groupedItems.length <= 1) return; // Keep at least one group
    
    setGroupToDelete(groupIndex);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete === null) return;
    
    const updatedGroups = groupedItems.filter((_, i) => i !== groupToDelete);
    setGroupedItems(updatedGroups);
    
    setShowDeleteConfirmation(false);
    setGroupToDelete(null);
  };

  const cancelDeleteGroup = () => {
    setShowDeleteConfirmation(false);
    setGroupToDelete(null);
  };

  const startEditingGroup = (groupIndex: number) => {
    setEditingGroupIndex(groupIndex);
    setEditingGroupName(groupedItems[groupIndex].name);
  };

  const confirmGroupEdit = () => {
    const trimmedName = editingGroupName.trim();
    if (editingGroupIndex === null || !trimmedName) return;
    
    if (trimmedName.length > MAX_GROUP_NAME_LENGTH) {
      showToastMessage(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or less`, 'error');
      return;
    }
    
    const updatedGroups = [...groupedItems];
    updatedGroups[editingGroupIndex].name = trimmedName;
    setGroupedItems(updatedGroups);
    
    setEditingGroupIndex(null);
    setEditingGroupName('');
  };

  const cancelGroupEdit = () => {
    setEditingGroupIndex(null);
    setEditingGroupName('');
  };

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const updateGroupItem = (groupIndex: number, itemIndex: number, value: string) => {
    const updatedGroups = [...groupedItems];
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
      }
    }
    
    setGroupedItems(updatedGroups);
  };

  const toggleGroupItemState = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...groupedItems];
    updatedGroups[groupIndex].itemStates[itemIndex] = !updatedGroups[groupIndex].itemStates[itemIndex];
    setGroupedItems(updatedGroups);
  };

  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...groupedItems];
    const group = updatedGroups[groupIndex];
    
    // Don't remove if this is the only item, or if it's the last item and it's empty
    if (group.items.length <= 1) return;
    
    const isLastItem = itemIndex === group.items.length - 1;
    const isItemEmpty = group.items[itemIndex].trim() === '';
    
    // Don't remove the last item if it's empty (keep it as placeholder)
    if (isLastItem && isItemEmpty) return;
    
    group.items.splice(itemIndex, 1);
    group.itemStates.splice(itemIndex, 1);
    
    // Ensure there's always an empty item at the end
    const lastItem = group.items[group.items.length - 1];
    if (lastItem && lastItem.trim() !== '') {
      group.items.push('');
      group.itemStates.push(false);
    }
    
    setGroupedItems(updatedGroups);
  };



  const handleTitleSubmit = () => {
    // Focus first item of first group when title is submitted
    // This is optional for grouped UI
  };

  const handleSave = async () => {
    console.log('handleSave called with user:', user?.user_id);
    
    if (!user) {
      console.log('No user found');
      return;
    }

    // Show loading overlay immediately
    setIsSaving(true);

    // Validate title
    const titleError = validateChecklistTitle(title);
    if (titleError) {
      setTitleValidationError(titleError);
      showToastMessage(titleError, 'error');
      setIsSaving(false);
      return;
    }
    setTitleValidationError(null);

    // Collect all items from all groups and validate
    const validItems: string[] = [];
    const validStates: boolean[] = [];
    let hasValidationErrors = false;

    groupedItems.forEach((group) => {
      group.items.forEach((item, itemIndex) => {
        if (item.trim() !== '') {
          const itemError = validateItemText(item);
          if (itemError) {
            hasValidationErrors = true;
          } else {
            validItems.push(item.trim());
            validStates.push(group.itemStates[itemIndex] || false);
          }
        }
      });
    });
    
    // Check if there are any validation errors
    if (hasValidationErrors) {
      showToastMessage('Please fix the errors in your items', 'error');
      setIsSaving(false);
      return;
    }
    
    if (validItems.length === 0) {
      console.log('No valid items');
      showToastMessage('Please add at least one item to your checklist', 'error');
      setIsSaving(false);
      return;
    }

    // Check item limit
    if (!canAddMoreItems(validItems.length - 1)) { // -1 because we're adding multiple items
      showToastMessage(VALIDATION_MESSAGES.MAX_ITEMS_REACHED, 'error');
      setIsSaving(false);
      return;
    }

    try {
      const checklistData = {
        name: title.trim(),
        user_id: user.user_id,
        bucket_id: selectedBucketId || undefined,
        due_date: targetDate?.toISOString() || undefined,
        tags: selectedTags,
        items: validItems.map((item, index) => ({
          text: item.trim(),
          completed: validStates[index] || false,
        })),
      };

      console.log('Saving checklist with data:', checklistData);
      
      const result = await dispatch(createChecklistWithItems(checklistData)).unwrap();
      console.log('Checklist created successfully:', result);
      
      // Show success toast
      showToastMessage('Checklist created successfully!', 'success');
      
      // Navigate to the newly created checklist after a short delay to show the toast
      setTimeout(() => {
        setIsSaving(false);
        if (result && result.checklist && result.checklist.checklist_id) {
          router.replace(`/checklist/${result.checklist.checklist_id}`);
        } else {
          router.replace('/');
        }
      }, 2000); // Increased to 2 seconds to show the toast longer
    } catch (error) {
      console.error('Error creating checklist:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToastMessage(`Failed to create checklist: ${errorMessage}`, 'error');
      setIsSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTargetDate(selectedDate);
      // Don't auto-close - let user click Done
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const getSelectedBucketName = () => {
    const bucket = buckets.find(b => b.bucket_id === selectedBucketId);
    return bucket?.name || 'Select Folder';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.doneButton,
              (!isSaveEnabled || isSaving) && styles.doneButtonDisabled
            ]} 
            onPress={handleSave}
            disabled={!isSaveEnabled || isSaving}
          >
            <Text style={[
              styles.doneButtonText,
              (!isSaveEnabled || isSaving) && styles.doneButtonTextDisabled
            ]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title Input */}
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            placeholder="Checklist Title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#C7C7CC"
            returnKeyType="next"
            onSubmitEditing={handleTitleSubmit}
            blurOnSubmit={false}
          />

          {/* Groups with Items */}
          {groupedItems.map((group, groupIndex) => (
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
                              style={styles.cancelButton}
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
                          <Edit size={16} color="#007AFF" />
                        </TouchableOpacity>
                        {groupedItems.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteGroupButton}
                            onPress={() => removeTaskGroup(groupIndex)}
                          >
                            <Trash size={16} color="#FF3B30" />
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
                        style={styles.cancelButton}
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

          {/* Target Date Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Target Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#007AFF" />
              <Text style={[styles.dateButtonText, targetDate && styles.dateButtonTextSelected]}>
                {targetDate ? formatDate(targetDate) : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Folder Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Folder</Text>
            <TouchableOpacity 
              style={styles.folderButton}
              onPress={() => {
                setShowFolderModal(true);
              }}
            >
              <Folder size={20} color="#007AFF" />
              <Text style={[styles.folderButtonText, selectedBucketId && styles.folderButtonTextSelected]}>
                {getSelectedBucketName()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tags Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <TouchableOpacity 
              style={styles.tagsButton}
              onPress={() => {
                setShowTagModal(true);
              }}
            >
              <Tag size={20} color="#007AFF" />
              {selectedTags.length > 0 ? (
                <View style={styles.tagsContent}>
                  <View style={styles.selectedTagsInline}>
                    {selectedTags.map((tag, index) => (
                      <View key={index} style={styles.tagChipInline}>
                        <Text style={styles.tagChipTextInline}>{tag}</Text>
                        <TouchableOpacity onPress={() => toggleTag(tag)}>
                          <X size={14} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.tagsButtonText}>Add tags</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Add some bottom padding for better scrolling */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Date Selection Modal */}
        <Modal
          visible={showDatePicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity 
                style={styles.modalDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              {Platform.OS === 'web' ? (
                <View style={styles.webDateInputContainer}>
                  <TextInput
                    style={styles.webDateInput}
                    placeholder="YYYY-MM-DD"
                    value={targetDate ? targetDate.toISOString().split('T')[0] : ''}
                    onChangeText={(text) => {
                      // Validate date format
                      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                      if (dateRegex.test(text)) {
                        const selectedDate = new Date(text);
                        if (!isNaN(selectedDate.getTime())) {
                          setTargetDate(selectedDate);
                        }
                      } else if (text === '') {
                        setTargetDate(null);
                      }
                    }}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={targetDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.datePicker}
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>
        
        {/* Reusable Modals */}
        <FolderSelectionModal
          visible={showFolderModal}
          selectedFolderId={selectedBucketId}
          onSelect={(folderId) => setSelectedBucketId(folderId)}
          onClose={() => setShowFolderModal(false)}
        />
        
        <TagSelectionModal
          visible={showTagModal}
          selectedTagNames={selectedTags}
          onSelect={setSelectedTags}
          onClose={() => setShowTagModal(false)}
        />

        <ConfirmationModal
          visible={showDeleteConfirmation}
          title="Delete Group"
          message={`Are you sure you want to delete the "${groupToDelete !== null ? groupedItems[groupToDelete]?.name : ''}" group? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmStyle="destructive"
          onConfirm={confirmDeleteGroup}
          onCancel={cancelDeleteGroup}
        />

        <Toast
          visible={showToast}
          message={toastMessage}
          type={toastType}
          onHide={() => setShowToast(false)}
        />

        {/* Loading Overlay */}
        {isSaving && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Creating checklist...</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  titleInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
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
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C7C7CC',
    marginTop: 10,
    marginRight: 12,
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
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 0.5,
    borderTopColor: '#C7C7CC',
  },
  bottomBarItem: {
    padding: 12,
    borderRadius: 8,
    position: 'relative',
  },
  bottomBarItemActive: {
    backgroundColor: '#E3F2FD',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  bottomPadding: {
    height: 100,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalDoneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000000',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 32,
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  datePicker: {
    height: 200,
  },
  webDateInputContainer: {
    padding: 20,
    alignItems: 'center',
  },
  webDateInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
    width: '100%',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  tagsContent: {
    flex: 1,
    marginLeft: 12,
  },
  selectedTagsInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChipInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  tagChipTextInline: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  createNewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  createNewInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
    color: '#000000',
  },
  createNewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  createNewButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  createNewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createNewButtonTextDisabled: {
    color: '#FFFFFF',
  },
  selectionSummary: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
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
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  dateButtonTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  folderButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  folderButtonTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 12,
    minHeight: 48,
  },
  tagsButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Missing styles for header and content
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
  doneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButtonTextDisabled: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Groups styles
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  addGroupText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  groupsList: {
    marginTop: 8,
  },
  emptyGroupsState: {
    alignItems: 'center',
    paddingVertical: 24,
    opacity: 0.6,
  },
  emptyGroupsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptyGroupsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  removeGroupButton: {
    padding: 4,
  },
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
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    alignSelf: 'flex-start',
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
  cancelButton: {
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
  // New group section styles
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
    textAlignVertical: 'center',
  },
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
  },
  addGroupSectionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
