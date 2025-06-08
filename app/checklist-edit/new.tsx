import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { createChecklist } from '../../store/slices/checklistsSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { fetchTags } from '../../store/slices/tagsSlice';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Calendar, 
  Tag, 
  Folder,
  Save,
  X
} from 'lucide-react-native';

interface ChecklistItemInput {
  id: string;
  text: string;
  due_days?: number;
  notes?: string;
}

export default function CreateChecklistScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { tags } = useSelector((state: RootState) => state.tags);
  const { loading } = useSelector((state: RootState) => state.checklists);

  // Form state
  const [checklistName, setChecklistName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string | null>(
    params.bucket as string || null
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [items, setItems] = useState<ChecklistItemInput[]>([
    { id: '1', text: '', due_days: undefined, notes: '' }
  ]);
  
  const [showBucketPicker, setShowBucketPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
    }
  }, [user, dispatch]);

  const addItem = () => {
    const newItem: ChecklistItemInput = {
      id: Date.now().toString(),
      text: '',
      due_days: undefined,
      notes: ''
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ChecklistItemInput, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleSave = async () => {
    if (!checklistName.trim()) {
      Alert.alert('Error', 'Please enter a checklist name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const validItems = items.filter(item => item.text.trim() !== '');
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your checklist');
      return;
    }

    try {
      const checklistData = {
        user_id: user.user_id,
        name: checklistName.trim(),
        target_date: targetDate || undefined,
        bucket_id: selectedBucket || undefined,
        tags: selectedTags,
      };

      await dispatch(createChecklist(checklistData));
      
      Alert.alert('Success', 'Checklist created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create checklist. Please try again.');
    }
  };

  const selectedBucketName = selectedBucket 
    ? buckets.find(b => b.bucket_id === selectedBucket)?.bucket_name 
    : null;

  if (loading) {
    return <LoadingSpinner />;
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
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Checklist</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Save size={24} color="#0891B2" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Checklist Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checklist Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter checklist name..."
              value={checklistName}
              onChangeText={setChecklistName}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Target Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Date (Optional)</Text>
            <TouchableOpacity style={styles.dateInput}>
              <Calendar size={20} color="#6B7280" />
              <TextInput
                style={styles.dateText}
                placeholder="YYYY-MM-DD"
                value={targetDate}
                onChangeText={setTargetDate}
                placeholderTextColor="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Bucket Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bucket (Optional)</Text>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => setShowBucketPicker(!showBucketPicker)}
            >
              <Folder size={20} color="#6B7280" />
              <Text style={[styles.pickerText, selectedBucketName && styles.selectedPickerText]}>
                {selectedBucketName || 'Select a bucket'}
              </Text>
            </TouchableOpacity>
            
            {showBucketPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity 
                  style={styles.pickerOption}
                  onPress={() => {
                    setSelectedBucket(null);
                    setShowBucketPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>No bucket</Text>
                </TouchableOpacity>
                {buckets.map(bucket => (
                  <TouchableOpacity
                    key={bucket.bucket_id}
                    style={styles.pickerOption}
                    onPress={() => {
                      setSelectedBucket(bucket.bucket_id);
                      setShowBucketPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{bucket.bucket_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Tags Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags (Optional)</Text>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => setShowTagPicker(!showTagPicker)}
            >
              <Tag size={20} color="#6B7280" />
              <Text style={[styles.pickerText, selectedTags.length > 0 && styles.selectedPickerText]}>
                {selectedTags.length > 0 
                  ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                  : 'Select tags'
                }
              </Text>
            </TouchableOpacity>
            
            {selectedTags.length > 0 && (
              <View style={styles.selectedTags}>
                {selectedTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.selectedTag}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={styles.selectedTagText}>{tag}</Text>
                    <X size={14} color="#374151" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showTagPicker && (
              <View style={styles.pickerOptions}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.tag_id}
                    style={[
                      styles.pickerOption,
                      selectedTags.includes(tag.name) && styles.selectedPickerOption
                    ]}
                    onPress={() => toggleTag(tag.name)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      selectedTags.includes(tag.name) && styles.selectedPickerOptionText
                    ]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Checklist Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Checklist Items</Text>
              <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                <Plus size={20} color="#0891B2" />
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>{index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.removeItemButton}
                    >
                      <Minus size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <TextInput
                  style={styles.itemInput}
                  placeholder="Enter item description..."
                  value={item.text}
                  onChangeText={(text) => updateItem(item.id, 'text', text)}
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
                
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes (optional)..."
                  value={item.notes}
                  onChangeText={(text) => updateItem(item.id, 'notes', text)}
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
            ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dateText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pickerText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectedPickerText: {
    color: '#111827',
  },
  pickerOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedPickerOption: {
    backgroundColor: '#F0FDFA',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedPickerOptionText: {
    color: '#0891B2',
    fontWeight: '500',
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  selectedTagText: {
    fontSize: 14,
    color: '#0891B2',
    fontWeight: '500',
  },
  addItemButton: {
    padding: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0891B2',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  removeItemButton: {
    padding: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  itemInput: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
    minHeight: 40,
  },
  notesInput: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    minHeight: 30,
  },
});
