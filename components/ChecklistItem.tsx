import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChecklistItem as ChecklistItemType } from '../types/database';
import { Check, Circle, Calendar, FileText } from 'lucide-react-native';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: () => void;
  onPress: () => void;
  isLoading?: boolean;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  onToggle,
  onPress,
  isLoading = false,
}) => {
  const isCompleted = item.is_completed;
  const isOverdue = false; // Remove due date functionality for now since it's not in the new schema

  return (
    <View style={[
      styles.container, 
      isCompleted && styles.completed,
      isLoading && styles.loading
    ]}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={onToggle}
        disabled={isLoading}
      >
        {isCompleted ? (
          <View style={styles.checkedBox}>
            <Check size={16} color="#FFFFFF" strokeWidth={2} />
          </View>
        ) : (
          <Circle 
            size={20} 
            color="#6B7280" 
            strokeWidth={2} 
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
      >
        <Text
          style={[
            styles.text,
            isCompleted && styles.completedText,
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>

        <View style={styles.metadata}>
          {item.description && (
            <View style={styles.notesContainer}>
              <FileText size={12} color="#6B7280" />
              <Text style={styles.metadataText} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  completed: {
    opacity: 0.7,
  },
  loading: {
    opacity: 0.5,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkedBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  cancelledText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueDate: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metadataText: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#DC2626',
  },
});