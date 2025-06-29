import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { X, Plus, Calendar, Palette } from 'lucide-react-native';
import { TaskGroup } from '../types/database';

interface TaskGroupManagerProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, description?: string, targetDate?: string, colorCode?: string) => Promise<void>;
  onUpdateGroup: (groupId: string, updates: Partial<TaskGroup>) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  existingGroup?: TaskGroup | null;
  checklistId: string;
}

const PRESET_COLORS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export const TaskGroupManager: React.FC<TaskGroupManagerProps> = ({
  visible,
  onClose,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  existingGroup,
  checklistId,
}) => {
  const [name, setName] = useState(existingGroup?.name || '');
  const [description, setDescription] = useState(existingGroup?.description || '');
  const [targetDate, setTargetDate] = useState(existingGroup?.target_date || '');
  const [selectedColor, setSelectedColor] = useState(existingGroup?.color_code || PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const isEditing = !!existingGroup;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && existingGroup) {
        await onUpdateGroup(existingGroup.group_id, {
          name: name.trim(),
          description: description.trim() || undefined,
          target_date: targetDate || undefined,
          color_code: selectedColor,
        });
      } else {
        await onCreateGroup(
          name.trim(),
          description.trim() || undefined,
          targetDate || undefined,
          selectedColor
        );
      }
      handleClose();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} group`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existingGroup) return;

    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${existingGroup.name}"? Tasks in this group will become ungrouped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await onDeleteGroup(existingGroup.group_id);
              handleClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete group');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setName(existingGroup?.name || '');
    setDescription(existingGroup?.description || '');
    setTargetDate(existingGroup?.target_date || '');
    setSelectedColor(existingGroup?.color_code || PRESET_COLORS[0]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Group' : 'New Group'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter group name"
              maxLength={100}
              autoFocus
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter group description"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Target Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Date (Optional)</Text>
            <View style={styles.dateInputContainer}>
              <Calendar size={20} color="#6B7280" style={styles.dateIcon} />
              <TextInput
                style={[styles.input, styles.dateInput]}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorContainer}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading || !name.trim()}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : isEditing ? 'Update Group' : 'Create Group'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleDelete}
                disabled={loading}
              >
                <Text style={styles.deleteButtonText}>Delete Group</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dateIcon: {
    marginLeft: 16,
  },
  dateInput: {
    flex: 1,
    borderWidth: 0,
    marginLeft: 8,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#111827',
  },
  colorCheckmark: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#111827',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    marginTop: 32,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
