import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Terminal Executor - Core tool for all shell commands
 * Part A of Arduino Agent Toolbelt
 */

export interface TerminalResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  chunks?: string[];
}

export interface TerminalExpectResult {
  matched: boolean;
  capture?: string;
  logs: string[];
}

export interface StreamEvent {
  type: 'data' | 'error' | 'close';
  data?: string;
  error?: string;
}

export class TerminalExecutor extends EventEmitter {
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private streamHandlers: Map<string, EventEmitter> = new Map();

  /**
   * A) Terminal + Execution (the backbone)
   */

  // terminal.run - run any shell command (sync/streaming)
  async run(cmd: string, options?: {
    cwd?: string;
    env?: Record<string, string>;
    stream?: boolean;
    timeout?: number;
  }): Promise<TerminalResult> {
    return new Promise((resolve, reject) => {
      const args = this.parseCommand(cmd);
      const command = args.shift();
      
      if (!command) {
        reject(new Error('No command provided'));
        return;
      }

      const childProcess = spawn(command, args, {
        cwd: options?.cwd || process.cwd(),
        env: { ...process.env, ...options?.env },
        shell: true,
        stdio: options?.stream ? 'pipe' : 'pipe'
      });

      let stdout = '';
      let stderr = '';
      const chunks: string[] = [];

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          stdout += chunk;
          chunks.push(chunk);
          
          if (options?.stream) {
            this.emit('stream', { type: 'data', data: chunk });
          }
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          stderr += chunk;
          
          if (options?.stream) {
            this.emit('stream', { type: 'error', data: chunk });
          }
        });
      }

