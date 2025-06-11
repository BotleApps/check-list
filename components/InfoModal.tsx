import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';

interface InfoModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  title,
  message,
  buttonText = 'OK',
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
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
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
