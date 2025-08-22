import { EventEmitter } from 'events';
import { AIHardwareRecognition, HardwareComponent, ProjectRequirements } from './aiHardwareRecognition';
import { ReferenceManager } from './referenceManager';

export interface AIToolContext {
  projectType: 'sensor-project' | 'iot-project' | 'robotics' | 'home-automation' | 'wearable' | 'educational' | 'industrial' | 'prototyping';
  targetBoard: 'arduino-uno' | 'esp32' | 'esp8266' | 'nano' | 'mega' | 'micro' | 'leonardo' | 'custom';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  programmingLanguage: 'arduino-c' | 'micropython' | 'platformio' | 'esp-idf';
  communicationProtocols: string[];
  powerRequirements: 'battery' | 'usb' | 'wall-adapter' | 'solar' | 'low-power';
  environmentalConditions: 'indoor' | 'outdoor' | 'harsh' | 'marine' | 'automotive';
  budget?: number;
  timeframe?: string;
  specialRequirements?: string[];
}

export interface CodeGenerationRequest {
  description: string;
  components: string[];
  features: string[];
  constraints?: string[];
  codeStyle: 'clean' | 'commented' | 'educational' | 'production' | 'compact';
  includeLibraries: boolean;
  includeTesting: boolean;
  optimizeFor: 'readability' | 'performance' | 'memory' | 'power-efficiency';
}

export interface CodeGenerationResult {
  mainCode: string;
  libraryIncludes: string[];
  pinConfiguration: Record<string, number>;
  setupCode: string;
  loopCode: string;
  helperFunctions: string[];
  comments: string[];
  testingCode?: string;
  documentation: string;
  schematic?: string;
  estimatedResourceUsage: {
    flash: string;
    ram: string;
    powerConsumption: string;
  };
}

export class ArduinoCodeGenAI {
  private referenceManager: ReferenceManager;
  private hardwareRecognition: AIHardwareRecognition;

  constructor(referenceManager: ReferenceManager, hardwareRecognition: AIHardwareRecognition) {
    this.referenceManager = referenceManager;
    this.hardwareRecognition = hardwareRecognition;
  }

  getSystemPrompt(context: AIToolContext): string {
    return `# Arduino/ESP32 Code Generation AI Assistant

You are an expert Arduino and ESP32 development AI assistant specializing in embedded systems programming. Your role is to generate high-quality, production-ready code for microcontroller projects.

## Core Expertise Areas:
- **Hardware Integration**: Arduino Uno, ESP32, ESP8266, sensors, actuators, communication modules
- **Programming Paradigms**: Arduino C/C++, real-time programming, interrupt handling, low-power design
- **Communication Protocols**: I2C, SPI, UART, WiFi, Bluetooth, LoRa, CAN bus, Modbus
- **Industry Standards**: IEC 61131, ISO 26262 (automotive), IP ratings, EMC compliance

## Current Project Context:
- **Project Type**: ${context.projectType}
- **Target Board**: ${context.targetBoard} 
- **Experience Level**: ${context.experienceLevel}
- **Programming Language**: ${context.programmingLanguage}
- **Power Requirements**: ${context.powerRequirements}
- **Environment**: ${context.environmentalConditions}
- **Communication**: ${context.communicationProtocols.join(', ')}

## Code Generation Rules:

### 1. Code Quality Standards
- Write clean, readable, and maintainable code
- Follow Arduino coding conventions and best practices
- Use descriptive variable and function names
- Include comprehensive error handling and validation
- Implement proper memory management
- Add timing considerations and delays where needed

### 2. Hardware Integration
- Always validate pin assignments and voltage levels
- Include proper pull-up/pull-down resistor configurations
- Implement debouncing for mechanical inputs
- Consider signal conditioning and filtering
- Add hardware abstraction layers for complex sensors

### 3. Performance Optimization
- Minimize blocking operations in loop()
- Use interrupts for time-critical operations
- Implement efficient state machines for complex logic
- Optimize memory usage (SRAM, Flash, EEPROM)
- Consider power consumption in battery-powered projects

### 4. Safety and Reliability
- Implement watchdog timers for critical applications
- Add input validation and bounds checking
- Include fail-safe mechanisms and error recovery
- Use appropriate delay strategies (millis() vs delay())
- Implement proper shutdown and reset procedures

### 5. Communication Protocols
- Use appropriate libraries for each protocol
- Implement proper error handling and timeouts
- Add data validation and checksums where needed
- Consider security for wireless communications
- Implement proper addressing and device identification

### 6. Documentation Requirements
- Include clear header comments with project description
- Document all pin assignments and connections
- Explain complex algorithms and calculations
- Provide wiring diagrams in comments
- Include troubleshooting tips and common issues

### 7. Library Management
- Use official and well-maintained libraries when possible
- Include version information for reproducibility
- Minimize library dependencies for simple projects
- Provide alternative implementations when libraries unavailable

## Response Format:
Provide complete, compilable code with:
1. **Header section** with project info and pin assignments
2. **Library includes** with version recommendations
3. **Global variables** and constants with explanations
4. **Setup function** with initialization and validation
5. **Main loop** with efficient state management
6. **Helper functions** with clear purposes
7. **Error handling** and edge case management
8. **Resource usage estimates** (memory, power, timing)

## Specialization Notes:
- For ${context.targetBoard}: Use board-specific optimizations and features
- For ${context.experienceLevel} level: Adjust code complexity and explanation detail
- For ${context.projectType}: Include domain-specific best practices
- For ${context.environmentalConditions}: Consider environmental factors and protection

Always prioritize functionality, safety, and maintainability over clever optimizations unless specifically requested.`;
  }

