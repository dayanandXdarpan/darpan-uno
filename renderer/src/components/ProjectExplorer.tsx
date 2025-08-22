import React, { useState, useEffect } from 'react';
import { Board, Port, ProjectTemplate } from '../types/electron';
import './ProjectExplorer.css';

interface ProjectExplorerProps {
  onFileSelect: (filePath: string) => void;
  currentFile: string;
  onBoardChange: (board: string) => void;
  onPortChange: (port: string) => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  expanded?: boolean;
}

interface FeatureLimitModal {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  onFileSelect,
  currentFile,
  onBoardChange,
  onPortChange
}) => {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'boards' | 'templates'>('files');
  const [currentProjectPath, setCurrentProjectPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState<FeatureLimitModal>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // Load initial data
  useEffect(() => {
    loadBoards();
    loadPorts();
    loadTemplates();
    
    // Load current directory if available
    const loadInitialFiles = async () => {
      try {
        // Try to get the current working directory from Electron
        // For now, we'll use a placeholder
        console.log('Loading initial file tree...');
      } catch (error) {
        console.error('Failed to load initial files:', error);
      }
    };

    loadInitialFiles();
  }, []);

  const loadBoards = async () => {
    try {
      if (window.electronAPI?.arduino?.getBoardList) {
        const boardList = await window.electronAPI.arduino.getBoardList();
        setBoards(boardList);
      } else {
        // Web mode fallback - provide common Arduino boards
        const fallbackBoards: Board[] = [
          { fqbn: 'arduino:avr:uno', name: 'Arduino Uno', platform: 'arduino:avr', architecture: 'avr' },
          { fqbn: 'arduino:avr:mega', name: 'Arduino Mega 2560', platform: 'arduino:avr', architecture: 'avr' },
          { fqbn: 'arduino:avr:nano', name: 'Arduino Nano', platform: 'arduino:avr', architecture: 'avr' },
          { fqbn: 'esp32:esp32:esp32', name: 'ESP32 Dev Module', platform: 'esp32:esp32', architecture: 'esp32' },
          { fqbn: 'esp8266:esp8266:nodemcuv2', name: 'NodeMCU 1.0 (ESP-12E Module)', platform: 'esp8266:esp8266', architecture: 'esp8266' }
        ];
        setBoards(fallbackBoards);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      // Fallback boards even on error
      const errorFallbackBoards: Board[] = [
        { fqbn: 'arduino:avr:uno', name: 'Arduino Uno', platform: 'arduino:avr', architecture: 'avr' },
        { fqbn: 'arduino:avr:mega', name: 'Arduino Mega 2560', platform: 'arduino:avr', architecture: 'avr' }
      ];
      setBoards(errorFallbackBoards);
    }
  };

  const loadPorts = async () => {
    try {
      // Since getPortList does not exist, use fallback ports for now
      const fallbackPorts: Port[] = [
        { path: 'COM3', label: 'Arduino Uno (COM3)', protocol: 'serial' },
        { path: 'COM4', label: 'Arduino Mega (COM4)', protocol: 'serial' },
        { path: '/dev/ttyUSB0', label: 'Arduino (USB0)', protocol: 'serial' },
        { path: '/dev/ttyACM0', label: 'Arduino (ACM0)', protocol: 'serial' }
      ];
      setPorts(fallbackPorts);
    } catch (error) {
      console.error('Failed to load ports:', error);
      setPorts([]);
    }
  };

  const loadTemplates = async () => {
    try {
      // For now, use web mode fallback since templates are not implemented in electron yet
      const fallbackTemplates: ProjectTemplate[] = [
        { 
          name: 'Basic Sketch', 
          description: 'Empty Arduino sketch with setup() and loop() functions',
          files: {
            'sketch.ino': `void setup() {\n  // put your setup code here, to run once:\n  \n}\n\nvoid loop() {\n  // put your main code here, to run repeatedly:\n  \n}\n`
          }
        },
        { 
          name: 'LED Blink', 
          description: 'Simple LED blinking example for beginners',
          files: {
            'led_blink.ino': `// LED Blink Example\nconst int ledPin = 13;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay(1000);\n  digitalWrite(ledPin, LOW);\n  delay(1000);\n}\n`
          }
        },
        { 
          name: 'Sensor Reading', 
          description: 'Template for reading analog and digital sensors',
          files: {
            'sensor_reading.ino': `// Sensor Reading Example\nconst int sensorPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int sensorValue = analogRead(sensorPin);\n  Serial.print("Sensor value: ");\n  Serial.println(sensorValue);\n  delay(500);\n}\n`
          }
        },
        { 
          name: 'Serial Communication', 
          description: 'Basic serial communication template',
          files: {
            'serial_comm.ino': `// Serial Communication Example\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Arduino Ready!");\n}\n\nvoid loop() {\n  if (Serial.available()) {\n    String input = Serial.readString();\n    Serial.print("You sent: ");\n    Serial.println(input);\n  }\n}\n`
          }
        },
        { 
          name: 'WiFi IoT', 
          description: 'Template for ESP32/ESP8266 WiFi projects',
          files: {
            'wifi_iot.ino': `// WiFi IoT Example\n#include <WiFi.h>\n\nconst char* ssid = "YourWiFiName";\nconst char* password = "YourWiFiPassword";\n\nvoid setup() {\n  Serial.begin(115200);\n  WiFi.begin(ssid, password);\n  \n  while (WiFi.status() != WL_CONNECTED) {\n    delay(1000);\n    Serial.println("Connecting to WiFi...");\n  }\n  \n  Serial.println("WiFi connected!");\n  Serial.print("IP address: ");\n  Serial.println(WiFi.localIP());\n}\n\nvoid loop() {\n  // Your IoT code here\n  delay(1000);\n}\n`
          }
        }
      ];
      setTemplates(fallbackTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      const errorFallbackTemplate: ProjectTemplate[] = [
        { 
          name: 'Basic Sketch', 
          description: 'Empty Arduino sketch',
          files: {
            'sketch.ino': `void setup() {\n  \n}\n\nvoid loop() {\n  \n}\n`
          }
        }
      ];
      setTemplates(errorFallbackTemplate);
    }
  };

  const showFeatureLimitModal = (title: string, message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    setIsAnimating(true);
    setShowModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeModal = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setShowModal({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
      });
    }, 300);
  };

  const openProject = async () => {
    try {
      if (window.electronAPI?.file?.showOpenDialog) {
        const result = await window.electronAPI.file.showOpenDialog({ properties: ['openDirectory'] });
        if (result && result.length > 0) {
          const projectPath = result[0];
          setCurrentProjectPath(projectPath);
          await loadFileTree(projectPath);
        }
      } else {
        // Web mode fallback - show beautiful modal instead of ugly alert
        showFeatureLimitModal(
          '🌐 Web Mode Limitation',
          'File system access requires the desktop app. In web mode, you can still use templates and example code to get started!',
          'info'
        );
      }
    } catch (error) {
      console.error('Failed to open project:', error);
      showFeatureLimitModal(
        '❌ Access Error',
        'Failed to open project. Please try again or use the desktop app for full file system access.',
        'error'
      );
    }
  };

  const createNewProject = async (templateName: string) => {
    try {
      setIsLoading(true);
      
      if (window.electronAPI?.file?.showSaveDialog && window.electronAPI?.project?.create) {
        const result = await window.electronAPI.file.showSaveDialog({
          title: 'Create New Arduino Project',
          defaultPath: `Arduino_${templateName}_${Date.now()}`
        });

        if (result) {
          const projectName = result.split(/[\\/]/).pop() || 'NewProject';
          const projectPath = await window.electronAPI.project.create(projectName, templateName, result);
          setCurrentProjectPath(projectPath);
          await loadFileTree(projectPath);
          setActiveTab('files');
        }
      } else {
        // Web mode fallback - show template code
        const template = templates.find(t => t.name === templateName);
        if (template && template.files) {
          const fileName = Object.keys(template.files)[0];
          const fileContent = template.files[fileName];
          
          // Create a temporary project display
          const tempProject = {
            name: fileName,
            path: `web-template-${Date.now()}`,
            isDirectory: false
          };
          
          setCurrentProjectPath(`Web Template: ${templateName}`);
          setFileTree([tempProject]);
          setActiveTab('files');
          
          // Call onFileSelect with the template content
          console.log('Template content for', templateName, ':', fileContent);
          alert(`Template "${templateName}" is ready! The code will be shown in the editor.`);
          // Actually call the onFileSelect with some demo content
          onFileSelect(tempProject.path);
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. In web mode, templates are available for viewing code examples.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileTree = async (path: string) => {
    try {
      // For now, create a simple placeholder file tree since file system access requires electron
      const placeholderTree: FileTreeNode[] = [
        {
          name: 'main.ino',
          path: `${path}/main.ino`,
          isDirectory: false
        },
        {
          name: 'libraries',
          path: `${path}/libraries`,
          isDirectory: true,
          expanded: false,
          children: [
            {
              name: 'README.md',
              path: `${path}/libraries/README.md`,
              isDirectory: false
            }
          ]
        }
      ];
      setFileTree(placeholderTree);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setFileTree([]);
    }
  };

  const toggleNode = async (node: FileTreeNode) => {
    if (!node.isDirectory) {
      onFileSelect(node.path);
      return;
    }

    const updateTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(n => {
        if (n.path === node.path) {
          return { ...n, expanded: !n.expanded };
        }
        if (n.children) {
          return { ...n, children: updateTree(n.children) };
        }
        return n;
      });
    };

    setFileTree(updateTree(fileTree));
  };

  const createNewFile = async () => {
    if (!currentProjectPath) {
      alert('Please open a project first');
      return;
    }

    const fileName = prompt('Enter file name (e.g., mysketch.ino):');
    if (!fileName) return;

    try {
      const filePath = `${currentProjectPath}/${fileName}`;
      const initialContent = fileName.endsWith('.ino') 
        ? `void setup() {\n  // put your setup code here, to run once:\n  \n}\n\nvoid loop() {\n  // put your main code here, to run repeatedly:\n  \n}\n`
        : '';
      
      // For web mode, simulate file creation
      const newFile: FileTreeNode = {
        name: fileName,
        path: filePath,
        isDirectory: false
      };
      setFileTree(prev => [...prev, newFile]);
      
      // For web mode, we can't actually write files, but we can show the content
      console.log('New file content:', initialContent);
      alert(`File "${fileName}" created! Content will be shown in the editor.`);
      onFileSelect(filePath);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file. In web mode, file creation is simulated for demonstration.');
    }
  };

  const refreshPorts = async () => {
    await loadPorts();
  };

  const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path} className="tree-node" style={{ marginLeft: depth * 16 }}>
        <div 
          className={`tree-item ${node.path === currentFile ? 'selected' : ''} ${node.isDirectory ? 'directory' : 'file'}`}
          onClick={() => toggleNode(node)}
        >
          <span className="tree-icon">
            {node.isDirectory 
              ? (node.expanded ? '📂' : '📁')
              : getFileIcon(node.name)
            }
          </span>
          <span className="tree-label">{node.name}</span>
        </div>
        {node.isDirectory && node.expanded && node.children && (
          <div className="tree-children">
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ino': return '🔧';
      case 'cpp': case 'c': return '⚙️';
      case 'h': return '📋';
      case 'json': return '📄';
      case 'md': return '📝';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  return (
    <div className="project-explorer">
      <div className="explorer-header">
        <div className="explorer-tabs">
          <button 
            className={`explorer-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📁 Files
          </button>
          <button 
            className={`explorer-tab ${activeTab === 'boards' ? 'active' : ''}`}
            onClick={() => setActiveTab('boards')}
          >
            🔧 Boards
          </button>
          <button 
            className={`explorer-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            📋 Templates
          </button>
        </div>
      </div>

      <div className="explorer-content">
        {activeTab === 'files' && (
          <div className="files-tab">
            <div className="tab-header">
              <button onClick={openProject} className="action-button primary">
                📁 Open Project
              </button>
              <button 
                onClick={createNewFile} 
                className="action-button secondary"
                disabled={!currentProjectPath}
              >
                ➕ New File
              </button>
            </div>

            {currentProjectPath && (
              <div className="current-project">
                <div className="project-path" title={currentProjectPath}>
                  📂 {currentProjectPath.split(/[\\/]/).pop()}
                </div>
              </div>
            )}

            <div className="file-tree">
              {fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="empty-state">
                  <p>No project opened</p>
                  <p>Open a project or create a new one to get started</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'boards' && (
          <div className="boards-tab">
            <div className="tab-header">
              <h3>Arduino Boards</h3>
              <button onClick={loadBoards} className="action-button secondary small">
                🔄 Refresh
              </button>
            </div>

            <div className="boards-list">
              {boards.map(board => (
                <div 
                  key={board.fqbn} 
                  className="board-item"
                  onClick={() => onBoardChange(board.fqbn)}
                >
                  <div className="board-name">{board.name}</div>
                  <div className="board-fqbn">{board.fqbn}</div>
                </div>
              ))}
            </div>

            <div className="tab-header">
              <h3>Serial Ports</h3>
              <button onClick={refreshPorts} className="action-button secondary small">
                🔄 Refresh
              </button>
            </div>

            <div className="ports-list">
              {ports.map(port => (
                <div 
                  key={port.path} 
                  className="port-item"
                  onClick={() => onPortChange(port.path)}
                >
                  <div className="port-path">{port.path}</div>
                  {port.label && <div className="port-label">{port.label}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="templates-tab">
            <div className="tab-header">
              <h3>Project Templates</h3>
            </div>

            <div className="templates-list">
              {templates.map(template => (
                <div key={template.name} className="template-item">
                  <div className="template-header">
                    <div className="template-name">{template.name}</div>
                    <button 
                      onClick={() => createNewProject(template.name)}
                      className="action-button primary small"
                      disabled={isLoading}
                    >
                      {isLoading ? '⏳' : '➕'} Create
                    </button>
                  </div>
                  <div className="template-description">{template.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Beautiful macOS-like Modal */}
      {showModal.isOpen && (
        <div className={`modal-overlay opening ${isAnimating ? 'animate-in' : 'animate-out'}`}>
          <div className={`modal-container app-opening ${showModal.type}`}>
            <div className="modal-header">
              <div className="modal-icon bounce-icon">
                {showModal.type === 'info' && '💡'}
                {showModal.type === 'warning' && '⚠️'}
                {showModal.type === 'error' && '❌'}
              </div>
              <h3 className="modal-title">{showModal.title}</h3>
            </div>
            <div className="modal-body">
              <p className="modal-message">{showModal.message}</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn primary glow-button"
                onClick={closeModal}
              >
                Got it! 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
