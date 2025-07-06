import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ArrowLeft, 
  Wand2, 
  Send, 
  Lightbulb, 
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Folder,
  Tag,
  Copy,
  X
} from 'lucide-react-native';
import { RootState, AppDispatch } from '../store';
import { aiChecklistService } from '../services/aiChecklistService';
import { AIChecklistRequest, AIGeneratedChecklist, AIGenerationProgress } from '../services/aiService';
import { FolderSelectionModal } from '../components/FolderSelectionModal';
import { TagSelectionModal } from '../components/TagSelectionModal';
import { fetchBuckets } from '../store/slices/bucketsSlice';
import { fetchTags } from '../store/slices/tagsSlice';

export default function AICreateScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { buckets } = useSelector((state: RootState) => state.buckets);
  const { tags } = useSelector((state: RootState) => state.tags);
  
  // Input states
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedChecklist, setGeneratedChecklist] = useState<AIGeneratedChecklist | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'configure' | 'creating'>('input');
  const [generationProgress, setGenerationProgress] = useState<AIGenerationProgress | null>(null);
  
  // Configuration states for step 3
  const [checklistTitle, setChecklistTitle] = useState<string>('');
  const [selectedBucketId, setSelectedBucketId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  // Load buckets and tags when component mounts
  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
    }
  }, [user, dispatch]);

  // Helper functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSelectedBucketName = () => {
    if (!selectedBucketId) return 'Select Folder';
    const bucket = buckets.find(b => b.bucket_id === selectedBucketId);
    return bucket?.name || 'Select Folder';
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

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

  const handleUseTemplate = () => {
    if (!generatedChecklist) return;
    
    // Set default checklist title
    setChecklistTitle(generatedChecklist.title);
    
    // Move to configuration step
    setCurrentStep('configure');
  };

  const handleBackToPreview = () => {
    setCurrentStep('preview');
  };

  const handleBackToInput = () => {
    setCurrentStep('input');
  };

  const handleCreateChecklist = async () => {
    if (!generatedChecklist || !user) return;

    setIsCreating(true);
    setCurrentStep('creating');
    setGenerationProgress({
      step: 'organizing',
      message: 'Creating your checklist in the database...',
      progress: 0
    });

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
        bucketId: selectedBucketId || undefined,
        checklistName: checklistTitle,
        dueDate: targetDate?.toISOString(),
        tagIds: selectedTags,
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
      setCurrentStep('configure');
      console.error('Checklist creation error:', error);
    } finally {
      setIsCreating(false);
      setGenerationProgress(null);
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

  // Render preview step - shows AI generated checklist like template details
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
          {/* Checklist Info */}
          <View style={styles.checklistInfo}>
            <Text style={styles.checklistName}>{generatedChecklist.title}</Text>
            {generatedChecklist.description && (
              <Text style={styles.checklistDescription}>{generatedChecklist.description}</Text>
            )}
            <Text style={styles.itemCount}>
              {generatedChecklist.groups.reduce((total, group) => total + group.items.length, 0)} items
            </Text>
          </View>

          {/* Items Preview */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items Preview</Text>
            {generatedChecklist.groups.map((group) => (
              <View key={group.order} style={styles.groupContainer}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => {
                    setCollapsedGroups(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(group.order)) {
                        newSet.delete(group.order);
                      } else {
                        newSet.add(group.order);
                      }
                      return newSet;
                    });
                  }}
                >
                  <View style={styles.groupHeaderContent}>
                    <View style={[styles.groupColorIndicator, { backgroundColor: group.color }]} />
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupItemCount}>({group.items.length})</Text>
                  </View>
                  {collapsedGroups.has(group.order) ? (
                    <ChevronRight size={16} color="#6B7280" />
                  ) : (
                    <ChevronDown size={16} color="#6B7280" />
                  )}
                </TouchableOpacity>
                
                {!collapsedGroups.has(group.order) && (
                  <View style={styles.groupItems}>
                    {group.items.map((item) => (
                      <View key={item.order} style={styles.itemRow}>
                        <View style={styles.checkbox} />
                        <View style={styles.itemContent}>
                          <Text style={styles.itemText}>{item.text}</Text>
                          {item.description && (
                            <Text style={styles.itemDescription}>{item.description}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );

  // Render configure step - shows configuration options
  const renderConfigureStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Checklist Title */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Checklist Name</Text>
        <TextInput
          style={styles.titleInput}
          value={checklistTitle}
          onChangeText={setChecklistTitle}
          placeholder="Enter checklist name"
          maxLength={100}
        />
      </View>

      {/* Target Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Target Date (Optional)</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={20} color="#007AFF" />
          <Text style={[styles.dateButtonText, targetDate && styles.dateButtonTextSelected]}>
            {targetDate ? formatDate(targetDate) : 'Select date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Folder Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Folder</Text>
        <TouchableOpacity 
          style={styles.folderButton}
          onPress={() => setShowFolderModal(true)}
        >
          <Folder size={20} color="#007AFF" />
          <Text style={[styles.folderButtonText, selectedBucketId && styles.folderButtonTextSelected]}>
            {getSelectedBucketName()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tags Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <TouchableOpacity 
          style={styles.tagsButton}
          onPress={() => setShowTagModal(true)}
        >
          <Tag size={20} color="#007AFF" />
          <Text style={[styles.tagsButtonText, selectedTags.length > 0 && styles.tagsButtonTextSelected]}>
            {selectedTags.length > 0 ? selectedTags.join(', ') : 'Add tags'}
          </Text>
        </TouchableOpacity>
      </View>
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
          {currentStep === 'configure' ? (
            <TouchableOpacity onPress={handleBackToPreview} style={styles.backButton}>
              <ChevronLeft size={24} color="#007AFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => currentStep === 'preview' ? handleBackToInput() : router.back()}
            >
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {currentStep === 'input' ? 'Create with AI' : 
             currentStep === 'preview' ? 'AI Generated Checklist' : 
             currentStep === 'configure' ? 'Configure Checklist' : 'Creating...'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content based on current step */}
        {currentStep === 'input' && renderInputStep()}
        {(currentStep === 'preview' || currentStep === 'creating') && renderPreviewStep()}
        {currentStep === 'configure' && renderConfigureStep()}

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
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleUseTemplate}
            >
              <Copy size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Use Template</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'configure' && (
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateChecklist}
              disabled={isCreating}
            >
              {isCreating ? (
                <Text style={styles.createButtonText}>Creating...</Text>
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Checklist</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={targetDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setTargetDate(selectedDate);
            }
          }}
        />
      )}
      
      {/* Folder Selection Modal */}
      <FolderSelectionModal
        visible={showFolderModal}
        selectedFolderId={selectedBucketId}
        onSelect={(bucketId: string) => {
          setSelectedBucketId(bucketId);
          setShowFolderModal(false);
        }}
        onClose={() => setShowFolderModal(false)}
      />
      
      {/* Tag Selection Modal */}
      <TagSelectionModal
        visible={showTagModal}
        selectedTagNames={selectedTags}
        onSelect={(tagNames: string[]) => {
          setSelectedTags(tagNames);
          setShowTagModal(false);
        }}
        onClose={() => setShowTagModal(false)}
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
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  
  // Template-style preview styles
  checklistInfo: {
    marginBottom: 24,
  },
  checklistName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  checklistDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 8,
  },
  itemCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  itemsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  groupContainer: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  groupItemCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  groupItems: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  
  // Configuration step styles
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  dateButtonTextSelected: {
    color: '#111827',
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  folderButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  folderButtonTextSelected: {
    color: '#111827',
  },
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tagsButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  tagsButtonTextSelected: {
    color: '#111827',
  },
});