  async generateCode(request: CodeGenerationRequest, context: AIToolContext): Promise<CodeGenerationResult> {
    const systemPrompt = this.getSystemPrompt(context);
    
    // Get component information
    const componentDetails = await Promise.all(
      request.components.map(id => this.hardwareRecognition.getComponentInfo(id))
    );

    // Generate main code based on project requirements
    const codeResult = await this.generateArduinoCode(request, componentDetails.filter(Boolean) as HardwareComponent[], context);
    
    return codeResult;
  }

  private async generateArduinoCode(
    request: CodeGenerationRequest, 
    components: HardwareComponent[], 
    context: AIToolContext
  ): Promise<CodeGenerationResult> {
    const pinAssignments = this.generatePinAssignments(components, context.targetBoard);
    const libraries = this.collectRequiredLibraries(components, request.features);
    
    const mainCode = this.buildMainCode(request, components, context, pinAssignments);
    const setupCode = this.generateSetupCode(components, context, pinAssignments);
    const loopCode = this.generateLoopCode(request, components, context);
    const helperFunctions = this.generateHelperFunctions(request, components, context);
    
    return {
      mainCode,
      libraryIncludes: libraries,
      pinConfiguration: pinAssignments,
      setupCode,
      loopCode,
      helperFunctions,
      comments: this.generateCodeComments(request, components, context),
      testingCode: request.includeTesting ? this.generateTestingCode(request, components) : undefined,
      documentation: this.generateDocumentation(request, components, context),
      schematic: this.generateSchematicDescription(components, pinAssignments),
      estimatedResourceUsage: this.estimateResourceUsage(request, components, context)
    };
  }

  private generatePinAssignments(components: HardwareComponent[], targetBoard: string): Record<string, number> {
    const assignments: Record<string, number> = {};
    let digitalPin = 2; // Start from D2, leave D0/D1 for serial
    let analogPin = 0;

    components.forEach(component => {
      component.pinout.forEach(pin => {
        if (pin.type === 'digital' && !pin.name.includes('VCC') && !pin.name.includes('GND')) {
          const pinName = `${component.name}_${pin.name}`;
          if (pin.alternativeFunctions?.includes('PWM') && digitalPin <= 13) {
            assignments[pinName] = digitalPin++;
          } else {
            assignments[pinName] = digitalPin++;
          }
        } else if (pin.type === 'analog') {
          const pinName = `${component.name}_${pin.name}`;
          assignments[pinName] = analogPin++;
        }
      });
    });

    return assignments;
  }

  private collectRequiredLibraries(components: HardwareComponent[], features: string[]): string[] {
    const libraries = new Set<string>();
    
    components.forEach(component => {
      component.libraries.forEach(lib => libraries.add(lib));
    });

    // Add feature-specific libraries
    features.forEach(feature => {
      const featureLower = feature.toLowerCase();
      if (featureLower.includes('wifi')) libraries.add('WiFi');
      if (featureLower.includes('bluetooth')) libraries.add('BluetoothSerial');
      if (featureLower.includes('servo')) libraries.add('Servo');
      if (featureLower.includes('stepper')) libraries.add('Stepper');
      if (featureLower.includes('lcd')) libraries.add('LiquidCrystal');
      if (featureLower.includes('oled')) libraries.add('Adafruit_SSD1306');
      if (featureLower.includes('rtc')) libraries.add('RTClib');
      if (featureLower.includes('sd')) libraries.add('SD');
      if (featureLower.includes('eeprom')) libraries.add('EEPROM');
    });

    return Array.from(libraries);
  }

  private buildMainCode(
    request: CodeGenerationRequest,
    components: HardwareComponent[],
    context: AIToolContext,
    pinAssignments: Record<string, number>
  ): string {
    const libraries = this.collectRequiredLibraries(components, request.features);
    const header = this.generateFileHeader(request, components, context);
    const includes = libraries.map(lib => `#include <${lib}.h>`).join('\n');
    const constants = this.generateConstants(components, pinAssignments);
    const globalVars = this.generateGlobalVariables(components, context);
    
    return `${header}

${includes}

${constants}

${globalVars}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  Serial.println("=== ${request.description} ===");
  Serial.println("Initializing system...");
  
  ${this.generateSetupCode(components, context, pinAssignments)}
  
  Serial.println("System ready!");
}

void loop() {
  ${this.generateLoopCode(request, components, context)}
}

${this.generateHelperFunctions(request, components, context).join('\n\n')}`;
  }

  private generateFileHeader(request: CodeGenerationRequest, components: HardwareComponent[], context: AIToolContext): string {
    const componentList = components.map(c => c.name).join(', ');
    
    return `/*
 * Project: ${request.description}
 * Board: ${context.targetBoard.toUpperCase()}
 * Components: ${componentList}
 * 
 * Description:
 * ${request.description}
 * 
 * Features:
 * ${request.features.map(f => `- ${f}`).join('\n * ')}
 * 
 * Pin Assignments:
 * (See constants section below)
 * 
 * Power Requirements: ${context.powerRequirements}
 * Environment: ${context.environmentalConditions}
 * 
 * Author: Arduino AI Assistant
 * Created: ${new Date().toISOString().split('T')[0]}
 * Version: 1.0
 * 
 * Safety Notes:
 * - Always verify connections before powering on
 * - Check voltage levels for all components
 * - Use appropriate current limiting resistors
 * - Consider EMI/EMC requirements for wireless projects
 */`;
  }

