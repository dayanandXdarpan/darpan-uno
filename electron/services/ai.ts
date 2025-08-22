import OpenAI from 'openai';
import { CompilerError } from './arduinoCli';

export interface CodeContext {
  currentFile: string;
  selectedCode?: string;
  errors?: CompilerError[];
  projectFiles?: string[];
  boardType?: string;
  connectedComponents?: Component[];
  libraries?: string[];
  serialOutput?: string[];
}

export interface Component {
  type: string;
  pins: number[];
  description: string;
  specs?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  suggestions?: string[];
  codeBlocks?: CodeBlock[];
  resources?: Resource[];
  confidence?: number;
  reasoning?: string;
  provider?: 'openai' | 'gemini' | 'auto';
}

export interface CodeBlock {
  language: string;
  code: string;
  description?: string;
  filename?: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'example' | 'video' | 'library';
  relevance?: number;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  context?: CodeContext;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export type AIProvider = 'openai' | 'gemini' | 'auto';

export class AIService {
  private openai: OpenAI;
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();
  private systemPrompts: Map<string, string> = new Map();
  private defaultModel: string = 'gpt-4';
  private geminiModel: string = 'gemini-2.0-flash';
  private maxTokens: number = 2000;
  private temperature: number = 0.3;
  private preferredProvider: AIProvider = 'auto';
  private openaiApiKey: string;
  private geminiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyB2XOTBWUTFvbzfEW8iy0A9mIdXk1Gbri0';
    
    if (!this.openaiApiKey && !this.geminiApiKey) {
      console.warn('No AI API keys provided. AI features will be disabled.');
    }
    
    this.openai = new OpenAI({
      apiKey: this.openaiApiKey || 'dummy-key'
    });

    this.initializeSystemPrompts();
  }

  private initializeSystemPrompts() {
    // Main Arduino tutor prompt
    this.systemPrompts.set('arduino-tutor', `You are an expert Arduino programming tutor and firmware engineer.

Your role:
- Help users learn Arduino programming from beginner to advanced level
- Provide clear, educational explanations suitable for the user's skill level
- Write clean, well-commented Arduino code that follows best practices
- Debug compilation errors and suggest fixes with explanations
- Recommend components and wiring for projects
- Provide safety guidance for electronics projects

Arduino-specific knowledge:
- Arduino sketch structure: setup() runs once, loop() runs repeatedly  
- Common functions: pinMode(), digitalWrite(), digitalRead(), analogRead(), analogWrite()
- Serial communication: Serial.begin(), Serial.print(), Serial.println()
- Timing: delay(), millis(), micros()
- Interrupts: attachInterrupt(), detachInterrupt()
- Libraries: #include directives, library management
- Board differences: Uno, Nano, ESP32, etc.

Code guidelines:
1. Always include necessary #include statements
2. Define pin constants at the top of the sketch
3. Initialize hardware in setup()
4. Keep loop() efficient - avoid blocking delays when possible
5. Add clear comments explaining each step
6. Handle edge cases and error conditions
7. Use meaningful variable names
8. Follow Arduino coding conventions

Communication style:
- Be encouraging and supportive, especially for beginners
- Explain concepts clearly with examples
- Provide multiple solutions when appropriate
- Ask clarifying questions when requirements are unclear
- Reference official Arduino documentation when relevant
- Always prioritize safety in electronics projects

When providing code:
- Return complete, working sketches when possible
- Include necessary library includes
- Add detailed comments
- Suggest wiring diagrams when components are involved
- Mention any required libraries that need to be installed`);

    // Code explanation prompt
    this.systemPrompts.set('explain-code', `You are an Arduino code explanation expert.

Analyze the provided Arduino code and explain:
1. Overall purpose and functionality
2. How each major section works
3. Arduino-specific functions and concepts used
4. Hardware requirements and wiring
5. Potential improvements or optimizations
6. Common issues or gotchas to watch for

Be educational and detailed, suitable for learning.`);

    // Error fixing prompt
    this.systemPrompts.set('fix-errors', `You are an Arduino debugging expert.

Your task:
1. Analyze compilation errors and identify root causes
2. Provide corrected code with minimal changes
3. Explain what caused each error
4. Suggest best practices to prevent similar issues
5. Ensure the fix maintains the original intent

Focus on:
- Syntax errors (missing semicolons, brackets, etc.)
- Undeclared variables/functions
- Missing libraries or includes
- Type mismatches
- Scope issues
- Arduino-specific gotchas

Return the complete corrected code, not just snippets.`);

    // Feature implementation prompt
    this.systemPrompts.set('implement-feature', `You are an Arduino feature implementation expert.

Your task:
1. Understand the requested feature clearly
2. Design an implementation that fits Arduino constraints
3. Write efficient, readable code
4. Consider hardware requirements and limitations
5. Provide complete working implementation
6. Include error handling and edge cases

Implementation approach:
- Break complex features into manageable functions
- Use non-blocking code patterns when possible
- Minimize memory usage
- Consider real-time constraints
- Follow Arduino best practices
- Include comprehensive comments`);
  }

