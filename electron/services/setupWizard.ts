import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

interface SetupStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  error?: string;
}

interface SetupProgress {
  currentStep: number;
  totalSteps: number;
  steps: SetupStep[];
  overallStatus: 'pending' | 'running' | 'success' | 'error';
}

export class SetupWizard {
  private progress: SetupProgress;
  private onProgressUpdate?: (progress: SetupProgress) => void;

  constructor(onProgressUpdate?: (progress: SetupProgress) => void) {
    this.onProgressUpdate = onProgressUpdate;
    this.progress = {
      currentStep: 0,
      totalSteps: 5,
      overallStatus: 'pending',
      steps: [
        {
          id: 'check-arduino-cli',
          name: 'Check Arduino CLI',
          description: 'Verify Arduino CLI installation',
          required: true,
          status: 'pending'
        },
        {
          id: 'install-arduino-cli',
          name: 'Install Arduino CLI',
          description: 'Download and install Arduino CLI if missing',
          required: true,
          status: 'pending'
        },
        {
          id: 'initialize-arduino',
          name: 'Initialize Arduino',
          description: 'Set up Arduino CLI configuration and board index',
          required: true,
          status: 'pending'
        },
        {
          id: 'install-cores',
          name: 'Install Board Cores',
          description: 'Install Arduino AVR and other common board cores',
          required: true,
          status: 'pending'
        },
        {
          id: 'verify-setup',
          name: 'Verify Setup',
          description: 'Test compilation and upload capabilities',
          required: true,
          status: 'pending'
        }
      ]
    };
  }

  async runSetup(): Promise<boolean> {
    this.progress.overallStatus = 'running';
    this.updateProgress();

    try {
      for (let i = 0; i < this.progress.steps.length; i++) {
        this.progress.currentStep = i;
        const step = this.progress.steps[i];
        
        step.status = 'running';
        this.updateProgress();

        try {
          const success = await this.executeStep(step);
          step.status = success ? 'success' : 'error';
          
          if (!success && step.required) {
            this.progress.overallStatus = 'error';
            this.updateProgress();
            return false;
          }
        } catch (error) {
          step.status = 'error';
          step.error = error instanceof Error ? error.message : String(error);
          
          if (step.required) {
            this.progress.overallStatus = 'error';
            this.updateProgress();
            return false;
          }
        }
      }

      this.progress.overallStatus = 'success';
      this.updateProgress();
      return true;
    } catch (error) {
      this.progress.overallStatus = 'error';
      this.updateProgress();
      return false;
    }
  }

  private async executeStep(step: SetupStep): Promise<boolean> {
    switch (step.id) {
      case 'check-arduino-cli':
        return await this.checkArduinoCLI();
      case 'install-arduino-cli':
        return await this.installArduinoCLI();
      case 'initialize-arduino':
        return await this.initializeArduino();
      case 'install-cores':
        return await this.installCores();
      case 'verify-setup':
        return await this.verifySetup();
      default:
        return true;
    }
  }

  private async checkArduinoCLI(): Promise<boolean> {
    try {
      const result = await this.runCommand('arduino-cli', ['version']);
      return result.code === 0;
    } catch (error) {
      return false;
    }
  }

  private async installArduinoCLI(): Promise<boolean> {
    // Check if already installed
    if (await this.checkArduinoCLI()) {
      return true;
    }

    const platform = os.platform();
    const arch = os.arch();
    
    try {
      if (platform === 'win32') {
        return await this.installArduinoCLIWindows();
      } else if (platform === 'darwin') {
        return await this.installArduinoCLIMac();
      } else if (platform === 'linux') {
        return await this.installArduinoCLILinux();
      }
      
      return false;
    } catch (error) {
      console.error('Failed to install Arduino CLI:', error);
      return false;
    }
  }

