import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'default',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                confirmStyle === 'destructive' ? styles.destructiveButton : styles.confirmButton
              ]}
              onPress={onConfirm}
            >
              <Text style={[
                styles.buttonText,
                confirmStyle === 'destructive' ? styles.destructiveButtonText : styles.confirmButtonText
              ]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});
