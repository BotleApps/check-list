import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
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
import { ArrowLeft, Calendar, Folder, Tag, Circle, SquareCheck, X, Plus, Layers, Settings } from 'lucide-react-native';

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
  
  // Validation states
  const [titleValidationError, setTitleValidationError] = useState<string | null>(null);

  // Computed validation state for save button
  const isSaveEnabled = React.useMemo(() => {
    const hasValidTitle = title && title.trim().length > 0;
    const hasValidItems = groupedItems.some(group => 
      group.items.some(item => item && item.trim().length > 0)
    );
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
    if (!newGroupName.trim()) return;
    
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
    const colorIndex = groupedItems.length % colors.length;
    
    const newGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
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
    
    const updatedGroups = groupedItems.filter((_, i) => i !== groupIndex);
    setGroupedItems(updatedGroups);
  };

  const updateGroupItem = (groupIndex: number, itemIndex: number, value: string) => {
    const updatedGroups = [...groupedItems];
    updatedGroups[groupIndex].items[itemIndex] = value;
    setGroupedItems(updatedGroups);
  };

  const toggleGroupItemState = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...groupedItems];
    updatedGroups[groupIndex].itemStates[itemIndex] = !updatedGroups[groupIndex].itemStates[itemIndex];
    setGroupedItems(updatedGroups);
  };

  const addItemToGroup = (groupIndex: number, afterIndex: number) => {
    const updatedGroups = [...groupedItems];
    updatedGroups[groupIndex].items.splice(afterIndex + 1, 0, '');
    updatedGroups[groupIndex].itemStates.splice(afterIndex + 1, 0, false);
    setGroupedItems(updatedGroups);
  };

  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...groupedItems];
    if (updatedGroups[groupIndex].items.length <= 1) return; // Keep at least one item
    
    updatedGroups[groupIndex].items.splice(itemIndex, 1);
    updatedGroups[groupIndex].itemStates.splice(itemIndex, 1);
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

    // Validate title
    const titleError = validateChecklistTitle(title);
    if (titleError) {
      setTitleValidationError(titleError);
      Alert.alert('Validation Error', titleError);
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
      Alert.alert('Validation Error', 'Please fix the errors in your items');
      return;
    }
    
    if (validItems.length === 0) {
      console.log('No valid items');
      Alert.alert('Error', 'Please add at least one item to your checklist');
      return;
    }

    // Check item limit
    if (!canAddMoreItems(validItems.length - 1)) { // -1 because we're adding multiple items
      Alert.alert('Limit Reached', VALIDATION_MESSAGES.MAX_ITEMS_REACHED);
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
      
      Alert.alert('Success', 'Checklist created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creating checklist:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to create checklist: ${errorMessage}`);
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
              !isSaveEnabled && styles.doneButtonDisabled
            ]} 
            onPress={handleSave}
            disabled={!isSaveEnabled}
          >
            <Text style={[
              styles.doneButtonText,
              !isSaveEnabled && styles.doneButtonTextDisabled
            ]}>
              Save
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
            <View key={group.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.groupTitleContainer}>
                  <View style={[styles.groupIndicator, { backgroundColor: group.colorCode }]} />
                  <Text style={styles.sectionLabel}>{group.name}</Text>
                  {groupedItems.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeGroupButton}
                      onPress={() => removeTaskGroup(groupIndex)}
                    >
                      <X size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.addItemButton}
                  onPress={() => addItemToGroup(groupIndex, group.items.length - 1)}
                >
                  <Plus size={20} color="#007AFF" />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>
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
                      onSubmitEditing={() => addItemToGroup(groupIndex, itemIndex)}
                      multiline={true}
                      textAlignVertical="top"
                      scrollEnabled={false}
                    />
                    {group.items.length > 1 && (
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
            <View style={styles.newGroupSection}>
              <View style={styles.newGroupHeader}>
                <View style={[styles.groupIndicator, { backgroundColor: '#6B7280' }]} />
                <TextInput
                  style={styles.newGroupInput}
                  placeholder="Group name..."
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholderTextColor="#C7C7CC"
                  returnKeyType="done"
                  onSubmitEditing={addTaskGroup}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.removeGroupButton}
                  onPress={() => {
                    setIsAddingGroup(false);
                    setNewGroupName('');
                  }}
                >
                  <X size={16} color="#FF3B30" />
                </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
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
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
  },
  addItemText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
  groupIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  groupName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  newGroupInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  removeGroupButton: {
    padding: 4,
  },
  // New group section styles
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    marginBottom: 16,
    padding: 12,
  },
  newGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
