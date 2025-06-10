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
import { createCategory } from '../store/slices/categoriesSlice';
import { X, Check, Plus, Loader } from 'lucide-react-native';

interface CategorySelectionModalProps {
  visible: boolean;
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  visible,
  selectedCategoryId,
  onSelect,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading } = useSelector((state: RootState) => state.categories);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Check if category already exists
    const existingCategory = categories.find(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (existingCategory) {
      Alert.alert('Error', 'A category with this name already exists');
      return;
    }

    setCreatingCategory(true);
    try {
      const result = await dispatch(createCategory(newCategoryName.trim())).unwrap();
      
      console.log('[CategorySelectionModal] Created new category:', result);
      
      setNewCategoryName('');
      setShowCreateForm(false);
      onSelect(result.category_id);
      onClose();
    } catch (error) {
      console.error('[CategorySelectionModal] Failed to create category:', error);
      Alert.alert('Error', 'Failed to create category. Please try again.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewCategoryName('');
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setNewCategoryName('');
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
          <Text style={styles.modalTitle}>Select Category</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* No Category Option */}
          <TouchableOpacity
            style={[
              styles.modalOption,
              !selectedCategoryId && styles.modalOptionSelected
            ]}
            onPress={() => {
              onSelect('');
              onClose();
            }}
          >
            <Text style={[
              styles.modalOptionText,
              !selectedCategoryId && styles.modalOptionTextSelected
            ]}>
              No category
            </Text>
            {!selectedCategoryId && (
              <Check size={20} color="#2563EB" />
            )}
          </TouchableOpacity>
          
          {/* Existing Categories */}
          {categories.map((category) => (
            <TouchableOpacity
              key={category.category_id}
              style={[
                styles.modalOption,
                selectedCategoryId === category.category_id && styles.modalOptionSelected
              ]}
              onPress={() => {
                onSelect(category.category_id);
                onClose();
              }}
            >
              <Text style={[
                styles.modalOptionText,
                selectedCategoryId === category.category_id && styles.modalOptionTextSelected
              ]}>
                {category.name}
              </Text>
              {selectedCategoryId === category.category_id && (
                <Check size={20} color="#2563EB" />
              )}
            </TouchableOpacity>
          ))}
          
          {/* Create New Category Section */}
          <View style={styles.createSection}>
            {!showCreateForm ? (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateForm(true)}
              >
                <Plus size={20} color="#2563EB" />
                <Text style={styles.createButtonText}>Create New Category</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.createForm}>
                <Text style={styles.createFormTitle}>Create New Category</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="Enter category name..."
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateCategory}
                />
                <View style={styles.createFormActions}>
                  <TouchableOpacity
                    style={styles.createFormButton}
                    onPress={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                  >
                    {creatingCategory ? (
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
});
