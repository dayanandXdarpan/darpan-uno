import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimpleEditor } from './SimpleEditor';
import { SerialPanel } from './SerialPanel';
import { EnhancedProjectExplorer } from './EnhancedProjectExplorer';
import { StatusBar } from './StatusBar';
import { EnhancedChat } from './EnhancedChat';
import { DeveloperProfile } from './DeveloperProfile';
import BoardManager from './BoardManager';
import LibraryManager from './LibraryManager';
import SerialPlotter from './SerialPlotter';
import Preferences from './Preferences';
import ExamplesBrowser from './ExamplesBrowser';
import SketchBookManager from './SketchBookManager';
import OutputConsole from './OutputConsole';
import VersionInfo from './VersionInfo';
import DeveloperOptions from './DeveloperOptions';
import './Layout.css';
import './EnhancedChatUI.css';

interface LayoutProps {}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export const Layout: React.FC<LayoutProps> = () => {
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('arduino:avr:uno');
  const [selectedPort, setSelectedPort] = useState<string>('COM3');
  const [showChat, setShowChat] = useState(false);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [chatCode, setChatCode] = useState<string>('');
  const [editorCode, setEditorCode] = useState<string>('');
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState('serial');
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Consolas');

  // Arduino IDE Manager states
  const [showBoardManager, setShowBoardManager] = useState(false);
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [showSerialPlotter, setShowSerialPlotter] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showExamplesBrowser, setShowExamplesBrowser] = useState(false);
  const [showSketchBookManager, setShowSketchBookManager] = useState(false);
  const [showOutputConsole, setShowOutputConsole] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [showDeveloperProfile, setShowDeveloperProfile] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState('Gemini Pro');

  // Dropdown menu states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const layoutRef = useRef<HTMLDivElement>(null);

  // Handle dropdown menu logic
  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutRef.current && !layoutRef.current.contains(event.target as Node)) {
        return;
      }
      
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-dropdown')) {
        closeDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !layoutRef.current) return;

      const rect = layoutRef.current.getBoundingClientRect();

      if (isResizing === 'left') {
        const newWidth = Math.max(200, Math.min(600, e.clientX - rect.left));
        setLeftPanelWidth(newWidth);
      } else if (isResizing === 'right') {
        const newWidth = Math.max(300, Math.min(800, rect.right - e.clientX));
        setRightPanelWidth(newWidth);
      } else if (isResizing === 'bottom') {
        const newHeight = Math.max(150, Math.min(400, rect.bottom - e.clientY));
        setBottomPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // VS Code-like shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            if (e.shiftKey) {
              e.preventDefault();
              handleCompile();
            } else {
              e.preventDefault();
              setShowLeftPanel(!showLeftPanel);
            }
            break;
          case 'j':
            e.preventDefault();
            setShowBottomPanel(!showBottomPanel);
            break;
          case '`':
            e.preventDefault();
            setShowBottomPanel(!showBottomPanel);
            setActiveBottomTab('terminal');
            break;
          case '/':
            e.preventDefault();
            // Toggle comments (would be implemented in editor)
            break;
          case '=':
            e.preventDefault();
            setFontSize(prev => Math.min(prev + 1, 24));
            break;
          case '-':
            e.preventDefault();
            setFontSize(prev => Math.max(prev - 1, 10));
            break;
        }
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isResizing, showLeftPanel, showBottomPanel]);

  const handleFileSelect = (filePath: string) => {
    setCurrentFile(filePath);
  };

  const handleCompile = async () => {
    if (!currentFile) {
      alert('Please select a file to compile');
      return;
    }

    try {
      console.log(`🔨 Compiling ${currentFile} for ${selectedBoard}...`);
      // Simulate compilation for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Compilation successful');
    } catch (error) {
      console.error('❌ Compilation error:', error);
    }
  };

  const handleUpload = async () => {
    if (!currentFile || !selectedPort) {
      alert('Please select a file and port for upload');
      return;
    }

    try {
      console.log(`📤 Uploading to ${selectedPort}...`);
      // Simulate upload for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Upload successful');
    } catch (error) {
      console.error('❌ Upload error:', error);
    }
  };

  const handleSerialConnect = async () => {
    if (!selectedPort) {
      alert('Please select a port');
      return;
    }

    try {
      setIsConnected(!isConnected);
      console.log(isConnected ? '🔌 Disconnected' : '🔗 Connected to serial');
    } catch (error) {
      console.error('Serial connection error:', error);
    }
  };

  const handleCodeGenerated = (code: string) => {
    setChatCode(code);
    console.log('Code generated from AI chat:', code);
  };

  const handleInsertCode = (code: string) => {
    setEditorCode(prevCode => {
      const newCode = prevCode + '\n\n' + code;
      return newCode;
    });
  };

  const handleOpenExample = (examplePath: string) => {
    setCurrentFile(examplePath);
    console.log('Opening example:', examplePath);
  };

  const handleOpenSketch = (sketchPath: string) => {
    setCurrentFile(sketchPath);
    console.log('Opening sketch:', sketchPath);
  };

  const handleStreamingMessage = useCallback((content: string, isComplete: boolean) => {
    setChatMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
        // Update the streaming message
        return prev.map((msg, idx) => 
          idx === prev.length - 1 
            ? { ...msg, content, isStreaming: !isComplete }
            : msg
        );
      } else {
        // Create new streaming message
        return [...prev, {
          id: `msg-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content,
          timestamp: new Date(),
          isStreaming: !isComplete
        }];
      }
    });
  }, []);

  const toggleFullScreen = () => {
    setShowChat(false);
    setShowLeftPanel(false);
    setShowBottomPanel(false);
  };

  const restorePanels = () => {
    setShowChat(true);
    setShowLeftPanel(true);
    setShowBottomPanel(true);
  };

  return (
    <div ref={layoutRef} className="vscode-layout" style={{ fontSize: `${fontSize}px`, fontFamily }}>
      {/* Top Menu Bar */}
      <div className="menu-bar">
        <div className="menu-title">
          <img src="/darpan-uno-logo.svg" alt="Darpan Uno" className="app-logo" />
          <span className="app-name">Darpan Uno</span>
          {isDeveloperMode && (
            <span className="developer-badge">
              � Developed by Dayanand Darpan
            </span>
          )}
        </div>

        {/* Arduino IDE Menu */}
        <div className="arduino-menu">
          <div className="menu-dropdown">
            <button 
              className={`menu-btn ${activeDropdown === 'tools' ? 'active' : ''}`}
              onClick={() => toggleDropdown('tools')}
              title="Tools Menu"
            >
              🔧 Tools
            </button>
            <div className={`dropdown-content ${activeDropdown === 'tools' ? 'show' : ''}`}>
              <button onClick={() => { setShowBoardManager(true); closeDropdowns(); }}>
                <span className="menu-icon">🎯</span>
                Board Manager
              </button>
              <button onClick={() => { setShowLibraryManager(true); closeDropdowns(); }}>
                <span className="menu-icon">📚</span>
                Library Manager
              </button>
              <button onClick={() => { setShowSerialPlotter(true); closeDropdowns(); }}>
                <span className="menu-icon">📈</span>
                Serial Plotter
              </button>
              <div className="menu-separator"></div>
              <button onClick={() => { setShowDeveloperOptions(true); closeDropdowns(); }}>
                <span className="menu-icon">🛠️</span>
                Developer Options
              </button>
              <div className="menu-separator"></div>
              <button onClick={() => { setShowPreferences(true); closeDropdowns(); }}>
                <span className="menu-icon">⚙️</span>
                Preferences
              </button>
            </div>
          </div>

          <div className="menu-dropdown">
            <button 
              className={`menu-btn ${activeDropdown === 'file' ? 'active' : ''}`}
              onClick={() => toggleDropdown('file')}
              title="File Menu"
            >
              📁 File
            </button>
            <div className={`dropdown-content ${activeDropdown === 'file' ? 'show' : ''}`}>
              <button onClick={() => { setShowExamplesBrowser(true); closeDropdowns(); }}>
                <span className="menu-icon">📖</span>
                Examples
              </button>
              <button onClick={() => { setShowSketchBookManager(true); closeDropdowns(); }}>
                <span className="menu-icon">📝</span>
                Sketchbook
              </button>
              <div className="menu-separator"></div>
              <button onClick={() => { alert('New sketch functionality'); closeDropdowns(); }}>
                <span className="menu-icon">📄</span>
                New Sketch
              </button>
              <button onClick={() => { alert('Open sketch functionality'); closeDropdowns(); }}>
                <span className="menu-icon">📂</span>
                Open Sketch
              </button>
            </div>
          </div>

          <div className="menu-dropdown">
            <button 
              className={`menu-btn ${activeDropdown === 'view' ? 'active' : ''}`}
              onClick={() => toggleDropdown('view')}
              title="View Menu"
            >
              👁️ View
            </button>
            <div className={`dropdown-content ${activeDropdown === 'view' ? 'show' : ''}`}>
              <button onClick={() => { setShowOutputConsole(true); closeDropdowns(); }}>
                <span className="menu-icon">🖥️</span>
                Output Console
              </button>
              <button onClick={() => { setShowSerialPlotter(true); closeDropdowns(); }}>
                <span className="menu-icon">📊</span>
                Serial Plotter
              </button>
              <div className="menu-separator"></div>
              <button onClick={() => { setShowLeftPanel(!showLeftPanel); closeDropdowns(); }}>
                <span className="menu-icon">📁</span>
                {showLeftPanel ? 'Hide' : 'Show'} Explorer
              </button>
              <button onClick={() => { setShowChat(!showChat); closeDropdowns(); }}>
                <span className="menu-icon">🤖</span>
                {showChat ? 'Hide' : 'Show'} AI Chat
              </button>
            </div>
          </div>

          <div className="menu-dropdown">
            <button 
              className={`menu-btn ${activeDropdown === 'help' ? 'active' : ''}`}
              onClick={() => toggleDropdown('help')}
              title="Help Menu"
            >
              ❓ Help
            </button>
            <div className={`dropdown-content ${activeDropdown === 'help' ? 'show' : ''}`}>
              <button onClick={() => { setShowDeveloperProfile(true); closeDropdowns(); }}>
                <span className="menu-icon">👨‍💻</span>
                About Developer
              </button>
              <button onClick={() => { setShowVersionInfo(true); closeDropdowns(); }}>
                <span className="menu-icon">📋</span>
                About & Version Info
              </button>
              <button onClick={() => { window.open('https://docs.arduino.cc/', '_blank'); closeDropdowns(); }}>
                <span className="menu-icon">📖</span>
                Arduino Documentation
              </button>
              <button onClick={() => { window.open('https://forum.arduino.cc/', '_blank'); closeDropdowns(); }}>
                <span className="menu-icon">💬</span>
                Community Forum
              </button>
              <div className="menu-separator"></div>
              <button onClick={() => { setShowDeveloperOptions(true); closeDropdowns(); }}>
                <span className="menu-icon">🛠️</span>
                Developer Tools
              </button>
            </div>
          </div>
        </div>

        <div className="menu-center">
          <div className="workspace-info">
            <span className="workspace-name">Darpan Uno - Advanced Arduino IDE</span>
            {currentFile && (
              <span className="workspace-file">• Editing</span>
            )}
          </div>
        </div>
        <div className="menu-actions">
          <div className="hardware-controls">
            <select 
              value={selectedBoard} 
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="board-select"
              title="Select Arduino Board"
            >
              <option value="arduino:avr:uno">Arduino Uno</option>
              <option value="arduino:avr:mega">Arduino Mega 2560</option>
              <option value="arduino:avr:nano">Arduino Nano</option>
              <option value="esp32:esp32:esp32">ESP32 Dev Module</option>
              <option value="esp8266:esp8266:nodemcuv2">NodeMCU 1.0</option>
            </select>
            <select 
              value={selectedPort} 
              onChange={(e) => setSelectedPort(e.target.value)}
              className="port-select"
              title="Select Port"
            >
              <option value="COM3">COM3</option>
              <option value="COM4">COM4</option>
              <option value="COM5">COM5</option>
              <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
              <option value="/dev/ttyACM0">/dev/ttyACM0</option>
            </select>
          </div>
          <div className="action-controls">
            <button onClick={handleCompile} className="action-btn compile-btn" title="Verify/Compile (Ctrl+Shift+B)">
              ✓ Verify
            </button>
            <button onClick={handleUpload} className="action-btn upload-btn" title="Upload to Board">
              ⬆️ Upload
            </button>
            <button 
              onClick={handleSerialConnect} 
              className={`action-btn serial-btn ${isConnected ? 'connected' : ''}`}
              title={isConnected ? 'Disconnect Serial Monitor' : 'Connect Serial Monitor'}
            >
              {isConnected ? '� Connected' : '� Monitor'}
            </button>
          </div>
          <div className="view-controls">
            <button 
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className={`view-btn ${showLeftPanel ? 'active' : ''}`}
              title="Toggle Explorer (Ctrl+B)"
            >
              📁
            </button>
            <button 
              onClick={() => setShowBottomPanel(!showBottomPanel)}
              className={`view-btn ${showBottomPanel ? 'active' : ''}`}
              title="Toggle Terminal (Ctrl+J)"
            >
              📟
            </button>
            <button 
              onClick={toggleFullScreen}
              className="view-btn"
              title="Focus Mode (Hide All Panels)"
            >
              🔍
            </button>
            <button 
              onClick={restorePanels}
              className="view-btn"
              title="Restore All Panels"
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Panel - Project Explorer */}
        {showLeftPanel && (
          <>
            <div 
              className="left-panel" 
              style={{ width: leftPanelWidth }}
            >
              <div className="panel-header">
                <span className="panel-title">📁 Explorer</span>
                <div className="panel-controls">
                  <button className="panel-control-btn" title="New File">+</button>
                  <button className="panel-control-btn" title="Refresh">↻</button>
                  <button 
                    className="panel-close-btn"
                    onClick={() => setShowLeftPanel(false)}
                    title="Hide Explorer"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="panel-content">
                <EnhancedProjectExplorer 
                  onFileSelect={handleFileSelect}
                  currentFile={currentFile}
                />
              </div>
            </div>

            {/* Left Resizer */}
            <div 
              className="resizer vertical-resizer"
              onMouseDown={() => setIsResizing('left')}
            />
          </>
        )}

        {/* Center Content */}
        <div className="center-content">
          {/* Editor Area */}
          <div className="editor-area">
            <div className="editor-tabs">
              <div className="tab-bar">
                <div className={`editor-tab ${currentFile ? 'active' : ''}`}>
                  <span className="tab-icon">📄</span>
                  <span className="tab-name">
                    {currentFile ? currentFile.split('/').pop() || 'Untitled' : 'Welcome.ino'}
                  </span>
                  {currentFile && <span className="tab-close" title="Close">×</span>}
                </div>
                <div className="tab-actions">
                  <button className="tab-action-btn" title="Split Editor Right">⫸</button>
                  <button className="tab-action-btn" title="Split Editor Down">⫷</button>
                </div>
              </div>
            </div>
            <div className="editor-container">
              <SimpleEditor 
                filePath={currentFile}
                language="cpp"
                onCodeChange={(code) => {
                  setEditorCode(code);
                  handleCodeGenerated(code);
                }}
                fontSize={fontSize}
                fontFamily={fontFamily}
                code={editorCode}
                onInsertCode={handleInsertCode}
              />
            </div>
          </div>

          {/* Bottom Panel */}
          {showBottomPanel && (
            <>
              <div 
                className="resizer horizontal-resizer"
                onMouseDown={() => setIsResizing('bottom')}
              />
              <div 
                className="bottom-panel" 
                style={{ height: bottomPanelHeight }}
              >
                <div className="panel-header">
                  <div className="panel-tabs">
                    <div 
                      className={`panel-tab ${activeBottomTab === 'serial' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('serial')}
                    >
                      <span className="tab-icon">📟</span>
                      <span>Serial Monitor</span>
                    </div>
                    <div 
                      className={`panel-tab ${activeBottomTab === 'plotter' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('plotter')}
                    >
                      <span className="tab-icon">📈</span>
                      <span>Serial Plotter</span>
                    </div>
                    <div 
                      className={`panel-tab ${activeBottomTab === 'problems' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('problems')}
                    >
                      <span className="tab-icon">⚠️</span>
                      <span>Problems</span>
                    </div>
                    <div 
                      className={`panel-tab ${activeBottomTab === 'output' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('output')}
                    >
                      <span className="tab-icon">📊</span>
                      <span>Output</span>
                    </div>
                    <div 
                      className={`panel-tab ${activeBottomTab === 'console' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('console')}
                    >
                      <span className="tab-icon">🖥️</span>
                      <span>Console</span>
                    </div>
                    <div 
                      className={`panel-tab ${activeBottomTab === 'terminal' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('terminal')}
                    >
                      <span className="tab-icon">💻</span>
                      <span>Terminal</span>
                    </div>
                  </div>
                  <div className="panel-controls">
                    <button className="panel-control-btn" title="Clear">🗑️</button>
                    <button className="panel-control-btn" title="Maximize">⬜</button>
                    <button 
                      className="panel-close-btn"
                      onClick={() => setShowBottomPanel(false)}
                      title="Hide Panel"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="panel-content">
                  {activeBottomTab === 'serial' && (
                    <SerialPanel 
                      isConnected={isConnected}
                      selectedPort={selectedPort}
                    />
                  )}
                  {activeBottomTab === 'plotter' && (
                    <div className="embedded-plotter">
                      <SerialPlotter 
                        isOpen={true}
                        onClose={() => setActiveBottomTab('serial')}
                      />
                    </div>
                  )}
                  {activeBottomTab === 'problems' && (
                    <div className="problems-panel">
                      <div className="panel-message">No problems detected</div>
                    </div>
                  )}
                  {activeBottomTab === 'output' && (
                    <div className="output-panel">
                      <div className="output-content">Compilation output will appear here...</div>
                    </div>
                  )}
                  {activeBottomTab === 'console' && (
                    <div className="embedded-console">
                      <OutputConsole 
                        isVisible={true}
                        onToggle={() => setActiveBottomTab('output')}
                      />
                    </div>
                  )}
                  {activeBottomTab === 'terminal' && (
                    <div className="terminal-panel">
                      <div className="terminal-content">Terminal ready...</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - AI Chat */}
        {showChat && (
          <>
            <div 
              className="resizer vertical-resizer"
              onMouseDown={() => setIsResizing('right')}
            />
            <div 
              className="right-panel" 
              style={{ width: rightPanelWidth }}
            >
              <div className="panel-header">
                <span className="panel-title">🤖 AI</span>
                <div className="panel-controls">
                  <button 
                    className="panel-control-btn"
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Maximize" : "Minimize"}
                  >
                    {isMinimized ? '📖' : '📝'}
                  </button>
                  <button 
                    className="panel-close-btn"
                    onClick={() => setShowChat(false)}
                    title="Close AI Assistant"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={`panel-content ${isMinimized ? 'minimized' : ''}`}>
                <EnhancedChat 
                  onCodeGenerated={handleCodeGenerated}
                  isDeveloperMode={true}
                  developerName={process.env.DEVELOPER_NAME || 'Arduino Developer'}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar 
        isConnected={isConnected}
        selectedBoard={selectedBoard}
        selectedPort={selectedPort}
        currentFile={currentFile}
      />

      {/* Darpan Uno AI Tools Bar */}
      <div className="ai-tools-bar">
        <div className="ai-agent-info">
          <span className="ai-status">🚀 Darpan Uno AI Online</span>
          <span className="model-indicator">Model: {selectedModel || 'Gemini'}</span>
          <span className="developer-info">by Dayanand Darpan</span>
        </div>
        <div className="quick-actions">
          <button className="tool-btn" title="Generate Arduino Code">
            📝 Generate Code
          </button>
          <button className="tool-btn" title="Debug & Fix Errors">
            🔧 Debug
          </button>
          <button className="tool-btn" title="Explain Code">
            💡 Explain
          </button>
          <button className="tool-btn" title="Optimize Code">
            ⚡ Optimize
          </button>
          <button className="tool-btn" title="Hardware Help">
            🔌 Hardware
          </button>
        </div>
      </div>

      {/* Simplified Floating Actions */}
      <div className="floating-actions">
        {!showChat && (
          <button 
            className="floating-btn chat-btn"
            onClick={() => { setShowChat(true); setIsMinimized(false); }}
            title="Open AI Assistant"
          >
            🤖
          </button>
        )}
      </div>

      {/* Arduino IDE Manager Modals */}
      <BoardManager 
        isOpen={showBoardManager}
        onClose={() => setShowBoardManager(false)}
      />

      <LibraryManager 
        isOpen={showLibraryManager}
        onClose={() => setShowLibraryManager(false)}
      />

      <SerialPlotter 
        isOpen={showSerialPlotter}
        onClose={() => setShowSerialPlotter(false)}
      />

      <Preferences 
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />

      <ExamplesBrowser 
        isOpen={showExamplesBrowser}
        onClose={() => setShowExamplesBrowser(false)}
        onOpenExample={handleOpenExample}
      />

      <SketchBookManager 
        isOpen={showSketchBookManager}
        onClose={() => setShowSketchBookManager(false)}
        onOpenSketch={handleOpenSketch}
      />

      {showOutputConsole && (
        <div className="modal-overlay">
          <OutputConsole 
            isVisible={showOutputConsole}
            onToggle={() => setShowOutputConsole(!showOutputConsole)}
            onClose={() => setShowOutputConsole(false)}
          />
        </div>
      )}

      <VersionInfo 
        isOpen={showVersionInfo}
        onClose={() => setShowVersionInfo(false)}
      />

      <DeveloperOptions 
        isOpen={showDeveloperOptions}
        onClose={() => setShowDeveloperOptions(false)}
      />

      <DeveloperProfile 
        isVisible={showDeveloperProfile}
        onClose={() => setShowDeveloperProfile(false)}
      />
    </div>
  );
};
