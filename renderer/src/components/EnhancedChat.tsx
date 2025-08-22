import React, { useState, useRef, useEffect, useCallback } from 'react';
import AdvancedPrompt from './AdvancedPrompt';
import './EnhancedChatUI.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
  tokens?: number;
  checkpoint?: boolean;
  saved?: boolean;
}

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  timestamp: Date;
  model: string;
}

interface EnhancedChatProps {
  onCodeGenerated?: (code: string, language: string) => void;
  className?: string;
  isDeveloperMode?: boolean;
  developerName?: string;
}

export const EnhancedChat: React.FC<EnhancedChatProps> = ({
  onCodeGenerated,
  className = '',
  isDeveloperMode = true,
  developerName = 'Dayanand Darpan'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-pro');
  const [availableModels] = useState(['gemini-pro', 'gpt-4', 'claude-3']);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `� **Arduino AI Agent Online**

${isDeveloperMode ? `👨‍💻 **Developer:** ${developerName}` : ''}
🤖 **AI Model:** ${selectedModel}
⚡ **Status:** Ready to Assist

**Quick Actions:**
• Ask Arduino questions or describe projects
• Upload code for debugging and optimization  
• Request hardware recommendations
• Get circuit diagrams and wiring help

**Try saying:**
- "Create a temperature sensor with LCD"
- "Debug my LED code" 
- "How to use ultrasonic sensor?"
- "Show me servo motor example"

What Arduino project can I help you with? 🔧`,
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedModel, isDeveloperMode, developerName]);

  const handlePauseResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsPaused(true);
      setIsStreaming(false);
    }
  }, []);

  const handleResumeResponse = useCallback(() => {
    setIsPaused(false);
    // Resume from where we left off
    if (inputMessage.trim()) {
      handleSendMessage();
    }
  }, [inputMessage]);

  const handleAdvancedPrompt = useCallback((prompt: string, data: any) => {
    // Add the generated prompt as a user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      model: selectedModel
    };
    
    setMessages(prev => [...prev, userMessage]);
    setShowAdvancedPrompt(false);
    
    // Set the input message and trigger send
    setInputMessage(prompt);
    setTimeout(() => {
      // Trigger the send manually
      const sendEvent = new Event('submit');
      inputRef.current?.form?.dispatchEvent(sendEvent);
    }, 100);
  }, [selectedModel]);

  const handleCodeImplementation = useCallback(async (code: string, filename: string) => {
    try {
      // For now, show the generated code in a message
      // TODO: Implement file saving via electron IPC
      const codeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🔧 **Generated Arduino Code for ${filename}:**

\`\`\`cpp
${code}
\`\`\`

� **Save this code as:** \`${filename}\`
� **Next Steps:** Copy the code and save it in your Arduino IDE

✨ **Generated with Advanced Prompt System** - Code is optimized for your hardware configuration.`,
        timestamp: new Date(),
        model: selectedModel
      };
      
      setMessages(prev => [...prev, codeMessage]);
      
      if (onCodeGenerated) {
        onCodeGenerated(code, 'arduino');
      }
    } catch (error) {
      console.error('Error implementing code:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `❌ **Error implementing code:** ${error.message}\n\nPlease try again or save the code manually.`,
        timestamp: new Date(),
        model: selectedModel
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [selectedModel, onCodeGenerated]);

  const saveConversation = useCallback(() => {
    if (messages.length === 0) return;

    const conversation: Conversation = {
      id: currentConversation || Date.now().toString(),
      name: `Chat ${new Date().toLocaleString()}`,
      messages: [...messages],
      timestamp: new Date(),
      model: selectedModel
    };

    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === conversation.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = conversation;
        return updated;
      }
      return [...prev, conversation];
    });

    setCurrentConversation(conversation.id);

    // Mark messages as saved
    setMessages(prev => prev.map(msg => ({ ...msg, saved: true })));
  }, [messages, currentConversation, selectedModel]);

  const createCheckpoint = useCallback(() => {
    setMessages(prev => prev.map((msg, index) => 
      index === prev.length - 1 ? { ...msg, checkpoint: true } : msg
    ));
  }, []);

  const loadConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversation(conversationId);
      setSelectedModel(conversation.model);
    }
  }, [conversations]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentConversation('');
    setInputMessage('');
    setIsStreaming(false);
    setIsPaused(false);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      model: selectedModel
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setIsPaused(false);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Simulate AI response (replace with actual API call)
      const response = await simulateAIResponse(userMessage.content, selectedModel, abortControllerRef.current.signal);
      
      if (!abortControllerRef.current.signal.aborted) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          model: selectedModel,
          tokens: Math.floor(Math.random() * 1000) + 100
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `❌ **Error**: ${error.message || 'Failed to generate response'}`,
          timestamp: new Date(),
          model: selectedModel
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputMessage, isStreaming, selectedModel]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Basic markdown-like formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    // Handle code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-block-container">
        <div class="code-block-header">
          <span>${lang || 'code'}</span>
          <button onclick="navigator.clipboard.writeText('${code.replace(/'/g, "\\'")}')">📋</button>
        </div>
        <pre class="code-block"><code>${code}</code></pre>
      </div>`;
    });

    return formatted;
  };

  return (
    <div className={`unified-ai-chat ${className} ${isMinimized ? 'minimized' : ''}`}>
      {/* Enhanced Chat Header */}
      <div className="chat-header">
        <div className="chat-title">
          <span>🤖</span>
          <span>Arduino AI</span>
          {isDeveloperMode && (
            <span className="model-switch">{developerName}</span>
          )}
          <span className="model-switch">{selectedModel}</span>
        </div>
        
        <div className="chat-controls">
          {/* Advanced Prompt Generator */}
          <button
            className="control-button advanced-prompt-btn"
            onClick={() => setShowAdvancedPrompt(true)}
            title="Advanced Arduino Project Generator"
          >
            🚀
          </button>

          {/* Response Controls */}
          {isStreaming && (
            <button
              className="control-button pause-btn"
              onClick={handlePauseResponse}
              title="Pause Response"
            >
              ⏸️
            </button>
          )}
          
          {isPaused && (
            <button
              className="control-button resume-btn"
              onClick={handleResumeResponse}
              title="Resume Response"
            >
              ▶️
            </button>
          )}

          {/* Save Controls */}
          <button
            className="control-button save-btn"
            onClick={saveConversation}
            title="Save Conversation"
            disabled={messages.length === 0}
          >
            💾
          </button>

          <button
            className="control-button checkpoint-btn"
            onClick={createCheckpoint}
            title="Create Checkpoint"
            disabled={messages.length === 0}
          >
            📍
          </button>

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select"
            title="Switch Model"
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>

          {/* Minimize/Maximize */}
          <button
            className="control-button"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>

          {/* Clear Chat */}
          <button
            className="control-button"
            onClick={clearChat}
            title="Clear Chat"
          >
            🗑️
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Session Controls */}
          <div className="session-controls">
            <select
              value={currentConversation}
              onChange={(e) => loadConversation(e.target.value)}
              className="conversation-select"
              title="Load Conversation"
            >
              <option value="">New Conversation</option>
              {conversations.map(conv => (
                <option key={conv.id} value={conv.id}>
                  {conv.name}
                </option>
              ))}
            </select>
            
            <span className="session-info">
              {messages.length} messages
            </span>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-icon">🔧</div>
                <h3 className="welcome-title">Arduino AI Assistant</h3>
                <p className="welcome-subtitle">
                  Start a conversation to get help with Arduino projects, code generation, and hardware guidance.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : 'ℹ️'}
                        {message.role}
                      </span>
                      <div className="message-meta">
                        {message.tokens && (
                          <span className="token-count">{message.tokens} tokens</span>
                        )}
                        <span className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.checkpoint && (
                          <span className="checkpoint-indicator" title="Checkpoint"></span>
                        )}
                        {message.saved && (
                          <span className="saved-indicator" title="Saved"></span>
                        )}
                      </div>
                    </div>
                    <div
                      className="message-text"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                  </div>
                </div>
              ))
            )}

            {isStreaming && (
              <div className="message assistant">
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-role">🤖 assistant</span>
                    <span className="message-time">Generating...</span>
                  </div>
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

          {/* Enhanced Input Area */}
          <div className="chat-input-container">
            <div className="chat-context">
              <span>Model: {selectedModel}</span>
              <span>{messages.length} messages</span>
            </div>

            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about Arduino projects, components, code generation..."
                className="message-input"
                rows={2}
                disabled={isStreaming && !isPaused}
              />

              <div className="response-controls">
                {isStreaming ? (
                  <button
                    className="control-button pause-btn"
                    onClick={handlePauseResponse}
                    title="Pause Response"
                  >
                    ⏸️
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="send-button"
                    title="Send Message"
                  >
                    📤
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Advanced Prompt Modal */}
      <AdvancedPrompt
        isVisible={showAdvancedPrompt}
        onClose={() => setShowAdvancedPrompt(false)}
        onPromptGenerated={handleAdvancedPrompt}
        onCodeImplement={handleCodeImplementation}
      />
    </div>
  );
};

// Simulate AI response (replace with actual API integration)
async function simulateAIResponse(message: string, model: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (signal.aborted) {
        reject(new Error('Request was cancelled'));
        return;
      }

      // Generate contextual response based on message content
      let response = '';
      
      if (message.toLowerCase().includes('blink') || message.toLowerCase().includes('led')) {
        response = `🔧 **Arduino LED Blink Project**

