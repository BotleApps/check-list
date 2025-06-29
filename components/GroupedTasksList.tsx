import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  MoreVertical,
  Edit3,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { GroupedTasks, TaskGroup, ChecklistItem } from '../types/database';
import { ChecklistItem as ChecklistItemComponent } from './ChecklistItem';
import { ProgressBar } from './ProgressBar';

interface GroupedTasksListProps {
  groupedTasks: GroupedTasks[];
  onToggleTask: (taskId: string, isCompleted: boolean) => void;
  onTaskPress: (task: ChecklistItem) => void;
  onTaskLongPress?: (task: ChecklistItem) => void;
  onGroupPress?: (group: TaskGroup) => void;
  onGroupLongPress?: (group: TaskGroup) => void;
  onCreateTask?: (groupId?: string) => void;
  expandedGroups: Set<string>;
  onToggleGroupExpansion: (groupId: string) => void;
  savingTaskId?: string;
  className?: string;
}

export const GroupedTasksList: React.FC<GroupedTasksListProps> = ({
  groupedTasks,
  onToggleTask,
  onTaskPress,
  onTaskLongPress,
  onGroupPress,
  onGroupLongPress,
  onCreateTask,
  expandedGroups,
  onToggleGroupExpansion,
  savingTaskId,
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const isGroupExpanded = (groupId: string | null) => {
    return groupId === null || expandedGroups.has(groupId);
  };

  const renderGroupHeader = (groupData: GroupedTasks) => {
    const { group, completedCount, totalCount, progressPercentage } = groupData;
    
    if (!group) {
      // Ungrouped tasks header
      return (
        <View style={styles.ungroupedHeader}>
          <View style={styles.ungroupedHeaderContent}>
            <Text style={styles.ungroupedTitle}>Other Tasks</Text>
            <Text style={styles.groupStats}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          {totalCount > 0 && (
            <View style={styles.progressBar}>
              <ProgressBar
                progress={progressPercentage}
                height={4}
                backgroundColor="#E5E7EB"
                color="#6B7280"
              />
            </View>
          )}
        </View>
      );
    }

    const isExpanded = isGroupExpanded(group.group_id);
    const isOverdue = group.target_date && new Date(group.target_date) < new Date();

    return (
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => onToggleGroupExpansion(group.group_id)}
        onLongPress={() => onGroupLongPress?.(group)}
      >
        <View style={styles.groupHeaderContent}>
          <View style={styles.groupTitleRow}>
            <View style={styles.groupTitleContainer}>
              <View style={[styles.groupColorDot, { backgroundColor: group.color_code }]} />
              <Text style={styles.groupName}>{group.name}</Text>
              {isExpanded ? (
                <ChevronDown size={16} color="#6B7280" />
              ) : (
                <ChevronRight size={16} color="#6B7280" />
              )}
            </View>
            <View style={styles.groupActions}>
              <Text style={styles.groupStats}>
                {completedCount}/{totalCount}
              </Text>
              <TouchableOpacity
                onPress={() => onGroupPress?.(group)}
                style={styles.groupMenuButton}
              >
                <MoreVertical size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {group.description && (
            <Text style={styles.groupDescription} numberOfLines={2}>
              {group.description}
            </Text>
          )}

          {group.target_date && (
            <View style={styles.groupDateContainer}>
              <Calendar size={14} color={isOverdue ? "#EF4444" : "#6B7280"} />
              <Text style={[styles.groupDate, isOverdue && styles.overdueDate]}>
                Due: {formatDate(group.target_date)}
              </Text>
            </View>
          )}

          {totalCount > 0 && (
            <View style={styles.progressBar}>
              <ProgressBar
                progress={progressPercentage}
                height={6}
                backgroundColor="#E5E7EB"
                color={group.color_code}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskItem = ({ item: task }: { item: ChecklistItem }) => (
    <ChecklistItemComponent
      item={task}
      onToggle={() => onToggleTask(task.item_id, task.is_completed)}
      onPress={() => onTaskPress(task)}
      isLoading={savingTaskId === task.item_id}
    />
  );

  const renderAddTaskButton = (groupId?: string) => (
    <TouchableOpacity
      style={styles.addTaskButton}
      onPress={() => onCreateTask?.(groupId)}
    >
      <Plus size={16} color="#6B7280" />
      <Text style={styles.addTaskText}>Add task</Text>
    </TouchableOpacity>
  );

  const renderGroupSection = ({ item: groupData }: { item: GroupedTasks }) => {
    const { group, tasks } = groupData;
    const isExpanded = isGroupExpanded(group?.group_id || null);

    return (
      <View style={styles.groupSection}>
        {renderGroupHeader(groupData)}
        
        {isExpanded && (
          <View style={styles.groupTasks}>
            <FlatList
              data={tasks}
              keyExtractor={(task) => task.item_id}
              renderItem={renderTaskItem}
              scrollEnabled={false}
            />
            {onCreateTask && renderAddTaskButton(group?.group_id)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedTasks}
        keyExtractor={(groupData, index) => {
          if (groupData.group?.group_id) {
            return groupData.group.group_id;
          }
          // For ungrouped sections, use a stable key based on the first task's checklist_id if available
          const firstTask = groupData.tasks[0];
          return firstTask ? `ungrouped_${firstTask.checklist_id}` : `ungrouped_${index}`;
        }}
        renderItem={renderGroupSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeader: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ungroupedHeader: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  ungroupedHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ungroupedTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  groupHeaderContent: {
    gap: 8,
  },
  groupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  groupColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupStats: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  groupMenuButton: {
    padding: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  groupDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueDate: {
    color: '#EF4444',
    fontWeight: '500',
  },
  progressBar: {
    marginTop: 4,
  },
  groupTasks: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addTaskText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});