  private generateConstants(components: HardwareComponent[], pinAssignments: Record<string, number>): string {
    let constants = '// Pin Definitions\n';
    
    Object.entries(pinAssignments).forEach(([name, pin]) => {
      const constName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      constants += `#define ${constName} ${pin}\n`;
    });

    constants += '\n// Configuration Constants\n';
    constants += '#define BAUD_RATE 115200\n';
    constants += '#define LOOP_DELAY_MS 100\n';
    constants += '#define ERROR_LED_PIN LED_BUILTIN\n';

    // Add component-specific constants
    components.forEach(component => {
      if (component.type === 'sensor') {
        constants += `#define ${component.name.toUpperCase()}_SAMPLE_RATE 1000  // ms\n`;
      }
    });

    return constants;
  }

  private generateGlobalVariables(components: HardwareComponent[], context: AIToolContext): string {
    let variables = '\n// Global Variables\n';
    
    variables += 'unsigned long lastUpdateTime = 0;\n';
    variables += 'bool systemError = false;\n';
    variables += 'int errorCode = 0;\n';

    // Component-specific variables
    components.forEach(component => {
      switch (component.type) {
        case 'sensor':
          variables += `float ${component.name.toLowerCase()}Value = 0.0;\n`;
          variables += `unsigned long last${component.name}Reading = 0;\n`;
          break;
        case 'actuator':
          variables += `int ${component.name.toLowerCase()}Position = 0;\n`;
          variables += `bool ${component.name.toLowerCase()}Active = false;\n`;
          break;
      }
    });

    if (context.targetBoard.includes('esp')) {
      variables += '\n// WiFi Variables (ESP32/ESP8266)\n';
      variables += 'bool wifiConnected = false;\n';
      variables += 'unsigned long wifiRetryTime = 0;\n';
    }

    return variables;
  }

  private generateSetupCode(components: HardwareComponent[], context: AIToolContext, pinAssignments: Record<string, number>): string {
    let setupCode = '  // Pin Configuration\n';
    
    Object.entries(pinAssignments).forEach(([name, pin]) => {
      if (name.includes('LED') || name.includes('OUTPUT')) {
        setupCode += `  pinMode(${pin}, OUTPUT);\n`;
      } else if (name.includes('BUTTON') || name.includes('INPUT')) {
        setupCode += `  pinMode(${pin}, INPUT_PULLUP);\n`;
      } else {
        setupCode += `  pinMode(${pin}, INPUT);\n`;
      }
    });

    setupCode += '\n  // Component Initialization\n';
    
    components.forEach(component => {
      switch (component.type) {
        case 'sensor':
          setupCode += `  // Initialize ${component.name}\n`;
          if (component.libraries.includes('DHT sensor library')) {
            setupCode += `  dht.begin();\n`;
          }
          break;
        case 'actuator':
          if (component.name.toLowerCase().includes('servo')) {
            setupCode += `  servo.attach(${pinAssignments[`${component.name}_PWM`] || 9});\n`;
          }
          break;
      }
    });

    if (context.targetBoard.includes('esp')) {
      setupCode += '\n  // WiFi Setup (ESP32/ESP8266)\n';
      setupCode += '  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");\n';
      setupCode += '  connectWiFi();\n';
    }

    setupCode += '\n  // System Validation\n';
    setupCode += '  validateSystem();\n';

    return setupCode;
  }

  private generateLoopCode(request: CodeGenerationRequest, components: HardwareComponent[], context: AIToolContext): string {
    let loopCode = '  unsigned long currentTime = millis();\n\n';
    
    loopCode += '  // Error Handling\n';
    loopCode += '  if (systemError) {\n';
    loopCode += '    handleSystemError();\n';
    loopCode += '    return;\n';
    loopCode += '  }\n\n';

    // Main functionality based on project type
    switch (context.projectType) {
      case 'sensor-project':
        loopCode += this.generateSensorLoopCode(components);
        break;
      case 'iot-project':
        loopCode += this.generateIoTLoopCode(components, context);
        break;
      case 'robotics':
        loopCode += this.generateRoboticsLoopCode(components);
        break;
      case 'home-automation':
        loopCode += this.generateHomeAutomationLoopCode(components);
        break;
      default:
        loopCode += this.generateGenericLoopCode(components);
    }

    loopCode += '\n  // Update timing\n';
    loopCode += '  lastUpdateTime = currentTime;\n';
    loopCode += '  delay(LOOP_DELAY_MS);\n';

    return loopCode;
  }

