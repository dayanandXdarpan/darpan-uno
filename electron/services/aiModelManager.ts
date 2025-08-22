import { EventEmitter } from 'events';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'google' | 'anthropic' | 'local' | 'offline';
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  isAvailable: boolean;
  isOnline: boolean;
  maxTokens: number;
  supportedFeatures: {
    codeGeneration: boolean;
    codeExplanation: boolean;
    debugging: boolean;
    optimization: boolean;
    imageRecognition: boolean;
    conversation: boolean;
  };
  pricing?: {
    inputTokens: number;
    outputTokens: number;
    currency: string;
  };
}

export interface AIModelConfig {
  selectedModel: string;
  apiKeys: Record<string, string>;
  offlineMode: boolean;
  fallbackToOffline: boolean;
  rateLimits: Record<string, { requestsPerMinute: number; tokensPerMinute: number }>;
}

export interface AIRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  systemPrompt?: string;
  imageData?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  responseTime: number;
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
}

export class AIModelManager extends EventEmitter {
  private config: AIModelConfig;
  private models: Map<string, AIModel> = new Map();
  private rateLimiters: Map<string, { requests: number[]; tokens: number[]; }> = new Map();
  private offlineFallback: boolean = true;

  constructor() {
    super();
    this.initializeModels();
    this.loadConfig();
    this.setupRateLimiters();
  }

