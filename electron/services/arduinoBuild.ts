import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';

interface CompileResult {
  success: boolean;
  output?: string;
  errors?: string[];
  diagnostics?: Diagnostic[];
}

interface UploadResult {
  success: boolean;
  output?: string;
  error?: string;
}

interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export class ArduinoBuildService extends EventEmitter {
  private arduinoCliPath: string;
  private daemonProcess: ChildProcess | null = null;
  private isInitialized = false;

  constructor(arduinoCliPath?: string) {
    super();
    this.arduinoCliPath = arduinoCliPath || 'arduino-cli';
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if arduino-cli is available
      const versionResult = await this.runCommand(['version']);
      if (versionResult.success) {
        this.isInitialized = true;
        this.emit('initialized');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize Arduino CLI:', error);
      return false;
    }
  }

  async startDaemon(): Promise<boolean> {
    if (this.daemonProcess) {
      return true; // Already running
    }

    return new Promise((resolve) => {
      this.daemonProcess = spawn(this.arduinoCliPath, ['daemon'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.daemonProcess.on('spawn', () => {
        console.log('Arduino CLI daemon started');
        resolve(true);
      });

      this.daemonProcess.on('error', (error) => {
        console.error('Arduino CLI daemon error:', error);
        resolve(false);
      });

      this.daemonProcess.on('exit', (code) => {
        console.log(`Arduino CLI daemon exited with code ${code}`);
        this.daemonProcess = null;
      });
    });
  }

  async stopDaemon(): Promise<void> {
    if (this.daemonProcess) {
      this.daemonProcess.kill();
      this.daemonProcess = null;
    }
  }

  async compile(sketchPath: string, fqbn: string): Promise<CompileResult> {
    try {
      const result = await this.runCommand([
        'compile',
        '--fqbn', fqbn,
        '--format', 'json',
        '--build-path', path.join(path.dirname(sketchPath), 'build'),
        sketchPath
      ]);

      if (result.success) {
        return {
          success: true,
          output: result.stdout,
          diagnostics: this.parseCompileOutput(result.stdout || '')
        };
      } else {
        return {
          success: false,
          errors: [result.stderr || 'Compilation failed'],
          diagnostics: this.parseCompileErrors(result.stderr || '')
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async upload(sketchPath: string, fqbn: string, port: string): Promise<UploadResult> {
    try {
      const result = await this.runCommand([
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--input-dir', path.join(path.dirname(sketchPath), 'build'),
        sketchPath
      ]);

      return {
        success: result.success,
        output: result.stdout,
        error: result.success ? undefined : result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBoardList(): Promise<Array<{name: string, fqbn: string}>> {
    try {
      const result = await this.runCommand(['board', 'listall', '--format', 'json']);
      if (result.success && result.stdout) {
        const data = JSON.parse(result.stdout);
        return data.boards || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get board list:', error);
      return [];
    }
  }

  async getConnectedBoards(): Promise<Array<{port: string, boards: any[]}>> {
    try {
      const result = await this.runCommand(['board', 'list', '--format', 'json']);
      if (result.success && result.stdout) {
        const data = JSON.parse(result.stdout);
        return data.ports || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get connected boards:', error);
      return [];
    }
  }

  async installLibrary(libraryName: string): Promise<boolean> {
    try {
      const result = await this.runCommand(['lib', 'install', libraryName]);
      return result.success;
    } catch (error) {
      console.error('Failed to install library:', error);
      return false;
    }
  }

  async searchLibraries(query: string): Promise<any[]> {
    try {
      const result = await this.runCommand(['lib', 'search', query, '--format', 'json']);
      if (result.success && result.stdout) {
        const data = JSON.parse(result.stdout);
        return data.libraries || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to search libraries:', error);
      return [];
    }
  }

  private async runCommand(args: string[]): Promise<{success: boolean, stdout?: string, stderr?: string}> {
    return new Promise((resolve) => {
      const process = spawn(this.arduinoCliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          stderr: error.message
        });
      });
    });
  }

  private parseCompileOutput(output: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(':') && (line.includes('error:') || line.includes('warning:'))) {
          const diagnostic = this.parseCompileLine(line);
          if (diagnostic) {
            diagnostics.push(diagnostic);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse compile output:', error);
    }
    return diagnostics;
  }

  private parseCompileErrors(stderr: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    try {
      const lines = stderr.split('\n');
      for (const line of lines) {
        const diagnostic = this.parseCompileLine(line);
        if (diagnostic) {
          diagnostics.push(diagnostic);
        }
      }
    } catch (error) {
      console.error('Failed to parse compile errors:', error);
    }
    return diagnostics;
  }

  private parseCompileLine(line: string): Diagnostic | null {
    // Parse lines like: "sketch.ino:5:10: error: 'foo' was not declared in this scope"
    const match = line.match(/^(.+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]) - 1, // Convert to 0-based
        column: parseInt(match[3]) - 1,
        severity: match[4] as 'error' | 'warning' | 'info',
        message: match[5]
      };
    }
    return null;
  }
}