  private generateSensorLoopCode(components: HardwareComponent[]): string {
    let code = '  // Sensor Reading Loop\n';
    code += '  if (currentTime - lastUpdateTime >= 1000) {\n';
    
    components.filter(c => c.type === 'sensor').forEach(sensor => {
      code += `    // Read ${sensor.name}\n`;
      if (sensor.name.includes('DHT')) {
        code += `    float temperature = dht.readTemperature();\n`;
        code += `    float humidity = dht.readHumidity();\n`;
        code += `    if (!isnan(temperature) && !isnan(humidity)) {\n`;
        code += `      Serial.print("Temperature: "); Serial.print(temperature); Serial.println("°C");\n`;
        code += `      Serial.print("Humidity: "); Serial.print(humidity); Serial.println("%");\n`;
        code += `    }\n`;
      } else if (sensor.name.includes('HC-SR04')) {
        code += `    long distance = readUltrasonicDistance();\n`;
        code += `    Serial.print("Distance: "); Serial.print(distance); Serial.println(" cm");\n`;
      }
    });
    
    code += '  }\n';
    return code;
  }

  private generateIoTLoopCode(components: HardwareComponent[], context: AIToolContext): string {
    let code = '  // IoT Communication Loop\n';
    code += '  if (!wifiConnected) {\n';
    code += '    connectWiFi();\n';
    code += '    return;\n';
    code += '  }\n\n';
    
    code += '  // Data Collection and Transmission\n';
    code += '  if (currentTime - lastUpdateTime >= 30000) { // Every 30 seconds\n';
    code += '    collectSensorData();\n';
    code += '    transmitData();\n';
    code += '  }\n';
    
    return code;
  }

  private generateRoboticsLoopCode(components: HardwareComponent[]): string {
    let code = '  // Robotics Control Loop\n';
    code += '  readSensors();\n';
    code += '  processDecisions();\n';
    code += '  updateActuators();\n';
    code += '  logStatus();\n';
    
    return code;
  }

  private generateHomeAutomationLoopCode(components: HardwareComponent[]): string {
    let code = '  // Home Automation Loop\n';
    code += '  checkInputs();\n';
    code += '  processAutomationRules();\n';
    code += '  updateOutputs();\n';
    code += '  handleRemoteCommands();\n';
    
    return code;
  }

  private generateGenericLoopCode(components: HardwareComponent[]): string {
    let code = '  // Generic Project Loop\n';
    code += '  if (currentTime - lastUpdateTime >= 1000) {\n';
    code += '    // Read inputs\n';
    code += '    readAllSensors();\n';
    code += '    \n';
    code += '    // Process logic\n';
    code += '    processMainLogic();\n';
    code += '    \n';
    code += '    // Update outputs\n';
    code += '    updateAllOutputs();\n';
    code += '  }\n';
    
    return code;
  }

  private generateHelperFunctions(request: CodeGenerationRequest, components: HardwareComponent[], context: AIToolContext): string[] {
    const functions: string[] = [];

    // Standard helper functions
    functions.push(this.generateValidateSystemFunction());
    functions.push(this.generateErrorHandlingFunction());

    // Component-specific functions
    components.forEach(component => {
      if (component.name.includes('HC-SR04')) {
        functions.push(this.generateUltrasonicFunction());
      }
      if (component.name.includes('servo')) {
        functions.push(this.generateServoControlFunction());
      }
    });

    // Context-specific functions
    if (context.targetBoard.includes('esp')) {
      functions.push(this.generateWiFiConnectionFunction());
    }

    if (context.projectType === 'iot-project') {
      functions.push(this.generateDataTransmissionFunction());
    }

    return functions;
  }

  private generateValidateSystemFunction(): string {
    return `void validateSystem() {
  Serial.println("Validating system components...");
  
  // Test all pin configurations
  // Add specific validation tests here
  
  Serial.println("System validation complete.");
}`;
  }

  private generateErrorHandlingFunction(): string {
    return `void handleSystemError() {
  digitalWrite(ERROR_LED_PIN, HIGH);
  Serial.print("System Error Code: ");
  Serial.println(errorCode);
  
  // Attempt recovery based on error code
  switch (errorCode) {
    case 1: // Communication error
      Serial.println("Attempting communication recovery...");
      break;
    case 2: // Sensor error
      Serial.println("Attempting sensor recovery...");
      break;
    default:
      Serial.println("Unknown error - system halt");
      while(1) { delay(1000); } // Halt system
  }
  
  digitalWrite(ERROR_LED_PIN, LOW);
  systemError = false;
  errorCode = 0;
}`;
  }

  private generateUltrasonicFunction(): string {
    return `long readUltrasonicDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  long distance = duration * 0.034 / 2;
  
  if (distance > 400 || distance < 2) {
    Serial.println("Distance out of range");
    return -1;
  }
  
  return distance;
}`;
  }

  private generateServoControlFunction(): string {
    return `void controlServo(int targetPosition) {
  if (targetPosition < 0 || targetPosition > 180) {
    Serial.println("Servo position out of range (0-180)");
    return;
  }
  
  servo.write(targetPosition);
  delay(15); // Allow servo to reach position
  
  Serial.print("Servo moved to: ");
  Serial.println(targetPosition);
}`;
  }

  private generateWiFiConnectionFunction(): string {
    return `void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }
  
  Serial.println("Connecting to WiFi...");
  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.print("Connected! IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}`;
  }

  private generateDataTransmissionFunction(): string {
    return `void transmitData() {
  if (!wifiConnected) return;
  
  // Create JSON payload
  String payload = "{";
  payload += "\\"timestamp\\":" + String(millis()) + ",";
  payload += "\\"data\\":{";
  // Add sensor data here
  payload += "}";
  payload += "}";
  
  // Transmit via HTTP/MQTT/etc.
  Serial.println("Transmitting data: " + payload);
  
  // Implementation depends on chosen protocol
}`;
  }

