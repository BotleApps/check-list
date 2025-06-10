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
import { ArrowLeft, Calendar, Folder, Tag, Circle, SquareCheck, X, Plus } from 'lucide-react-native';

export default function NewChecklistScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { tags } = useSelector((state: RootState) => state.tags);
  const { loading } = useSelector((state: RootState) => state.checklists);

  const [title, setTitle] = useState('');
  const [items, setItems] = useState<string[]>(['']);
  const [itemStates, setItemStates] = useState<boolean[]>([false]);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string>('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [addingNewItem, setAddingNewItem] = useState(false);
  
  // Validation states
  const [titleValidationError, setTitleValidationError] = useState<string | null>(null);
  const [itemValidationErrors, setItemValidationErrors] = useState<(string | null)[]>([null]);

  // Refs for managing focus
  const titleInputRef = useRef<TextInput>(null);
  const itemInputRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const newItemInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
    }
  }, [user, dispatch]);

  // Ensure itemStates array always matches items array length
  useEffect(() => {
    if (itemStates.length !== items.length) {
      const newStates = [...itemStates];
      while (newStates.length < items.length) {
        newStates.push(false);
      }
      while (newStates.length > items.length) {
        newStates.pop();
      }
      setItemStates(newStates);
    }
  }, [items.length, itemStates.length]);

  const updateItem = (index: number, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = value;
    setItems(updatedItems);
  };

  const toggleItemState = (index: number) => {
    const updatedStates = [...itemStates];
    updatedStates[index] = !updatedStates[index];
    setItemStates(updatedStates);
  };

  const addNewItem = (afterIndex: number) => {
    const updatedItems = [...items];
    const updatedStates = [...itemStates];
    
    updatedItems.splice(afterIndex + 1, 0, '');
    updatedStates.splice(afterIndex + 1, 0, false);
    
    setItems(updatedItems);
    setItemStates(updatedStates);
    
    // Update refs array to match new items length
    const newRefs = [...itemInputRefs.current];
    newRefs.splice(afterIndex + 1, 0, null);
    itemInputRefs.current = newRefs;
    
    // Focus the new item after a short delay
    setTimeout(() => {
      const newIndex = afterIndex + 1;
      itemInputRefs.current[newIndex]?.focus();
      
      // Scroll to show the new item
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return; // Always keep at least one item
    
    const updatedItems = items.filter((_, i) => i !== index);
    const updatedStates = itemStates.filter((_, i) => i !== index);
    
    setItems(updatedItems);
    setItemStates(updatedStates);
    
    // Update refs array
    const newRefs = itemInputRefs.current.filter((_, i) => i !== index);
    itemInputRefs.current = newRefs;
    
    // Focus previous item or next item
    setTimeout(() => {
      const targetIndex = Math.max(0, Math.min(index - 1, updatedItems.length - 1));
      itemInputRefs.current[targetIndex]?.focus();
    }, 100);
  };

  const handleItemSubmit = (index: number) => {
    // Always create a new item when Enter is pressed
    addNewItem(index);
  };

  const handleItemKeyPress = (index: number, nativeEvent: any) => {
    const { key } = nativeEvent;
    
    if (key === 'Enter') {
      // Create new item when Enter is pressed
      handleItemSubmit(index);
      return;
    }
    
    if (key === 'Backspace' && items[index] === '' && items.length > 1) {
      // Remove current empty item and focus previous
      removeItem(index);
    }
  };

  const handleItemBlur = (index: number) => {
    // Remove empty items when they lose focus, but keep at least one item
    if (items[index].trim() === '' && items.length > 1) {
      // Check if there are other non-empty items
      const hasOtherItems = items.some((item, i) => i !== index && item.trim() !== '');
      if (hasOtherItems) {
        removeItem(index);
      }
    }
  };

  const handleTitleSubmit = () => {
    // Focus first item when title is submitted
    if (itemInputRefs.current[0]) {
      itemInputRefs.current[0]?.focus();
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
    if (!newItemText.trim() || addingNewItem) return;
    
    setAddingNewItem(true);
    try {
      const updatedItems = [...items];
      const updatedStates = [...itemStates];
      
      updatedItems.push(newItemText.trim());
      updatedStates.push(false);
      
      setItems(updatedItems);
      setItemStates(updatedStates);
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

    // Clean up empty items and validate
    const validItems: string[] = [];
    const validStates: boolean[] = [];
    const errors: (string | null)[] = [];
    
    items.forEach((item, index) => {
      if (item.trim() !== '') {
        const itemError = validateItemText(item);
        if (itemError) {
          errors[index] = itemError;
        } else {
          validItems.push(item.trim());
          validStates.push(itemStates[index] || false);
          errors[index] = null;
        }
      } else {
        errors[index] = null;
      }
    });
    
    setItemValidationErrors(errors);
    
    // Check if there are any validation errors
    if (errors.some(error => error !== null)) {
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
            style={styles.doneButton} 
            onPress={handleSave}
            disabled={loading || !title.trim()}
          >
            <Text style={[
              styles.doneButtonText,
              (!title.trim() || loading) && styles.doneButtonTextDisabled
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

          {/* Items Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Items</Text>
              <TouchableOpacity 
                style={styles.addItemButton}
                onPress={handleAddNewItem}
                disabled={isAddingItem || addingNewItem}
              >
                <Plus size={20} color="#007AFF" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.itemsList}>
              {items.map((item, index) => (
                <View key={`item-${index}`} style={styles.itemRow}>
                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => toggleItemState(index)}
                    activeOpacity={0.7}
                  >
                    {itemStates[index] ? (
                      <SquareCheck size={20} color="#007AFF" />
                    ) : (
                      <Circle size={20} color="#C7C7CC" />
                    )}
                  </TouchableOpacity>
                  <TextInput
                    ref={(ref) => {
                      if (itemInputRefs.current) {
                        itemInputRefs.current[index] = ref;
                      }
                    }}
                    style={[
                      styles.itemInput,
                      itemStates[index] && styles.itemInputCompleted
                    ]}
                    placeholder={index === 0 ? "Add your first item..." : "Add item..."}
                    value={item}
                    onChangeText={(value) => updateItem(index, value)}
                    placeholderTextColor="#C7C7CC"
                    returnKeyType="next"
                    onSubmitEditing={() => handleItemSubmit(index)}
                    onKeyPress={({ nativeEvent }) => handleItemKeyPress(index, nativeEvent)}
                    onBlur={() => handleItemBlur(index)}
                    blurOnSubmit={false}
                    multiline={true}
                    textAlignVertical="top"
                    scrollEnabled={false}
                  />
                  {items.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(index)}
                    >
                      <X size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              {/* New Item Input */}
              {isAddingItem && (
                <View style={styles.itemRow}>
                  <View style={styles.checkboxContainer}>
                    <Circle size={20} color="#C7C7CC" />
                  </View>
                  <TextInput
                    ref={newItemInputRef}
                    style={styles.itemInput}
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
              )}
            </View>
          </View>

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
              <DateTimePicker
                value={targetDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                style={styles.datePicker}
              />
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
          onSelect={(tagNames) => setSelectedTags(tagNames)}
          onClose={() => setShowTagModal(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  backButton: {
    padding: 8,
  },
  doneButton: {
    padding: 8,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  doneButtonTextDisabled: {
    color: '#C7C7CC',
  },
  content: {
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
});