  private async installArduinoCLIWindows(): Promise<boolean> {
    try {
      // Try to install via winget first
      try {
        const wingetResult = await this.runCommand('winget', ['install', '--id', 'ArduinoSA.CLI']);
        if (wingetResult.code === 0) {
          return true;
        }
      } catch (error) {
        console.log('Winget not available, trying manual installation...');
      }

      // Manual installation - download and extract
      const downloadUrl = 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip';
      // This would require implementing a download and extract function
      // For now, we'll provide instructions to the user
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async installArduinoCLIMac(): Promise<boolean> {
    try {
      // Try Homebrew first
      const brewResult = await this.runCommand('brew', ['install', 'arduino-cli']);
      return brewResult.code === 0;
    } catch (error) {
      return false;
    }
  }

  private async installArduinoCLILinux(): Promise<boolean> {
    try {
      // Try apt first (Ubuntu/Debian)
      try {
        const aptResult = await this.runCommand('sudo', ['apt', 'update', '&&', 'sudo', 'apt', 'install', '-y', 'arduino-cli']);
        if (aptResult.code === 0) {
          return true;
        }
      } catch (error) {
        // Try snap
        const snapResult = await this.runCommand('sudo', ['snap', 'install', 'arduino-cli']);
        return snapResult.code === 0;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async initializeArduino(): Promise<boolean> {
    try {
      // Initialize config
      await this.runCommand('arduino-cli', ['config', 'init']);
      
      // Update board index
      const updateResult = await this.runCommand('arduino-cli', ['core', 'update-index']);
      return updateResult.code === 0;
    } catch (error) {
      return false;
    }
  }

  private async installCores(): Promise<boolean> {
    try {
      // Install Arduino AVR boards
      const avrResult = await this.runCommand('arduino-cli', ['core', 'install', 'arduino:avr']);
      
      // Install ESP32 boards (popular)
      try {
        await this.runCommand('arduino-cli', ['core', 'install', 'esp32:esp32']);
      } catch (error) {
        // ESP32 is optional
      }
      
      return avrResult.code === 0;
    } catch (error) {
      return false;
    }
  }

  private async verifySetup(): Promise<boolean> {
    try {
      // Check if boards are available
      const boardsResult = await this.runCommand('arduino-cli', ['board', 'listall', '--format', 'json']);
      
      if (boardsResult.code === 0) {
        const boards = JSON.parse(boardsResult.stdout);
        return boards.boards && boards.boards.length > 0;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        shell: true,
        env: { ...process.env }
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

  private updateProgress(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({ ...this.progress });
    }
  }

  getProgress(): SetupProgress {
    return { ...this.progress };
  }

  async getInstallationInstructions(): Promise<string> {
    const platform = os.platform();
    
    if (platform === 'win32') {
      return `
# Arduino CLI Installation for Windows

## Option 1: Using Winget (Recommended)
1. Open PowerShell as Administrator
2. Run: winget install --id ArduinoSA.CLI

## Option 2: Manual Installation
1. Download from: https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip
2. Extract to a folder (e.g., C:\\arduino-cli)
3. Add the folder to your PATH environment variable
4. Restart your computer

## Verify Installation
Open a new command prompt and run: arduino-cli version
`;
    } else if (platform === 'darwin') {
      return `
# Arduino CLI Installation for macOS

## Using Homebrew (Recommended)
1. Install Homebrew if not already installed: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
2. Run: brew install arduino-cli

## Manual Installation
1. Download from: https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz
2. Extract and move to /usr/local/bin

## Verify Installation
Open Terminal and run: arduino-cli version
`;
    } else {
      return `
# Arduino CLI Installation for Linux

## Ubuntu/Debian
sudo apt update && sudo apt install -y arduino-cli

## Fedora/CentOS
sudo dnf install arduino-cli

## Arch Linux
sudo pacman -S arduino-cli

## Using Snap (Universal)
sudo snap install arduino-cli

## Verify Installation
Run: arduino-cli version
`;
    }
  }
}