  private generateCodeComments(request: CodeGenerationRequest, components: HardwareComponent[], context: AIToolContext): string[] {
    return [
      `Project optimized for ${request.optimizeFor}`,
      `Code style: ${request.codeStyle}`,
      `Target environment: ${context.environmentalConditions}`,
      `Power requirements: ${context.powerRequirements}`,
      `Experience level: ${context.experienceLevel}`
    ];
  }

  private generateTestingCode(request: CodeGenerationRequest, components: HardwareComponent[]): string {
    return `// Testing Functions
void runSystemTests() {
  Serial.println("=== System Tests ===");
  
  // Test each component
  ${components.map(c => `test${c.name.replace(/[^a-zA-Z0-9]/g, '')}();`).join('\n  ')}
  
  Serial.println("=== Tests Complete ===");
}

${components.map(component => 
  `void test${component.name.replace(/[^a-zA-Z0-9]/g, '')}() {
  Serial.println("Testing ${component.name}...");
  // Add specific test for ${component.name}
  Serial.println("${component.name} test passed");
}`
).join('\n\n')}`;
  }

  private generateDocumentation(request: CodeGenerationRequest, components: HardwareComponent[], context: AIToolContext): string {
    return `# ${request.description}

## Hardware Requirements
${components.map(c => `- ${c.name} (${c.partNumber || 'Generic'})`).join('\n')}

## Wiring Diagram
[Include detailed wiring diagram here]

## Installation
1. Install required libraries in Arduino IDE
2. Connect components according to pin assignments
3. Upload code to ${context.targetBoard}
4. Open Serial Monitor (115200 baud)

## Configuration
- Modify pin assignments in constants section
- Update WiFi credentials for ESP32/ESP8266 projects
- Adjust sampling rates and delays as needed

## Troubleshooting
- Check all connections
- Verify power supply voltages
- Monitor Serial output for error messages
- Validate component specifications

## Performance Notes
- Estimated flash usage: ${this.estimateResourceUsage(request, components, context).flash}
- Estimated RAM usage: ${this.estimateResourceUsage(request, components, context).ram}
- Power consumption: ${this.estimateResourceUsage(request, components, context).powerConsumption}`;
  }

  private generateSchematicDescription(components: HardwareComponent[], pinAssignments: Record<string, number>): string {
    let schematic = 'ASCII Schematic:\n';
    schematic += '================\n\n';
    
    schematic += 'Arduino/ESP32\n';
    schematic += '┌─────────────┐\n';
    
    Object.entries(pinAssignments).forEach(([name, pin]) => {
      schematic += `│ Pin ${pin.toString().padStart(2)} ├─── ${name}\n`;
    });
    
    schematic += '└─────────────┘\n\n';
    
    schematic += 'Component Connections:\n';
    components.forEach(component => {
      schematic += `\n${component.name}:\n`;
      component.pinout.forEach(pin => {
        schematic += `  ${pin.name}: ${pin.function}\n`;
      });
    });
    
    return schematic;
  }

  private estimateResourceUsage(request: CodeGenerationRequest, components: HardwareComponent[], context: AIToolContext): {
    flash: string;
    ram: string;
    powerConsumption: string;
  } {
    // Rough estimates based on components and features
    let flashEstimate = 8000; // Base Arduino code
    let ramEstimate = 500;    // Base variables
    let powerEstimate = 50;   // Base board consumption (mA)

    components.forEach(component => {
      flashEstimate += 1000; // Each component adds ~1KB
      ramEstimate += 50;     // Each component adds ~50 bytes
      
      // Component-specific power estimates
      switch (component.type) {
        case 'display':
          powerEstimate += 20; // LCD/OLED display
          break;
        case 'communication':
          powerEstimate += 100; // WiFi/Bluetooth modules
          break;
        case 'actuator':
          powerEstimate += 200; // Motors/servos
          break;
        case 'sensor':
          powerEstimate += 5;   // Most sensors
          break;
      }
    });

    // Add feature overhead
    request.features.forEach(feature => {
      if (feature.toLowerCase().includes('wifi')) {
        flashEstimate += 5000;
        ramEstimate += 200;
        powerEstimate += 80;
      }
    });

    return {
      flash: `${flashEstimate} bytes (${((flashEstimate/32768)*100).toFixed(1)}% of 32KB)`,
      ram: `${ramEstimate} bytes (${((ramEstimate/2048)*100).toFixed(1)}% of 2KB)`,
      powerConsumption: `~${powerEstimate}mA`
    };
  }
}

export class ArduinoProjectAI {
  private codeGenAI: ArduinoCodeGenAI;
  private hardwareRecognition: AIHardwareRecognition;

  constructor(codeGenAI: ArduinoCodeGenAI, hardwareRecognition: AIHardwareRecognition) {
    this.codeGenAI = codeGenAI;
    this.hardwareRecognition = hardwareRecognition;
  }

