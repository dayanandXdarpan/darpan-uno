import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface Reference {
  id: string;
  title: string;
  type: 'function' | 'library' | 'example' | 'tutorial' | 'datasheet' | 'schematic';
  category: string;
  description: string;
  content: string;
  url?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated: Date;
  rating: number;
  downloads?: number;
}

export interface SearchResult {
  reference: Reference;
  relevanceScore: number;
  matchedTerms: string[];
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  code: string;
  board: string;
  components: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  author: string;
  lastUpdated: Date;
}

export class ReferenceManager extends EventEmitter {
  private references: Map<string, Reference> = new Map();
  private codeExamples: Map<string, CodeExample> = new Map();
  private indexPath: string;
  private searchIndex: Map<string, Set<string>> = new Map();

  constructor(dataPath: string) {
    super();
    this.indexPath = path.join(dataPath, 'references');
    this.initializeReferences();
  }

  private async initializeReferences(): Promise<void> {
    try {
      await this.loadArduinoReferences();
      await this.loadCodeExamples();
      await this.buildSearchIndex();
      console.log(`Loaded ${this.references.size} references and ${this.codeExamples.size} code examples`);
    } catch (error) {
      console.error('Failed to initialize references:', error);
    }
  }

  private async loadArduinoReferences(): Promise<void> {
    // Load Arduino core functions
    const coreFunctions = [
      {
        id: 'digitalWrite',
        title: 'digitalWrite()',
        type: 'function' as const,
        category: 'Digital I/O',
        description: 'Write a HIGH or LOW value to a digital pin.',
        content: `digitalWrite(pin, value)

Parameters:
- pin: the pin number (int)
- value: HIGH or LOW (int)

Example:
digitalWrite(13, HIGH);   // turn the LED on (HIGH is the voltage level)
delay(1000);              // wait for a second
digitalWrite(13, LOW);    // turn the LED off by making the voltage LOW`,
        tags: ['digital', 'output', 'pin', 'LED'],
        difficulty: 'beginner' as const,
        lastUpdated: new Date(),
        rating: 4.8
      },
      {
        id: 'analogRead',
        title: 'analogRead()',
        type: 'function' as const,
        category: 'Analog I/O',
        description: 'Reads the value from the specified analog pin.',
        content: `analogRead(pin)

Parameters:
- pin: the name of the analog input pin to read from (A0 to A5 on most boards)

Returns:
- int (0 to 1023)

Example:
int sensorValue = analogRead(A0);
float voltage = sensorValue * (5.0 / 1023.0);`,
        tags: ['analog', 'input', 'sensor', 'ADC'],
        difficulty: 'beginner' as const,
        lastUpdated: new Date(),
        rating: 4.7
      },
      {
        id: 'Serial.begin',
        title: 'Serial.begin()',
        type: 'function' as const,
        category: 'Communication',
        description: 'Sets the data rate in bits per second (baud) for serial data transmission.',
        content: `Serial.begin(speed)

Parameters:
- speed: in bits per second (baud) - long

Common baud rates:
- 9600, 19200, 38400, 57600, 115200

Example:
void setup() {
  Serial.begin(9600);
  Serial.println("Hello, World!");
}`,
        tags: ['serial', 'communication', 'debugging'],
        difficulty: 'beginner' as const,
        lastUpdated: new Date(),
        rating: 4.9
      },
      {
        id: 'Wire.begin',
        title: 'Wire.begin()',
        type: 'function' as const,
        category: 'Communication',
        description: 'Initialize the Wire library and join the I2C bus as master or slave.',
        content: `Wire.begin()       // join bus as master
Wire.begin(address) // join bus as slave with address

Parameters:
- address: the 7-bit slave address (optional); if not specified, join as master

Example:
#include <Wire.h>

void setup() {
  Wire.begin();        // join i2c bus as master
  Serial.begin(9600);
}`,
        tags: ['I2C', 'wire', 'communication', 'sensor'],
        difficulty: 'intermediate' as const,
        lastUpdated: new Date(),
        rating: 4.5
      }
    ];

    coreFunctions.forEach(func => {
      this.references.set(func.id, func);
    });

    // Load popular libraries documentation
    const libraries = [
      {
        id: 'Servo',
        title: 'Servo Library',
        type: 'library' as const,
        category: 'Motors',
        description: 'Control servo motors with Arduino',
        content: `The Servo library allows you to control servo motors.

Key Functions:
- attach(pin): Attach servo to pin
- write(angle): Set servo angle (0-180 degrees)
- writeMicroseconds(us): Set pulse width in microseconds
- read(): Read current angle
- attached(): Check if servo is attached
- detach(): Detach servo from pin

Example:
#include <Servo.h>

Servo myservo;

void setup() {
  myservo.attach(9);
}

void loop() {
  myservo.write(0);
  delay(1000);
  myservo.write(180);
  delay(1000);
}`,
        tags: ['servo', 'motor', 'PWM', 'control'],
        difficulty: 'beginner' as const,
        lastUpdated: new Date(),
        rating: 4.8
      },
      {
        id: 'LiquidCrystal',
        title: 'LiquidCrystal Library',
        type: 'library' as const,
        category: 'Display',
        description: 'Control LCD displays based on the Hitachi HD44780 chipset',
        content: `The LiquidCrystal library allows you to control LCD displays.

Key Functions:
- LiquidCrystal(rs, enable, d4, d5, d6, d7): Constructor
- begin(cols, rows): Initialize display dimensions
- print(data): Print text/numbers
- setCursor(col, row): Set cursor position
- clear(): Clear display
- home(): Return cursor to home
- scrollDisplayLeft(): Scroll display left
- scrollDisplayRight(): Scroll display right

Example:
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(16, 2);
  lcd.print("Hello, World!");
}`,
        tags: ['LCD', 'display', 'text', 'HD44780'],
        difficulty: 'intermediate' as const,
        lastUpdated: new Date(),
        rating: 4.7
      }
    ];

    libraries.forEach(lib => {
      this.references.set(lib.id, lib);
    });
  }

