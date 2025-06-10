import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bucket } from '../types/database';
import { Folder } from 'lucide-react-native';

interface BucketCardProps {
  bucket: Bucket;
  checklistCount: number;
  onPress: () => void;
}

export const BucketCard: React.FC<BucketCardProps> = ({
  bucket,
  checklistCount,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Folder size={24} color="#2563EB" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {bucket.name}
        </Text>
        <Text style={styles.subtitle}>
          {checklistCount} checklist{checklistCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#EFF6FF',
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
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});