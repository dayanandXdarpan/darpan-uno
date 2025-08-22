import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ArduinoLibrary {
  name: string;
  version: string;
  author: string;
  description: string;
  website?: string;
  category: string;
  types: string[];
  repository?: string;
  dependencies?: string[];
  installed: boolean;
  installPath?: string;
}

export interface LibrarySearchResult {
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  url: string;
  downloadUrl: string;
}

export interface LibraryInstallResult {
  success: boolean;
  library: string;
  version?: string;
  error?: string;
  warnings?: string[];
}

export class LibraryManager {
  private cliPath: string;
  private configPath: string;
  private installedLibraries: Map<string, ArduinoLibrary> = new Map();

  constructor(cliPath: string = 'arduino-cli', configPath?: string) {
    this.cliPath = cliPath;
    this.configPath = configPath || path.join(process.env.HOME || process.env.USERPROFILE || '', '.arduino15');
  }

  // Search for libraries
  async searchLibraries(query: string, category?: string): Promise<LibrarySearchResult[]> {
    try {
      const args = ['lib', 'search', '--format', 'json'];
      
      if (category) {
        args.push('--category', category);
      }
      
      args.push(query);

      const result = await this.runCommand(args);
      
      if (result.code === 0) {
        const data = JSON.parse(result.stdout);
        return data.libraries?.map((lib: any) => ({
          name: lib.name,
          version: lib.latest_version,
          description: lib.sentence || lib.paragraph || '',
          author: lib.author || 'Unknown',
          category: lib.category || 'Uncategorized',
          url: lib.website || '',
          downloadUrl: lib.url || ''
        })) || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to search libraries:', error);
      return [];
    }
  }

  // Install a library
  async installLibrary(libraryName: string, version?: string): Promise<LibraryInstallResult> {
    try {
      const libSpec = version ? `${libraryName}@${version}` : libraryName;
      const args = ['lib', 'install', libSpec];

      const result = await this.runCommand(args);
      
      if (result.code === 0) {
        // Refresh installed libraries cache
        await this.refreshInstalledLibraries();
        
        return {
          success: true,
          library: libraryName,
          version: version
        };
      } else {
        return {
          success: false,
          library: libraryName,
          error: result.stderr || 'Installation failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        library: libraryName,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Install multiple libraries
  async installLibraries(libraries: string[]): Promise<LibraryInstallResult[]> {
    const results: LibraryInstallResult[] = [];
    
    for (const library of libraries) {
      const result = await this.installLibrary(library);
      results.push(result);
    }
    
    return results;
  }

  // Uninstall a library
  async uninstallLibrary(libraryName: string): Promise<LibraryInstallResult> {
    try {
      const args = ['lib', 'uninstall', libraryName];
      const result = await this.runCommand(args);
      
      if (result.code === 0) {
        this.installedLibraries.delete(libraryName);
        
        return {
          success: true,
          library: libraryName
        };
      } else {
        return {
          success: false,
          library: libraryName,
          error: result.stderr || 'Uninstallation failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        library: libraryName,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Get list of installed libraries
  async getInstalledLibraries(): Promise<ArduinoLibrary[]> {
    await this.refreshInstalledLibraries();
    return Array.from(this.installedLibraries.values());
  }

  // Analyze code and suggest missing libraries
  async analyzeMissingLibraries(code: string): Promise<{ missing: string[]; suggestions: LibrarySearchResult[] }> {
    const missing: string[] = [];
    const suggestions: LibrarySearchResult[] = [];

    // Common patterns for library includes
    const includePattern = /#include\s*[<"]([\w\/\.]+)[>"]/g;
    const includes: string[] = [];
    
    let match;
    while ((match = includePattern.exec(code)) !== null) {
      includes.push(match[1]);
    }

    // Check each include against installed libraries
    for (const include of includes) {
      const libraryName = this.guessLibraryFromInclude(include);
      if (libraryName && !this.installedLibraries.has(libraryName)) {
        missing.push(libraryName);
        
        // Search for the library
        const searchResults = await this.searchLibraries(libraryName);
        if (searchResults.length > 0) {
          suggestions.push(searchResults[0]); // Take the best match
        }
      }
    }

    return { missing: [...new Set(missing)], suggestions };
  }

  // Auto-install libraries based on code analysis
  async autoInstallMissingLibraries(code: string): Promise<LibraryInstallResult[]> {
    const { missing } = await this.analyzeMissingLibraries(code);
    
    if (missing.length === 0) {
      return [];
    }

    console.log(`Auto-installing missing libraries: ${missing.join(', ')}`);
    return await this.installLibraries(missing);
  }

  // Update all installed libraries
  async updateAllLibraries(): Promise<LibraryInstallResult[]> {
    const installed = await this.getInstalledLibraries();
    const results: LibraryInstallResult[] = [];

    for (const library of installed) {
      try {
        const args = ['lib', 'upgrade', library.name];
        const result = await this.runCommand(args);
        
        results.push({
          success: result.code === 0,
          library: library.name,
          error: result.code !== 0 ? result.stderr : undefined
        });
      } catch (error) {
        results.push({
          success: false,
          library: library.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Get library categories
  async getLibraryCategories(): Promise<string[]> {
    // Common Arduino library categories
    return [
      'Communication',
      'Data Processing',
      'Data Storage',
      'Device Control',
      'Display',
      'Other',
      'Sensors',
      'Signal Input/Output',
      'Timing',
      'Uncategorized'
    ];
  }

  // Get popular/recommended libraries for beginners
  getRecommendedLibraries(): { name: string; description: string; category: string }[] {
    return [
      {
        name: 'Servo',
        description: 'Control servo motors',
        category: 'Device Control'
      },
      {
        name: 'LiquidCrystal',
        description: 'Control character LCDs',
        category: 'Display'
      },
      {
        name: 'Wire',
        description: 'I2C communication (built-in)',
        category: 'Communication'
      },
      {
        name: 'SPI',
        description: 'SPI communication (built-in)',
        category: 'Communication'
      },
      {
        name: 'DHT sensor library',
        description: 'Read DHT temperature/humidity sensors',
        category: 'Sensors'
      },
      {
        name: 'Adafruit NeoPixel',
        description: 'Control WS2812 LED strips',
        category: 'Display'
      },
      {
        name: 'WiFi',
        description: 'WiFi connectivity (built-in for ESP32/ESP8266)',
        category: 'Communication'
      },
      {
        name: 'ArduinoJson',
        description: 'JSON parsing and generation',
        category: 'Data Processing'
      },
      {
        name: 'PubSubClient',
        description: 'MQTT client library',
        category: 'Communication'
      },
      {
        name: 'FastLED',
        description: 'Advanced LED control library',
        category: 'Display'
      }
    ];
  }

  private async refreshInstalledLibraries(): Promise<void> {
    try {
      const args = ['lib', 'list', '--format', 'json'];
      const result = await this.runCommand(args);
      
      if (result.code === 0) {
        const data = JSON.parse(result.stdout);
        this.installedLibraries.clear();
        
        if (data.installed_libraries) {
          for (const lib of data.installed_libraries) {
            const library: ArduinoLibrary = {
              name: lib.library.name,
              version: lib.library.version,
              author: lib.library.author || 'Unknown',
              description: lib.library.sentence || lib.library.paragraph || '',
              website: lib.library.website,
              category: lib.library.category || 'Uncategorized',
              types: lib.library.types || [],
              repository: lib.library.repository,
              dependencies: lib.library.dependencies?.map((dep: any) => dep.name) || [],
              installed: true,
              installPath: lib.library.install_dir
            };
            
            this.installedLibraries.set(library.name, library);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh installed libraries:', error);
    }
  }

  private guessLibraryFromInclude(include: string): string | null {
    // Map common includes to library names
    const includeToLibrary: { [key: string]: string } = {
      'Servo.h': 'Servo',
      'LiquidCrystal.h': 'LiquidCrystal',
      'DHT.h': 'DHT sensor library',
      'DHT22.h': 'DHT sensor library',
      'Adafruit_NeoPixel.h': 'Adafruit NeoPixel',
      'FastLED.h': 'FastLED',
      'WiFi.h': 'WiFi',
      'ESP8266WiFi.h': 'ESP8266WiFi',
      'ArduinoJson.h': 'ArduinoJson',
      'PubSubClient.h': 'PubSubClient',
      'SoftwareSerial.h': 'SoftwareSerial',
      'OneWire.h': 'OneWire',
      'DallasTemperature.h': 'DallasTemperature',
      'Stepper.h': 'Stepper',
      'SD.h': 'SD',
      'EEPROM.h': 'EEPROM',
      'SPI.h': 'SPI',
      'Wire.h': 'Wire'
    };

    // Direct match
    if (includeToLibrary[include]) {
      return includeToLibrary[include];
    }

    // Try to guess from Adafruit libraries
    if (include.startsWith('Adafruit_')) {
      return include.replace('.h', '').replace('_', ' ');
    }

    // Try to guess from filename
    const baseName = include.replace('.h', '');
    if (baseName.length > 2) {
      return baseName;
    }

    return null;
  }

  private async runCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
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
}
