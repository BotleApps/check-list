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
  ActivityIndicator,
  Modal,
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
  X,
  Edit3,
  Trash2,
  Plus,
  Check
} from 'lucide-react-native';
import { RootState, AppDispatch } from '../store';
import { aiChecklistService } from '../services/aiChecklistService';
import { AIChecklistRequest, AIGeneratedChecklist, AIGenerationProgress } from '../services/aiService';
import { FolderSelectionModal } from '../components/FolderSelectionModal';
import { TagSelectionModal } from '../components/TagSelectionModal';
import { Toast } from '../components/Toast';
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
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'edit' | 'configure' | 'creating'>('input');
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
  
  // Edit mode states
  const [editableChecklist, setEditableChecklist] = useState<AIGeneratedChecklist | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Load buckets and tags when component mounts
  useEffect(() => {
    if (user) {
      dispatch(fetchBuckets(user.user_id));
      dispatch(fetchTags());
    }
  }, [user, dispatch]);

  // Toast helper function
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

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

  const handleEditChecklist = () => {
    if (!generatedChecklist) return;
    
    // Create a copy for editing
    setEditableChecklist(JSON.parse(JSON.stringify(generatedChecklist)));
    setCurrentStep('edit');
  };

  const handleBackToPreview = () => {
    if (currentStep === 'edit') {
      // Update the original checklist with edits
      if (editableChecklist) {
        setGeneratedChecklist(editableChecklist);
      }
    }
    setCurrentStep('preview');
  };

  const handleRemoveItem = (groupIndex: number, itemIndex: number) => {
    if (!editableChecklist) return;
    
    const updatedChecklist = { ...editableChecklist };
    updatedChecklist.groups[groupIndex].items.splice(itemIndex, 1);
    
    // Reorder remaining items
    updatedChecklist.groups[groupIndex].items.forEach((item, index) => {
      item.order = index;
    });
    
    setEditableChecklist(updatedChecklist);
  };

  const handleEditItem = (groupIndex: number, itemIndex: number, newText: string, newDescription?: string) => {
    if (!editableChecklist) return;
    
    const updatedChecklist = { ...editableChecklist };
    updatedChecklist.groups[groupIndex].items[itemIndex] = {
      ...updatedChecklist.groups[groupIndex].items[itemIndex],
      text: newText,
      description: newDescription || ''
    };
    
    setEditableChecklist(updatedChecklist);
    setEditingItemId(null);
  };

  const handleAddItem = (groupIndex: number) => {
    if (!editableChecklist) return;
    
    const updatedChecklist = { ...editableChecklist };
    const newItem = {
      text: 'New item',
      description: '',
      order: updatedChecklist.groups[groupIndex].items.length
    };
    
    updatedChecklist.groups[groupIndex].items.push(newItem);
    setEditableChecklist(updatedChecklist);
    
    // Start editing the new item
    setEditingItemId(`${groupIndex}-${newItem.order}`);
  };

  const handleBackToInput = () => {
    setCurrentStep('input');
  };

  // Handle checklist creation
  const handleCreateChecklist = async () => {
    if (!generatedChecklist || !user) return;

    setIsCreating(true);
    setCurrentStep('creating');
    // Don't set any progress for the creation step - keep it simple

    try {
      const result = await aiChecklistService.createChecklistFromAI({
        generatedChecklist,
        userId: user.user_id,
        bucketId: selectedBucketId || undefined,
        checklistName: checklistTitle,
        dueDate: targetDate?.toISOString(),
        tagIds: selectedTags,
        // Don't pass onProgress to keep the creation step simple
      });
      
      // Show success toast and navigate directly
      showToastMessage(`Checklist "${result.name}" created successfully!`, 'success');
      
      // Navigate to the created checklist after a short delay to show the toast
      setTimeout(() => {
        router.replace(`/checklist/${result.checklistId}`);
      }, 1000);
      
    } catch (error) {
      showToastMessage('Failed to create checklist. Please try again.', 'error');
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
      {currentStep === 'creating' ? (
        // Simple loading state for database creation
        <View style={styles.generatingContainer}>
          <View style={styles.generatingIcon}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
          <Text style={styles.generatingTitle}>Creating your checklist...</Text>
          <Text style={styles.generatingSubtitle}>
            Saving your checklist to the database. This will only take a moment.
          </Text>
        </View>
      ) : isGenerating ? (
        // Detailed progress for AI generation
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

  // Render edit step - allows editing the AI generated checklist
  const renderEditStep = () => (
    <ScrollView style={styles.content}>
      {editableChecklist && (
        <View style={styles.previewContainer}>
          {/* Edit Header */}
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Edit Your Checklist</Text>
            <Text style={styles.editSubtitle}>
              Add, remove, or modify items before creating your checklist
            </Text>
          </View>

          {/* Editable Groups and Items */}
          <View style={styles.itemsSection}>
            {editableChecklist.groups.map((group, groupIndex) => (
              <View key={group.order} style={styles.editGroupContainer}>
                <View style={styles.editGroupHeader}>
                  <View style={[styles.groupColorIndicator, { backgroundColor: group.color }]} />
                  <Text style={styles.groupName}>{group.name}</Text>
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => handleAddItem(groupIndex)}
                  >
                    <Plus size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.editItemsList}>
                  {group.items.map((item, itemIndex) => {
                    const itemId = `${groupIndex}-${itemIndex}`;
                    const isEditing = editingItemId === itemId;
                    
                    return (
                      <View key={itemIndex} style={styles.editItemRow}>
                        {isEditing ? (
                          <View style={styles.editItemInput}>
                            <TextInput
                              style={styles.itemTextInput}
                              value={item.text}
                              onChangeText={(text) => {
                                const updatedChecklist = { ...editableChecklist };
                                updatedChecklist.groups[groupIndex].items[itemIndex].text = text;
                                setEditableChecklist(updatedChecklist);
                              }}
                              placeholder="Item text"
                              autoFocus
                            />
                            <View style={styles.editItemActions}>
                              <TouchableOpacity
                                style={styles.saveButton}
                                onPress={() => setEditingItemId(null)}
                              >
                                <Check size={16} color="#10B981" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.viewItemRow}>
                            <View style={styles.itemContent}>
                              <Text style={styles.itemText}>{item.text}</Text>
                              {item.description && (
                                <Text style={styles.itemDescription}>{item.description}</Text>
                              )}
                            </View>
                            <View style={styles.itemActions}>
                              <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setEditingItemId(itemId)}
                              >
                                <Edit3 size={16} color="#6B7280" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleRemoveItem(groupIndex, itemIndex)}
                              >
                                <Trash2 size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
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
          {currentStep === 'configure' || currentStep === 'edit' ? (
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
             currentStep === 'edit' ? 'Edit Checklist' :
             currentStep === 'configure' ? 'Configure Checklist' : 'Creating...'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content based on current step */}
        {currentStep === 'input' && renderInputStep()}
        {(currentStep === 'preview' || currentStep === 'creating') && renderPreviewStep()}
        {currentStep === 'edit' && renderEditStep()}
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
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.createButton, styles.secondaryButton]}
                onPress={handleEditChecklist}
              >
                <Edit3 size={18} color="#007AFF" style={{ marginRight: 8 }} />
                <Text style={[styles.createButtonText, styles.secondaryButtonText]}>Edit Items</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleUseTemplate}
              >
                <ChevronRight size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.createButtonText}>Continue to Configure</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {currentStep === 'edit' && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleBackToPreview}
            >
              <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.createButtonText}>Done Editing</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'configure' && (
            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateChecklist}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.createButtonText}>Creating...</Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.createButtonText}>Create Checklist</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {currentStep === 'creating' && (
            <View style={[styles.createButton, styles.createButtonDisabled]}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.createButtonText}>Creating...</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity 
                style={styles.modalDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={targetDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTargetDate(selectedDate);
                  }
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                  }
                }}
                minimumDate={new Date()}
              />
            </View>
          </SafeAreaView>
        </Modal>
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
      
      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
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
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
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
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  dateButtonTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  folderButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  folderButtonTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagsButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  tagsButtonTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
  
  // Modal styles for date picker
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  modalDoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  
  // Edit mode styles
  editHeader: {
    marginBottom: 24,
    textAlign: 'center',
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  editSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  editGroupContainer: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  editGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addItemButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  editItemsList: {
    paddingVertical: 8,
  },
  editItemRow: {
    marginBottom: 4,
  },
  editItemInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  itemTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  editItemActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  saveButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  viewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  
  // Button row and secondary button styles
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#007AFF',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});
