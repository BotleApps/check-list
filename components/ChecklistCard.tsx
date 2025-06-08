import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChecklistHeader } from '../types/database';
import { ProgressBar } from './ProgressBar';
import { Calendar, Tag } from 'lucide-react-native';

interface ChecklistCardProps {
  checklist: ChecklistHeader;
  progress: number;
  itemCount: number;
  onPress: () => void;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  progress,
  itemCount,
  onPress,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = checklist.target_date && new Date(checklist.target_date) < new Date();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {checklist.name}
        </Text>
        {checklist.target_date && (
          <View style={[styles.dateContainer, isOverdue && styles.overdueDate]}>
            <Calendar size={14} color={isOverdue ? '#DC2626' : '#6B7280'} />
            <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
              {formatDate(checklist.target_date)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressSection}>
        <ProgressBar progress={progress} showPercentage />
        <Text style={styles.itemCount}>{itemCount} items</Text>
      </View>

      {checklist.tags.length > 0 && (
        <View style={styles.tagsSection}>
          <Tag size={14} color="#6B7280" />
          <View style={styles.tags}>
            {checklist.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {checklist.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{checklist.tags.length - 3}</Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  overdueDate: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    color: '#DC2626',
  },
  progressSection: {
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tagsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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