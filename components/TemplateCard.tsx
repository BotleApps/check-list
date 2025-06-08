import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChecklistTemplateHeader } from '../types/database';
import { LayoutTemplate, Tag } from 'lucide-react-native';

interface TemplateCardProps {
  template: ChecklistTemplateHeader;
  categoryName?: string;
  itemCount: number;
  onPress: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  categoryName,
  itemCount,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <LayoutTemplate size={24} color="#0891B2" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {template.name}
        </Text>
        
        <View style={styles.metadata}>
          {categoryName && (
            <Text style={styles.category}>{categoryName}</Text>
          )}
          <Text style={styles.itemCount}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {template.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Tag size={12} color="#6B7280" />
            <View style={styles.tags}>
              {template.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {template.tags.length > 2 && (
                <Text style={styles.moreTagsText}>+{template.tags.length - 2}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#0891B2',
    fontWeight: '500',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  tagsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
});