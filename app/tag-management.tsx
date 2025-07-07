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
import { fetchTags, deleteTag, createTag, updateTag } from '../store/slices/tagsSlice';
import { fetchChecklistsWithStats } from '../store/slices/checklistsSlice';
import { tagService } from '../services/tagService';
import { checklistService } from '../services/checklistService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { 
  ArrowLeft,
  Plus,
  Tag,
  Edit3,
  Trash2,
  Hash,
} from 'lucide-react-native';

export default function TagManagementScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { tags, loading } = useSelector((state: RootState) => state.tags);
  const { checklists } = useSelector((state: RootState) => state.checklists);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [newTagName, setNewTagName] = useState('');
  const [editTagName, setEditTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      dispatch(fetchTags());
      dispatch(fetchChecklistsWithStats(user.user_id));
    }
  }, [user, dispatch]);

  const getTagUsageCount = (tagId: string) => {
    return checklists.filter(checklist => 
      checklist.tags && checklist.tags.includes(tagId)
    ).length;
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      await dispatch(createTag(newTagName.trim()));
      setNewTagName('');
      setShowCreateModal(false);
      showToastMessage('Tag created successfully');
    } catch (error) {
      console.error('Error creating tag:', error);
      Alert.alert('Error', 'Failed to create tag. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTag = (tag: any) => {
    setSelectedTag(tag);
    setEditTagName(tag.name);
    setShowEditModal(true);
  };

  const handleUpdateTag = async () => {
    if (!editTagName.trim() || !selectedTag) return;

    setIsUpdating(true);
    try {
      await dispatch(updateTag({ tagId: selectedTag.tag_id, name: editTagName.trim() }));
      setShowEditModal(false);
      setSelectedTag(null);
      setEditTagName('');
      showToastMessage('Tag updated successfully');
    } catch (error) {
      console.error('Error updating tag:', error);
      Alert.alert('Error', 'Failed to update tag. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTag = (tag: any) => {
    setSelectedTag(tag);
    setShowDeleteModal(true);
  };

  const confirmDeleteTag = async () => {
    if (!selectedTag || !user) return;

    setIsDeleting(true);
    try {
      // Get all checklists that use this tag
      const checklistsWithTag = checklists.filter(checklist => 
        checklist.tags && checklist.tags.includes(selectedTag.tag_id)
      );
      
      // Update all checklists to remove this tag
      for (const checklist of checklistsWithTag) {
        const updatedTags = (checklist.tags || []).filter((tagId: string) => tagId !== selectedTag.tag_id);
        await checklistService.updateChecklist(
          checklist.checklist_id,
          checklist.name,
          checklist.description,
          checklist.bucket_id,
          updatedTags,
          checklist.due_date
        );
      }

      // Delete the tag
      await dispatch(deleteTag(selectedTag.tag_id));
      
      // Refresh data
      dispatch(fetchChecklistsWithStats(user.user_id));
      
      setShowDeleteModal(false);
      setSelectedTag(null);
      showToastMessage('Tag deleted successfully');
    } catch (error) {
      console.error('Error deleting tag:', error);
      Alert.alert('Error', 'Failed to delete tag. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && tags.length === 0) {
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
        <Text style={styles.headerTitle}>Tag Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {tags.length > 0 ? (
          <View style={styles.tagList}>
            {tags.map((tag) => {
              const usageCount = getTagUsageCount(tag.tag_id);
              return (
                <View key={tag.tag_id} style={styles.tagItem}>
                  <View style={styles.tagInfo}>
                    <View style={styles.tagIcon}>
                      <Hash size={24} color="#6B7280" />
                    </View>
                    <View style={styles.tagDetails}>
                      <Text style={styles.tagName}>{tag.name}</Text>
                      <Text style={styles.tagCount}>
                        Used in {usageCount} checklist{usageCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tagActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditTag(tag)}
                    >
                      <Edit3 size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteTag(tag)}
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
            <Tag size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No tags yet</Text>
            <Text style={styles.emptyText}>
              Create your first tag to categorize your checklists
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createFirstButtonText}>Create Tag</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Tag Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create New Tag</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter tag name"
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
              maxLength={30}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTagName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, !newTagName.trim() && styles.createButtonDisabled]}
                onPress={handleCreateTag}
                disabled={!newTagName.trim() || isCreating}
              >
                <Text style={styles.createButtonText}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Tag</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter tag name"
              value={editTagName}
              onChangeText={setEditTagName}
              autoFocus
              maxLength={30}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedTag(null);
                  setEditTagName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, !editTagName.trim() && styles.createButtonDisabled]}
                onPress={handleUpdateTag}
                disabled={!editTagName.trim() || isUpdating}
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
        title="Delete Tag"
        message={`Are you sure you want to delete "${selectedTag?.name}"? This will remove the tag from all checklists but won't delete the checklists themselves.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={confirmDeleteTag}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedTag(null);
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
  tagList: {
    padding: 16,
  },
  tagItem: {
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
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagIcon: {
    marginRight: 12,
  },
  tagDetails: {
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tagCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagActions: {
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
