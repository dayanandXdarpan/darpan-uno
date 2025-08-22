import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface Board {
  fqbn: string;
  name: string;
  platform: string;
  platformName?: string;
}

export interface Port {
  address: string;
  label: string;
  protocol: string;
  protocolLabel: string;
  boards?: Board[];
}

export interface CompileResult {
  success: boolean;
  output: string;
  errors: CompilerError[];
  warnings: CompilerError[];
  sketchPath?: string;
  binaryPath?: string;
  usedLibraries?: string[];
  buildProperties?: Record<string, string>;
}

export interface CompilerError {
  file: string;
  line: number;
  column: number;
  type: 'error' | 'warning' | 'note';
  message: string;
  suggestion?: string;
  code?: string;
}

export interface Library {
  name: string;
  version: string;
  author: string;
  maintainer: string;
  sentence: string;
  paragraph: string;
  website: string;
  category: string;
  architectures: string[];
  types: string[];
  repository: string;
  providesIncludes: string[];
  dependencies: any[];
}

export class ArduinoCLI {
  private cliPath: string;
  private configPath: string;
  private initialized: boolean = false;
  private daemonProcess: ChildProcess | null = null;
  private useDaemon: boolean = true;

  constructor() {
    // Try to find Arduino CLI in common locations
    this.cliPath = this.findArduinoCLI();
    this.configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.arduino15');
  }

