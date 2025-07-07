import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../store';
import { fetchBuckets, deleteBucket, createBucket, updateBucket } from '../store/slices/bucketsSlice';
import { fetchChecklistsWithStats } from '../store/slices/checklistsSlice';
import { bucketService } from '../services/bucketService';
import { checklistService } from '../services/checklistService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { 
  ArrowLeft,
  Plus,
  Folder,
  Edit3,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';

export default function FolderManagementScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets, loading } = useSelector((state: RootState) => state.buckets);
  const { checklists } = useSelector((state: RootState) => state.checklists);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<any>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [editFolderName, setEditFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchChecklistsWithStats(user.user_id));
    }
  }, [user, dispatch]);

  const getBucketChecklistCount = (bucketId: string) => {
    return checklists.filter(c => c.bucket_id === bucketId).length;
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    setIsCreating(true);
    try {
      await dispatch(createBucket({ userId: user.user_id, bucketName: newFolderName.trim() }));
      setNewFolderName('');
      setShowCreateModal(false);
      showToastMessage('Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditFolder = (bucket: any) => {
    setSelectedBucket(bucket);
    setEditFolderName(bucket.name);
    setShowEditModal(true);
  };

  const handleUpdateFolder = async () => {
    if (!editFolderName.trim() || !selectedBucket) return;

    setIsUpdating(true);
    try {
      await dispatch(updateBucket({ bucketId: selectedBucket.bucket_id, bucketName: editFolderName.trim() }));
      setShowEditModal(false);
      setSelectedBucket(null);
      setEditFolderName('');
      showToastMessage('Folder updated successfully');
    } catch (error) {
      console.error('Error updating folder:', error);
      Alert.alert('Error', 'Failed to update folder. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFolder = (bucket: any) => {
    setSelectedBucket(bucket);
    setShowDeleteModal(true);
  };

  const confirmDeleteFolder = async () => {
    if (!selectedBucket || !user) return;

    setIsDeleting(true);
    try {
      // Get all checklists in this folder
      const checklistsInFolder = checklists.filter(c => c.bucket_id === selectedBucket.bucket_id);
      
      // Update all checklists to remove the folder reference
      for (const checklist of checklistsInFolder) {
        await checklistService.updateChecklist(
          checklist.checklist_id,
          checklist.name,
          checklist.description,
          undefined, // Remove bucket_id
          checklist.tags || [],
          checklist.due_date
        );
      }

      // Delete the folder
      await dispatch(deleteBucket(selectedBucket.bucket_id));
      
      // Refresh data
      dispatch(fetchChecklistsWithStats(user.user_id));
      
      setShowDeleteModal(false);
      setSelectedBucket(null);
      showToastMessage('Folder deleted successfully');
    } catch (error) {
      console.error('Error deleting folder:', error);
      Alert.alert('Error', 'Failed to delete folder. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && buckets.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Folder Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {buckets.length > 0 ? (
          <View style={styles.folderList}>
            {buckets.map((bucket) => {
              const checklistCount = getBucketChecklistCount(bucket.bucket_id);
              return (
                <View key={bucket.bucket_id} style={styles.folderItem}>
                  <View style={styles.folderInfo}>
                    <View style={styles.folderIcon}>
                      <Folder size={24} color="#6B7280" />
                    </View>
                    <View style={styles.folderDetails}>
                      <Text style={styles.folderName}>{bucket.name}</Text>
                      <Text style={styles.folderCount}>
                        {checklistCount} checklist{checklistCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.folderActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditFolder(bucket)}
                    >
                      <Edit3 size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteFolder(bucket)}
                    >
                      <Trash2 size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Folder size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No folders yet</Text>
            <Text style={styles.emptyText}>
              Create your first folder to organize your checklists
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createFirstButtonText}>Create Folder</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Folder Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, !newFolderName.trim() && styles.createButtonDisabled]}
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreating}
              >
                <Text style={styles.createButtonText}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter folder name"
              value={editFolderName}
              onChangeText={setEditFolderName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedBucket(null);
                  setEditFolderName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, !editFolderName.trim() && styles.createButtonDisabled]}
                onPress={handleUpdateFolder}
                disabled={!editFolderName.trim() || isUpdating}
              >
                <Text style={styles.createButtonText}>
                  {isUpdating ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Folder"
        message={`Are you sure you want to delete "${selectedBucket?.name}"? This will remove the folder from all checklists but won't delete the checklists themselves.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={confirmDeleteFolder}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedBucket(null);
        }}
        confirmStyle="destructive"
      />

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        onHide={() => setShowToast(false)}
      />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  folderList: {
    padding: 16,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderIcon: {
    marginRight: 12,
  },
  folderDetails: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  folderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
