import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  category: 'board-support' | 'library' | 'tool' | 'language-support' | 'theme' | 'extension';
  downloads: number;
  rating: number;
  reviews: number;
  lastUpdated: Date;
  minArduinoVersion?: string;
  dependencies?: string[];
  icon?: string;
  screenshots?: string[];
  changelog?: string;
  isInstalled: boolean;
  isEnabled: boolean;
  installPath?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  contributes?: {
    boards?: BoardContribution[];
    libraries?: LibraryContribution[];
    commands?: CommandContribution[];
    languages?: LanguageContribution[];
    themes?: ThemeContribution[];
    snippets?: SnippetContribution[];
  };
  activationEvents?: string[];
  dependencies?: Record<string, string>;
  engines?: {
    arduino?: string;
    node?: string;
  };
}

export interface BoardContribution {
  id: string;
  name: string;
  mcu: string;
  frequency: number;
  flash: number;
  ram: number;
  pins: number;
  programmers: string[];
  variants: string[];
}

export interface LibraryContribution {
  name: string;
  version: string;
  path: string;
  examples?: string[];
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  when?: string;
}

export interface LanguageContribution {
  id: string;
  aliases: string[];
  extensions: string[];
  configuration?: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  path: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
}

export interface SnippetContribution {
  language: string;
  path: string;
}

export interface PluginRepository {
  name: string;
  url: string;
  trusted: boolean;
  lastSync: Date;
}

export interface InstallProgress {
  pluginId: string;
  stage: 'downloading' | 'extracting' | 'installing' | 'configuring' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export class PluginMarketplace extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private installedPlugins: Map<string, Plugin> = new Map();
  private repositories: PluginRepository[] = [];
  private pluginsDir: string;
  private marketplaceCache: string;

  constructor(dataPath: string) {
    super();
    this.pluginsDir = path.join(dataPath, 'plugins');
    this.marketplaceCache = path.join(dataPath, 'marketplace-cache.json');
    this.initializeMarketplace();
  }

  private async initializeMarketplace(): Promise<void> {
    // Ensure plugins directory exists
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    // Add default repositories
    this.repositories = [
      {
        name: 'Arduino Official',
        url: 'https://downloads.arduino.cc/packages/package_index.json',
        trusted: true,
        lastSync: new Date(0)
      },
      {
        name: 'Community Plugins',
        url: 'https://arduino-ide-plugins.github.io/registry.json',
        trusted: false,
        lastSync: new Date(0)
      }
    ];

    await this.loadInstalledPlugins();
    await this.loadMarketplaceCache();
    await this.populateDefaultPlugins();

    console.log(`Plugin marketplace initialized with ${this.plugins.size} available plugins`);
  }

