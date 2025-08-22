const { EventEmitter } = require('events');

class ArduinoAIService extends EventEmitter {
  constructor() {
    super();
    this.conversationHistory = [];
    this.currentSessionId = null;
    this.apiKey = null;
    this.provider = 'openai'; // or 'anthropic'
    this.model = 'gpt-4';
  }

  async initialize(apiKey, provider = 'openai', model = 'gpt-4') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = model;
    
    // Test the API connection
    try {
      await this.testConnection();
      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      return false;
    }
  }

  async testConnection() {
    // For now, return true - we'll implement real API testing later
    return true;
  }

  async chat(messages, context = {}) {
    try {
      // Add context-aware system message
      const systemMessage = this.buildSystemMessage(context);
      
      // Prepare the conversation
      const conversation = [
        { role: 'system', content: systemMessage },
        ...this.conversationHistory,
        ...messages
      ];

      // For now, return a placeholder response
      // TODO: Implement real AI API calls
      const response = this.generatePlaceholderResponse(messages[messages.length - 1]?.content || '');
      
      // Add to conversation history
      this.conversationHistory.push(...messages);
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // Limit conversation history size
      this.maintainConversationHistory();
      
      this.emit('response', { response, context });
      
      return response;
    } catch (error) {
      this.emit('error', error);
      throw new Error(`AI Chat failed: ${error.message}`);
    }
  }

  async explainCode(code, language = 'arduino') {
    const prompt = `Please explain this ${language} code in simple terms:

\`\`\`${language}
${code}
\`\`\`

Focus on:
1. What the code does
2. How it works
3. Any important concepts or techniques used
4. Potential improvements or issues`;

    try {
      const response = await this.chat([{ role: 'user', content: prompt }], {
        type: 'code_explanation',
        language,
        code
      });
      
      return response;
    } catch (error) {
      throw new Error(`Code explanation failed: ${error.message}`);
    }
  }

  async fixError(errorMessage, code, context = {}) {
    const prompt = `I'm getting this error in my Arduino code:

Error: ${errorMessage}

Code:
\`\`\`arduino
${code}
\`\`\`

Please help me fix this error. Provide:
1. An explanation of what's causing the error
2. The corrected code
3. An explanation of the fix
4. Tips to avoid similar errors in the future`;

    try {
      const response = await this.chat([{ role: 'user', content: prompt }], {
        type: 'error_fix',
        error: errorMessage,
        code,
        ...context
      });
      
      return response;
    } catch (error) {
      throw new Error(`Error fixing failed: ${error.message}`);
    }
  }

  async generateCode(prompt, language = 'arduino', context = {}) {
    const enhancedPrompt = `Generate ${language} code for the following request:

${prompt}

Please provide:
1. Complete, working code
2. Comments explaining the important parts
3. Any required libraries or setup instructions
4. Usage instructions

Make sure the code follows best practices and is beginner-friendly.`;

    try {
      const response = await this.chat([{ role: 'user', content: enhancedPrompt }], {
        type: 'code_generation',
        language,
        originalPrompt: prompt,
        ...context
      });
      
      return response;
    } catch (error) {
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }

  async optimizeCode(code, language = 'arduino') {
    const prompt = `Please optimize this ${language} code for better performance, readability, and best practices:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. The optimized code
2. Explanation of what was improved
3. Performance benefits
4. Any trade-offs made`;

    try {
      const response = await this.chat([{ role: 'user', content: prompt }], {
        type: 'code_optimization',
        language,
        originalCode: code
      });
      
      return response;
    } catch (error) {
      throw new Error(`Code optimization failed: ${error.message}`);
    }
  }

  async suggestImprovements(code, language = 'arduino') {
    const prompt = `Please review this ${language} code and suggest improvements:

\`\`\`${language}
${code}
\`\`\`

Consider:
1. Code structure and organization
2. Error handling
3. Performance optimizations
4. Security considerations
5. Readability and maintainability
6. Arduino-specific best practices`;

    try {
      const response = await this.chat([{ role: 'user', content: prompt }], {
        type: 'code_review',
        language,
        code
      });
      
      return response;
    } catch (error) {
      throw new Error(`Code review failed: ${error.message}`);
    }
  }

  buildSystemMessage(context = {}) {
    let systemMessage = `You are an expert Arduino programming assistant. You help users with:
- Writing and debugging Arduino code
- Explaining electronics concepts
- Troubleshooting hardware issues
- Suggesting project improvements
- Teaching best practices

Always provide clear, accurate, and beginner-friendly explanations.`;

    if (context.type) {
      switch (context.type) {
        case 'code_explanation':
          systemMessage += "\n\nFocus on providing clear explanations that help the user understand the code.";
          break;
        case 'error_fix':
          systemMessage += "\n\nFocus on identifying the exact cause of the error and providing a clear fix.";
          break;
        case 'code_generation':
          systemMessage += "\n\nGenerate complete, working code with proper comments and explanations.";
          break;
        case 'code_optimization':
          systemMessage += "\n\nFocus on improving performance, readability, and following best practices.";
          break;
        case 'code_review':
          systemMessage += "\n\nProvide constructive feedback and suggestions for improvement.";
          break;
      }
    }

    if (context.language) {
      systemMessage += `\n\nThe code language is: ${context.language}`;
    }

    if (context.boardType) {
      systemMessage += `\n\nTarget board: ${context.boardType}`;
    }

    if (context.projectContext) {
      systemMessage += `\n\nProject context: ${context.projectContext}`;
    }

    return systemMessage;
  }

  generatePlaceholderResponse(userMessage) {
    // Generate contextual placeholder responses based on the user's message
    const message = userMessage.toLowerCase();
    
    if (message.includes('error') || message.includes('fix')) {
      return `I can help you fix that error! Here's what I would suggest:

1. **Check your syntax** - Make sure all brackets and semicolons are properly placed
2. **Verify variable declarations** - Ensure all variables are declared before use
3. **Review pin assignments** - Confirm you're using the correct pin numbers
4. **Check library dependencies** - Make sure all required libraries are installed

*Note: This is a placeholder response. Real AI integration is coming soon!*

Would you like me to look at your specific code to provide more targeted help?`;
    }
    
    if (message.includes('generate') || message.includes('create') || message.includes('write')) {
      return `I'd be happy to help you generate Arduino code! Here's a basic template to get you started:

\`\`\`arduino
// Basic Arduino sketch template
const int LED_PIN = 13;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("Arduino started!");
}

void loop() {
  // Your main code here
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}
\`\`\`

*Note: This is a placeholder response. Real AI code generation is coming soon!*

Please provide more details about what you'd like to create, and I'll generate more specific code for you.`;
    }
    
    if (message.includes('explain') || message.includes('what') || message.includes('how')) {
      return `I'd be happy to explain Arduino concepts! Here are some key points:

**Arduino Basics:**
- \`setup()\` runs once when the board starts
- \`loop()\` runs continuously after setup
- \`pinMode()\` configures pins as input or output
- \`digitalWrite()\` sets digital pins HIGH or LOW
- \`analogRead()\` reads analog values (0-1023)

**Common Functions:**
- \`delay(ms)\` - pause execution for milliseconds
- \`Serial.begin(9600)\` - start serial communication
- \`Serial.println()\` - print to serial monitor

*Note: This is a placeholder response. Real AI explanations are coming soon!*

What specific Arduino concept would you like me to explain in more detail?`;
    }
    
    // Default response
    return `Thank you for your question! I'm an AI assistant specialized in Arduino development, and I can help you with:

🔧 **Code Development**
- Writing Arduino sketches
- Debugging errors
- Optimizing performance

📚 **Learning Support**
- Explaining concepts
- Best practices
- Project guidance

🔍 **Troubleshooting**
- Hardware issues
- Compilation errors
- Upload problems

*Note: This is a placeholder response. Full AI integration with OpenAI/Anthropic is coming soon!*

How can I assist you with your Arduino project today?`;
  }

  maintainConversationHistory() {
    // Keep last 20 messages to maintain context while limiting memory usage
    const maxMessages = 20;
    if (this.conversationHistory.length > maxMessages) {
      this.conversationHistory = this.conversationHistory.slice(-maxMessages);
    }
  }

  getConversationHistory() {
    return [...this.conversationHistory];
  }

  clearConversationHistory() {
    this.conversationHistory = [];
    this.currentSessionId = null;
    this.emit('historyCleared');
  }

  startNewSession() {
    this.currentSessionId = Date.now().toString();
    this.conversationHistory = [];
    this.emit('sessionStarted', this.currentSessionId);
    return this.currentSessionId;
  }

  getSessionId() {
    return this.currentSessionId;
  }

  setProvider(provider, model) {
    this.provider = provider;
    this.model = model;
    this.emit('providerChanged', { provider, model });
  }

  getSettings() {
    return {
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey,
      sessionId: this.currentSessionId,
      conversationLength: this.conversationHistory.length
    };
  }

  cleanup() {
    this.clearConversationHistory();
  }
}

module.exports = { ArduinoAIService };