  private getAvailableProvider(): AIProvider {
    if (this.preferredProvider === 'openai' && this.openaiApiKey) return 'openai';
    if (this.preferredProvider === 'gemini' && this.geminiApiKey) return 'gemini';
    
    // Auto-select based on availability
    if (this.geminiApiKey) return 'gemini'; // Prefer Gemini if available
    if (this.openaiApiKey) return 'openai';
    
    return 'gemini'; // Default fallback
  }

  async processChat(
    message: string, 
    context: CodeContext, 
    conversationId: string = 'default',
    promptType: string = 'arduino-tutor',
    provider?: AIProvider
  ): Promise<AIResponse> {
    const selectedProvider = provider || this.getAvailableProvider();
    
    try {
      const systemPrompt = this.buildSystemPrompt(promptType, context);
      
      // Get or create conversation history
      if (!this.conversationHistory.has(conversationId)) {
        this.conversationHistory.set(conversationId, []);
      }
      const history = this.conversationHistory.get(conversationId)!;

      // Add user message to history
      const userMessage: ConversationMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
        context
      };
      history.push(userMessage);

      let assistantContent: string;

      if (selectedProvider === 'gemini') {
        assistantContent = await this.callGeminiAPI(systemPrompt, message, history);
      } else {
        assistantContent = await this.callOpenAIAPI(systemPrompt, history);
      }

      // Add assistant response to history
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };
      history.push(assistantMessage);

      // Parse response for additional information
      const aiResponse = this.parseAIResponse(assistantContent, context);
      aiResponse.provider = selectedProvider;
      
      // Add relevant resources
      aiResponse.resources = await this.findRelevantResources(message, context);

