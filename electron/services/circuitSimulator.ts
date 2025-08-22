import { EventEmitter } from 'events';

export interface Component {
  id: string;
  type: 'arduino' | 'led' | 'resistor' | 'button' | 'sensor' | 'breadboard' | 'wire';
  name: string;
  position: { x: number; y: number };
  rotation: number;
  pins: Pin[];
  properties: { [key: string]: any };
}

export interface Pin {
  id: string;
  name: string;
  type: 'digital' | 'analog' | 'power' | 'ground';
  position: { x: number; y: number };
  connected?: string; // ID of connected pin
}

export interface Connection {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
  wireColor: string;
}

export interface Circuit {
  id: string;
  name: string;
  components: Component[];
  connections: Connection[];
  metadata: {
    description: string;
    author: string;
    version: string;
    tags: string[];
    created: Date;
    modified: Date;
  };
}

export interface SimulationState {
  isRunning: boolean;
  time: number;
  digitalPins: { [pin: number]: boolean };
  analogPins: { [pin: number]: number };
  serialOutput: string[];
  errors: string[];
}

export class CircuitSimulator extends EventEmitter {
  private circuit: Circuit | null = null;
  private simulationState: SimulationState;
  private simulationTimer?: NodeJS.Timeout;
  private code: string = '';

  constructor() {
    super();
    this.simulationState = {
      isRunning: false,
      time: 0,
      digitalPins: {},
      analogPins: {},
      serialOutput: [],
      errors: []
    };
  }

  // Load a circuit for simulation
  loadCircuit(circuit: Circuit): void {
    this.circuit = circuit;
    this.resetSimulation();
    this.emit('circuitLoaded', circuit);
  }

  // Generate circuit from AI description
  async generateCircuitFromDescription(description: string): Promise<Circuit> {
    // This would integrate with AI to create a circuit
    // For now, return a basic LED blink circuit
    const circuit: Circuit = {
      id: `circuit_${Date.now()}`,
      name: 'AI Generated Circuit',
      components: [
        {
          id: 'arduino_1',
          type: 'arduino',
          name: 'Arduino Uno',
          position: { x: 100, y: 100 },
          rotation: 0,
          pins: this.getArduinoUnoPins(),
          properties: { board: 'arduino:avr:uno' }
        },
        {
          id: 'led_1',
          type: 'led',
          name: 'Red LED',
          position: { x: 300, y: 150 },
          rotation: 0,
          pins: [
            { id: 'anode', name: 'Anode', type: 'digital', position: { x: 0, y: 0 } },
            { id: 'cathode', name: 'Cathode', type: 'ground', position: { x: 0, y: 20 } }
          ],
          properties: { color: 'red', forwardVoltage: 2.0, current: 20 }
        },
        {
          id: 'resistor_1',
          type: 'resistor',
          name: '220Ω Resistor',
          position: { x: 250, y: 150 },
          rotation: 0,
          pins: [
            { id: 'pin1', name: 'Pin 1', type: 'digital', position: { x: 0, y: 0 } },
            { id: 'pin2', name: 'Pin 2', type: 'digital', position: { x: 40, y: 0 } }
          ],
          properties: { resistance: 220, tolerance: 5 }
        }
      ],
      connections: [
        {
          id: 'conn_1',
          fromComponent: 'arduino_1',
          fromPin: 'pin13',
          toComponent: 'resistor_1',
          toPin: 'pin1',
          wireColor: 'red'
        },
        {
          id: 'conn_2',
          fromComponent: 'resistor_1',
          fromPin: 'pin2',
          toComponent: 'led_1',
          toPin: 'anode',
          wireColor: 'red'
        },
        {
          id: 'conn_3',
          fromComponent: 'led_1',
          fromPin: 'cathode',
          toComponent: 'arduino_1',
          toPin: 'gnd',
          wireColor: 'black'
        }
      ],
      metadata: {
        description: description,
        author: 'AI Assistant',
        version: '1.0.0',
        tags: ['basic', 'led', 'blink'],
        created: new Date(),
        modified: new Date()
      }
    };

    return circuit;
  }

