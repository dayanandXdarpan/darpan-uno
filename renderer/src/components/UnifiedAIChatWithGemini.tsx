import React, { useState, useRef, useEffect, useCallback } from 'react';
import './UnifiedAIChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];
  model?: string;
}

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  title?: string;
}

interface UnifiedAIChatProps {
  currentFile: string;
  projectPath: string;
  onCodeGenerated?: (code: string) => void;
  onInsertCode?: (code: string) => void;
}

// Import GoogleGenerativeAI for Gemini integration
declare global {
  interface Window {
    googleAI?: any;
  }
}

export const UnifiedAIChatWithGemini: React.FC<UnifiedAIChatProps> = ({
  currentFile,
  projectPath,
  onCodeGenerated,
  onInsertCode
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'system',
      content: '🤖 **Arduino AI Assistant Ready!**\n\n**🚀 Now powered by Google Gemini!**\n\nI can help you with:\n• Arduino code generation and debugging\n• Circuit design suggestions\n• Library recommendations\n• Hardware troubleshooting\n• Project optimization\n\n**To use Gemini AI:** Click the settings icon to add your free Google API key!\n\nJust ask me anything about your Arduino project!',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [chatMode, setChatMode] = useState<'general' | 'code' | 'debug' | 'learning'>('general');
  const [apiKeys, setApiKeys] = useState({
    gemini: localStorage.getItem('gemini-api-key') || '',
    openai: localStorage.getItem('openai-api-key') || '',
    claude: localStorage.getItem('claude-api-key') || '',
    local: ''
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [configModel, setConfigModel] = useState('gemini');
  const [geminiService, setGeminiService] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize AI services when API keys are available
  useEffect(() => {
    if (apiKeys[selectedModel as keyof typeof apiKeys] && selectedModel !== 'local') {
      initializeAIService();
    }
  }, [apiKeys, selectedModel]);

  const initializeAIService = async () => {
    try {
      console.log(`${selectedModel} API Key configured successfully`);
    } catch (error) {
      console.error(`Failed to initialize ${selectedModel} service:`, error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const extractCodeBlocks = (content: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        id: `code-${Date.now()}-${Math.random()}`,
        language: match[1] || 'cpp',
        code: match[2].trim(),
        title: `${match[1] === 'cpp' ? 'Arduino C++' : match[1] || 'Code'} Example`
      });
    }

    return blocks;
  };

  const callAIAPI = async (userMessage: string): Promise<string> => {
    const currentApiKey = apiKeys[selectedModel as keyof typeof apiKeys];
    
    if (!currentApiKey && selectedModel !== 'local') {
      return getModelUnavailableMessage(selectedModel);
    }

    try {
      if (selectedModel === 'gemini') {
        return await callGeminiAPI(userMessage, currentApiKey);
      } else if (selectedModel === 'gpt-4' || selectedModel === 'gpt-3.5') {
        return await callOpenAIAPI(userMessage, currentApiKey);
      } else if (selectedModel === 'claude') {
        return await callClaudeAPI(userMessage, currentApiKey);
      } else if (selectedModel === 'local') {
        return getOfflineArduinoResponse(userMessage);
      } else {
        return getModelUnavailableMessage(selectedModel);
      }
    } catch (error) {
      console.error(`${selectedModel} API error:`, error);
      return `❌ **${selectedModel.toUpperCase()} API Error**\n\nSorry, there was an issue connecting to ${selectedModel} AI:\n${error}\n\nPlease check your API key and try again. I'll provide offline help instead!\n\n${getOfflineArduinoResponse(userMessage)}`;
    }
  };

  const getModelUnavailableMessage = (model: string): string => {
    const modelInfo = {
      'gpt-4': { name: 'GPT-4', provider: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
      'gpt-3.5': { name: 'GPT-3.5', provider: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
      'claude': { name: 'Claude', provider: 'Anthropic', url: 'https://console.anthropic.com/account/keys' },
      'gemini': { name: 'Gemini', provider: 'Google', url: 'https://makersuite.google.com/app/apikey' }
    };

    const info = modelInfo[model as keyof typeof modelInfo];
    
    if (!info) {
      return `⚠️ **Model Not Available**\n\n**${model}** is currently unavailable. This model is coming soon!\n\nFor now, please try:\n• 🚀 **Gemini** (Free)\n• 🤖 **Local AI** (Built-in)\n\n${getOfflineArduinoResponse('general help')}`;
    }

    return `🔑 **${info.name} API Key Required**\n\nTo use **${info.name}** by ${info.provider}, you need an API key:\n\n**🔧 Setup Steps:**\n1. Click ⚙️ settings button\n2. Select "${info.name}" from dropdown\n3. Get your API key: [${info.provider} Console](${info.url})\n4. Enter your key and save\n\n**💡 Alternative:** Try **Gemini** (free) or **Local AI** for immediate help!\n\n**Current offline response:**\n${getOfflineArduinoResponse('general help')}`;
  };

  const callGeminiAPI = async (userMessage: string, apiKey: string): Promise<string> => {
    const enhancedPrompt = `You are an expert Arduino developer and educator. Help with Arduino programming, circuit design, and electronics.

Context: Arduino IDE - ${chatMode} mode
Current file: ${currentFile || 'New sketch'}
Project: ${projectPath || 'Arduino project'}

User Query: ${userMessage}

Please provide:
1. Clear, practical answers with Arduino focus
2. Complete code examples when relevant
3. Circuit diagrams descriptions if needed
4. Safety considerations for electronics
5. Learning tips and next steps

Format your response with markdown for better readability. Use code blocks with \`\`\`cpp for Arduino code.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: enhancedPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    return generatedText;
  };

  const callOpenAIAPI = async (userMessage: string, apiKey: string): Promise<string> => {
    // OpenAI API implementation
    return `🚧 **OpenAI Integration Coming Soon!**\n\nOpenAI (GPT-4/GPT-3.5) integration is in development.\n\n**Current Status:** API key saved ✅\n**ETA:** Next update\n\n**For now, here's offline Arduino help:**\n\n${getOfflineArduinoResponse(userMessage)}`;
  };

  const callClaudeAPI = async (userMessage: string, apiKey: string): Promise<string> => {
    // Claude API implementation
    return `🚧 **Claude Integration Coming Soon!**\n\nClaude by Anthropic integration is in development.\n\n**Current Status:** API key saved ✅\n**ETA:** Next update\n\n**For now, here's offline Arduino help:**\n\n${getOfflineArduinoResponse(userMessage)}`;
  };

  const getOfflineArduinoResponse = (userMessage: string): string => {
    const keywords = userMessage.toLowerCase().split(' ');
    
    // Radar sensor project detection
    if (keywords.some(k => ['radar', 'motion', 'rcwl', 'hb100', 'doppler', 'microwave'].includes(k))) {
      return `## 🎯 Motion Detection with Radar Sensor

### 📡 **Recommended Sensors:**
- **RCWL-0516** (Digital output, easiest) 
- **HB100** (Analog, needs amplifier circuit)
- **PIR** (Alternative for basic motion)

### 🔧 **Basic RCWL-0516 Setup:**

\`\`\`cpp
// RCWL-0516 Motion Detection with Message Alert
const int radarPin = 2;       // RCWL OUT pin
const int ledPin = 13;        // Status LED
bool motionDetected = false;

void setup() {
  pinMode(radarPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("🎯 Radar Motion Detection Started!");
  Serial.println("Waiting for motion...");
}

void loop() {
  int motionState = digitalRead(radarPin);
  
  if (motionState == HIGH && !motionDetected) {
    motionDetected = true;
    digitalWrite(ledPin, HIGH);
    
    // 🚨 MOTION ALERT MESSAGE
    Serial.println("⚠️  MOTION DETECTED!");
    Serial.println("📍 Someone entered the radar zone");
    Serial.println("🕐 Time: " + String(millis()/1000) + "s");
    
    // Add your message sending code here:
    // sendSMS("Motion detected!");
    // sendTelegramMessage("Alert: Motion in area!");
    
    delay(2000); // Prevent spam
  }
  
  if (motionState == LOW && motionDetected) {
    motionDetected = false;
    digitalWrite(ledPin, LOW);
    Serial.println("✅ Area clear - No motion");
  }
  
  delay(100);
}
\`\`\`

### 📱 **To Send Actual Messages:**

**Option 1: SMS via GSM Module**
\`\`\`cpp
// Add SoftwareSerial for SIM800L
#include <SoftwareSerial.h>
SoftwareSerial gsm(7, 8);

void sendSMS(String message) {
  gsm.println("AT+CMGF=1");
  delay(1000);
  gsm.println("AT+CMGS=\\"+1234567890\\"");
  delay(1000);
  gsm.print(message);
  gsm.write(26); // Ctrl+Z to send
}
\`\`\`

**Option 2: WiFi Notification (ESP32/ESP8266)**
\`\`\`cpp
// Add WiFi and HTTP for web notifications
#include <WiFi.h>
#include <HTTPClient.h>

void sendTelegramAlert(String message) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
    String payload = "chat_id=" + CHAT_ID + "&text=" + message;
    // Send HTTP POST request
  }
}
\`\`\`

### ⚡ **Advanced Features:**
- **Range Control:** Adjust RCWL sensitivity (3-7m)
- **Noise Filtering:** Add software debounce
- **Multiple Zones:** Use multiple sensors
- **Data Logging:** Store detections with timestamps

### 🛠️ **Circuit Connections:**
\`\`\`
RCWL-0516:
VIN  → 5V (Arduino)
GND  → GND
OUT  → Digital Pin 2
3V3  → Not connected
CDS  → Optional light sensor disable
\`\`\`

### 🎯 **Your Project Enhancement Ideas:**
1. **Smart Security System** - Multiple sensors + camera trigger
2. **Automatic Lighting** - Turn on lights when motion detected
3. **Visitor Counter** - Count people entering/leaving
4. **Pet Monitor** - Alert when pets move in specific areas

**Need help with any specific part? Ask about:**
- "GSM module SMS setup"
- "ESP32 WiFi notifications"  
- "Multiple sensor zones"
- "False trigger prevention"`;
    }
    
    if (keywords.some(k => ['led', 'blink', 'light'].includes(k))) {
      return `## 💡 LED Blink - Arduino Classic

\`\`\`cpp
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("LED Blink Started!");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON");
  delay(1000);
  
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
\`\`\`

**Circuit:** Arduino Pin 13 → 220Ω Resistor → LED+ → LED- → GND

**Next Steps:** Try changing delay values or adding multiple LEDs!`;
    }

    if (keywords.some(k => ['sensor', 'analog', 'read'].includes(k))) {
      return `## 🌡️ Analog Sensor Reading

\`\`\`cpp
void setup() {
  Serial.begin(9600);
  Serial.println("Sensor Reading Started");
}

void loop() {
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  Serial.print("Raw: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);
  
  delay(500);
}
\`\`\`

**Circuit:** Sensor VCC→5V, OUT→A0, GND→GND`;
    }

    if (keywords.some(k => ['servo', 'motor'].includes(k))) {
      return `## 🔧 Servo Motor Control

\`\`\`cpp
#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (int pos = 0; pos <= 180; pos += 1) {
    myServo.write(pos);
    delay(15);
  }
  for (int pos = 180; pos >= 0; pos -= 1) {
    myServo.write(pos);
    delay(15);
  }
}
\`\`\`

**Circuit:** Servo Red→5V, Brown→GND, Orange→Pin 9`;
    }

    return `## 🤖 Arduino AI Assistant

I can help you with Arduino programming! Try asking about:

### 🔧 **Common Topics:**
- "How to blink an LED?"
- "Read sensor data from analog pin"
- "Control servo motor"
- "Setup WiFi on ESP32"
- "Debug compilation errors"

### 💡 **Pro Tip:**
For advanced AI assistance, add your free Gemini API key in settings!

**What Arduino challenge can I help you solve today?**`;
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Create streaming message
      const streamingMessageId = `assistant-${Date.now()}`;
      const streamingMessage: Message = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        model: selectedModel
      };

      setMessages(prev => [...prev, streamingMessage]);

      // Get AI response based on selected model
      let fullResponse: string;
      
      fullResponse = await callAIAPI(userMessage.content);

      // Simulate streaming effect
      const words = fullResponse.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
        
        const partialContent = words.slice(0, i + 1).join(' ');
        setMessages(prev => 
          prev.map(msg => 
            msg.id === streamingMessageId 
              ? { ...msg, content: partialContent }
              : msg
          )
        );
      }

      // Finalize message
      const finalMessage: Message = {
        id: streamingMessageId,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        isStreaming: false,
        codeBlocks: extractCodeBlocks(fullResponse),
        model: selectedModel
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingMessageId ? finalMessage : msg
        )
      );

      // Extract and notify about code blocks
      const codeBlocks = extractCodeBlocks(fullResponse);
      if (codeBlocks.length > 0 && onCodeGenerated) {
        onCodeGenerated(codeBlocks[0].code);
      }

    } catch (error) {
      console.error('AI request failed:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again or check your internet connection.',
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveApiKey = () => {
    const currentKey = apiKeys[configModel as keyof typeof apiKeys];
    if (currentKey) {
      localStorage.setItem(`${configModel}-api-key`, currentKey);
      setShowApiKeyInput(false);
      
      // Show success message
      const successMessage: Message = {
        id: `success-${Date.now()}`,
        role: 'system',
        content: `✅ **${configModel.toUpperCase()} API Key Saved!**\n\nYour ${configModel} API key has been saved locally. You can now enjoy AI assistance for your Arduino projects!\n\n🚀 Try asking me anything about Arduino development!`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem(`${configModel}-api-key`);
    setApiKeys(prev => ({ ...prev, [configModel]: '' }));
    setShowApiKeyInput(false);
    
    const clearMessage: Message = {
      id: `clear-${Date.now()}`,
      role: 'system',
      content: `🔑 **${configModel.toUpperCase()} API Key Cleared**\n\nYour ${configModel} API key has been removed. You can still use offline Arduino help, or add a new API key anytime.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, clearMessage]);
  };

  // Update API key for specific model
  const updateApiKey = (model: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [model]: value }));
  };

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`message ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? '👤' : message.role === 'system' ? '⚙️' : '🤖'}
          {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'AI'}
        </span>
        {message.model && (
          <span className="message-model">
            {message.model === 'gemini' ? '🚀 Gemini' : message.model.toUpperCase()}
          </span>
        )}
        <span className="message-time">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="message-bubble">
        <div className="message-content">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: message.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>')
            }} 
          />
          
          {message.codeBlocks && message.codeBlocks.length > 0 && (
            <div className="code-actions">
              {message.codeBlocks.map(block => (
                <button
                  key={block.id}
                  className="insert-code-btn"
                  onClick={() => onInsertCode?.(block.code)}
                  title="Insert this code into editor"
                >
                  📋 Insert {block.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="unified-ai-chat">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">🤖</span>
          <span>AI Assistant</span>
          <span className="chat-status">
            {isTyping ? 'typing...' : apiKeys[selectedModel as keyof typeof apiKeys] && selectedModel !== 'local' ? `powered by ${selectedModel}` : selectedModel === 'local' ? 'local mode' : 'offline mode'}
          </span>
        </div>
        <div className="chat-controls">
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select"
            title="Select AI Model"
          >
            <option value="gemini">🚀 Gemini (Free)</option>
            <option value="gpt-4">GPT-4 (Smart)</option>
            <option value="gpt-3.5">GPT-3.5 (Fast)</option>
            <option value="claude">Claude (Precise)</option>
            <option value="local">Local AI</option>
          </select>
          <button 
            className="api-key-btn"
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            title="Configure API Keys"
          >
            ⚙️
          </button>
        </div>
      </div>

      {showApiKeyInput && (
        <div className="api-key-config">
          <div className="api-key-header">
            <h4>🔑 Configure AI API Keys</h4>
            <p>Add your API keys to unlock AI-powered Arduino assistance!</p>
          </div>
          <div className="api-key-input">
            <div className="model-selector">
              <label>Select AI Model:</label>
              <select 
                value={configModel} 
                onChange={(e) => setConfigModel(e.target.value)}
                className="config-model-select"
              >
                <option value="gemini">🚀 Gemini (Google - Free)</option>
                <option value="openai">🤖 GPT-4/3.5 (OpenAI)</option>
                <option value="claude">🧠 Claude (Anthropic)</option>
              </select>
            </div>
            
            {configModel === 'gemini' && (
              <p className="api-info">
                <strong>Free API Key:</strong> <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
              </p>
            )}
            {configModel === 'openai' && (
              <p className="api-info">
                <strong>Get API Key:</strong> <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
              </p>
            )}
            {configModel === 'claude' && (
              <p className="api-info">
                <strong>Get API Key:</strong> <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer">Anthropic Console</a>
              </p>
            )}
            
            <input
              type="password"
              placeholder={`Enter your ${configModel} API key...`}
              value={apiKeys[configModel as keyof typeof apiKeys]}
              onChange={(e) => updateApiKey(configModel, e.target.value)}
            />
            <div className="api-key-actions">
              <button onClick={saveApiKey} className="save-btn">💾 Save</button>
              <button onClick={clearApiKey} className="clear-btn">🗑️ Clear</button>
              <button onClick={() => setShowApiKeyInput(false)} className="cancel-btn">❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-icon">🚀</div>
            <h3>Welcome to Arduino AI Assistant!</h3>
            <p>I'm here to help you with Arduino development, coding, and troubleshooting.</p>
            <div className="quick-start-tips">
              <div className="tip">💡 Ask me about Arduino programming</div>
              <div className="tip">🔧 Get help with circuit designs</div>
              <div className="tip">🐛 Debug your code issues</div>
              <div className="tip">📚 Learn Arduino best practices</div>
            </div>
            <p className="get-started">Type your question below to get started!</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <div className="typing-dots">
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
        {(!apiKeys[selectedModel as keyof typeof apiKeys] && selectedModel !== 'local') && (
          <div className="setup-prompt">
            <span className="setup-icon">🔑</span>
            <span>Configure your {selectedModel} API key to start chatting!</span>
            <button 
              className="setup-btn"
              onClick={() => setShowApiKeyInput(true)}
            >
              Setup Now
            </button>
          </div>
        )}
        
        <div className="chat-input">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={apiKeys[selectedModel as keyof typeof apiKeys] || selectedModel === 'local' 
              ? `Ask me anything about Arduino... (${selectedModel})` 
              : `Configure ${selectedModel} API key to start chatting...`}
            rows={1}
            disabled={isTyping || (!apiKeys[selectedModel as keyof typeof apiKeys] && selectedModel !== 'local')}
          />
          <button 
            onClick={sendMessage} 
            disabled={!inputValue.trim() || isTyping || (!apiKeys[selectedModel as keyof typeof apiKeys] && selectedModel !== 'local')}
            className="send-btn"
            title="Send message"
          >
            {isTyping ? '⏳' : '🚀'}
            {isTyping ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAIChatWithGemini;
