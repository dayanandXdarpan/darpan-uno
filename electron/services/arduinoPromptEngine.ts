import { EventEmitter } from 'events';
import { ArduinoCodeGenAI, AIToolContext, CodeGenerationRequest } from './arduinoAITools';
import { AIHardwareRecognition, HardwareComponent } from './aiHardwareRecognition';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sensor' | 'actuator' | 'communication' | 'display' | 'power' | 'general';
  prompt: string;
  variables: string[];
  examples: string[];
  context: Partial<AIToolContext>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'code-generation' | 'hardware-selection' | 'testing' | 'validation' | 'documentation';
  dependencies: string[];
  estimatedTime: string;
  deliverables: string[];
}

export interface DevelopmentWorkflow {
  id: string;
  name: string;
  description: string;
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  projectType: AIToolContext['projectType'];
  steps: WorkflowStep[];
  tools: string[];
  estimatedDuration: string;
}

export class ArduinoPromptEngine extends EventEmitter {
  private templates: Map<string, PromptTemplate> = new Map();
  private workflows: Map<string, DevelopmentWorkflow> = new Map();

  constructor() {
    super();
    this.initializePromptTemplates();
    this.initializeDevelopmentWorkflows();
  }

  private initializePromptTemplates(): void {
    const templates: PromptTemplate[] = [
      // Sensor Templates
      {
        id: 'temperature-sensor',
        name: 'Temperature Sensor Integration',
        description: 'Template for integrating temperature sensors (DHT22, DS18B20, etc.)',
        category: 'sensor',
        prompt: `Create Arduino code for a {{SENSOR_TYPE}} temperature sensor project.

Requirements:
- Board: {{TARGET_BOARD}}
- Sensor: {{SENSOR_TYPE}}
- Features: {{FEATURES}}
- Display readings every {{INTERVAL}} seconds
- Include error handling and calibration
- Add {{OUTPUT_METHOD}} for data output

Code should be {{CODE_STYLE}} and optimized for {{OPTIMIZATION_TARGET}}.

Include:
1. Proper sensor initialization and validation
2. Temperature reading with accuracy consideration
3. Error handling for sensor failures
4. Data filtering and smoothing if needed
5. Serial output with proper formatting
6. Optional data logging capabilities`,
        variables: ['SENSOR_TYPE', 'TARGET_BOARD', 'FEATURES', 'INTERVAL', 'OUTPUT_METHOD', 'CODE_STYLE', 'OPTIMIZATION_TARGET'],
        examples: [
          'DHT22 with Arduino Uno for greenhouse monitoring',
          'DS18B20 waterproof sensor for pool temperature',
          'Multiple temperature sensors with I2C LCD display'
        ],
        context: {
          projectType: 'sensor-project',
          targetBoard: 'arduino-uno',
          experienceLevel: 'intermediate'
        }
      },
      {
        id: 'motion-detection',
        name: 'Motion Detection System',
        description: 'Template for PIR sensors and motion detection projects',
        category: 'sensor',
        prompt: `Design a motion detection system using {{SENSOR_TYPE}} with Arduino.

Project Requirements:
- Motion sensor: {{SENSOR_TYPE}}
- Alert method: {{ALERT_METHOD}}
- Detection sensitivity: {{SENSITIVITY}}
- Operating mode: {{OPERATING_MODE}}
- Power source: {{POWER_SOURCE}}

Implementation Details:
1. PIR sensor configuration and calibration
2. Motion detection algorithm with debouncing
3. False positive filtering
4. Alert system (LED, buzzer, notification)
5. Optional: Time-based activation/deactivation
6. Optional: Data logging with timestamps
7. Low-power mode for battery operation

Code should handle sensor warm-up time and provide reliable detection with minimal false alarms.`,
        variables: ['SENSOR_TYPE', 'ALERT_METHOD', 'SENSITIVITY', 'OPERATING_MODE', 'POWER_SOURCE'],
        examples: [
          'PIR sensor with LED and buzzer alert',
          'Multiple PIR sensors for room coverage',
          'Motion-activated camera trigger'
        ],
        context: {
          projectType: 'home-automation',
          targetBoard: 'arduino-uno',
          experienceLevel: 'beginner'
        }
      },
      {
        id: 'ultrasonic-distance',
        name: 'Ultrasonic Distance Measurement',
        description: 'Template for HC-SR04 and similar ultrasonic sensors',
        category: 'sensor',
        prompt: `Create an ultrasonic distance measurement system using {{SENSOR_TYPE}}.

Project Specifications:
- Sensor: {{SENSOR_TYPE}}
- Measurement range: {{RANGE}}
- Accuracy requirement: {{ACCURACY}}
- Update rate: {{UPDATE_RATE}}
- Output format: {{OUTPUT_FORMAT}}
- Application: {{APPLICATION}}

Implementation Features:
1. Accurate distance calculation with temperature compensation
2. Multi-sample averaging for noise reduction
3. Out-of-range detection and handling
4. Configurable measurement intervals
5. Optional: Multiple sensor support
6. Optional: Object tracking and trajectory
7. Optional: Distance-based actions/alerts

Include proper timing calculations and consider acoustic properties for accurate measurements.`,
        variables: ['SENSOR_TYPE', 'RANGE', 'ACCURACY', 'UPDATE_RATE', 'OUTPUT_FORMAT', 'APPLICATION'],
        examples: [
          'Parking sensor with distance display',
          'Robot obstacle avoidance system',
          'Liquid level measurement tank'
        ],
        context: {
          projectType: 'sensor-project',
          targetBoard: 'arduino-uno',
          experienceLevel: 'intermediate'
        }
      },

      // Actuator Templates
      {
        id: 'servo-control',
        name: 'Servo Motor Control System',
        description: 'Template for servo motor control and positioning',
        category: 'actuator',
        prompt: `Design a servo motor control system for {{APPLICATION}}.

System Requirements:
- Servo type: {{SERVO_TYPE}}
- Control method: {{CONTROL_METHOD}}
- Position feedback: {{FEEDBACK_TYPE}}
- Speed control: {{SPEED_CONTROL}}
- Safety features: {{SAFETY_FEATURES}}

Implementation Details:
1. Servo initialization and calibration
2. Smooth position transitions with acceleration/deceleration
3. Position validation and limits
4. Speed control and ramping
5. Error detection and recovery
6. Optional: Position feedback and closed-loop control
7. Optional: Trajectory planning and execution
8. Safety: Emergency stop and limit switches

Code should provide precise positioning with smooth motion profiles and proper error handling.`,
        variables: ['APPLICATION', 'SERVO_TYPE', 'CONTROL_METHOD', 'FEEDBACK_TYPE', 'SPEED_CONTROL', 'SAFETY_FEATURES'],
        examples: [
          'Pan-tilt camera mount',
          'Robotic arm joint control',
          'Solar panel tracking system'
        ],
        context: {
          projectType: 'robotics',
          targetBoard: 'arduino-uno',
          experienceLevel: 'advanced'
        }
      },
      {
        id: 'stepper-motor',
        name: 'Stepper Motor Control',
        description: 'Template for precise stepper motor control',
        category: 'actuator',
        prompt: `Create a stepper motor control system for {{APPLICATION}}.

Motor Specifications:
- Stepper motor: {{MOTOR_TYPE}}
- Driver: {{DRIVER_TYPE}}
- Steps per revolution: {{STEPS_PER_REV}}
- Max speed: {{MAX_SPEED}}
- Acceleration: {{ACCELERATION}}
- Microstepping: {{MICROSTEPPING}}

Control Features:
1. Precise position control with step counting
2. Speed ramping and acceleration control
3. Direction control and reversal
4. Homing sequence with limit switches
5. Position feedback and verification
6. Optional: Encoder feedback for closed-loop
7. Optional: Multi-axis coordination
8. Error detection: Stall detection, overcurrent

Include proper timing calculations for smooth motion and consider motor heating and power requirements.`,
        variables: ['APPLICATION', 'MOTOR_TYPE', 'DRIVER_TYPE', 'STEPS_PER_REV', 'MAX_SPEED', 'ACCELERATION', 'MICROSTEPPING'],
        examples: [
          '3D printer axis control',
          'CNC machine positioning',
          'Automated camera slider'
        ],
        context: {
          projectType: 'robotics',
          targetBoard: 'mega',
          experienceLevel: 'advanced'
        }
      },

      // Communication Templates
      {
        id: 'wifi-iot',
        name: 'WiFi IoT Communication',
        description: 'Template for ESP32/ESP8266 WiFi projects',
        category: 'communication',
        prompt: `Develop a WiFi IoT system using {{BOARD_TYPE}} for {{APPLICATION}}.

Network Configuration:
- Board: {{BOARD_TYPE}}
- WiFi security: {{WIFI_SECURITY}}
- Communication protocol: {{PROTOCOL}}
- Data format: {{DATA_FORMAT}}
- Update interval: {{UPDATE_INTERVAL}}
- Cloud service: {{CLOUD_SERVICE}}

Implementation Features:
1. WiFi connection management with auto-reconnection
2. Secure communication with authentication
3. Data collection and buffering
4. Cloud synchronization and error handling
5. OTA (Over-The-Air) update capability
6. Low-power modes for battery operation
7. Local web server for configuration
8. Status LED indicators and diagnostics

Include robust error handling for network issues and implement proper security measures for data transmission.`,
        variables: ['BOARD_TYPE', 'APPLICATION', 'WIFI_SECURITY', 'PROTOCOL', 'DATA_FORMAT', 'UPDATE_INTERVAL', 'CLOUD_SERVICE'],
        examples: [
          'Smart home sensor monitoring',
          'Remote weather station',
          'Industrial equipment monitoring'
        ],
        context: {
          projectType: 'iot-project',
          targetBoard: 'esp32',
          experienceLevel: 'intermediate'
        }
      },
      {
        id: 'bluetooth-communication',
        name: 'Bluetooth Communication System',
        description: 'Template for Bluetooth classic and BLE projects',
        category: 'communication',
        prompt: `Create a Bluetooth communication system for {{APPLICATION}}.

Bluetooth Configuration:
- Bluetooth type: {{BT_TYPE}} (Classic/BLE)
- Communication mode: {{COMM_MODE}}
- Data rate: {{DATA_RATE}}
- Range requirement: {{RANGE}}
- Security level: {{SECURITY}}
- Device pairing: {{PAIRING_MODE}}

System Features:
1. Bluetooth initialization and device discovery
2. Secure pairing and connection management
3. Data transmission with error checking
4. Command parsing and response handling
5. Connection monitoring and auto-reconnection
6. Power management for battery devices
7. Multiple device support (if applicable)
8. Protocol implementation for data exchange

Include proper error handling for connection issues and implement data validation for reliable communication.`,
        variables: ['APPLICATION', 'BT_TYPE', 'COMM_MODE', 'DATA_RATE', 'RANGE', 'SECURITY', 'PAIRING_MODE'],
        examples: [
          'Smartphone app control interface',
          'Wireless sensor data collection',
          'Bluetooth beacon for location services'
        ],
        context: {
          projectType: 'iot-project',
          targetBoard: 'esp32',
          experienceLevel: 'intermediate'
        }
      },

      // Display Templates
      {
        id: 'lcd-display',
        name: 'LCD Display Interface',
        description: 'Template for LCD displays (16x2, 20x4, etc.)',
        category: 'display',
        prompt: `Design an LCD display system for {{APPLICATION}}.

Display Specifications:
- LCD type: {{LCD_TYPE}}
- Interface: {{INTERFACE}} (I2C/Parallel)
- Display content: {{CONTENT_TYPE}}
- Update frequency: {{UPDATE_FREQ}}
- Backlight control: {{BACKLIGHT}}
- User interaction: {{USER_INPUT}}

Display Features:
1. LCD initialization and configuration
2. Text formatting and positioning
3. Custom character creation
4. Scrolling text and animations
5. Menu system with navigation
6. Data visualization (bargraphs, etc.)
7. Backlight control and dimming
8. Multiple screen/page management

Include proper formatting functions and consider readability and user experience design.`,
        variables: ['APPLICATION', 'LCD_TYPE', 'INTERFACE', 'CONTENT_TYPE', 'UPDATE_FREQ', 'BACKLIGHT', 'USER_INPUT'],
        examples: [
          'System status monitoring display',
          'Data logger with real-time readouts',
          'Interactive menu system'
        ],
        context: {
          projectType: 'educational',
          targetBoard: 'arduino-uno',
          experienceLevel: 'beginner'
        }
      },
      {
        id: 'oled-display',
        name: 'OLED Display System',
        description: 'Template for OLED displays (SSD1306, etc.)',
        category: 'display',
        prompt: `Create an OLED display system for {{APPLICATION}}.

OLED Configuration:
- Display: {{OLED_TYPE}}
- Resolution: {{RESOLUTION}}
- Interface: {{INTERFACE}} (I2C/SPI)
- Graphics library: {{GRAPHICS_LIB}}
- Content type: {{CONTENT_TYPE}}
- Animation: {{ANIMATION_SUPPORT}}

Display Capabilities:
1. OLED initialization and configuration
2. Graphics primitives (lines, shapes, text)
3. Image and bitmap display
4. Animations and transitions
5. Multiple fonts and text sizes
6. Real-time data visualization
7. Power management and screen saver
8. User interface elements

Include efficient graphics rendering and consider memory limitations for complex displays.`,
        variables: ['APPLICATION', 'OLED_TYPE', 'RESOLUTION', 'INTERFACE', 'GRAPHICS_LIB', 'CONTENT_TYPE', 'ANIMATION_SUPPORT'],
        examples: [
          'Wearable device display',
          'IoT dashboard with graphics',
          'Portable instrument display'
        ],
        context: {
          projectType: 'wearable',
          targetBoard: 'esp32',
          experienceLevel: 'intermediate'
        }
      },

      // General Purpose Templates
      {
        id: 'data-logger',
        name: 'Data Logging System',
        description: 'Template for comprehensive data logging projects',
        category: 'general',
        prompt: `Design a data logging system for {{APPLICATION}}.

Logging Requirements:
- Data sources: {{DATA_SOURCES}}
- Storage medium: {{STORAGE_TYPE}}
- Logging interval: {{LOG_INTERVAL}}
- Data format: {{DATA_FORMAT}}
- Storage capacity: {{STORAGE_SIZE}}
- Real-time display: {{REALTIME_DISPLAY}}

System Features:
1. Multi-sensor data acquisition
2. Timestamp generation (RTC module)
3. Data formatting and validation
4. Storage management (SD card/EEPROM)
5. Data retrieval and export
6. Real-time monitoring display
7. Alarm conditions and notifications
8. Power management for long-term logging

Include proper error handling for storage failures and implement data integrity checks.`,
        variables: ['APPLICATION', 'DATA_SOURCES', 'STORAGE_TYPE', 'LOG_INTERVAL', 'DATA_FORMAT', 'STORAGE_SIZE', 'REALTIME_DISPLAY'],
        examples: [
          'Environmental monitoring station',
          'Vehicle performance logger',
          'Industrial process monitoring'
        ],
        context: {
          projectType: 'industrial',
          targetBoard: 'mega',
          experienceLevel: 'advanced'
        }
      },
      {
        id: 'alarm-system',
        name: 'Security Alarm System',
        description: 'Template for comprehensive security and alarm systems',
        category: 'general',
        prompt: `Create a security alarm system for {{APPLICATION}}.

Security Requirements:
- Sensor types: {{SENSOR_TYPES}}
- Zones: {{ZONE_COUNT}}
- Alert methods: {{ALERT_METHODS}}
- User interface: {{USER_INTERFACE}}
- Power backup: {{BACKUP_POWER}}
- Communication: {{COMMUNICATION}}

Security Features:
1. Multi-zone sensor monitoring
2. Armed/disarmed state management
3. User authentication (keypad/RFID)
4. Immediate and delayed alarms
5. Status indication and history
6. Remote monitoring and control
7. Battery backup and low-power mode
8. Tamper detection and self-monitoring

Include proper security protocols and fail-safe mechanisms for reliable operation.`,
        variables: ['APPLICATION', 'SENSOR_TYPES', 'ZONE_COUNT', 'ALERT_METHODS', 'USER_INTERFACE', 'BACKUP_POWER', 'COMMUNICATION'],
        examples: [
          'Home security system',
          'Shop/office alarm system',
          'Vehicle security system'
        ],
        context: {
          projectType: 'home-automation',
          targetBoard: 'mega',
          experienceLevel: 'expert'
        }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log(`Loaded ${this.templates.size} prompt templates`);
  }

  private initializeDevelopmentWorkflows(): void {
    const workflows: DevelopmentWorkflow[] = [
      {
        id: 'beginner-sensor-project',
        name: 'Beginner Sensor Project Workflow',
        description: 'Step-by-step workflow for first-time Arduino sensor projects',
        targetAudience: 'beginner',
        projectType: 'sensor-project',
        estimatedDuration: '2-3 weeks',
        tools: ['hardware-selection', 'code-generation', 'testing'],
        steps: [
          {
            id: 'requirements',
            name: 'Define Project Requirements',
            description: 'Clearly define what the sensor project should accomplish',
            type: 'documentation',
            dependencies: [],
            estimatedTime: '2-3 hours',
            deliverables: ['Requirements document', 'Success criteria', 'Constraints list']
          },
          {
            id: 'component-selection',
            name: 'Select Components',
            description: 'Choose appropriate sensors and Arduino board',
            type: 'hardware-selection',
            dependencies: ['requirements'],
            estimatedTime: '3-4 hours',
            deliverables: ['Component list', 'Wiring diagram', 'Shopping list']
          },
          {
            id: 'basic-setup',
            name: 'Basic Hardware Setup',
            description: 'Connect components and verify basic functionality',
            type: 'testing',
            dependencies: ['component-selection'],
            estimatedTime: '2-3 hours',
            deliverables: ['Working hardware setup', 'Basic test results']
          },
          {
            id: 'code-development',
            name: 'Code Development',
            description: 'Write and test Arduino code for sensor reading',
            type: 'code-generation',
            dependencies: ['basic-setup'],
            estimatedTime: '4-6 hours',
            deliverables: ['Working Arduino code', 'Code documentation']
          },
          {
            id: 'testing-validation',
            name: 'Testing and Validation',
            description: 'Comprehensive testing of the complete system',
            type: 'validation',
            dependencies: ['code-development'],
            estimatedTime: '2-3 hours',
            deliverables: ['Test results', 'Performance validation', 'Bug fixes']
          },
          {
            id: 'documentation',
            name: 'Project Documentation',
            description: 'Create comprehensive project documentation',
            type: 'documentation',
            dependencies: ['testing-validation'],
            estimatedTime: '2-3 hours',
            deliverables: ['User manual', 'Technical documentation', 'Troubleshooting guide']
          }
        ]
      },
      {
        id: 'iot-development-workflow',
        name: 'IoT Project Development Workflow',
        description: 'Professional workflow for IoT project development',
        targetAudience: 'intermediate',
        projectType: 'iot-project',
        estimatedDuration: '4-6 weeks',
        tools: ['hardware-selection', 'code-generation', 'testing', 'cloud-integration'],
        steps: [
          {
            id: 'system-architecture',
            name: 'System Architecture Design',
            description: 'Design overall IoT system architecture',
            type: 'documentation',
            dependencies: [],
            estimatedTime: '1-2 days',
            deliverables: ['Architecture diagram', 'Component specifications', 'Communication protocols']
          },
          {
            id: 'hardware-design',
            name: 'Hardware Design and Selection',
            description: 'Select and design hardware components',
            type: 'hardware-selection',
            dependencies: ['system-architecture'],
            estimatedTime: '2-3 days',
            deliverables: ['Hardware BOM', 'Schematic design', 'PCB layout (if needed)']
          },
          {
            id: 'firmware-development',
            name: 'Firmware Development',
            description: 'Develop embedded firmware for IoT device',
            type: 'code-generation',
            dependencies: ['hardware-design'],
            estimatedTime: '1-2 weeks',
            deliverables: ['Complete firmware', 'OTA update system', 'Configuration management']
          },
          {
            id: 'cloud-setup',
            name: 'Cloud Infrastructure Setup',
            description: 'Set up cloud services and data pipeline',
            type: 'code-generation',
            dependencies: ['system-architecture'],
            estimatedTime: '3-5 days',
            deliverables: ['Cloud configuration', 'API endpoints', 'Database schema']
          },
          {
            id: 'integration-testing',
            name: 'System Integration Testing',
            description: 'Test complete IoT system end-to-end',
            type: 'testing',
            dependencies: ['firmware-development', 'cloud-setup'],
            estimatedTime: '3-5 days',
            deliverables: ['Integration test results', 'Performance metrics', 'Bug fixes']
          },
          {
            id: 'security-validation',
            name: 'Security Testing and Validation',
            description: 'Validate security measures and protocols',
            type: 'validation',
            dependencies: ['integration-testing'],
            estimatedTime: '2-3 days',
            deliverables: ['Security audit report', 'Penetration test results', 'Security fixes']
          },
          {
            id: 'deployment',
            name: 'Production Deployment',
            description: 'Deploy system to production environment',
            type: 'validation',
            dependencies: ['security-validation'],
            estimatedTime: '1-2 days',
            deliverables: ['Production deployment', 'Monitoring setup', 'Maintenance procedures']
          }
        ]
      },
      {
        id: 'robotics-development',
        name: 'Robotics Project Development Workflow',
        description: 'Comprehensive workflow for robotics projects',
        targetAudience: 'advanced',
        projectType: 'robotics',
        estimatedDuration: '6-10 weeks',
        tools: ['hardware-selection', 'code-generation', 'testing', 'simulation'],
        steps: [
          {
            id: 'mechanical-design',
            name: 'Mechanical Design and Analysis',
            description: 'Design robot mechanical structure and kinematics',
            type: 'documentation',
            dependencies: [],
            estimatedTime: '1-2 weeks',
            deliverables: ['CAD models', 'Kinematic analysis', 'Structural calculations']
          },
          {
            id: 'control-system-design',
            name: 'Control System Design',
            description: 'Design control algorithms and feedback systems',
            type: 'code-generation',
            dependencies: ['mechanical-design'],
            estimatedTime: '1-2 weeks',
            deliverables: ['Control algorithms', 'PID tuning', 'State machine design']
          },
          {
            id: 'sensor-integration',
            name: 'Sensor Integration and Calibration',
            description: 'Integrate and calibrate all sensors',
            type: 'hardware-selection',
            dependencies: ['control-system-design'],
            estimatedTime: '1 week',
            deliverables: ['Sensor calibration data', 'Integration code', 'Validation tests']
          },
          {
            id: 'motion-control',
            name: 'Motion Control Implementation',
            description: 'Implement actuator control and motion planning',
            type: 'code-generation',
            dependencies: ['sensor-integration'],
            estimatedTime: '2-3 weeks',
            deliverables: ['Motion control code', 'Path planning algorithms', 'Safety systems']
          },
          {
            id: 'system-testing',
            name: 'Comprehensive System Testing',
            description: 'Test complete robotic system',
            type: 'testing',
            dependencies: ['motion-control'],
            estimatedTime: '1-2 weeks',
            deliverables: ['Test protocols', 'Performance metrics', 'Safety validation']
          },
          {
            id: 'optimization',
            name: 'Performance Optimization',
            description: 'Optimize system performance and efficiency',
            type: 'validation',
            dependencies: ['system-testing'],
            estimatedTime: '1 week',
            deliverables: ['Optimized code', 'Performance improvements', 'Documentation']
          }
        ]
      }
    ];

    workflows.forEach(workflow => {
      this.workflows.set(workflow.id, workflow);
    });

    console.log(`Loaded ${this.workflows.size} development workflows`);
  }

  // Template management methods
  getTemplate(templateId: string): PromptTemplate | null {
    return this.templates.get(templateId) || null;
  }

  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  searchTemplates(query: string): PromptTemplate[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(queryLower) ||
      template.description.toLowerCase().includes(queryLower) ||
      template.examples.some(example => example.toLowerCase().includes(queryLower))
    );
  }

  // Prompt generation with variable substitution
  generatePrompt(templateId: string, variables: Record<string, string>): string | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let prompt = template.prompt;
    
    // Substitute variables
    template.variables.forEach(variable => {
      const value = variables[variable] || `[${variable}]`;
      const regex = new RegExp(`{{${variable}}}`, 'g');
      prompt = prompt.replace(regex, value);
    });

    return prompt;
  }

