import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createTag } from '../store/slices/tagsSlice';
import { X, Check, Plus, Loader } from 'lucide-react-native';

interface TagSelectionModalProps {
  visible: boolean;
  selectedTagNames: string[];
  onSelect: (tagNames: string[]) => void;
  onClose: () => void;
}

export const TagSelectionModal: React.FC<TagSelectionModalProps> = ({
  visible,
  selectedTagNames,
  onSelect,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { tags, loading } = useSelector((state: RootState) => state.tags);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTagNames);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !user) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    // Check if tag already exists
    const existingTag = tags.find(tag => tag.name.toLowerCase() === newTagName.trim().toLowerCase());
    if (existingTag) {
      Alert.alert('Error', 'A tag with this name already exists');
      return;
    }

    setCreatingTag(true);
    try {
      const result = await dispatch(createTag(newTagName.trim())).unwrap();
      
      console.log('[TagSelectionModal] Created new tag:', result);
      
      // Add the new tag to the local selection
      const newSelection = [...localSelectedTags, result.name];
      setLocalSelectedTags(newSelection);
      
      setNewTagName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('[TagSelectionModal] Failed to create tag:', error);
      Alert.alert('Error', 'Failed to create tag. Please try again.');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleToggleTag = (tagName: string) => {
    console.log('[TagSelectionModal] Toggling tag:', tagName);
    setLocalSelectedTags(prev => {
      const isSelected = prev.includes(tagName);
      const newSelection = isSelected
        ? prev.filter(name => name !== tagName)
        : [...prev, tagName];
      console.log('[TagSelectionModal] New selection:', newSelection);
      return newSelection;
    });
  };

  const handleSave = () => {
    console.log('[TagSelectionModal] Saving selection:', localSelectedTags);
    onSelect(localSelectedTags);
    onClose();
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewTagName('');
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setNewTagName('');
    setLocalSelectedTags(selectedTagNames); // Reset to original selection
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Tags</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Existing Tags */}
          {tags.map((tag) => {
            const isSelected = localSelectedTags.includes(tag.name);
            return (
              <TouchableOpacity
                key={tag.tag_id}
                style={[
                  styles.modalOption,
                  isSelected && styles.modalOptionSelected
                ]}
                onPress={() => handleToggleTag(tag.name)}
              >
                <Text style={[
                  styles.modalOptionText,
                  isSelected && styles.modalOptionTextSelected
                ]}>
                  {tag.name}
                </Text>
                {isSelected && (
                  <Check size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            );
          })}
          
          {/* Create New Tag Section */}
          <View style={styles.createSection}>
            {!showCreateForm ? (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateForm(true)}
              >
                <Plus size={20} color="#2563EB" />
                <Text style={styles.createButtonText}>Create New Tag</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.createForm}>
                <Text style={styles.createFormTitle}>Create New Tag</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChangeText={setNewTagName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateTag}
                />
                <View style={styles.createFormActions}>
                  <TouchableOpacity
                    style={styles.createFormButton}
                    onPress={handleCreateTag}
                    disabled={creatingTag || !newTagName.trim()}
                  >
                    {creatingTag ? (
                      <Loader size={16} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.createFormButtonText}>Create</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createFormCancelButton}
                    onPress={handleCancelCreate}
                  >
                    <Text style={styles.createFormCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Save Button */}
        <View style={styles.saveSection}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>
              Save Selection ({localSelectedTags.length})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  closeButton: {
    padding: 8,
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
  createSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  createButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  createForm: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  createFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  createInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  createFormActions: {
    flexDirection: 'row',
    gap: 8,
  },
  createFormButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  createFormButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createFormCancelButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFormCancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  saveSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
