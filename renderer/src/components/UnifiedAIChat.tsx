import React, { useState, useEffect, useRef, useCallback } from 'react';
import './UnifiedAIChat.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokensUsed?: number;
  isTyping?: boolean;
}

interface AIModel {
  id: string;
  displayName: string;
  provider: string;
  isOnline: boolean;
  description?: string;
  maxTokens?: number;
  icon?: string;
}

interface UnifiedAIChatProps {
  onCodeGenerated?: (code: string) => void;
  currentFile?: string;
  projectPath?: string;
  isArduinoIDEMode?: boolean;
  defaultMode?: 'panel' | 'minimized' | 'floating';
}

const UnifiedAIChat: React.FC<UnifiedAIChatProps> = ({
  onCodeGenerated,
  currentFile,
  projectPath,
  isArduinoIDEMode = true,
  defaultMode = 'panel'
}) => {
  const [mode, setMode] = useState<'panel' | 'minimized' | 'floating' | 'hidden'>(defaultMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize available models
  useEffect(() => {
    const models: AIModel[] = [
      {
        id: 'gpt-4',
        displayName: 'GPT-4',
        provider: 'OpenAI',
        isOnline: true,
        description: 'Most capable model for complex Arduino programming',
        maxTokens: 8192,
        icon: '🧠'
      },
      {
        id: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        isOnline: true,
        description: 'Fast and efficient for most Arduino tasks',
        maxTokens: 4096,
        icon: '⚡'
      },
      {
        id: 'gemini-pro',
        displayName: 'Gemini Pro',
        provider: 'Google',
        isOnline: true,
        description: 'Google\'s advanced AI for Arduino development',
        maxTokens: 30720,
        icon: '💎'
      },
      {
        id: 'claude-3',
        displayName: 'Claude 3',
        provider: 'Anthropic',
        isOnline: false,
        description: 'Helpful AI assistant (offline)',
        maxTokens: 4096,
        icon: '🎭'
      }
    ];
    setAvailableModels(models);
  }, []);

  useEffect(() => {
    loadModels();
    if (messages.length === 0) {
      addSystemMessage(`🤖 **Arduino AI Assistant Ready!**

Welcome to your comprehensive Arduino development companion! I can help you with:

• **Code Generation** - Write Arduino sketches from descriptions
• **Circuit Design** - Component selection and wiring guidance  
• **Debugging** - Troubleshoot code and hardware issues
• **Learning** - Tutorials from beginner to advanced
• **Components** - Detailed guides for sensors, motors, etc.
• **Projects** - Complete project walkthroughs

**🚀 Try asking:** "Blink an LED" | "Read temperature sensor" | "Debug my code" | "Learn Arduino basics"

*Created by [Dayanand Darpan](https://www.dayananddarpan.me/) - Making Arduino development accessible to everyone!*

What would you like to work on today?`);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadModels = async () => {
    try {
      // Check if we're in electron environment
      if (window.electronAPI?.ai?.getAvailableModels) {
        const models = await window.electronAPI.ai.getAvailableModels();
        if (models && models.length > 0) {
          setAvailableModels(models);
          setSelectedModel(models[0].id);
          return;
        }
      }
      
      // Fallback for web mode or if electron API fails
      const fallbackModels = [
        { id: 'local', displayName: 'Local Arduino AI', provider: 'offline', isOnline: false, description: 'Offline Arduino assistant with built-in knowledge' },
        { id: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', isOnline: true, description: 'Latest OpenAI model' },
        { id: 'gemini-pro', displayName: 'Gemini Pro', provider: 'google', isOnline: true, description: 'Google Gemini Pro' },
        { id: 'claude-sonnet', displayName: 'Claude Sonnet', provider: 'anthropic', isOnline: true, description: 'Anthropic Claude' }
      ];
      setAvailableModels(fallbackModels);
      setSelectedModel('local');
    } catch (error) {
      console.warn('Failed to load AI models, using offline mode:', error);
      const offlineModel = [
        { id: 'local', displayName: 'Local Arduino AI', provider: 'offline', isOnline: false, description: 'Offline Arduino assistant' }
      ];
      setAvailableModels(offlineModel);
      setSelectedModel('local');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Typing animation function
  const typeMessage = (text: string, callback?: () => void) => {
    setIsTyping(true);
    setTypingMessage('');
    
    let currentIndex = 0;
    const typeSpeed = 30; // milliseconds per character
    
    const typeChar = () => {
      if (currentIndex < text.length) {
        setTypingMessage(prev => prev + text[currentIndex]);
        currentIndex++;
        typingTimeoutRef.current = setTimeout(typeChar, typeSpeed);
      } else {
        setIsTyping(false);
        if (callback) callback();
      }
    };
    
    typeChar();
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setTypingMessage('');
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}-${Math.random()}`,
      role: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const addUserMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    return userMessage.id;
  };

  const addAssistantMessage = (content: string, model?: string, tokensUsed?: number, useTyping: boolean = true) => {
    if (useTyping && mode !== 'minimized') {
      // Create a placeholder message first
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model,
        tokensUsed,
        isTyping: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Start typing animation
      typeMessage(content, () => {
        // Update the message with final content
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content, isTyping: false }
            : msg
        ));
      });
      
      return assistantMessage.id;
    } else {
      // Add message immediately without typing
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        model,
        tokensUsed
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Extract code if present and call callback
      if (onCodeGenerated) {
        const codeMatch = content.match(/```(?:cpp|c|arduino)?\n([\s\S]*?)\n```/);
        if (codeMatch) {
          onCodeGenerated(codeMatch[1]);
        }
      }
      
      return assistantMessage.id;
    }
  };

  const getEnhancedOfflineResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    // LED/Blink patterns
    if (lowerQuery.includes('led') || lowerQuery.includes('blink')) {
      return `Here's a comprehensive LED control example:

\`\`\`cpp
// Advanced LED Control System
const int ledPin = 13;
const int potPin = A0;
const int buttonPin = 2;

bool ledState = false;
unsigned long previousMillis = 0;
int blinkInterval = 1000;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  Serial.begin(9600);
  Serial.println("LED Control System Ready");
}

void loop() {
  // Read potentiometer for blink speed
  int potValue = analogRead(potPin);
  blinkInterval = map(potValue, 0, 1023, 100, 2000);
  
  // Check button for manual control
  if (digitalRead(buttonPin) == LOW) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState);
    delay(200); // Debounce
  }
  
  // Auto blink based on potentiometer
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= blinkInterval) {
    previousMillis = currentMillis;
    ledState = !ledState;
    digitalWrite(ledPin, ledState);
    
    Serial.print("LED: ");
    Serial.print(ledState ? "ON" : "OFF");
    Serial.print(" | Interval: ");
    Serial.println(blinkInterval);
  }
}
\`\`\`

💡 **Hardware Setup:**
• LED connected to pin 13 (with 220Ω resistor)
• Potentiometer on pin A0 for speed control
• Push button on pin 2 for manual control
• Most Arduino boards have built-in LED on pin 13

🔧 **Features:**
• Variable blink speed with potentiometer
• Manual LED toggle with button
• Serial monitor feedback
• Non-blocking timing using millis()`;
    }
    
    // Sensor patterns
    if (lowerQuery.includes('sensor') || lowerQuery.includes('temperature') || lowerQuery.includes('humidity')) {
      return `Here's a comprehensive sensor reading system:

\`\`\`cpp
// Multi-Sensor Monitoring System
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22
#define LDR_PIN A0
#define TEMP_ANALOG_PIN A1

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("Multi-Sensor System Started");
  Serial.println("Temp(C) | Humidity(%) | Light(%)");
}

void loop() {
  // DHT22 readings
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Light sensor (LDR)
  int lightLevel = analogRead(LDR_PIN);
  float lightPercent = map(lightLevel, 0, 1023, 0, 100);
  
  // Display readings
  if (!isnan(temperature)) {
    Serial.print(temperature, 1);
  } else {
    Serial.print("ERR");
  }
  Serial.print(" | ");
  
  if (!isnan(humidity)) {
    Serial.print(humidity, 1);
  } else {
    Serial.print("ERR");
  }
  Serial.print(" | ");
  Serial.println(lightPercent, 0);
  
  delay(2000);
}
\`\`\`

📡 **Libraries:** Install DHT sensor library from Library Manager
🔌 **Wiring:** DHT22→Pin 2, LDR→A0 with pull-down resistor
💡 **Common Sensors:** DHT11/22, LM35, LDR, Ultrasonic, Gas sensors`;
    }
    
    // Motor patterns
    if (lowerQuery.includes('motor') || lowerQuery.includes('servo')) {
      return `Here's a motor control example:

\`\`\`cpp
// Servo Motor Control
#include <Servo.h>

Servo myServo;
const int servoPin = 9;
const int potPin = A0;

void setup() {
  myServo.attach(servoPin);
  Serial.begin(9600);
  Serial.println("Servo Control Ready");
}

void loop() {
  int potValue = analogRead(potPin);
  int angle = map(potValue, 0, 1023, 0, 180);
  myServo.write(angle);
  
  Serial.print("Angle: ");
  Serial.println(angle);
  
  delay(15);
}
\`\`\`

⚙️ **Wiring:** Servo red→5V, brown→GND, orange→Pin 9
🔧 **Control:** Potentiometer on A0 controls servo position`;
    }
    
    // Default response
    return `🤖 **Arduino Development Assistant (Offline Mode)**

I can help you with Arduino projects! Try these topics:

**💻 Code Examples:**
• "LED" - Lighting and control projects
• "sensor" - Temperature, humidity, light sensors
• "motor" - Servo and stepper motor control
• "WiFi" - IoT connectivity projects

**🔧 Hardware Guidance:**
• Component selection and wiring
• Circuit troubleshooting
• Library recommendations
• Best practices

**📚 Project Ideas:**
• Home automation systems
• Environmental monitoring
• Robotics and motion control
• Data logging projects

What would you like to build today?`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessageId = addUserMessage(inputMessage);
    const query = inputMessage;
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Enhanced Arduino-focused prompt
      let enhancedQuery = query;
      if (isArduinoIDEMode) {
        enhancedQuery = `As an Arduino development assistant, help with: ${query}. 
        Please provide specific Arduino code examples, circuit diagrams if needed, 
        library recommendations, and step-by-step instructions when appropriate.
        ${currentFile ? `Current file: ${currentFile}` : ''}
        ${projectPath ? `Project: ${projectPath}` : ''}`;
      }

      let response: any = null;
      
      // Try electron API first
      if (window.electronAPI?.ai?.chat) {
        try {
          const aiMessages = [
            { 
              id: 'system-prompt',
              role: 'system' as const, 
              content: 'You are an Arduino AI assistant. Provide helpful, accurate responses for Arduino development.',
              timestamp: new Date()
            },
            { 
              id: `user-${Date.now()}`,
              role: 'user' as const, 
              content: enhancedQuery,
              timestamp: new Date()
            }
          ];
          response = await window.electronAPI.ai.chat(aiMessages, selectedModel);
        } catch (apiError) {
          console.warn('Electron AI API failed, falling back to offline mode:', apiError);
        }
      }

      // Process response or fallback to offline
      if (response) {
        let formattedResponse: string = response;
        
        if (typeof response === 'object' && response.content) {
          formattedResponse = response.content;
        }
        
        if (isArduinoIDEMode && typeof formattedResponse === 'string') {
          const hasCode = formattedResponse.includes('```');
          if (hasCode) {
            formattedResponse += `\n\n💡 **Quick Actions:**\n• Copy code to editor\n• View component wiring\n• Check library requirements\n• Test with serial monitor`;
          }
        }
        
        addAssistantMessage(formattedResponse, selectedModel);
      } else {
        // Enhanced offline response system
        const offlineResponse = getEnhancedOfflineResponse(query);
        addAssistantMessage(offlineResponse, 'Local Arduino AI');
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      const offlineResponse = getEnhancedOfflineResponse(query);
      addAssistantMessage(offlineResponse, 'Local Arduino AI (Offline)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    addSystemMessage('Chat cleared! How can I help you with your Arduino project?');
  };

  const formatMessage = (content: string) => {
    let formatted = content;
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
      return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
    });
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    return formatted;
  };

  const quickActions = [
    { id: 'led', text: '💡 LED', prompt: 'Help me create LED control projects' },
    { id: 'sensor', text: '📡 Sensors', prompt: 'I need help with sensor readings' },
    { id: 'motor', text: '⚙️ Motors', prompt: 'Help me control servo motors' },
    { id: 'debug', text: '🐛 Debug', prompt: 'Debug my Arduino code' }
  ];

  // Return different JSX based on mode
  if (mode === 'hidden') {
    return (
      <div className="chat-icon-button" onClick={() => setMode('floating')}>
        🤖
        <span className="chat-tooltip">Open AI Assistant</span>
      </div>
    );
  }

  if (mode === 'minimized') {
    return (
      <div className="unified-chat minimized">
        <div className="chat-header" onClick={() => setMode('floating')}>
          <div className="chat-title">
            <span className="chat-icon">🤖</span>
            <span className="chat-name">Arduino AI</span>
            {selectedModel && (
              <span className="model-indicator">
                {availableModels.find(m => m.id === selectedModel)?.displayName || selectedModel}
              </span>
            )}
          </div>
          <div className="chat-controls">
            <button
              className="control-button"
              onClick={(e) => { e.stopPropagation(); setMode('hidden'); }}
              title="Hide"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPanel = mode === 'panel';
  const isFloating = mode === 'floating';

  return (
    <div className={`unified-chat ${isPanel ? 'panel-mode' : 'floating-mode'}`}>
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">🤖</span>
          <span className="chat-name">Arduino AI Assistant</span>
          {selectedModel && (
            <span className="model-indicator">
              {availableModels.find(m => m.id === selectedModel)?.displayName || selectedModel}
            </span>
          )}
        </div>
        
        <div className="chat-controls">
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            title="Select AI Model"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.icon} {model.displayName}
                <span className={`model-status ${model.isOnline ? 'online' : 'offline'}`}></span>
              </option>
            ))}
          </select>
          <button
            className="control-button"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            className="control-button"
            onClick={clearChat}
            title="Clear Chat"
          >
            🗑️
          </button>
          {isFloating && (
            <>
              <button
                className="control-button"
                onClick={() => setMode('minimized')}
                title="Minimize"
              >
                🔽
              </button>
              <button
                className="control-button"
                onClick={() => setMode('hidden')}
                title="Close"
              >
                ✕
              </button>
            </>
          )}
          {isPanel && (
            <button
              className="control-button"
              onClick={() => setMode('floating')}
              title="Pop Out"
            >
              📤
            </button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="chat-settings">
          <div className="setting-row">
            <label>AI Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-select"
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.displayName} {model.isOnline ? '🌐' : '💻'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="setting-row">
            <label>
              <input
                type="checkbox"
                checked={showQuickActions}
                onChange={(e) => setShowQuickActions(e.target.checked)}
              />
              Show Quick Actions
            </label>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role} ${message.isTyping ? 'typing' : ''}`}>
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : 'ℹ️'}
              </span>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
              {message.model && (
                <span className="message-model">{message.model}</span>
              )}
            </div>
            <div className="message-content">
              {message.isTyping ? (
                <div className="typing-text">
                  <span dangerouslySetInnerHTML={{ __html: formatMessage(typingMessage) }} />
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
              )}
            </div>
          </div>
        ))}
        
        {isTyping && !messages.some(m => m.isTyping) && (
          <div className="typing-indicator">
            <span>🤖 AI is typing</span>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        {isProcessing && !isTyping && (
          <div className="message assistant processing">
            <div className="message-header">
              <span className="message-role">🤖</span>
              <span className="message-time">Processing...</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        {showQuickActions && (
          <div className="quick-actions">
            {quickActions.map(action => (
              <button
                key={action.id}
                className="quick-action"
                onClick={() => setInputMessage(action.prompt)}
              >
                {action.text}
              </button>
            ))}
          </div>
        )}
        
        <div className="input-row">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about Arduino projects, code help, components..."
            className="chat-input"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className="send-button"
          >
            {isProcessing ? '⏳' : '🚀'}
          </button>
        </div>
      </div>
      
      {/* Enhanced Developer Credit */}
      <div className="developer-credit">
        <span>Created by </span>
        <a href="https://www.dayananddarpan.me/" target="_blank" rel="noopener noreferrer">
          Dayanand Darpan
        </a>
      </div>
    </div>
  );
};

export default UnifiedAIChat;
