import { EventEmitter } from 'events';
import { ReferenceManager } from './referenceManager';

export interface HardwareComponent {
  id: string;
  name: string;
  type: 'microcontroller' | 'sensor' | 'actuator' | 'communication' | 'power' | 'passive' | 'display' | 'storage';
  category: string;
  manufacturer: string;
  partNumber?: string;
  description: string;
  specifications: Record<string, any>;
  pinout: Pin[];
  datasheetUrl?: string;
  price?: number;
  availability: 'available' | 'limited' | 'discontinued';
  compatibleBoards: string[];
  libraries: string[];
  codeExamples: string[];
  image?: string;
  packageType?: string;
  operatingVoltage?: string;
  operatingTemperature?: string;
  tags: string[];
}

export interface Pin {
  number: string;
  name: string;
  type: 'digital' | 'analog' | 'power' | 'ground' | 'special';
  function: string;
  voltage?: number;
  current?: number;
  alternativeFunctions?: string[];
}

export interface RecognitionResult {
  component: HardwareComponent;
  confidence: number;
  matchedFeatures: string[];
  suggestions: string[];
  alternativeMatches?: HardwareComponent[];
}

export interface ComponentSuggestion {
  component: HardwareComponent;
  reason: string;
  compatibility: number;
  costEffectiveness: number;
  easeOfUse: number;
  availability: number;
  overallScore: number;
}

export interface ProjectRequirements {
  description: string;
  functions: string[];
  constraints: {
    budget?: number;
    size?: string;
    powerConsumption?: string;
    operatingEnvironment?: string;
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  };
  preferredVendors?: string[];
  existingComponents?: string[];
}

export class AIHardwareRecognition extends EventEmitter {
  private components: Map<string, HardwareComponent> = new Map();
  private recognitionModel: any; // AI model for image recognition
  private referenceManager?: ReferenceManager;

  constructor(referenceManager?: ReferenceManager) {
    super();
    this.referenceManager = referenceManager;
    this.initializeComponentDatabase();
    this.initializeAIModel();
  }

