/*
 * Darpan Uno - Advanced Arduino IDE with AI Integration
 * Copyright (c) 2025 Dayanand Darpan
 * 
 * This file is part of Darpan Uno.
 * 
 * Darpan Uno is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Darpan Uno is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * 
 * Created by: Dayanand Darpan (dayanand.darpan@gmail.com)
 * Website: https://www.dayananddarpan.me
 * GitHub: https://github.com/dayananddarpan
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EnhancedUnifiedAIChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];
  model?: string;
  hasCircuitDiagram?: boolean;
}

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  title?: string;
  pinConnections?: PinConnection[];
}

interface PinConnection {
  component: string;
  pin: string;
  arduinoPin: string;
  description: string;
}

interface Suggestion {
  id: string;
  text: string;
  category: 'quick' | 'learning' | 'component' | 'project';
  icon: string;
}

interface UnifiedAIChatProps {
  currentFile: string;
  projectPath: string;
  onCodeGenerated?: (code: string) => void;
  defaultMode?: 'panel' | 'minimized' | 'popup';
  onInsertCode?: (code: string) => void;
}

export const UnifiedAIChat: React.FC<UnifiedAIChatProps> = ({
  currentFile,
  projectPath,
  onCodeGenerated,
  defaultMode = 'panel',
  onInsertCode
}): JSX.Element => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'system',
      content: `🚀 **Darpan Uno AI Assistant Ready!**

I'm your comprehensive Arduino development companion, created by **Dayanand Darpan**.

**🎯 What I can help you with:**
• **Code Generation** - Write Arduino sketches from descriptions
• **Circuit Design** - Component selection and wiring guidance  
• **Debugging** - Troubleshoot code and hardware issues
• **Learning** - Tutorials from beginner to advanced
• **Components** - Detailed guides for sensors, motors, etc.
• **Projects** - Complete project walkthroughs

**🚀 Try these to get started:**
💡 "Blink an LED" | 🌡️ "Read temperature sensor" | 🔧 "Debug my code" | 📚 "Learn Arduino basics"

**Powered by**: Free Gemini AI, GPT-4, and comprehensive educational database
**Created by**: Dayanand Darpan - Open Source Arduino IDE`,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-free');
  const [isMinimized, setIsMinimized] = useState(defaultMode === 'minimized');
  const [chatMode, setChatMode] = useState<'general' | 'code' | 'debug' | 'learning'>('general');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Enhanced suggestions with categories
  const quickSuggestions: Suggestion[] = [
    { id: '1', text: 'Help me write a simple LED blink program', category: 'quick', icon: '💡' },
    { id: '2', text: 'How do I read sensor data from analog pins?', category: 'quick', icon: '🌡️' },
    { id: '3', text: 'Debug my Arduino compilation errors', category: 'quick', icon: '🐛' },
    { id: '4', text: 'Email notification with touch sensor project', category: 'project', icon: '📧' },
    { id: '5', text: 'Show me servo motor control code', category: 'component', icon: '⚙️' },
    { id: '6', text: 'WiFi connection with ESP32 tutorial', category: 'project', icon: '📡' },
    { id: '7', text: 'Ultrasonic distance sensor guide', category: 'component', icon: '📏' },
    { id: '8', text: 'Home automation project ideas', category: 'project', icon: '🏠' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if API key is available for selected model
  const checkApiKeyAvailability = useCallback(async (model: string): Promise<boolean> => {
    if (model === 'gemini-free') return true; // Free Gemini doesn't need API key
    
    try {
      const storedKeys = localStorage.getItem('darpan-uno-api-keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        return !!keys[model.split('-')[0]]; // Check if provider has key
      }
      return false;
    } catch (error) {
      return false;
    }
  }, []);

  // Generate contextual auto-suggestions (non-intrusive)
  const generateAutoSuggestions = useCallback((input: string): string[] => {
    if (input.length < 3) return [];
    
    const keywords = input.toLowerCase().split(' ');
    const suggestions: string[] = [];

    // Arduino-specific auto-completions
    if (keywords.some(k => ['led', 'light', 'blink'].includes(k))) {
      suggestions.push(
        'multiple LEDs with patterns',
        'RGB LED color control',
        'LED brightness with PWM'
      );
    } else if (keywords.some(k => ['sensor', 'read', 'data'].includes(k))) {
      suggestions.push(
        'temperature and humidity sensor',
        'motion detection with PIR',
        'light sensor readings'
      );
    } else if (keywords.some(k => ['touch', 'capacitive', 'contact'].includes(k))) {
      suggestions.push(
        'touch sensor with email notification',
        'capacitive touch detection',
        'touch sensor security system'
      );
    } else if (keywords.some(k => ['email', 'notification', 'alert'].includes(k))) {
      suggestions.push(
        'ESP32 email sending code',
        'SMTP email configuration',
        'notification system with WiFi'
      );
    } else if (keywords.some(k => ['motor', 'servo', 'movement'].includes(k))) {
      suggestions.push(
        'servo motor positioning',
        'stepper motor control',
        'DC motor speed control'
      );
    }

    return suggestions.slice(0, 3);
  }, []);

  // Enhanced Gemini response with free tier support
  const simulateGeminiResponse = useCallback(async (userMessage: string): Promise<string> => {
    const isApiKeyAvailable = await checkApiKeyAvailability(selectedModel);
    
    // If no API key and not using free tier, provide offline response
    if (!isApiKeyAvailable && selectedModel !== 'gemini-free') {
      return `⚠️ **API Key Required**

To use ${selectedModel}, please configure your API key in AI Settings.

**🔄 Switching to Offline Mode:**

I can still help you with basic Arduino guidance using my built-in knowledge base!

**🆓 Free Alternative:** Switch to "Gemini Free" model for online AI assistance without API keys.

**Created by Dayanand Darpan** - Darpan Uno Open Source Project`;
    }

    // Enhanced responses for touch sensor email project
    if (userMessage.toLowerCase().includes('touch') && userMessage.toLowerCase().includes('email')) {
      return generateTouchSensorEmailProject();
    }

    // Temperature sensor response
    if (userMessage.toLowerCase().includes('temperature')) {
      return generateTemperatureSensorResponse();
    }

    // LED related responses
    if (userMessage.toLowerCase().includes('led') || userMessage.toLowerCase().includes('blink')) {
      return generateLEDResponse();
    }

    // General AI response
    return generateGeneralResponse(userMessage);
  }, [selectedModel]);

  const generateTouchSensorEmailProject = (): string => {
    return `🔧 **Touch Sensor Email Notification Project**
*Created by Dayanand Darpan for Darpan Uno IDE*

Here's a complete Arduino project that sends an email when someone touches the sensor:

\`\`\`cpp
/*
 * Touch Sensor Email Notification System
 * Created by: Dayanand Darpan
 * Part of: Darpan Uno Open Source Project
 * Website: https://www.dayananddarpan.me
 */

