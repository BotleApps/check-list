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
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Trash2,
  Download,
  FileText,
  AlertTriangle,
} from 'lucide-react-native';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [dataAnalytics, setDataAnalytics] = useState(true);

  const privacySections = [
    {
      title: 'Security',
      items: [
        {
          icon: Lock,
          title: 'Biometric Authentication',
          subtitle: 'Use Face ID or Touch ID to unlock the app',
          type: 'switch',
          value: biometricsEnabled,
          onToggle: setBiometricsEnabled,
        },
        {
          icon: Shield,
          title: 'Change Password',
          subtitle: 'Update your account password',
          type: 'navigation',
          onPress: () => {
            // TODO: Implement password change
            console.log('Password change coming soon');
          },
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: dataAnalytics ? Eye : EyeOff,
          title: 'Usage Analytics',
          subtitle: 'Help improve the app by sharing anonymous usage data',
          type: 'switch',
          value: dataAnalytics,
          onToggle: setDataAnalytics,
        },
        {
          icon: FileText,
          title: 'Privacy Policy',
          subtitle: 'View our privacy policy',
          type: 'navigation',
          onPress: () => {
            // TODO: Open privacy policy
            console.log('Privacy policy coming soon');
          },
        },
      ],
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: Download,
          title: 'Export Data',
          subtitle: 'Download all your checklists and data',
          type: 'navigation',
          onPress: () => {
            // TODO: Implement data export
            console.log('Data export coming soon');
          },
        },
        {
          icon: Trash2,
          title: 'Delete Account',
          subtitle: 'Permanently delete your account and all data',
          type: 'navigation',
          dangerous: true,
          onPress: () => {
            // TODO: Implement account deletion
            console.log('Account deletion coming soon');
          },
        },
      ],
    },
  ];

  const renderPrivacyItem = (item: any) => {
    if (item.type === 'switch') {
      return (
        <View key={item.title} style={styles.privacyItem}>
          <View style={styles.privacyIconContainer}>
            <item.icon size={20} color="#6B7280" />
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>{item.title}</Text>
            <Text style={styles.privacySubtitle}>{item.subtitle}</Text>
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
        style={[
          styles.privacyItem,
          item.dangerous && styles.dangerousItem,
        ]}
        onPress={item.onPress}
      >
        <View style={[
          styles.privacyIconContainer,
          item.dangerous && styles.dangerousIconContainer,
        ]}>
          <item.icon 
            size={20} 
            color={item.dangerous ? '#DC2626' : '#6B7280'} 
          />
        </View>
        <View style={styles.privacyContent}>
          <Text style={[
            styles.privacyTitle,
            item.dangerous && styles.dangerousTitle,
          ]}>
            {item.title}
          </Text>
          <Text style={styles.privacySubtitle}>{item.subtitle}</Text>
        </View>
        {!item.dangerous && (
          <ArrowLeft 
            size={20} 
            color="#9CA3AF" 
            style={{ transform: [{ rotate: '180deg' }] }} 
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={styles.infoText}>
              Your privacy is important to us. We use industry-standard encryption 
              to protect your data and never share personal information with third parties.
            </Text>
          </View>

          {privacySections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionContent}>
                {section.items.map(renderPrivacyItem)}
              </View>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              For questions about privacy and security, contact our support team.
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
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
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dangerousItem: {
    backgroundColor: '#FEF2F2',
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerousIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  dangerousTitle: {
    color: '#DC2626',
  },
  privacySubtitle: {
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