Here's a simple LED blink program:

\`\`\`cpp
// Arduino LED Blink Example
#define LED_PIN 13

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);   // Turn LED on
  delay(1000);                   // Wait 1 second
  digitalWrite(LED_PIN, LOW);    // Turn LED off  
  delay(1000);                   // Wait 1 second
}
\`\`\`

**Hardware Setup:**
• Connect LED to pin 13 (built-in LED)
• No resistor needed for built-in LED

**Need help with:**
• Adding more LEDs?
• Changing blink patterns?
• Using external LEDs?`;
      } else if (message.toLowerCase().includes('sensor') || message.toLowerCase().includes('temperature')) {
        response = `🌡️ **Temperature Sensor Guide**

Here's how to read a temperature sensor:

\`\`\`cpp
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");
  
  delay(2000);
}
\`\`\`

**Components needed:**
• DHT22 temperature/humidity sensor
• 10kΩ pull-up resistor
• Jumper wires`;
      } else {
        response = `I can help you with Arduino development! 

**Popular topics:**
• **LED Projects** - Blink patterns, RGB LEDs, strips
• **Sensors** - Temperature, motion, light sensors  
• **Motors** - Servo, stepper, DC motor control
• **Communication** - Serial, I2C, SPI protocols
• **WiFi/Bluetooth** - ESP32/ESP8266 projects

What specific Arduino project are you working on?`;
      }

      resolve(response);
    }, 1000 + Math.random() * 2000); // Simulate network delay

    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Request was cancelled'));
    });
  });
}

export default EnhancedChat;