      return aiResponse;
    } catch (error) {
      console.error(`AI Service error (${selectedProvider}):`, error);
      
      // Try fallback provider if the primary fails
      if (selectedProvider === 'gemini' && this.openaiApiKey) {
        console.log('Falling back to OpenAI...');
        return this.processChat(message, context, conversationId, promptType, 'openai');
      } else if (selectedProvider === 'openai' && this.geminiApiKey) {
        console.log('Falling back to Gemini...');
        return this.processChat(message, context, conversationId, promptType, 'gemini');
      }
      
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again or check your internet connection.',
        suggestions: ['Try again', 'Check internet connection', 'Verify API key'],
        codeBlocks: [],
        resources: [],
        provider: selectedProvider
      };
    }
  }

  private async callGeminiAPI(systemPrompt: string, userMessage: string, history: ConversationMessage[]): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Combine system prompt with user message for Gemini
    const combinedMessage = `${systemPrompt}\n\nUser: ${userMessage}`;
    
    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: combinedMessage
            }
          ]
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.geminiApiKey
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  private async callOpenAIAPI(systemPrompt: string, history: ConversationMessage[]): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare messages for API
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(msg => ({ // Keep last 10 messages for context
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await this.openai.chat.completions.create({
      model: this.defaultModel,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    return response.choices[0]?.message?.content || 'No response generated.';
  }

  async explainCode(code: string, context?: CodeContext): Promise<AIResponse> {
    const enhancedContext = {
      currentFile: context?.currentFile || 'sketch.ino',
      selectedCode: code,
      ...context
    };

    const prompt = `Please explain this Arduino code in detail:

\`\`\`cpp
${code}
\`\`\`

${context?.boardType ? `Target board: ${context.boardType}` : ''}
${context?.libraries?.length ? `Used libraries: ${context.libraries.join(', ')}` : ''}

Provide a comprehensive explanation suitable for learning.`;

    return await this.processChat(prompt, enhancedContext, 'explain-' + Date.now(), 'explain-code');
  }

  async generateCode(prompt: string, context: CodeContext): Promise<AIResponse> {
    const enhancedPrompt = `Generate Arduino code for: ${prompt}

Context:
- Board: ${context.boardType || 'Arduino Uno'}
- Current project files: ${context.projectFiles?.join(', ') || 'None'}
${context.connectedComponents ? `- Connected components: ${context.connectedComponents.map(c => `${c.type} on pins ${c.pins.join(',')}`).join('; ')}` : ''}
${context.libraries ? `- Available libraries: ${context.libraries.join(', ')}` : ''}

Requirements:
1. Include necessary #include statements
2. Provide proper setup() and loop() functions
3. Add clear comments explaining the code
4. Follow Arduino coding best practices
5. Handle edge cases and error conditions
6. Suggest wiring if components are involved

Generate clean, well-documented code that a beginner can understand.`;

    return await this.processChat(enhancedPrompt, context, 'generate-' + Date.now(), 'arduino-tutor');
  }

  async fixCode(code: string, errors: CompilerError[], context?: CodeContext): Promise<AIResponse> {
    const errorDescriptions = errors.map(e => 
      `${e.file}:${e.line}:${e.column}: ${e.type.toUpperCase()} - ${e.message}${e.suggestion ? ` (Suggestion: ${e.suggestion})` : ''}`
    ).join('\n');

    const prompt = `Fix this Arduino code that has compilation errors:

\`\`\`cpp
${code}
\`\`\`

Compilation errors:
${errorDescriptions}

Please:
1. Provide the corrected code with explanations
2. Explain what caused each error
3. Suggest best practices to avoid similar errors
4. Ensure the fixed code follows Arduino conventions

Return the complete corrected code, not just the changes.`;

    const enhancedContext = {
      currentFile: context?.currentFile || 'sketch.ino',
      selectedCode: code,
      errors,
      ...context
    };

    return await this.processChat(prompt, enhancedContext, 'fix-' + Date.now(), 'fix-errors');
  }

  async implementFeature(feature: string, context: CodeContext): Promise<AIResponse> {
    const prompt = `Implement this feature in the Arduino project: ${feature}

Current code context:
${context.selectedCode ? `\`\`\`cpp\n${context.selectedCode}\n\`\`\`` : 'No code selected'}

Project context:
- Board: ${context.boardType || 'Arduino Uno'}
- Files: ${context.projectFiles?.join(', ') || 'None'}
${context.connectedComponents ? `- Components: ${context.connectedComponents.map(c => `${c.type} on pins ${c.pins.join(',')}`).join('; ')}` : ''}
${context.libraries ? `- Libraries: ${context.libraries.join(', ')}` : ''}

Requirements:
1. Integrate smoothly with existing code
2. Maintain current functionality
3. Follow Arduino best practices
4. Add comprehensive comments
5. Suggest any additional libraries or components needed
6. Provide wiring instructions if applicable

Provide a complete implementation that I can directly use.`;

    return await this.processChat(prompt, context, 'implement-' + Date.now(), 'implement-feature');
  }

  async suggestComponents(projectDescription: string): Promise<AIResponse> {
    const prompt = `Suggest Arduino components and wiring for this project: ${projectDescription}

Please provide:
1. Complete list of required components with specifications
2. Detailed wiring diagram description
3. Basic code structure
4. Safety considerations and precautions
5. Alternative component options if applicable
6. Estimated cost and difficulty level
7. Step-by-step assembly instructions

Format as a comprehensive project guide suitable for beginners.`;

    return await this.processChat(prompt, { currentFile: '' }, 'components-' + Date.now());
  }

  private buildSystemPrompt(promptType: string, context: CodeContext): string {
    const basePrompt = this.systemPrompts.get(promptType) || this.systemPrompts.get('arduino-tutor')!;
    
    const contextInfo = this.buildContextInfo(context);
    
    return `${basePrompt}

Current context:
${contextInfo}

Remember: Always prioritize safety, education, and best practices in your responses.`;
  }

  private buildContextInfo(context: CodeContext): string {
    const info: string[] = [];
    
    if (context.currentFile) {
      info.push(`- Working on: ${context.currentFile}`);
    }
    
    if (context.boardType) {
      info.push(`- Board type: ${context.boardType}`);
    }
    
    if (context.errors?.length) {
      info.push(`- Current errors: ${context.errors.length} compilation errors`);
    }
    
    if (context.connectedComponents?.length) {
      info.push(`- Components: ${context.connectedComponents.map(c => c.type).join(', ')}`);
    }
    
    if (context.libraries?.length) {
      info.push(`- Libraries: ${context.libraries.join(', ')}`);
    }
    
    if (context.serialOutput?.length) {
      info.push(`- Recent serial output available (${context.serialOutput.length} lines)`);
    }
    
    return info.length > 0 ? info.join('\n') : '- No specific context available';
  }

  private parseAIResponse(content: string, context: CodeContext): AIResponse {
    const codeBlocks: CodeBlock[] = [];
    const suggestions: string[] = [];

    // Extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'cpp',
        code: match[2].trim(),
        filename: match[1] === 'cpp' || !match[1] ? 'sketch.ino' : undefined
      });
    }

    // Extract suggestions (lines starting with bullet points or numbers)
    const suggestionRegex = /(?:^|\n)(?:[•\-\*]|\d+\.)\s*(.+)/g;
    while ((match = suggestionRegex.exec(content)) !== null) {
      suggestions.push(match[1].trim());
    }

    // Calculate confidence based on context and response quality
    const confidence = this.calculateResponseConfidence(content, context);

    return {
      content,
      suggestions: suggestions.slice(0, 5), // Limit to top 5 suggestions
      codeBlocks,
      resources: [], // Will be populated by findRelevantResources
      confidence,
      reasoning: this.extractReasoning(content)
    };
  }

  private calculateResponseConfidence(content: string, context: CodeContext): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on content quality indicators
    if (content.includes('setup()') || content.includes('loop()')) confidence += 0.1;
    if (content.includes('#include')) confidence += 0.1;
    if (content.includes('pinMode')) confidence += 0.05;
    if (content.length > 200) confidence += 0.1;
    if (content.includes('//') || content.includes('/*')) confidence += 0.1; // Has comments
    
    // Adjust based on context completeness
    if (context.boardType) confidence += 0.05;
    if (context.connectedComponents?.length) confidence += 0.05;
    if (context.errors?.length === 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private extractReasoning(content: string): string | undefined {
    // Look for explanation patterns
    const reasoningPatterns = [
      /(?:because|since|due to|the reason is|this is because)\s+([^.!?]+[.!?])/i,
      /(?:explanation|reasoning):\s*([^.!?]+[.!?])/i
    ];
    
    for (const pattern of reasoningPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  private async findRelevantResources(query: string, context: CodeContext): Promise<Resource[]> {
    const resources: Resource[] = [];
    const keywords = query.toLowerCase();
    
    // Arduino documentation links
    if (keywords.includes('serial') || keywords.includes('print')) {
      resources.push({
        title: 'Arduino Serial Communication',
        url: 'https://www.arduino.cc/reference/en/language/functions/communication/serial/',
        type: 'documentation',
        relevance: 0.9
      });
    }

    if (keywords.includes('analog') || keywords.includes('sensor')) {
      resources.push({
        title: 'Arduino Analog Input',
        url: 'https://www.arduino.cc/en/Tutorial/BuiltInExamples/AnalogReadSerial',
        type: 'tutorial',
        relevance: 0.8
      });
    }

    if (keywords.includes('led') || keywords.includes('blink')) {
      resources.push({
        title: 'Arduino Blink Tutorial',
        url: 'https://www.arduino.cc/en/Tutorial/BuiltInExamples/Blink',
        type: 'tutorial',
        relevance: 0.9
      });
    }

    if (keywords.includes('pwm') || keywords.includes('analogwrite')) {
      resources.push({
        title: 'Arduino PWM',
        url: 'https://www.arduino.cc/en/Tutorial/Foundations/PWM',
        type: 'documentation',
        relevance: 0.8
      });
    }

    // Component-specific resources
    if (context.connectedComponents) {
      for (const component of context.connectedComponents) {
        if (component.type.toLowerCase().includes('lcd')) {
          resources.push({
            title: 'LiquidCrystal Library',
            url: 'https://www.arduino.cc/en/Reference/LiquidCrystal',
            type: 'library',
            relevance: 0.9
          });
        }
        
        if (component.type.toLowerCase().includes('servo')) {
          resources.push({
            title: 'Servo Library',
            url: 'https://www.arduino.cc/en/Reference/Servo',
            type: 'library',
            relevance: 0.9
          });
        }
      }
    }

    // Sort by relevance
    return resources.sort((a, b) => (b.relevance || 0) - (a.relevance || 0)).slice(0, 5);
  }

  clearConversation(conversationId: string = 'default') {
    this.conversationHistory.delete(conversationId);
  }

  getConversationHistory(conversationId: string = 'default'): ConversationMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  setModel(model: string) {
    this.defaultModel = model;
  }

  setTemperature(temperature: number) {
    this.temperature = Math.max(0, Math.min(1, temperature));
  }

  setMaxTokens(maxTokens: number) {
    this.maxTokens = Math.max(100, Math.min(4000, maxTokens));
  }

  setPreferredProvider(provider: AIProvider) {
    this.preferredProvider = provider;
  }

  // Legacy method for backwards compatibility
  async ask(
    message: string, 
    context: CodeContext, 
    conversationId: string = 'default'
  ): Promise<AIResponse> {
    return this.processChat(message, context, conversationId, 'arduino-tutor');
  }
}
