import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Serial I/O & Telemetry - Part F of Arduino Agent Toolbelt
 * Advanced serial communication with pattern matching and data logging
 */

export interface SerialExpectResult {
  matched: boolean;
  capture?: string;
  logs: string[];
  timeoutReached: boolean;
}

export interface SerialDataLog {
  timestamp: number;
  data: string;
  direction: 'in' | 'out';
  formatted?: any;
}

export interface SerialRecordConfig {
  format: 'csv' | 'json' | 'raw';
  includeTimestamp: boolean;
  parsePatterns?: RegExp[];
  outputFile: string;
}

export class EnhancedSerialManager extends EventEmitter {
  private openPorts: Map<string, SerialPort> = new Map();
  private parsers: Map<string, ReadlineParser> = new Map();
  private recordings: Map<string, SerialDataLog[]> = new Map();
  private filters: Map<string, RegExp[]> = new Map();

  constructor() {
    super();
  }

  /**
   * F) Serial I/O & Telemetry Tools
   */

  // serial.open - enhanced port opening with options
  async open(port: string, options: {
    baudRate?: number;
    dataBits?: 5 | 6 | 7 | 8;
    stopBits?: 1 | 1.5 | 2;
    parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
    autoOpen?: boolean;
    endOnClose?: boolean;
  } = {}): Promise<boolean> {
    try {
      if (this.openPorts.has(port)) {
        console.warn(`Port ${port} is already open`);
        return true;
      }

      const serialPort = new SerialPort({
        path: port,
        baudRate: options.baudRate || 9600,
        dataBits: options.dataBits || 8,
        stopBits: options.stopBits || 1,
        parity: options.parity || 'none',
        autoOpen: options.autoOpen !== false
      });

      // Setup readline parser
      const parser = new ReadlineParser({ delimiter: '\n' });
      serialPort.pipe(parser);

      // Store references
      this.openPorts.set(port, serialPort);
      this.parsers.set(port, parser);
      this.recordings.set(port, []);

      // Setup event handlers
      parser.on('data', (data: string) => {
        const logEntry: SerialDataLog = {
          timestamp: Date.now(),
          data: data.trim(),
          direction: 'in'
        };

        // Add to recording
        const recording = this.recordings.get(port);
        if (recording) {
          recording.push(logEntry);
        }

        // Apply filters
        const filters = this.filters.get(port);
        if (filters && filters.length > 0) {
          const shouldEmit = filters.some(filter => filter.test(data));
          if (shouldEmit) {
            this.emit('data', { port, data: data.trim(), timestamp: logEntry.timestamp });
          }
        } else {
          this.emit('data', { port, data: data.trim(), timestamp: logEntry.timestamp });
        }
      });

      serialPort.on('error', (error) => {
        this.emit('error', { port, error });
      });

      serialPort.on('close', () => {
        this.openPorts.delete(port);
        this.parsers.delete(port);
        this.emit('close', { port });
      });

      return true;
    } catch (error) {
      console.error(`Failed to open port ${port}:`, error);
      return false;
    }
  }

