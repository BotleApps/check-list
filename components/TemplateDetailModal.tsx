import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../store';

import { ChecklistTemplateHeader, ChecklistTemplateItem, GroupedTemplateItems } from '../types/database';
import { LoadingSpinner } from './LoadingSpinner';
import { FolderSelectionModal } from './FolderSelectionModal';
import { TagSelectionModal } from './TagSelectionModal';
import { fetchGroupedTemplateItems } from '../store/slices/templateGroupsSlice';
import { fetchBuckets } from '../store/slices/bucketsSlice';
import { fetchTags } from '../store/slices/tagsSlice';
import { 
  X, 
  Check, 
  Copy, 
  AlertCircle,
  Share,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Folder,
  Tag,
} from 'lucide-react-native';

interface TemplateDetailModalProps {
  visible: boolean;
  template: ChecklistTemplateHeader | null;
  categoryName?: string;
  onClose: () => void;
  onUseTemplate: (bucketId?: string, tags?: string[]) => Promise<void>;
  onShare?: () => void;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  visible,
  template,
  categoryName,
  onClose,
  onUseTemplate,
  onShare,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { tags } = useSelector((state: RootState) => state.tags);
  const { groupedItems, loading: groupsLoading } = useSelector((state: RootState) => state.templateGroups);
  
  // Step management
  const [currentStep, setCurrentStep] = useState<'details' | 'configure'>('details');
  
  // Configuration states for step 2
  const [selectedBucketId, setSelectedBucketId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  
  // Original states
  const [isCreating, setIsCreating] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Get grouped items for the current template
  const currentGroupedItems = template ? groupedItems[template.template_id] || [] : [];

  // Calculate total item count
  const totalItemCount = currentGroupedItems.reduce((total, group) => total + group.items.length, 0);

  // Check if this is a legacy template (all items have group: null)
  const isLegacyTemplate = currentGroupedItems.length === 1 && 
    currentGroupedItems[0]?.group === null && 
    currentGroupedItems[0]?.items.length > 0;

  useEffect(() => {
    if (template && visible) {
      dispatch(fetchGroupedTemplateItems(template.template_id));
    }
  }, [template, visible, dispatch]);

  useEffect(() => {
    if (user && visible) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
    }
  }, [user, visible, dispatch]);

  if (!template) return null;

