const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

class ArduinoBuildService extends EventEmitter {
  constructor(arduinoCliPath) {
    super();
    this.arduinoCliPath = arduinoCliPath || 'arduino-cli';
    this.daemonProcess = null;
    this.isInitialized = false;
  }

  async initialize() {
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

  async compile(sketchPath, fqbn) {
    if (!this.isInitialized) {
      throw new Error('Arduino CLI not initialized');
    }

    try {
      this.emit('progress', { stage: 'compile', message: 'Starting compilation...' });
      
      const buildDir = path.join(path.dirname(sketchPath), 'build');
      
      // Ensure build directory exists
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      const args = [
        'compile',
        '--fqbn', fqbn,
        '--build-path', buildDir,
        '--verbose',
        '--output-dir', buildDir,
        sketchPath
      ];

      const result = await this.runCommand(args);
      
      if (result.success) {
        this.emit('progress', { stage: 'compile', message: 'Compilation successful!' });
        return {
          success: true,
          output: result.output,
          buildPath: buildDir
        };
      } else {
        const diagnostics = this.parseCompilerOutput(result.output || result.error || '');
        this.emit('progress', { stage: 'compile', message: 'Compilation failed', error: true });
        return {
          success: false,
          output: result.output,
          error: result.error,
          diagnostics
        };
      }
    } catch (error) {
      this.emit('progress', { stage: 'compile', message: `Compilation error: ${error.message}`, error: true });
      return {
        success: false,
        error: error.message
      };
    }
  }

  async upload(sketchPath, fqbn, port) {
    if (!this.isInitialized) {
      throw new Error('Arduino CLI not initialized');
    }

    try {
      this.emit('progress', { stage: 'upload', message: 'Starting upload...' });
      
      const args = [
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--verbose',
        sketchPath
      ];

      const result = await this.runCommand(args);
      
      if (result.success) {
        this.emit('progress', { stage: 'upload', message: 'Upload successful!' });
        return {
          success: true,
          output: result.output
        };
      } else {
        this.emit('progress', { stage: 'upload', message: 'Upload failed', error: true });
        return {
          success: false,
          output: result.output,
          error: result.error
        };
      }
    } catch (error) {
      this.emit('progress', { stage: 'upload', message: `Upload error: ${error.message}`, error: true });
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAvailableBoards() {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const result = await this.runCommand(['board', 'listall', '--format', 'json']);
      if (result.success && result.output) {
        const boards = JSON.parse(result.output);
        return boards.boards || [];
      }
    } catch (error) {
      console.error('Failed to get available boards:', error);
    }
    return [];
  }

  async getAvailablePorts() {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const result = await this.runCommand(['board', 'list', '--format', 'json']);
      if (result.success && result.output) {
        const data = JSON.parse(result.output);
        return data.map(port => ({
          path: port.address,
          manufacturer: port.boards?.[0]?.name || 'Unknown',
          board: port.boards?.[0] || null
        }));
      }
    } catch (error) {
      console.error('Failed to get available ports:', error);
    }
    return [];
  }

  async installCore(packageName) {
    if (!this.isInitialized) {
      throw new Error('Arduino CLI not initialized');
    }

    try {
      this.emit('progress', { stage: 'install', message: `Installing core: ${packageName}...` });
      
      const result = await this.runCommand(['core', 'install', packageName]);
      
      if (result.success) {
        this.emit('progress', { stage: 'install', message: `Core ${packageName} installed successfully!` });
        return { success: true, output: result.output };
      } else {
        this.emit('progress', { stage: 'install', message: `Failed to install core: ${packageName}`, error: true });
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.emit('progress', { stage: 'install', message: `Install error: ${error.message}`, error: true });
      return { success: false, error: error.message };
    }
  }

  async installLibrary(libraryName) {
    if (!this.isInitialized) {
      throw new Error('Arduino CLI not initialized');
    }

    try {
      this.emit('progress', { stage: 'install', message: `Installing library: ${libraryName}...` });
      
      const result = await this.runCommand(['lib', 'install', libraryName]);
      
      if (result.success) {
        this.emit('progress', { stage: 'install', message: `Library ${libraryName} installed successfully!` });
        return { success: true, output: result.output };
      } else {
        this.emit('progress', { stage: 'install', message: `Failed to install library: ${libraryName}`, error: true });
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.emit('progress', { stage: 'install', message: `Install error: ${error.message}`, error: true });
      return { success: false, error: error.message };
    }
  }

  parseCompilerOutput(output) {
    const diagnostics = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse Arduino IDE style error messages
      const errorMatch = line.match(/^(.+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/);
      if (errorMatch) {
        diagnostics.push({
          file: errorMatch[1],
          line: parseInt(errorMatch[2]),
          column: parseInt(errorMatch[3]),
          severity: errorMatch[4] === 'error' ? 'error' : errorMatch[4] === 'warning' ? 'warning' : 'info',
          message: errorMatch[5].trim()
        });
      }
    }

    return diagnostics;
  }

  runCommand(args) {
    return new Promise((resolve) => {
      const process = spawn(this.arduinoCliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.emit('output', { type: 'stdout', data: output });
      });

      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.emit('output', { type: 'stderr', data: output });
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: stdout,
            error: stderr
          });
        } else {
          resolve({
            success: false,
            output: stdout,
            error: stderr,
            code
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  cleanup() {
    if (this.daemonProcess) {
      this.daemonProcess.kill();
      this.daemonProcess = null;
    }
  }
}

module.exports = { ArduinoBuildService };
