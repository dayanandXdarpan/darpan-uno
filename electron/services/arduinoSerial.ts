import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

interface SerialConfig {
  baudRate: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
}

export class ArduinoSerialService extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private isConnected = false;
  private currentPortPath: string | null = null;
  private currentConfig: SerialConfig | null = null;

  constructor() {
    super();
  }

  async getAvailablePorts(): Promise<SerialPortInfo[]> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (error) {
      console.error('Failed to list serial ports:', error);
      return [];
    }
  }

  async connect(portPath: string, config: SerialConfig): Promise<boolean> {
    if (this.isConnected) {
      await this.disconnect();
    }

    try {
      this.port = new SerialPort({
        path: portPath,
        baudRate: config.baudRate,
        dataBits: config.dataBits || 8,
        stopBits: config.stopBits || 1,
        parity: config.parity || 'none'
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      return new Promise((resolve, reject) => {
        this.port!.on('open', () => {
          this.isConnected = true;
          this.currentPortPath = portPath;
          this.currentConfig = config;
          
          console.log(`Connected to ${portPath} at ${config.baudRate} baud`);
          this.emit('connected', { port: portPath, config });
          resolve(true);
        });

        this.port!.on('error', (error) => {
          console.error('Serial port error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.port!.on('close', () => {
          this.isConnected = false;
          this.currentPortPath = null;
          this.currentConfig = null;
          console.log('Serial port closed');
          this.emit('disconnected');
        });

        // Set up data handling
        this.parser!.on('data', (data: string) => {
          const cleanData = data.trim();
          if (cleanData) {
            this.emit('data', cleanData);
            this.emit('rawData', data);
          }
        });

        // Timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to connect to serial port:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.port && this.isConnected) {
      return new Promise((resolve) => {
        this.port!.close((error) => {
          if (error) {
            console.error('Error closing serial port:', error);
          }
          this.port = null;
          this.parser = null;
          this.isConnected = false;
          this.currentPortPath = null;
          this.currentConfig = null;
          resolve();
        });
      });
    }
  }

  async write(data: string): Promise<boolean> {
    if (!this.port || !this.isConnected) {
      console.error('Serial port not connected');
      return false;
    }

    try {
      return new Promise((resolve, reject) => {
        this.port!.write(data + '\n', (error) => {
          if (error) {
            console.error('Failed to write to serial port:', error);
            reject(error);
          } else {
            this.emit('sent', data);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Failed to write to serial port:', error);
      return false;
    }
  }

  async writeRaw(data: string | Buffer): Promise<boolean> {
    if (!this.port || !this.isConnected) {
      console.error('Serial port not connected');
      return false;
    }

    try {
      return new Promise((resolve, reject) => {
        this.port!.write(data, (error) => {
          if (error) {
            console.error('Failed to write raw data to serial port:', error);
            reject(error);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Failed to write raw data to serial port:', error);
      return false;
    }
  }

  getConnectionStatus(): {connected: boolean, port?: string, config?: SerialConfig} {
    return {
      connected: this.isConnected,
      port: this.currentPortPath || undefined,
      config: this.currentConfig || undefined
    };
  }

  async setDTR(value: boolean): Promise<void> {
    if (this.port && this.isConnected) {
      return new Promise((resolve, reject) => {
        this.port!.set({ dtr: value }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  async setRTS(value: boolean): Promise<void> {
    if (this.port && this.isConnected) {
      return new Promise((resolve, reject) => {
        this.port!.set({ rts: value }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  // Reset Arduino by toggling DTR
  async resetArduino(): Promise<void> {
    if (this.isConnected) {
      await this.setDTR(false);
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.setDTR(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.setDTR(false);
    }
  }

  // Utility method to parse numeric data for plotting
  parseNumericData(data: string): number[] {
    const numbers: number[] = [];
    const values = data.split(/[,\s\t]+/);
    
    for (const value of values) {
      const num = parseFloat(value.trim());
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
    
    return numbers;
  }

  // Check if data looks like plotter data (multiple numeric values)
  isPlotterData(data: string): boolean {
    const numbers = this.parseNumericData(data);
    return numbers.length > 1;
  }
}
