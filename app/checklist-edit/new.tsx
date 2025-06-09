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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { createChecklistWithItems } from '../../store/slices/checklistsSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { fetchTags } from '../../store/slices/tagsSlice';
import { ArrowLeft, Calendar, Folder, Tag, Circle, SquareCheck } from 'lucide-react-native';

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
  const [targetDate, setTargetDate] = useState('');
  const [selectedBucketId, setSelectedBucketId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Refs for managing focus
  const titleInputRef = useRef<TextInput>(null);
  const itemInputRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleSave = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your checklist');
      return;
    }

    // Clean up empty items before saving
    const validItems = items.filter(item => item.trim() !== '');
    const validStates = itemStates.filter((_, index) => items[index].trim() !== '');
    
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your checklist');
      return;
    }

    try {
      const checklistData = {
        name: title.trim(),
        user_id: user.user_id,
        bucket_id: selectedBucketId || undefined,
        tags: selectedTags,
        items: validItems.map((item, index) => ({
          text: item.trim(),
          completed: validStates[index] || false,
        })),
      };

      await dispatch(createChecklistWithItems(checklistData)).unwrap();
      Alert.alert('Success', 'Checklist created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create checklist. Please try again.');
    }
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
            <ArrowLeft size={24} color="#007AFF" />
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
              Done
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
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#C7C7CC"
            returnKeyType="next"
            onSubmitEditing={handleTitleSubmit}
            blurOnSubmit={false}
          />

          {/* Items List */}
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
              </View>
            ))}
          </View>

          {/* Add some bottom padding for better scrolling */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[
              styles.bottomBarItem,
              targetDate && styles.bottomBarItemActive
            ]}
            onPress={() => {
              Alert.alert('Coming Soon', 'Date picker will be available in the next update!');
            }}
          >
            <Calendar size={24} color={targetDate ? "#007AFF" : "#8E8E93"} />
            {targetDate && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.bottomBarItem,
              selectedBucketId && styles.bottomBarItemActive
            ]}
            onPress={() => {
              Alert.alert('Coming Soon', 'Bucket selector will be available in the next update!');
            }}
          >
            <Folder size={24} color={selectedBucketId ? "#007AFF" : "#8E8E93"} />
            {selectedBucketId && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.bottomBarItem,
              selectedTags.length > 0 && styles.bottomBarItemActive
            ]}
            onPress={() => {
              Alert.alert('Coming Soon', 'Tag selector will be available in the next update!');
            }}
          >
            <Tag size={24} color={selectedTags.length > 0 ? "#007AFF" : "#8E8E93"} />
            {selectedTags.length > 0 && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
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
    paddingVertical: 20,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  itemsList: {
    paddingTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
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
});
