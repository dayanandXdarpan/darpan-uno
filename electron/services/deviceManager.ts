import { TerminalExecutor } from './terminalExecutor';
import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';

/**
 * Device & Port Management - Part E of Arduino Agent Toolbelt
 * Advanced device detection, identification, and recovery
 */

export interface DevicePort {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  pnpId?: string;
  friendlyName?: string;
}

export interface IdentifiedDevice {
  port: string;
  fqbn: string;
  board: string;
  confidence: number;
  method: 'probe' | 'vid_pid' | 'manufacturer' | 'bootloader';
}

export interface ResetResult {
  success: boolean;
  method: 'dtr_rts' | '1200bps' | 'manual';
  message: string;
}

export class DeviceManager extends EventEmitter {
  private terminal: TerminalExecutor;
  private monitoringPorts: Set<string> = new Set();

  // Known VID/PID combinations for Arduino boards
  private readonly BOARD_SIGNATURES = {
    // Arduino Uno/Nano (ATmega328P)
    '2341:0043': { fqbn: 'arduino:avr:uno', board: 'Arduino Uno' },
    '2341:0001': { fqbn: 'arduino:avr:uno', board: 'Arduino Uno' },
    '1a86:7523_nano': { fqbn: 'arduino:avr:nano', board: 'Arduino Nano (CH340)' },
    '0403:6001': { fqbn: 'arduino:avr:nano', board: 'Arduino Nano (FTDI)' },
    
    // Arduino Leonardo/Micro (ATmega32u4)
    '2341:0036': { fqbn: 'arduino:avr:leonardo', board: 'Arduino Leonardo' },
    '2341:8036': { fqbn: 'arduino:avr:leonardo', board: 'Arduino Leonardo (bootloader)' },
    '2341:0037': { fqbn: 'arduino:avr:micro', board: 'Arduino Micro' },
    
    // Arduino Mega
    '2341:0042': { fqbn: 'arduino:avr:mega', board: 'Arduino Mega 2560' },
    '2341:0010': { fqbn: 'arduino:avr:mega', board: 'Arduino Mega ADK' },
    
    // ESP32 boards
    '10c4:ea60_esp32': { fqbn: 'esp32:esp32:esp32', board: 'ESP32 Dev Module' },
    '1a86:55d4': { fqbn: 'esp32:esp32:esp32', board: 'ESP32 (CH9102)' },
    
    // ESP8266 boards
    '10c4:ea60_esp8266': { fqbn: 'esp8266:esp8266:nodemcuv2', board: 'NodeMCU v2' },
    '1a86:7523_esp8266': { fqbn: 'esp8266:esp8266:nodemcuv2', board: 'NodeMCU v2 (CH340)' }
  };

  constructor() {
    super();
    this.terminal = new TerminalExecutor();
  }

  /**
   * E) Device & Port Management Tools
   */

