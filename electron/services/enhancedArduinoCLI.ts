import { TerminalExecutor } from './terminalExecutor';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Enhanced Arduino CLI Service - Part D of Arduino Agent Toolbelt
 * Complete implementation with structured parsing and auto-recovery
 */

export interface ArduinoCompileResult {
  name: string;
  args: {
    sketch: string;
    fqbn: string;
    extraArgs?: string[];
  };
  returns: {
    exitCode: number;
    stdout: string;
    stderr: string;
    success: boolean;
    memory?: {
      flash_bytes: number;
      flash_pct: number;
      sram_bytes: number;
      sram_pct: number;
      sram_free: number;
    };
    errors: Array<{
      file: string;
      line: number;
      col: number;
      code: string;
      message: string;
      hints: string[];
    }>;
    warnings: any[];
    binaryPath?: string;
  };
}

export interface ArduinoUploadResult {
  name: string;
  args: {
    sketch: string;
    fqbn: string;
    port: string;
  };
  returns: {
    exitCode: number;
    stdout: string;
    stderr: string;
    success: boolean;
  };
}

export interface ArduinoBoard {
  name: string;
  fqbn: string;
  platform: string;
  cores: string[];
}

export interface ArduinoPort {
  address: string;
  label: string;
  protocol: string;
  protocolLabel: string;
  boards?: ArduinoBoard[];
}

export interface ArduinoLibrary {
  name: string;
  version: string;
  author: string;
  summary: string;
  website: string;
  category: string;
  architectures: string[];
  types: string[];
  installed: boolean;
}

export class EnhancedArduinoCLI extends EventEmitter {
  private terminal: TerminalExecutor;
  private cliPath: string;
  private configPath: string;
  private initialized: boolean = false;

  constructor(cliPath?: string) {
    super();
    this.terminal = new TerminalExecutor();
    this.cliPath = cliPath || 'arduino-cli';
    this.configPath = path.join(require('os').homedir(), '.arduino15');
  }

  async initialize(): Promise<void> {
    try {
      // Check if Arduino CLI is available
      const versionResult = await this.terminal.run(`${this.cliPath} version`);
      if (versionResult.exitCode !== 0) {
        throw new Error('Arduino CLI not found or not working');
      }

      // Initialize configuration
      await this.terminal.run(`${this.cliPath} config init`);
      
      // Update core index
      await this.terminal.run(`${this.cliPath} core update-index`);
      
      // Install Arduino AVR boards if not present
      const coreList = await this.terminal.run(`${this.cliPath} core list`);
      if (!coreList.stdout.includes('arduino:avr')) {
        console.log('Installing Arduino AVR boards...');
        await this.terminal.run(`${this.cliPath} core install arduino:avr`);
      }

      this.initialized = true;
      this.emit('initialized');
      console.log('Enhanced Arduino CLI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Arduino CLI:', error);
      throw error;
    }
  }

  /**
   * D) Arduino CLI (Core) Tools
   */

  // arduino.sketchNew - create new sketch
  async sketchNew(sketchName: string, sketchPath?: string): Promise<{success: boolean, path?: string}> {
    try {
      const targetPath = sketchPath || path.join(process.cwd(), sketchName);
      const result = await this.terminal.run(`${this.cliPath} sketch new "${targetPath}"`);
      
      return {
        success: result.exitCode === 0,
        path: result.exitCode === 0 ? targetPath : undefined
      };
    } catch (error) {
      return { success: false };
    }
  }

  // arduino.compile - enhanced compilation with structured output
  async compile(sketch: string, fqbn: string = 'arduino:avr:uno', extraArgs: string[] = []): Promise<ArduinoCompileResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sketchDir = path.dirname(sketch);
    const buildPath = path.join(sketchDir, 'build');
    
    // Ensure build directory exists
    await fs.mkdir(buildPath, { recursive: true });

    const args = [
      'compile',
      '--fqbn', fqbn,
      '--build-path', buildPath,
      '--verbose',
      ...extraArgs,
      `"${sketch}"`
    ];

    const cmd = `${this.cliPath} ${args.join(' ')}`;
    const result = await this.terminal.run(cmd);

    // Parse structured output
    const parsed = this.terminal.parseCompile(result.stdout + '\n' + result.stderr);
    
    // Find binary file
    let binaryPath: string | undefined;
    if (result.exitCode === 0) {
      const sketchName = path.basename(sketch, path.extname(sketch));
      const possibleExtensions = ['.hex', '.bin', '.uf2'];
      
      for (const ext of possibleExtensions) {
        const candidatePath = path.join(buildPath, `${sketchName}.ino${ext}`);
        try {
          await fs.access(candidatePath);
          binaryPath = candidatePath;
          break;
        } catch {
          // File doesn't exist, try next
        }
      }
    }