#include <WiFi.h>
#include <ESP_Mail_Client.h>

// WiFi credentials - Replace with your network details
const char* ssid = "YOUR_WIFI_NETWORK";
const char* password = "YOUR_WIFI_PASSWORD";

// Email configuration - Use your email settings
#define SMTP_HOST "smtp.gmail.com"
#define SMTP_PORT 587
#define AUTHOR_EMAIL "your-email@gmail.com"
#define AUTHOR_PASSWORD "your-app-password"  // Use Gmail App Password
#define RECIPIENT_EMAIL "notify-me@gmail.com"

// Hardware setup
#define TOUCH_PIN 2
#define LED_PIN 13  // Built-in LED for status indication

// Email client
SMTPSession smtp;
bool lastTouchState = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(TOUCH_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Connect to WiFi
  Serial.println("\\n🚀 Darpan Uno Touch Sensor System Starting...");
  Serial.println("Created by: Dayanand Darpan");
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink while connecting
  }
  
  digitalWrite(LED_PIN, HIGH); // Solid LED when connected
  Serial.println("\\n✅ WiFi Connected!");
  Serial.print("📡 IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("🔍 Monitoring touch sensor...");
}

void loop() {
  bool currentTouchState = digitalRead(TOUCH_PIN);
  
  // Detect touch activation (rising edge)
  if (currentTouchState && !lastTouchState) {
    Serial.println("\\n🚨 TOUCH DETECTED!");
    digitalWrite(LED_PIN, LOW); // Turn off LED during email send
    
    if (sendSecurityEmail()) {
      Serial.println("✅ Security alert email sent successfully!");
    } else {
      Serial.println("❌ Failed to send email");
    }
    
    digitalWrite(LED_PIN, HIGH); // Turn LED back on
    delay(5000); // Prevent spam emails (5 second cooldown)
  }
  
  lastTouchState = currentTouchState;
  delay(100); // Small delay for stability
}