  // device.listPorts - enumerate serial/DFU/bootloader ports
  async listPorts(): Promise<DevicePort[]> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId,
        locationId: port.locationId,
        pnpId: port.pnpId,
        friendlyName: (port as any).friendlyName
      }));
    } catch (error) {
      console.error('Failed to list ports:', error);
      return [];
    }
  }

  // device.identify - map port → fqbn by probing
  async identify(port: string): Promise<IdentifiedDevice | null> {
    const ports = await this.listPorts();
    const targetPort = ports.find(p => p.path === port);
    
    if (!targetPort) {
      return null;
    }

    // Method 1: VID/PID lookup (highest confidence)
    if (targetPort.vendorId && targetPort.productId) {
      const signature = `${targetPort.vendorId}:${targetPort.productId}`;
      const boardInfo = this.BOARD_SIGNATURES[signature.toLowerCase()];
      
      if (boardInfo) {
        return {
          port,
          fqbn: boardInfo.fqbn,
          board: boardInfo.board,
          confidence: 0.9,
          method: 'vid_pid'
        };
      }
    }

    // Method 2: Manufacturer-based identification
    if (targetPort.manufacturer) {
      const manufacturer = targetPort.manufacturer.toLowerCase();
      if (manufacturer.includes('arduino')) {
        return {
          port,
          fqbn: 'arduino:avr:uno',
          board: 'Arduino Compatible',
          confidence: 0.7,
          method: 'manufacturer'
        };
      }
      if (manufacturer.includes('espressif')) {
        return {
          port,
          fqbn: 'esp32:esp32:esp32',
          board: 'ESP32 Compatible',
          confidence: 0.7,
          method: 'manufacturer'
        };
      }
    }

    // Method 3: Bootloader probing (lower confidence, requires interaction)
    const bootloaderResult = await this.probeBootloader(port);
    if (bootloaderResult) {
      return bootloaderResult;
    }

    // Method 4: Arduino CLI board detection
    try {
      const result = await this.terminal.run(`arduino-cli board list --format json`);
      const boards = JSON.parse(result.stdout);
      const detectedBoard = boards.find((b: any) => b.address === port);
      
      if (detectedBoard && detectedBoard.boards?.length > 0) {
        const board = detectedBoard.boards[0];
        return {
          port,
          fqbn: board.fqbn,
          board: board.name,
          confidence: 0.8,
          method: 'probe'
        };
      }
    } catch (error) {
      console.warn('Arduino CLI board detection failed:', error);
    }

    return null;
  }

  // device.reset - toggle DTR/RTS or 1200-bps touch
  async reset(port: string, method?: 'dtr_rts' | '1200bps' | 'auto'): Promise<ResetResult> {
    const resetMethod = method || 'auto';
    
    try {
      if (resetMethod === 'dtr_rts' || resetMethod === 'auto') {
        // Standard DTR/RTS reset for most Arduino boards
        const serialPort = new SerialPort({ 
          path: port, 
          baudRate: 9600,
          autoOpen: false 
        });

        return new Promise((resolve) => {
          serialPort.open((err) => {
            if (err) {
              resolve({
                success: false,
                method: 'dtr_rts',
                message: `Failed to open port: ${err.message}`
              });
              return;
            }

            // Toggle DTR/RTS to reset
            serialPort.set({ dtr: false, rts: false }, (err1) => {
              setTimeout(() => {
                serialPort.set({ dtr: true, rts: true }, (err2) => {
                  serialPort.close();
                  
                  if (err1 || err2) {
                    resolve({
                      success: false,
                      method: 'dtr_rts',
                      message: 'Failed to toggle DTR/RTS'
                    });
                  } else {
                    resolve({
                      success: true,
                      method: 'dtr_rts',
                      message: 'Board reset via DTR/RTS'
                    });
                  }
                });
              }, 100);
            });
          });
        });
      }

      if (resetMethod === '1200bps' || (resetMethod === 'auto' && resetMethod !== 'dtr_rts')) {
        // 1200 bps touch for Leonardo/Micro boards
        const serialPort = new SerialPort({ 
          path: port, 
          baudRate: 1200,
          autoOpen: false 
        });

        return new Promise((resolve) => {
          serialPort.open((err) => {
            if (err) {
              resolve({
                success: false,
                method: '1200bps',
                message: `Failed to open port: ${err.message}`
              });
              return;
            }

            // Close immediately to trigger 1200 bps reset
            setTimeout(() => {
              serialPort.close();
              resolve({
                success: true,
                method: '1200bps',
                message: 'Board reset via 1200 bps touch'
              });
            }, 100);
          });
        });
      }
      
      return {
        success: false,
        method: 'manual',
        message: 'Unsupported reset method'
      };
      
    } catch (error) {
      return {
        success: false,
        method: resetMethod as any,
        message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // device.bootloaderMode - force bootloader
  async bootloaderMode(port: string, boardType?: 'esp32' | 'atmega32u4' | 'auto'): Promise<boolean> {
    const type = boardType || 'auto';
    
    if (type === 'esp32' || type === 'auto') {
      // ESP32: Hold BOOT, press EN
      console.log('ESP32 bootloader mode: Hold BOOT button, press EN button, then release BOOT');
      // This would typically require hardware interaction
      // We can implement software methods for some ESP32 variants
      
      try {
        const result = await this.terminal.run('esptool.py --port ' + port + ' --baud 115200 flash_id', { timeout: 5000 });
        return result.exitCode === 0;
      } catch {
        return false;
      }
    }
    
    if (type === 'atmega32u4' || type === 'auto') {
      // Leonardo/Micro: Use 1200 bps reset
      const resetResult = await this.reset(port, '1200bps');
      if (resetResult.success) {
        // Wait for bootloader port to appear
        await this.waitForBootloaderPort(5000);
        return true;
      }
    }
    
    return false;
  }

  // device.otaUpload - OTA for ESP32/ESP8266
  async otaUpload(ip: string, firmware: string, password?: string): Promise<boolean> {
    try {
      const args = [
        '--ip', ip,
        '--file', `"${firmware}"`
      ];
      
      if (password) {
        args.push('--auth', password);
      }
      
      const result = await this.terminal.run(`python -m espota ${args.join(' ')}`);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  // device.safeGuard - pre-upload sanity checks
  async safeGuard(port: string, fqbn: string): Promise<{
    safe: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check if port exists
    const ports = await this.listPorts();
    const portExists = ports.some(p => p.path === port);
    
    if (!portExists) {
      errors.push(`Port ${port} not found`);
    }
    
    // Check FQBN validity
    if (!fqbn || !fqbn.includes(':')) {
      errors.push('Invalid FQBN format');
    }
    
    // Voltage/power checks
    if (fqbn.includes('esp32') || fqbn.includes('esp8266')) {
      warnings.push('ESP boards: Ensure 3.3V power supply');
    }
    
    if (fqbn.includes('arduino:avr:')) {
      warnings.push('Arduino boards: Can use 3.3V or 5V');
    }
    
    // Board-specific warnings
    if (fqbn.includes('leonardo') || fqbn.includes('micro')) {
      warnings.push('Leonardo/Micro: May need 1200 bps reset for upload');
    }
    
    return {
      safe: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Port monitoring and hot-plug detection
   */
  startPortMonitoring(intervalMs: number = 2000): void {
    setInterval(async () => {
      const currentPorts = await this.listPorts();
      const currentPaths = new Set(currentPorts.map(p => p.path));
      
      // Check for new ports
      for (const port of currentPorts) {
        if (!this.monitoringPorts.has(port.path)) {
          this.monitoringPorts.add(port.path);
          this.emit('port:added', port);
          
          // Auto-identify new ports
          const identified = await this.identify(port.path);
          if (identified) {
            this.emit('device:identified', identified);
          }
        }
      }
      
      // Check for removed ports
      for (const monitoredPort of this.monitoringPorts) {
        if (!currentPaths.has(monitoredPort)) {
          this.monitoringPorts.delete(monitoredPort);
          this.emit('port:removed', { path: monitoredPort });
        }
      }
    }, intervalMs);
  }

  /**
   * Private helper methods
   */
  private async probeBootloader(port: string): Promise<IdentifiedDevice | null> {
    // This would implement bootloader-specific probing
    // For now, return null - can be enhanced with specific protocols
    return null;
  }

  private async waitForBootloaderPort(timeoutMs: number): Promise<string | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const ports = await this.listPorts();
      const bootloaderPort = ports.find(p => 
        p.friendlyName?.toLowerCase().includes('bootloader') ||
        p.manufacturer?.toLowerCase().includes('arduino')
      );
      
      if (bootloaderPort) {
        return bootloaderPort.path;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  }

  cleanup(): void {
    this.monitoringPorts.clear();
    this.terminal.cleanup();
  }
}
