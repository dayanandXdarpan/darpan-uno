// Enhanced AI Service with Multiple Models and Educational Features
import { GoogleGenerativeAI } from '@google/generative-ai';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
}

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  context?: string;
}

interface LearningResource {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  content: string;
  examples: string[];
  relatedTopics: string[];
}

interface CircuitDiagram {
  id: string;
  name: string;
  description: string;
  components: string[];
  connections: string[];
  code: string;
  difficulty: string;
  category: string;
}

interface AutoSuggestion {
  text: string;
  description: string;
  category: 'function' | 'variable' | 'library' | 'concept';
  example?: string;
}

class EnhancedAIService {
  private geminiAI: GoogleGenerativeAI | null = null;
  private conversationHistory: AIMessage[] = [];
  private learningResources: LearningResource[] = [];
  private circuitDiagrams: CircuitDiagram[] = [];
  private autoSuggestions: AutoSuggestion[] = [];

  constructor() {
    this.initializeAI();
    this.loadLearningResources();
    this.loadCircuitDiagrams();
    this.loadAutoSuggestions();
  }

  private async initializeAI() {
    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB2XOTBWUTFvbzfEW8iy0A9mIdXk1Gbri0';
      if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        this.geminiAI = new GoogleGenerativeAI(apiKey);
        console.log('✅ Gemini AI initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
    }
  }

