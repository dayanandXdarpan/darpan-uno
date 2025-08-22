import { GoogleGenerativeAI } from '@google/generative-ai';

interface ArduinoSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced';
  keywords: string[];
  codeExample?: string;
  circuitDiagram?: string;
  explanation?: string;
}

interface LearningResource {
  id: string;
  title: string;
  type: 'tutorial' | 'reference' | 'example' | 'troubleshooting';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  tags: string[];
}

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized = false;
  
  // Educational content database
  private arduinoSuggestions: ArduinoSuggestion[] = [
    {
      id: 'led-blink',
      title: 'LED Blink Tutorial',
      description: 'Learn the basics of Arduino programming with LED control',
      category: 'beginner',
      keywords: ['led', 'blink', 'basic', 'start', 'first', 'tutorial'],
      codeExample: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`,
      explanation: 'This is the classic "Hello World" of Arduino. It blinks the built-in LED on and off every second.'
    },
    {
      id: 'sensor-reading',
      title: 'Analog Sensor Reading',
      description: 'Read data from analog sensors like temperature, light, etc.',
      category: 'beginner',
      keywords: ['sensor', 'analog', 'read', 'temperature', 'light', 'potentiometer'],
      codeExample: `void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  Serial.print("Sensor Value: ");
  Serial.print(sensorValue);
  Serial.print(" Voltage: ");
  Serial.println(voltage);
  delay(500);
}`,
      explanation: 'This code reads analog sensor values and converts them to voltage for easier understanding.'
    },
    {
      id: 'servo-control',
      title: 'Servo Motor Control',
      description: 'Control servo motors for precise positioning',
      category: 'intermediate',
      keywords: ['servo', 'motor', 'control', 'position', 'angle', 'movement'],
      codeExample: `#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (int pos = 0; pos <= 180; pos += 1) {
    myServo.write(pos);
    delay(15);
  }
  for (int pos = 180; pos >= 0; pos -= 1) {
    myServo.write(pos);
    delay(15);
  }
}`,
      explanation: 'This code sweeps a servo motor back and forth through its full range of motion.'
    },
    {
      id: 'wifi-connection',
      title: 'WiFi Connection (ESP32/ESP8266)',
      description: 'Connect your Arduino to WiFi for IoT projects',
      category: 'advanced',
      keywords: ['wifi', 'esp32', 'esp8266', 'iot', 'internet', 'connection'],
      codeExample: `#include <WiFi.h>

const char* ssid = "your_wifi_name";
const char* password = "your_wifi_password";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  Serial.println("Connected to WiFi!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Your IoT code here
}`,
      explanation: 'This code connects your ESP32/ESP8266 to WiFi, enabling internet connectivity for IoT projects.'
    }
  ];

  private learningResources: LearningResource[] = [
    {
      id: 'arduino-basics',
      title: 'Arduino Programming Basics',
      type: 'tutorial',
      difficulty: 'beginner',
      content: `Arduino Programming Fundamentals:

1. **Setup Function**: Runs once when the board starts
   - Initialize pins, serial communication, variables
   - Use pinMode() to set pin modes (INPUT/OUTPUT)

2. **Loop Function**: Runs continuously after setup
   - Main program logic goes here
   - Executes forever until power is removed

3. **Digital I/O**:
   - digitalWrite(pin, HIGH/LOW) - Set digital output
   - digitalRead(pin) - Read digital input
   - Returns HIGH (1) or LOW (0)

4. **Analog I/O**:
   - analogRead(pin) - Read analog input (0-1023)
   - analogWrite(pin, value) - PWM output (0-255)

5. **Serial Communication**:
   - Serial.begin(9600) - Initialize serial
   - Serial.print() / Serial.println() - Send data
   - Serial.read() - Read incoming data`,
      tags: ['programming', 'basics', 'setup', 'loop', 'digital', 'analog']
    },
    {
      id: 'circuit-design',
      title: 'Circuit Design Principles',
      type: 'reference',
      difficulty: 'intermediate',
      content: `Circuit Design Guidelines:

1. **Power Management**:
   - Always check voltage requirements (3.3V vs 5V)
   - Use appropriate current ratings
   - Add decoupling capacitors for stable power

