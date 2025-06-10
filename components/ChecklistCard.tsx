import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChecklistHeader } from '../types/database';
import { Calendar, Tag, FolderOpen } from 'lucide-react-native';

interface ChecklistCardProps {
  checklist: ChecklistHeader;
  progress: number;
  itemCount: number;
  completedCount: number;
  bucketName?: string;
  onPress: () => void;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  progress,
  itemCount,
  completedCount,
  bucketName,
  onPress,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isOverdue = checklist.due_date && new Date(checklist.due_date) < new Date();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* First row: Title and completion count */}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {checklist.name}
        </Text>
        <Text style={styles.completionCount}>
          ({completedCount}/{itemCount})
        </Text>
      </View>

      {/* Second row: Folder name (left) and date (right) */}
      <View style={styles.metadataRow}>
        <View style={styles.leftMetadata}>
          {bucketName && (
            <View style={styles.folderContainer}>
              <FolderOpen size={14} color="#6B7280" />
              <Text style={styles.folderText}>{bucketName}</Text>
            </View>
          )}
        </View>
        <View style={styles.rightMetadata}>
          {checklist.due_date && (
            <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
              {formatDate(checklist.due_date)}
            </Text>
          )}
        </View>
      </View>

      {/* Third row: Tags */}
      {checklist.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {checklist.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  completionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftMetadata: {
    flex: 1,
  },
  rightMetadata: {
    alignItems: 'flex-end',
  },
  folderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  folderText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  overdueText: {
    color: '#DC2626',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
});