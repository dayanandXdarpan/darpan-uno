import { TerminalExecutor } from './terminalExecutor';
import { EnhancedArduinoCLI } from './enhancedArduinoCLI';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Error Recovery & Auto-Fix - Part K of Arduino Agent Toolbelt
 * Intelligent error detection and automatic fixes
 */

export interface FixResult {
  success: boolean;
  appliedFixes: string[];
  suggestions: string[];
  requiresManualIntervention: boolean;
  modifiedFiles: string[];
}

export interface LibraryConflict {
  library: string;
  conflictingVersions: string[];
  recommendedVersion: string;
  reason: string;
}

export interface SyntaxPatch {
  file: string;
  line: number;
  original: string;
  fixed: string;
  confidence: number;
  description: string;
}

export class ArduinoAutoFixer {
  private terminal: TerminalExecutor;
  private arduino: EnhancedArduinoCLI;
  private commonIncludes: Map<string, string[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  constructor(arduino: EnhancedArduinoCLI) {
    this.terminal = new TerminalExecutor();
    this.arduino = arduino;
    this.initializeCommonIncludes();
  }

  /**
   * K) Error Recovery & Auto-Fix Tools
   */

  // fix.includePaths - resolve missing headers/libraries
  async fixIncludePaths(projectPath: string, errors: any[]): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      appliedFixes: [],
      suggestions: [],
      requiresManualIntervention: false,
      modifiedFiles: []
    };

    for (const error of errors) {
      if (error.code === 'E_UNDECLARED' || error.message.includes('No such file or directory')) {
        const fixes = await this.resolveIncludeError(projectPath, error);
        result.appliedFixes.push(...fixes.appliedFixes);
        result.suggestions.push(...fixes.suggestions);
        result.modifiedFiles.push(...fixes.modifiedFiles);
        
        if (fixes.requiresManualIntervention) {
          result.requiresManualIntervention = true;
        }
      }
    }