  private findArduinoCLI(): string {
    // First try PATH
    if (process.platform === 'win32') {
      return 'arduino-cli.exe';
    }
    return 'arduino-cli';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test if CLI is available
      await this.runCommand(['version']);
      
      // Initialize configuration if needed
      try {
        await this.runCommand(['config', 'init', '--dest-dir', this.configPath]);
      } catch (error) {
        console.log('Config already exists or init failed:', error);
      }

      // Update board index
      console.log('Updating board index...');
      await this.runCommand(['core', 'update-index']);

      // Install Arduino AVR boards by default if not present
      try {
        const installedCores = await this.runCommand(['core', 'list', '--format', 'json']);
        if (installedCores.stdout.trim()) {
          const cores = JSON.parse(installedCores.stdout);
          
          const hasAVR = cores.some((core: any) => core.id === 'arduino:avr');
          if (!hasAVR) {
            console.log('Installing Arduino AVR boards...');
            await this.runCommand(['core', 'install', 'arduino:avr']);
          }
        } else {
          console.log('No cores installed yet, installing Arduino AVR boards...');
          await this.runCommand(['core', 'install', 'arduino:avr']);
        }
      } catch (error) {
        console.warn('Failed to check/install AVR core. Arduino CLI might not be installed or configured properly.');
        console.warn('Please install Arduino CLI from: https://arduino.github.io/arduino-cli/latest/installation/');
      }

      // Start daemon if enabled
      if (this.useDaemon) {
        await this.startDaemon();
      }

      this.initialized = true;
      console.log('Arduino CLI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Arduino CLI:', error);
      throw new Error(`Arduino CLI initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async startDaemon(): Promise<void> {
    try {
      // For now, we'll use subprocess mode instead of daemon
      // Daemon mode can be implemented later for better performance
      console.log('Using subprocess mode for Arduino CLI');
    } catch (error) {
      console.warn('Failed to start Arduino CLI daemon, falling back to subprocess mode');
      this.useDaemon = false;
    }
  }

  async compile(sketchPath: string, fqbn: string = 'arduino:avr:uno'): Promise<CompileResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const sketchDir = path.dirname(sketchPath);
      const buildPath = path.join(sketchDir, 'build');
      
      // Ensure build directory exists
      await fs.mkdir(buildPath, { recursive: true });

      const args = [
        'compile',
        '--fqbn', fqbn,
        '--build-path', buildPath,
        '--output-dir', buildPath,
        '--verbose',
        '--format', 'json',
        sketchPath
      ];

      const result = await this.runCommand(args);
      
      // Parse compilation output
      const errors = this.parseCompilerOutput(result.stderr);
      const warnings = errors.filter(e => e.type === 'warning');
      const actualErrors = errors.filter(e => e.type === 'error');

      // Find binary file
      let binaryPath: string | undefined;
      if (result.code === 0) {
        const sketchName = path.basename(sketchPath, path.extname(sketchPath));
        const possibleExtensions = ['.hex', '.bin', '.uf2'];
        
        for (const ext of possibleExtensions) {
          const candidatePath = path.join(buildPath, `${sketchName}.ino${ext}`);
          try {
            await fs.access(candidatePath);
            binaryPath = candidatePath;
            break;
          } catch (error) {
            // File doesn't exist, try next
          }
        }
      }

      // Extract used libraries and build properties
      const { usedLibraries, buildProperties } = this.parseCompilerSuccess(result.stdout);

      return {
        success: result.code === 0,
        output: result.stdout,
        errors: actualErrors,
        warnings: warnings,
        sketchPath,
        binaryPath,
        usedLibraries,
        buildProperties
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [{
          file: sketchPath,
          line: 1,
          column: 1,
          type: 'error',
          message: `Compilation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        warnings: []
      };
    }
  }

  async upload(sketchPath: string, fqbn: string, port: string): Promise<CompileResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const args = [
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--verbose',
        sketchPath
      ];

      const result = await this.runCommand(args);
      
      return {
        success: result.code === 0,
        output: result.stdout + '\n' + result.stderr,
        errors: result.code !== 0 ? [{
          file: sketchPath,
          line: 1,
          column: 1,
          type: 'error',
          message: 'Upload failed. Check board connection and port selection.'
        }] : [],
        warnings: []
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [{
          file: sketchPath,
          line: 1,
          column: 1,
          type: 'error',
          message: `Upload failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        warnings: []
      };
    }
  }

  async getBoardList(): Promise<Board[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.runCommand(['board', 'listall', '--format', 'json']);
      
      // Handle empty or whitespace-only output
      if (!result.stdout || !result.stdout.trim()) {
        console.warn('No boards available. Arduino CLI might need initialization.');
        return [];
      }
      
      // Try to parse JSON, handle malformed data
      let data;
      try {
        data = JSON.parse(result.stdout.trim());
      } catch (parseError) {
        console.error('Failed to parse board list JSON:', result.stdout);
        return [];
      }
      
      return data.boards?.map((board: any) => ({
        fqbn: board.fqbn,
        name: board.name,
        platform: board.platform,
        platformName: board.platform_name
      })) || [];
    } catch (error) {
      console.error('Failed to get board list:', error);
      return [];
    }
  }

  async getPortList(): Promise<Port[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.runCommand(['board', 'list', '--format', 'json']);
      
      // Handle empty or whitespace-only output
      if (!result.stdout || !result.stdout.trim()) {
        console.warn('No port data available from Arduino CLI');
        return [];
      }
      
      // Try to parse JSON, handle malformed data
      let data;
      try {
        data = JSON.parse(result.stdout.trim());
      } catch (parseError) {
        console.error('Failed to parse port list JSON:', result.stdout);
        return [];
      }
      
      return data.ports?.map((port: any) => ({
        address: port.address,
        label: port.label || port.address,
        protocol: port.protocol,
        protocolLabel: port.protocol_label,
        boards: port.boards?.map((board: any) => ({
          fqbn: board.fqbn,
          name: board.name,
          platform: board.platform
        }))
      })) || [];
    } catch (error) {
      console.error('Failed to get port list:', error);
      return [];
    }
  }

  async installLibrary(library: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.runCommand(['lib', 'install', library]);
      return result.code === 0;
    } catch (error) {
      console.error('Failed to install library:', error);
      return false;
    }
  }

  async searchLibraries(query: string): Promise<Library[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.runCommand(['lib', 'search', query, '--format', 'json']);
      const data = JSON.parse(result.stdout);
      
      return data.libraries?.map((lib: any) => ({
        name: lib.name,
        version: lib.latest_version,
        author: lib.author,
        maintainer: lib.maintainer,
        sentence: lib.sentence,
        paragraph: lib.paragraph,
        website: lib.website,
        category: lib.category,
        architectures: lib.architectures || [],
        types: lib.types || [],
        repository: lib.repository,
        providesIncludes: lib.provides_includes || [],
        dependencies: lib.dependencies || []
      })) || [];
    } catch (error) {
      console.error('Failed to search libraries:', error);
      return [];
    }
  }

  async getInstalledLibraries(): Promise<Library[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.runCommand(['lib', 'list', '--format', 'json']);
      const data = JSON.parse(result.stdout);
      
      return data.installed_libraries?.map((lib: any) => ({
        name: lib.library.name,
        version: lib.library.version,
        author: lib.library.author,
        maintainer: lib.library.maintainer,
        sentence: lib.library.sentence,
        paragraph: lib.library.paragraph,
        website: lib.library.website,
        category: lib.library.category,
        architectures: lib.library.architectures || [],
        types: lib.library.types || [],
        repository: lib.library.repository,
        providesIncludes: lib.library.provides_includes || [],
        dependencies: lib.library.dependencies || []
      })) || [];
    } catch (error) {
      console.error('Failed to get installed libraries:', error);
      return [];
    }
  }

  private parseCompilerOutput(output: string): CompilerError[] {
    const errors: CompilerError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse GCC-style error format: file:line:column: error/warning: message
      let match = line.match(/(.+?):(\d+):(\d+):\s+(error|warning|note):\s+(.+)/);
      if (!match) {
        // Try alternative format without column
        match = line.match(/(.+?):(\d+):\s+(error|warning|note):\s+(.+)/);
        if (match) {
          errors.push({
            file: this.normalizeFilePath(match[1]),
            line: parseInt(match[2]),
            column: 1,
            type: match[3] as 'error' | 'warning' | 'note',
            message: match[4],
            suggestion: this.generateSuggestion(match[4])
          });
        }
      } else {
        errors.push({
          file: this.normalizeFilePath(match[1]),
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          type: match[4] as 'error' | 'warning' | 'note',
          message: match[5],
          suggestion: this.generateSuggestion(match[5])
        });
      }
    }
    
    return errors;
  }

  private parseCompilerSuccess(output: string): { usedLibraries: string[], buildProperties: Record<string, string> } {
    const usedLibraries: string[] = [];
    const buildProperties: Record<string, string> = {};

    // Extract used libraries from verbose output
    const lines = output.split('\n');
    for (const line of lines) {
      // Look for library usage patterns
      if (line.includes('Using library') && line.includes('at version')) {
        const match = line.match(/Using library (.+?) at version (.+?) in folder/);
        if (match) {
          usedLibraries.push(`${match[1]}@${match[2]}`);
        }
      }
    }

    return { usedLibraries, buildProperties };
  }

  private normalizeFilePath(filePath: string): string {
    // Convert absolute paths to relative if they're in the project
    if (path.isAbsolute(filePath)) {
      // Try to make it relative to current working directory
      try {
        return path.relative(process.cwd(), filePath);
      } catch (error) {
        return filePath;
      }
    }
    return filePath;
  }

  private generateSuggestion(errorMessage: string): string | undefined {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('was not declared')) {
      return "Check if the variable or function is declared before use, or if you need to include a library.";
    }
    if (message.includes("expected ';'")) {
      return "Add a semicolon at the end of the statement.";
    }
    if (message.includes('undeclared')) {
      return "Make sure to declare the variable or include the necessary library.";
    }
    if (message.includes('no matching function')) {
      return "Check the function name and parameters. You might need to include a library or declare the function.";
    }
    if (message.includes('does not name a type')) {
      return "Check if you've included the necessary header file or library for this type.";
    }
    if (message.includes("expected ')'") || message.includes("expected '('")) {
      return "Check for missing or extra parentheses in your code.";
    }
    if (message.includes("expected '}'") || message.includes("expected '{'")) {
      return "Check for missing or extra braces in your code blocks.";
    }
    
    return undefined;
  }

  private runCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const childProcess = spawn(this.cliPath, args, {
        env: { 
          ...process.env, 
          ARDUINO_DATA_DIR: this.configPath,
          ARDUINO_DIRECTORIES_DATA: this.configPath 
        }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data: any) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code: any) => {
        resolve({ stdout, stderr, code: code || 0 });
      });

      childProcess.on('error', (error: any) => {
        resolve({ 
          stdout, 
          stderr: `Process error: ${error.message}`, 
          code: 1 
        });
      });
    });
  }

  cleanup(): void {
    if (this.daemonProcess) {
      this.daemonProcess.kill();
      this.daemonProcess = null;
    }
  }
}