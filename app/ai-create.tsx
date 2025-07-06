import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wand2, Send } from 'lucide-react-native';

export default function AICreateScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Please enter a description', 'Tell us what kind of checklist you want to create.');
      return;
    }

    setIsGenerating(true);
    
    // TODO: Implement AI generation logic here
    // For now, show a placeholder message
    setTimeout(() => {
      setIsGenerating(false);
      Alert.alert(
        'AI Feature Coming Soon',
        'AI-powered checklist generation will be available in a future update!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create with AI</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Wand2 size={32} color="#2563EB" />
          </View>
          <Text style={styles.heroTitle}>AI-Powered Checklist</Text>
          <Text style={styles.heroSubtitle}>
            Describe what you want to accomplish, and our AI will create a comprehensive checklist for you.
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>What would you like to create a checklist for?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Planning a wedding, Moving to a new house, Launching a startup, Preparing for a vacation..."
            placeholderTextColor="#9CA3AF"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Examples Section */}
        <View style={styles.examplesSection}>
          <Text style={styles.examplesTitle}>Example prompts:</Text>
          {[
            'Plan a birthday party for 20 people',
            'Prepare for a job interview at a tech company',
            'Organize a camping trip for the weekend',
            'Launch an online course',
            'Renovate my kitchen',
          ].map((example, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleItem}
              onPress={() => setPrompt(example)}
            >
              <Text style={styles.exampleText}>"{example}"</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Generate Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            !prompt.trim() && styles.generateButtonDisabled,
            isGenerating && styles.generateButtonLoading,
          ]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          <Send size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate Checklist'}
          </Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 120,
  },
  examplesSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  exampleItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonLoading: {
    backgroundColor: '#4F46E5',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
