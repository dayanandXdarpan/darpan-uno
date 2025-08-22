import React, { useState, useRef, useEffect } from 'react';
import './AIPanel_enhanced.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIContext {
  currentCode: string;
  selectedBoard: string;
  currentPort: string;
  projectPath: string;
  lastError?: string;
  librariesUsed: string[];
}

interface AIPanelProps {
  currentFile: string;
  projectPath: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({ currentFile, projectPath }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Hello! I\'m your Arduino AI assistant. I can help you with:\n\n• Code explanation and debugging\n• Arduino library recommendations\n• Circuit design suggestions\n• Error troubleshooting\n• Code optimization\n\nWhat would you like to work on today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'prompts' | 'implement'>('chat');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // System prompts for different scenarios
  const systemPrompts = {
    codeExplain: `You are an expert Arduino developer. Analyze the provided Arduino code and explain:
- What the code does overall
- Key components and libraries used
- Pin configurations and connections
- Logic flow and functions
- Potential improvements or optimizations
- Common issues to watch for

Be concise but thorough, focusing on educational value.`,

    debug: `You are an Arduino debugging expert. When given code and error messages:
- Identify the root cause of the issue
- Explain why the error occurs
- Provide step-by-step fix instructions
- Suggest code corrections
- Recommend preventive measures
- Include relevant circuit considerations

Focus on clear, actionable solutions.`,

    optimize: `You are an Arduino performance expert. Analyze the code for:
- Memory usage optimization
- Performance improvements
- Power consumption reduction
- Code structure and readability
- Best practices implementation
- Library usage efficiency

Provide specific code suggestions with explanations.`,

    implement: `You are an Arduino implementation expert. When given a feature request:
- Break down the implementation into steps
- Identify required libraries and components
- Provide complete, working code
- Include necessary circuit diagrams or connections
- Explain the implementation choices
- Suggest testing procedures

Always provide production-ready code with proper error handling.`,

    circuitDesign: `You are an Arduino circuit design expert. Help with:
- Component selection and specifications
- Pin mapping and connections
- Power requirements and calculations
- Circuit protection and safety
- PCB layout considerations
- Troubleshooting circuit issues

Provide clear wiring instructions and component recommendations.`,

    libraryHelp: `You are an Arduino library expert. Assist with:
- Library selection for specific tasks
- Installation and setup instructions
- API usage and examples
- Compatibility issues
- Alternative library suggestions
- Custom library development

Focus on practical implementation guidance.`
  };

  const quickPrompts = [
    {
      category: 'Code Help',
      prompts: [
        'Explain what this code does',
        'Help me debug this error',
        'Optimize this code for better performance',
        'Add error handling to this code',
        'Convert this to use interrupts',
        'Make this code more readable'
      ]
    },
    {
      category: 'Implementation',
      prompts: [
        'Add WiFi connectivity to my project',
        'Implement data logging to SD card',
        'Add sensor calibration routine',
        'Create a web interface for control',
        'Add MQTT communication',
        'Implement OTA updates'
      ]
    },
    {
      category: 'Circuit Design',
      prompts: [
        'Design a sensor interface circuit',
        'Help with power supply design',
        'Add motor control circuitry',
        'Design voltage divider for ADC',
        'Add level shifters for 3.3V/5V',
        'Design protection circuits'
      ]
    },
    {
      category: 'Troubleshooting',
      prompts: [
        'Why is my serial output garbled?',
        'Arduino keeps resetting randomly',
        'Sensor readings are unstable',
        'Code uploads but doesn\'t run',
        'Memory or storage issues',
        'Timing and delay problems'
      ]
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const getCurrentCode = async (): Promise<string> => {
    try {
      // Since file.read is not available in the current electronAPI,
      // we'll use a fallback method or return empty string
      // This would need to be implemented in the preload script
      console.warn('file.read method not available in electronAPI');
      return '';
    } catch (error) {
      console.warn('Could not read current file:', error);
      return '';
    }
  };

  const extractLibraries = (code: string): string[] => {
    const includeRegex = /#include\s*[<"](.*?)[>"]/g;
    const libraries: string[] = [];
    let match;
    while ((match = includeRegex.exec(code)) !== null) {
      if (match[1]) {
        libraries.push(match[1]);
      }
    }
    return libraries;
  };

  const sendMessage = async (content: string, useSystemPrompt?: keyof typeof systemPrompts) => {
    if (!content.trim() && !useSystemPrompt) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content || selectedPrompt || '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '🤔 Thinking...',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const currentCode = await getCurrentCode();
      const libraries = extractLibraries(currentCode);
      const systemPrompt = useSystemPrompt ? systemPrompts[useSystemPrompt] : '';
      
      // Use the AI service with comprehensive context
      const aiMessages = messages
        .filter(m => !m.isTyping && m.role !== 'system')
        .slice(-10)
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp
        }));
      
      const response = await window.electronAPI.ai.chat(
        userMessage.content,
        `Current file: ${currentFile || 'No file selected'}
Project path: ${projectPath}
Current code:
${currentCode}

Libraries used: ${libraries.join(', ') || 'None'}

System prompt: ${systemPrompt}
`
      );

      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== 'typing'));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI chat error:', error);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please check your AI service configuration.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedPrompt(null);
    }
  };

  const handleQuickPrompt = async (prompt: string, category: string) => {
    setSelectedPrompt(prompt);
    setInputValue(prompt);
    
    // Determine best system prompt based on category
    let systemPromptKey: keyof typeof systemPrompts = 'codeExplain';
    if (category === 'Implementation') systemPromptKey = 'implement';
    else if (category === 'Circuit Design') systemPromptKey = 'circuitDesign';
    else if (category === 'Troubleshooting') systemPromptKey = 'debug';
    
    await sendMessage(prompt, systemPromptKey);
  };

  const handleImplement = async () => {
    if (!inputValue.trim()) return;
    
    setActiveTab('implement');
    await sendMessage(inputValue, 'implement');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '👋 Chat cleared! How can I help you with your Arduino project?',
      timestamp: new Date()
    }]);
  };

  const exportChat = () => {
    const chatContent = messages
      .filter(m => !m.isTyping)
      .map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino_ai_chat_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-tabs">
          <button 
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`tab ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            ⚡ Quick Prompts
          </button>
          <button 
            className={`tab ${activeTab === 'implement' ? 'active' : ''}`}
            onClick={() => setActiveTab('implement')}
          >
            �️ Implement
          </button>
        </div>
        
        <div className="ai-controls">
          <button onClick={clearChat} title="Clear chat">🗑️</button>
          <button onClick={exportChat} title="Export chat">💾</button>
        </div>
      </div>

      {activeTab === 'chat' && (
        <div className="chat-container">
          <div className="messages-container">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.role} ${message.isTyping ? 'typing' : ''}`}>
                <div className="message-header">
                  <span className="role-indicator">
                    {message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️'}
                  </span>
                  <span className="timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div 
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about Arduino development..."
              disabled={isLoading}
              rows={1}
            />
            <div className="input-controls">
              <button 
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                title="Send message (Enter)"
              >
                📤
              </button>
              <button
                onClick={handleImplement}
                disabled={!inputValue.trim() || isLoading}
                title="Implement feature"
              >
                🛠️
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="prompts-container">
          {quickPrompts.map(category => (
            <div key={category.category} className="prompt-category">
              <h4>{category.category}</h4>
              <div className="prompt-grid">
                {category.prompts.map(prompt => (
                  <button 
                    key={prompt}
                    className="prompt-button"
                    onClick={() => handleQuickPrompt(prompt, category.category)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'implement' && (
        <div className="implement-container">
          <div className="implement-info">
            <h4>🛠️ AI Implementation Assistant</h4>
            <p>Describe what you want to implement, and I'll provide complete working code with explanations.</p>
          </div>
          
          <div className="context-info">
            <div className="context-item">
              <strong>Current File:</strong> {currentFile || 'No file selected'}
            </div>
            <div className="context-item">
              <strong>Project:</strong> {projectPath || 'No project'}
            </div>
          </div>

          <div className="implement-examples">
            <h5>Example requests:</h5>
            <ul>
              <li>"Add WiFi connectivity to control LED via web interface"</li>
              <li>"Implement temperature logging to SD card with timestamps"</li>
              <li>"Create a motor control system with speed feedback"</li>
              <li>"Add MQTT communication for IoT sensor data"</li>
              <li>"Implement a digital filter for noisy sensor readings"</li>
            </ul>
          </div>

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe what you want to implement..."
            rows={4}
            className="implement-input"
          />
          
          <button 
            onClick={handleImplement}
            disabled={!inputValue.trim() || isLoading}
            className="implement-button"
          >
            {isLoading ? '🤔 Implementing...' : '🛠️ Implement Feature'}
          </button>
        </div>
      )}

      <div className="ai-status">
        <span className="context-indicator">
          📋 File: {currentFile ? currentFile.split('\\').pop() : 'None'} | Project: {projectPath ? projectPath.split('\\').pop() : 'None'}
        </span>
      </div>
    </div>
  );
};