  private async initializeComponentDatabase(): Promise<void> {
    // Populate with common Arduino components
    const components: HardwareComponent[] = [
      {
        id: 'arduino-uno-r3',
        name: 'Arduino Uno R3',
        type: 'microcontroller',
        category: 'Development Board',
        manufacturer: 'Arduino',
        partNumber: 'A000066',
        description: 'Microcontroller board based on the ATmega328P',
        specifications: {
          microcontroller: 'ATmega328P',
          operatingVoltage: '5V',
          inputVoltage: '7-12V',
          digitalPins: 14,
          analogPins: 6,
          flashMemory: '32KB',
          sram: '2KB',
          eeprom: '1KB',
          clockSpeed: '16MHz'
        },
        pinout: this.generateArduinoUnoPinout(),
        datasheetUrl: 'https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf',
        price: 23,
        availability: 'available',
        compatibleBoards: ['arduino-uno-r3'],
        libraries: ['Arduino Core'],
        codeExamples: ['blink', 'digital-read-serial', 'analog-read-serial'],
        packageType: 'Through-hole',
        operatingVoltage: '5V',
        operatingTemperature: '-40°C to +85°C',
        tags: ['arduino', 'microcontroller', 'atmega328p', 'beginner', 'prototyping']
      },
      {
        id: 'esp32-devkitc',
        name: 'ESP32 DevKitC',
        type: 'microcontroller',
        category: 'Development Board',
        manufacturer: 'Espressif',
        partNumber: 'ESP32-DevKitC-32E',
        description: 'WiFi & Bluetooth development board with ESP32-WROOM-32E',
        specifications: {
          microcontroller: 'ESP32',
          operatingVoltage: '3.3V',
          inputVoltage: '5V',
          digitalPins: 34,
          analogPins: 18,
          flashMemory: '4MB',
          sram: '520KB',
          clockSpeed: '240MHz',
          wifi: '802.11 b/g/n',
          bluetooth: '4.2 BR/EDR and BLE'
        },
        pinout: this.generateESP32Pinout(),
        datasheetUrl: 'https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf',
        price: 15,
        availability: 'available',
        compatibleBoards: ['esp32'],
        libraries: ['ESP32 Arduino Core', 'WiFi', 'BluetoothSerial'],
        codeExamples: ['wifi-scan', 'bluetooth-serial', 'web-server'],
        packageType: 'Surface Mount',
        operatingVoltage: '3.3V',
        operatingTemperature: '-40°C to +85°C',
        tags: ['esp32', 'wifi', 'bluetooth', 'iot', 'wireless', 'dual-core']
      },
      {
        id: 'dht22',
        name: 'DHT22 Temperature & Humidity Sensor',
        type: 'sensor',
        category: 'Environmental Sensor',
        manufacturer: 'Aosong',
        partNumber: 'AM2302',
        description: 'Digital temperature and humidity sensor with high accuracy',
        specifications: {
          temperatureRange: '-40°C to +80°C',
          temperatureAccuracy: '±0.5°C',
          humidityRange: '0-100% RH',
          humidityAccuracy: '±2-5% RH',
          operatingVoltage: '3.3-6V',
          outputType: 'Digital',
          interface: 'Single-wire'
        },
        pinout: [
          { number: '1', name: 'VCC', type: 'power', function: 'Power supply 3.3-6V' },
          { number: '2', name: 'DATA', type: 'digital', function: 'Digital data output' },
          { number: '3', name: 'NC', type: 'special', function: 'Not connected' },
          { number: '4', name: 'GND', type: 'ground', function: 'Ground' }
        ],
        datasheetUrl: 'https://www.sparkfun.com/datasheets/Sensors/Temperature/DHT22.pdf',
        price: 8,
        availability: 'available',
        compatibleBoards: ['arduino-uno-r3', 'esp32', 'raspberry-pi'],
        libraries: ['DHT sensor library', 'Adafruit DHT'],
        codeExamples: ['dht22-basic', 'dht22-web-server', 'dht22-data-logger'],
        packageType: 'Through-hole',
        operatingVoltage: '3.3-6V',
        operatingTemperature: '-40°C to +80°C',
        tags: ['temperature', 'humidity', 'environmental', 'digital', 'accurate']
      },
      {
        id: 'hc-sr04',
        name: 'HC-SR04 Ultrasonic Sensor',
        type: 'sensor',
        category: 'Distance Sensor',
        manufacturer: 'Generic',
        partNumber: 'HC-SR04',
        description: 'Ultrasonic ranging module for distance measurement',
        specifications: {
          range: '2cm to 400cm',
          accuracy: '3mm',
          measuringAngle: '15°',
          operatingVoltage: '5V',
          operatingCurrent: '15mA',
          frequency: '40kHz'
        },
        pinout: [
          { number: '1', name: 'VCC', type: 'power', function: 'Power supply 5V' },
          { number: '2', name: 'TRIG', type: 'digital', function: 'Trigger input' },
          { number: '3', name: 'ECHO', type: 'digital', function: 'Echo output' },
          { number: '4', name: 'GND', type: 'ground', function: 'Ground' }
        ],
        datasheetUrl: 'https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf',
        price: 3,
        availability: 'available',
        compatibleBoards: ['arduino-uno-r3', 'esp32', 'raspberry-pi'],
        libraries: ['NewPing', 'Ultrasonic'],
        codeExamples: ['distance-measurement', 'obstacle-detection', 'parking-sensor'],
        packageType: 'Module',
        operatingVoltage: '5V',
        operatingTemperature: '-15°C to +70°C',
        tags: ['ultrasonic', 'distance', 'ranging', 'obstacle', 'cheap']
      },
      {
        id: 'servo-sg90',
        name: 'SG90 Micro Servo',
        type: 'actuator',
        category: 'Servo Motor',
        manufacturer: 'TowerPro',
        partNumber: 'SG90',
        description: 'Micro servo motor with plastic gears',
        specifications: {
          operatingVoltage: '4.8V to 6V',
          stallTorque: '1.8kg/cm',
          speed: '0.1s/60°',
          weight: '9g',
          rotationRange: '180°',
          pulseWidth: '1ms to 2ms',
          controlSignal: 'PWM'
        },
        pinout: [
          { number: '1', name: 'GND', type: 'ground', function: 'Ground (Brown wire)' },
          { number: '2', name: 'VCC', type: 'power', function: 'Power supply 4.8-6V (Red wire)' },
          { number: '3', name: 'PWM', type: 'digital', function: 'PWM control signal (Orange wire)' }
        ],
        datasheetUrl: 'http://www.ee.ic.ac.uk/pcheung/teaching/DE1_EE/stores/sg90_datasheet.pdf',
        price: 2,
        availability: 'available',
        compatibleBoards: ['arduino-uno-r3', 'esp32', 'raspberry-pi'],
        libraries: ['Servo', 'ESP32Servo'],
        codeExamples: ['servo-sweep', 'servo-knob', 'servo-control'],
        packageType: 'Plastic case',
        operatingVoltage: '4.8-6V',
        operatingTemperature: '-30°C to +60°C',
        tags: ['servo', 'motor', 'actuator', 'pwm', 'positioning', 'cheap']
      },
      {
        id: 'neopixel-strip',
        name: 'NeoPixel LED Strip WS2812B',
        type: 'display',
        category: 'LED Display',
        manufacturer: 'WorldSemi',
        partNumber: 'WS2812B',
        description: 'Individually addressable RGB LED strip',
        specifications: {
          ledType: 'WS2812B',
          voltage: '5V',
          currentPerLED: '60mA',
          colors: '16777216',
          dataRate: '800kbps',
          cascade: 'Single wire',
          pwmLevels: '256'
        },
        pinout: [
          { number: '1', name: 'VDD', type: 'power', function: 'Power supply 5V' },
          { number: '2', name: 'DIN', type: 'digital', function: 'Data input' },
          { number: '3', name: 'GND', type: 'ground', function: 'Ground' },
          { number: '4', name: 'DOUT', type: 'digital', function: 'Data output (to next LED)' }
        ],
        datasheetUrl: 'https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf',
        price: 15,
        availability: 'available',
        compatibleBoards: ['arduino-uno-r3', 'esp32', 'raspberry-pi'],
        libraries: ['Adafruit NeoPixel', 'FastLED'],
        codeExamples: ['neopixel-basic', 'rainbow-effect', 'music-visualizer'],
        packageType: 'Flexible Strip',
        operatingVoltage: '5V',
        operatingTemperature: '-25°C to +80°C',
        tags: ['led', 'rgb', 'addressable', 'strip', 'lighting', 'ws2812b']
      }
    ];

    components.forEach(component => {
      this.components.set(component.id, component);
    });

    console.log(`Loaded ${this.components.size} hardware components`);
  }