  // Generate AI Response with Multiple Models
  async generateResponse(
    message: string, 
    context: string = '',
    model: 'gemini' | 'gpt-4' | 'claude' = 'gemini',
    mode: 'general' | 'code' | 'debug' | 'learning' | 'circuit' = 'general'
  ): Promise<string> {
    try {
      const systemPrompt = this.getSystemPrompt(mode);
      const fullPrompt = `${systemPrompt}\n\nContext: ${context}\n\nUser: ${message}`;

      switch (model) {
        case 'gemini':
          return await this.generateGeminiResponse(fullPrompt);
        case 'gpt-4':
          return await this.generateOpenAIResponse(fullPrompt);
        case 'claude':
          return await this.generateClaudeResponse(fullPrompt);
        default:
          return await this.generateGeminiResponse(fullPrompt);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize, but I encountered an error. Please try again.';
    }
  }

  private async generateGeminiResponse(prompt: string): Promise<string> {
    if (!this.geminiAI) {
      throw new Error('Gemini AI not initialized');
    }

    try {
      const model = this.geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  private async generateOpenAIResponse(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await response.json() as OpenAIResponse;
    return data.choices[0]?.message?.content || 'No response generated';
  }

  private async generateClaudeResponse(prompt: string): Promise<string> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey === 'your_claude_api_key_here') {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json() as ClaudeResponse;
    return data.content[0]?.text || 'No response generated';
  }

  private getSystemPrompt(mode: string): string {
    const basePrompt = `You are an expert Arduino IDE AI assistant that helps users from beginners to advanced developers. You provide clear, educational, and practical guidance.`;

    switch (mode) {
      case 'learning':
        return `${basePrompt} Focus on educational explanations, step-by-step tutorials, and helping users understand concepts. Always provide examples and explain the 'why' behind solutions.`;
      
      case 'code':
        return `${basePrompt} Focus on code generation, optimization, and debugging. Provide clean, well-commented code with explanations of how it works.`;
      
      case 'debug':
        return `${basePrompt} Focus on identifying and solving problems. Ask clarifying questions when needed and provide systematic debugging approaches.`;
      
      case 'circuit':
        return `${basePrompt} Focus on circuit design, component selection, and connection diagrams. Explain electrical concepts and safety considerations.`;
      
      default:
        return `${basePrompt} Provide helpful, accurate, and educational responses tailored to the user's skill level.`;
    }
  }

  // Get Auto Suggestions
  getAutoSuggestions(input: string, category?: string): AutoSuggestion[] {
    const filtered = this.autoSuggestions.filter(suggestion => {
      const matchesText = suggestion.text.toLowerCase().includes(input.toLowerCase()) ||
                         suggestion.description.toLowerCase().includes(input.toLowerCase());
      const matchesCategory = !category || suggestion.category === category;
      return matchesText && matchesCategory;
    });

    return filtered.slice(0, 10); // Limit to 10 suggestions
  }

  // Get Learning Resources
  getLearningResources(difficulty?: string, category?: string): LearningResource[] {
    return this.learningResources.filter(resource => {
      const matchesDifficulty = !difficulty || resource.difficulty === difficulty;
      const matchesCategory = !category || resource.category === category;
      return matchesDifficulty && matchesCategory;
    });
  }

  // Get Circuit Diagrams
  getCircuitDiagrams(category?: string, difficulty?: string): CircuitDiagram[] {
    return this.circuitDiagrams.filter(diagram => {
      const matchesCategory = !category || diagram.category === category;
      const matchesDifficulty = !difficulty || diagram.difficulty === difficulty;
      return matchesCategory && matchesDifficulty;
    });
  }

  // Generate Circuit Diagram
  async generateCircuitDiagram(description: string): Promise<string> {
    const prompt = `Generate a detailed ASCII circuit diagram and connection instructions for: ${description}. Include component list, connections, and Arduino code.`;
    return await this.generateResponse(prompt, '', 'gemini', 'circuit');
  }

  // Explain Code
  async explainCode(code: string, userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): Promise<string> {
    const prompt = `Explain this Arduino code for a ${userLevel} level user. Break down each part and explain what it does:\n\n${code}`;
    return await this.generateResponse(prompt, '', 'gemini', 'learning');
  }

  // Debug Code
  async debugCode(code: string, error: string): Promise<string> {
    const prompt = `Help debug this Arduino code. Error: ${error}\n\nCode:\n${code}\n\nProvide a solution and explanation.`;
    return await this.generateResponse(prompt, '', 'gemini', 'debug');
  }

  // Load predefined data
  private loadAutoSuggestions() {
    this.autoSuggestions = [
      // Arduino Functions
      { text: 'pinMode()', description: 'Configure a pin as input or output', category: 'function', example: 'pinMode(13, OUTPUT);' },
      { text: 'digitalWrite()', description: 'Write HIGH or LOW to a digital pin', category: 'function', example: 'digitalWrite(13, HIGH);' },
      { text: 'digitalRead()', description: 'Read the value from a digital pin', category: 'function', example: 'int value = digitalRead(2);' },
      { text: 'analogRead()', description: 'Read analog value from pin', category: 'function', example: 'int sensorValue = analogRead(A0);' },
      { text: 'analogWrite()', description: 'Write PWM value to pin', category: 'function', example: 'analogWrite(9, 128);' },
      { text: 'delay()', description: 'Pause program for specified milliseconds', category: 'function', example: 'delay(1000);' },
      { text: 'delayMicroseconds()', description: 'Pause for microseconds', category: 'function', example: 'delayMicroseconds(500);' },
      { text: 'Serial.begin()', description: 'Initialize serial communication', category: 'function', example: 'Serial.begin(9600);' },
      { text: 'Serial.print()', description: 'Print data to serial monitor', category: 'function', example: 'Serial.print("Hello");' },
      { text: 'Serial.println()', description: 'Print data with newline', category: 'function', example: 'Serial.println("World");' },
      
      // Variables
      { text: 'int', description: 'Integer variable type', category: 'variable', example: 'int ledPin = 13;' },
      { text: 'float', description: 'Floating point number', category: 'variable', example: 'float temperature = 25.5;' },
      { text: 'bool', description: 'Boolean true/false', category: 'variable', example: 'bool isOn = true;' },
      { text: 'String', description: 'Text string variable', category: 'variable', example: 'String message = "Hello";' },
      { text: 'const', description: 'Constant value', category: 'variable', example: 'const int LED_PIN = 13;' },
      
      // Libraries
      { text: '#include <Servo.h>', description: 'Include Servo library', category: 'library' },
      { text: '#include <LiquidCrystal.h>', description: 'Include LCD library', category: 'library' },
      { text: '#include <WiFi.h>', description: 'Include WiFi library', category: 'library' },
      { text: '#include <Wire.h>', description: 'Include I2C library', category: 'library' },
      { text: '#include <SPI.h>', description: 'Include SPI library', category: 'library' },
      
      // Concepts
      { text: 'setup()', description: 'Function that runs once at startup', category: 'concept' },
      { text: 'loop()', description: 'Function that runs repeatedly', category: 'concept' },
      { text: 'PWM', description: 'Pulse Width Modulation for analog output', category: 'concept' },
      { text: 'I2C', description: 'Two-wire communication protocol', category: 'concept' },
      { text: 'SPI', description: 'Serial Peripheral Interface', category: 'concept' },
      { text: 'interrupt', description: 'Hardware interrupt handling', category: 'concept' },
    ];
  }

  private loadLearningResources() {
    this.learningResources = [
      {
        id: '1',
        title: 'Arduino Basics',
        description: 'Learn the fundamentals of Arduino programming',
        difficulty: 'beginner',
        category: 'basics',
        content: 'Arduino is an open-source electronics platform...',
        examples: ['Blink LED', 'Read sensor', 'Serial communication'],
        relatedTopics: ['setup()', 'loop()', 'pinMode()']
      },
      {
        id: '2',
        title: 'Digital I/O',
        description: 'Understanding digital input and output',
        difficulty: 'beginner',
        category: 'io',
        content: 'Digital pins can read HIGH/LOW states...',
        examples: ['Button input', 'LED control', 'Switch detection'],
        relatedTopics: ['digitalWrite()', 'digitalRead()', 'pullup resistors']
      },
      {
        id: '3',
        title: 'Analog Signals',
        description: 'Working with analog inputs and PWM outputs',
        difficulty: 'intermediate',
        category: 'io',
        content: 'Analog signals have continuous values...',
        examples: ['Sensor reading', 'Motor speed control', 'LED brightness'],
        relatedTopics: ['analogRead()', 'analogWrite()', 'ADC', 'PWM']
      }
    ];
  }

  private loadCircuitDiagrams() {
    this.circuitDiagrams = [
      {
        id: '1',
        name: 'Basic LED Circuit',
        description: 'Simple LED with current limiting resistor',
        components: ['Arduino Uno', 'LED', '220Ω Resistor', 'Breadboard', 'Jumper wires'],
        connections: [
          'Arduino Pin 13 → Resistor → LED Anode',
          'LED Cathode → Arduino GND'
        ],
        code: `
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
        difficulty: 'beginner',
        category: 'basic'
      },
      {
        id: '2',
        name: 'Button Input',
        description: 'Read button press with pull-up resistor',
        components: ['Arduino Uno', 'Push button', '10kΩ Resistor', 'Breadboard', 'Jumper wires'],
        connections: [
          'Button Pin 1 → Arduino Pin 2',
          'Button Pin 1 → 10kΩ Resistor → 5V',
          'Button Pin 2 → GND'
        ],
        code: `
void setup() {
  pinMode(2, INPUT);
  Serial.begin(9600);
}

void loop() {
  int buttonState = digitalRead(2);
  Serial.println(buttonState);
  delay(100);
}`,
        difficulty: 'beginner',
        category: 'input'
      }
    ];
  }

  // Feedback System
  async submitFeedback(
    type: 'bug' | 'feature' | 'improvement' | 'question',
    content: string,
    context?: string
  ): Promise<boolean> {
    try {
      const feedback = {
        type,
        content,
        context,
        timestamp: new Date().toISOString(),
        userAgent: 'Arduino IDE Enhanced'
      };

      // Store locally for now (could be sent to server later)
      console.log('Feedback submitted:', feedback);

      console.log('Feedback submitted:', feedback);
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  }

  // Get conversation history
  getConversationHistory(): AIMessage[] {
    return this.conversationHistory;
  }

  // Add message to history
  addToHistory(message: AIMessage) {
    this.conversationHistory.push(message);
    // Keep only last 50 messages
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
  }

  // Clear history
  clearHistory() {
    this.conversationHistory = [];
  }
}

export default EnhancedAIService;
export type { AIMessage, LearningResource, CircuitDiagram, AutoSuggestion };