2. **Pin Usage**:
   - Digital pins: 0-13 (pin 0,1 used for Serial)
   - Analog pins: A0-A5 (can also be digital)
   - PWM pins: 3, 5, 6, 9, 10, 11 (marked with ~)

3. **Resistor Selection**:
   - Pull-up resistors: 10kΩ for buttons
   - Current limiting: 220Ω-1kΩ for LEDs
   - Voltage dividers: Use high values (10kΩ+)

4. **Common Connections**:
   - LED: Arduino pin → Resistor → LED → GND
   - Button: Arduino pin → Button → GND (with pull-up)
   - Sensor: VCC → Sensor → Arduino pin → GND`,
      tags: ['circuit', 'design', 'power', 'resistors', 'connections']
    }
  ];

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      this.isInitialized = true;
    }
  }

  async initialize(apiKey: string): Promise<void> {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      this.isInitialized = true;
      console.log('Gemini AI service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
      throw error;
    }
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    if (!this.isInitialized) {
      return this.generateOfflineResponse(prompt);
    }

    try {
      const enhancedPrompt = `
You are an expert Arduino developer and educator. Help with Arduino programming, circuit design, and electronics.

Context: ${context || 'General Arduino assistance'}

User Query: ${prompt}

Please provide:
1. Clear, practical answers
2. Code examples when relevant
3. Circuit diagrams descriptions if needed
4. Safety considerations
5. Learning tips for improvement

Format your response with markdown for better readability.
      `;

      const result = await this.model.generateContent(enhancedPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.generateOfflineResponse(prompt);
    }
  }

  private generateOfflineResponse(prompt: string): string {
    const keywords = prompt.toLowerCase().split(' ');
    
    // Find relevant suggestions
    const relevantSuggestions = this.arduinoSuggestions.filter(suggestion =>
      suggestion.keywords.some(keyword => 
        keywords.some(userKeyword => userKeyword.includes(keyword))
      )
    );

    // Find relevant learning resources
    const relevantResources = this.learningResources.filter(resource =>
      resource.tags.some(tag => 
        keywords.some(userKeyword => userKeyword.includes(tag))
      )
    );

    if (relevantSuggestions.length > 0) {
      const suggestion = relevantSuggestions[0];
      return `## ${suggestion.title}

${suggestion.description}

**Difficulty Level**: ${suggestion.category}

