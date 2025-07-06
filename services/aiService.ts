import { GoogleGenerativeAI } from '@google/generative-ai';

// AI Request and Response Interfaces
export interface AIChecklistRequest {
  prompt: string;
  context: {
    category?: string;
    urgency?: string;
    timeframe?: string;
    complexity?: string;
  };
  preferences: {
    includeSubtasks: boolean;
    groupByCategory: boolean;
    addEstimates: boolean;
  };
}

export interface AIGeneratedChecklist {
  title: string;
  description?: string;
  estimatedDuration?: string;
  groups: AIGeneratedGroup[];
  metadata: {
    category: string;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
  };
}

export interface AIGeneratedGroup {
  name: string;
  description?: string;
  color: string;
  items: AIGeneratedItem[];
  order: number;
}

export interface AIGenerationProgress {
  step: 'understanding' | 'generating-groups' | 'creating-items' | 'finalizing';
  message: string;
  progress: number; // 0-100
  currentGroup?: string;
  currentItem?: string;
}

export type ProgressCallback = (progress: AIGenerationProgress) => void;

export interface AIGeneratedItem {
  text: string;
  description?: string;
  estimatedTime?: string;
  priority?: 'low' | 'medium' | 'high';
  order: number;
}

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'Missing Gemini API key. Please check your .env file and ensure EXPO_PUBLIC_GEMINI_API_KEY is set.'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateChecklist(
    request: AIChecklistRequest, 
    onProgress?: ProgressCallback
  ): Promise<AIGeneratedChecklist> {
    try {
      // Step 1: Understanding requirements
      onProgress?.({
        step: 'understanding',
        message: 'Analyzing your requirements...',
        progress: 10
      });

      const prompt = this.buildPrompt(request);
      
      // Step 2: Generating groups
      onProgress?.({
        step: 'generating-groups',
        message: 'Creating task groups...',
        progress: 30
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Step 3: Creating items
      onProgress?.({
        step: 'creating-items',
        message: 'Generating checklist items...',
        progress: 70
      });

      // Parse the JSON response from Gemini
      const parsedResponse = this.parseGeminiResponse(text);
      
      // Step 4: Finalizing
      onProgress?.({
        step: 'finalizing',
        message: 'Finalizing your checklist...',
        progress: 90
      });

      // Validate and format the response
      const result_formatted = this.formatResponse(parsedResponse, request);

      onProgress?.({
        step: 'finalizing',
        message: 'Complete!',
        progress: 100
      });

      return result_formatted;
    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error('Failed to generate checklist. Please try again.');
    }
  }

  private buildPrompt(request: AIChecklistRequest): string {
    const { prompt, context, preferences } = request;

    const systemInstructions = `You are an expert task organizer and productivity consultant. Your job is to create detailed, well-organized checklists based on user requirements.

IMPORTANT: Your response must be a valid JSON object with the exact structure shown below. Do not include any additional text, explanations, or markdown formatting.

Required JSON Structure:
{
  "title": "Clear, concise checklist title",
  "description": "Brief description of what this checklist accomplishes",
  "estimatedDuration": "Overall time estimate (only if requested)",
  "groups": [
    {
      "name": "Group name",
      "description": "What this group covers",
      "color": "#HEX_COLOR",
      "order": 1,
      "items": [
        {
          "text": "Specific, actionable task",
          "description": "Additional details if needed",
          "estimatedTime": "Time estimate (only if requested)",
          "priority": "low|medium|high",
          "order": 1
        }
      ]
    }
  ],
  "metadata": {
    "category": "Appropriate category",
    "priority": "low|medium|high",
    "tags": ["relevant", "tags"]
  }
}

Guidelines:
- Create ${preferences.groupByCategory ? 'logical groups that organize related tasks' : 'minimal groups, focus on sequential flow'}
- ${preferences.includeSubtasks ? 'Include detailed subtasks and specific steps' : 'Keep tasks concise and high-level'}
- ${preferences.addEstimates ? 'Add realistic time estimates for tasks and overall duration' : 'Do not include time estimates'}
- Use diverse, appealing colors for groups (#3B82F6, #10B981, #F59E0B, #EF4444, #8B5CF6, #06B6D4, #84CC16, #F97316)
- Make tasks specific, actionable, and achievable
- Ensure proper ordering within groups
- Generate 3-8 groups with 2-6 items each depending on complexity`;

    const contextInfo = this.buildContextString(context);
    const userPrompt = `${systemInstructions}

User Request: "${prompt}"
${contextInfo}

Generate a comprehensive checklist as a JSON object:`;

    return userPrompt;
  }

  private buildContextString(context: AIChecklistRequest['context']): string {
    const parts: string[] = [];

    if (context.category) {
      parts.push(`Category: ${context.category}`);
    }
    if (context.urgency) {
      parts.push(`Urgency Level: ${context.urgency}`);
    }
    if (context.timeframe) {
      parts.push(`Timeframe: ${context.timeframe}`);
    }
    if (context.complexity) {
      parts.push(`Complexity Level: ${context.complexity}`);
    }

    return parts.length > 0 ? `\nContext: ${parts.join(', ')}` : '';
  }

  private parseGeminiResponse(text: string): any {
    try {
      // Clean up the response - remove any markdown formatting or extra text
      let cleanText = text.trim();
      
      // Find JSON object boundaries
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON object found in response');
      }
      
      cleanText = cleanText.substring(jsonStart, jsonEnd);
      
      // Parse the JSON
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('JSON Parse Error:', error);
      console.error('Raw response:', text);
      throw new Error('Failed to parse AI response');
    }
  }

  private formatResponse(parsed: any, request: AIChecklistRequest): AIGeneratedChecklist {
    // Validate required fields
    if (!parsed.title || !parsed.groups || !Array.isArray(parsed.groups)) {
      throw new Error('Invalid AI response structure');
    }

    // Ensure groups have required fields and proper structure
    const formattedGroups: AIGeneratedGroup[] = parsed.groups.map((group: any, index: number) => ({
      name: group.name || `Group ${index + 1}`,
      description: group.description || '',
      color: this.validateColor(group.color) || this.getDefaultColor(index),
      order: group.order || index + 1,
      items: this.formatItems(group.items || []),
    }));

    // Format metadata
    const metadata = {
      category: parsed.metadata?.category || request.context.category || 'General',
      priority: this.validatePriority(parsed.metadata?.priority) || request.context.urgency as 'low' | 'medium' | 'high' || 'medium',
      tags: Array.isArray(parsed.metadata?.tags) ? parsed.metadata.tags.filter((tag: any) => typeof tag === 'string') : [],
    };

    return {
      title: parsed.title,
      description: parsed.description || '',
      estimatedDuration: request.preferences.addEstimates ? parsed.estimatedDuration : undefined,
      groups: formattedGroups,
      metadata,
    };
  }

  private formatItems(items: any[]): AIGeneratedItem[] {
    if (!Array.isArray(items)) return [];

    return items.map((item: any, index: number) => ({
      text: item.text || `Task ${index + 1}`,
      description: item.description || '',
      estimatedTime: item.estimatedTime || '',
      priority: this.validatePriority(item.priority) || 'medium',
      order: item.order || index + 1,
    }));
  }

  private validateColor(color: string): string | null {
    if (typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      return color;
    }
    return null;
  }

  private validatePriority(priority: string): 'low' | 'medium' | 'high' | null {
    if (['low', 'medium', 'high'].includes(priority)) {
      return priority as 'low' | 'medium' | 'high';
    }
    return null;
  }

  private getDefaultColor(index: number): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
    ];
    return colors[index % colors.length];
  }

  // Test method for development
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello! Please respond with just the word "connected".');
      const response = await result.response;
      const text = response.text();
      return text.toLowerCase().includes('connected');
    } catch (error) {
      console.error('AI Connection Test Failed:', error);
      return false;
    }
  }
}

export const aiService = new AIService();