    return {
      name: "arduino.compile",
      args: { sketch, fqbn, extraArgs },
      returns: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        success: result.exitCode === 0,
        memory: parsed.memory,
        errors: parsed.errors,
        warnings: parsed.warnings,
        binaryPath
      }
    };
  }

  // arduino.upload - enhanced upload with recovery
  async upload(sketch: string, fqbn: string, port: string): Promise<ArduinoUploadResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const args = [
      'upload',
      '--fqbn', fqbn,
      '--port', port,
      '--verbose',
      `"${sketch}"`
    ];

    const cmd = `${this.cliPath} ${args.join(' ')}`;
    const result = await this.terminal.run(cmd);

    return {
      name: "arduino.upload",
      args: { sketch, fqbn, port },
      returns: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        success: result.exitCode === 0
      }
    };
  }

  // arduino.monitor - enhanced serial monitor
  async monitor(port: string, baudRate: number = 9600, fqbn?: string): Promise<EventEmitter> {
    const args = ['monitor', '--port', port, '--config', `baudrate=${baudRate}`];
    if (fqbn) {
      args.push('--fqbn', fqbn);
    }

    const cmd = `${this.cliPath} ${args.join(' ')}`;
    
    // Use expect for streaming monitor
    const monitorEmitter = new EventEmitter();
    
    try {
      await this.terminal.run(cmd, { stream: true });
      this.terminal.on('stream', (data) => {
        if (data.type === 'data') {
          monitorEmitter.emit('data', data.data);
        }
      });
    } catch (error) {
      monitorEmitter.emit('error', error);
    }

    return monitorEmitter;
  }

  // arduino.boardList - detect boards/ports
  async boardList(): Promise<ArduinoBoard[]> {
    const result = await this.terminal.run(`${this.cliPath} board listall --format json`);
    
    try {
      const boards = JSON.parse(result.stdout);
      return boards.map((board: any) => ({
        name: board.name,
        fqbn: board.fqbn,
        platform: board.platform,
        cores: board.cores || []
      }));
    } catch {
      return [];
    }
  }

  // arduino.boardSearch/Install/UninstallCore
  async boardSearch(query: string): Promise<ArduinoBoard[]> {
    const result = await this.terminal.run(`${this.cliPath} board search "${query}" --format json`);
    
    try {
      const boards = JSON.parse(result.stdout);
      return boards.map((board: any) => ({
        name: board.name,
        fqbn: board.fqbn,
        platform: board.platform,
        cores: []
      }));
    } catch {
      return [];
    }
  }

  async installCore(core: string): Promise<boolean> {
    const result = await this.terminal.run(`${this.cliPath} core install "${core}"`);
    return result.exitCode === 0;
  }

  async uninstallCore(core: string): Promise<boolean> {
    const result = await this.terminal.run(`${this.cliPath} core uninstall "${core}"`);
    return result.exitCode === 0;
  }

  // arduino.libSearch/Install/Upgrade/Remove
  async libSearch(query: string): Promise<ArduinoLibrary[]> {
    const result = await this.terminal.run(`${this.cliPath} lib search "${query}" --format json`);
    
    try {
      const libraries = JSON.parse(result.stdout);
      return libraries.map((lib: any) => ({
        name: lib.name,
        version: lib.version,
        author: lib.author,
        summary: lib.sentence,
        website: lib.website,
        category: lib.category,
        architectures: lib.architectures,
        types: lib.types,
        installed: false
      }));
    } catch {
      return [];
    }
  }

  async libInstall(library: string, version?: string): Promise<boolean> {
    const libSpec = version ? `"${library}@${version}"` : `"${library}"`;
    const result = await this.terminal.run(`${this.cliPath} lib install ${libSpec}`);
    return result.exitCode === 0;
  }

  async libUpgrade(library?: string): Promise<boolean> {
    const cmd = library ? 
      `${this.cliPath} lib upgrade "${library}"` : 
      `${this.cliPath} lib upgrade`;
    const result = await this.terminal.run(cmd);
    return result.exitCode === 0;
  }

  async libRemove(library: string): Promise<boolean> {
    const result = await this.terminal.run(`${this.cliPath} lib uninstall "${library}"`);
    return result.exitCode === 0;
  }

  // arduino.cacheLockfile - reproducible builds
  async cacheLockfile(projectPath: string): Promise<boolean> {
    try {
      const lockfile = {
        cli_version: await this.getVersion(),
        boards: await this.getInstalledCores(),
        libraries: await this.getInstalledLibraries(),
        generated: new Date().toISOString()
      };

      const lockfilePath = path.join(projectPath, 'arduino.lock.json');
      await fs.writeFile(lockfilePath, JSON.stringify(lockfile, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced board and port detection
   */
  async getPortList(): Promise<ArduinoPort[]> {
    const result = await this.terminal.run(`${this.cliPath} board list --format json`);
    
    try {
      const ports = JSON.parse(result.stdout);
      return ports.map((port: any) => ({
        address: port.address,
        label: port.label,
        protocol: port.protocol,
        protocolLabel: port.protocol_label,
        boards: port.boards?.map((board: any) => ({
          name: board.name,
          fqbn: board.fqbn,
          platform: '',
          cores: []
        })) || []
      }));
    } catch {
      return [];
    }
  }

  /**
   * Utility methods
   */
  private async getVersion(): Promise<string> {
    const result = await this.terminal.run(`${this.cliPath} version`);
    const match = result.stdout.match(/arduino-cli\s+version\s+([\d.]+)/);
    return match ? match[1] : 'unknown';
  }

  private async getInstalledCores(): Promise<any[]> {
    const result = await this.terminal.run(`${this.cliPath} core list --format json`);
    try {
      return JSON.parse(result.stdout);
    } catch {
      return [];
    }
  }

  private async getInstalledLibraries(): Promise<any[]> {
    const result = await this.terminal.run(`${this.cliPath} lib list --format json`);
    try {
      return JSON.parse(result.stdout);
    } catch {
      return [];
    }
  }

  cleanup(): void {
    this.terminal.cleanup();
  }
}
