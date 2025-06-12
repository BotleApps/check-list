import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChecklistTemplateHeader } from '../types/database';
import { LayoutTemplate } from 'lucide-react-native';

interface TemplateCardProps {
  template: ChecklistTemplateHeader;
  categoryName?: string;
  itemCount: number;
  previewItems?: { text: string; is_required: boolean }[];
  onPress: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  categoryName,
  itemCount,
  previewItems = [],
  onPress,
}) => {
  const handlePress = () => {
    console.log('TemplateCard pressed:', template.template_id);
    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.7}
      delayPressIn={0}
      // Add these props for better iOS compatibility
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      {...(Platform.OS === 'ios' && { 
        underlayColor: 'transparent',
        testID: `template-card-${template.template_id}`
      })}
    >
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
        </View>

        {template.description && (
          <Text style={styles.description} numberOfLines={2}>
            {template.description}
          </Text>
        )}
        
        {/* Preview Items */}
        {previewItems.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Items ({itemCount})</Text>
            {previewItems.slice(0, 2).map((item, index) => (
              <View key={index} style={styles.previewItem}>
                <View style={[styles.previewCheckbox, item.is_required && styles.requiredCheckbox]}>
                  {item.is_required && <Text style={styles.requiredMark}>!</Text>}
                </View>
                <Text style={styles.previewItemText} numberOfLines={1}>
                  {item.text}
                </Text>
              </View>
            ))}
            {itemCount > 2 && (
              <Text style={styles.moreItemsText}>
                +{itemCount - 2} more items
              </Text>
            )}
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
    // Ensure the touch area is properly defined
    minHeight: 80,
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
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  previewSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredCheckbox: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  requiredMark: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  previewItemText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
});