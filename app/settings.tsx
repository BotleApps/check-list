import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  Palette,
  Bell,
  Database,
  Monitor,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../lib/ThemeContext';
import { Toast } from '../components/Toast';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { aiService } from '../services/aiService';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, themeMode, setThemeMode, toggleTheme, theme } = useTheme();
  const [language, setLanguage] = useState('English');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Check if API key is configured on mount
  useEffect(() => {
    const checkApiKey = async () => {
      const isConfigured = await aiService.isApiKeyConfigured();
      setHasApiKey(isConfigured);
    };
    checkApiKey();
  }, []);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const getThemeModeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  };

  const handleThemeSelect = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    setShowThemeModal(false);
    showToastMessage(`Theme changed to ${mode === 'system' ? 'System default' : mode}`);
  };

  const handleSaveApiKey = async (apiKey: string) => {
    const success = await aiService.reinitializeWithKey(apiKey);
    if (success) {
      setHasApiKey(true);
      showToastMessage('API key saved successfully');
    } else {
      throw new Error('Failed to save API key');
    }
  };

  const handleRemoveApiKey = async () => {
    await aiService.removeApiKey();
    setHasApiKey(false);
    showToastMessage('API key removed');
  };

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: isDark ? Moon : Sun,
          title: 'Dark Mode',
          subtitle: isDark ? 'On' : 'Off',
          type: 'switch',
          value: isDark,
          onToggle: () => toggleTheme(),
        },
        {
          icon: Palette,
          title: 'Theme',
          subtitle: getThemeModeLabel(),
          type: 'navigation',
          onPress: () => setShowThemeModal(true),
        },
      ],
    },
    {
      title: 'AI Features',
      items: [
        {
          icon: Sparkles,
          title: 'AI Configuration',
          subtitle: hasApiKey ? 'API Key configured' : 'Configure your Gemini API key',
          type: 'navigation',
          onPress: () => setShowApiKeyModal(true),
        },
      ],
    },
    {
      title: 'Localization',
      items: [
        {
          icon: Globe,
          title: 'Language',
          subtitle: language,
          type: 'navigation',
          onPress: () => {
            showToastMessage('Language selection coming soon');
          },
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          icon: Database,
          title: 'Data Management',
          subtitle: 'Manage your app data and storage',
          type: 'navigation',
          onPress: () => {
            showToastMessage('Data management coming soon');
          },
        },
      ],
    },
  ];

  const renderSettingItem = (item: any) => {
    const dynamicStyles = {
      settingItem: {
        ...styles.settingItem,
        borderBottomColor: theme.border.light,
      },
      settingIconContainer: {
        ...styles.settingIconContainer,
        backgroundColor: theme.input.background,
      },
      settingTitle: {
        ...styles.settingTitle,
        color: theme.text.primary,
      },
      settingSubtitle: {
        ...styles.settingSubtitle,
        color: theme.text.secondary,
      },
    };

    if (item.type === 'switch') {
      return (
        <View key={item.title} style={dynamicStyles.settingItem}>
          <View style={dynamicStyles.settingIconContainer}>
            <item.icon size={20} color={theme.text.secondary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={dynamicStyles.settingTitle}>{item.title}</Text>
            <Text style={dynamicStyles.settingSubtitle}>{item.subtitle}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: theme.border.medium, true: '#2563EB' }}
            thumbColor={item.value ? '#FFFFFF' : theme.input.background}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.title}
        style={dynamicStyles.settingItem}
        onPress={item.onPress}
      >
        <View style={dynamicStyles.settingIconContainer}>
          <item.icon size={20} color={theme.text.secondary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={dynamicStyles.settingTitle}>{item.title}</Text>
          <Text style={dynamicStyles.settingSubtitle}>{item.subtitle}</Text>
        </View>
        <ChevronRight size={20} color={theme.text.tertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.primary, borderBottomColor: theme.border.light }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={[styles.scrollView, { backgroundColor: theme.background.secondary }]}>
        <View style={styles.content}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{section.title}</Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.card.background }]}>
                {section.items.map(renderSettingItem)}
              </View>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
              Settings changes are saved automatically
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowThemeModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Choose Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: theme.background.secondary },
                themeMode === 'light' && styles.themeOptionActive
              ]}
              onPress={() => handleThemeSelect('light')}
            >
              <Sun size={20} color={themeMode === 'light' ? '#2563EB' : theme.text.secondary} />
              <Text style={[
                styles.themeOptionText,
                { color: theme.text.secondary },
                themeMode === 'light' && styles.themeOptionTextActive
              ]}>
                Light
              </Text>
              {themeMode === 'light' && <Check size={20} color="#2563EB" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: theme.background.secondary },
                themeMode === 'dark' && styles.themeOptionActive
              ]}
              onPress={() => handleThemeSelect('dark')}
            >
              <Moon size={20} color={themeMode === 'dark' ? '#2563EB' : theme.text.secondary} />
              <Text style={[
                styles.themeOptionText,
                { color: theme.text.secondary },
                themeMode === 'dark' && styles.themeOptionTextActive
              ]}>
                Dark
              </Text>
              {themeMode === 'dark' && <Check size={20} color="#2563EB" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: theme.background.secondary },
                themeMode === 'system' && styles.themeOptionActive
              ]}
              onPress={() => handleThemeSelect('system')}
            >
              <Monitor size={20} color={themeMode === 'system' ? '#2563EB' : theme.text.secondary} />
              <Text style={[
                styles.themeOptionText,
                { color: theme.text.secondary },
                themeMode === 'system' && styles.themeOptionTextActive
              ]}>
                System Default
              </Text>
              {themeMode === 'system' && <Check size={20} color="#2563EB" />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* API Key Modal */}
      <ApiKeyModal
        visible={showApiKeyModal}
        hasExistingKey={hasApiKey}
        onSave={handleSaveApiKey}
        onRemove={handleRemoveApiKey}
        onClose={() => setShowApiKeyModal(false)}
      />

      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Modal styles
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
    maxWidth: 340,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  themeOptionActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  themeOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  themeOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

