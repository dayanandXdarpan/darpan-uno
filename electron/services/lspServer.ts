import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface LSPCapabilities {
  textDocumentSync?: any;
  completionProvider?: any;
  hoverProvider?: boolean;
  signatureHelpProvider?: any;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: boolean;
  codeLensProvider?: any;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  renameProvider?: boolean;
  foldingRangeProvider?: boolean;
  executeCommandProvider?: any;
  declarationProvider?: boolean;
  typeDefinitionProvider?: boolean;
  implementationProvider?: boolean;
  colorProvider?: boolean;
  documentLinkProvider?: any;
}

export interface LSPDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3 | 4; // Error, Warning, Information, Hint
  code?: string | number;
  source?: string;
  message: string;
  relatedInformation?: any[];
}

export class LSPServer extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private isRunning: boolean = false;
  private serverPath: string;
  private workspaceRoot: string | null = null;
  private capabilities: LSPCapabilities = {};
  private messageBuffer: string = '';
  private nextRequestId: number = 1;
  private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

  constructor() {
    super();
    // For now, we'll use a simple approach without a full LSP server
    // This can be enhanced later with clangd integration
    this.serverPath = this.findLanguageServer();
  }

  private findLanguageServer(): string {
    // Try to find Arduino Language Server or clangd
    // For now, return a placeholder - this would need to be configured
    // based on the user's system and Arduino IDE installation
    return 'clangd'; // Assume clangd is in PATH
  }

  async start(workspaceRoot?: string): Promise<void> {
    if (this.isRunning) {
      console.log('LSP Server already running');
      return;
    }

    this.workspaceRoot = workspaceRoot || process.cwd();

    try {
      // For now, we'll implement a minimal LSP-like service
      // In a full implementation, this would start clangd or Arduino Language Server
      console.log('Starting LSP-like service for Arduino development');
      
      // Simulate LSP server startup
      this.isRunning = true;
      this.capabilities = {
        textDocumentSync: 1, // Full sync
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['.', '->']
        },
        hoverProvider: true,
        signatureHelpProvider: {
          triggerCharacters: ['(', ',']
        },
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        codeActionProvider: true,
        documentFormattingProvider: true
      };

      this.emit('ready', this.capabilities);
      console.log('LSP-like service started successfully');
      
    } catch (error) {
      console.error('Failed to start LSP server:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.serverProcess) {
        this.serverProcess.kill();
        this.serverProcess = null;
      }

      this.isRunning = false;
      this.pendingRequests.clear();
      this.emit('stopped');
      console.log('LSP server stopped');
    } catch (error) {
      console.error('Failed to stop LSP server:', error);
    }
  }

  async getCompletions(uri: string, line: number, character: number): Promise<any[]> {
    if (!this.isRunning) {
      return [];
    }

    // Provide basic Arduino completions
    return this.getArduinoCompletions(line, character);
  }

  private getArduinoCompletions(line: number, character: number): any[] {
    // Basic Arduino function completions
    const arduinoFunctions = [
      {
        label: 'setup',
        kind: 3, // Function
        detail: 'void setup()',
        documentation: 'The setup() function is called when a sketch starts. Use it to initialize variables, pin modes, start using libraries, etc.',
        insertText: 'setup() {\n  $1\n}'
      },
      {
        label: 'loop',
        kind: 3,
        detail: 'void loop()',
        documentation: 'After creating a setup() function, the loop() function loops consecutively, allowing your program to change and respond.',
        insertText: 'loop() {\n  $1\n}'
      },
      {
        label: 'pinMode',
        kind: 3,
        detail: 'void pinMode(uint8_t pin, uint8_t mode)',
        documentation: 'Configures the specified pin to behave either as an input or an output.',
        insertText: 'pinMode($1, $2)'
      },
      {
        label: 'digitalWrite',
        kind: 3,
        detail: 'void digitalWrite(uint8_t pin, uint8_t val)',
        documentation: 'Write a HIGH or a LOW value to a digital pin.',
        insertText: 'digitalWrite($1, $2)'
      },
      {
        label: 'digitalRead',
        kind: 3,
        detail: 'int digitalRead(uint8_t pin)',
        documentation: 'Reads the value from a specified digital pin, either HIGH or LOW.',
        insertText: 'digitalRead($1)'
      },
      {
        label: 'analogRead',
        kind: 3,
        detail: 'int analogRead(uint8_t pin)',
        documentation: 'Reads the value from the specified analog pin.',
        insertText: 'analogRead($1)'
      },
      {
        label: 'analogWrite',
        kind: 3,
        detail: 'void analogWrite(uint8_t pin, int val)',
        documentation: 'Writes an analog value (PWM wave) to a pin.',
        insertText: 'analogWrite($1, $2)'
      },
      {
        label: 'delay',
        kind: 3,
        detail: 'void delay(unsigned long ms)',
        documentation: 'Pauses the program for the amount of time (in milliseconds) specified as parameter.',
        insertText: 'delay($1)'
      },
      {
        label: 'delayMicroseconds',
        kind: 3,
        detail: 'void delayMicroseconds(unsigned int us)',
        documentation: 'Pauses the program for the amount of time (in microseconds) specified as parameter.',
        insertText: 'delayMicroseconds($1)'
      },
      {
        label: 'millis',
        kind: 3,
        detail: 'unsigned long millis()',
        documentation: 'Returns the number of milliseconds passed since the Arduino board began running the current program.',
        insertText: 'millis()'
      },
      {
        label: 'micros',
        kind: 3,
        detail: 'unsigned long micros()',
        documentation: 'Returns the number of microseconds since the Arduino board began running the current program.',
        insertText: 'micros()'
      },
      {
        label: 'Serial.begin',
        kind: 3,
        detail: 'void Serial.begin(speed)',
        documentation: 'Sets the data rate in bits per second (baud) for serial data transmission.',
        insertText: 'Serial.begin($1)'
      },
      {
        label: 'Serial.print',
        kind: 3,
        detail: 'size_t Serial.print(val)',
        documentation: 'Prints data to the serial port as human-readable ASCII text.',
        insertText: 'Serial.print($1)'
      },
      {
        label: 'Serial.println',
        kind: 3,
        detail: 'size_t Serial.println(val)',
        documentation: 'Prints data to the serial port as human-readable ASCII text followed by a carriage return character and a newline character.',
        insertText: 'Serial.println($1)'
      },
      {
        label: 'Serial.available',
        kind: 3,
        detail: 'int Serial.available()',
        documentation: 'Get the number of bytes (characters) available for reading from the serial port.',
        insertText: 'Serial.available()'
      },
      {
        label: 'Serial.read',
        kind: 3,
        detail: 'int Serial.read()',
        documentation: 'Reads incoming serial data.',
        insertText: 'Serial.read()'
      }
    ];

    // Arduino constants
    const arduinoConstants = [
      { label: 'HIGH', kind: 21, detail: 'const int HIGH = 0x1', documentation: 'Logic level HIGH (typically 5V or 3.3V)' },
      { label: 'LOW', kind: 21, detail: 'const int LOW = 0x0', documentation: 'Logic level LOW (0V)' },
      { label: 'INPUT', kind: 21, detail: 'const int INPUT = 0x0', documentation: 'Pin mode for input' },
      { label: 'OUTPUT', kind: 21, detail: 'const int OUTPUT = 0x1', documentation: 'Pin mode for output' },
      { label: 'INPUT_PULLUP', kind: 21, detail: 'const int INPUT_PULLUP = 0x2', documentation: 'Pin mode for input with internal pullup resistor' },
      { label: 'LED_BUILTIN', kind: 21, detail: 'const int LED_BUILTIN = 13', documentation: 'Built-in LED pin number' }
    ];

    // Data types
    const dataTypes = [
      { label: 'void', kind: 25, detail: 'void', documentation: 'The void keyword is used only in function declarations.' },
      { label: 'boolean', kind: 25, detail: 'boolean', documentation: 'A boolean holds one of two values, true or false.' },
      { label: 'bool', kind: 25, detail: 'bool', documentation: 'A bool holds one of two values, true or false.' },
      { label: 'byte', kind: 25, detail: 'byte', documentation: 'A byte stores an 8-bit unsigned number, from 0 to 255.' },
      { label: 'char', kind: 25, detail: 'char', documentation: 'A data type that takes up 1 byte of memory that stores a character value.' },
      { label: 'unsigned char', kind: 25, detail: 'unsigned char', documentation: 'An unsigned char is the same as byte.' },
      { label: 'int', kind: 25, detail: 'int', documentation: 'Integers are your primary data-type for number storage.' },
      { label: 'unsigned int', kind: 25, detail: 'unsigned int', documentation: 'An unsigned int (unsigned integer) is the same as an int in size, but can hold larger positive values.' },
      { label: 'word', kind: 25, detail: 'word', documentation: 'A word stores a 16-bit unsigned number, from 0 to 65535. Same as unsigned int.' },
      { label: 'long', kind: 25, detail: 'long', documentation: 'Long variables are extended size variables for number storage, and store 32 bits (4 bytes).' },
      { label: 'unsigned long', kind: 25, detail: 'unsigned long', documentation: 'Unsigned long variables are extended size variables for number storage, and store 32 bits (4 bytes).' },
      { label: 'short', kind: 25, detail: 'short', documentation: 'A short is a 16-bit data-type.' },
      { label: 'float', kind: 25, detail: 'float', documentation: 'Datatype for floating-point numbers, a number that has a decimal point.' },
      { label: 'double', kind: 25, detail: 'double', documentation: 'Double precision floating point number.' },
      { label: 'string', kind: 25, detail: 'string', documentation: 'Text strings can be represented in two ways.' },
      { label: 'String', kind: 25, detail: 'String', documentation: 'The String class allows you to manipulate strings of text in a variety of ways.' },
      { label: 'array', kind: 25, detail: 'array', documentation: 'An array is a collection of variables that are accessed with an index number.' }
    ];

    return [...arduinoFunctions, ...arduinoConstants, ...dataTypes];
  }

  async getHover(uri: string, line: number, character: number): Promise<any | null> {
    if (!this.isRunning) {
      return null;
    }

    // Basic hover information for Arduino functions
    // This would normally come from the LSP server
    return {
      contents: {
        kind: 'markdown',
        value: 'Arduino function documentation would appear here'
      }
    };
  }

  async getDiagnostics(uri: string, content: string): Promise<LSPDiagnostic[]> {
    if (!this.isRunning) {
      return [];
    }

    // Basic syntax checking for Arduino code
    const diagnostics: LSPDiagnostic[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for common Arduino syntax issues
      if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        // Check for missing semicolon (very basic check)
        if (line.includes('digitalWrite') || line.includes('digitalRead') || 
            line.includes('analogWrite') || line.includes('analogRead') ||
            line.includes('pinMode') || line.includes('delay')) {
          if (!line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
            diagnostics.push({
              range: {
                start: { line: i, character: 0 },
                end: { line: i, character: line.length }
              },
              severity: 1, // Error
              source: 'arduino-lsp',
              message: 'Statement might be missing a semicolon'
            });
          }
        }
      }
    }

    return diagnostics;
  }

  async getDefinition(uri: string, line: number, character: number): Promise<any[]> {
    if (!this.isRunning) {
      return [];
    }

    // Basic definition support would be implemented here
    return [];
  }

  async getReferences(uri: string, line: number, character: number): Promise<any[]> {
    if (!this.isRunning) {
      return [];
    }

    // Basic reference support would be implemented here
    return [];
  }

  async getDocumentSymbols(uri: string): Promise<any[]> {
    if (!this.isRunning) {
      return [];
    }

    // Basic symbol extraction would be implemented here
    return [];
  }

  async formatDocument(uri: string, content: string): Promise<any[]> {
    if (!this.isRunning) {
      return [];
    }

    // Basic formatting would be implemented here
    return [];
  }

  getCapabilities(): LSPCapabilities {
    return this.capabilities;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = root;
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isRunning) {
        reject(new Error('LSP server not running'));
        return;
      }

      const id = this.nextRequestId++;
      this.pendingRequests.set(id, { resolve, reject });

      // In a real implementation, this would send a JSON-RPC request
      // For now, we'll simulate responses
      setTimeout(() => {
        const request = this.pendingRequests.get(id);
        if (request) {
          this.pendingRequests.delete(id);
          request.resolve(null); // Simulate empty response
        }
      }, 10);
    });
  }

  private handleMessage(message: any): void {
    // Handle LSP messages
    if (message.method) {
      // Handle notifications and requests from server
      this.emit('message', message);
    } else if (message.id !== undefined) {
      // Handle responses
      const request = this.pendingRequests.get(message.id);
      if (request) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          request.reject(new Error(message.error.message));
        } else {
          request.resolve(message.result);
        }
      }
    }
  }
}
