import React, { useState, useEffect } from 'react';
import './DeveloperOptions.css';

interface DeveloperOptionsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DevSettings {
  debugMode: boolean;
  verboseLogging: boolean;
  showConsole: boolean;
  enableExperimentalFeatures: boolean;
  aiDebugMode: boolean;
  skipArduinoCLICheck: boolean;
  enableTelemetry: boolean;
  autoReload: boolean;
}

const DeveloperOptions: React.FC<DeveloperOptionsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<DevSettings>({
    debugMode: false,
    verboseLogging: false,
    showConsole: false,
    enableExperimentalFeatures: false,
    aiDebugMode: false,
    skipArduinoCLICheck: false,
    enableTelemetry: true,
    autoReload: false
  });

  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'console' | 'system' | 'api'>('settings');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('devSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  const updateSetting = (key: keyof DevSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('devSettings', JSON.stringify(newSettings));
    
    // Apply setting immediately
    if (key === 'debugMode') {
      (window as any).DEBUG_MODE = value;
    }
    if (key === 'verboseLogging') {
      (window as any).VERBOSE_LOGGING = value;
    }
  };

  // Console functions
  const clearConsole = () => {
    setConsoleOutput([]);
  };

  const addLog = (message: string) => {
    setConsoleOutput(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // System info
  const getSystemInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  };

  // API Test functions
  const testAPIs = async () => {
    addLog('Testing APIs...');
    
    // Test Arduino CLI
    try {
      await (window as any).electron?.arduino?.getBoardList();
      addLog('✅ Arduino CLI: OK');
    } catch (error) {
      addLog(`❌ Arduino CLI: ${error}`);
    }

    // Test AI APIs
    const aiKeys = {
      gemini: localStorage.getItem('gemini_api_key'),
      openai: localStorage.getItem('openai_api_key'),
      claude: localStorage.getItem('claude_api_key')
    };

    Object.entries(aiKeys).forEach(([name, key]) => {
      if (key && key !== 'your_api_key_here') {
        addLog(`✅ ${name.toUpperCase()} API: Key configured`);
      } else {
        addLog(`⚠️ ${name.toUpperCase()} API: No key configured`);
      }
    });
  };

  const resetAllSettings = () => {
    if (confirm('Are you sure you want to reset all developer settings? This cannot be undone.')) {
      localStorage.removeItem('devSettings');
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('openai_api_key');
      localStorage.removeItem('claude_api_key');
      setSettings({
        debugMode: false,
        verboseLogging: false,
        showConsole: false,
        enableExperimentalFeatures: false,
        aiDebugMode: false,
        skipArduinoCLICheck: false,
        enableTelemetry: true,
        autoReload: false
      });
      addLog('🔄 All settings reset to defaults');
    }
  };

  const exportLogs = () => {
    const logs = consoleOutput.join('\n');
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino-ide-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('📄 Logs exported successfully');
  };

  if (!isOpen) return null;

  const systemInfo = getSystemInfo();

  return (
    <div className="developer-options-overlay">
      <div className="developer-options-modal">
        <div className="developer-options-header">
          <h2>🛠️ Developer Options</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="developer-options-tabs">
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            🖥️ Console
          </button>
          <button 
            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            📊 System
          </button>
          <button 
            className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            🔌 API
          </button>
        </div>

        <div className="developer-options-content">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-tab">
              <h3>🔧 Debug Settings</h3>
              <div className="settings-group">
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.debugMode}
                      onChange={(e) => updateSetting('debugMode', e.target.checked)}
                    />
                    <span className="setting-label">Debug Mode</span>
                  </label>
                  <p className="setting-description">Enable debug output in console</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.verboseLogging}
                      onChange={(e) => updateSetting('verboseLogging', e.target.checked)}
                    />
                    <span className="setting-label">Verbose Logging</span>
                  </label>
                  <p className="setting-description">Show detailed logs for all operations</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.showConsole}
                      onChange={(e) => updateSetting('showConsole', e.target.checked)}
                    />
                    <span className="setting-label">Show Developer Console</span>
                  </label>
                  <p className="setting-description">Display browser console in the app</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.aiDebugMode}
                      onChange={(e) => updateSetting('aiDebugMode', e.target.checked)}
                    />
                    <span className="setting-label">AI Debug Mode</span>
                  </label>
                  <p className="setting-description">Show AI request/response details</p>
                </div>
              </div>

              <h3>🧪 Experimental Features</h3>
              <div className="settings-group">
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enableExperimentalFeatures}
                      onChange={(e) => updateSetting('enableExperimentalFeatures', e.target.checked)}
                    />
                    <span className="setting-label">Enable Experimental Features</span>
                  </label>
                  <p className="setting-description">Access beta features (may be unstable)</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.autoReload}
                      onChange={(e) => updateSetting('autoReload', e.target.checked)}
                    />
                    <span className="setting-label">Auto-reload on Changes</span>
                  </label>
                  <p className="setting-description">Automatically reload when files change</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.skipArduinoCLICheck}
                      onChange={(e) => updateSetting('skipArduinoCLICheck', e.target.checked)}
                    />
                    <span className="setting-label">Skip Arduino CLI Check</span>
                  </label>
                  <p className="setting-description">Bypass Arduino CLI initialization (use if having issues)</p>
                </div>
              </div>

              <h3>📊 Privacy & Analytics</h3>
              <div className="settings-group">
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enableTelemetry}
                      onChange={(e) => updateSetting('enableTelemetry', e.target.checked)}
                    />
                    <span className="setting-label">Enable Telemetry</span>
                  </label>
                  <p className="setting-description">Help improve the IDE by sending usage data</p>
                </div>
              </div>

              <div className="settings-actions">
                <button className="danger-btn" onClick={resetAllSettings}>
                  🔄 Reset All Settings
                </button>
              </div>
            </div>
          )}

          {/* Console Tab */}
          {activeTab === 'console' && (
            <div className="console-tab">
              <div className="console-header">
                <h3>🖥️ Developer Console</h3>
                <div className="console-actions">
                  <button onClick={clearConsole}>🗑️ Clear</button>
                  <button onClick={exportLogs}>📄 Export</button>
                  <button onClick={() => addLog('Test log message')}>🧪 Test</button>
                </div>
              </div>
              <div className="console-output">
                {consoleOutput.length === 0 ? (
                  <div className="console-empty">No logs yet. Enable debug mode to see output.</div>
                ) : (
                  consoleOutput.map((log, index) => (
                    <div key={index} className="console-line">{log}</div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="system-tab">
              <h3>📊 System Information</h3>
              <div className="system-info">
                <div className="info-section">
                  <h4>🌐 Browser</h4>
                  <div className="info-item">
                    <span className="info-label">User Agent:</span>
                    <span className="info-value">{systemInfo.userAgent}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Platform:</span>
                    <span className="info-value">{systemInfo.platform}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Language:</span>
                    <span className="info-value">{systemInfo.language}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Online:</span>
                    <span className="info-value">{systemInfo.onLine ? '✅ Yes' : '❌ No'}</span>
                  </div>
                </div>

                <div className="info-section">
                  <h4>🖥️ Display</h4>
                  <div className="info-item">
                    <span className="info-label">Resolution:</span>
                    <span className="info-value">{systemInfo.screenResolution}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Color Depth:</span>
                    <span className="info-value">{systemInfo.colorDepth} bits</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Timezone:</span>
                    <span className="info-value">{systemInfo.timezone}</span>
                  </div>
                </div>

                {systemInfo.memory && (
                  <div className="info-section">
                    <h4>💾 Memory (MB)</h4>
                    <div className="info-item">
                      <span className="info-label">Used:</span>
                      <span className="info-value">{systemInfo.memory.used} MB</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Total:</span>
                      <span className="info-value">{systemInfo.memory.total} MB</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Limit:</span>
                      <span className="info-value">{systemInfo.memory.limit} MB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="api-tab">
              <h3>🔌 API Status</h3>
              <div className="api-actions">
                <button onClick={testAPIs}>🧪 Test All APIs</button>
                <button onClick={() => addLog('Manual API test initiated')}>📊 Manual Test</button>
              </div>
              
              <div className="api-status">
                <h4>AI API Keys</h4>
                <div className="api-keys">
                  <div className="api-key-item">
                    <span className="api-name">Gemini:</span>
                    <span className={`api-status-badge ${localStorage.getItem('gemini_api_key') ? 'configured' : 'missing'}`}>
                      {localStorage.getItem('gemini_api_key') ? '✅ Configured' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="api-key-item">
                    <span className="api-name">OpenAI:</span>
                    <span className={`api-status-badge ${localStorage.getItem('openai_api_key') ? 'configured' : 'missing'}`}>
                      {localStorage.getItem('openai_api_key') ? '✅ Configured' : '❌ Missing'}
                    </span>
                  </div>
                  <div className="api-key-item">
                    <span className="api-name">Claude:</span>
                    <span className={`api-status-badge ${localStorage.getItem('claude_api_key') ? 'configured' : 'missing'}`}>
                      {localStorage.getItem('claude_api_key') ? '✅ Configured' : '❌ Missing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeveloperOptions;