      childProcess.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          chunks: options?.stream ? chunks : undefined
        });
      });

      childProcess.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      if (options?.timeout) {
        setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  // terminal.expect - run until a regex/phrase appears
  async expect(cmd: string, expect: string | RegExp, timeoutMs: number = 5000): Promise<TerminalExpectResult> {
    return new Promise((resolve) => {
      const expectRegex = typeof expect === 'string' ? new RegExp(expect) : expect;
      const logs: string[] = [];
      let matched = false;
      let capture: string | undefined;

      const args = this.parseCommand(cmd);
      const command = args.shift();
      
      if (!command) {
        resolve({ matched: false, logs });
        return;
      }

      const childProcess = spawn(command, args, {
        shell: true,
        stdio: 'pipe'
      });

      let timeout: NodeJS.Timeout;

      const cleanup = () => {
        if (timeout) clearTimeout(timeout);
        if (!childProcess.killed) childProcess.kill();
      };

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          logs.push(chunk);

          const match = chunk.match(expectRegex);
          if (match && !matched) {
            matched = true;
            capture = match[1] || match[0];
            cleanup();
            resolve({ matched: true, capture, logs });
          }
        });
      }

      timeout = setTimeout(() => {
        cleanup();
        resolve({ matched: false, logs });
      }, timeoutMs);

      childProcess.on('close', () => {
        if (!matched) {
          cleanup();
          resolve({ matched: false, logs });
        }
      });
    });
  }

  // terminal.captureStream - attach to a long-running process
  captureStream(pidOrHandle: string, onDataPatterns?: RegExp[]): EventEmitter {
    const emitter = new EventEmitter();
    this.streamHandlers.set(pidOrHandle, emitter);

    // This would be implemented based on the specific process
    // For now, return the emitter for external handling
    return emitter;
  }

  // terminal.kill - stop a process by pid/handle
  kill(pidOrHandle: string): boolean {
    const process = this.runningProcesses.get(pidOrHandle);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      this.runningProcesses.delete(pidOrHandle);
      return true;
    }
    return false;
  }

  // terminal.parseCompile - parse Arduino CLI output to structured JSON
  parseCompile(output: string): {
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
    warnings: Array<{
      file: string;
      line: number;
      col: number;
      message: string;
    }>;
  } {
    const result = {
      success: false,
      memory: undefined as any,
      errors: [] as any[],
      warnings: [] as any[]
    };

    const lines = output.split('\n');

    for (const line of lines) {
      // Parse memory usage
      const memoryMatch = line.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage space\. Maximum is (\d+) bytes\./);
      if (memoryMatch) {
        const flashUsed = parseInt(memoryMatch[1]);
        const flashPct = parseInt(memoryMatch[2]);
        const flashMax = parseInt(memoryMatch[3]);

        result.memory = {
          flash_bytes: flashUsed,
          flash_pct: flashPct,
          sram_bytes: 0,
          sram_pct: 0,
          sram_free: 0
        };
      }

      const sramMatch = line.match(/Global variables use (\d+) bytes \((\d+)%\) of dynamic memory, leaving (\d+) bytes for local variables\. Maximum is (\d+) bytes\./);
      if (sramMatch && result.memory) {
        result.memory.sram_bytes = parseInt(sramMatch[1]);
        result.memory.sram_pct = parseInt(sramMatch[2]);
        result.memory.sram_free = parseInt(sramMatch[3]);
      }

      // Parse errors and warnings
      const errorMatch = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning):\s*(.+)$/);
      if (errorMatch) {
        const [, file, lineNum, col, severity, message] = errorMatch;
        
        if (severity === 'error') {
          result.errors.push({
            file,
            line: parseInt(lineNum),
            col: parseInt(col),
            code: this.getErrorCode(message),
            message,
            hints: this.generateHints(message)
          });
        } else if (severity === 'warning') {
          result.warnings.push({
            file,
            line: parseInt(lineNum),
            col: parseInt(col),
            message
          });
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  // terminal.parseMemoryMap - parse memory usage lines
  parseMemoryMap(output: string): {
    flash: { used: number; total: number; percentage: number };
    sram: { used: number; total: number; percentage: number; free: number };
  } | null {
    const flashMatch = output.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage space\. Maximum is (\d+) bytes\./);
    const sramMatch = output.match(/Global variables use (\d+) bytes \((\d+)%\) of dynamic memory, leaving (\d+) bytes for local variables\. Maximum is (\d+) bytes\./);

    if (!flashMatch || !sramMatch) return null;

    return {
      flash: {
        used: parseInt(flashMatch[1]),
        percentage: parseInt(flashMatch[2]),
        total: parseInt(flashMatch[3])
      },
      sram: {
        used: parseInt(sramMatch[1]),
        percentage: parseInt(sramMatch[2]),
        free: parseInt(sramMatch[3]),
        total: parseInt(sramMatch[4])
      }
    };
  }

  // terminal.parseError - normalize GCC/clang/ld errors
  parseError(errorOutput: string): Array<{
    file: string;
    line: number;
    col: number;
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }> {
    const errors: any[] = [];
    const lines = errorOutput.split('\n');

    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning|note|info):\s*(.+)$/);
      if (match) {
        const [, file, lineNum, col, severity, message] = match;
        errors.push({
          file,
          line: parseInt(lineNum),
          col: parseInt(col),
          code: this.getErrorCode(message),
          message,
          severity: severity === 'note' ? 'info' : severity as 'error' | 'warning' | 'info'
        });
      }
    }

    return errors;
  }

  private parseCommand(cmd: string): string[] {
    // Simple command parsing - can be enhanced for complex cases
    return cmd.split(' ').filter(arg => arg.length > 0);
  }

  private getErrorCode(message: string): string {
    if (message.includes('was not declared in this scope')) return 'E_UNDECLARED';
    if (message.includes('undefined reference')) return 'E_UNDEFINED_REF';
    if (message.includes('expected')) return 'E_SYNTAX';
    if (message.includes('does not name a type')) return 'E_UNKNOWN_TYPE';
    return 'E_GENERIC';
  }

  private generateHints(message: string): string[] {
    const hints: string[] = [];
    
    if (message.includes('WiFi')) {
      hints.push("Missing include? Try: #include <WiFi.h> (ESP) or <WiFi101.h> (SAMD)");
      hints.push("Install proper library and select correct FQBN");
    }
    
    if (message.includes('Serial')) {
      hints.push("For most Arduino boards, Serial is available by default");
      hints.push("Check if you're using the correct Serial instance (Serial1, Serial2, etc.)");
    }

    if (message.includes('was not declared')) {
      hints.push("Check if the identifier is spelled correctly");
      hints.push("Ensure required libraries are included");
      hints.push("Verify the identifier is in scope");
    }

    return hints;
  }

  cleanup(): void {
    // Kill all running processes
    for (const [handle, process] of this.runningProcesses) {
      if (!process.killed) {
        process.kill();
      }
    }
    this.runningProcesses.clear();
    this.streamHandlers.clear();
  }
}
