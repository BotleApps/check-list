import React, { useState } from 'react';
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
import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../types/database';
import { LoadingSpinner } from './LoadingSpinner';
import { 
  X, 
  Check, 
  Copy, 
  FolderOpen,
  LayoutTemplate,
  AlertCircle
} from 'lucide-react-native';

interface TemplateDetailModalProps {
  visible: boolean;
  template: ChecklistTemplateHeader | null;
  templateItems: ChecklistTemplateItem[];
  categoryName?: string;
  onClose: () => void;
  onUseTemplate: (bucketId?: string, tags?: string[]) => Promise<void>;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  visible,
  template,
  templateItems,
  categoryName,
  onClose,
  onUseTemplate,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!template) return null;

  const handleUseTemplate = async () => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      await onUseTemplate(selectedFolderId || undefined, []);
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
                {templateItems.length} item{templateItems.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Items Preview */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items Preview</Text>
              {templateItems.map((item, index) => (
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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
});