  private initializeModels(): void {
    const models: AIModel[] = [
      // OpenAI Models
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        displayName: 'GPT-4o (Latest)',
        description: 'Most capable OpenAI model with vision and code capabilities',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 128000,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.005, outputTokens: 0.015, currency: 'USD' }
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        displayName: 'GPT-4 Turbo',
        description: 'Fast and capable model with large context window',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 128000,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.01, outputTokens: 0.03, currency: 'USD' }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        displayName: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective model for most tasks',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 16385,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: false,
          conversation: true
        },
        pricing: { inputTokens: 0.001, outputTokens: 0.002, currency: 'USD' }
      },

      // Google Gemini Models
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'google',
        displayName: 'Gemini Pro',
        description: 'Google\'s most capable model for complex reasoning',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 32768,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.00025, outputTokens: 0.0005, currency: 'USD' }
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        provider: 'google',
        displayName: 'Gemini Pro Vision',
        description: 'Gemini with advanced vision capabilities',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 32768,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.00025, outputTokens: 0.0005, currency: 'USD' }
      },
      {
        id: 'gemini-flash',
        name: 'Gemini Flash',
        provider: 'google',
        displayName: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model for quick responses',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 1048576,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.00015, outputTokens: 0.0006, currency: 'USD' }
      },

      // Anthropic Claude Models
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        displayName: 'Claude 3 Sonnet',
        description: 'Balanced model for complex tasks and conversations',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 200000,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.003, outputTokens: 0.015, currency: 'USD' }
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        displayName: 'Claude 3 Haiku',
        description: 'Fast and efficient model for quick tasks',
        requiresApiKey: true,
        isAvailable: false,
        isOnline: true,
        maxTokens: 200000,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: true,
          imageRecognition: true,
          conversation: true
        },
        pricing: { inputTokens: 0.00025, outputTokens: 0.00125, currency: 'USD' }
      },

      // Local/Offline Models
      {
        id: 'arduino-offline',
        name: 'Arduino Assistant (Offline)',
        provider: 'local',
        displayName: 'Arduino Assistant (Offline)',
        description: 'Built-in Arduino knowledge base and templates',
        requiresApiKey: false,
        isAvailable: true,
        isOnline: false,
        maxTokens: 8192,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: true,
          debugging: true,
          optimization: false,
          imageRecognition: false,
          conversation: true
        }
      },
      {
        id: 'template-engine',
        name: 'Template Engine',
        provider: 'offline',
        displayName: 'Smart Templates',
        description: 'Pre-built Arduino project templates and code snippets',
        requiresApiKey: false,
        isAvailable: true,
        isOnline: false,
        maxTokens: 4096,
        supportedFeatures: {
          codeGeneration: true,
          codeExplanation: false,
          debugging: false,
          optimization: false,
          imageRecognition: false,
          conversation: false
        }
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
      if (!model.requiresApiKey) {
        model.isAvailable = true;
      }
    });

    console.log(`Loaded ${this.models.size} AI models`);
  }

  private loadConfig(): void {
    try {
      const configPath = require('path').join(require('os').homedir(), '.arduino-ai-config.json');
      const fs = require('fs');
      
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        this.config = {
          selectedModel: 'arduino-offline',
          apiKeys: {},
          offlineMode: false,
          fallbackToOffline: true,
          rateLimits: {
            'openai': { requestsPerMinute: 60, tokensPerMinute: 90000 },
            'google': { requestsPerMinute: 60, tokensPerMinute: 32000 },
            'anthropic': { requestsPerMinute: 50, tokensPerMinute: 40000 }
          }
        };
        this.saveConfig();
      }

      // Update model availability based on API keys
      this.updateModelAvailability();
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = {
        selectedModel: 'arduino-offline',
        apiKeys: {},
        offlineMode: false,
        fallbackToOffline: true,
        rateLimits: {
          'openai': { requestsPerMinute: 60, tokensPerMinute: 90000 },
          'google': { requestsPerMinute: 60, tokensPerMinute: 32000 },
          'anthropic': { requestsPerMinute: 50, tokensPerMinute: 40000 }
        }
      };
    }
  }

  private saveConfig(): void {
    try {
      const configPath = require('path').join(require('os').homedir(), '.arduino-ai-config.json');
      const fs = require('fs');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  private setupRateLimiters(): void {
    Object.keys(this.config.rateLimits).forEach(provider => {
      this.rateLimiters.set(provider, {
        requests: [],
        tokens: []
      });
    });

    // Clean up old rate limit data every minute
    setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      this.rateLimiters.forEach(limiter => {
        limiter.requests = limiter.requests.filter(time => time > oneMinuteAgo);
        limiter.tokens = limiter.tokens.filter(time => time > oneMinuteAgo);
      });
    }, 60000);
  }

  private updateModelAvailability(): void {
    this.models.forEach(model => {
      if (model.requiresApiKey) {
        const hasApiKey = this.config.apiKeys[model.provider] && 
                          this.config.apiKeys[model.provider].trim().length > 0;
        model.isAvailable = hasApiKey && !this.config.offlineMode;
      }
    });

    this.emit('models-updated', Array.from(this.models.values()));
  }

  // Public API Methods
  public getAvailableModels(): AIModel[] {
    return Array.from(this.models.values()).filter(model => model.isAvailable);
  }

  public getAllModels(): AIModel[] {
    return Array.from(this.models.values());
  }

  public getSelectedModel(): AIModel | null {
    return this.models.get(this.config.selectedModel) || null;
  }

  public setSelectedModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (model && model.isAvailable) {
      this.config.selectedModel = modelId;
      this.saveConfig();
      this.emit('model-changed', model);
      return true;
    }
    return false;
  }

  public setApiKey(provider: string, apiKey: string): void {
    this.config.apiKeys[provider] = apiKey;
    this.saveConfig();
    this.updateModelAvailability();
    this.emit('api-key-updated', provider);
  }

  public getApiKey(provider: string): string {
    return this.config.apiKeys[provider] || '';
  }

  public setOfflineMode(offline: boolean): void {
    this.config.offlineMode = offline;
    this.saveConfig();
    this.updateModelAvailability();
    this.emit('offline-mode-changed', offline);
  }

  public isOfflineMode(): boolean {
    return this.config.offlineMode;
  }

  public async makeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    let selectedModel = request.model ? 
      this.models.get(request.model) : 
      this.getSelectedModel();

    if (!selectedModel || !selectedModel.isAvailable) {
      // Fallback to offline model if available
      if (this.config.fallbackToOffline) {
        selectedModel = this.models.get('arduino-offline');
        if (!selectedModel) {
          return {
            content: '',
            model: 'none',
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            success: false,
            error: 'No available AI models'
          };
        }
      } else {
        return {
          content: '',
          model: selectedModel?.id || 'none',
          tokensUsed: 0,
          responseTime: Date.now() - startTime,
          success: false,
          error: 'Selected model is not available'
        };
      }
    }

    // Check rate limits for online models
    if (selectedModel.isOnline && !this.checkRateLimit(selectedModel.provider)) {
      // Try offline fallback
      if (this.config.fallbackToOffline) {
        const offlineModel = this.models.get('arduino-offline');
        if (offlineModel && offlineModel.isAvailable) {
          return await this.makeOfflineRequest(request, offlineModel, startTime, true);
        }
      }
      
      return {
        content: '',
        model: selectedModel.id,
        tokensUsed: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: 'Rate limit exceeded'
      };
    }

    try {
      if (selectedModel.isOnline) {
        return await this.makeOnlineRequest(request, selectedModel, startTime);
      } else {
        return await this.makeOfflineRequest(request, selectedModel, startTime);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      
      // Try offline fallback for online model failures
      if (selectedModel.isOnline && this.config.fallbackToOffline) {
        const offlineModel = this.models.get('arduino-offline');
        if (offlineModel && offlineModel.isAvailable) {
          return await this.makeOfflineRequest(request, offlineModel, startTime, true);
        }
      }

      return {
        content: '',
        model: selectedModel.id,
        tokensUsed: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private checkRateLimit(provider: string): boolean {
    const limiter = this.rateLimiters.get(provider);
    const limits = this.config.rateLimits[provider];
    
    if (!limiter || !limits) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Filter recent requests
    const recentRequests = limiter.requests.filter(time => time > oneMinuteAgo);
    
    return recentRequests.length < limits.requestsPerMinute;
  }

  private recordRateLimit(provider: string, tokensUsed: number): void {
    const limiter = this.rateLimiters.get(provider);
    if (limiter) {
      const now = Date.now();
      limiter.requests.push(now);
      for (let i = 0; i < tokensUsed; i++) {
        limiter.tokens.push(now);
      }
    }
  }

  private async makeOnlineRequest(request: AIRequest, model: AIModel, startTime: number): Promise<AIResponse> {
    const apiKey = this.config.apiKeys[model.provider];
    if (!apiKey) {
      throw new Error(`No API key configured for ${model.provider}`);
    }

    let response: any;
    let tokensUsed = 0;

    switch (model.provider) {
      case 'openai':
        response = await this.makeOpenAIRequest(request, model, apiKey);
        tokensUsed = response.usage?.total_tokens || 0;
        break;
      
      case 'google':
        response = await this.makeGoogleRequest(request, model, apiKey);
        tokensUsed = response.usageMetadata?.totalTokenCount || 0;
        break;
      
      case 'anthropic':
        response = await this.makeAnthropicRequest(request, model, apiKey);
        tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;
        break;
      
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }

    this.recordRateLimit(model.provider, tokensUsed);

    return {
      content: this.extractContent(response, model.provider),
      model: model.id,
      tokensUsed,
      responseTime: Date.now() - startTime,
      success: true
    };
  }

  private async makeOfflineRequest(request: AIRequest, model: AIModel, startTime: number, fallbackUsed: boolean = false): Promise<AIResponse> {
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));

    let content = '';
    
    if (model.id === 'arduino-offline') {
      content = await this.generateOfflineResponse(request);
    } else if (model.id === 'template-engine') {
      content = await this.generateTemplateResponse(request);
    }

    return {
      content,
      model: model.id,
      tokensUsed: 0,
      responseTime: Date.now() - startTime,
      success: true,
      fallbackUsed
    };
  }

  private async makeOpenAIRequest(request: AIRequest, model: AIModel, apiKey: string): Promise<any> {
    const messages: any[] = [
      {
        role: 'system',
        content: request.systemPrompt || 'You are an expert Arduino developer assistant.'
      }
    ];

    if (request.imageData && model.supportedFeatures.imageRecognition) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: request.prompt },
          { type: 'image_url', image_url: { url: request.imageData } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: request.context ? `Context: ${request.context}\n\nRequest: ${request.prompt}` : request.prompt
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.name,
        messages,
        max_tokens: request.maxTokens || Math.min(4096, model.maxTokens),
        temperature: request.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async makeGoogleRequest(request: AIRequest, model: AIModel, apiKey: string): Promise<any> {
    const content: any = {
      parts: [{ text: request.context ? `Context: ${request.context}\n\nRequest: ${request.prompt}` : request.prompt }]
    };

    if (request.imageData && model.supportedFeatures.imageRecognition) {
      content.parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: request.imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [content],
        generationConfig: {
          maxOutputTokens: request.maxTokens || Math.min(2048, model.maxTokens),
          temperature: request.temperature || 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async makeAnthropicRequest(request: AIRequest, model: AIModel, apiKey: string): Promise<any> {
    const messages = [
      {
        role: 'user',
        content: request.context ? `Context: ${request.context}\n\nRequest: ${request.prompt}` : request.prompt
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-api-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.name,
        messages,
        max_tokens: request.maxTokens || Math.min(4096, model.maxTokens),
        temperature: request.temperature || 0.7,
        system: request.systemPrompt || 'You are an expert Arduino developer assistant.'
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private extractContent(response: any, provider: string): string {
    switch (provider) {
      case 'openai':
        return response.choices?.[0]?.message?.content || '';
      
      case 'google':
        return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      case 'anthropic':
        return response.content?.[0]?.text || '';
      
      default:
        return '';
    }
  }

  private async generateOfflineResponse(request: AIRequest): Promise<string> {
    // Simple pattern matching for Arduino-specific requests
    const prompt = request.prompt.toLowerCase();
    
    if (prompt.includes('blink') && prompt.includes('led')) {
      return `// Simple LED Blink Example
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}

// This code blinks the built-in LED on pin 13 every second.
// Connect an external LED to pin 13 with a 220Ω resistor if needed.`;
    }
    
    if (prompt.includes('sensor') && prompt.includes('temperature')) {
      return `// Temperature Sensor Example (DHT22)
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print("°C, Humidity: ");
  Serial.print(humidity);
  Serial.println("%");
  
  delay(2000);
}

// Connect DHT22 VCC to 5V, GND to GND, and data pin to digital pin 2.`;
    }
    
    // Generic Arduino response
    return `// Arduino Code Template
void setup() {
  // Initialize your components here
  Serial.begin(9600);
}

void loop() {
  // Main program logic here
  
  delay(100); // Small delay to prevent overwhelming the processor
}

// For more specific help, try describing your project in detail.
// Available offline features: basic code templates, syntax help, and common patterns.`;
  }

  private async generateTemplateResponse(request: AIRequest): Promise<string> {
    // Return pre-built templates based on keywords
    const templates = {
      'servo': `#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  myServo.write(0);
  delay(1000);
  myServo.write(90);
  delay(1000);
  myServo.write(180);
  delay(1000);
}`,
      
      'button': `const int buttonPin = 2;
const int ledPin = 13;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }
}`,
      
      'ultrasonic': `const int trigPin = 9;
const int echoPin = 10;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  long duration, distance;
  
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  duration = pulseIn(echoPin, HIGH);
  distance = duration * 0.034 / 2;
  
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  
  delay(100);
}`
    };

    const prompt = request.prompt.toLowerCase();
    for (const [keyword, template] of Object.entries(templates)) {
      if (prompt.includes(keyword)) {
        return template;
      }
    }

    return 'No matching template found. Try keywords like: servo, button, ultrasonic, led, sensor';
  }

  // Configuration methods
  public getConfig(): AIModelConfig {
    return { ...this.config };
  }

  public updateRateLimit(provider: string, requestsPerMinute: number, tokensPerMinute: number): void {
    this.config.rateLimits[provider] = { requestsPerMinute, tokensPerMinute };
    this.saveConfig();
  }

  public async testConnection(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model || !model.isAvailable) return false;

    try {
      const response = await this.makeRequest({
        prompt: 'Test connection',
        maxTokens: 10,
        model: modelId
      });
      return response.success;
    } catch {
      return false;
    }
  }

  public getUsageStats(): Record<string, { requests: number; tokens: number }> {
    const stats: Record<string, { requests: number; tokens: number }> = {};
    
    this.rateLimiters.forEach((limiter, provider) => {
      stats[provider] = {
        requests: limiter.requests.length,
        tokens: limiter.tokens.length
      };
    });
    
    return stats;
  }
}

export default AIModelManager;
