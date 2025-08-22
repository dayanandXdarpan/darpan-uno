/**
 * Knowledge & Resources - Part I of Arduino Agent Toolbelt
 * Datasheets, pinouts, examples, and intelligent component assistance
 */

export interface Datasheet {
  name: string;
  description: string;
  manufacturer: string;
  category: string;
  voltage: string;
  interface: string[];
  pins: PinInfo[];
  examples: string[];
  notes: string[];
}

export interface PinInfo {
  number: number;
  name: string;
  function: string;
  voltage: string;
  current?: string;
  notes?: string;
}

export interface BoardPinmap {
  board: string;
  fqbn: string;
  digitalPins: number[];
  analogPins: number[];
  pwmPins: number[];
  interrupts: { pin: number; interrupt: number }[];
  spi: { mosi: number; miso: number; sck: number; ss: number };
  i2c: { sda: number; scl: number };
  uart: { rx: number; tx: number }[];
  voltage: string;
  maxCurrent: string;
  specialPins: { pin: number; function: string; notes: string }[];
}

export interface SensorModule {
  name: string;
  type: string;
  description: string;
  voltage: string;
  interface: string;
  pins: { name: string; function: string }[];
  typical_circuit: string;
  code_example: string;
  libraries: string[];
  notes: string[];
  datasheet_url?: string;
}

export interface CodeSnippet {
  name: string;
  description: string;
  category: string;
  code: string;
  dependencies: string[];
  usage_notes: string[];
}

export interface PowerCalculation {
  components: { name: string; current_ma: number; voltage: string }[];
  total_current_ma: number;
  recommended_supply: string;
  efficiency_notes: string[];
}

export class ArduinoKnowledgeBase {
  private datasheets: Map<string, Datasheet> = new Map();
  private pinmaps: Map<string, BoardPinmap> = new Map();
  private sensors: Map<string, SensorModule> = new Map();
  private snippets: Map<string, CodeSnippet> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  /**
   * I) Knowledge & Resources Tools
   */

  // res.datasheet - query local/curated datasheet index
  getDatasheet(component: string): Datasheet | null {
    const key = component.toLowerCase().replace(/[-\s]/g, '');
    return this.datasheets.get(key) || null;
  }

  searchDatasheets(query: string): Datasheet[] {
    const searchTerm = query.toLowerCase();
    const results: Datasheet[] = [];

    for (const datasheet of this.datasheets.values()) {
      if (
        datasheet.name.toLowerCase().includes(searchTerm) ||
        datasheet.description.toLowerCase().includes(searchTerm) ||
        datasheet.category.toLowerCase().includes(searchTerm)
      ) {
        results.push(datasheet);
      }
    }

    return results;
  }

  // res.pinmap - board pinouts, voltage, special functions
  getPinmap(board: string): BoardPinmap | null {
    const key = board.toLowerCase().replace(/[-\s:]/g, '');
    return this.pinmaps.get(key) || null;
  }

  findCompatiblePins(board: string, requirement: 'digital' | 'analog' | 'pwm' | 'interrupt'): number[] {
    const pinmap = this.getPinmap(board);
    if (!pinmap) return [];

    switch (requirement) {
      case 'digital':
        return pinmap.digitalPins;
      case 'analog':
        return pinmap.analogPins;
      case 'pwm':
        return pinmap.pwmPins;
      case 'interrupt':
        return pinmap.interrupts.map(int => int.pin);
      default:
        return [];
    }
  }

  // res.sensorDB - known modules with circuits and code
  getSensorInfo(sensor: string): SensorModule | null {
    const key = sensor.toLowerCase().replace(/[-\s]/g, '');
    return this.sensors.get(key) || null;
  }

  searchSensors(type: string): SensorModule[] {
    const searchType = type.toLowerCase();
    const results: SensorModule[] = [];

    for (const sensor of this.sensors.values()) {
      if (sensor.type.toLowerCase().includes(searchType)) {
        results.push(sensor);
      }
    }

    return results;
  }

  // res.snippets - idiomatic code blocks
  getCodeSnippet(name: string): CodeSnippet | null {
    return this.snippets.get(name.toLowerCase()) || null;
  }

  getSnippetsByCategory(category: string): CodeSnippet[] {
    const results: CodeSnippet[] = [];
    for (const snippet of this.snippets.values()) {
      if (snippet.category.toLowerCase() === category.toLowerCase()) {
        results.push(snippet);
      }
    }
    return results;
  }

