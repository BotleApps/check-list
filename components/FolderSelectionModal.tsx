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
import { createBucket } from '../store/slices/bucketsSlice';
import { X, Check, Plus, Loader } from 'lucide-react-native';

interface FolderSelectionModalProps {
  visible: boolean;
  selectedFolderId: string;
  onSelect: (folderId: string) => void;
  onClose: () => void;
}

export const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  visible,
  selectedFolderId,
  onSelect,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { buckets, loading } = useSelector((state: RootState) => state.buckets);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    setCreatingFolder(true);
    try {
      const result = await dispatch(createBucket({
        userId: user.user_id,
        bucketName: newFolderName.trim(),
      })).unwrap();
      
      setNewFolderName('');
      setShowCreateForm(false);
      onSelect(result.bucket_id);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewFolderName('');
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setNewFolderName('');
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
          <Text style={styles.modalTitle}>Select Folder</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* No Folder Option */}
          <TouchableOpacity
            style={[
              styles.modalOption,
              !selectedFolderId && styles.modalOptionSelected
            ]}
            onPress={() => {
              onSelect('');
              onClose();
            }}
          >
            <Text style={[
              styles.modalOptionText,
              !selectedFolderId && styles.modalOptionTextSelected
            ]}>
              No folder
            </Text>
            {!selectedFolderId && (
              <Check size={20} color="#2563EB" />
            )}
          </TouchableOpacity>
          
          {/* Existing Folders */}
          {buckets.map((bucket) => (
            <TouchableOpacity
              key={bucket.bucket_id}
              style={[
                styles.modalOption,
                selectedFolderId === bucket.bucket_id && styles.modalOptionSelected
              ]}
              onPress={() => {
                onSelect(bucket.bucket_id);
                onClose();
              }}
            >
              <Text style={[
                styles.modalOptionText,
                selectedFolderId === bucket.bucket_id && styles.modalOptionTextSelected
              ]}>
                {bucket.name}
              </Text>
              {selectedFolderId === bucket.bucket_id && (
                <Check size={20} color="#2563EB" />
              )}
            </TouchableOpacity>
          ))}
          
          {/* Create New Folder Section */}
          <View style={styles.createSection}>
            {!showCreateForm ? (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateForm(true)}
              >
                <Plus size={20} color="#2563EB" />
                <Text style={styles.createButtonText}>Create New Folder</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.createForm}>
                <Text style={styles.createFormTitle}>Create New Folder</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="Enter folder name..."
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateFolder}
                />
                <View style={styles.createFormActions}>
                  <TouchableOpacity
                    style={styles.createFormButton}
                    onPress={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                  >
                    {creatingFolder ? (
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
