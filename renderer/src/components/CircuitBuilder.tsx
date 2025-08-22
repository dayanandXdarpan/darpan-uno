import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Circuit, CircuitComponent, Connection, Pin } from '../types/electron';
import './CircuitBuilder.css';

interface CircuitBuilderProps {
  onCircuitChange?: (circuit: Circuit) => void;
  onCodeGenerate?: (code: string) => void;
  readOnly?: boolean;
}

export const CircuitBuilder: React.FC<CircuitBuilderProps> = ({
  onCircuitChange,
  onCodeGenerate,
  readOnly = false
}) => {
  const [circuit, setCircuit] = useState<Circuit>({
    id: '',
    name: 'New Circuit',
    components: [],
    connections: [],
    validated: false
  });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [componentLibrary, setComponentLibrary] = useState<CircuitComponent[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<{componentId: string, pinId: string} | null>(null);
  const [validationResults, setValidationResults] = useState<{valid: boolean, issues: string[]}>({valid: true, issues: []});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragOffset = useRef<{x: number, y: number}>({x: 0, y: 0});

  // Load component library on mount
  useEffect(() => {
    const loadComponentLibrary = async () => {
      try {
        if (window.electronAPI?.circuit?.getComponentLibrary) {
          const library = await window.electronAPI.circuit.getComponentLibrary();
          setComponentLibrary(library);
        }
      } catch (error) {
        console.error('Failed to load component library:', error);
        // Fallback to default components
        setComponentLibrary(getDefaultComponents());
      }
    };

    loadComponentLibrary();
  }, []);

  // Default components for fallback
  const getDefaultComponents = (): CircuitComponent[] => [
    {
      id: 'arduino-uno',
      type: 'arduino',
      name: 'Arduino Uno',
      pins: [
        { id: 'pin-0', name: 'D0', type: 'digital', direction: 'bidirectional' },
        { id: 'pin-1', name: 'D1', type: 'digital', direction: 'bidirectional' },
        { id: 'pin-13', name: 'D13', type: 'digital', direction: 'bidirectional' },
        { id: 'pin-a0', name: 'A0', type: 'analog', direction: 'input' },
        { id: 'pin-5v', name: '5V', type: 'power', direction: 'output' },
        { id: 'pin-gnd', name: 'GND', type: 'ground', direction: 'output' }
      ],
      position: { x: 100, y: 100 },
      properties: { board: 'uno' }
    },
    {
      id: 'led-template',
      type: 'led',
      name: 'LED',
      pins: [
        { id: 'anode', name: 'Anode (+)', type: 'power', direction: 'input' },
        { id: 'cathode', name: 'Cathode (-)', type: 'ground', direction: 'input' }
      ],
      position: { x: 0, y: 0 },
      properties: { color: 'red', voltage: '2.0V', current: '20mA' }
    },
    {
      id: 'resistor-template',
      type: 'resistor',
      name: 'Resistor',
      pins: [
        { id: 'pin1', name: 'Pin 1', type: 'digital', direction: 'bidirectional' },
        { id: 'pin2', name: 'Pin 2', type: 'digital', direction: 'bidirectional' }
      ],
      position: { x: 0, y: 0 },
      properties: { resistance: '220Ω' }
    }
  ];

  // Add component to circuit
  const addComponent = useCallback((templateId: string, position: {x: number, y: number}) => {
    const template = componentLibrary.find(c => c.id === templateId);
    if (!template) return;

    const newComponent: CircuitComponent = {
      ...template,
      id: `${template.type}-${Date.now()}`,
      position
    };

    const newCircuit = {
      ...circuit,
      components: [...circuit.components, newComponent]
    };

    setCircuit(newCircuit);
    onCircuitChange?.(newCircuit);
  }, [circuit, componentLibrary, onCircuitChange]);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, componentId: string) => {
    if (readOnly) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const component = circuit.components.find(c => c.id === componentId);
    if (!component) return;

    dragOffset.current = {
      x: e.clientX - rect.left - component.position.x,
      y: e.clientY - rect.top - component.position.y
    };

    setSelectedComponent(componentId);
    setDragging(true);
  }, [circuit.components, readOnly]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !selectedComponent || readOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newPosition = {
      x: e.clientX - rect.left - dragOffset.current.x,
      y: e.clientY - rect.top - dragOffset.current.y
    };

    const newCircuit = {
      ...circuit,
      components: circuit.components.map(c =>
        c.id === selectedComponent ? { ...c, position: newPosition } : c
      )
    };

    setCircuit(newCircuit);
    onCircuitChange?.(newCircuit);
  }, [dragging, selectedComponent, circuit, onCircuitChange, readOnly]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Handle pin connections
  const handlePinClick = useCallback((componentId: string, pinId: string) => {
    if (readOnly) return;

    if (!isConnecting) {
      setIsConnecting(true);
      setConnectionStart({ componentId, pinId });
    } else if (connectionStart) {
      // Create connection
      const connection: Connection = {
        id: `conn-${Date.now()}`,
        fromComponent: connectionStart.componentId,
        fromPin: connectionStart.pinId,
        toComponent: componentId,
        toPin: pinId,
        validated: false
      };

      const newCircuit = {
        ...circuit,
        connections: [...circuit.connections, connection]
      };

      setCircuit(newCircuit);
      setIsConnecting(false);
      setConnectionStart(null);
      onCircuitChange?.(newCircuit);
      
      // Validate the new connection
      validateCircuit(newCircuit);
    }
  }, [isConnecting, connectionStart, circuit, onCircuitChange, readOnly]);

  // Validate circuit
  const validateCircuit = async (circuitToValidate: Circuit) => {
    try {
      if (window.electronAPI?.circuit?.validate) {
        const result = await window.electronAPI.circuit.validate(circuitToValidate);
        setValidationResults(result);
        
        const validatedCircuit = {
          ...circuitToValidate,
          validated: result.valid
        };
        setCircuit(validatedCircuit);
        onCircuitChange?.(validatedCircuit);
      }
    } catch (error) {
      console.error('Circuit validation failed:', error);
    }
  };

  // Generate code from circuit
  const generateCode = async () => {
    try {
      if (window.electronAPI?.circuit?.generateCode) {
        const code = await window.electronAPI.circuit.generateCode(circuit);
        onCodeGenerate?.(code);
      }
    } catch (error) {
      console.error('Code generation failed:', error);
    }
  };

  // Render component on canvas
  const renderComponent = (component: CircuitComponent) => {
    return (
      <div
        key={component.id}
        className={`circuit-component ${component.type} ${selectedComponent === component.id ? 'selected' : ''}`}
        style={{
          left: component.position.x,
          top: component.position.y,
          position: 'absolute',
          cursor: readOnly ? 'default' : 'move'
        }}
        onMouseDown={(e) => handleMouseDown(e, component.id)}
      >
        <div className="component-body">
          <span className="component-name">{component.name}</span>
          <div className="component-pins">
            {component.pins.map(pin => (
              <div
                key={pin.id}
                className={`pin ${pin.type} ${pin.direction}`}
                onClick={() => handlePinClick(component.id, pin.id)}
                title={`${pin.name} (${pin.type})`}
              >
                <span className="pin-label">{pin.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render connections
  const renderConnections = () => {
    return circuit.connections.map(connection => {
      const fromComponent = circuit.components.find(c => c.id === connection.fromComponent);
      const toComponent = circuit.components.find(c => c.id === connection.toComponent);
      
      if (!fromComponent || !toComponent) return null;

      // Calculate connection line coordinates (simplified)
      const x1 = fromComponent.position.x + 50; // Approximate pin position
      const y1 = fromComponent.position.y + 25;
      const x2 = toComponent.position.x + 50;
      const y2 = toComponent.position.y + 25;

      return (
        <line
          key={connection.id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={connection.validated ? '#4CAF50' : '#FF5722'}
          strokeWidth="2"
          className="connection-wire"
        />
      );
    });
  };

  return (
    <div className="circuit-builder">
      <div className="circuit-toolbar">
        <div className="component-palette">
          <h3>Components</h3>
          {componentLibrary.map(component => (
            <div
              key={component.id}
              className="component-item"
              draggable
              onDragEnd={(e) => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  addComponent(component.id, {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }
              }}
            >
              {component.name}
            </div>
          ))}
        </div>
        
        <div className="circuit-actions">
          <button onClick={generateCode} disabled={!circuit.validated}>
            Generate Code
          </button>
          <button onClick={() => validateCircuit(circuit)}>
            Validate Circuit
          </button>
        </div>
      </div>

      <div className="circuit-canvas-container">
        <canvas
          ref={canvasRef}
          className="circuit-canvas"
          width={800}
          height={600}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        
        <svg className="connection-overlay" width="800" height="600">
          {renderConnections()}
        </svg>
        
        <div className="components-overlay">
          {circuit.components.map(renderComponent)}
        </div>
      </div>

      {validationResults.issues.length > 0 && (
        <div className="validation-panel">
          <h4>Circuit Issues:</h4>
          <ul>
            {validationResults.issues.map((issue, index) => (
              <li key={index} className="validation-issue">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CircuitBuilder;