  // Workflow management methods
  getWorkflow(workflowId: string): DevelopmentWorkflow | null {
    return this.workflows.get(workflowId) || null;
  }

  getAllWorkflows(): DevelopmentWorkflow[] {
    return Array.from(this.workflows.values());
  }

  getWorkflowsByAudience(audience: DevelopmentWorkflow['targetAudience']): DevelopmentWorkflow[] {
    return Array.from(this.workflows.values()).filter(w => w.targetAudience === audience);
  }

  getWorkflowsByProjectType(projectType: DevelopmentWorkflow['projectType']): DevelopmentWorkflow[] {
    return Array.from(this.workflows.values()).filter(w => w.projectType === projectType);
  }

  // Intelligent prompt suggestions
  async suggestPrompts(
    userRequest: string,
    context: Partial<AIToolContext>
  ): Promise<{
    templates: PromptTemplate[];
    workflows: DevelopmentWorkflow[];
    recommendations: string[];
  }> {
    const requestLower = userRequest.toLowerCase();
    
    // Analyze request for keywords
    const keywords = this.extractKeywords(requestLower);
    
    // Find matching templates
    const matchingTemplates = this.findMatchingTemplates(keywords, context);
    
    // Find matching workflows
    const matchingWorkflows = this.findMatchingWorkflows(keywords, context);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(keywords, context, matchingTemplates, matchingWorkflows);
    
    return {
      templates: matchingTemplates.slice(0, 5), // Top 5 matches
      workflows: matchingWorkflows.slice(0, 3),  // Top 3 matches
      recommendations
    };
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // Sensor keywords
    if (text.includes('temperature') || text.includes('dht') || text.includes('ds18b20')) {
      keywords.push('temperature', 'sensor');
    }
    if (text.includes('motion') || text.includes('pir')) {
      keywords.push('motion', 'sensor', 'detection');
    }
    if (text.includes('distance') || text.includes('ultrasonic') || text.includes('hc-sr04')) {
      keywords.push('distance', 'ultrasonic', 'sensor');
    }
    
    // Actuator keywords
    if (text.includes('servo') || text.includes('motor')) {
      keywords.push('servo', 'actuator', 'control');
    }
    if (text.includes('stepper')) {
      keywords.push('stepper', 'motor', 'precision');
    }
    
    // Communication keywords
    if (text.includes('wifi') || text.includes('esp32') || text.includes('esp8266')) {
      keywords.push('wifi', 'communication', 'iot');
    }
    if (text.includes('bluetooth') || text.includes('ble')) {
      keywords.push('bluetooth', 'communication', 'wireless');
    }
    
    // Display keywords
    if (text.includes('lcd') || text.includes('display')) {
      keywords.push('lcd', 'display', 'interface');
    }
    if (text.includes('oled')) {
      keywords.push('oled', 'display', 'graphics');
    }
    
    // Project type keywords
    if (text.includes('robot') || text.includes('automation')) {
      keywords.push('robotics', 'automation');
    }
    if (text.includes('iot') || text.includes('internet')) {
      keywords.push('iot', 'connectivity');
    }
    if (text.includes('home') || text.includes('smart')) {
      keywords.push('home-automation', 'smart');
    }
    
    return keywords;
  }

