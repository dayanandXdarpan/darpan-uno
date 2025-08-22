import React, { useState, useEffect, useRef } from 'react';
import './MinimizableChat.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokensUsed?: number;
}

interface MinimizableChatProps {
  onCodeGenerated?: (code: string) => void;
  isArduinoIDEMode?: boolean;
}

const MinimizableChat: React.FC<MinimizableChatProps> = ({
  onCodeGenerated,
  isArduinoIDEMode = false
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
    if (messages.length === 0) {
      addSystemMessage('👋 Welcome to Arduino AI Assistant! I can help you with code generation, debugging, component selection, and project planning. What would you like to work on?');
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadModels = async () => {
    try {
      const models = await window.electronAPI?.ai?.getAvailableModels?.();
      if (models && models.length > 0) {
        setAvailableModels(models);
        setSelectedModel(models[0].id);
      } else {
        // Fallback models if API not available
        const fallbackModels = [
          { id: 'local', displayName: 'Local Arduino AI', provider: 'offline', isOnline: false },
          { id: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', isOnline: true },
          { id: 'gemini-pro', displayName: 'Gemini Pro', provider: 'google', isOnline: true }
        ];
        setAvailableModels(fallbackModels);
        setSelectedModel('local');
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      // Set fallback models
      const fallbackModels = [
        { id: 'local', displayName: 'Local Arduino AI', provider: 'offline', isOnline: false }
      ];
      setAvailableModels(fallbackModels);
      setSelectedModel('local');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOfflineArduinoResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    // LED related queries
    if (lowerQuery.includes('led') || lowerQuery.includes('blink')) {
      return `Here's a basic LED blink example:

\`\`\`cpp
// LED Blink Example
const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}
\`\`\`

💡 **Tips:**
• Connect LED to pin 13 with a 220Ω resistor
• Pin 13 has a built-in LED on most Arduino boards
• Adjust delay() values to change blink speed

🔗 **Wiring:**
• LED long leg (anode) → Pin 13
• LED short leg (cathode) → 220Ω resistor → GND`;
    }
    
    // Sensor related queries
    if (lowerQuery.includes('sensor') || lowerQuery.includes('temperature') || lowerQuery.includes('dht')) {
      return `Here's a basic sensor reading example:

\`\`\`cpp
// Analog Sensor Reading
const int sensorPin = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(sensorPin);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  Serial.print("Sensor Value: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);
  
  delay(1000);
}
\`\`\`

💡 **Common Sensors:**
• DHT22 (temperature/humidity)
• LM35 (temperature)
• Ultrasonic (distance)
• LDR (light sensor)

📚 **Libraries needed:** Install sensor-specific libraries from Library Manager`;
    }
    
    // WiFi/IoT related queries
    if (lowerQuery.includes('wifi') || lowerQuery.includes('iot') || lowerQuery.includes('esp')) {
      return `Here's a basic WiFi connection example for ESP32/ESP8266:

\`\`\`cpp
#include <WiFi.h>

const char* ssid = "your_wifi_name";
const char* password = "your_wifi_password";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Your main code here
}
\`\`\`

💡 **IoT Platforms:**
• Arduino IoT Cloud
• Blynk
• ThingSpeak
• Firebase

🔧 **Required:** ESP32/ESP8266 board with WiFi capability`;
    }
    
    // Motor related queries
    if (lowerQuery.includes('motor') || lowerQuery.includes('servo') || lowerQuery.includes('stepper')) {
      return `Here's a basic servo motor control example:

\`\`\`cpp
#include <Servo.h>

Servo myServo;
const int servoPin = 9;

void setup() {
  myServo.attach(servoPin);
}

void loop() {
  myServo.write(0);    // 0 degrees
  delay(1000);
  myServo.write(90);   // 90 degrees
  delay(1000);
  myServo.write(180);  // 180 degrees
  delay(1000);
}
\`\`\`

🔧 **Motor Types:**
• Servo motors (precise position control)
• DC motors (continuous rotation)
• Stepper motors (precise steps)

⚡ **Power:** Large motors need external power supply and motor driver (L298N, etc.)`;
    }
    
    // Debug related queries
    if (lowerQuery.includes('debug') || lowerQuery.includes('error') || lowerQuery.includes('troubleshoot')) {
      return `🐛 **Common Arduino Debugging Tips:**

**Serial Monitor Debugging:**
\`\`\`cpp
void setup() {
  Serial.begin(9600);
  Serial.println("Program started");
}

void loop() {
  Serial.print("Variable value: ");
  Serial.println(myVariable);
  delay(1000);
}
\`\`\`

**Common Issues:**
• **Upload fails:** Check board and port selection
• **No output:** Verify Serial.begin() in setup()
• **Unexpected behavior:** Add Serial.print() statements
• **Memory issues:** Use F() macro for strings: Serial.println(F("Hello"))

**Voltage Check:**
• Use multimeter to verify 5V and 3.3V rails
• Check ground connections
• Verify component ratings match Arduino voltage`;
    }
    
    // General Arduino help
    return `🤖 **Arduino Development Assistant**

I can help you with:

**🔧 Hardware:**
• Circuit design and wiring
• Component selection and compatibility
• Power supply considerations
• Troubleshooting connections

**💻 Programming:**
• Arduino IDE usage
• Code examples and templates
• Library installation and usage
• Debugging techniques

**📡 Projects:**
• IoT and WiFi connectivity
• Sensor integration
• Motor control
• Data logging

**Quick Commands:**
• "LED blink" - Basic LED control
• "sensor reading" - Analog/digital sensors
• "WiFi setup" - ESP32/ESP8266 connectivity
• "motor control" - Servo/stepper motors
• "debug help" - Troubleshooting tips

**💡 Pro Tip:** Be specific about your project goals, components, and any error messages you're seeing for more targeted help!

What would you like to work on today?`;
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const addUserMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    return userMessage.id;
  };

  const addAssistantMessage = (content: string, model?: string, tokensUsed?: number) => {
    const assistantMessage: ChatMessage = {
      id: Date.now().toString(),
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
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessageId = addUserMessage(inputMessage);
    const query = inputMessage;
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Create a simple Arduino-focused prompt for the basic AI system
      let enhancedQuery = query;
      if (isArduinoIDEMode) {
        enhancedQuery = `As an Arduino development assistant, help with: ${query}. 
        Please provide specific Arduino code examples, circuit diagrams if needed, 
        library recommendations, and step-by-step instructions when appropriate.`;
      }

      // Use the available AI chat method
      const response = await window.electronAPI?.ai?.chat?.(enhancedQuery, {
        projectType: 'arduino',
        preferredFormat: 'comprehensive',
        includeCode: true,
        includeExplanation: true
      });

      if (response) {
        // If response contains structured data, format it nicely
        let formattedResponse = response;
        
        if (typeof response === 'object' && response.content) {
          formattedResponse = response.content;
        }
        
        // Add Arduino-specific enhancements if in IDE mode
        if (isArduinoIDEMode && typeof formattedResponse === 'string') {
          // Check if code is present and suggest next steps
          const hasCode = formattedResponse.includes('```');
          if (hasCode) {
            formattedResponse += `\n\n💡 **Quick Actions:**\n• Copy code to editor\n• View component wiring\n• Check library requirements\n• Test with serial monitor`;
          }
        }
        
        addAssistantMessage(formattedResponse, selectedModel);
      } else {
        // Offline fallback with Arduino knowledge
        const offlineResponse = getOfflineArduinoResponse(query);
        addAssistantMessage(offlineResponse, 'Offline Arduino AI');
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      // Try offline fallback
      const offlineResponse = getOfflineArduinoResponse(query);
      addAssistantMessage(offlineResponse, 'Offline Arduino AI');
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

  const exportChat = () => {
    const chatContent = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => {
        const timestamp = msg.timestamp.toLocaleString();
        return `[${timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`;
      })
      .join('\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    let formatted = content;
    
    // Code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
      return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Bullet points
    formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return formatted;
  };

  if (!isVisible) {
    return (
      <div className="chat-icon-button" onClick={() => setIsVisible(true)}>
        🤖
        <span className="chat-tooltip">Open AI Assistant</span>
      </div>
    );
  }

  return (
    <div className={`minimizable-chat ${isMinimized ? 'minimized' : 'expanded'}`}>
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
          <button
            className="control-button"
            onClick={exportChat}
            title="Export Chat"
          >
            💾
          </button>
          <button
            className="control-button"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>
          <button
            className="control-button close"
            onClick={() => setIsVisible(false)}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
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
                    checked={isArduinoIDEMode}
                    onChange={(e) => {
                      // This would be controlled by parent component
                      console.log('Arduino IDE mode:', e.target.checked);
                    }}
                  />
                  Arduino IDE Mode (Enhanced features)
                </label>
              </div>
            </div>
          )}

          <div className="chat-messages">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.role}`}>
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
                  {message.tokensUsed && (
                    <span className="token-count">{message.tokensUsed} tokens</span>
                  )}
                </div>
                <div
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            ))}
            
            {isProcessing && (
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
            
            <div className="quick-prompts">
              <button 
                className="quick-prompt"
                onClick={() => setInputMessage('Help me create a simple LED blink program')}
              >
                💡 LED Blink
              </button>
              <button 
                className="quick-prompt"
                onClick={() => setInputMessage('I need help with sensor readings')}
              >
                📡 Sensors
              </button>
              <button 
                className="quick-prompt"
                onClick={() => setInputMessage('Create a WiFi IoT project')}
              >
                📶 IoT
              </button>
              <button 
                className="quick-prompt"
                onClick={() => setInputMessage('Debug my Arduino code')}
              >
                🐛 Debug
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MinimizableChat;
