import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

export interface SerialConfig {
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 1.5 | 2;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  autoOpen: boolean;
}

export class SerialManager extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private isConnected: boolean = false;
  private currentPortPath: string | null = null;
  private currentConfig: SerialConfig | null = null;
  private dataBuffer: string[] = [];
  private maxBufferSize: number = 1000;

  constructor() {
    super();
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        locationId: port.locationId,
        productId: port.productId,
        vendorId: port.vendorId
      }));
    } catch (error) {
      console.error('Failed to list serial ports:', error);
      this.emit('error', `Failed to list ports: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async connect(portPath: string, baudRate: number = 9600): Promise<{ success: boolean; message: string }> {
    try {
      // Close existing connection
      if (this.isConnected) {
        await this.disconnect();
      }

      const config: SerialConfig = {
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
      };

      this.port = new SerialPort({
        path: portPath,
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        autoOpen: config.autoOpen
      });

      // Setup parser for line-based reading
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      // Setup event handlers
      this.port.on('open', () => {
        this.isConnected = true;
        this.currentPortPath = portPath;
        this.currentConfig = config;
        console.log(`Serial port ${portPath} opened successfully`);
        this.emit('connected', { port: portPath, config });
      });

      this.port.on('error', (error) => {
        console.error('Serial port error:', error);
        this.isConnected = false;
        this.emit('error', `Serial port error: ${error.message}`);
      });

      this.port.on('close', () => {
        console.log('Serial port closed');
        this.isConnected = false;
        this.currentPortPath = null;
        this.currentConfig = null;
        this.emit('disconnected');
      });

      // Handle incoming data
      this.parser.on('data', (data: string) => {
        const trimmedData = data.trim();
        if (trimmedData) {
          // Add to buffer
          this.dataBuffer.push(trimmedData);
          
          // Maintain buffer size
          if (this.dataBuffer.length > this.maxBufferSize) {
            this.dataBuffer.shift();
          }

          // Emit data event
          this.emit('data', trimmedData);
        }
      });

      // Open the port
      await new Promise<void>((resolve, reject) => {
        this.port!.open((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      return {
        success: true,
        message: `Connected to ${portPath} at ${baudRate} baud`
      };

    } catch (error) {
      console.error('Failed to connect to serial port:', error);
      this.isConnected = false;
      return {
        success: false,
        message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.port || !this.isConnected) {
        return {
          success: true,
          message: 'No active connection to disconnect'
        };
      }

      await new Promise<void>((resolve, reject) => {
        this.port!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Clean up
      this.port = null;
      this.parser = null;
      this.isConnected = false;
      this.currentPortPath = null;
      this.currentConfig = null;

      return {
        success: true,
        message: 'Disconnected successfully'
      };

    } catch (error) {
      console.error('Failed to disconnect serial port:', error);
      return {
        success: false,
        message: `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async send(data: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.port || !this.isConnected) {
        return {
          success: false,
          message: 'No active serial connection'
        };
      }

      // Add newline if not present
      const dataToSend = data.endsWith('\n') ? data : data + '\n';

      await new Promise<void>((resolve, reject) => {
        this.port!.write(dataToSend, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      return {
        success: true,
        message: 'Data sent successfully'
      };

    } catch (error) {
      console.error('Failed to send data:', error);
      return {
        success: false,
        message: `Failed to send data: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  getConnectionStatus(): {
    isConnected: boolean;
    port?: string;
    config?: SerialConfig;
  } {
    return {
      isConnected: this.isConnected,
      port: this.currentPortPath || undefined,
      config: this.currentConfig || undefined
    };
  }

  getDataBuffer(): string[] {
    return [...this.dataBuffer];
  }

  clearDataBuffer(): void {
    this.dataBuffer = [];
  }

  setBufferSize(size: number): void {
    this.maxBufferSize = Math.max(100, size);
    
    // Trim buffer if necessary
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer = this.dataBuffer.slice(-this.maxBufferSize);
    }
  }

  // Send raw bytes (useful for binary protocols)
  async sendBytes(data: Buffer): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.port || !this.isConnected) {
        return {
          success: false,
          message: 'No active serial connection'
        };
      }

      await new Promise<void>((resolve, reject) => {
        this.port!.write(data, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      return {
        success: true,
        message: 'Bytes sent successfully'
      };

    } catch (error) {
      console.error('Failed to send bytes:', error);
      return {
        success: false,
        message: `Failed to send bytes: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Get port info for connected port
  async getPortInfo(): Promise<SerialPortInfo | null> {
    if (!this.currentPortPath) {
      return null;
    }

    const ports = await this.listPorts();
    return ports.find(port => port.path === this.currentPortPath) || null;
  }

  cleanup(): void {
    if (this.isConnected) {
      this.disconnect();
    }
    this.removeAllListeners();
  }
}