  // res.powerCalc - estimate current draw & power budgeting
  calculatePower(components: { name: string; current_ma?: number }[]): PowerCalculation {
    const componentSpecs: { name: string; current_ma: number; voltage: string }[] = [];
    let totalCurrent = 0;

    for (const component of components) {
      const current = component.current_ma || this.getTypicalCurrent(component.name);
      const voltage = this.getTypicalVoltage(component.name);
      
      componentSpecs.push({
        name: component.name,
        current_ma: current,
        voltage
      });
      
      totalCurrent += current;
    }

    const recommendedSupply = this.getRecommendedSupply(totalCurrent);
    const efficiencyNotes = this.getPowerEfficiencyNotes(totalCurrent);

    return {
      components: componentSpecs,
      total_current_ma: totalCurrent,
      recommended_supply: recommendedSupply,
      efficiency_notes: efficiencyNotes
    };
  }

  // res.memoryCalc - estimate SRAM/flash usage
  calculateMemory(libraries: string[], features: string[]): {
    estimated_flash_kb: number;
    estimated_sram_bytes: number;
    recommendations: string[];
  } {
    let flashUsage = 2; // Base Arduino framework
    let sramUsage = 256; // Base variables and stack

    // Library overhead estimates
    const libraryOverhead: Record<string, { flash: number; sram: number }> = {
      'WiFi': { flash: 8, sram: 512 },
      'Servo': { flash: 2, sram: 64 },
      'LiquidCrystal': { flash: 3, sram: 128 },
      'SoftwareSerial': { flash: 1, sram: 32 },
      'Wire': { flash: 1, sram: 64 },
      'SPI': { flash: 1, sram: 32 }
    };

    for (const lib of libraries) {
      const overhead = libraryOverhead[lib];
      if (overhead) {
        flashUsage += overhead.flash;
        sramUsage += overhead.sram;
      }
    }

    // Feature overhead
    const featureOverhead: Record<string, { flash: number; sram: number }> = {
      'serial_communication': { flash: 1, sram: 64 },
      'web_server': { flash: 12, sram: 1024 },
      'sd_card': { flash: 4, sram: 256 },
      'rtc': { flash: 2, sram: 32 }
    };

    for (const feature of features) {
      const overhead = featureOverhead[feature];
      if (overhead) {
        flashUsage += overhead.flash;
        sramUsage += overhead.sram;
      }
    }

    const recommendations: string[] = [];
    
    if (flashUsage > 28) { // Arduino Uno has 32KB
      recommendations.push('Consider using PROGMEM for strings and constants');
      recommendations.push('Remove unused libraries to save flash memory');
    }
    
    if (sramUsage > 1536) { // Arduino Uno has 2KB
      recommendations.push('Use F() macro for string literals');
      recommendations.push('Consider using smaller data types');
      recommendations.push('Move large arrays to PROGMEM');
    }

    return {
      estimated_flash_kb: flashUsage,
      estimated_sram_bytes: sramUsage,
      recommendations
    };
  }

