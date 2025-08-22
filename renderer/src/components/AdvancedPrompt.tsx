import React, { useState, useRef, useEffect } from 'react';
import './AdvancedPrompt.css';

interface BoardConnection {
  pin: string;
  type: 'digital' | 'analog' | 'power' | 'ground';
  component: string;
  value?: string;
}

interface PromptData {
  boardId: string;
  connections: BoardConnection[];
  projectType: string;
  requirements: string;
  additionalInputs: Record<string, string>;
}

interface AdvancedPromptProps {
  onPromptGenerated: (prompt: string, data: PromptData) => void;
  onCodeImplement: (code: string, filename: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

const BOARD_TYPES = [
  { id: 'uno', name: 'Arduino Uno', pins: 14 },
  { id: 'nano', name: 'Arduino Nano', pins: 14 },
  { id: 'mega', name: 'Arduino Mega', pins: 54 },
  { id: 'esp32', name: 'ESP32', pins: 30 },
  { id: 'esp8266', name: 'ESP8266', pins: 17 },
  { id: 'leonardo', name: 'Arduino Leonardo', pins: 20 }
];

const PROJECT_TYPES = [
  'LED Control',
  'Sensor Reading',
  'Motor Control',
  'IoT Project',
  'Communication',
  'Display Control',
  'Data Logging',
  'Automation',
  'Custom Project'
];

const COMPONENT_TYPES = [
  'LED',
  'Button',
  'Sensor (Temperature)',
  'Sensor (Humidity)',
  'Sensor (Distance)',
  'Servo Motor',
  'DC Motor',
  'Stepper Motor',
  'LCD Display',
  'OLED Display',
  'Buzzer',
  'Relay',
  'Potentiometer',
  'Photoresistor',
  'WiFi Module',
  'Bluetooth Module',
  'Custom Component'
];

export const AdvancedPrompt: React.FC<AdvancedPromptProps> = ({
  onPromptGenerated,
  onCodeImplement,
  isVisible,
  onClose
}) => {
  const [promptData, setPromptData] = useState<PromptData>({
    boardId: 'uno',
    connections: [],
    projectType: 'LED Control',
    requirements: '',
    additionalInputs: {}
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [newConnection, setNewConnection] = useState<BoardConnection>({
    pin: '2',
    type: 'digital',
    component: 'LED',
    value: ''
  });

  const requirementsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isVisible && requirementsRef.current) {
      requirementsRef.current.focus();
    }
  }, [isVisible]);

  const addConnection = () => {
    setPromptData(prev => ({
      ...prev,
      connections: [...prev.connections, { ...newConnection }]
    }));
    setNewConnection({
      pin: '2',
      type: 'digital',
      component: 'LED',
      value: ''
    });
    setShowConnectionModal(false);
  };

  const removeConnection = (index: number) => {
    setPromptData(prev => ({
      ...prev,
      connections: prev.connections.filter((_, i) => i !== index)
    }));
  };

  const generateAdvancedPrompt = async () => {
    setIsGenerating(true);
    
    try {
      const selectedBoard = BOARD_TYPES.find(b => b.id === promptData.boardId);
      
      // Build connection details
      const connectionDetails = promptData.connections.map(conn => 
        `Pin ${conn.pin} (${conn.type}): ${conn.component}${conn.value ? ` (${conn.value})` : ''}`
      ).join('\n');

      // Build additional inputs
      const additionalDetails = Object.entries(promptData.additionalInputs)
        .filter(([_, value]) => value.trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      // Generate comprehensive prompt
      const prompt = `
🔧 ARDUINO PROJECT GENERATOR
Board: ${selectedBoard?.name || promptData.boardId}
Project Type: ${promptData.projectType}

📍 HARDWARE CONNECTIONS:
${connectionDetails || 'No connections specified'}

📋 PROJECT REQUIREMENTS:
${promptData.requirements || 'No specific requirements'}

${additionalDetails ? `📝 ADDITIONAL DETAILS:\n${additionalDetails}` : ''}

🎯 INSTRUCTIONS:
Generate complete Arduino code that:
1. Initializes all hardware components correctly
2. Implements the specified functionality
3. Includes proper pin definitions and setup
4. Handles edge cases and error conditions
5. Uses appropriate libraries and includes
6. Follows Arduino coding best practices
7. Includes detailed comments explaining the code

📁 OUTPUT FORMAT:
- Provide main .ino file code
- Include any necessary library declarations
- Add pin configuration comments
- Suggest circuit diagram if complex

🚀 AUTO-IMPLEMENTATION:
After generating the code, automatically implement it in the project files with proper structure and organization.
      `.trim();

      onPromptGenerated(prompt, promptData);
      
      // Simulate LLM processing and code generation
      setTimeout(() => {
        const generatedCode = generateArduinoCode(promptData);
        const filename = `${promptData.projectType.toLowerCase().replace(/\s+/g, '_')}_project.ino`;
        onCodeImplement(generatedCode, filename);
        setIsGenerating(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error generating prompt:', error);
      setIsGenerating(false);
    }
  };

  const generateArduinoCode = (data: PromptData): string => {
    const selectedBoard = BOARD_TYPES.find(b => b.id === data.boardId);
    const timestamp = new Date().toISOString().split('T')[0];
    
    let code = `/*
 * ${data.projectType} - Auto-Generated Arduino Code
 * Board: ${selectedBoard?.name || data.boardId}
 * Generated: ${timestamp}
 * 
 * Hardware Connections:
`;

    // Add connection comments
    data.connections.forEach(conn => {
      code += ` * Pin ${conn.pin} -> ${conn.component}${conn.value ? ` (${conn.value})` : ''}\n`;
    });

    code += ` */\n\n`;

    // Add pin definitions
    data.connections.forEach(conn => {
      const pinName = conn.component.toUpperCase().replace(/\s+/g, '_');
      code += `#define ${pinName}_PIN ${conn.pin}\n`;
    });

    code += `\nvoid setup() {\n`;
    code += `  Serial.begin(9600);\n`;
    code += `  Serial.println("${data.projectType} - Starting...");\n\n`;

    // Add pin modes
    data.connections.forEach(conn => {
      const pinName = conn.component.toUpperCase().replace(/\s+/g, '_');
      if (conn.type === 'digital') {
        if (conn.component.toLowerCase().includes('led') || conn.component.toLowerCase().includes('relay')) {
          code += `  pinMode(${pinName}_PIN, OUTPUT);\n`;
        } else if (conn.component.toLowerCase().includes('button')) {
          code += `  pinMode(${pinName}_PIN, INPUT_PULLUP);\n`;
        } else {
          code += `  pinMode(${pinName}_PIN, INPUT);\n`;
        }
      }
    });

    code += `}\n\nvoid loop() {\n`;

    // Add basic functionality based on project type
    switch (data.projectType) {
      case 'LED Control':
        code += `  // LED Control Logic\n`;
        data.connections.forEach(conn => {
          if (conn.component.toLowerCase().includes('led')) {
            const pinName = conn.component.toUpperCase().replace(/\s+/g, '_');
            code += `  digitalWrite(${pinName}_PIN, HIGH);\n`;
            code += `  delay(1000);\n`;
            code += `  digitalWrite(${pinName}_PIN, LOW);\n`;
            code += `  delay(1000);\n`;
          }
        });
        break;
        
      case 'Sensor Reading':
        code += `  // Sensor Reading Logic\n`;
        data.connections.forEach(conn => {
          if (conn.component.toLowerCase().includes('sensor')) {
            const pinName = conn.component.toUpperCase().replace(/\s+/g, '_');
            if (conn.type === 'analog') {
              code += `  int ${pinName.toLowerCase()}Value = analogRead(${pinName}_PIN);\n`;
              code += `  Serial.print("${conn.component}: ");\n`;
              code += `  Serial.println(${pinName.toLowerCase()}Value);\n`;
            } else {
              code += `  int ${pinName.toLowerCase()}Value = digitalRead(${pinName}_PIN);\n`;
              code += `  Serial.print("${conn.component}: ");\n`;
              code += `  Serial.println(${pinName.toLowerCase()}Value);\n`;
            }
          }
        });
        code += `  delay(1000);\n`;
        break;
        
      default:
        code += `  // Custom Project Logic\n`;
        code += `  // Add your specific implementation here\n`;
        code += `  delay(100);\n`;
    }

    code += `}\n`;

    // Add helper functions if needed
    if (data.projectType === 'Motor Control') {
      code += `\n// Motor Control Functions\n`;
      code += `void moveForward() {\n`;
      code += `  // Implement motor forward movement\n`;
      code += `}\n\n`;
      code += `void moveBackward() {\n`;
      code += `  // Implement motor backward movement\n`;
      code += `}\n\n`;
      code += `void stopMotor() {\n`;
      code += `  // Implement motor stop\n`;
      code += `}\n`;
    }

    return code;
  };

  if (!isVisible) return null;

  return (
    <div className="advanced-prompt-overlay">
      <div className="advanced-prompt-modal">
        <div className="modal-header">
          <h3>🚀 Advanced Arduino Project Generator</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <div className="config-section">
            <h4>📋 Project Configuration</h4>
            
            <div className="config-row">
              <label>Board Type:</label>
              <select 
                value={promptData.boardId}
                onChange={(e) => setPromptData(prev => ({ ...prev, boardId: e.target.value }))}
              >
                {BOARD_TYPES.map(board => (
                  <option key={board.id} value={board.id}>
                    {board.name} ({board.pins} pins)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="config-row">
              <label>Project Type:</label>
              <select 
                value={promptData.projectType}
                onChange={(e) => setPromptData(prev => ({ ...prev, projectType: e.target.value }))}
              >
                {PROJECT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="connections-section">
            <div className="section-header">
              <h4>🔌 Hardware Connections</h4>
              <button 
                className="add-btn"
                onClick={() => setShowConnectionModal(true)}
              >
                + Add Connection
              </button>
            </div>
            
            <div className="connections-list">
              {promptData.connections.map((conn, index) => (
                <div key={index} className="connection-item">
                  <span className="pin-info">Pin {conn.pin}</span>
                  <span className="component-info">{conn.component}</span>
                  <span className="type-info">{conn.type}</span>
                  {conn.value && <span className="value-info">{conn.value}</span>}
                  <button 
                    className="remove-btn"
                    onClick={() => removeConnection(index)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {promptData.connections.length === 0 && (
                <div className="empty-connections">
                  No connections added yet. Click "Add Connection" to start.
                </div>
              )}
            </div>
          </div>

          <div className="requirements-section">
            <h4>📝 Project Requirements</h4>
            <textarea
              ref={requirementsRef}
              value={promptData.requirements}
              onChange={(e) => setPromptData(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="Describe what you want your Arduino project to do..."
              rows={4}
            />
          </div>

          <div className="additional-inputs-section">
            <h4>⚙️ Additional Configuration</h4>
            <div className="input-grid">
              <input
                type="text"
                placeholder="Baud Rate (default: 9600)"
                value={promptData.additionalInputs.baudRate || ''}
                onChange={(e) => setPromptData(prev => ({
                  ...prev,
                  additionalInputs: { ...prev.additionalInputs, baudRate: e.target.value }
                }))}
              />
              <input
                type="text"
                placeholder="Library Requirements"
                value={promptData.additionalInputs.libraries || ''}
                onChange={(e) => setPromptData(prev => ({
                  ...prev,
                  additionalInputs: { ...prev.additionalInputs, libraries: e.target.value }
                }))}
              />
              <input
                type="text"
                placeholder="Special Features"
                value={promptData.additionalInputs.features || ''}
                onChange={(e) => setPromptData(prev => ({
                  ...prev,
                  additionalInputs: { ...prev.additionalInputs, features: e.target.value }
                }))}
              />
              <input
                type="text"
                placeholder="Performance Requirements"
                value={promptData.additionalInputs.performance || ''}
                onChange={(e) => setPromptData(prev => ({
                  ...prev,
                  additionalInputs: { ...prev.additionalInputs, performance: e.target.value }
                }))}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="generate-btn"
            onClick={generateAdvancedPrompt}
            disabled={isGenerating || (!promptData.requirements.trim() && promptData.connections.length === 0)}
          >
            {isGenerating ? '🔄 Generating...' : '🚀 Generate & Implement Code'}
          </button>
        </div>
      </div>

      {showConnectionModal && (
        <div className="connection-modal-overlay">
          <div className="connection-modal">
            <div className="modal-header">
              <h4>Add Hardware Connection</h4>
              <button onClick={() => setShowConnectionModal(false)}>✕</button>
            </div>
            
            <div className="connection-form">
              <div className="form-row">
                <label>Pin Number:</label>
                <input
                  type="text"
                  value={newConnection.pin}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="e.g., 2, A0, D1"
                />
              </div>
              
              <div className="form-row">
                <label>Pin Type:</label>
                <select
                  value={newConnection.type}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="digital">Digital</option>
                  <option value="analog">Analog</option>
                  <option value="power">Power</option>
                  <option value="ground">Ground</option>
                </select>
              </div>
              
              <div className="form-row">
                <label>Component:</label>
                <select
                  value={newConnection.component}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, component: e.target.value }))}
                >
                  {COMPONENT_TYPES.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <label>Additional Info:</label>
                <input
                  type="text"
                  value={newConnection.value || ''}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g., 5V, 220Ω resistor, PWM"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowConnectionModal(false)}>Cancel</button>
              <button onClick={addConnection}>Add Connection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedPrompt;