  // Helper functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSelectedBucketName = () => {
    if (!selectedBucketId) return 'Select Folder';
    const bucket = buckets.find(b => b.bucket_id === selectedBucketId);
    return bucket?.name || 'Select Folder';
  };

  const getBucketName = (bucketId?: string) => {
    if (!bucketId) return 'No folder';
    return buckets.find(b => b.bucket_id === bucketId)?.name || 'Unknown folder';
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleUseTemplate = async () => {
    if (!user) {
      return;
    }
    
    // Move to configuration step
    setCurrentStep('configure');
  };

  const handleClose = () => {
    // Reset all state when closing
    setCurrentStep('details');
    setSelectedBucketId('');
    setSelectedTags([]);
    setTargetDate(null);
    setShowDatePicker(false);
    setShowFolderModal(false);
    setShowTagModal(false);
    onClose();
  };

  const handleBackToDetails = () => {
    setCurrentStep('details');
  };

  const handleCreateChecklist = async () => {
    if (!user) return;
    
    console.log('🔥 Creating checklist with:');
    console.log('🔥 selectedBucketId:', selectedBucketId);
    console.log('🔥 selectedTags:', selectedTags);
    console.log('🔥 targetDate:', targetDate);
    console.log('🔥 buckets available:', buckets.map(b => ({ id: b.bucket_id, name: b.name })));
    
    setIsCreating(true);
    
    try {
      await onUseTemplate(selectedBucketId || undefined, selectedTags);
      // Reset state and close modal
      handleClose();
    } catch (error) {
      console.error('Failed to create checklist from template:', error);
      Alert.alert('Error', 'Failed to create checklist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container}>
          {currentStep === 'details' ? (
            // Step 1: Template Details
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.templateIcon}>
                    <Copy size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.headerTitle}>Template Details</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Template Info */}
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{template.name}</Text>
              {categoryName && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{categoryName}</Text>
                </View>
              )}
              {template.description && (
                <Text style={styles.templateDescription}>{template.description}</Text>
              )}
              <Text style={styles.itemCount}>
                {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Items Preview */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items Preview</Text>
              {groupsLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                currentGroupedItems.map((groupedItem) => (
                  <View key={groupedItem.group?.group_id || 'ungrouped'} style={styles.groupContainer}>
                    {groupedItem.group && (
                      <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() => {
                          const groupId = groupedItem.group!.group_id;
                          setCollapsedGroups(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(groupId)) {
                              newSet.delete(groupId);
                            } else {
                              newSet.add(groupId);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <View style={styles.groupHeaderContent}>
                          <View style={[styles.groupColorIndicator, { backgroundColor: groupedItem.group.color_code }]} />
                          <Text style={styles.groupName}>{groupedItem.group.name}</Text>
                          <Text style={styles.groupItemCount}>({groupedItem.items.length})</Text>
                        </View>
                        {collapsedGroups.has(groupedItem.group.group_id) ? (
                          <ChevronRight size={16} color="#6B7280" />
                        ) : (
                          <ChevronDown size={16} color="#6B7280" />
                        )}
                      </TouchableOpacity>
                    )}
                    
                    {(!groupedItem.group || !collapsedGroups.has(groupedItem.group.group_id)) && (
                      <View style={groupedItem.group ? styles.groupItems : undefined}>
                        {groupedItem.items.map((item) => (
                          <View key={item.item_id} style={styles.itemRow}>
                            <View style={[styles.checkbox, item.is_required && styles.requiredCheckbox]}>
                              {item.is_required && <AlertCircle size={12} color="#F59E0B" />}
                            </View>
                            <View style={styles.itemContent}>
                              <Text style={styles.itemText}>{item.text}</Text>
                              {item.description && (
                                <Text style={styles.itemDescription}>{item.description}</Text>
                              )}
                              {item.is_required && (
                                <Text style={styles.requiredLabel}>Required</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Legacy Template Notice */}
            {isLegacyTemplate && (
              <View style={styles.legacyNotice}>
                <View style={styles.legacyNoticeHeader}>
                  <AlertCircle size={16} color="#F59E0B" />
                  <Text style={styles.legacyNoticeTitle}>Legacy Template</Text>
                </View>
                <Text style={styles.legacyNoticeText}>
                  This template was created before group support was added. Items are displayed without organization. 
                  When you create a checklist from this template, you can organize items into groups manually.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {onShare && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={onShare}
              >
                <Share size={16} color="#6B7280" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.useButton, isCreating && styles.useButtonDisabled]}
              onPress={() => {
                console.log('🔥 TouchableOpacity onPress fired!');
                handleUseTemplate();
              }}
              disabled={isCreating}
            >
              {isCreating ? (
                <LoadingSpinner size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Copy size={16} color="#FFFFFF" />
                  <Text style={styles.useButtonText}>
                    Use Template
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
            </>
          ) : (
            // Step 2: Configure Checklist
            <>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={handleBackToDetails} style={styles.backButton}>
                  <ChevronLeft size={24} color="#007AFF" />
                </TouchableOpacity>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>Configure Checklist</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Template Name Preview */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Checklist Name</Text>
                  <Text style={styles.checklistNamePreview}>{template.name}</Text>
                </View>

                {/* Folder Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Folder</Text>
                  <TouchableOpacity 
                    style={styles.folderButton}
                    onPress={() => setShowFolderModal(true)}
                  >
                    <Folder size={20} color="#007AFF" />
                    <Text style={[styles.folderButtonText, selectedBucketId && styles.folderButtonTextSelected]}>
                      {getSelectedBucketName()}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tags Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Tags</Text>
                  <TouchableOpacity 
                    style={styles.tagsButton}
                    onPress={() => setShowTagModal(true)}
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

                {/* Target Date Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Target Date (Optional)</Text>
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

                {/* Template Preview */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Template Preview</Text>
                  <Text style={styles.itemCount}>
                    {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} will be added to your checklist
                  </Text>
                </View>
              </ScrollView>

              {/* Create Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.createButton, isCreating && styles.createButtonDisabled]}
                  onPress={handleCreateChecklist}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <LoadingSpinner size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.createButtonText}>
                        Create Checklist
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>

        {/* Modals for Step 2 */}
        {currentStep === 'configure' && (
          <>
            <FolderSelectionModal
              visible={showFolderModal}
              selectedFolderId={selectedBucketId}
              onSelect={(folderId) => {
                console.log('🔥 FolderSelectionModal selected folderId:', folderId);
                setSelectedBucketId(folderId);
              }}
              onClose={() => setShowFolderModal(false)}
            />
            
            <TagSelectionModal
              visible={showTagModal}
              selectedTagNames={selectedTags}
              onSelect={setSelectedTags}
              onClose={() => setShowTagModal(false)}
            />

            {/* Date Picker Modal */}
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
                  <DateTimePicker
                    value={targetDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setTargetDate(selectedDate);
                      }
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                </View>
              </SafeAreaView>
            </Modal>
          </>
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  templateInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  templateName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
  },
  templateDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 8,
  },
  itemCount: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  itemsSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredCheckbox: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  requiredLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  useButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    gap: 8,
  },
  useButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  useButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  groupItemCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  groupItems: {
    paddingLeft: 20,
  },
  legacyNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  legacyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legacyNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  legacyNoticeText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  // New styles for configuration step
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  checklistNamePreview: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  folderButtonText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  folderButtonTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  tagsButtonText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  tagsContent: {
    marginLeft: 12,
    flex: 1,
  },
  selectedTagsInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChipInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagChipTextInline: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  dateButtonTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  modalDoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