  private findMatchingTemplates(keywords: string[], context: Partial<AIToolContext>): PromptTemplate[] {
    const templates = Array.from(this.templates.values());
    
    return templates
      .map(template => ({
        template,
        score: this.calculateTemplateScore(template, keywords, context)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.template);
  }

  private findMatchingWorkflows(keywords: string[], context: Partial<AIToolContext>): DevelopmentWorkflow[] {
    const workflows = Array.from(this.workflows.values());
    
    return workflows
      .map(workflow => ({
        workflow,
        score: this.calculateWorkflowScore(workflow, keywords, context)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.workflow);
  }

  private calculateTemplateScore(template: PromptTemplate, keywords: string[], context: Partial<AIToolContext>): number {
    let score = 0;
    
    // Match keywords in name and description
    keywords.forEach(keyword => {
      if (template.name.toLowerCase().includes(keyword)) score += 3;
      if (template.description.toLowerCase().includes(keyword)) score += 2;
      if (template.examples.some(ex => ex.toLowerCase().includes(keyword))) score += 1;
    });
    
    // Match project type
    if (context.projectType && template.context.projectType === context.projectType) {
      score += 5;
    }
    
    // Match experience level
    if (context.experienceLevel && template.context.experienceLevel === context.experienceLevel) {
      score += 2;
    }
    
    // Match target board
    if (context.targetBoard && template.context.targetBoard === context.targetBoard) {
      score += 1;
    }
    
    return score;
  }

  private calculateWorkflowScore(workflow: DevelopmentWorkflow, keywords: string[], context: Partial<AIToolContext>): number {
    let score = 0;
    
    // Match keywords in name and description
    keywords.forEach(keyword => {
      if (workflow.name.toLowerCase().includes(keyword)) score += 3;
      if (workflow.description.toLowerCase().includes(keyword)) score += 2;
    });
    
    // Match project type
    if (context.projectType && workflow.projectType === context.projectType) {
      score += 10;
    }
    
    // Match experience level
    if (context.experienceLevel && workflow.targetAudience === context.experienceLevel) {
      score += 5;
    }
    
    return score;
  }

  private generateRecommendations(
    keywords: string[],
    context: Partial<AIToolContext>,
    templates: PromptTemplate[],
    workflows: DevelopmentWorkflow[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (templates.length > 0) {
      recommendations.push(`Consider using the "${templates[0].name}" template for your project`);
    }
    
    if (workflows.length > 0) {
      recommendations.push(`Follow the "${workflows[0].name}" workflow for structured development`);
    }
    
    // Experience-based recommendations
    if (context.experienceLevel === 'beginner') {
      recommendations.push('Start with simple sensor projects before attempting complex systems');
      recommendations.push('Use breadboards for prototyping before moving to permanent solutions');
    } else if (context.experienceLevel === 'advanced') {
      recommendations.push('Consider custom PCB design for professional projects');
      recommendations.push('Implement comprehensive testing and validation procedures');
    }
    
    // Project type recommendations
    if (context.projectType === 'iot-project') {
      recommendations.push('Plan for network connectivity issues and implement offline capabilities');
      recommendations.push('Consider security implications for connected devices');
    } else if (context.projectType === 'robotics') {
      recommendations.push('Implement safety mechanisms and emergency stops');
      recommendations.push('Use sensor fusion for improved accuracy and reliability');
    }
    
    return recommendations;
  }

  // Advanced prompt generation with AI integration
  async generateAdvancedPrompt(
    userRequest: string,
    context: AIToolContext,
    templateId?: string
  ): Promise<{
    prompt: string;
    suggestedVariables: Record<string, string>;
    nextSteps: string[];
    estimatedComplexity: 'low' | 'medium' | 'high' | 'expert';
  }> {
    let baseTemplate: PromptTemplate | null = null;
    
    if (templateId) {
      baseTemplate = this.getTemplate(templateId);
    } else {
      // Auto-select best template
      const suggestions = await this.suggestPrompts(userRequest, context);
      baseTemplate = suggestions.templates[0] || null;
    }
    
    if (!baseTemplate) {
      // Generate custom prompt
      return this.generateCustomPrompt(userRequest, context);
    }
    
    // Extract variables from user request
    const suggestedVariables = this.extractVariablesFromRequest(userRequest, baseTemplate.variables);
    
    // Generate prompt with variables
    const prompt = this.generatePrompt(baseTemplate.id, suggestedVariables) || baseTemplate.prompt;
    
    // Estimate complexity
    const complexity = this.estimateComplexity(userRequest, context);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(userRequest, context, complexity);
    
    return {
      prompt,
      suggestedVariables,
      nextSteps,
      estimatedComplexity: complexity
    };
  }

  private generateCustomPrompt(userRequest: string, context: AIToolContext): {
    prompt: string;
    suggestedVariables: Record<string, string>;
    nextSteps: string[];
    estimatedComplexity: 'low' | 'medium' | 'high' | 'expert';
  } {
    const prompt = `Create Arduino code for: ${userRequest}

Project Context:
- Target Board: ${context.targetBoard}
- Project Type: ${context.projectType}
- Experience Level: ${context.experienceLevel}
- Programming Language: ${context.programmingLanguage}

Requirements:
1. Write clean, well-documented code
2. Include proper error handling
3. Follow Arduino best practices
4. Consider ${context.powerRequirements} power requirements
5. Design for ${context.environmentalConditions} environment

Implementation Details:
- Include all necessary library imports
- Provide clear pin assignments
- Add comprehensive comments
- Include testing and validation code
- Consider scalability and maintainability`;

    const complexity = this.estimateComplexity(userRequest, context);
    const nextSteps = this.generateNextSteps(userRequest, context, complexity);

    return {
      prompt,
      suggestedVariables: {},
      nextSteps,
      estimatedComplexity: complexity
    };
  }

  private extractVariablesFromRequest(request: string, variables: string[]): Record<string, string> {
    const extracted: Record<string, string> = {};
    const requestLower = request.toLowerCase();
    
    variables.forEach(variable => {
      switch (variable) {
        case 'SENSOR_TYPE':
          if (requestLower.includes('dht22')) extracted[variable] = 'DHT22';
          else if (requestLower.includes('dht11')) extracted[variable] = 'DHT11';
          else if (requestLower.includes('ds18b20')) extracted[variable] = 'DS18B20';
          else if (requestLower.includes('hc-sr04')) extracted[variable] = 'HC-SR04';
          else if (requestLower.includes('pir')) extracted[variable] = 'PIR Motion Sensor';
          break;
          
        case 'TARGET_BOARD':
          if (requestLower.includes('esp32')) extracted[variable] = 'ESP32';
          else if (requestLower.includes('esp8266')) extracted[variable] = 'ESP8266';
          else if (requestLower.includes('uno')) extracted[variable] = 'Arduino Uno';
          else if (requestLower.includes('nano')) extracted[variable] = 'Arduino Nano';
          else if (requestLower.includes('mega')) extracted[variable] = 'Arduino Mega';
          break;
          
        case 'APPLICATION':
          if (requestLower.includes('greenhouse')) extracted[variable] = 'greenhouse monitoring';
          else if (requestLower.includes('weather')) extracted[variable] = 'weather station';
          else if (requestLower.includes('security')) extracted[variable] = 'security system';
          else if (requestLower.includes('robot')) extracted[variable] = 'robotics application';
          break;
          
        // Add more variable extraction logic as needed
      }
    });
    
    return extracted;
  }

  private estimateComplexity(request: string, context: AIToolContext): 'low' | 'medium' | 'high' | 'expert' {
    let complexityScore = 0;
    const requestLower = request.toLowerCase();
    
    // Basic project indicators
    if (requestLower.includes('simple') || requestLower.includes('basic')) complexityScore -= 1;
    if (requestLower.includes('advanced') || requestLower.includes('complex')) complexityScore += 2;
    
    // Technology complexity
    if (requestLower.includes('wifi') || requestLower.includes('bluetooth')) complexityScore += 1;
    if (requestLower.includes('motor') || requestLower.includes('servo')) complexityScore += 1;
    if (requestLower.includes('multiple') || requestLower.includes('many')) complexityScore += 1;
    if (requestLower.includes('real-time') || requestLower.includes('precision')) complexityScore += 2;
    
    // Context-based complexity
    if (context.projectType === 'robotics' || context.projectType === 'industrial') complexityScore += 2;
    if (context.experienceLevel === 'expert') complexityScore += 1;
    if (context.environmentalConditions === 'harsh' || context.environmentalConditions === 'outdoor') complexityScore += 1;
    
    if (complexityScore <= 0) return 'low';
    if (complexityScore <= 2) return 'medium';
    if (complexityScore <= 4) return 'high';
    return 'expert';
  }

  private generateNextSteps(
    request: string,
    context: AIToolContext,
    complexity: 'low' | 'medium' | 'high' | 'expert'
  ): string[] {
    const steps: string[] = [];
    
    // Base steps for all projects
    steps.push('Review and understand the generated code');
    steps.push('Gather required components and tools');
    steps.push('Set up development environment');
    
    // Complexity-based steps
    switch (complexity) {
      case 'low':
        steps.push('Follow breadboard wiring diagram');
        steps.push('Upload code and test basic functionality');
        steps.push('Make minor adjustments as needed');
        break;
        
      case 'medium':
        steps.push('Create detailed wiring diagram');
        steps.push('Test components individually');
        steps.push('Integrate and test complete system');
        steps.push('Debug and optimize performance');
        break;
        
      case 'high':
        steps.push('Design system architecture');
        steps.push('Create comprehensive test plan');
        steps.push('Implement in phases with validation');
        steps.push('Conduct thorough system testing');
        steps.push('Create technical documentation');
        break;
        
      case 'expert':
        steps.push('Conduct feasibility analysis');
        steps.push('Design custom PCB if needed');
        steps.push('Implement safety and error handling');
        steps.push('Perform extensive validation testing');
        steps.push('Create production documentation');
        steps.push('Plan maintenance and support procedures');
        break;
    }
    
    // Project-specific steps
    if (context.projectType === 'iot-project') {
      steps.push('Set up cloud infrastructure');
      steps.push('Implement security measures');
      steps.push('Test network connectivity and reliability');
    } else if (context.projectType === 'robotics') {
      steps.push('Calibrate sensors and actuators');
      steps.push('Test safety mechanisms');
      steps.push('Validate motion control algorithms');
    }
    
    return steps;
  }
}

export default ArduinoPromptEngine;