  private generateArduinoUnoPinout(): Pin[] {
    const pins: Pin[] = [];
    
    // Digital pins
    for (let i = 0; i <= 13; i++) {
      pins.push({
        number: `D${i}`,
        name: `Digital ${i}`,
        type: 'digital',
        function: i === 13 ? 'Digital I/O, Built-in LED' : 'Digital I/O',
        alternativeFunctions: i === 0 ? ['RX'] : i === 1 ? ['TX'] : i >= 3 && i <= 6 || i >= 9 && i <= 11 ? ['PWM'] : []
      });
    }

    // Analog pins
    for (let i = 0; i <= 5; i++) {
      pins.push({
        number: `A${i}`,
        name: `Analog ${i}`,
        type: 'analog',
        function: 'Analog input',
        alternativeFunctions: ['Digital I/O']
      });
    }

    // Power pins
    pins.push(
      { number: 'VIN', name: 'VIN', type: 'power', function: 'External power input' },
      { number: '5V', name: '5V', type: 'power', function: '5V regulated output' },
      { number: '3V3', name: '3.3V', type: 'power', function: '3.3V regulated output' },
      { number: 'GND1', name: 'GND', type: 'ground', function: 'Ground' },
      { number: 'GND2', name: 'GND', type: 'ground', function: 'Ground' },
      { number: 'RESET', name: 'RESET', type: 'special', function: 'Reset pin' }
    );

    return pins;
  }

  private generateESP32Pinout(): Pin[] {
    const pins: Pin[] = [];
    
    // GPIO pins
    const gpioPins = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
    
    gpioPins.forEach(pin => {
      const isAnalog = [32, 33, 34, 35, 36, 39].includes(pin);
      pins.push({
        number: `GPIO${pin}`,
        name: `GPIO ${pin}`,
        type: isAnalog ? 'analog' : 'digital',
        function: isAnalog ? 'ADC input' : 'Digital I/O',
        alternativeFunctions: this.getESP32PinFunctions(pin)
      });
    });

    // Power pins
    pins.push(
      { number: 'VIN', name: 'VIN', type: 'power', function: '5V input' },
      { number: '3V3', name: '3V3', type: 'power', function: '3.3V output' },
      { number: 'GND1', name: 'GND', type: 'ground', function: 'Ground' },
      { number: 'GND2', name: 'GND', type: 'ground', function: 'Ground' },
      { number: 'EN', name: 'EN', type: 'special', function: 'Enable pin' }
    );

    return pins;
  }

