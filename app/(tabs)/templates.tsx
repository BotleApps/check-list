import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { fetchPublicTemplatesWithPreview, fetchTemplateWithItems, createChecklistFromTemplate, deleteTemplate, createTemplateFromChecklist } from '../../store/slices/templatesSlice';
import { fetchCategories } from '../../store/slices/categoriesSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { fetchChecklists } from '../../store/slices/checklistsSlice';
import { TemplateCard } from '../../components/TemplateCard';
import { TemplateDetailModal } from '../../components/TemplateDetailModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Toast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Search, User, Plus, LayoutTemplate } from 'lucide-react-native';

export default function TemplatesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Create template state
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const { user } = useSelector((state: RootState) => state.auth);
  const templatesState = useSelector((state: RootState) => state.templates);
  
  // Ensure we always have safe defaults
  const templatesWithPreview = Array.isArray(templatesState.templatesWithPreview) ? templatesState.templatesWithPreview : [];
  const currentTemplate = templatesState.currentTemplate;
  const currentTemplateItems = templatesState.currentTemplateItems || [];
  const creatorInfo = templatesState.creatorInfo || {};
  const templatesLoading = templatesState.loading || false;
  const templatesError = templatesState.error;
  
  const { categories } = useSelector((state: RootState) => state.categories);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { checklists } = useSelector((state: RootState) => state.checklists);

  useEffect(() => {
    // Fetch public templates with preview - no user dependency needed
    dispatch(fetchPublicTemplatesWithPreview());
    dispatch(fetchCategories());
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchChecklists(user.user_id));
    }
  }, [dispatch, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchPublicTemplatesWithPreview()),
      dispatch(fetchCategories()),
    ]);
    setRefreshing(false);
  };  const handleDeleteTemplate = async (templateId: string) => {
    setTemplateToDelete(templateId);
    setShowDeleteModal(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!user || !templateToDelete || deleting) return;
    
    setDeleting(true);
    try {
      await dispatch(deleteTemplate({ templateId: templateToDelete, userId: user.user_id })).unwrap();
      showToastMessage('Template deleted successfully!');
    } catch (error) {
      console.error('Error deleting template:', error);
      showToastMessage('Failed to delete template. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setTemplateToDelete(null);
    }
  };

  const handleCreateTemplate = () => {
    if (!user) {
      showToastMessage('Please log in to create templates', 'error');
      return;
    }
    
    if (!checklists || checklists.length === 0) {
      showToastMessage('You need to have checklists to create templates from', 'error');
      return;
    }
    
    setShowCreateTemplateModal(true);
  };

  const handleCreateTemplateFromChecklist = async (checklistId: string, templateName: string) => {
    if (!user) return;
    
    setCreatingTemplate(true);
    try {
      await dispatch(createTemplateFromChecklist({
        checklistId,
        userId: user.user_id,
        templateName,
        templateDescription: `Template created from checklist`,
        isPublic: false
      })).unwrap();
      
      showToastMessage('Template created successfully!');
      setShowCreateTemplateModal(false);
      
      // Refresh templates
      dispatch(fetchPublicTemplatesWithPreview());
    } catch (error) {
      console.error('Error creating template:', error);
      showToastMessage('Failed to create template. Please try again.', 'error');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const getCreatorName = (userId: string) => {
    // If it's the current user, show "Me"
    if (userId === user?.user_id) {
      return user.name || 'Me';
    }
    
    // Get the actual user name from the creator info
    const creator = creatorInfo[userId];
    if (creator?.name) {
      return creator.name;
    }
    
    // Fallback to placeholder if no name available
    return `User ${userId.slice(-4)}`;
  };

  const getCreatorAvatarUrl = (userId: string): string | undefined => {
    // For the current user, use their avatar if available
    if (userId === user?.user_id) {
      return user.avatar_url;
    }
    
    // Get the creator avatar from the creator info
    return creatorInfo[userId]?.avatar_url;
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.category_id === categoryId)?.name;
  };

  const handleShareTemplate = (templateId: string) => {
    // For now, just show a simple alert with sharing options
    // In a real app, you'd implement platform-specific sharing
    Alert.alert(
      'Share Template',
      'Share this template with others',
      [
        { text: 'Copy Link', onPress: () => handleCopyTemplateLink(templateId) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCopyTemplateLink = (templateId: string) => {
    // In a real app, you'd copy the template link to clipboard
    // For now, just show a success message
    showToastMessage('Template link copied to clipboard!');
  };

  const handleTemplatePress = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplateModal(true); // Show modal immediately
    
    try {
      // Fetch template details
      await dispatch(fetchTemplateWithItems(templateId));
    } catch (error) {
      console.error('Error fetching template details:', error);
      showToastMessage('Failed to load template details', 'error');
      // Close modal on error
      setShowTemplateModal(false);
      setSelectedTemplateId(null);
    }
  };

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleUseTemplate = async (bucketId?: string, tags: string[] = []) => {
    if (!user || !selectedTemplateId) return;

    try {
      const result = await dispatch(createChecklistFromTemplate({
        templateId: selectedTemplateId,
        userId: user.user_id,
        bucketId,
        tags,
      })).unwrap();

      // Close modal
      setShowTemplateModal(false);
      setSelectedTemplateId(null);

      // Show success toast
      showToastMessage(`Created "${result.name}" from template!`);

      // Navigate to the new checklist
      router.push(`/checklist/${result.checklist_id}`);
    } catch (error) {
      console.error('Error using template:', error);
      showToastMessage('Failed to create checklist from template', 'error');
    }
  };

  const selectedTemplate = selectedTemplateId 
    ? templatesWithPreview.find(t => t.template_id === selectedTemplateId) 
    : null;

  const filteredTemplates = templatesWithPreview.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category_id === selectedCategory;
    
    const matchesOwnership = !showOnlyMyTemplates || template.created_by === user?.user_id;
    
    return matchesSearch && matchesCategory && matchesOwnership;
  });

  if (templatesLoading && templatesWithPreview.length === 0) {
    return <LoadingSpinner />;
  }

  if (templatesError) {
    return (
      <ErrorMessage
        message={templatesError}
        onRetry={() => dispatch(fetchPublicTemplatesWithPreview())}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Templates</Text>
        {user && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateTemplate}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters Row: Sticky My Templates + Scrollable Categories */}
        <View style={styles.filtersContainer}>
          {/* My Templates Toggle - Sticky on the left */}
          <TouchableOpacity
            style={[
              styles.myTemplatesIcon,
              showOnlyMyTemplates && styles.myTemplatesIconActive,
            ]}
            onPress={() => setShowOnlyMyTemplates(!showOnlyMyTemplates)}
          >
            <User size={18} color={showOnlyMyTemplates ? "#FFFFFF" : "#6B7280"} />
          </TouchableOpacity>

          {/* Category Filter - Scrollable */}
          {categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilter}
              contentContainerStyle={styles.categoryFilterContent}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    !selectedCategory && styles.categoryChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.category_id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.category_id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(
                    selectedCategory === category.category_id ? null : category.category_id
                  )}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category.category_id && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(template => (
            <TemplateCard
              key={template.template_id}
              template={template}
              categoryName={getCategoryName(template.category_id)}
              itemCount={template.item_count}
              previewItems={template.preview_items}
              creatorName={getCreatorName(template.created_by)}
              creatorAvatarUrl={getCreatorAvatarUrl(template.created_by)}
              canDelete={template.created_by === user?.user_id}
              onPress={() => handleTemplatePress(template.template_id)}
              onDelete={() => handleDeleteTemplate(template.template_id)}
              onShare={() => handleShareTemplate(template.template_id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory 
                ? 'No templates found' 
                : 'No templates yet'
              }
            </Text>
            {!searchQuery && !selectedCategory && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => {
                  // TODO: Implement template creation route
                  Alert.alert('Coming Soon', 'Template creation will be available soon');
                }}
              >
                <Text style={styles.createFirstButtonText}>Create your first template</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      </View>
      
      <TemplateDetailModal
        visible={showTemplateModal}
        template={selectedTemplate || null}
        categoryName={selectedTemplate ? getCategoryName(selectedTemplate.category_id) : undefined}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplateId(null);
        }}
        onUseTemplate={handleUseTemplate}
        onShare={() => selectedTemplateId && handleShareTemplate(selectedTemplateId)}
      />

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
      
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={confirmDeleteTemplate}
        onCancel={() => {
          setShowDeleteModal(false);
          setTemplateToDelete(null);
        }}
      />

      {/* Create Template Modal */}
      <Modal
        visible={showCreateTemplateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateTemplateModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Template</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Select a checklist to create a template from. The template will copy all items and groups from your checklist.
            </Text>
            
            {checklists && checklists.length > 0 ? (
              checklists.map((checklist) => (
                <TouchableOpacity
                  key={checklist.checklist_id}
                  style={styles.checklistItem}
                  onPress={() => {
                    Alert.prompt(
                      'Template Name',
                      'Enter a name for your template:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Create',
                          onPress: (templateName) => {
                            if (templateName && templateName.trim()) {
                              handleCreateTemplateFromChecklist(checklist.checklist_id, templateName.trim());
                            }
                          }
                        }
                      ],
                      'plain-text',
                      checklist.name + ' Template'
                    );
                  }}
                  disabled={creatingTemplate}
                >
                  <View style={styles.checklistItemContent}>
                    <LayoutTemplate size={20} color="#2563EB" />
                    <View style={styles.checklistItemText}>
                      <Text style={styles.checklistItemName}>{checklist.name}</Text>
                      {checklist.description && (
                        <Text style={styles.checklistItemDescription}>{checklist.description}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No checklists found</Text>
                <Text style={styles.emptySubtext}>
                  Create some checklists first to make templates from them.
                </Text>
              </View>
            )}
            
            {creatingTemplate && (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size="small" />
                <Text style={styles.loadingText}>Creating template...</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
    color: '#111827',
    lineHeight: 20,
  },
  categoryFilter: {
    flex: 1,
    maxHeight: 50,
  },
  categoryFilterContent: {
    paddingRight: 16,
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 12,
  },
  myTemplatesIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myTemplatesIconActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  myTemplatesToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  myTemplatesToggleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  myTemplatesToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  myTemplatesToggleTextActive: {
    color: '#FFFFFF',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  checklistItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checklistItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  checklistItemText: {
    flex: 1,
  },
  checklistItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  checklistItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});