  // Generate suggested wiring from current code
  async generateWiringFromCode(code: string): Promise<{ components: Component[]; connections: Connection[]; suggestions: string[] }> {
    const suggestions: string[] = [];
    const components: Component[] = [];
    const connections: Connection[] = [];

    // Basic pattern matching for common Arduino patterns
    const patterns = {
      led: /pinMode\s*\(\s*(\d+)\s*,\s*OUTPUT\s*\)/g,
      button: /pinMode\s*\(\s*(\d+)\s*,\s*INPUT[_PULLUP]*\s*\)/g,
      analogRead: /analogRead\s*\(\s*[A]*(\d+)\s*\)/g,
      digitalWrite: /digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW)\s*\)/g,
      serial: /Serial\.begin\s*\(\s*(\d+)\s*\)/g
    };

    // Always add Arduino
    components.push({
      id: 'arduino_1',
      type: 'arduino',
      name: 'Arduino Uno',
      position: { x: 100, y: 100 },
      rotation: 0,
      pins: this.getArduinoUnoPins(),
      properties: { board: 'arduino:avr:uno' }
    });

    // Check for LED outputs
    let match;
    while ((match = patterns.led.exec(code)) !== null) {
      const pin = parseInt(match[1]);
      const ledId = `led_${pin}`;
      
      components.push({
        id: ledId,
        type: 'led',
        name: `LED on Pin ${pin}`,
        position: { x: 300 + (pin * 50), y: 150 },
        rotation: 0,
        pins: [
          { id: 'anode', name: 'Anode', type: 'digital', position: { x: 0, y: 0 } },
          { id: 'cathode', name: 'Cathode', type: 'ground', position: { x: 0, y: 20 } }
        ],
        properties: { color: 'red', forwardVoltage: 2.0, current: 20 }
      });

      // Add resistor
      const resistorId = `resistor_${pin}`;
      components.push({
        id: resistorId,
        type: 'resistor',
        name: `Resistor for Pin ${pin}`,
        position: { x: 250 + (pin * 50), y: 150 },
        rotation: 0,
        pins: [
          { id: 'pin1', name: 'Pin 1', type: 'digital', position: { x: 0, y: 0 } },
          { id: 'pin2', name: 'Pin 2', type: 'digital', position: { x: 40, y: 0 } }
        ],
        properties: { resistance: 220, tolerance: 5 }
      });

      // Add connections
      connections.push(
        {
          id: `conn_${pin}_1`,
          fromComponent: 'arduino_1',
          fromPin: `pin${pin}`,
          toComponent: resistorId,
          toPin: 'pin1',
          wireColor: 'red'
        },
        {
          id: `conn_${pin}_2`,
          fromComponent: resistorId,
          fromPin: 'pin2',
          toComponent: ledId,
          toPin: 'anode',
          wireColor: 'red'
        },
        {
          id: `conn_${pin}_3`,
          fromComponent: ledId,
          fromPin: 'cathode',
          toComponent: 'arduino_1',
          toPin: 'gnd',
          wireColor: 'black'
        }
      );

      suggestions.push(`Connect LED to digital pin ${pin} with a 220Ω current limiting resistor`);
    }

    // Check for button inputs
    patterns.button.lastIndex = 0;
    while ((match = patterns.button.exec(code)) !== null) {
      const pin = parseInt(match[1]);
      const buttonId = `button_${pin}`;
      
      components.push({
        id: buttonId,
        type: 'button',
        name: `Button on Pin ${pin}`,
        position: { x: 300 + (pin * 50), y: 250 },
        rotation: 0,
        pins: [
          { id: 'pin1', name: 'Pin 1', type: 'digital', position: { x: 0, y: 0 } },
          { id: 'pin2', name: 'Pin 2', type: 'digital', position: { x: 20, y: 0 } }
        ],
        properties: { type: 'momentary' }
      });

      connections.push({
        id: `conn_btn_${pin}`,
        fromComponent: 'arduino_1',
        fromPin: `pin${pin}`,
        toComponent: buttonId,
        toPin: 'pin1',
        wireColor: 'blue'
      });

      suggestions.push(`Connect push button to digital pin ${pin}`);
    }

    return { components, connections, suggestions };
  }

  // Start simulation with Arduino code
  startSimulation(code: string): void {
    if (!this.circuit) {
      throw new Error('No circuit loaded');
    }

    this.code = code;
    this.simulationState.isRunning = true;
    this.simulationState.time = 0;
    this.simulationState.errors = [];

    // Simple simulation loop
    this.simulationTimer = setInterval(() => {
      this.updateSimulation();
    }, 100); // 10 Hz simulation

    this.emit('simulationStarted');
  }

  stopSimulation(): void {
    this.simulationState.isRunning = false;
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = undefined;
    }
    this.emit('simulationStopped');
  }

  private updateSimulation(): void {
    if (!this.simulationState.isRunning) return;

    this.simulationState.time += 100; // Add 100ms

    // Very basic simulation - blink LED on pin 13 every 1000ms
    if (this.code.includes('digitalWrite(13')) {
      const shouldBeOn = Math.floor(this.simulationState.time / 1000) % 2 === 0;
      this.simulationState.digitalPins[13] = shouldBeOn;
    }

    this.emit('simulationUpdate', this.simulationState);
  }

  private resetSimulation(): void {
    this.stopSimulation();
    this.simulationState = {
      isRunning: false,
      time: 0,
      digitalPins: {},
      analogPins: {},
      serialOutput: [],
      errors: []
    };
  }

  private getArduinoUnoPins(): Pin[] {
    const pins: Pin[] = [];
    
    // Digital pins 0-13
    for (let i = 0; i <= 13; i++) {
      pins.push({
        id: `pin${i}`,
        name: `D${i}`,
        type: 'digital',
        position: { x: i * 20, y: 0 }
      });
    }

    // Analog pins A0-A5
    for (let i = 0; i <= 5; i++) {
      pins.push({
        id: `pinA${i}`,
        name: `A${i}`,
        type: 'analog',
        position: { x: i * 20, y: 40 }
      });
    }

    // Power pins
    pins.push(
      { id: 'vin', name: 'VIN', type: 'power', position: { x: 0, y: 60 } },
      { id: '5v', name: '5V', type: 'power', position: { x: 20, y: 60 } },
      { id: '3v3', name: '3.3V', type: 'power', position: { x: 40, y: 60 } },
      { id: 'gnd', name: 'GND', type: 'ground', position: { x: 60, y: 60 } }
    );

    return pins;
  }

  // Get current simulation state
  getSimulationState(): SimulationState {
    return { ...this.simulationState };
  }

  // Validate circuit for potential issues
  validateCircuit(circuit: Circuit): { isValid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for basic issues
    if (circuit.components.length === 0) {
      errors.push('Circuit has no components');
    }

    // Check for Arduino
    const arduino = circuit.components.find(c => c.type === 'arduino');
    if (!arduino) {
      errors.push('Circuit must include an Arduino board');
    }

    // Check for short circuits
    const powerConnections = circuit.connections.filter(c => 
      c.fromPin === '5v' || c.fromPin === '3v3' || c.toPin === '5v' || c.toPin === '3v3'
    );
    
    const groundConnections = circuit.connections.filter(c => 
      c.fromPin === 'gnd' || c.toPin === 'gnd'
    );

    // Very basic short circuit detection
    for (const powerConn of powerConnections) {
      for (const groundConn of groundConnections) {
        if (powerConn.toComponent === groundConn.fromComponent && 
            powerConn.toPin === groundConn.fromPin) {
          errors.push('Potential short circuit detected between power and ground');
        }
      }
    }

    // Check for LEDs without current limiting resistors
    const leds = circuit.components.filter(c => c.type === 'led');
    for (const led of leds) {
      const ledConnections = circuit.connections.filter(c => 
        c.toComponent === led.id || c.fromComponent === led.id
      );
      
      const hasResistor = ledConnections.some(conn => {
        const otherComponent = circuit.components.find(comp => 
          comp.id === (conn.fromComponent === led.id ? conn.toComponent : conn.fromComponent)
        );
        return otherComponent?.type === 'resistor';
      });

      if (!hasResistor) {
        warnings.push(`LED "${led.name}" should have a current limiting resistor`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}