  // serial.close - close port and cleanup
  async close(port: string): Promise<boolean> {
    try {
      const serialPort = this.openPorts.get(port);
      if (serialPort && serialPort.isOpen) {
        await new Promise<void>((resolve, reject) => {
          serialPort.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      
      this.openPorts.delete(port);
      this.parsers.delete(port);
      return true;
    } catch (error) {
      console.error(`Failed to close port ${port}:`, error);
      return false;
    }
  }

  // serial.readLine - read with timestamp + pattern filters
  async readLine(port: string, timeoutMs?: number): Promise<{
    data: string;
    timestamp: number;
  } | null> {
    const parser = this.parsers.get(port);
    if (!parser) {
      throw new Error(`Port ${port} is not open`);
    }

    return new Promise((resolve) => {
      let timeout: NodeJS.Timeout | undefined;

      const dataHandler = (data: string) => {
        if (timeout) clearTimeout(timeout);
        parser.removeListener('data', dataHandler);
        resolve({
          data: data.trim(),
          timestamp: Date.now()
        });
      };

      parser.once('data', dataHandler);

      if (timeoutMs) {
        timeout = setTimeout(() => {
          parser.removeListener('data', dataHandler);
          resolve(null);
        }, timeoutMs);
      }
    });
  }

  // serial.write - send commands to firmware
  async write(port: string, data: string, addNewline: boolean = true): Promise<boolean> {
    try {
      const serialPort = this.openPorts.get(port);
      if (!serialPort || !serialPort.isOpen) {
        throw new Error(`Port ${port} is not open`);
      }

      const message = addNewline ? data + '\n' : data;
      
      return new Promise((resolve, reject) => {
        serialPort.write(message, (error) => {
          if (error) {
            reject(error);
          } else {
            // Log outgoing data
            const recording = this.recordings.get(port);
            if (recording) {
              recording.push({
                timestamp: Date.now(),
                data: data,
                direction: 'out'
              });
            }
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error(`Failed to write to port ${port}:`, error);
      return false;
    }
  }

  // serial.record - log to CSV/JSON (sensor data pipelines)
  async startRecording(port: string, config: SerialRecordConfig): Promise<boolean> {
    try {
      // Clear existing recording
      this.recordings.set(port, []);

      // Set up auto-save interval
      const saveInterval = setInterval(async () => {
        await this.saveRecording(port, config);
      }, 5000); // Save every 5 seconds

      // Store interval reference for cleanup
      (this as any)[`saveInterval_${port}`] = saveInterval;

      this.emit('recording:started', { port, config });
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  async stopRecording(port: string, config: SerialRecordConfig): Promise<boolean> {
    try {
      // Clear auto-save interval
      const saveInterval = (this as any)[`saveInterval_${port}`];
      if (saveInterval) {
        clearInterval(saveInterval);
        delete (this as any)[`saveInterval_${port}`];
      }

      // Final save
      await this.saveRecording(port, config);

      this.emit('recording:stopped', { port });
      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return false;
    }
  }

  // serial.expect - like terminal.expect but on serial stream
  async expect(port: string, expect: string | RegExp, timeoutMs: number = 5000): Promise<SerialExpectResult> {
    const parser = this.parsers.get(port);
    if (!parser) {
      throw new Error(`Port ${port} is not open`);
    }

    const expectRegex = typeof expect === 'string' ? new RegExp(expect) : expect;
    const logs: string[] = [];
    let matched = false;
    let capture: string | undefined;
    let timeoutReached = false;

    return new Promise((resolve) => {
      let timeout: NodeJS.Timeout;

      const dataHandler = (data: string) => {
        logs.push(data);

        const match = data.match(expectRegex);
        if (match && !matched) {
          matched = true;
          capture = match[1] || match[0];
          cleanup();
          resolve({ matched: true, capture, logs, timeoutReached: false });
        }
      };

      const cleanup = () => {
        if (timeout) clearTimeout(timeout);
        parser.removeListener('data', dataHandler);
      };

      parser.on('data', dataHandler);

      timeout = setTimeout(() => {
        timeoutReached = true;
        cleanup();
        resolve({ matched: false, logs, timeoutReached: true });
      }, timeoutMs);
    });
  }

  // Pattern filtering for real-time data processing
  setPatternFilters(port: string, patterns: RegExp[]): void {
    this.filters.set(port, patterns);
  }

  clearPatternFilters(port: string): void {
    this.filters.delete(port);
  }

  // Get recording data
  getRecording(port: string): SerialDataLog[] {
    return this.recordings.get(port) || [];
  }

  // Clear recording buffer
  clearRecording(port: string): void {
    this.recordings.set(port, []);
  }

  /**
   * Data processing and analysis
   */
  
  // Parse sensor data with common patterns
  parseSensorData(data: string): {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    motion?: boolean;
    distance?: number;
    [key: string]: any;
  } {
    const result: any = {};

    // Temperature patterns
    const tempMatch = data.match(/temp(?:erature)?[:\s=]*(-?\d+\.?\d*)[°\s]*[cf]?/i);
    if (tempMatch) {
      result.temperature = parseFloat(tempMatch[1]);
    }

    // Humidity patterns
    const humidityMatch = data.match(/humidity[:\s=]*(\d+\.?\d*)%?/i);
    if (humidityMatch) {
      result.humidity = parseFloat(humidityMatch[1]);
    }

    // Pressure patterns
    const pressureMatch = data.match(/pressure[:\s=]*(\d+\.?\d*)/i);
    if (pressureMatch) {
      result.pressure = parseFloat(pressureMatch[1]);
    }

    // Motion detection
    const motionMatch = data.match(/motion[:\s=]*(detected|true|1|yes)/i);
    if (motionMatch) {
      result.motion = true;
    }

    // Distance measurements
    const distanceMatch = data.match(/distance[:\s=]*(\d+\.?\d*)\s*(cm|mm|m)?/i);
    if (distanceMatch) {
      result.distance = parseFloat(distanceMatch[1]);
      result.distanceUnit = distanceMatch[2] || 'cm';
    }

    return result;
  }

  /**
   * Private helper methods
   */
  private async saveRecording(port: string, config: SerialRecordConfig): Promise<void> {
    const recording = this.recordings.get(port);
    if (!recording || recording.length === 0) {
      return;
    }

    try {
      let content: string;

      switch (config.format) {
        case 'csv':
          content = this.formatAsCSV(recording, config.includeTimestamp);
          break;
        case 'json':
          content = JSON.stringify(recording, null, 2);
          break;
        case 'raw':
        default:
          content = recording.map(log => 
            config.includeTimestamp ? 
              `[${new Date(log.timestamp).toISOString()}] ${log.direction}: ${log.data}` :
              `${log.direction}: ${log.data}`
          ).join('\n');
          break;
      }

      await fs.writeFile(config.outputFile, content, 'utf-8');
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  }

  private formatAsCSV(logs: SerialDataLog[], includeTimestamp: boolean): string {
    const headers = includeTimestamp ? 
      ['timestamp', 'direction', 'data'] : 
      ['direction', 'data'];
    
    const rows = logs.map(log => {
      const row = includeTimestamp ? [
        new Date(log.timestamp).toISOString(),
        log.direction,
        `"${log.data.replace(/"/g, '""')}"`
      ] : [
        log.direction,
        `"${log.data.replace(/"/g, '""')}"`
      ];
      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Cleanup and port management
   */
  async closeAllPorts(): Promise<void> {
    const ports = Array.from(this.openPorts.keys());
    for (const port of ports) {
      await this.close(port);
    }
  }

  getOpenPorts(): string[] {
    return Array.from(this.openPorts.keys());
  }

  isPortOpen(port: string): boolean {
    const serialPort = this.openPorts.get(port);
    return serialPort ? serialPort.isOpen : false;
  }

  cleanup(): void {
    // Clear all intervals
    for (const port of this.openPorts.keys()) {
      const saveInterval = (this as any)[`saveInterval_${port}`];
      if (saveInterval) {
        clearInterval(saveInterval);
        delete (this as any)[`saveInterval_${port}`];
      }
    }

    // Close all ports
    this.closeAllPorts();
    
    // Clear data structures
    this.recordings.clear();
    this.filters.clear();
  }
}