  getSystemPrompt(): string {
    return `# Arduino Project Planning AI Assistant

You are an expert Arduino project consultant specializing in embedded systems design and implementation. Your role is to help users plan, design, and implement Arduino and ESP32 projects from concept to completion.

## Core Competencies:
- **Project Architecture**: System design, component selection, integration planning
- **Hardware Design**: Circuit design, PCB layout, component sourcing, power management
- **Software Architecture**: Code structure, library selection, performance optimization
- **Testing & Validation**: Test planning, debugging strategies, quality assurance
- **Documentation**: Technical documentation, user guides, maintenance procedures

## Project Planning Process:

### 1. Requirements Analysis
- Understand project goals and constraints
- Identify functional and non-functional requirements
- Assess technical feasibility and complexity
- Determine budget and timeline constraints
- Consider regulatory and safety requirements

### 2. System Architecture
- Design overall system architecture
- Define subsystem interfaces and communication protocols
- Plan power distribution and management
- Consider environmental and mechanical constraints
- Design for maintainability and upgradability

### 3. Component Selection
- Research and recommend appropriate components
- Consider cost, availability, and long-term support
- Evaluate performance characteristics and specifications
- Plan for component obsolescence and alternatives
- Consider supply chain and procurement strategies

### 4. Implementation Planning
- Break down project into manageable phases
- Define development milestones and deliverables
- Plan testing and validation procedures
- Consider integration and system-level testing
- Plan documentation and user training

### 5. Risk Assessment
- Identify technical and project risks
- Develop mitigation strategies
- Plan contingency approaches
- Consider safety and reliability requirements
- Plan for field support and maintenance

## Response Guidelines:
- Provide comprehensive project plans with clear phases
- Include detailed component recommendations with justifications
- Offer multiple implementation approaches when appropriate
- Consider both technical and business aspects
- Include realistic timelines and resource estimates
- Provide actionable next steps and milestones

Always prioritize user safety, project feasibility, and long-term maintainability in your recommendations.`;
  }

  async planProject(requirements: ProjectRequirements): Promise<{
    projectPlan: string;
    recommendedComponents: HardwareComponent[];
    implementationPhases: string[];
    riskAssessment: string[];
    estimatedTimeline: string;
    budgetEstimate: number;
  }> {
    const suggestions = await this.hardwareRecognition.suggestComponents(requirements);
    const recommendedComponents = suggestions.slice(0, 10).map(s => s.component);
    
    return {
      projectPlan: this.generateProjectPlan(requirements, recommendedComponents),
      recommendedComponents,
      implementationPhases: this.generateImplementationPhases(requirements, recommendedComponents),
      riskAssessment: this.generateRiskAssessment(requirements, recommendedComponents),
      estimatedTimeline: this.estimateTimeline(requirements, recommendedComponents),
      budgetEstimate: this.estimateBudget(recommendedComponents, requirements)
    };
  }

  private generateProjectPlan(requirements: ProjectRequirements, components: HardwareComponent[]): string {
    return `# Project Plan: ${requirements.description}

## Project Overview
${requirements.description}

## Functional Requirements
${requirements.functions.map(f => `- ${f}`).join('\n')}

## System Architecture
The system will consist of:
${components.map(c => `- ${c.name}: ${c.description}`).join('\n')}

## Technical Specifications
- Primary Controller: ${this.selectPrimaryController(components)}
- Communication: ${this.identifyCommunicationNeeds(requirements)}
- Power Requirements: ${requirements.constraints.powerConsumption || 'Standard 5V/3.3V'}
- Operating Environment: ${requirements.constraints.operatingEnvironment || 'Indoor'}

## Success Criteria
- All functional requirements met
- System operates reliably in target environment
- Performance meets specified requirements
- User interface is intuitive and responsive
- System is maintainable and upgradeable`;
  }

  private generateImplementationPhases(requirements: ProjectRequirements, components: HardwareComponent[]): string[] {
    return [
      'Phase 1: Hardware Procurement and Basic Setup',
      'Phase 2: Individual Component Testing and Validation',
      'Phase 3: Core Functionality Implementation',
      'Phase 4: Integration and System Testing',
      'Phase 5: User Interface and Experience Enhancement',
      'Phase 6: Performance Optimization and Documentation',
      'Phase 7: Final Testing and Deployment'
    ];
  }

  private generateRiskAssessment(requirements: ProjectRequirements, components: HardwareComponent[]): string[] {
    const risks: string[] = [];
    
    if (components.some(c => c.availability === 'limited')) {
      risks.push('Component availability risk - some components have limited stock');
    }
    
    if (requirements.constraints.budget && requirements.constraints.budget < 50) {
      risks.push('Budget constraint risk - tight budget may limit component choices');
    }
    
    if (requirements.constraints.operatingEnvironment === 'outdoor') {
      risks.push('Environmental risk - outdoor operation requires weatherproofing');
    }
    
    risks.push('Technical complexity risk - ensure adequate skill level for implementation');
    risks.push('Integration risk - component compatibility and timing issues');
    
    return risks;
  }

  private estimateTimeline(requirements: ProjectRequirements, components: HardwareComponent[]): string {
    const baseWeeks = 2;
    const componentComplexity = components.length * 0.5;
    const functionalComplexity = requirements.functions.length * 0.3;
    
    const totalWeeks = baseWeeks + componentComplexity + functionalComplexity;
    
    return `Estimated ${Math.ceil(totalWeeks)} weeks for complete implementation`;
  }