  private async populateDefaultPlugins(): Promise<void> {
    // Add some popular Arduino plugins for demonstration
    const defaultPlugins: Omit<Plugin, 'isInstalled' | 'isEnabled'>[] = [
      {
        id: 'esp32-arduino-core',
        name: 'ESP32 Arduino Core',
        version: '2.0.11',
        description: 'Arduino core for ESP32 WiFi chip',
        author: 'Espressif Systems',
        homepage: 'https://github.com/espressif/arduino-esp32',
        repository: 'https://github.com/espressif/arduino-esp32.git',
        license: 'LGPL-2.1',
        keywords: ['esp32', 'wifi', 'bluetooth', 'iot'],
        category: 'board-support',
        downloads: 2500000,
        rating: 4.8,
        reviews: 1250,
        lastUpdated: new Date('2023-09-15'),
        minArduinoVersion: '1.8.0',
        dependencies: [],
        icon: 'https://docs.espressif.com/projects/esp-idf/en/latest/_static/espressif-logo.svg'
      },
      {
        id: 'adafruit-neopixel',
        name: 'Adafruit NeoPixel',
        version: '1.11.0',
        description: 'Arduino library for controlling single-wire LED pixels',
        author: 'Adafruit',
        homepage: 'https://github.com/adafruit/Adafruit_NeoPixel',
        license: 'LGPL-3.0',
        keywords: ['led', 'neopixel', 'ws2812', 'addressable'],
        category: 'library',
        downloads: 1800000,
        rating: 4.7,
        reviews: 890,
        lastUpdated: new Date('2023-08-22'),
        dependencies: []
      },
      {
        id: 'arduino-json',
        name: 'ArduinoJson',
        version: '6.21.3',
        description: 'JSON library for embedded C++',
        author: 'Benoit Blanchon',
        homepage: 'https://arduinojson.org/',
        repository: 'https://github.com/bblanchon/ArduinoJson.git',
        license: 'MIT',
        keywords: ['json', 'parser', 'serialization', 'embedded'],
        category: 'library',
        downloads: 3200000,
        rating: 4.9,
        reviews: 1560,
        lastUpdated: new Date('2023-09-01'),
        dependencies: []
      },
      {
        id: 'servo-library',
        name: 'Servo',
        version: '1.2.1',
        description: 'Control servo motors with Arduino',
        author: 'Arduino',
        license: 'LGPL-2.1',
        keywords: ['servo', 'motor', 'pwm', 'control'],
        category: 'library',
        downloads: 5600000,
        rating: 4.6,
        reviews: 2100,
        lastUpdated: new Date('2023-06-15'),
        dependencies: []
      },
      {
        id: 'platformio-integration',
        name: 'PlatformIO Integration',
        version: '3.1.0',
        description: 'Integration with PlatformIO ecosystem',
        author: 'PlatformIO Team',
        homepage: 'https://platformio.org/',
        license: 'Apache-2.0',
        keywords: ['platformio', 'build', 'embedded', 'iot'],
        category: 'tool',
        downloads: 450000,
        rating: 4.5,
        reviews: 320,
        lastUpdated: new Date('2023-09-10'),
        dependencies: []
      },
      {
        id: 'dark-theme-pro',
        name: 'Dark Theme Pro',
        version: '2.3.0',
        description: 'Professional dark theme for Arduino IDE',
        author: 'Theme Studio',
        license: 'MIT',
        keywords: ['theme', 'dark', 'ui', 'design'],
        category: 'theme',
        downloads: 125000,
        rating: 4.4,
        reviews: 85,
        lastUpdated: new Date('2023-08-30'),
        dependencies: []
      },
      {
        id: 'cpp-intellisense',
        name: 'C++ IntelliSense',
        version: '1.5.2',
        description: 'Advanced C++ language support and IntelliSense',
        author: 'LanguageTools',
        license: 'MIT',
        keywords: ['cpp', 'intellisense', 'autocomplete', 'language'],
        category: 'language-support',
        downloads: 780000,
        rating: 4.7,
        reviews: 420,
        lastUpdated: new Date('2023-09-05'),
        dependencies: []
      },
      {
        id: 'circuit-simulator-pro',
        name: 'Circuit Simulator Pro',
        version: '1.2.0',
        description: 'Advanced circuit simulation and analysis tools',
        author: 'SimTech Solutions',
        license: 'Commercial',
        keywords: ['simulation', 'circuit', 'analysis', 'spice'],
        category: 'tool',
        downloads: 95000,
        rating: 4.8,
        reviews: 65,
        lastUpdated: new Date('2023-09-12'),
        dependencies: []
      }
    ];

    defaultPlugins.forEach(pluginData => {
      const plugin: Plugin = {
        ...pluginData,
        isInstalled: false,
        isEnabled: false
      };
      this.plugins.set(plugin.id, plugin);
    });
  }

  // Plugin Discovery and Search
  async searchPlugins(query: string, filters?: {
    category?: string;
    author?: string;
    minRating?: number;
    installed?: boolean;
  }): Promise<Plugin[]> {
    const queryLower = query.toLowerCase();
    let results = Array.from(this.plugins.values());

    // Text search
    if (query) {
      results = results.filter(plugin =>
        plugin.name.toLowerCase().includes(queryLower) ||
        plugin.description.toLowerCase().includes(queryLower) ||
        plugin.keywords.some(keyword => keyword.toLowerCase().includes(queryLower)) ||
        plugin.author.toLowerCase().includes(queryLower)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter(plugin => plugin.category === filters.category);
      }
      if (filters.author) {
        results = results.filter(plugin => plugin.author.toLowerCase().includes(filters.author!.toLowerCase()));
      }
      if (filters.minRating) {
        results = results.filter(plugin => plugin.rating >= filters.minRating!);
      }
      if (filters.installed !== undefined) {
        results = results.filter(plugin => plugin.isInstalled === filters.installed);
      }
    }

    // Sort by relevance (downloads * rating)
    results.sort((a, b) => (b.downloads * b.rating) - (a.downloads * a.rating));

    return results.slice(0, 50); // Limit to 50 results
  }

