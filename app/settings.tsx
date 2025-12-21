import React, { useState } from 'react';
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
} from 'lucide-react-native';
import { useTheme } from '../lib/ThemeContext';
import { Toast } from '../components/Toast';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
  const [language, setLanguage] = useState('English');
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    if (item.type === 'switch') {
      return (
        <View key={item.title} style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <item.icon size={20} color="#6B7280" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
            thumbColor={item.value ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.title}
        style={styles.settingItem}
        onPress={item.onPress}
      >
        <View style={styles.settingIconContainer}>
          <item.icon size={20} color="#6B7280" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionContent}>
                {section.items.map(renderSettingItem)}
              </View>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'light' && styles.themeOptionActive]}
              onPress={() => handleThemeSelect('light')}
            >
              <Sun size={20} color={themeMode === 'light' ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.themeOptionText, themeMode === 'light' && styles.themeOptionTextActive]}>
                Light
              </Text>
              {themeMode === 'light' && <Check size={20} color="#2563EB" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionActive]}
              onPress={() => handleThemeSelect('dark')}
            >
              <Moon size={20} color={themeMode === 'dark' ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.themeOptionText, themeMode === 'dark' && styles.themeOptionTextActive]}>
                Dark
              </Text>
              {themeMode === 'dark' && <Check size={20} color="#2563EB" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'system' && styles.themeOptionActive]}
              onPress={() => handleThemeSelect('system')}
            >
              <Monitor size={20} color={themeMode === 'system' ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.themeOptionText, themeMode === 'system' && styles.themeOptionTextActive]}>
                System Default
              </Text>
              {themeMode === 'system' && <Check size={20} color="#2563EB" />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#111827',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
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
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
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
    color: '#374151',
    fontWeight: '500',
  },
  themeOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

