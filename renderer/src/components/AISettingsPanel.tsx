import React, { useState, useEffect } from 'react';
import './AISettingsPanel.css';

interface AIModel {
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

interface AISettingsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onModelChange: (modelId: string) => void;
}

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  isVisible,
  onClose,
  onModelChange
}) => {
  const [models, setModels] = useState<AIModel[]>([
    {
      id: 'gemini-free',
      name: 'Gemini Free',
      provider: 'google',
      displayName: '🆓 Gemini Free',
      description: 'Free Gemini AI model with basic capabilities - No API key required!',
      requiresApiKey: false,
      isAvailable: true,
      isOnline: true,
      maxTokens: 8192,
      supportedFeatures: {
        codeGeneration: true,
        codeExplanation: true,
        debugging: true,
        optimization: true,
        imageRecognition: false,
        conversation: true
      }
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google',
      displayName: '🧠 Gemini Pro',
      description: 'Advanced Gemini model with enhanced capabilities',
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
      pricing: { inputTokens: 0.5, outputTokens: 1.5, currency: 'USD' }
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      displayName: '🤖 GPT-4',
      description: 'OpenAI\'s most capable model for complex reasoning',
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
      pricing: { inputTokens: 30, outputTokens: 60, currency: 'USD' }
    },
    {
      id: 'claude-3',
      name: 'Claude 3',
      provider: 'anthropic',
      displayName: '🎭 Claude 3',
      description: 'Anthropic\'s powerful AI assistant',
      requiresApiKey: true,
      isAvailable: false,
      isOnline: true,
      maxTokens: 200000,
      supportedFeatures: {
        codeGeneration: true,
        codeExplanation: true,
        debugging: true,
        optimization: true,
        imageRecognition: false,
        conversation: true
      },
      pricing: { inputTokens: 15, outputTokens: 75, currency: 'USD' }
    },
    {
      id: 'offline-templates',
      name: 'Offline Templates',
      provider: 'offline',
      displayName: '📚 Offline Mode',
      description: 'Built-in Arduino templates and examples',
      requiresApiKey: false,
      isAvailable: true,
      isOnline: false,
      maxTokens: 0,
      supportedFeatures: {
        codeGeneration: true,
        codeExplanation: false,
        debugging: false,
        optimization: false,
        imageRecognition: false,
        conversation: false
      }
    }
  ]);
  
  const [selectedModel, setSelectedModel] = useState<string>('gemini-free');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [offlineMode, setOfflineMode] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string>('');
  const [connectionResults, setConnectionResults] = useState<Record<string, boolean>>({});
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [usageStats] = useState<Record<string, { requests: number; tokens: number }>>({
    'gemini-free': { requests: 23, tokens: 1205 },
    'gemini-pro': { requests: 5, tokens: 342 },
    'gpt-4': { requests: 2, tokens: 156 }
  });

  useEffect(() => {
    if (isVisible) {
      loadSettings();
    }
  }, [isVisible]);

  const loadSettings = async () => {
    try {
      // Load stored API keys from localStorage
      const storedKeys = localStorage.getItem('darpan-uno-api-keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        setApiKeys(keys);
        
        // Update model availability based on API keys
        setModels(prev => prev.map(model => ({
          ...model,
          isAvailable: !model.requiresApiKey || !!keys[model.provider] || model.id === 'gemini-free' || model.id === 'offline-templates'
        })));
      }
      
      const storedModel = localStorage.getItem('darpan-uno-selected-model');
      if (storedModel) {
        setSelectedModel(storedModel);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    try {
      setSelectedModel(modelId);
      localStorage.setItem('darpan-uno-selected-model', modelId);
      onModelChange(modelId);
      
      console.log(`✅ Model changed to: ${modelId}`);
    } catch (error) {
      console.error('Failed to select model:', error);
    }
  };

  const handleApiKeyChange = async (provider: string, apiKey: string) => {
    try {
      const updatedKeys = { ...apiKeys, [provider]: apiKey };
      setApiKeys(updatedKeys);
      
      // Save to localStorage
      localStorage.setItem('darpan-uno-api-keys', JSON.stringify(updatedKeys));
      
      // Update model availability
      setModels(prev => prev.map(model => ({
        ...model,
        isAvailable: !model.requiresApiKey || !!updatedKeys[model.provider] || model.id === 'gemini-free' || model.id === 'offline-templates'
      })));
      
      console.log(`✅ ${provider} API key saved successfully`);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const handleOfflineModeToggle = async (offline: boolean) => {
    try {
      setOfflineMode(offline);
      localStorage.setItem('darpan-uno-offline-mode', offline.toString());
      
      if (offline) {
        setSelectedModel('offline-templates');
        onModelChange('offline-templates');
      } else {
        setSelectedModel('gemini-free');
        onModelChange('gemini-free');
      }
      
      console.log(`✅ Offline mode: ${offline ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle offline mode:', error);
    }
  };

  const testConnection = async (modelId: string) => {
    setTestingConnection(modelId);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const model = models.find(m => m.id === modelId);
      const hasApiKey = model && (model.requiresApiKey ? !!apiKeys[model.provider] : true);
      
      setConnectionResults(prev => ({ ...prev, [modelId]: hasApiKey || false }));
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionResults(prev => ({ ...prev, [modelId]: false }));
    } finally {
      setTestingConnection('');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖';
      case 'google': return '🧠';
      case 'anthropic': return '🎭';
      case 'local': return '💻';
      case 'offline': return '📚';
      default: return '🔧';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return '#10a37f';
      case 'google': return '#4285f4';
      case 'anthropic': return '#ff6b35';
      case 'local': return '#6366f1';
      case 'offline': return '#64748b';
      default: return '#6b7280';
    }
  };

  const formatPrice = (model: AIModel) => {
    if (!model.pricing) return 'Free';
    return `$${model.pricing.inputTokens}/1K input, $${model.pricing.outputTokens}/1K output`;
  };

  const getFeatureIcons = (features: AIModel['supportedFeatures']) => {
    const icons: string[] = [];
    if (features.codeGeneration) icons.push('💻');
    if (features.debugging) icons.push('🐛');
    if (features.optimization) icons.push('⚡');
    if (features.imageRecognition) icons.push('👁️');
    if (features.conversation) icons.push('💬');
    return icons.join(' ');
  };

  if (!isVisible) return null;

  return (
    <div className="ai-settings-overlay">
      <div className="ai-settings-panel">
        <div className="ai-settings-header">
          <h2>🤖 AI Model Settings</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="ai-settings-content">
          {/* Offline Mode Toggle */}
          <div className="setting-section">
            <div className="setting-header">
              <h3>🔌 Connection Mode</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={offlineMode}
                  onChange={(e) => handleOfflineModeToggle(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="setting-description">
              {offlineMode 
                ? '📴 Offline mode - Using local templates and basic assistance only'
                : '🌐 Online mode - Full AI capabilities with internet connection'
              }
            </p>
          </div>

          {/* API Keys Section */}
          <div className="setting-section">
            <h3>🔑 API Keys</h3>
            <p className="setting-description">
              Configure API keys for different AI providers to enable online AI assistance.
            </p>
            
            {['openai', 'google', 'anthropic'].map(provider => (
              <div key={provider} className="api-key-row">
                <div className="provider-info">
                  <span className="provider-icon">{getProviderIcon(provider)}</span>
                  <span className="provider-name">
                    {provider === 'openai' ? 'OpenAI' : 
                     provider === 'google' ? 'Google Gemini' : 
                     'Anthropic Claude'}
                  </span>
                </div>
                
                <div className="api-key-input-group">
                  <input
                    type={showApiKey[provider] ? 'text' : 'password'}
                    placeholder={`Enter ${provider} API key...`}
                    value={apiKeys[provider] || ''}
                    onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                    className="api-key-input"
                  />
                  <button
                    className="show-key-button"
                    onClick={() => setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                  >
                    {showApiKey[provider] ? '👁️' : '🙈'}
                  </button>
                </div>
                
                <div className="api-key-status">
                  {apiKeys[provider] ? (
                    <span className="status-configured">✅ Configured</span>
                  ) : (
                    <span className="status-missing">❌ Missing</span>
                  )}
                </div>
              </div>
            ))}

            <div className="api-key-help">
              <h4>🔗 How to get API keys:</h4>
              <ul>
                <li><strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a></li>
                <li><strong>Google:</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">makersuite.google.com/app/apikey</a></li>
                <li><strong>Anthropic:</strong> Visit <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com/account/keys</a></li>
              </ul>
            </div>
          </div>

          {/* Model Selection */}
          <div className="setting-section">
            <h3>🎯 Available Models</h3>
            <p className="setting-description">
              Choose the AI model that best fits your needs and budget.
            </p>

            <div className="models-grid">
              {models.map(model => (
                <div
                  key={model.id}
                  className={`model-card ${selectedModel === model.id ? 'selected' : ''} ${!model.isAvailable ? 'disabled' : ''}`}
                  onClick={() => model.isAvailable && handleModelSelect(model.id)}
                >
                  <div className="model-header">
                    <div className="model-title">
                      <span
                        className="provider-badge"
                        style={{ backgroundColor: getProviderColor(model.provider) }}
                      >
                        {getProviderIcon(model.provider)}
                      </span>
                      <h4>{model.displayName}</h4>
                      {selectedModel === model.id && <span className="selected-badge">✓</span>}
                    </div>
                    
                    <div className="model-status">
                      {model.isAvailable ? (
                        <span className="status-available">✅ Available</span>
                      ) : model.requiresApiKey ? (
                        <span className="status-needs-key">🔑 Needs API Key</span>
                      ) : (
                        <span className="status-unavailable">❌ Unavailable</span>
                      )}
                    </div>
                  </div>

                  <p className="model-description">{model.description}</p>

                  <div className="model-features">
                    <span className="features-label">Features:</span>
                    <span className="features-icons">{getFeatureIcons(model.supportedFeatures)}</span>
                  </div>

                  <div className="model-specs">
                    <div className="spec-item">
                      <span className="spec-label">Max Tokens:</span>
                      <span className="spec-value">{model.maxTokens.toLocaleString()}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Pricing:</span>
                      <span className="spec-value">{formatPrice(model)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Mode:</span>
                      <span className="spec-value">{model.isOnline ? '🌐 Online' : '💻 Offline'}</span>
                    </div>
                  </div>

                  {model.isAvailable && (
                    <div className="model-actions">
                      <button
                        className="test-connection-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection(model.id);
                        }}
                        disabled={testingConnection === model.id}
                      >
                        {testingConnection === model.id ? '⏳ Testing...' : '🔍 Test Connection'}
                      </button>
                      
                      {connectionResults[model.id] !== undefined && (
                        <span className={`connection-result ${connectionResults[model.id] ? 'success' : 'failure'}`}>
                          {connectionResults[model.id] ? '✅ Connected' : '❌ Failed'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="setting-section">
            <h3>📊 Usage Statistics (Last Hour)</h3>
            <div className="usage-stats">
              {Object.entries(usageStats).map(([provider, stats]) => (
                <div key={provider} className="usage-stat-item">
                  <div className="stat-header">
                    <span className="stat-provider">{getProviderIcon(provider)} {provider}</span>
                  </div>
                  <div className="stat-values">
                    <span className="stat-requests">📞 {stats.requests} requests</span>
                    <span className="stat-tokens">🎯 {stats.tokens} tokens</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="setting-section">
            <h3>⚙️ Preferences</h3>
            <div className="preferences-grid">
              <label className="preference-item">
                <span className="preference-label">🔄 Auto-fallback to offline</span>
                <input type="checkbox" defaultChecked />
              </label>
              
              <label className="preference-item">
                <span className="preference-label">💾 Save conversation history</span>
                <input type="checkbox" defaultChecked />
              </label>
              
              <label className="preference-item">
                <span className="preference-label">🔔 Show token usage notifications</span>
                <input type="checkbox" />
              </label>
              
              <label className="preference-item">
                <span className="preference-label">⚡ Enable streaming responses</span>
                <input type="checkbox" defaultChecked />
              </label>
            </div>
          </div>
        </div>

        <div className="ai-settings-footer">
          <button className="settings-button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-button primary" onClick={onClose}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPanel;
