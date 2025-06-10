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
import { fetchPublicTemplatesWithPreview } from '../../store/slices/templatesSlice';
import { fetchCategories } from '../../store/slices/categoriesSlice';
import { TemplateCard } from '../../components/TemplateCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Plus, Search } from 'lucide-react-native';

export default function TemplatesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const { templatesWithPreview = [], loading: templatesLoading, error: templatesError } = useSelector(
    (state: RootState) => state.templates
  );
  const { categories } = useSelector((state: RootState) => state.categories);

  useEffect(() => {
    // Fetch public templates with preview - no user dependency needed
    dispatch(fetchPublicTemplatesWithPreview());
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchPublicTemplatesWithPreview()),
      dispatch(fetchCategories()),
    ]);
    setRefreshing(false);
  };  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.category_id === categoryId)?.name;
  };

  const filteredTemplates = templatesWithPreview.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
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
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            // TODO: Implement template creation route
            Alert.alert('Coming Soon', 'Template creation will be available soon');
          }}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
      >
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(template => (
            <TemplateCard
              key={template.template_id}
              template={template}
              categoryName={getCategoryName(template.category_id)}
              itemCount={template.item_count}
              previewItems={template.preview_items}
              onPress={() => {
                // TODO: Implement template details modal with "Use Template" option
                Alert.alert('Template Details', 'Template detail view with Use Template option coming soon!');
              }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
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
});