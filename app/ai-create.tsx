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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { 
  ArrowLeft, 
  Wand2, 
  Send, 
  Lightbulb, 
  CheckCircle2
} from 'lucide-react-native';
import { RootState } from '../store';
import { aiChecklistService } from '../services/aiChecklistService';
import { AIChecklistRequest, AIGeneratedChecklist, AIGenerationProgress } from '../services/aiService';

export default function AICreateScreen() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Input states
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedChecklist, setGeneratedChecklist] = useState<AIGeneratedChecklist | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'creating'>('input');
  const [generationProgress, setGenerationProgress] = useState<AIGenerationProgress | null>(null);

  // Example prompts for user inspiration
  const examplePrompts = [
    "Plan a 3-day business trip to Tokyo",
    "Organize a birthday party for my 8-year-old",
    "Prepare for a job interview at a tech company",
    "Weekly house cleaning routine",
    "Launch a small online business",
    "Plan a romantic dinner date at home"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Please enter a description', 'Tell us what kind of checklist you want to create.');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create checklists.');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('preview');
    setGenerationProgress(null);

    try {
      const aiRequest: AIChecklistRequest = {
        prompt: prompt.trim(),
        context: {
          category: '',
          urgency: 'medium',
          timeframe: '',
          complexity: 'detailed',
        },
        preferences: {
          includeSubtasks: true,
          groupByCategory: true,
          addEstimates: false,
        },
      };

      const aiChecklist = await aiChecklistService.generateChecklistPreview(
        aiRequest,
        (progress) => setGenerationProgress(progress)
      );
      setGeneratedChecklist(aiChecklist);
      
    } catch (error) {
      Alert.alert('Generation Failed', 'Failed to generate checklist. Please try again.');
      setCurrentStep('input');
      console.error('AI generation error:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleCreateChecklist = async () => {
    if (!generatedChecklist || !user) return;

    setCurrentStep('creating');

    try {
      const aiRequest: AIChecklistRequest = {
        prompt: prompt.trim(),
        context: {
          category: '',
          urgency: 'medium',
          timeframe: '',
          complexity: 'detailed',
        },
        preferences: {
          includeSubtasks: true,
          groupByCategory: true,
          addEstimates: false,
        },
      };

      const result = await aiChecklistService.generateAndCreateChecklist({
        request: aiRequest,
        userId: user.user_id,
        onProgress: (progress) => setGenerationProgress(progress)
      });
      
      Alert.alert(
        'Success!', 
        `Your AI-generated checklist "${result.name}" has been created with ${result.groupsCreated} groups and ${result.itemsCreated} items!`,
        [{ 
          text: 'View Checklist', 
          onPress: () => router.replace(`/checklist/${result.checklistId}`)
        }]
      );
    } catch (error) {
      Alert.alert('Creation Failed', 'Failed to create checklist. Please try again.');
      setCurrentStep('preview');
      console.error('Checklist creation error:', error);
    }
  };

  // Render input step
  const renderInputStep = () => (
    <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header Description */}
      <View style={styles.introSection}>
        <View style={styles.iconContainer}>
          <Wand2 size={32} color="#3B82F6" />
        </View>
        <Text style={styles.introTitle}>Create with AI</Text>
        <Text style={styles.introDescription}>
          Describe what you want to accomplish, and AI will create a detailed, organized checklist for you.
        </Text>
      </View>

      {/* Main Input */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>What do you want to create a checklist for?</Text>
        <TextInput
          style={styles.promptInput}
          placeholder="e.g., Plan a week-long vacation to Europe, Organize a wedding, Launch a new project..."
          placeholderTextColor="#9CA3AF"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{prompt.length}/500</Text>
      </View>

      {/* Example Prompts */}
      <View style={styles.examplesSection}>
        <View style={styles.examplesHeader}>
          <Lightbulb size={16} color="#F59E0B" />
          <Text style={styles.examplesTitle}>Need inspiration? Try these:</Text>
        </View>
        <View style={styles.examplesContainer}>
          {examplePrompts.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleChip}
              onPress={() => setPrompt(example)}
            >
              <Text style={styles.exampleText}>{example}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // Render preview step
  const renderPreviewStep = () => (
    <ScrollView style={styles.content}>
      {isGenerating ? (
        <View style={styles.generatingContainer}>
          <View style={styles.generatingIcon}>
            <Wand2 size={48} color="#3B82F6" />
          </View>
          <Text style={styles.generatingTitle}>
            {generationProgress?.message || 'Creating your checklist...'}
          </Text>
          <Text style={styles.generatingSubtitle}>
            AI is analyzing your request and generating personalized tasks and groups.
          </Text>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${generationProgress?.progress || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {generationProgress?.progress || 0}%
            </Text>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressSteps}>
            {[
              { key: 'understanding', label: 'Understanding requirements' },
              { key: 'ai-processing', label: 'AI generating content' },
              { key: 'parsing', label: 'Processing response' },
              { key: 'organizing', label: 'Organizing content' },
              { key: 'finalizing', label: 'Finalizing checklist' }
            ].map((step, index) => {
              const isActive = generationProgress?.step === step.key;
              const isCompleted = generationProgress && 
                ['understanding', 'ai-processing', 'parsing', 'organizing', 'finalizing', 'complete']
                  .indexOf(generationProgress.step) > index;
              
              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={[
                    styles.progressStepIcon,
                    isCompleted && styles.progressStepCompleted,
                    isActive && styles.progressStepActive
                  ]}>
                    {isCompleted ? (
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    ) : (
                      <Text style={[
                        styles.progressStepNumber,
                        (isActive || isCompleted) && styles.progressStepNumberActive
                      ]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.progressStepLabel,
                    (isActive || isCompleted) && styles.progressStepLabelActive
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Current Item Being Generated */}
          {generationProgress?.currentGroup && (
            <View style={styles.currentItemContainer}>
              <Text style={styles.currentItemLabel}>Creating:</Text>
              <Text style={styles.currentItemText}>
                {generationProgress.currentGroup}
                {generationProgress.currentItem && ` → ${generationProgress.currentItem}`}
              </Text>
            </View>
          )}
        </View>
      ) : generatedChecklist ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{generatedChecklist.title}</Text>
            {generatedChecklist.description && (
              <Text style={styles.previewDescription}>{generatedChecklist.description}</Text>
            )}
          </View>

          {/* Groups Preview */}
          {generatedChecklist.groups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.groupPreview}>
              <View style={[styles.groupHeader, { borderLeftColor: group.color }]}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description && (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                )}
              </View>
              
              {group.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemPreview}>
                  <View style={styles.itemBullet} />
                  <Text style={styles.itemText}>{item.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentStep === 'input' ? 'Create with AI' : 
             currentStep === 'preview' ? 'Review & Create' : 'Creating...'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content based on current step */}
        {currentStep === 'input' && renderInputStep()}
        {(currentStep === 'preview' || currentStep === 'creating') && renderPreviewStep()}

        {/* Footer Actions */}
        <View style={styles.footer}>
          {currentStep === 'input' && (
            <TouchableOpacity
              style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={!prompt.trim()}
            >
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generate Checklist</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'preview' && !isGenerating && generatedChecklist && (
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.backToEditButton}
                onPress={() => setCurrentStep('input')}
              >
                <Text style={styles.backToEditText}>Edit Request</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateChecklist}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Checklist</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Input Step Styles
  introSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  introDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  promptInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    backgroundColor: '#FAFAFA',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  
  examplesSection: {
    marginBottom: 24,
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },
  examplesContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  exampleChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 0,
  },
  exampleText: {
    fontSize: 14,
    color: '#374151',
  },
  
  // Preview Step Styles
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  generatingIcon: {
    marginBottom: 24,
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  generatingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
  },
  
  // Progress UI Styles
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  progressSteps: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressStepActive: {
    backgroundColor: '#3B82F6',
  },
  progressStepCompleted: {
    backgroundColor: '#10B981',
  },
  progressStepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  progressStepNumberActive: {
    color: '#FFFFFF',
  },
  progressStepLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  progressStepLabelActive: {
    color: '#374151',
    fontWeight: '500',
  },
  
  currentItemContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: 320,
  },
  currentItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  
  previewContainer: {
    paddingVertical: 16,
  },
  previewHeader: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  
  groupPreview: {
    marginBottom: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  
  // Footer Styles
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backToEditButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  backToEditText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  createButton: {
    flex: 2,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
