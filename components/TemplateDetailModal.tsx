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
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../store';
import { FolderSelectionModal } from './FolderSelectionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ChecklistTemplateHeader, ChecklistTemplateItem, GroupedTemplateItems } from '../types/database';
import { LoadingSpinner } from './LoadingSpinner';
import { fetchGroupedTemplateItems } from '../store/slices/templateGroupsSlice';
import { 
  X, 
  Check, 
  Copy, 
  FolderOpen,
  LayoutTemplate,
  AlertCircle,
  Share,
  ChevronDown,
  ChevronRight,
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
  const { groupedItems, loading: groupsLoading } = useSelector((state: RootState) => state.templateGroups);
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');
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

  if (!template) return null;

  const handleUseTemplate = async () => {
    if (!user) return;
    
    // Show confirmation dialog
    setShowConfirmationModal(true);
  };

  const confirmUseTemplate = async () => {
    if (!user) return;
    
    setIsCreating(true);
    setShowConfirmationModal(false);
    
    try {
      await onUseTemplate(selectedFolderId || undefined, []);
      // Navigation is handled in the parent component (templates.tsx)
    } catch (error) {
      console.error('Error creating checklist from template:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getBucketName = (bucketId?: string) => {
    if (!bucketId) return 'No folder';
    return buckets.find(b => b.bucket_id === bucketId)?.name || 'Unknown folder';
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.templateIcon}>
                <LayoutTemplate size={20} color="#2563EB" />
              </View>
              <Text style={styles.headerTitle}>Template Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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

            {/* Folder Selection */}
            <View style={styles.optionsSection}>
              <Text style={styles.sectionTitle}>Options</Text>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowFolderModal(true)}
              >
                <FolderOpen size={20} color="#6B7280" />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Folder</Text>
                  <Text style={styles.optionValue}>
                    {getBucketName(selectedFolderId)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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
              onPress={handleUseTemplate}
              disabled={isCreating}
            >
              {isCreating ? (
                <LoadingSpinner size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Copy size={16} color="#FFFFFF" />
                  <Text style={styles.useButtonText}>Use Template</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <FolderSelectionModal
        visible={showFolderModal}
        selectedFolderId={selectedFolderId}
        onSelect={(folderId) => setSelectedFolderId(folderId)}
        onClose={() => setShowFolderModal(false)}
      />

      <ConfirmationModal
        visible={showConfirmationModal}
        title="Create Checklist from Template"
        message={`This will create a new checklist called "${template?.name}" in your ${selectedFolderId ? getBucketName(selectedFolderId) : 'default'} folder. You can then modify it as needed.`}
        confirmText="Create Checklist"
        cancelText="Cancel"
        onConfirm={confirmUseTemplate}
        onCancel={() => setShowConfirmationModal(false)}
      />
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
  optionsSection: {
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionContent: {
    marginLeft: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  optionValue: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
});
