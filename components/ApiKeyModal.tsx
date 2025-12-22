import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { X, Eye, EyeOff, Check, AlertCircle, ExternalLink, Trash2 } from 'lucide-react-native';
import { useTheme } from '../lib/ThemeContext';

interface ApiKeyModalProps {
  visible: boolean;
  hasExistingKey: boolean;
  onSave: (apiKey: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

export function ApiKeyModal({
  visible,
  hasExistingKey,
  onSave,
  onRemove,
  onClose,
}: ApiKeyModalProps) {
  const { theme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    // Validate API key format
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      setError('Invalid API key format. Google AI keys typically start with "AIza"');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave(apiKey.trim());
      setApiKey('');
      onClose();
    } catch (err) {
      setError('Failed to save API key. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setError('');

    try {
      await onRemove();
      setApiKey('');
      onClose();
    } catch (err) {
      setError('Failed to remove API key. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const openGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  const handleClose = () => {
    setApiKey('');
    setError('');
    setShowKey(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.card.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
              AI Configuration
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Status */}
          {hasExistingKey && (
            <View style={styles.statusContainer}>
              <View style={styles.statusIndicator}>
                <Check size={16} color="#10B981" />
              </View>
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                API key is configured
              </Text>
            </View>
          )}

          {/* Info Section */}
          <View style={[styles.infoSection, { backgroundColor: theme.background.secondary }]}>
            <AlertCircle size={16} color="#3B82F6" />
            <Text style={[styles.infoText, { color: theme.text.secondary }]}>
              Your API key is stored securely on your device and is never shared.
            </Text>
          </View>

          {/* API Key Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.text.primary }]}>
              Google Gemini API Key
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input.background,
                    borderColor: error ? '#EF4444' : theme.input.border,
                    color: theme.text.primary,
                  },
                ]}
                placeholder="AIza..."
                placeholderTextColor={theme.input.placeholder}
                value={apiKey}
                onChangeText={(text) => {
                  setApiKey(text);
                  setError('');
                }}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff size={20} color={theme.text.tertiary} />
                ) : (
                  <Eye size={20} color={theme.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>

          {/* Get API Key Link */}
          <TouchableOpacity style={styles.linkButton} onPress={openGoogleAIStudio}>
            <ExternalLink size={16} color="#3B82F6" />
            <Text style={styles.linkText}>Get a free API key from Google AI Studio</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (isSaving || !apiKey.trim()) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving || !apiKey.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {hasExistingKey ? 'Update Key' : 'Save Key'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {hasExistingKey && (
              <TouchableOpacity
                style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
                onPress={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Trash2 size={18} color="#DC2626" />
                    <Text style={styles.removeButtonText}>Remove Key</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <Text style={[styles.helpText, { color: theme.text.tertiary }]}>
            AI features use your API key to generate checklists. Usage is billed by Google based on your API key.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 44,
    fontSize: 14,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  helpText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