  /**
   * Smart recommendations based on components
   */
  getRecommendedPins(board: string, components: string[]): {
    component: string;
    recommended_pins: number[];
    reason: string;
  }[] {
    const pinmap = this.getPinmap(board);
    if (!pinmap) return [];

    const recommendations: { component: string; recommended_pins: number[]; reason: string }[] = [];

    for (const component of components) {
      const sensor = this.getSensorInfo(component);
      if (sensor) {
        let recommendedPins: number[] = [];
        let reason = '';

        switch (sensor.interface) {
          case 'digital':
            recommendedPins = pinmap.digitalPins.slice(2, 6); // Avoid pins 0,1 (serial)
            reason = 'Digital pins 2-5 recommended (avoiding serial pins)';
            break;
          case 'analog':
            recommendedPins = pinmap.analogPins;
            reason = 'Use analog input pins for sensor readings';
            break;
          case 'i2c':
            recommendedPins = [pinmap.i2c.sda, pinmap.i2c.scl];
            reason = 'Use dedicated I2C pins (SDA/SCL)';
            break;
          case 'spi':
            recommendedPins = [pinmap.spi.mosi, pinmap.spi.miso, pinmap.spi.sck];
            reason = 'Use SPI pins for high-speed communication';
            break;
          case 'interrupt':
            recommendedPins = pinmap.interrupts.map(int => int.pin);
            reason = 'Use interrupt-capable pins for motion/event detection';
            break;
        }

        recommendations.push({
          component,
          recommended_pins: recommendedPins,
          reason
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate complete project template
   */
  generateProjectTemplate(components: string[], board: string): {
    includes: string[];
    setup_code: string;
    loop_code: string;
    pin_definitions: string;
    comments: string[];
  } {
    const includes: string[] = [];
    const setupLines: string[] = [];
    const loopLines: string[] = [];
    const pinDefs: string[] = [];
    const comments: string[] = [];

    const pinRecommendations = this.getRecommendedPins(board, components);
    let currentPin = 2; // Start from pin 2

    for (const component of components) {
      const sensor = this.getSensorInfo(component);
      if (sensor) {
        // Add includes
        includes.push(...sensor.libraries.map(lib => `#include <${lib}.h>`));

        // Add pin definitions
        const pinRec = pinRecommendations.find(r => r.component === component);
        if (pinRec && pinRec.recommended_pins.length > 0) {
          const pin = pinRec.recommended_pins[0];
          pinDefs.push(`#define ${component.toUpperCase()}_PIN ${pin}`);
          comments.push(`// ${component} connected to pin ${pin} - ${pinRec.reason}`);
        } else {
          pinDefs.push(`#define ${component.toUpperCase()}_PIN ${currentPin}`);
          currentPin++;
        }

        // Add initialization code
        setupLines.push(`  // Initialize ${component}`);
        if (sensor.interface === 'serial') {
          setupLines.push(`  Serial.begin(9600);`);
        }

        // Add loop code template
        loopLines.push(`  // Read ${component}`);
        loopLines.push(`  // TODO: Add ${component} reading code`);
        loopLines.push(``);
      }
    }

    return {
      includes: [...new Set(includes)], // Remove duplicates
      setup_code: setupLines.join('\n'),
      loop_code: loopLines.join('\n'),
      pin_definitions: pinDefs.join('\n'),
      comments
    };
  }

  /**
   * Private helper methods
   */
  private getTypicalCurrent(component: string): number {
    const currentMap: Record<string, number> = {
      'arduino_uno': 45,
      'esp32': 80,
      'esp8266': 70,
      'led': 20,
      'servo': 500,
      'ultrasonic': 15,
      'dht22': 1,
      'lcd_16x2': 100,
      'wifi_module': 200,
      'bluetooth': 40
    };

    return currentMap[component.toLowerCase()] || 50; // Default 50mA
  }

  private getTypicalVoltage(component: string): string {
    const voltageMap: Record<string, string> = {
      'arduino_uno': '5V',
      'esp32': '3.3V',
      'esp8266': '3.3V',
      'led': '3.3V',
      'servo': '5V',
      'ultrasonic': '5V',
      'dht22': '3.3-5V'
    };

    return voltageMap[component.toLowerCase()] || '5V';
  }

  private getRecommendedSupply(totalCurrentMa: number): string {
    if (totalCurrentMa < 100) return 'USB power (500mA) sufficient';
    if (totalCurrentMa < 500) return '5V 1A wall adapter recommended';
    if (totalCurrentMa < 1000) return '5V 2A power supply required';
    return '5V 3A+ power supply required, consider power management';
  }

  private getPowerEfficiencyNotes(totalCurrentMa: number): string[] {
    const notes: string[] = [];
    
    if (totalCurrentMa > 200) {
      notes.push('Consider sleep modes for battery operation');
    }
    
    if (totalCurrentMa > 500) {
      notes.push('Use decoupling capacitors for stable power');
      notes.push('Monitor voltage drops under load');
    }
    
    if (totalCurrentMa > 1000) {
      notes.push('Consider switching to dedicated power modules');
      notes.push('Heat dissipation may be required');
    }

    return notes;
  }

  /**
   * Initialize the knowledge base with common components
   */
  private initializeKnowledgeBase(): void {
    // Initialize datasheets
    this.datasheets.set('rcwl0516', {
      name: 'RCWL-0516',
      description: 'Microwave motion sensor module',
      manufacturer: 'Various',
      category: 'Motion Sensor',
      voltage: '4-28V DC',
      interface: ['Digital'],
      pins: [
        { number: 1, name: 'VIN', function: 'Power input', voltage: '4-28V' },
        { number: 2, name: 'GND', function: 'Ground', voltage: '0V' },
        { number: 3, name: 'OUT', function: 'Digital output', voltage: '3.3V' },
        { number: 4, name: 'CDS', function: 'Light sensor input', voltage: '0-3.3V' }
      ],
      examples: [],
      notes: [
        'Detects motion through walls and obstacles',
        'Range: 5-7 meters',
        'Warm-up time: 2-3 seconds',
        'Output stays HIGH for 2 seconds after detection'
      ]
    });

    this.datasheets.set('hb100', {
      name: 'HB100',
      description: 'Microwave motion sensor',
      manufacturer: 'Various',
      category: 'Motion Sensor',
      voltage: '5V DC',
      interface: ['Analog'],
      pins: [
        { number: 1, name: 'VCC', function: 'Power input', voltage: '5V' },
        { number: 2, name: 'GND', function: 'Ground', voltage: '0V' },
        { number: 3, name: 'IF', function: 'Analog IF output', voltage: '0-5V' },
        { number: 4, name: 'VCC', function: 'Power input', voltage: '5V' }
      ],
      examples: [],
      notes: [
        'Requires op-amp or comparator circuit',
        'Raw Doppler frequency output',
        'More sensitive than RCWL-0516',
        'Needs analog processing for digital output'
      ]
    });

    // Initialize pinmaps
    this.pinmaps.set('arduinoavrunoarduino:avr:uno', {
      board: 'Arduino Uno',
      fqbn: 'arduino:avr:uno',
      digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      analogPins: [14, 15, 16, 17, 18, 19], // A0-A5
      pwmPins: [3, 5, 6, 9, 10, 11],
      interrupts: [{ pin: 2, interrupt: 0 }, { pin: 3, interrupt: 1 }],
      spi: { mosi: 11, miso: 12, sck: 13, ss: 10 },
      i2c: { sda: 18, scl: 19 }, // A4, A5
      uart: [{ rx: 0, tx: 1 }],
      voltage: '5V',
      maxCurrent: '500mA total',
      specialPins: [
        { pin: 13, function: 'Built-in LED', notes: 'Connected to onboard LED' },
        { pin: 0, function: 'Serial RX', notes: 'Used for USB communication' },
        { pin: 1, function: 'Serial TX', notes: 'Used for USB communication' }
      ]
    });

    // Initialize sensors
    this.sensors.set('rcwl0516', {
      name: 'RCWL-0516',
      type: 'motion',
      description: 'Microwave motion sensor with digital output',
      voltage: '4-28V',
      interface: 'digital',
      pins: [
        { name: 'VIN', function: 'Power input (5V)' },
        { name: 'GND', function: 'Ground' },
        { name: 'OUT', function: 'Digital output to Arduino pin' }
      ],
      typical_circuit: `
VIN  -> 5V
GND  -> GND  
OUT  -> Digital Pin 2 (with interrupt)`,
      code_example: `
#define MOTION_PIN 2
volatile bool motionDetected = false;

void setup() {
  Serial.begin(9600);
  pinMode(MOTION_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(MOTION_PIN), motionISR, RISING);
}

void loop() {
  if (motionDetected) {
    Serial.println("Motion Detected!");
    motionDetected = false;
  }
  delay(100);
}

void motionISR() {
  motionDetected = true;
}`,
      libraries: [],
      notes: [
        'Use interrupt for immediate detection',
        'Keep away from WiFi modules (interference)',
        'Allow 2-3 second warm-up time'
      ]
    });

    // Initialize code snippets
    this.snippets.set('interrupt_debounce', {
      name: 'Interrupt with Debouncing',
      description: 'ISR-safe interrupt handling with debouncing',
      category: 'interrupts',
      code: `
volatile unsigned long lastInterruptTime = 0;
volatile bool eventFlag = false;

void interruptISR() {
  unsigned long currentTime = millis();
  if (currentTime - lastInterruptTime > 50) { // 50ms debounce
    eventFlag = true;
    lastInterruptTime = currentTime;
  }
}

void setup() {
  attachInterrupt(digitalPinToInterrupt(2), interruptISR, FALLING);
}

void loop() {
  if (eventFlag) {
    // Handle the event
    eventFlag = false;
  }
}`,
      dependencies: [],
      usage_notes: [
        'Use volatile for ISR variables',
        'Keep ISR functions short and fast',
        'Adjust debounce time based on your needs'
      ]
    });
  }
}