  private estimateBudget(components: HardwareComponent[], requirements: ProjectRequirements): number {
    let totalCost = 0;
    
    components.forEach(component => {
      if (component.price) {
        totalCost += component.price;
      } else {
        // Rough estimates for unknown prices
        switch (component.type) {
          case 'microcontroller':
            totalCost += 25;
            break;
          case 'sensor':
            totalCost += 10;
            break;
          case 'actuator':
            totalCost += 15;
            break;
          case 'display':
            totalCost += 20;
            break;
          default:
            totalCost += 5;
        }
      }
    });
    
    // Add 30% for miscellaneous components (wires, resistors, etc.)
    totalCost *= 1.3;
    
    return Math.round(totalCost);
  }

  private selectPrimaryController(components: HardwareComponent[]): string {
    const controller = components.find(c => c.type === 'microcontroller');
    return controller ? controller.name : 'Arduino Uno R3 (recommended)';
  }

  private identifyCommunicationNeeds(requirements: ProjectRequirements): string {
    const description = requirements.description.toLowerCase();
    const functions = requirements.functions.join(' ').toLowerCase();
    
    const protocols: string[] = [];
    
    if (description.includes('wifi') || functions.includes('wifi')) protocols.push('WiFi');
    if (description.includes('bluetooth') || functions.includes('bluetooth')) protocols.push('Bluetooth');
    if (description.includes('serial') || functions.includes('serial')) protocols.push('Serial UART');
    if (description.includes('i2c') || functions.includes('i2c')) protocols.push('I2C');
    if (description.includes('spi') || functions.includes('spi')) protocols.push('SPI');
    
    return protocols.length > 0 ? protocols.join(', ') : 'Standard digital I/O';
  }
}

// Specialized AI Tool for different domains
export class SpecializedArduinoAI extends EventEmitter {
  private codeGenAI: ArduinoCodeGenAI;
  private projectAI: ArduinoProjectAI;
  private hardwareRecognition: AIHardwareRecognition;

  constructor(
    codeGenAI: ArduinoCodeGenAI,
    projectAI: ArduinoProjectAI,
    hardwareRecognition: AIHardwareRecognition
  ) {
    super();
    this.codeGenAI = codeGenAI;
    this.projectAI = projectAI;
    this.hardwareRecognition = hardwareRecognition;
  }

  // IoT Specialist
  getIoTSpecialistPrompt(): string {
    return `# IoT Arduino Specialist AI

You are an expert IoT (Internet of Things) developer specializing in connected Arduino and ESP32 projects. Your expertise covers cloud connectivity, edge computing, sensor networks, and industrial IoT applications.

## Specialization Areas:
- **Connectivity**: WiFi, Bluetooth, LoRa, NB-IoT, 5G modules
- **Cloud Platforms**: AWS IoT, Azure IoT, Google Cloud IoT, ThingSpeak, Blynk
- **Protocols**: MQTT, HTTP/HTTPS, CoAP, WebSocket, OPC-UA
- **Security**: TLS/SSL, device authentication, secure boot, OTA updates
- **Edge Computing**: Local data processing, offline capabilities, edge AI
- **Power Management**: Deep sleep, battery optimization, energy harvesting

## IoT System Design Principles:
1. **Scalability**: Design for multiple device deployment
2. **Reliability**: Handle network disconnections gracefully
3. **Security**: Implement end-to-end encryption and authentication
4. **Efficiency**: Optimize bandwidth and power consumption
5. **Maintainability**: Enable remote monitoring and updates

Always consider network reliability, data security, and power efficiency in IoT projects.`;
  }

  // Robotics Specialist
  getRoboticsSpecialistPrompt(): string {
    return `# Robotics Arduino Specialist AI

You are an expert robotics engineer specializing in Arduino-based robotic systems, autonomous vehicles, and mechatronic applications.

## Specialization Areas:
- **Motion Control**: Servo motors, stepper motors, DC motors, PID control
- **Sensors**: IMU, encoders, lidar, cameras, ultrasonic, proximity
- **Navigation**: SLAM, path planning, obstacle avoidance, GPS
- **Communication**: Robot-to-robot, teleoperation, ROS integration
- **AI Integration**: Computer vision, machine learning, decision making
- **Mechanical Design**: Kinematics, dynamics, structural considerations

## Robotics Design Principles:
1. **Real-time Performance**: Ensure deterministic timing for control loops
2. **Safety**: Implement emergency stops and fail-safe mechanisms
3. **Modularity**: Design reusable and replaceable components
4. **Precision**: Achieve accurate positioning and movement
5. **Robustness**: Handle unexpected environments and disturbances

Focus on control theory, sensor fusion, and real-time system design.`;
  }

  // Home Automation Specialist
  getHomeAutomationSpecialistPrompt(): string {
    return `# Home Automation Arduino Specialist AI

You are an expert home automation engineer specializing in smart home systems, building automation, and residential IoT applications.

## Specialization Areas:
- **Smart Devices**: Lighting, HVAC, security, appliances
- **Protocols**: Zigbee, Z-Wave, WiFi, Bluetooth Mesh, Thread
- **Integration**: Home Assistant, OpenHAB, SmartThings, Apple HomeKit
- **User Interfaces**: Mobile apps, voice control, touch panels, web dashboards
- **Energy Management**: Smart meters, load balancing, renewable integration
- **Security**: Access control, surveillance, intrusion detection

## Home Automation Principles:
1. **User Experience**: Intuitive and seamless interaction
2. **Reliability**: Systems must work consistently 24/7
3. **Interoperability**: Different devices must work together
4. **Privacy**: Protect user data and behavior patterns
5. **Energy Efficiency**: Optimize power consumption and costs

Emphasize user-friendly interfaces, reliability, and energy efficiency.`;
  }

