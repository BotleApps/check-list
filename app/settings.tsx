import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
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
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('System');

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: isDarkMode ? Moon : Sun,
          title: 'Dark Mode',
          subtitle: 'Toggle dark mode appearance',
          type: 'switch',
          value: isDarkMode,
          onToggle: setIsDarkMode,
        },
        {
          icon: Palette,
          title: 'Theme',
          subtitle: theme,
          type: 'navigation',
          onPress: () => {
            // TODO: Implement theme selection
            console.log('Theme selection coming soon');
          },
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
            // TODO: Implement language selection
            console.log('Language selection coming soon');
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
            // TODO: Implement data management
            console.log('Data management coming soon');
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
});
