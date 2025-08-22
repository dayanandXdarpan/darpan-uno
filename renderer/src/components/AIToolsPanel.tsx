import React, { useState, useEffect, useCallback } from 'react';
import './AIToolsPanel.css';

interface QuickAction {
  id: string;
  name: string;
  description: string;
  category: 'sensor' | 'actuator' | 'communication' | 'display' | 'project' | 'learning';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: string;
  tags: string[];
}

interface ToolSuggestion {
  toolName: string;
  description: string;
  useCase: string;
  confidence: number;
  estimatedBenefit: string;
}

interface SmartToolResponse {
  success: boolean;
  response: {
    code?: string;
    documentation?: string;
    tutorial?: string;
    components?: any[];
    wiring?: string;
    recommendations?: string[];
    nextSteps?: string[];
  };
  metadata: {
    toolsUsed: string[];
    processingTime: number;
    confidenceScore: number;
  };
}

interface AIToolsPanelProps {
  onCodeGenerated?: (code: string) => void;
  onComponentsSelected?: (components: any[]) => void;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  onCodeGenerated,
  onComponentsSelected,
  experienceLevel = 'intermediate'
}) => {
  const [activeTab, setActiveTab] = useState<'quick-actions' | 'smart-assistant' | 'hardware-recognition' | 'learning'>('quick-actions');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [filteredActions, setFilteredActions] = useState<QuickAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(experienceLevel);
  const [userQuery, setUserQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<SmartToolResponse | null>(null);
  const [toolSuggestions, setToolSuggestions] = useState<ToolSuggestion[]>([]);
  const [systemCapabilities, setSystemCapabilities] = useState<any>(null);

  // Initialize AI tools
  useEffect(() => {
    initializeAITools();
    loadQuickActions();
    loadSystemCapabilities();
  }, []);

  // Filter actions based on search and filters
  useEffect(() => {
    filterActions();
  }, [quickActions, searchQuery, selectedCategory, selectedDifficulty]);

  const initializeAITools = async () => {
    try {
      // Initialize the Arduino Master Assistant
      await window.electronAPI?.aiTools?.initializeAITools?.();
    } catch (error) {
      console.error('Failed to initialize AI tools:', error);
    }
  };

  const loadQuickActions = async () => {
    try {
      const actions = await window.electronAPI?.aiTools?.getQuickActions?.();
      if (actions) {
        setQuickActions(actions);
      }
    } catch (error) {
      console.error('Failed to load quick actions:', error);
    }
  };

  const loadSystemCapabilities = async () => {
    try {
      const capabilities = await window.electronAPI?.aiTools?.getSystemCapabilities?.();
      if (capabilities) {
        setSystemCapabilities(capabilities);
      }
    } catch (error) {
      console.error('Failed to load system capabilities:', error);
    }
  };

  const filterActions = () => {
    let filtered = quickActions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(action =>
        action.name.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(action => action.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(action => action.difficulty === selectedDifficulty);
    }

    setFilteredActions(filtered);
  };

  const handleQuickAction = async (actionId: string) => {
    setIsProcessing(true);
    try {
      const response = await window.electronAPI?.aiTools?.executeQuickAction?.(actionId);
      if (response) {
        setLastResponse(response);
        if (response.response.code && onCodeGenerated) {
          onCodeGenerated(response.response.code);
        }
        if (response.response.components && onComponentsSelected) {
          onComponentsSelected(response.response.components);
        }
      }
    } catch (error) {
      console.error('Failed to execute quick action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSmartAssistant = async () => {
    if (!userQuery.trim()) return;

    setIsProcessing(true);
    try {
      // Get tool suggestions first
      const suggestions = await window.electronAPI?.aiTools?.suggestTools?.(userQuery);
      if (suggestions) {
        setToolSuggestions(suggestions);
      }

      // Process the request
      const response = await window.electronAPI?.aiTools?.handleUserRequest?.(userQuery, {
        experienceLevel,
        preferredFormat: 'comprehensive'
      });

      if (response) {
        setLastResponse(response);
        if (response.response.code && onCodeGenerated) {
          onCodeGenerated(response.response.code);
        }
        if (response.response.components && onComponentsSelected) {
          onComponentsSelected(response.response.components);
        }
      }
    } catch (error) {
      console.error('Failed to process smart assistant request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHardwareRecognition = async (description: string) => {
    setIsProcessing(true);
    try {
      const components = await window.electronAPI?.aiTools?.recognizeHardware?.(description);
      if (components && onComponentsSelected) {
        onComponentsSelected(components);
      }
      
      // Also suggest components based on the description
      const suggestions = await window.electronAPI?.aiTools?.suggestComponents?.({
        description,
        experienceLevel
      });
      
      if (suggestions) {
        setLastResponse({
          success: true,
          response: {
            components: suggestions,
            recommendations: ['Consider power requirements', 'Check voltage compatibility', 'Plan wiring layout']
          },
          metadata: {
            toolsUsed: ['Hardware Recognition'],
            processingTime: 1500,
            confidenceScore: 0.85
          }
        });
      }
    } catch (error) {
      console.error('Failed to recognize hardware:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const categories = ['all', 'sensor', 'actuator', 'communication', 'display', 'project', 'learning'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced', 'expert'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#4caf50';
      case 'intermediate': return '#ff9800';
      case 'advanced': return '#f44336';
      case 'expert': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sensor': return '📡';
      case 'actuator': return '⚙️';
      case 'communication': return '📶';
      case 'display': return '📺';
      case 'project': return '🚀';
      case 'learning': return '📚';
      default: return '🔧';
    }
  };

  return (
    <div className="ai-tools-panel">
      <div className="ai-tools-header">
        <h2>🤖 AI Arduino Assistant</h2>
        {systemCapabilities && (
          <div className="system-status">
            <span>🎯 {systemCapabilities.quickActions} Actions</span>
            <span>📋 {systemCapabilities.templates} Templates</span>
            <span>🔧 {systemCapabilities.components} Components</span>
          </div>
        )}
      </div>

      <div className="ai-tools-tabs">
        <button
          className={`tab ${activeTab === 'quick-actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('quick-actions')}
        >
          ⚡ Quick Actions
        </button>
        <button
          className={`tab ${activeTab === 'smart-assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('smart-assistant')}
        >
          🧠 Smart Assistant
        </button>
        <button
          className={`tab ${activeTab === 'hardware-recognition' ? 'active' : ''}`}
          onClick={() => setActiveTab('hardware-recognition')}
        >
          🔍 Hardware Recognition
        </button>
        <button
          className={`tab ${activeTab === 'learning' ? 'active' : ''}`}
          onClick={() => setActiveTab('learning')}
        >
          📚 Learning Path
        </button>
      </div>

      <div className="ai-tools-content">
        {activeTab === 'quick-actions' && (
          <div className="quick-actions-tab">
            <div className="filters-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search quick actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-controls">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : `${getCategoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="filter-select"
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>
                      {diff === 'all' ? 'All Levels' : diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actions-grid">
              {filteredActions.map(action => (
                <div key={action.id} className="action-card">
                  <div className="action-header">
                    <h3>{getCategoryIcon(action.category)} {action.name}</h3>
                    <span
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(action.difficulty) }}
                    >
                      {action.difficulty}
                    </span>
                  </div>
                  
                  <p className="action-description">{action.description}</p>
                  
                  <div className="action-meta">
                    <span className="time-estimate">⏱️ {action.estimatedTime}</span>
                    <div className="action-tags">
                      {action.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    className="action-button"
                    onClick={() => handleQuickAction(action.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Processing...' : '🚀 Start'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'smart-assistant' && (
          <div className="smart-assistant-tab">
            <div className="assistant-input">
              <textarea
                placeholder="Describe your Arduino project or ask for help..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="query-textarea"
                rows={4}
              />
              <button
                className="process-button"
                onClick={handleSmartAssistant}
                disabled={isProcessing || !userQuery.trim()}
              >
                {isProcessing ? '🔄 Processing...' : '🧠 Analyze & Generate'}
              </button>
            </div>

            {toolSuggestions.length > 0 && (
              <div className="tool-suggestions">
                <h3>💡 Recommended Tools</h3>
                {toolSuggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-card">
                    <h4>{suggestion.toolName}</h4>
                    <p>{suggestion.description}</p>
                    <div className="suggestion-meta">
                      <span className="confidence">🎯 {Math.round(suggestion.confidence * 100)}% match</span>
                      <span className="benefit">⚡ {suggestion.estimatedBenefit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hardware-recognition' && (
          <div className="hardware-recognition-tab">
            <div className="recognition-input">
              <h3>🔍 Describe Your Hardware</h3>
              <textarea
                placeholder="Describe the components you want to use or the functionality you need..."
                className="hardware-textarea"
                rows={3}
                onChange={(e) => {
                  if (e.target.value.length > 10) {
                    handleHardwareRecognition(e.target.value);
                  }
                }}
              />
            </div>
            
            <div className="upload-section">
              <h3>📷 Upload Component Image</h3>
              <div className="upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Handle image upload for recognition
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const imageData = event.target?.result;
                        if (imageData) {
                          // Process image with hardware recognition
                          setIsProcessing(true);
                          try {
                            const components = await window.electronAPI?.aiTools?.recognizeHardwareFromImage?.(imageData);
                            if (components && onComponentsSelected) {
                              onComponentsSelected(components);
                            }
                          } catch (error) {
                            console.error('Failed to recognize hardware from image:', error);
                          } finally {
                            setIsProcessing(false);
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="file-input"
                />
                <div className="upload-placeholder">
                  📷 Click to upload component image
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="learning-tab">
            <h3>📚 Learning Paths</h3>
            <div className="learning-paths">
              <div className="learning-path">
                <h4>🌱 Beginner Path</h4>
                <ul>
                  <li>Basic LED control</li>
                  <li>Button inputs</li>
                  <li>Analog sensors</li>
                  <li>Serial communication</li>
                </ul>
              </div>
              
              <div className="learning-path">
                <h4>🚀 Intermediate Path</h4>
                <ul>
                  <li>PWM and analog output</li>
                  <li>I2C communication</li>
                  <li>Servo and motor control</li>
                  <li>Data logging</li>
                </ul>
              </div>
              
              <div className="learning-path">
                <h4>⚡ Advanced Path</h4>
                <ul>
                  <li>WiFi and IoT projects</li>
                  <li>Real-time systems</li>
                  <li>Custom protocols</li>
                  <li>Optimization techniques</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {lastResponse && (
          <div className="response-section">
            <h3>📋 Generated Output</h3>
            <div className="response-content">
              {lastResponse.response.code && (
                <div className="code-section">
                  <h4>💻 Generated Code</h4>
                  <pre className="code-block">{lastResponse.response.code}</pre>
                </div>
              )}
              
              {lastResponse.response.documentation && (
                <div className="docs-section">
                  <h4>📖 Documentation</h4>
                  <div className="docs-content">{lastResponse.response.documentation}</div>
                </div>
              )}
              
              {lastResponse.response.components && (
                <div className="components-section">
                  <h4>🔧 Recommended Components</h4>
                  <div className="components-list">
                    {lastResponse.response.components.map((comp, index) => (
                      <div key={index} className="component-item">
                        <span className="component-name">{comp.name || comp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {lastResponse.response.recommendations && (
                <div className="recommendations-section">
                  <h4>💡 Recommendations</h4>
                  <ul>
                    {lastResponse.response.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="response-meta">
                <span>🔧 Tools used: {lastResponse.metadata.toolsUsed.join(', ')}</span>
                <span>⏱️ {lastResponse.metadata.processingTime}ms</span>
                <span>🎯 {Math.round(lastResponse.metadata.confidenceScore * 100)}% confidence</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIToolsPanel;