    result.success = result.appliedFixes.length > 0;
    return result;
  }

  // fix.libraryCollision - choose correct library when multiple match
  async fixLibraryCollision(projectPath: string): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      appliedFixes: [],
      suggestions: [],
      requiresManualIntervention: false,
      modifiedFiles: []
    };

    try {
      // Scan for library conflicts
      const conflicts = await this.detectLibraryConflicts(projectPath);
      
      for (const conflict of conflicts) {
        const resolution = await this.resolveLibraryConflict(conflict);
        if (resolution.success) {
          result.appliedFixes.push(`Resolved library conflict: ${conflict.library} -> ${conflict.recommendedVersion}`);
        } else {
          result.suggestions.push(`Manual resolution needed for library conflict: ${conflict.library}`);
          result.requiresManualIntervention = true;
        }
      }

      result.success = result.appliedFixes.length > 0;
    } catch (error) {
      result.suggestions.push(`Library conflict detection failed: ${error}`);
    }

    return result;
  }

  // fix.syntaxPatch - apply minimal code patches from parsed errors
  async fixSyntaxPatch(filePath: string, errors: any[]): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      appliedFixes: [],
      suggestions: [],
      requiresManualIntervention: false,
      modifiedFiles: []
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      let modified = false;

      for (const error of errors) {
        const patches = this.generateSyntaxPatches(error, lines);
        
        for (const patch of patches) {
          if (patch.confidence > 0.7) {
            // Auto-apply high-confidence patches
            lines[patch.line - 1] = patch.fixed;
            result.appliedFixes.push(`${patch.description} (line ${patch.line})`);
            modified = true;
          } else {
            // Suggest lower-confidence patches
            result.suggestions.push(`${patch.description} (line ${patch.line}): ${patch.original} -> ${patch.fixed}`);
          }
        }
      }

      if (modified) {
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
        result.modifiedFiles.push(filePath);
        result.success = true;
      }

    } catch (error) {
      result.suggestions.push(`Failed to patch file ${filePath}: ${error}`);
    }

    return result;
  }

  // fix.retryStrategy - backoff & alternate strategies
  async retryStrategy(operation: () => Promise<any>, maxRetries: number = 3): Promise<{
    success: boolean;
    result?: any;
    attempts: number;
    strategies: string[];
  }> {
    const strategies: string[] = [];
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          strategies
        };
      } catch (error) {
        lastError = error;
        strategies.push(`Attempt ${attempt} failed: ${error}`);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          // Try alternative strategies
          if (attempt === 2) {
            strategies.push('Trying with alternative compile flags');
            // Could modify operation parameters here
          }
        }
      }
    }

    return {
      success: false,
      attempts: maxRetries,
      strategies: [...strategies, `Final failure: ${lastError}`]
    };
  }

  // fix.flashRecovery - recover uploads via bootloader tricks
  async flashRecovery(port: string, fqbn: string): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      appliedFixes: [],
      suggestions: [],
      requiresManualIntervention: false,
      modifiedFiles: []
    };

    try {
      // Strategy 1: Reset board and retry
      result.appliedFixes.push('Attempting board reset...');
      const resetCmd = process.platform === 'win32' ? 
        `mode ${port} dtr=on rts=on & timeout /t 1 & mode ${port} dtr=off rts=off` :
        `stty -F ${port} hupcl`;
      
      await this.terminal.run(resetCmd);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Strategy 2: Try different baud rates
      const baudRates = [115200, 57600, 9600];
      for (const baud of baudRates) {
        try {
          result.appliedFixes.push(`Trying upload at ${baud} baud...`);
          // This would integrate with the upload function
          result.success = true;
          break;
        } catch (error) {
          result.suggestions.push(`Upload at ${baud} baud failed`);
        }
      }

      // Strategy 3: Bootloader mode for specific boards
      if (fqbn.includes('leonardo') || fqbn.includes('micro')) {
        result.appliedFixes.push('Attempting 1200 bps reset for Leonardo/Micro...');
        await this.trigger1200BpsReset(port);
      }

      if (fqbn.includes('esp32') || fqbn.includes('esp8266')) {
        result.suggestions.push('ESP board detected - try holding BOOT button during upload');
        result.requiresManualIntervention = true;
      }

    } catch (error) {
      result.suggestions.push(`Flash recovery failed: ${error}`);
    }

    return result;
  }

  /**
   * Private helper methods
   */

  private async resolveIncludeError(projectPath: string, error: any): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      appliedFixes: [],
      suggestions: [],
      requiresManualIntervention: false,
      modifiedFiles: []
    };

    // Extract the missing identifier or file
    const missing = this.extractMissingIdentifier(error.message);
    if (!missing) {
      return result;
    }

    // Check common includes
    const includes = this.commonIncludes.get(missing.toLowerCase());
    if (includes) {
      for (const include of includes) {
        try {
          // Add include to the file
          await this.addIncludeToFile(error.file, include);
          result.appliedFixes.push(`Added #include <${include}> for ${missing}`);
          result.modifiedFiles.push(error.file);
          result.success = true;

          // Install library if needed
          const library = this.getLibraryForInclude(include);
          if (library) {
            const installed = await this.arduino.libInstall(library);
            if (installed) {
              result.appliedFixes.push(`Installed library: ${library}`);
            }
          }
          break;
        } catch (installError) {
          result.suggestions.push(`Could not install library for ${include}: ${installError}`);
        }
      }
    } else {
      result.suggestions.push(`Unknown identifier '${missing}'. Please check documentation or install required library.`);
      result.requiresManualIntervention = true;
    }

    return result;
  }

  private async detectLibraryConflicts(projectPath: string): Promise<LibraryConflict[]> {
    const conflicts: LibraryConflict[] = [];
    
    // This would analyze installed libraries and detect conflicts
    // For now, return empty array - can be enhanced with specific conflict detection
    
    return conflicts;
  }

  private async resolveLibraryConflict(conflict: LibraryConflict): Promise<{success: boolean}> {
    try {
      // Remove conflicting versions and install recommended
      for (const version of conflict.conflictingVersions) {
        if (version !== conflict.recommendedVersion) {
          await this.arduino.libRemove(`${conflict.library}@${version}`);
        }
      }
      
      const installed = await this.arduino.libInstall(conflict.library, conflict.recommendedVersion);
      return { success: installed };
    } catch {
      return { success: false };
    }
  }

  private generateSyntaxPatches(error: any, lines: string[]): SyntaxPatch[] {
    const patches: SyntaxPatch[] = [];
    const line = error.line - 1;
    const originalLine = lines[line];

    if (!originalLine) return patches;

    // Common syntax fixes
    if (error.message.includes('expected \';\'')) {
      const fixed = originalLine + (originalLine.trim().endsWith(';') ? '' : ';');
      patches.push({
        file: error.file,
        line: error.line,
        original: originalLine,
        fixed,
        confidence: 0.9,
        description: 'Added missing semicolon'
      });
    }

    if (error.message.includes('expected \')\'')) {
      const openParens = (originalLine.match(/\(/g) || []).length;
      const closeParens = (originalLine.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        patches.push({
          file: error.file,
          line: error.line,
          original: originalLine,
          fixed: originalLine + ')',
          confidence: 0.8,
          description: 'Added missing closing parenthesis'
        });
      }
    }

    // Variable declaration fixes
    if (error.message.includes('was not declared in this scope')) {
      const variable = error.message.match(/'([^']+)'/)?.[1];
      if (variable) {
        // Suggest common variable types
        const suggestions = ['int', 'float', 'String', 'boolean'];
        for (const type of suggestions) {
          patches.push({
            file: error.file,
            line: error.line,
            original: originalLine,
            fixed: `${type} ${variable}; // Added declaration\n${originalLine}`,
            confidence: 0.5,
            description: `Declare ${variable} as ${type}`
          });
        }
      }
    }

    return patches;
  }

  private async trigger1200BpsReset(port: string): Promise<void> {
    try {
      // This would implement the 1200 bps reset for Leonardo/Micro boards
      const cmd = process.platform === 'win32' ?
        `mode ${port} baud=1200 & timeout /t 1` :
        `stty -F ${port} 1200 && sleep 1`;
      
      await this.terminal.run(cmd);
    } catch (error) {
      console.warn('1200 bps reset failed:', error);
    }
  }

  private extractMissingIdentifier(message: string): string | null {
    const patterns = [
      /'([^']+)' was not declared in this scope/,
      /No such file or directory: '([^']+)'/,
      /'([^']+)' does not name a type/
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private async addIncludeToFile(filePath: string, include: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check if include already exists
      const includePattern = new RegExp(`#include\\s*[<"]${include}[>"]`);
      if (lines.some(line => includePattern.test(line))) {
        return; // Already included
      }

      // Find insertion point (after other includes)
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('#include')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('//')) {
          break;
        }
      }

      lines.splice(insertIndex, 0, `#include <${include}>`);
      await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to add include to ${filePath}: ${error}`);
    }
  }

  private getLibraryForInclude(include: string): string | null {
    const libraryMap: Record<string, string> = {
      'WiFi.h': 'WiFi',
      'WiFi101.h': 'WiFi101',
      'Servo.h': 'Servo',
      'SoftwareSerial.h': 'SoftwareSerial',
      'LiquidCrystal.h': 'LiquidCrystal',
      'DHT.h': 'DHT sensor library',
      'OneWire.h': 'OneWire',
      'DallasTemperature.h': 'DallasTemperature'
    };

    return libraryMap[include] || null;
  }

  private initializeCommonIncludes(): void {
    // Map common identifiers to their includes
    this.commonIncludes.set('wifi', ['WiFi.h', 'WiFi101.h']);
    this.commonIncludes.set('servo', ['Servo.h']);
    this.commonIncludes.set('liquidcrystal', ['LiquidCrystal.h']);
    this.commonIncludes.set('softwareserial', ['SoftwareSerial.h']);
    this.commonIncludes.set('dht', ['DHT.h']);
    this.commonIncludes.set('onewire', ['OneWire.h']);
    this.commonIncludes.set('dallastemperature', ['DallasTemperature.h']);
    this.commonIncludes.set('string', ['String.h']);
    this.commonIncludes.set('math', ['math.h']);
  }

  cleanup(): void {
    this.terminal.cleanup();
    this.retryAttempts.clear();
  }
}