  private getESP32PinFunctions(pin: number): string[] {
    const functions: Record<number, string[]> = {
      0: ['Boot button', 'ADC2_CH1'],
      1: ['TX0', 'U0TXD'],
      2: ['Boot LED', 'ADC2_CH2'],
      3: ['RX0', 'U0RXD'],
      4: ['ADC2_CH0', 'Touch0'],
      5: ['SPI_SS', 'VSPI_SS'],
      12: ['ADC2_CH5', 'Touch5', 'HSPI_MISO'],
      13: ['ADC2_CH4', 'Touch4', 'HSPI_MOSI'],
      14: ['ADC2_CH6', 'Touch6', 'HSPI_CLK'],
      15: ['ADC2_CH3', 'Touch3', 'HSPI_SS'],
      16: ['RX2', 'U2RXD'],
      17: ['TX2', 'U2TXD'],
      18: ['VSPI_CLK'],
      19: ['VSPI_MISO'],
      21: ['SDA', 'I2C_SDA'],
      22: ['SCL', 'I2C_SCL'],
      23: ['VSPI_MOSI'],
      25: ['ADC2_CH8', 'DAC1'],
      26: ['ADC2_CH9', 'DAC2'],
      27: ['ADC2_CH7', 'Touch7'],
      32: ['ADC1_CH4', 'Touch9'],
      33: ['ADC1_CH5', 'Touch8'],
      34: ['ADC1_CH6', 'Input only'],
      35: ['ADC1_CH7', 'Input only'],
      36: ['ADC1_CH0', 'VP', 'Input only'],
      39: ['ADC1_CH3', 'VN', 'Input only']
    };
    
    return functions[pin] || [];
  }

  private async initializeAIModel(): Promise<void> {
    // Initialize AI model for hardware recognition
    // In a real implementation, this would load a trained model
    console.log('AI Hardware Recognition model initialized');
  }

  // Image-based recognition
  async recognizeFromImage(imageData: Buffer | string): Promise<RecognitionResult[]> {
    // Simulate AI image recognition
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock recognition results
    const mockResults: RecognitionResult[] = [
      {
        component: this.components.get('arduino-uno-r3')!,
        confidence: 0.95,
        matchedFeatures: ['Blue PCB', 'USB connector', 'Power jack', 'ATmega328P chip'],
        suggestions: ['Connect via USB cable', 'Use 7-12V external power if needed']
      },
      {
        component: this.components.get('dht22')!,
        confidence: 0.88,
        matchedFeatures: ['White plastic housing', '4 pins', 'Grid pattern'],
        suggestions: ['Connect to digital pin with pull-up resistor', 'Use 3.3V or 5V power']
      }
    ];

    this.emit('recognition-complete', mockResults);
    return mockResults;
  }

