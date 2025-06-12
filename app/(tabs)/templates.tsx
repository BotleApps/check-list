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
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { fetchPublicTemplatesWithPreview, fetchTemplateWithItems, createChecklistFromTemplate, deleteTemplate } from '../../store/slices/templatesSlice';
import { fetchCategories } from '../../store/slices/categoriesSlice';
import { fetchBuckets } from '../../store/slices/bucketsSlice';
import { TemplateCard } from '../../components/TemplateCard';
import { TemplateDetailModal } from '../../components/TemplateDetailModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Toast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Search } from 'lucide-react-native';

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

  useEffect(() => {
    // Fetch public templates with preview - no user dependency needed
    dispatch(fetchPublicTemplatesWithPreview());
    dispatch(fetchCategories());
    if (user) {
      dispatch(fetchBuckets(user.user_id));
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
    // Fetch template details
    await dispatch(fetchTemplateWithItems(templateId));
    setShowTemplateModal(true);
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

        {/* My Templates Toggle */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.myTemplatesToggle,
              showOnlyMyTemplates && styles.myTemplatesToggleActive,
            ]}
            onPress={() => setShowOnlyMyTemplates(!showOnlyMyTemplates)}
          >
            <Text
              style={[
                styles.myTemplatesToggleText,
                showOnlyMyTemplates && styles.myTemplatesToggleTextActive,
              ]}
            >
              My Templates
            </Text>
          </TouchableOpacity>
        </View>

      {/* Category Filter */}
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
        templateItems={currentTemplateItems || []}
        categoryName={selectedTemplate ? getCategoryName(selectedTemplate.category_id) : undefined}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplateId(null);
        }}
        onUseTemplate={handleUseTemplate}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  categoryFilter: {
    marginBottom: 16,
    maxHeight: 50,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
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
});