  private async loadCodeExamples(): Promise<void> {
    const examples = [
      {
        id: 'blink_led',
        title: 'Blink LED',
        description: 'Turn an LED on and off repeatedly',
        code: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`,
        board: 'Arduino Uno',
        components: ['LED', 'Resistor'],
        difficulty: 'beginner' as const,
        category: 'Basic',
        author: 'Arduino Team',
        lastUpdated: new Date()
      },
      {
        id: 'analog_sensor',
        title: 'Read Analog Sensor',
        description: 'Read and display analog sensor values',
        code: `void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  Serial.print("Sensor: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);
  
  delay(500);
}`,
        board: 'Arduino Uno',
        components: ['Potentiometer', 'Sensor'],
        difficulty: 'beginner' as const,
        category: 'Sensors',
        author: 'Arduino Team',
        lastUpdated: new Date()
      },
      {
        id: 'servo_sweep',
        title: 'Servo Sweep',
        description: 'Sweep a servo motor back and forth',
        code: `#include <Servo.h>

Servo myServo;
int pos = 0;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (pos = 0; pos <= 180; pos += 1) {
    myServo.write(pos);
    delay(15);
  }
  for (pos = 180; pos >= 0; pos -= 1) {
    myServo.write(pos);
    delay(15);
  }
}`,
        board: 'Arduino Uno',
        components: ['Servo Motor'],
        difficulty: 'intermediate' as const,
        category: 'Motors',
        author: 'Arduino Team',
        lastUpdated: new Date()
      }
    ];

    examples.forEach(example => {
      this.codeExamples.set(example.id, example);
    });
  }

  private async buildSearchIndex(): Promise<void> {
    // Build search index for fast lookups
    this.references.forEach((ref, id) => {
      const terms = [
        ...ref.title.toLowerCase().split(/\s+/),
        ...ref.description.toLowerCase().split(/\s+/),
        ...ref.tags.map(tag => tag.toLowerCase()),
        ref.category.toLowerCase()
      ];

      terms.forEach(term => {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set());
        }
        this.searchIndex.get(term)!.add(id);
      });
    });

    this.codeExamples.forEach((example, id) => {
      const terms = [
        ...example.title.toLowerCase().split(/\s+/),
        ...example.description.toLowerCase().split(/\s+/),
        ...example.components.map(comp => comp.toLowerCase()),
        example.category.toLowerCase()
      ];

      terms.forEach(term => {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set());
        }
        this.searchIndex.get(term)!.add(`example_${id}`);
      });
    });
  }

  async searchReferences(query: string, filters?: {
    type?: string[];
    category?: string;
    difficulty?: string;
  }): Promise<SearchResult[]> {
    const terms = query.toLowerCase().split(/\s+/);
    const candidates = new Set<string>();

    // Find candidates based on search terms
    terms.forEach(term => {
      if (this.searchIndex.has(term)) {
        this.searchIndex.get(term)!.forEach(id => candidates.add(id));
      }
    });

    const results: SearchResult[] = [];

    candidates.forEach(id => {
      if (id.startsWith('example_')) {
        // Handle code examples
        const exampleId = id.replace('example_', '');
        const example = this.codeExamples.get(exampleId);
        if (example) {
          const relevanceScore = this.calculateRelevance(terms, example);
          if (relevanceScore > 0) {
            // Convert example to reference format for consistent interface
            const ref: Reference = {
              id: example.id,
              title: example.title,
              type: 'example',
              category: example.category,
              description: example.description,
              content: example.code,
              tags: example.components,
              difficulty: example.difficulty,
              lastUpdated: example.lastUpdated,
              rating: 4.5
            };
            results.push({
              reference: ref,
              relevanceScore,
              matchedTerms: terms
            });
          }
        }
      } else {
        // Handle regular references
        const ref = this.references.get(id);
        if (ref) {
          const relevanceScore = this.calculateRelevance(terms, ref);
          if (relevanceScore > 0) {
            results.push({
              reference: ref,
              relevanceScore,
              matchedTerms: terms
            });
          }
        }
      }
    });

    // Apply filters
    let filteredResults = results;
    if (filters) {
      filteredResults = results.filter(result => {
        if (filters.type && !filters.type.includes(result.reference.type)) return false;
        if (filters.category && result.reference.category !== filters.category) return false;
        if (filters.difficulty && result.reference.difficulty !== filters.difficulty) return false;
        return true;
      });
    }

    // Sort by relevance score
    filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return filteredResults.slice(0, 20); // Return top 20 results
  }

  private calculateRelevance(terms: string[], item: Reference | CodeExample): number {
    let score = 0;
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();

    terms.forEach(term => {
      // Title matches are weighted higher
      if (title.includes(term)) score += 10;
      if (description.includes(term)) score += 5;
      
      if ('tags' in item) {
        // Reference tags
        if (item.tags.some(tag => tag.toLowerCase().includes(term))) score += 7;
      } else {
        // Code example components
        if (item.components.some(comp => comp.toLowerCase().includes(term))) score += 7;
      }
    });

    return score;
  }

  async getReference(id: string): Promise<Reference | null> {
    return this.references.get(id) || null;
  }

  async getCodeExample(id: string): Promise<CodeExample | null> {
    return this.codeExamples.get(id) || null;
  }

  async getByCategory(category: string): Promise<Reference[]> {
    return Array.from(this.references.values())
      .filter(ref => ref.category === category);
  }

  async getByType(type: string): Promise<Reference[]> {
    return Array.from(this.references.values())
      .filter(ref => ref.type === type);
  }

  async getPopularReferences(limit: number = 10): Promise<Reference[]> {
    return Array.from(this.references.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  async addCustomReference(reference: Omit<Reference, 'id' | 'lastUpdated'>): Promise<string> {
    const id = `custom_${Date.now()}`;
    const newRef: Reference = {
      ...reference,
      id,
      lastUpdated: new Date()
    };

    this.references.set(id, newRef);
    await this.updateSearchIndex(newRef);
    
    this.emit('reference-added', newRef);
    return id;
  }

  private async updateSearchIndex(reference: Reference): Promise<void> {
    const terms = [
      ...reference.title.toLowerCase().split(/\s+/),
      ...reference.description.toLowerCase().split(/\s+/),
      ...reference.tags.map(tag => tag.toLowerCase()),
      reference.category.toLowerCase()
    ];

    terms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(reference.id);
    });
  }

  async getSuggestions(partialQuery: string): Promise<string[]> {
    const suggestions = new Set<string>();
    const queryLower = partialQuery.toLowerCase();

    this.searchIndex.forEach((ids, term) => {
      if (term.startsWith(queryLower)) {
        suggestions.add(term);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }

  // Contextual help based on code analysis
  async getContextualHelp(code: string): Promise<Reference[]> {
    const suggestions: Reference[] = [];
    
    // Analyze code for function calls and suggest relevant documentation
    const functionMatches = code.match(/(\w+)\s*\(/g);
    if (functionMatches) {
      const functions = functionMatches.map(match => match.replace(/\s*\(/, ''));
      
      for (const func of functions) {
        const ref = this.references.get(func);
        if (ref) {
          suggestions.push(ref);
        }
      }
    }

    // Look for library includes
    const includeMatches = code.match(/#include\s*[<"](.*?)[>"]/g);
    if (includeMatches) {
      const libraries = includeMatches.map(match => 
        match.replace(/#include\s*[<"]/, '').replace(/[>"].*/, '')
      );
      
      for (const lib of libraries) {
        const libRef = Array.from(this.references.values())
          .find(ref => ref.title.toLowerCase().includes(lib.toLowerCase()));
        if (libRef) {
          suggestions.push(libRef);
        }
      }
    }

    return suggestions;
  }
}

export default ReferenceManager;