  // Text-based recognition
  async recognizeFromDescription(description: string): Promise<RecognitionResult[]> {
    const descriptionLower = description.toLowerCase();
    const results: RecognitionResult[] = [];

    for (const [id, component] of this.components) {
      let confidence = 0;
      const matchedFeatures: string[] = [];

      // Check name and description
      if (component.name.toLowerCase().includes(descriptionLower) || 
          descriptionLower.includes(component.name.toLowerCase())) {
        confidence += 0.8;
        matchedFeatures.push('Name match');
      }

      if (component.description.toLowerCase().includes(descriptionLower)) {
        confidence += 0.6;
        matchedFeatures.push('Description match');
      }

      // Check tags
      component.tags.forEach(tag => {
        if (descriptionLower.includes(tag.toLowerCase())) {
          confidence += 0.3;
          matchedFeatures.push(`Tag: ${tag}`);
        }
      });

      // Check part number
      if (component.partNumber && descriptionLower.includes(component.partNumber.toLowerCase())) {
        confidence += 0.9;
        matchedFeatures.push('Part number match');
      }

      // Check manufacturer
      if (descriptionLower.includes(component.manufacturer.toLowerCase())) {
        confidence += 0.4;
        matchedFeatures.push('Manufacturer match');
      }

      if (confidence > 0.3) {
        results.push({
          component,
          confidence: Math.min(confidence, 1.0),
          matchedFeatures,
          suggestions: this.generateUsageSuggestions(component)
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    return results.slice(0, 10); // Return top 10 matches
  }

  private generateUsageSuggestions(component: HardwareComponent): string[] {
    const suggestions: string[] = [];

    switch (component.type) {
      case 'sensor':
        suggestions.push(`Connect to a digital or analog pin depending on the sensor type`);
        suggestions.push(`Include pull-up resistors if needed`);
        suggestions.push(`Check the operating voltage (${component.operatingVoltage})`);
        break;
      case 'actuator':
        suggestions.push(`Connect to a PWM-capable pin for speed/position control`);
        suggestions.push(`Use appropriate driver circuit for high-current devices`);
        break;
      case 'display':
        suggestions.push(`Connect according to the communication protocol (I2C, SPI, or parallel)`);
        suggestions.push(`Consider power consumption for battery-powered projects`);
        break;
      case 'communication':
        suggestions.push(`Check if voltage level conversion is needed`);
        suggestions.push(`Use appropriate libraries for the communication protocol`);
        break;
    }

    // Add library suggestions
    if (component.libraries.length > 0) {
      suggestions.push(`Recommended libraries: ${component.libraries.join(', ')}`);
    }

    return suggestions;
  }

  // Project-based component suggestions
  async suggestComponents(requirements: ProjectRequirements): Promise<ComponentSuggestion[]> {
    const suggestions: ComponentSuggestion[] = [];
    const descriptionLower = requirements.description.toLowerCase();

    for (const [id, component] of this.components) {
      let relevanceScore = 0;
      let reasons: string[] = [];

      // Check if component matches project functions
      requirements.functions.forEach(func => {
        if (component.description.toLowerCase().includes(func.toLowerCase()) ||
            component.tags.some(tag => tag.toLowerCase().includes(func.toLowerCase()))) {
          relevanceScore += 0.8;
          reasons.push(`Matches function: ${func}`);
        }
      });

      // Check if component is mentioned in description
      if (descriptionLower.includes(component.name.toLowerCase()) ||
          component.tags.some(tag => descriptionLower.includes(tag.toLowerCase()))) {
        relevanceScore += 0.6;
        reasons.push('Mentioned in project description');
      }

      // Calculate compatibility score
      const compatibility = this.calculateCompatibility(component, requirements);
      const costEffectiveness = this.calculateCostEffectiveness(component, requirements);
      const easeOfUse = this.calculateEaseOfUse(component, requirements);
      const availability = this.calculateAvailability(component);

      if (relevanceScore > 0.3) {
        const overallScore = (relevanceScore + compatibility + costEffectiveness + easeOfUse + availability) / 5;
        
        suggestions.push({
          component,
          reason: reasons.join(', '),
          compatibility,
          costEffectiveness,
          easeOfUse,
          availability,
          overallScore
        });
      }
    }

    // Sort by overall score
    suggestions.sort((a, b) => b.overallScore - a.overallScore);
    
    return suggestions.slice(0, 15); // Return top 15 suggestions
  }

  private calculateCompatibility(component: HardwareComponent, requirements: ProjectRequirements): number {
    let score = 0.5; // Base compatibility

    // Check experience level
    if (requirements.constraints.experienceLevel) {
      const difficulty = component.tags.includes('beginner') ? 'beginner' :
                        component.tags.includes('advanced') ? 'advanced' : 'intermediate';
      
      if (difficulty === requirements.constraints.experienceLevel) {
        score += 0.3;
      } else if (requirements.constraints.experienceLevel === 'beginner' && difficulty === 'advanced') {
        score -= 0.2;
      }
    }

    // Check existing components compatibility
    if (requirements.existingComponents) {
      const hasCompatibleBoard = requirements.existingComponents.some(existing =>
        component.compatibleBoards.includes(existing)
      );
      if (hasCompatibleBoard) score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateCostEffectiveness(component: HardwareComponent, requirements: ProjectRequirements): number {
    if (!component.price) return 0.5;

    const budget = requirements.constraints.budget || 100; // Default budget
    const priceRatio = component.price / budget;

    if (priceRatio < 0.05) return 1.0;  // Very cheap
    if (priceRatio < 0.1) return 0.8;   // Cheap
    if (priceRatio < 0.2) return 0.6;   // Moderate
    if (priceRatio < 0.5) return 0.4;   // Expensive
    return 0.2; // Very expensive
  }

  private calculateEaseOfUse(component: HardwareComponent, requirements: ProjectRequirements): number {
    let score = 0.5;

    // Libraries available
    if (component.libraries.length > 0) score += 0.2;

    // Code examples available
    if (component.codeExamples.length > 0) score += 0.2;

    // Beginner-friendly tags
    if (component.tags.includes('beginner') || component.tags.includes('easy')) score += 0.2;

    // Standard interfaces
    if (component.specifications.interface === 'I2C' || 
        component.specifications.interface === 'SPI' ||
        component.specifications.outputType === 'Digital') {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private calculateAvailability(component: HardwareComponent): number {
    switch (component.availability) {
      case 'available': return 1.0;
      case 'limited': return 0.6;
      case 'discontinued': return 0.2;
      default: return 0.5;
    }
  }

  // Component information and recommendations
  async getComponentInfo(componentId: string): Promise<HardwareComponent | null> {
    return this.components.get(componentId) || null;
  }

  async getCompatibleComponents(componentId: string): Promise<HardwareComponent[]> {
    const component = this.components.get(componentId);
    if (!component) return [];

    const compatible: HardwareComponent[] = [];

    for (const [id, otherComponent] of this.components) {
      if (id === componentId) continue;

      // Check board compatibility
      const hasCommonBoard = component.compatibleBoards.some(board =>
        otherComponent.compatibleBoards.includes(board)
      );

      // Check voltage compatibility
      const voltageCompatible = this.checkVoltageCompatibility(component, otherComponent);

      if (hasCommonBoard && voltageCompatible) {
        compatible.push(otherComponent);
      }
    }

    return compatible;
  }

  private checkVoltageCompatibility(comp1: HardwareComponent, comp2: HardwareComponent): boolean {
    // Simple voltage compatibility check
    const voltage1 = comp1.operatingVoltage;
    const voltage2 = comp2.operatingVoltage;

    if (!voltage1 || !voltage2) return true; // Assume compatible if unknown

    // Extract numeric values (simplified)
    const v1 = parseFloat(voltage1.replace(/[^\d.]/g, ''));
    const v2 = parseFloat(voltage2.replace(/[^\d.]/g, ''));

    // Allow ±0.5V tolerance
    return Math.abs(v1 - v2) <= 0.5;
  }

  async generateWiringDiagram(components: string[]): Promise<string> {
    // Generate a textual wiring diagram
    let diagram = 'Wiring Diagram:\n';
    diagram += '================\n\n';

    const componentObjects = components.map(id => this.components.get(id)).filter(Boolean) as HardwareComponent[];
    
    if (componentObjects.length === 0) {
      return 'No valid components provided for wiring diagram.';
    }

    // Find the microcontroller
    const microcontroller = componentObjects.find(comp => comp.type === 'microcontroller');
    
    if (!microcontroller) {
      diagram += 'Warning: No microcontroller detected. Adding Arduino Uno as default.\n\n';
    }

    // Generate connections for each component
    componentObjects.forEach((component, index) => {
      if (component.type === 'microcontroller') return;

      diagram += `${index + 1}. ${component.name}:\n`;
      
      component.pinout.forEach(pin => {
        diagram += `   ${pin.name}: ${this.suggestConnection(pin, microcontroller)}\n`;
      });
      
      diagram += '\n';
    });

    // Add notes
    diagram += 'Notes:\n';
    diagram += '- Always check component datasheets for exact specifications\n';
    diagram += '- Use appropriate resistors for LEDs and other components\n';
    diagram += '- Double-check voltage levels before connecting\n';
    diagram += '- Consider using breadboard for prototyping\n';

    return diagram;
  }

  private suggestConnection(pin: Pin, microcontroller?: HardwareComponent): string {
    switch (pin.type) {
      case 'power':
        if (pin.function.includes('5V')) return 'Arduino 5V pin';
        if (pin.function.includes('3.3V')) return 'Arduino 3.3V pin';
        return 'Appropriate power supply';
      case 'ground':
        return 'Arduino GND pin';
      case 'digital':
        return 'Arduino digital pin (D2-D13 recommended)';
      case 'analog':
        return 'Arduino analog pin (A0-A5)';
      default:
        return 'See component datasheet';
    }
  }

  // Advanced features
  async analyzeCircuitComplexity(components: string[]): Promise<{
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
    factors: string[];
    recommendations: string[];
  }> {
    const componentObjects = components.map(id => this.components.get(id)).filter(Boolean) as HardwareComponent[];
    
    let complexityScore = 0;
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Analyze components
    componentObjects.forEach(component => {
      switch (component.type) {
        case 'microcontroller':
          if (component.id.includes('esp32')) {
            complexityScore += 2;
            factors.push('WiFi/Bluetooth capable microcontroller');
          } else {
            complexityScore += 1;
          }
          break;
        case 'communication':
          complexityScore += 2;
          factors.push('Communication module');
          break;
        case 'display':
          complexityScore += 1;
          factors.push('Display component');
          break;
        case 'sensor':
        case 'actuator':
          complexityScore += 0.5;
          break;
      }
    });

    // Check for advanced features
    const hasAnalogComponents = componentObjects.some(comp => 
      comp.pinout.some(pin => pin.type === 'analog')
    );
    if (hasAnalogComponents) {
      complexityScore += 1;
      factors.push('Analog signal processing');
    }

    const hasPowerManagement = componentObjects.some(comp =>
      comp.tags.includes('power') || comp.category.includes('Power')
    );
    if (hasPowerManagement) {
      complexityScore += 1;
      factors.push('Power management');
    }

    // Determine complexity level
    let complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
    if (complexityScore <= 2) {
      complexity = 'simple';
      recommendations.push('Great for beginners');
      recommendations.push('Use breadboard for prototyping');
    } else if (complexityScore <= 4) {
      complexity = 'moderate';
      recommendations.push('Intermediate project');
      recommendations.push('Consider using a PCB for final version');
    } else if (complexityScore <= 6) {
      complexity = 'complex';
      recommendations.push('Advanced project requiring careful planning');
      recommendations.push('Design custom PCB recommended');
      recommendations.push('Consider power consumption and thermal management');
    } else {
      complexity = 'advanced';
      recommendations.push('Expert-level project');
      recommendations.push('Requires extensive testing and validation');
      recommendations.push('Consider professional PCB design services');
      recommendations.push('Implement proper EMI/EMC considerations');
    }

    return { complexity, factors, recommendations };
  }

  // Search and filtering
  async searchComponents(query: string, filters?: {
    type?: string;
    manufacturer?: string;
    priceRange?: [number, number];
    availability?: string;
  }): Promise<HardwareComponent[]> {
    let results = Array.from(this.components.values());

    // Text search
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(component =>
        component.name.toLowerCase().includes(queryLower) ||
        component.description.toLowerCase().includes(queryLower) ||
        component.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        component.manufacturer.toLowerCase().includes(queryLower) ||
        (component.partNumber && component.partNumber.toLowerCase().includes(queryLower))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.type) {
        results = results.filter(comp => comp.type === filters.type);
      }
      if (filters.manufacturer) {
        results = results.filter(comp => 
          comp.manufacturer.toLowerCase().includes(filters.manufacturer!.toLowerCase())
        );
      }
      if (filters.priceRange && filters.priceRange.length === 2) {
        results = results.filter(comp => 
          comp.price !== undefined && 
          comp.price >= filters.priceRange![0] && 
          comp.price <= filters.priceRange![1]
        );
      }
      if (filters.availability) {
        results = results.filter(comp => comp.availability === filters.availability);
      }
    }

    return results;
  }

  getAllComponents(): HardwareComponent[] {
    return Array.from(this.components.values());
  }

  getComponentsByType(type: HardwareComponent['type']): HardwareComponent[] {
    return Array.from(this.components.values()).filter(comp => comp.type === type);
  }

  getManufacturers(): string[] {
    const manufacturers = new Set<string>();
    this.components.forEach(comp => manufacturers.add(comp.manufacturer));
    return Array.from(manufacturers).sort();
  }
}

export default AIHardwareRecognition;