  // Industrial Automation Specialist
  getIndustrialSpecialistPrompt(): string {
    return `# Industrial Arduino Specialist AI

You are an expert industrial automation engineer specializing in process control, SCADA systems, and Industry 4.0 applications using Arduino and industrial-grade controllers.

## Specialization Areas:
- **Process Control**: PID controllers, feedback loops, system dynamics
- **Industrial Communication**: Modbus, Profinet, EtherNet/IP, CAN bus
- **Safety Systems**: SIL ratings, fail-safe designs, emergency procedures
- **Data Acquisition**: High-speed sampling, data logging, trend analysis
- **Human-Machine Interface**: HMI design, operator panels, alarm systems
- **Predictive Maintenance**: Vibration analysis, condition monitoring

## Industrial Design Standards:
1. **Safety**: Comply with IEC 61508, ISO 13849 standards
2. **Reliability**: 99.9%+ uptime requirements
3. **Determinism**: Predictable response times
4. **Diagnostics**: Comprehensive fault detection and reporting
5. **Maintainability**: Easy troubleshooting and repair

Focus on safety, reliability, and industrial communication standards.`;
  }

  async processSpecializedRequest(
    domain: 'iot' | 'robotics' | 'home-automation' | 'industrial',
    request: string,
    context: AIToolContext
  ): Promise<{
    response: string;
    codeExample?: CodeGenerationResult;
    recommendations: string[];
    nextSteps: string[];
  }> {
    let systemPrompt: string;
    
    switch (domain) {
      case 'iot':
        systemPrompt = this.getIoTSpecialistPrompt();
        break;
      case 'robotics':
        systemPrompt = this.getRoboticsSpecialistPrompt();
        break;
      case 'home-automation':
        systemPrompt = this.getHomeAutomationSpecialistPrompt();
        break;
      case 'industrial':
        systemPrompt = this.getIndustrialSpecialistPrompt();
        break;
      default:
        systemPrompt = this.codeGenAI.getSystemPrompt(context);
    }

    // Process the request with specialized knowledge
    const response = await this.generateSpecializedResponse(domain, request, context, systemPrompt);
    
    this.emit('specialized-response', { domain, request, response });
    
    return response;
  }

  private async generateSpecializedResponse(
    domain: string,
    request: string,
    context: AIToolContext,
    systemPrompt: string
  ): Promise<{
    response: string;
    codeExample?: CodeGenerationResult;
    recommendations: string[];
    nextSteps: string[];
  }> {
    // This would integrate with an actual AI model in production
    // For now, return structured response based on domain
    
    const response = `Specialized ${domain} response for: ${request}`;
    
    const recommendations = this.generateDomainRecommendations(domain, request);
    const nextSteps = this.generateNextSteps(domain, request);
    
    return {
      response,
      recommendations,
      nextSteps
    };
  }

  private generateDomainRecommendations(domain: string, request: string): string[] {
    const base = [
      'Follow industry best practices and standards',
      'Implement comprehensive testing procedures',
      'Consider scalability and maintainability',
      'Document all design decisions and assumptions'
    ];

    switch (domain) {
      case 'iot':
        return [
          ...base,
          'Implement secure communication protocols',
          'Design for intermittent connectivity',
          'Optimize for low power consumption',
          'Plan for over-the-air updates'
        ];
      case 'robotics':
        return [
          ...base,
          'Implement real-time control loops',
          'Add comprehensive safety mechanisms',
          'Use sensor fusion for better accuracy',
          'Design modular and reusable components'
        ];
      case 'home-automation':
        return [
          ...base,
          'Focus on user experience and simplicity',
          'Ensure reliable 24/7 operation',
          'Implement voice and mobile control',
          'Consider energy efficiency and cost savings'
        ];
      case 'industrial':
        return [
          ...base,
          'Comply with relevant safety standards',
          'Implement comprehensive diagnostics',
          'Use industrial-grade components',
          'Plan for predictive maintenance'
        ];
      default:
        return base;
    }
  }

  private generateNextSteps(domain: string, request: string): string[] {
    const base = [
      'Define detailed requirements and specifications',
      'Create system architecture and design documents',
      'Prototype key components and validate concepts',
      'Implement and test complete system'
    ];

    switch (domain) {
      case 'iot':
        return [
          ...base,
          'Set up cloud infrastructure and connectivity',
          'Implement security measures and authentication',
          'Test with real network conditions and latency',
          'Plan deployment and device management strategy'
        ];
      case 'robotics':
        return [
          ...base,
          'Develop and tune control algorithms',
          'Test motion planning and navigation',
          'Validate safety systems and emergency stops',
          'Integrate sensors and implement sensor fusion'
        ];
      case 'home-automation':
        return [
          ...base,
          'Design user interfaces and experience flows',
          'Integrate with existing home systems',
          'Test automation rules and scenarios',
          'Plan installation and user training'
        ];
      case 'industrial':
        return [
          ...base,
          'Conduct safety analysis and risk assessment',
          'Test under real operating conditions',
          'Validate compliance with industry standards',
          'Plan commissioning and operator training'
        ];
      default:
        return base;
    }
  }
}

export default {
  ArduinoCodeGenAI,
  ArduinoProjectAI,
  SpecializedArduinoAI
};