  async getPopularPlugins(category?: string, limit: number = 20): Promise<Plugin[]> {
    let plugins = Array.from(this.plugins.values());

    if (category) {
      plugins = plugins.filter(plugin => plugin.category === category);
    }

    return plugins
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  async getRecentlyUpdated(limit: number = 10): Promise<Plugin[]> {
    return Array.from(this.plugins.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, limit);
  }

  async getFeaturedPlugins(): Promise<Plugin[]> {
    // Return high-quality plugins with good ratings and high downloads
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.rating >= 4.5 && plugin.downloads >= 100000)
      .sort((a, b) => (b.rating * b.downloads) - (a.rating * a.downloads))
      .slice(0, 8);
  }

  // Plugin Installation
  async installPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.isInstalled) {
      return false;
    }

    try {
      // Emit progress events
      this.emitProgress(pluginId, 'downloading', 0, 'Starting download...');

      // Simulate download and installation process
      await this.downloadPlugin(plugin);
      this.emitProgress(pluginId, 'extracting', 40, 'Extracting files...');

      await this.extractPlugin(plugin);
      this.emitProgress(pluginId, 'installing', 70, 'Installing plugin...');

      await this.configurePlugin(plugin);
      this.emitProgress(pluginId, 'configuring', 90, 'Finalizing installation...');

      // Mark as installed
      plugin.isInstalled = true;
      plugin.isEnabled = true;
      plugin.installPath = path.join(this.pluginsDir, plugin.id);

      this.installedPlugins.set(pluginId, plugin);
      await this.saveInstalledPlugins();

      this.emitProgress(pluginId, 'complete', 100, 'Installation complete');
      this.emit('plugin-installed', plugin);

      return true;
    } catch (error) {
      this.emitProgress(pluginId, 'error', 0, `Installation failed: ${error}`);
      console.error(`Failed to install plugin ${pluginId}:`, error);
      return false;
    }
  }

  private async downloadPlugin(plugin: Plugin): Promise<void> {
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, would download from repository
    console.log(`Downloaded plugin: ${plugin.name}`);
  }

  private async extractPlugin(plugin: Plugin): Promise<void> {
    // Create plugin directory
    const pluginDir = path.join(this.pluginsDir, plugin.id);
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }

    // Create manifest file
    const manifest: PluginManifest = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      license: plugin.license,
      main: 'index.js'
    };

    fs.writeFileSync(
      path.join(pluginDir, 'package.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    // Create basic plugin structure based on category
    await this.createPluginStructure(plugin, pluginDir);
  }

  private async createPluginStructure(plugin: Plugin, pluginDir: string): Promise<void> {
    switch (plugin.category) {
      case 'board-support':
        await this.createBoardSupportStructure(plugin, pluginDir);
        break;
      case 'library':
        await this.createLibraryStructure(plugin, pluginDir);
        break;
      case 'theme':
        await this.createThemeStructure(plugin, pluginDir);
        break;
      case 'tool':
        await this.createToolStructure(plugin, pluginDir);
        break;
      default:
        await this.createGenericStructure(plugin, pluginDir);
    }
  }

  private async createBoardSupportStructure(plugin: Plugin, pluginDir: string): Promise<void> {
    const boardsDir = path.join(pluginDir, 'boards');
    fs.mkdirSync(boardsDir, { recursive: true });

    // Create boards.txt placeholder
    fs.writeFileSync(
      path.join(boardsDir, 'boards.txt'),
      `# ${plugin.name} Board Definitions\n# Generated automatically\n`,
      'utf8'
    );
  }

  private async createLibraryStructure(plugin: Plugin, pluginDir: string): Promise<void> {
    const srcDir = path.join(pluginDir, 'src');
    const examplesDir = path.join(pluginDir, 'examples');
    
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(examplesDir, { recursive: true });

    // Create library.properties
    const libraryProps = `name=${plugin.name}
version=${plugin.version}
author=${plugin.author}
maintainer=${plugin.author}
sentence=${plugin.description}
paragraph=${plugin.description}
category=Communication
url=${plugin.homepage || ''}
architectures=*
`;
    fs.writeFileSync(path.join(pluginDir, 'library.properties'), libraryProps, 'utf8');

    // Create basic header file
    const headerContent = `#ifndef ${plugin.id.toUpperCase().replace(/-/g, '_')}_H
#define ${plugin.id.toUpperCase().replace(/-/g, '_')}_H

#include "Arduino.h"

class ${plugin.name.replace(/\s+/g, '')} {
public:
    ${plugin.name.replace(/\s+/g, '')}();
    void begin();
    
private:
    // Private members
};

#endif
`;
    fs.writeFileSync(path.join(srcDir, `${plugin.id}.h`), headerContent, 'utf8');
  }

  private async createThemeStructure(plugin: Plugin, pluginDir: string): Promise<void> {
    const themesDir = path.join(pluginDir, 'themes');
    fs.mkdirSync(themesDir, { recursive: true });

    // Create theme JSON
    const theme = {
      name: plugin.name,
      type: 'dark',
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585'
      },
      tokenColors: []
    };

    fs.writeFileSync(
      path.join(themesDir, 'theme.json'),
      JSON.stringify(theme, null, 2),
      'utf8'
    );
  }

  private async createToolStructure(plugin: Plugin, pluginDir: string): Promise<void> {
    const toolsDir = path.join(pluginDir, 'tools');
    fs.mkdirSync(toolsDir, { recursive: true });

    // Create tool configuration
    const toolConfig = {
      name: plugin.name,
      version: plugin.version,
      commands: [],
      menus: []
    };

    fs.writeFileSync(
      path.join(toolsDir, 'config.json'),
      JSON.stringify(toolConfig, null, 2),
      'utf8'
    );
  }

  private async createGenericStructure(plugin: Plugin, pluginDir: string): Promise<void> {
    // Create basic index.js
    const indexContent = `// ${plugin.name} v${plugin.version}
// ${plugin.description}

module.exports = {
    activate: function() {
        console.log('${plugin.name} activated');
    },
    deactivate: function() {
        console.log('${plugin.name} deactivated');
    }
};
`;
    fs.writeFileSync(path.join(pluginDir, 'index.js'), indexContent, 'utf8');
  }

  private async configurePlugin(plugin: Plugin): Promise<void> {
    // Plugin-specific configuration
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Configured plugin: ${plugin.name}`);
  }

  private emitProgress(pluginId: string, stage: InstallProgress['stage'], progress: number, message: string): void {
    this.emit('install-progress', {
      pluginId,
      stage,
      progress,
      message
    } as InstallProgress);
  }

  // Plugin Management
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin || !plugin.isInstalled) {
      return false;
    }

    try {
      // Remove plugin directory
      if (plugin.installPath && fs.existsSync(plugin.installPath)) {
        fs.rmSync(plugin.installPath, { recursive: true, force: true });
      }

      // Update plugin state
      plugin.isInstalled = false;
      plugin.isEnabled = false;
      plugin.installPath = undefined;

      this.installedPlugins.delete(pluginId);
      await this.saveInstalledPlugins();

      this.emit('plugin-uninstalled', plugin);
      return true;
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin || !plugin.isInstalled || plugin.isEnabled) {
      return false;
    }

    plugin.isEnabled = true;
    await this.saveInstalledPlugins();

    this.emit('plugin-enabled', plugin);
    return true;
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin || !plugin.isInstalled || !plugin.isEnabled) {
      return false;
    }

    plugin.isEnabled = false;
    await this.saveInstalledPlugins();

    this.emit('plugin-disabled', plugin);
    return true;
  }

  async updatePlugin(pluginId: string): Promise<boolean> {
    const installedPlugin = this.installedPlugins.get(pluginId);
    const availablePlugin = this.plugins.get(pluginId);

    if (!installedPlugin || !availablePlugin || !installedPlugin.isInstalled) {
      return false;
    }

    // Check if update is available
    if (installedPlugin.version === availablePlugin.version) {
      return false; // Already up to date
    }

    try {
      // Backup current version
      await this.backupPlugin(installedPlugin);

      // Uninstall current version
      await this.uninstallPlugin(pluginId);

      // Install new version
      const success = await this.installPlugin(pluginId);

      if (success) {
        this.emit('plugin-updated', { from: installedPlugin.version, to: availablePlugin.version, plugin: availablePlugin });
      }

      return success;
    } catch (error) {
      console.error(`Failed to update plugin ${pluginId}:`, error);
      return false;
    }
  }

  private async backupPlugin(plugin: Plugin): Promise<void> {
    // Create backup of plugin before update
    const backupDir = path.join(this.pluginsDir, 'backups', `${plugin.id}-${plugin.version}`);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    // Implementation would copy plugin files to backup directory
  }

  // Repository Management
  async syncRepositories(): Promise<void> {
    for (const repo of this.repositories) {
      try {
        await this.syncRepository(repo);
      } catch (error) {
        console.error(`Failed to sync repository ${repo.name}:`, error);
      }
    }

    await this.saveMarketplaceCache();
    this.emit('repositories-synced');
  }

  private async syncRepository(repo: PluginRepository): Promise<void> {
    // Simulate repository sync
    console.log(`Syncing repository: ${repo.name}`);
    repo.lastSync = new Date();
  }

  async addRepository(name: string, url: string, trusted: boolean = false): Promise<boolean> {
    // Check if repository already exists
    if (this.repositories.some(repo => repo.url === url)) {
      return false;
    }

    const newRepo: PluginRepository = {
      name,
      url,
      trusted,
      lastSync: new Date(0)
    };

    this.repositories.push(newRepo);
    this.emit('repository-added', newRepo);

    // Sync new repository
    await this.syncRepository(newRepo);
    return true;
  }

  async removeRepository(url: string): Promise<boolean> {
    const index = this.repositories.findIndex(repo => repo.url === url);
    if (index === -1) return false;

    const removed = this.repositories.splice(index, 1)[0];
    this.emit('repository-removed', removed);
    return true;
  }

  // Persistence
  private async loadInstalledPlugins(): Promise<void> {
    try {
      const installedPath = path.join(this.pluginsDir, 'installed.json');
      if (fs.existsSync(installedPath)) {
        const data = fs.readFileSync(installedPath, 'utf8');
        const installed = JSON.parse(data);
        
        installed.forEach((pluginData: any) => {
          const plugin: Plugin = {
            ...pluginData,
            lastUpdated: new Date(pluginData.lastUpdated)
          };
          this.installedPlugins.set(plugin.id, plugin);
        });
      }
    } catch (error) {
      console.warn('Failed to load installed plugins:', error);
    }
  }

  private async saveInstalledPlugins(): Promise<void> {
    try {
      const installedPath = path.join(this.pluginsDir, 'installed.json');
      const installed = Array.from(this.installedPlugins.values());
      fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save installed plugins:', error);
    }
  }

  private async loadMarketplaceCache(): Promise<void> {
    try {
      if (fs.existsSync(this.marketplaceCache)) {
        const data = fs.readFileSync(this.marketplaceCache, 'utf8');
        const cached = JSON.parse(data);
        
        // Load cached plugins if cache is recent (less than 24 hours old)
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          cached.plugins.forEach((pluginData: any) => {
            const plugin: Plugin = {
              ...pluginData,
              lastUpdated: new Date(pluginData.lastUpdated),
              isInstalled: this.installedPlugins.has(pluginData.id),
              isEnabled: this.installedPlugins.get(pluginData.id)?.isEnabled || false
            };
            this.plugins.set(plugin.id, plugin);
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load marketplace cache:', error);
    }
  }

  private async saveMarketplaceCache(): Promise<void> {
    try {
      const cache = {
        timestamp: new Date(),
        plugins: Array.from(this.plugins.values())
      };
      fs.writeFileSync(this.marketplaceCache, JSON.stringify(cache, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save marketplace cache:', error);
    }
  }

  // Getters
  getInstalledPlugins(): Plugin[] {
    return Array.from(this.installedPlugins.values());
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.installedPlugins.values()).filter(plugin => plugin.isEnabled);
  }

  getRepositories(): PluginRepository[] {
    return [...this.repositories];
  }

  getPluginById(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getCategories(): { category: string; count: number }[] {
    const categories = new Map<string, number>();
    
    this.plugins.forEach(plugin => {
      categories.set(plugin.category, (categories.get(plugin.category) || 0) + 1);
    });

    return Array.from(categories.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export default PluginMarketplace;
