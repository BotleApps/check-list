import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  MessageCircle, 
  Mail, 
  Book, 
  Video, 
  Bug, 
  Star,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const contactOptions = [
    {
      icon: Mail,
      title: 'Email Support',
      subtitle: 'Get help via email (24-48 hour response)',
      action: () => {
        Linking.openURL('mailto:support@checklistapp.com?subject=Support Request');
      },
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      subtitle: 'Chat with our support team (Mon-Fri 9-5 PST)',
      action: () => {
        Alert.alert('Coming Soon', 'Live chat will be available in the next update');
      },
    },
    {
      icon: Bug,
      title: 'Report a Bug',
      subtitle: 'Help us improve by reporting issues',
      action: () => {
        Linking.openURL('mailto:bugs@checklistapp.com?subject=Bug Report');
      },
    },
    {
      icon: Star,
      title: 'Rate the App',
      subtitle: 'Leave a review on the App Store',
      action: () => {
        Alert.alert('Coming Soon', 'App Store rating will be available in the next update');
      },
    },
  ];

  const resourceLinks = [
    {
      icon: Book,
      title: 'User Guide',
      subtitle: 'Complete guide to using the app',
      action: () => {
        Alert.alert('Coming Soon', 'User guide will be available in the next update');
      },
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      subtitle: 'Watch how-to videos and tips',
      action: () => {
        Alert.alert('Coming Soon', 'Video tutorials will be available in the next update');
      },
    },
  ];

  const faqs = [
    {
      question: 'How do I create a new checklist?',
      answer: 'Tap the + button on the home screen or go to any folder and tap "Add Checklist". You can also create checklists from templates in the Templates tab.',
    },
    {
      question: 'Can I share my checklists with others?',
      answer: 'Yes! You can share individual checklists as public templates. Open any checklist, tap the share icon, select a category, and share it with the community.',
    },
    {
      question: 'How do I organize my checklists?',
      answer: 'Use folders (buckets) to organize your checklists by project, category, or any system that works for you. You can also use tags for additional organization.',
    },
    {
      question: 'Can I set due dates for my checklists?',
      answer: 'Yes! When creating or editing a checklist, you can set a due date. Checklists with approaching due dates will be highlighted.',
    },
    {
      question: 'How do I backup my data?',
      answer: 'Your data is automatically synced to the cloud. You can also export your data from the Privacy & Security settings.',
    },
    {
      question: 'Can I use the app offline?',
      answer: 'The app works offline for viewing and editing existing checklists. Changes will sync when you reconnect to the internet.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>How can we help you?</Text>
            <Text style={styles.welcomeSubtitle}>
              Find answers to common questions or get in touch with our support team.
            </Text>
          </View>

          {/* Contact Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Support</Text>
            <View style={styles.sectionContent}>
              {contactOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.title}
                  style={styles.optionItem}
                  onPress={option.action}
                >
                  <View style={styles.optionIconContainer}>
                    <option.icon size={20} color="#2563EB" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  <ExternalLink size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Resources */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resources</Text>
            <View style={styles.sectionContent}>
              {resourceLinks.map((resource, index) => (
                <TouchableOpacity
                  key={resource.title}
                  style={styles.optionItem}
                  onPress={resource.action}
                >
                  <View style={styles.optionIconContainer}>
                    <resource.icon size={20} color="#16A34A" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{resource.title}</Text>
                    <Text style={styles.optionSubtitle}>{resource.subtitle}</Text>
                  </View>
                  <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* FAQ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.sectionContent}>
              {faqs.map((faq, index) => (
                <View key={index}>
                  <TouchableOpacity
                    style={styles.faqItem}
                    onPress={() => toggleFAQ(index)}
                  >
                    <View style={styles.faqContent}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                    </View>
                    {expandedFAQ === index ? (
                      <ChevronUp size={20} color="#6B7280" />
                    ) : (
                      <ChevronDown size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                  {expandedFAQ === index && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Checklist App v1.0.0{'\n'}
              © 2025 Checklist App. All rights reserved.
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
  welcomeCard: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#3730A3',
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
