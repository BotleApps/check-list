import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChecklistTemplateHeader } from '../types/database';
import { Trash2, Share } from 'lucide-react-native';
import { ProfileAvatar } from './ProfileAvatar';

interface TemplateCardProps {
  template: ChecklistTemplateHeader;
  categoryName?: string;
  itemCount: number;
  previewItems?: { text: string; is_required: boolean }[];
  creatorName?: string;
  creatorAvatarUrl?: string;
  canDelete?: boolean;
  onPress: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  categoryName,
  itemCount,
  previewItems = [],
  creatorName,
  creatorAvatarUrl,
  canDelete = false,
  onPress,
  onDelete,
  onShare,
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
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      {...(Platform.OS === 'ios' && { 
        underlayColor: 'transparent',
        testID: `template-card-${template.template_id}`
      })}
    >
      <View style={styles.cardContent}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {template.name}
            </Text>
          </View>
          
          <View style={styles.metadata}>
            <View style={styles.metadataLeft}>
              {categoryName && (
                <Text style={styles.category}>{categoryName}</Text>
              )}
            </View>
            <View style={styles.metadataRight}>
              <Text style={styles.itemCount}>{itemCount} items</Text>
            </View>
          </View>

          {template.description && (
            <Text style={styles.description} numberOfLines={2}>
              {template.description}
            </Text>
          )}
        </View>
      </View>
      
      {/* Preview Items */}
      {previewItems.length > 0 && (
        <View style={styles.previewSection}>
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
      
      {/* Bottom Section with Creator Info and Actions */}
      <View style={styles.bottomSection}>
        <View style={styles.creatorSection}>
          {creatorName && (
            <>
              <ProfileAvatar 
                name={creatorName} 
                imageUrl={creatorAvatarUrl} 
                size={24} 
              />
              <Text style={styles.creatorName}>by {creatorName}</Text>
            </>
          )}
        </View>
        
        <View style={styles.actionsSection}>
          {onShare && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onShare();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Share size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
          {canDelete && onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    padding: 20,
    paddingBottom: 0,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
    marginBottom: 6,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  metadataLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  category: {
    fontSize: 12,
    color: '#0891B2',
    fontWeight: '600',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B2F5EA',
    overflow: 'hidden',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 22,
  },
  previewSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: '#FAFBFC',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 2,
  },
  previewCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  requiredCheckbox: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  requiredMark: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  previewItemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
    paddingBottom: 4,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  creatorName: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
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
});