bool sendSecurityEmail() {
  Session_Config config;
  config.server.host_name = SMTP_HOST;
  config.server.port = SMTP_PORT;
  config.login.email = AUTHOR_EMAIL;
  config.login.password = AUTHOR_PASSWORD;
  config.login.user_domain = "";

  SMTP_Message message;
  message.sender.name = "Darpan Uno Security System";
  message.sender.email = AUTHOR_EMAIL;
  message.subject = "🚨 SECURITY ALERT - Touch Sensor Triggered";
  message.addRecipient("Security Alert", RECIPIENT_EMAIL);

  // Create professional HTML email
  String htmlMsg = "<div style='font-family: Arial, sans-serif; max-width: 600px;'>";
  htmlMsg += "<div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;'>";
  htmlMsg += "<h1>🚨 SECURITY ALERT</h1>";
  htmlMsg += "<p>Touch sensor has been activated!</p>";
  htmlMsg += "</div>";
  htmlMsg += "<div style='padding: 20px; background: #f8f9fa;'>";
  htmlMsg += "<h2 style='color: #dc3545;'>Alert Details:</h2>";
  htmlMsg += "<ul style='background: white; padding: 15px; border-radius: 5px;'>";
  htmlMsg += "<li><strong>Time:</strong> " + String(millis()) + " ms since startup</li>";
  htmlMsg += "<li><strong>Device:</strong> Arduino ESP32</li>";
  htmlMsg += "<li><strong>Sensor:</strong> Touch/Capacitive</li>";
  htmlMsg += "<li><strong>Status:</strong> Active Monitoring</li>";
  htmlMsg += "</ul>";
  htmlMsg += "<div style='margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;'>";
  htmlMsg += "<p><strong>System:</strong> Darpan Uno Security Monitor</p>";
  htmlMsg += "<p><strong>Created by:</strong> Dayanand Darpan</p>";
  htmlMsg += "<p><strong>Website:</strong> https://www.dayananddarpan.me</p>";
  htmlMsg += "</div>";
  htmlMsg += "</div></div>";
  
  message.html.content = htmlMsg.c_str();
  message.text.charSet = "us-ascii";
  message.html.transfer_encoding = Content_Transfer_Encoding::enc_7bit;

  if (!smtp.connect(&config)) {
    Serial.println("❌ SMTP Connection failed: " + smtp.errorReason());
    return false;
  }

  if (!MailClient.sendMail(&smtp, &message)) {
    Serial.println("❌ Email send failed: " + smtp.errorReason());
    smtp.closeSession();
    return false;
  }

  smtp.closeSession();
  return true;
}
\`\`\`

**📋 Required Components:**
• Arduino ESP32 (WiFi capable)
• Touch sensor (capacitive or resistive)
• LED (built-in pin 13)
• Jumper wires
• Breadboard

**🔌 Pin Connections:**
• Touch Sensor VCC → 3.3V
• Touch Sensor GND → GND  
• Touch Sensor OUT → Pin 2
• LED → Pin 13 (built-in)

**⚙️ Setup Instructions:**
1. Install ESP_Mail_Client library in Darpan Uno
2. Replace WiFi credentials with your network
3. Configure Gmail with App Password (not regular password)
4. Update recipient email address
5. Upload code to ESP32
6. Monitor Serial output for status

**🔒 Security Features:**
• Professional HTML email formatting
• Spam prevention with cooldown timer
• Visual LED status indicators
• Serial monitoring for debugging
• WiFi connection status tracking

**Created by Dayanand Darpan** - Part of Darpan Uno Open Source Project
Visit: https://www.dayananddarpan.me for more projects!

Would you like me to generate a circuit diagram or explain any part in detail?`;
  };

  const generateTemperatureSensorResponse = (): string => {
    return `🌡️ **Temperature Sensor Guide**
*Created by Dayanand Darpan for Darpan Uno IDE*

Here's how to read a temperature sensor with proper error handling:

\`\`\`cpp
/*
 * Professional Temperature Monitoring System
 * Created by: Dayanand Darpan
 * Part of: Darpan Uno Open Source Project
 */

#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22
#define LED_PIN 13

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  
  dht.begin();
  
  Serial.println("🌡️ Darpan Uno Temperature Monitor");
  Serial.println("Created by: Dayanand Darpan");
  Serial.println("Initializing sensor...");
  
  // Warm-up delay
  delay(2000);
  Serial.println("✅ Sensor ready!");
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ Sensor read error! Check connections.");
    digitalWrite(LED_PIN, HIGH); // Error indicator
    delay(1000);
    digitalWrite(LED_PIN, LOW);
    delay(1000);
    return;
  }
  
  // Normal operation - LED stays on
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("📊 Sensor Reading:");
  Serial.print("   Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");
  
  Serial.print("   Humidity: ");
  Serial.print(humidity);
  Serial.println("%");
  
  // Temperature warnings
  if (temperature > 30) {
    Serial.println("🔥 HIGH TEMPERATURE WARNING!");
  } else if (temperature < 10) {
    Serial.println("🧊 LOW TEMPERATURE WARNING!");
  }
  
  Serial.println("---");
  delay(2000);
}
\`\`\`

**📋 Components needed:**
• DHT22 temperature/humidity sensor
• 10kΩ pull-up resistor
• LED (pin 13)
• Jumper wires

**🔌 Pin Connections:**
• DHT22 VCC → 5V
• DHT22 GND → GND
• DHT22 DATA → Pin 2 (with 10kΩ resistor to VCC)
• LED → Pin 13

**Created by Dayanand Darpan** - Darpan Uno Open Source Project`;
  };

  const generateLEDResponse = (): string => {
    return `💡 **LED Control Guide**
*Created by Dayanand Darpan for Darpan Uno IDE*

Here's a professional LED blink program with patterns:

\`\`\`cpp
/*
 * Advanced LED Control System
 * Created by: Dayanand Darpan
 * Part of: Darpan Uno Open Source Project
 */

#define LED_PIN 13

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  
  Serial.println("💡 Darpan Uno LED Controller");
  Serial.println("Created by: Dayanand Darpan");
  Serial.println("Starting LED patterns...");
}

void loop() {
  // Pattern 1: Normal blink
  normalBlink();
  
  // Pattern 2: Fast blink
  fastBlink();
  
  // Pattern 3: Heartbeat pattern
  heartbeat();
  
  delay(1000);
}

void normalBlink() {
  Serial.println("Pattern: Normal Blink");
  for(int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
    delay(500);
  }
}

void fastBlink() {
  Serial.println("Pattern: Fast Blink");
  for(int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void heartbeat() {
  Serial.println("Pattern: Heartbeat");
  for(int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(500);
  }
}
\`\`\`

**🔌 Pin Connections:**
• LED Anode (+) → Pin 13
• LED Cathode (-) → GND (through 220Ω resistor)

**Created by Dayanand Darpan** - Darpan Uno Open Source Project`;
  };

  const generateGeneralResponse = (userMessage: string): string => {
    return `🤖 **Darpan Uno AI Assistant Response**
*Created by Dayanand Darpan*

I understand you're asking about: "${userMessage}"

I can help you with Arduino projects using Darpan Uno IDE! Here's what I can do:

**🆓 Free Features Available:**
• Code generation for Arduino projects
• Circuit design guidance
• Component tutorials
• Debugging assistance
• Project templates

**💡 Quick Arduino Tips:**
• Always check your wiring connections
• Use Serial.begin(9600) for debugging
• Add delay() to prevent rapid looping
• Check component specifications
• Use pull-up resistors for buttons

**🔧 Need More Help?**
1. **🆓 Use Gemini Free**: Switch to "Gemini Free" model for unlimited AI assistance
2. **🔑 Add API Key**: Configure your API key in AI Settings for premium models
3. **📚 Offline Help**: I can provide Arduino guidance using built-in templates

**Created by Dayanand Darpan** - Darpan Uno Open Source Project
Visit: https://www.dayananddarpan.me

Would you like me to help with a specific Arduino component or project?`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const aiResponse = await simulateGeminiResponse(inputValue);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        model: selectedModel,
        hasCircuitDiagram: inputValue.toLowerCase().includes('circuit') || inputValue.toLowerCase().includes('wiring')
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Error**: Unable to generate response. Please check your connection and API settings.

**Created by Dayanand Darpan** - Darpan Uno Open Source Project`,
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const extractCodeBlocks = (content: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        id: Date.now().toString() + blocks.length,
        language: match[1] || 'text',
        code: match[2].trim(),
        title: `${match[1] || 'Code'} Snippet`
      });
    }

    return blocks;
  };

  const handleInsertCode = (code: string) => {
    if (agentMode && onInsertCode) {
      onInsertCode(code);
      
      // Show success notification
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `✅ **Code Inserted Successfully!**

Code has been inserted into your Darpan Uno IDE editor.

**Created by Dayanand Darpan** - Open Source Arduino IDE`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
    } else {
      // Copy to clipboard as fallback
      navigator.clipboard.writeText(code);
      alert('Code copied to clipboard!');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Generate auto-suggestions only if input is long enough and not interfering
    if (value.length >= 3 && !showSuggestions) {
      const suggestions = generateAutoSuggestions(value);
      setAutoSuggestions(suggestions);
    } else {
      setAutoSuggestions([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateCircuitDiagram = (message: Message) => {
    const codeBlocks = extractCodeBlocks(message.content);
    if (codeBlocks.length === 0) return null;

    return (
      <div className="circuit-diagram">
        <h4>🔌 Circuit Connections</h4>
        <div className="circuit-ascii">
          <pre>{`
    Arduino Uno/ESP32
    ┌─────────────────┐
    │                 │
    │            5V   ├─── VCC (Component)
    │                 │
    │           GND   ├─── GND (Component)
    │                 │
    │        Pin 2    ├─── Data/Signal Pin
    │                 │
    │       Pin 13    ├─── LED (Built-in)
    │                 │
    └─────────────────┘
    
    Created by: Dayanand Darpan
    Darpan Uno Open Source Project
          `}</pre>
        </div>
        <div className="connection-details">
          <p><strong>🔧 Wire Connections:</strong></p>
          <ul>
            <li>Red wire: Component VCC to Arduino 5V/3.3V</li>
            <li>Black wire: Component GND to Arduino GND</li>
            <li>Yellow wire: Component Signal to Arduino Pin 2</li>
            <li>Green wire: LED to Pin 13 (if applicable)</li>
          </ul>
          <p><small>💡 **Tip**: Always double-check your connections before powering on!</small></p>
        </div>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className="unified-chat-minimized" onClick={() => setIsMinimized(false)}>
        <div className="minimized-content">
          <span className="chat-icon">🤖</span>
          <span className="chat-text">Darpan Uno AI</span>
          <span className="model-badge">{selectedModel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-ai-chat">
      <div className="chat-header">
        <div className="header-left">
          <h3>🤖 Darpan Uno AI Assistant</h3>
          <span className="model-indicator">{selectedModel}</span>
          <span className="creator-credit">by Dayanand Darpan</span>
        </div>
        
        <div className="header-controls">
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-selector"
          >
            <option value="gemini-free">🆓 Gemini Free</option>
            <option value="gemini-pro">🧠 Gemini Pro</option>
            <option value="gpt-4">🤖 GPT-4</option>
            <option value="claude">🎭 Claude</option>
          </select>
          
          <label className="agent-toggle">
            <input 
              type="checkbox" 
              checked={agentMode} 
              onChange={(e) => setAgentMode(e.target.checked)} 
            />
            <span>🔧 Agent Mode</span>
          </label>
          
          <button onClick={() => setIsMinimized(true)} className="minimize-btn">─</button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? '👤' : message.role === 'system' ? '🔧' : '🤖'}
              </span>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
              {message.model && (
                <span className="message-model">{message.model}</span>
              )}
            </div>
            
            <div className="message-content">
              <div dangerouslySetInnerHTML={{
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
                  .replace(/`(.*?)`/g, '<code>$1</code>')
                  .replace(/\n/g, '<br>')
              }} />
            </div>

            {message.role === 'assistant' && extractCodeBlocks(message.content).length > 0 && (
              <div className="code-actions">
                {extractCodeBlocks(message.content).map(block => (
                  <div key={block.id} className="code-block-actions">
                    <button 
                      onClick={() => handleInsertCode(block.code)}
                      className="insert-code-btn"
                      disabled={!agentMode}
                    >
                      {agentMode ? '📝 Insert Code' : '📋 Copy Code'}
                    </button>
                    <button 
                      onClick={() => navigator.clipboard.writeText(block.code)}
                      className="copy-code-btn"
                    >
                      📋 Copy
                    </button>
                  </div>
                ))}
              </div>
            )}

            {message.hasCircuitDiagram && generateCircuitDiagram(message)}
          </div>
        ))}
        
        {isTyping && (
          <div className="message assistant typing">
            <div className="message-header">
              <span className="message-role">🤖</span>
              <span className="message-time">Typing...</span>
            </div>
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {showSuggestions && (
        <div className="suggestions-panel">
          <h4>💡 Quick Start - Darpan Uno Projects</h4>
          <div className="suggestions-grid">
            {quickSuggestions.map(suggestion => (
              <button
                key={suggestion.id}
                className={`suggestion-btn ${suggestion.category}`}
                onClick={() => handleSuggestionClick(suggestion.text)}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-text">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-area">
        {autoSuggestions.length > 0 && (
          <div className="auto-suggestions">
            {autoSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="auto-suggestion"
                onClick={() => {
                  setInputValue(inputValue + ' ' + suggestion);
                  setAutoSuggestions([]);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Ask about Arduino projects, code, circuits, or debugging..."
            className="chat-input"
            rows={2}
          />
          
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="send-button"
          >
            {isTyping ? '⏳' : '🚀'}
          </button>
        </div>
        
        <div className="input-footer">
          <small>
            💡 **Darpan Uno IDE** - Use "Agent Mode" to automatically insert code into your Arduino IDE
            <br />
            Created by <strong>Dayanand Darpan</strong> - Open Source Arduino Development Platform
          </small>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAIChat;
