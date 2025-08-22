import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface AIContext {
  currentFile?: string;
  currentCode?: string;
  selectedBoard?: string;
  recentErrors?: string[];
  projectFiles?: string[];
  serialOutput?: string[];
}

interface AIResponse {
  content: string;
  suggestions?: string[];
  codeChanges?: CodeChange[];
  needsConfirmation?: boolean;
}

interface CodeChange {
  file: string;
  startLine: number;
  endLine: number;
  newCode: string;
  description: string;
}

export class ArduinoAIService extends EventEmitter {
  private apiKey: string | null = null;
  private apiProvider: 'openai' | 'anthropic' | 'google' | null = null;
  private conversationHistory: Map<string, AIMessage[]> = new Map();
  private maxHistoryLength = 50;

  constructor() {
    super();
  }

  async initialize(provider: 'openai' | 'anthropic' | 'google', apiKey: string): Promise<boolean> {
    this.apiProvider = provider;
    this.apiKey = apiKey;
    
    // Test the API connection
    try {
      const testResponse = await this.sendMessage('Hello', {}, 'test-conversation');
      return testResponse.content.length > 0;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      return false;
    }
  }

  async sendMessage(message: string, context: AIContext, conversationId: string = 'default'): Promise<AIResponse> {
    if (!this.apiKey || !this.apiProvider) {
      return {
        content: 'AI service not initialized. Please configure your API key in settings.',
        suggestions: ['Configure AI settings', 'Use local help instead']
      };
    }

    try {
      // Get conversation history
      const history = this.getConversationHistory(conversationId);
      
      // Build context-aware prompt
      const contextPrompt = this.buildContextPrompt(context);
      const fullPrompt = `${contextPrompt}\n\nUser: ${message}`;

      // Add user message to history
      const userMessage: AIMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      this.addToHistory(conversationId, userMessage);

      // Send to AI provider
      const response = await this.callAIProvider(fullPrompt, history);
      
      // Add AI response to history
      const aiMessage: AIMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      };
      this.addToHistory(conversationId, aiMessage);

      return response;
    } catch (error) {
      console.error('AI service error:', error);
      return {
        content: 'Sorry, I encountered an error. Please try again.',
        suggestions: ['Check your internet connection', 'Verify API key', 'Try a simpler question']
      };
    }
  }

  async explainCode(code: string, language: string = 'arduino'): Promise<string> {
    const context: AIContext = {
      currentCode: code
    };
    
    const message = `Please explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    const response = await this.sendMessage(message, context, 'code-explanation');
    return response.content;
  }

  async fixError(error: string, code: string, context: AIContext): Promise<AIResponse> {
    const message = `I'm getting this error: "${error}"\n\nIn this code:\n\`\`\`arduino\n${code}\n\`\`\`\n\nHow can I fix it?`;
    return await this.sendMessage(message, { ...context, currentCode: code, recentErrors: [error] }, 'error-fixing');
  }

  async generateCode(prompt: string, context: AIContext): Promise<AIResponse> {
    const message = `Generate Arduino code for: ${prompt}`;
    return await this.sendMessage(message, context, 'code-generation');
  }

  async improveCode(code: string, context: AIContext): Promise<AIResponse> {
    const message = `Please review and improve this Arduino code:\n\n\`\`\`arduino\n${code}\n\`\`\`\n\nSuggest optimizations, better practices, or bug fixes.`;
    return await this.sendMessage(message, { ...context, currentCode: code }, 'code-improvement');
  }

  async suggestLibraries(description: string): Promise<string[]> {
    const message = `What Arduino libraries would be useful for: ${description}`;
    const response = await this.sendMessage(message, {}, 'library-suggestions');
    
    // Extract library names from response
    const libraries: string[] = [];
    const lines = response.content.split('\n');
    for (const line of lines) {
      const match = line.match(/(?:^|\s)([A-Za-z][A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)*)\s*(?:library|lib)/i);
      if (match) {
        libraries.push(match[1].trim());
      }
    }
    
    return libraries;
  }

  async askQuestion(question: string, context: AIContext, conversationId: string = 'default'): Promise<AIResponse> {
    return await this.sendMessage(question, context, conversationId);
  }

  getConversationHistory(conversationId: string): AIMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  clearAllConversations(): void {
    this.conversationHistory.clear();
  }

  private buildContextPrompt(context: AIContext): string {
    let prompt = `You are an Arduino programming assistant. You help users write, debug, and improve Arduino code.

Context:`;

    if (context.currentFile) {
      prompt += `\n- Current file: ${context.currentFile}`;
    }

    if (context.selectedBoard) {
      prompt += `\n- Target board: ${context.selectedBoard}`;
    }

    if (context.currentCode) {
      prompt += `\n- Current code in editor:\n\`\`\`arduino\n${context.currentCode.slice(0, 1000)}${context.currentCode.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\``;
    }

    if (context.recentErrors && context.recentErrors.length > 0) {
      prompt += `\n- Recent errors: ${context.recentErrors.slice(0, 3).join(', ')}`;
    }

    if (context.projectFiles && context.projectFiles.length > 0) {
      prompt += `\n- Project files: ${context.projectFiles.slice(0, 10).join(', ')}`;
    }

    if (context.serialOutput && context.serialOutput.length > 0) {
      prompt += `\n- Recent serial output: ${context.serialOutput.slice(-5).join(', ')}`;
    }

    prompt += `

Guidelines:
- Provide clear, concise explanations
- Include code examples when helpful
- Consider Arduino-specific constraints (memory, pins, libraries)
- Suggest best practices for embedded programming
- When suggesting code changes, explain why
- Be helpful for beginners but also accurate for advanced users`;

    return prompt;
  }

  private async callAIProvider(prompt: string, history: AIMessage[]): Promise<AIResponse> {
    // This is a placeholder implementation
    // In a real implementation, you would call the actual AI API here
    
    // Simulate different responses based on keywords
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
      return {
        content: `I can help you fix that error! Here are some common solutions:

1. Check your syntax - make sure you have semicolons at the end of statements
2. Verify variable declarations - ensure all variables are declared before use
3. Check pin assignments - make sure you're using valid pin numbers for your board
4. Review library includes - ensure all required libraries are included

Would you like me to look at your specific code to provide more targeted help?`,
        suggestions: ['Show me your code', 'Explain the error message', 'Check wiring']
      };
    }
    
    if (lowerPrompt.includes('generate') || lowerPrompt.includes('create')) {
      return {
        content: `I'd be happy to help you generate Arduino code! Here's a basic template:

\`\`\`arduino
void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Set up your pins here
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  // Your main code here
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
\`\`\`

What specific functionality would you like me to help you implement?`,
        suggestions: ['Sensor reading', 'Motor control', 'LED patterns', 'Communication']
      };
    }
    
    // Default response
    return {
      content: `I'm here to help with your Arduino project! I can assist with:

- Writing and debugging code
- Explaining Arduino concepts
- Suggesting libraries and components
- Troubleshooting hardware issues
- Optimizing your code

What would you like to work on today?`,
      suggestions: ['Help with code', 'Explain a concept', 'Debug an error', 'Project ideas']
    };
  }

  private addToHistory(conversationId: string, message: AIMessage): void {
    let history = this.conversationHistory.get(conversationId) || [];
    history.push(message);
    
    // Trim history if it gets too long
    if (history.length > this.maxHistoryLength) {
      history = history.slice(-this.maxHistoryLength);
    }
    
    this.conversationHistory.set(conversationId, history);
  }
}
