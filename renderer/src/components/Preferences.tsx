import React, { useState, useEffect } from 'react';
import './Preferences.css';

interface PreferenceCategory {
  id: string;
  name: string;
  icon: string;
}

interface Preference {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'path' | 'color';
  value: any;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  category: string;
}

const Preferences: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const categories: PreferenceCategory[] = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'editor', name: 'Editor', icon: '📝' },
    { id: 'compilation', name: 'Compilation', icon: '🔨' },
    { id: 'upload', name: 'Upload', icon: '📤' },
    { id: 'network', name: 'Network', icon: '🌐' },
    { id: 'ai', name: 'AI Assistant', icon: '🤖' },
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'advanced', name: 'Advanced', icon: '🔧' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      // Mock preferences data - in real implementation, load from settings
      const defaultPreferences: Preference[] = [
        // General
        {
          key: 'language',
          label: 'Language',
          description: 'Interface language',
          type: 'select',
          value: 'en',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
            { value: 'fr', label: 'Français' },
            { value: 'de', label: 'Deutsch' },
            { value: 'it', label: 'Italiano' }
          ],
          category: 'general'
        },
        {
          key: 'checkForUpdates',
          label: 'Check for updates automatically',
          description: 'Automatically check for IDE and library updates',
          type: 'boolean',
          value: true,
          category: 'general'
        },
        {
          key: 'sketchbookLocation',
          label: 'Sketchbook location',
          description: 'Directory where sketches are stored',
          type: 'path',
          value: 'C:\\Users\\Documents\\Arduino',
          category: 'general'
        },
        {
          key: 'enableVerboseOutput',
          label: 'Show verbose output during compilation/upload',
          description: 'Show detailed information during build and upload',
          type: 'boolean',
          value: false,
          category: 'general'
        },

        // Editor
        {
          key: 'fontSize',
          label: 'Font size',
          description: 'Editor font size in pixels',
          type: 'number',
          value: 14,
          min: 8,
          max: 72,
          category: 'editor'
        },
        {
          key: 'fontFamily',
          label: 'Font family',
          description: 'Editor font family',
          type: 'select',
          value: 'Monaco',
          options: [
            { value: 'Monaco', label: 'Monaco' },
            { value: 'Consolas', label: 'Consolas' },
            { value: 'Courier New', label: 'Courier New' },
            { value: 'Source Code Pro', label: 'Source Code Pro' },
            { value: 'Fira Code', label: 'Fira Code' }
          ],
          category: 'editor'
        },
        {
          key: 'tabSize',
          label: 'Tab size',
          description: 'Number of spaces per tab',
          type: 'number',
          value: 2,
          min: 1,
          max: 8,
          category: 'editor'
        },
        {
          key: 'autoIndent',
          label: 'Auto-indent',
          description: 'Automatically indent new lines',
          type: 'boolean',
          value: true,
          category: 'editor'
        },
        {
          key: 'lineNumbers',
          label: 'Show line numbers',
          description: 'Display line numbers in the editor',
          type: 'boolean',
          value: true,
          category: 'editor'
        },
        {
          key: 'wordWrap',
          label: 'Word wrap',
          description: 'Wrap long lines in the editor',
          type: 'boolean',
          value: false,
          category: 'editor'
        },

        // Compilation
        {
          key: 'compilerWarnings',
          label: 'Compiler warnings',
          description: 'Level of compiler warnings to show',
          type: 'select',
          value: 'default',
          options: [
            { value: 'none', label: 'None' },
            { value: 'default', label: 'Default' },
            { value: 'more', label: 'More' },
            { value: 'all', label: 'All' }
          ],
          category: 'compilation'
        },
        {
          key: 'deleteCompiledFiles',
          label: 'Delete compiled files after upload',
          description: 'Clean up temporary files after successful upload',
          type: 'boolean',
          value: true,
          category: 'compilation'
        },
        {
          key: 'parallelCompilation',
          label: 'Enable parallel compilation',
          description: 'Use multiple CPU cores for faster compilation',
          type: 'boolean',
          value: true,
          category: 'compilation'
        },

        // Upload
        {
          key: 'verifyAfterUpload',
          label: 'Verify code after upload',
          description: 'Read back and verify uploaded code',
          type: 'boolean',
          value: true,
          category: 'upload'
        },
        {
          key: 'uploadPort',
          label: 'Default upload port',
          description: 'Default serial port for uploads',
          type: 'select',
          value: 'COM3',
          options: [
            { value: 'COM3', label: 'COM3' },
            { value: 'COM4', label: 'COM4' },
            { value: 'COM5', label: 'COM5' },
            { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' },
            { value: '/dev/ttyACM0', label: '/dev/ttyACM0' }
          ],
          category: 'upload'
        },

        // Network
        {
          key: 'enableProxy',
          label: 'Use proxy server',
          description: 'Enable proxy for internet connections',
          type: 'boolean',
          value: false,
          category: 'network'
        },
        {
          key: 'proxyHost',
          label: 'Proxy host',
          description: 'Proxy server hostname',
          type: 'string',
          value: '',
          category: 'network'
        },
        {
          key: 'proxyPort',
          label: 'Proxy port',
          description: 'Proxy server port number',
          type: 'number',
          value: 8080,
          min: 1,
          max: 65535,
          category: 'network'
        },

        // AI Assistant
        {
          key: 'aiEnabled',
          label: 'Enable AI Assistant',
          description: 'Enable AI-powered code assistance',
          type: 'boolean',
          value: true,
          category: 'ai'
        },
        {
          key: 'aiProvider',
          label: 'AI Provider',
          description: 'AI service provider',
          type: 'select',
          value: 'openai',
          options: [
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'gemini', label: 'Google Gemini' },
            { value: 'local', label: 'Local Model' }
          ],
          category: 'ai'
        },
        {
          key: 'aiAutoSuggest',
          label: 'Auto-suggest code completions',
          description: 'Automatically suggest code completions while typing',
          type: 'boolean',
          value: true,
          category: 'ai'
        },

        // Appearance
        {
          key: 'theme',
          label: 'Theme',
          description: 'IDE color theme',
          type: 'select',
          value: 'dark',
          options: [
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'auto', label: 'System' }
          ],
          category: 'appearance'
        },
        {
          key: 'accentColor',
          label: 'Accent color',
          description: 'IDE accent color',
          type: 'color',
          value: '#007acc',
          category: 'appearance'
        },
        {
          key: 'showWelcomeTab',
          label: 'Show welcome tab on startup',
          description: 'Display welcome tab when IDE starts',
          type: 'boolean',
          value: true,
          category: 'appearance'
        },

        // Advanced
        {
          key: 'enableExperimentalFeatures',
          label: 'Enable experimental features',
          description: 'Enable features that are still in development',
          type: 'boolean',
          value: false,
          category: 'advanced'
        },
        {
          key: 'debugLevel',
          label: 'Debug level',
          description: 'Verbosity of debug output',
          type: 'select',
          value: 'info',
          options: [
            { value: 'error', label: 'Error' },
            { value: 'warn', label: 'Warning' },
            { value: 'info', label: 'Info' },
            { value: 'debug', label: 'Debug' },
            { value: 'trace', label: 'Trace' }
          ],
          category: 'advanced'
        }
      ];

      setPreferences(defaultPreferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => prev.map(pref => 
      pref.key === key ? { ...pref, value } : pref
    ));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    try {
      // In real implementation, save to settings
      for (const pref of preferences) {
        console.log(`Saving preference: ${pref.key} = ${pref.value}`);
        // await window.electronAPI?.settings?.set?.(pref.key, pref.value);
      }
      setHasChanges(false);
      console.log('✅ Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Are you sure you want to reset all preferences to default values?')) {
      await loadPreferences();
      setHasChanges(true);
    }
  };

  const exportPreferences = () => {
    const config = preferences.reduce((acc, pref) => {
      acc[pref.key] = pref.value;
      return acc;
    }, {} as any);

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arduino-ide-preferences-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPreferences = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const config = JSON.parse(event.target?.result as string);
            setPreferences(prev => prev.map(pref => ({
              ...pref,
              value: config[pref.key] !== undefined ? config[pref.key] : pref.value
            })));
            setHasChanges(true);
            console.log('✅ Preferences imported successfully');
          } catch (error) {
            console.error('Failed to import preferences:', error);
            alert('Invalid preferences file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const filteredPreferences = preferences.filter(pref => {
    const matchesCategory = pref.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      pref.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pref.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderPreferenceInput = (pref: Preference) => {
    switch (pref.type) {
      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={pref.value}
              onChange={(e) => updatePreference(pref.key, e.target.checked)}
            />
            <span className="checkbox-custom"></span>
          </label>
        );

      case 'string':
        return (
          <input
            type="text"
            value={pref.value}
            onChange={(e) => updatePreference(pref.key, e.target.value)}
            className="text-input"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={pref.value}
            min={pref.min}
            max={pref.max}
            onChange={(e) => updatePreference(pref.key, Number(e.target.value))}
            className="number-input"
          />
        );

      case 'select':
        return (
          <select
            value={pref.value}
            onChange={(e) => updatePreference(pref.key, e.target.value)}
            className="select-input"
          >
            {pref.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'path':
        return (
          <div className="path-input-group">
            <input
              type="text"
              value={pref.value}
              onChange={(e) => updatePreference(pref.key, e.target.value)}
              className="text-input"
            />
            <button
              onClick={async () => {
                try {
                  const result = await window.electronAPI?.file?.showOpenDialog?.({
                    properties: ['openDirectory']
                  });
                  if (result && Array.isArray(result) && result.length > 0) {
                    updatePreference(pref.key, result[0]);
                  }
                } catch (error) {
                  console.error('Failed to select path:', error);
                }
              }}
              className="browse-btn"
            >
              📁 Browse
            </button>
          </div>
        );

      case 'color':
        return (
          <input
            type="color"
            value={pref.value}
            onChange={(e) => updatePreference(pref.key, e.target.value)}
            className="color-input"
          />
        );

      default:
        return <span>Unsupported type</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="preferences-overlay">
      <div className="preferences">
        <div className="preferences-header">
          <h2>⚙️ Preferences</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="preferences-toolbar">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search preferences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="toolbar-actions">
            <button onClick={importPreferences} className="import-btn">
              📥 Import
            </button>
            <button onClick={exportPreferences} className="export-btn">
              📤 Export
            </button>
            <button onClick={resetToDefaults} className="reset-btn">
              🔄 Reset
            </button>
          </div>
        </div>

        <div className="preferences-content">
          <div className="categories-sidebar">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>

          <div className="preferences-panel">
            <div className="panel-header">
              <h3>
                {categories.find(c => c.id === selectedCategory)?.icon}{' '}
                {categories.find(c => c.id === selectedCategory)?.name}
              </h3>
            </div>

            <div className="preferences-list">
              {filteredPreferences.length === 0 && (
                <div className="no-results">
                  <p>No preferences found matching your search.</p>
                </div>
              )}

              {filteredPreferences.map(pref => (
                <div key={pref.key} className="preference-item">
                  <div className="preference-info">
                    <label className="preference-label">{pref.label}</label>
                    <p className="preference-description">{pref.description}</p>
                  </div>
                  <div className="preference-input">
                    {renderPreferenceInput(pref)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="preferences-footer">
          <div className="status-section">
            {hasChanges && (
              <span className="changes-indicator">
                ⚠️ You have unsaved changes
              </span>
            )}
          </div>

          <div className="action-buttons">
            <button onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              onClick={savePreferences} 
              className="save-btn"
              disabled={!hasChanges}
            >
              💾 Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