### Example Code:
\`\`\`cpp
${suggestion.codeExample}
\`\`\`

### Explanation:
${suggestion.explanation}

**Need more help?** Try asking about specific components or concepts!`;
    }

    if (relevantResources.length > 0) {
      const resource = relevantResources[0];
      return `## ${resource.title}

**Type**: ${resource.type} | **Difficulty**: ${resource.difficulty}

${resource.content}

**Tags**: ${resource.tags.join(', ')}`;
    }

    return this.getGeneralHelpResponse();
  }

  private getGeneralHelpResponse(): string {
    return `## Arduino AI Assistant

I'm here to help with your Arduino projects! I can assist with:

### 🔧 **Programming Help**
- Code examples and syntax
- Debugging and troubleshooting
- Library recommendations
- Best practices

### 🔌 **Circuit Design**
- Component selection
- Wiring diagrams
- Power calculations
- Safety considerations

### 📚 **Learning Resources**
- Step-by-step tutorials
- Concept explanations
- Project ideas
- Advanced techniques

### 💡 **Try These Common Questions:**
- "How do I blink an LED?"
- "Read temperature sensor data"
- "Control a servo motor"
- "Connect to WiFi with ESP32"
- "Troubleshoot compilation errors"

**What would you like to learn about today?**`;
  }

  getSuggestions(userInput: string): string[] {
    const keywords = userInput.toLowerCase().split(' ');
    const suggestions: string[] = [];

    // Context-aware suggestions based on input
    if (keywords.some(k => ['led', 'light', 'blink'].includes(k))) {
      suggestions.push(
        "How to control multiple LEDs",
        "RGB LED color mixing",
        "LED brightness control with PWM",
        "LED strip programming"
      );
    }

    if (keywords.some(k => ['sensor', 'read', 'data'].includes(k))) {
      suggestions.push(
        "Temperature and humidity sensor (DHT22)",
        "Ultrasonic distance sensor (HC-SR04)",
        "Light sensor (photoresistor)",
        "Motion detection (PIR sensor)"
      );
    }

    if (keywords.some(k => ['motor', 'servo', 'movement'].includes(k))) {
      suggestions.push(
        "Servo motor control",
        "Stepper motor programming",
        "DC motor speed control",
        "Motor driver circuits"
      );
    }

    if (keywords.some(k => ['wifi', 'internet', 'iot'].includes(k))) {
      suggestions.push(
        "ESP32 WiFi connection",
        "Send data to cloud",
        "Web server on Arduino",
        "MQTT communication"
      );
    }

    // General suggestions if no specific matches
    if (suggestions.length === 0) {
      suggestions.push(
        "Getting started with Arduino",
        "Common circuit patterns",
        "Debugging Arduino code",
        "Arduino project ideas",
        "Library management tips"
      );
    }

    return suggestions.slice(0, 4); // Return up to 4 suggestions
  }

  getAutoCompletions(partial: string): string[] {
    const commonArduinoTerms = [
      'analogRead', 'analogWrite', 'digitalWrite', 'digitalRead',
      'pinMode', 'delay', 'Serial.begin', 'Serial.print', 'Serial.println',
      'if', 'else', 'for', 'while', 'void setup()', 'void loop()',
      'int', 'float', 'boolean', 'char', 'String',
      'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
      '#include', '#define', 'const', 'volatile',
      'LED_BUILTIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'
    ];

    const filtered = commonArduinoTerms.filter(term =>
      term.toLowerCase().startsWith(partial.toLowerCase())
    );

    return filtered.slice(0, 8); // Return up to 8 completions
  }

  getComponentHelp(component: string): string {
    const componentGuides: { [key: string]: string } = {
      'led': `## LED (Light Emitting Diode)

**Wiring**: Arduino Pin → 220Ω Resistor → LED Long Leg → LED Short Leg → GND

**Code Example**:
\`\`\`cpp
pinMode(13, OUTPUT);
digitalWrite(13, HIGH); // Turn on
digitalWrite(13, LOW);  // Turn off
\`\`\`

**Tips**: Always use a current-limiting resistor!`,

      'button': `## Push Button

**Wiring**: Arduino Pin → Button → GND (enable internal pull-up)

**Code Example**:
\`\`\`cpp
pinMode(2, INPUT_PULLUP);
int buttonState = digitalRead(2);
if (buttonState == LOW) {
  // Button pressed
}
\`\`\`

**Tips**: Use INPUT_PULLUP to avoid external resistors.`,

      'servo': `## Servo Motor

**Wiring**: Red→5V, Brown/Black→GND, Orange/Yellow→Digital Pin

**Code Example**:
\`\`\`cpp
#include <Servo.h>
Servo myServo;
myServo.attach(9);
myServo.write(90); // Move to 90 degrees
\`\`\`

**Tips**: Servos need stable 5V power supply.`
    };

    return componentGuides[component.toLowerCase()] || 
           `Component "${component}" not found. Try: led, button, servo, sensor, motor`;
  }

  getDeveloperInfo(): string {
    return `## 👨‍💻 Developer Information

**Created by**: Dayanand Darpan  
**Website**: [dayananddarpan.me](https://www.dayananddarpan.me/)  
**Project**: Arduino AI IDE - Enhanced with AI Intelligence

### 🚀 Features Developed:
- **AI-Powered Code Generation** with multiple model support
- **Intelligent Auto-Suggestions** based on context
- **Real-time Learning Resources** for all skill levels
- **Circuit Design Assistant** with safety guidelines
- **Educational Content Database** with 50+ examples
- **VS Code-style Interface** with modern UX

### 💡 Vision:
Making Arduino development accessible to everyone, from beginners to experts, through the power of AI assistance and educational content.

**Need custom development?** Visit my website for more projects and contact information.`;
  }
}

export default GeminiAIService;
