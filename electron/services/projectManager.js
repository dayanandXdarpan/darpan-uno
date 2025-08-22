const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

class ProjectManager {
  constructor() {
    const userHome = process.env.HOME || process.env.USERPROFILE || '';
    this.projectsDir = path.join(userHome, 'ArduinoAI', 'Projects');
    this.templatesDir = path.join(userHome, 'ArduinoAI', 'Templates');
    
    this.currentProject = null;
    this.settings = {
      autoSave: true,
      autoBackup: true,
      backupInterval: 5, // 5 minutes
      maxSnapshots: 50,
      excludeFromBackup: ['node_modules', '.git', 'build', '*.tmp']
    };
    
    this.autoSaveTimer = null;
    this.isGitAvailable = false;

    this.initializeDirectories();
    this.checkGitAvailability();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
      await this.setupDefaultTemplates();
      console.log('Project manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize project directories:', error);
    }
  }

  async checkGitAvailability() {
    try {
      await this.runCommand('git', ['--version']);
      this.isGitAvailable = true;
      console.log('Git is available for version control');
    } catch (error) {
      console.log('Git not available, using file-based snapshots');
      this.isGitAvailable = false;
    }
  }

  async createProject(name, template, options = {}) {
    const projectId = uuidv4();
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectPath = path.join(this.projectsDir, sanitizedName);
    
    try {
      // Check if project directory already exists
      try {
        await fs.access(projectPath);
        throw new Error(`Project directory "${sanitizedName}" already exists`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Create project directory structure
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, '.arduino-ai'), { recursive: true });
      await fs.mkdir(path.join(projectPath, '.arduino-ai', 'snapshots'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'libraries'), { recursive: true });
      await fs.mkdir(path.join(projectPath, 'docs'), { recursive: true });

      const project = {
        id: projectId,
        name: sanitizedName,
        path: projectPath,
        created: new Date(),
        modified: new Date(),
        mainSketch: path.join(projectPath, `${sanitizedName}.ino`),
        description: options.description,
        author: options.author,
        version: '1.0.0',
        libraries: []
      };

      // Set board config if specified
      if (options.boardType) {
        project.boardConfig = {
          fqbn: options.boardType,
          name: this.getBoardName(options.boardType)
        };
      }

      // Create files from template or default
      let sketchContent = this.getDefaultSketch();
      let additionalFiles = {};
      
      if (template) {
        const templateContent = await this.getTemplate(template);
        if (templateContent) {
          sketchContent = templateContent.files[`${sanitizedName}.ino`] || 
                         templateContent.files['sketch.ino'] || 
                         sketchContent;
          
          // Create additional files from template
          for (const [filename, content] of Object.entries(templateContent.files)) {
            if (filename !== `${sanitizedName}.ino` && filename !== 'sketch.ino') {
              additionalFiles[filename] = content;
            }
          }

          // Set required libraries
          if (templateContent.requiredLibraries) {
            project.libraries = [...templateContent.requiredLibraries];
          }
        }
      }

      // Write main sketch file
      await fs.writeFile(project.mainSketch, sketchContent, 'utf8');

      // Write additional files
      for (const [filename, content] of Object.entries(additionalFiles)) {
        const filePath = path.join(projectPath, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
      }

      // Create README.md
      const readmeContent = this.generateReadme(project, template);
      await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent, 'utf8');

      // Save project metadata
      await this.saveProjectMetadata(project);

      // Initialize git repository if available
      if (this.isGitAvailable) {
        await this.initializeGitRepo(projectPath);
      }

      // Create initial snapshot
      await this.createSnapshot(projectPath, 'Initial project creation', true);

      this.currentProject = project;
      this.setupAutoSave();

      return project;
    } catch (error) {
      // Cleanup on failure
      try {
        await fs.rmdir(projectPath, { recursive: true });
      } catch (cleanupError) {
        console.error('Failed to cleanup failed project creation:', cleanupError);
      }
      
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  async openProject(projectPath) {
    try {
      // Check if it's a valid project directory
      const metadataPath = path.join(projectPath, '.arduino-ai', 'project.json');
      
      try {
        await fs.access(metadataPath);
      } catch (error) {
        // Try to detect if it's an Arduino project without metadata
        const inoFiles = await this.findArduinoFiles(projectPath);
        if (inoFiles.length > 0) {
          // Create metadata for existing Arduino project
          await this.createMetadataForExistingProject(projectPath, inoFiles[0]);
          return await this.openProject(projectPath);
        } else {
          throw new Error('Not a valid Arduino project directory');
        }
      }

      const metadata = await fs.readFile(metadataPath, 'utf8');
      const project = JSON.parse(metadata);
      
      // Update timestamps
      project.modified = new Date();
      
      // Verify main sketch file exists
      try {
        await fs.access(project.mainSketch);
      } catch (error) {
        // Try to find the main sketch file
        const inoFiles = await this.findArduinoFiles(projectPath);
        if (inoFiles.length > 0) {
          project.mainSketch = inoFiles[0];
        } else {
          throw new Error('Main sketch file not found');
        }
      }

      await this.saveProjectMetadata(project);
      
      this.currentProject = project;
      this.setupAutoSave();

      return project;
    } catch (error) {
      throw new Error(`Failed to open project: ${error.message}`);
    }
  }

  async saveProject(projectPath, files) {
    try {
      for (const [filename, content] of Object.entries(files)) {
        const filePath = path.join(projectPath, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
      }

      // Update project metadata
      if (this.currentProject && this.currentProject.path === projectPath) {
        this.currentProject.modified = new Date();
        await this.saveProjectMetadata(this.currentProject);
      }

      // Create auto-backup if enabled
      if (this.settings.autoBackup) {
        await this.createSnapshot(projectPath, `Auto-backup ${new Date().toISOString()}`, true);
      }
    } catch (error) {
      throw new Error(`Failed to save project: ${error.message}`);
    }
  }

  async createSnapshot(projectPath, description, autoGenerated = false) {
    const snapshotId = uuidv4();
    const timestamp = new Date();
    
    try {
      // Read all project files
      const files = {};
      const projectFiles = await this.getProjectFiles(projectPath);
      
      for (const file of projectFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const relativePath = path.relative(projectPath, file);
          files[relativePath] = content;
        } catch (error) {
          console.warn(`Failed to read file ${file} for snapshot:`, error);
        }
      }

      // Read board config if exists
      let boardConfig;
      try {
        const configPath = path.join(projectPath, '.arduino-ai', 'board-config.json');
        const configContent = await fs.readFile(configPath, 'utf8');
        boardConfig = JSON.parse(configContent);
      } catch (error) {
        // Board config doesn't exist yet
      }

      const snapshot = {
        id: snapshotId,
        timestamp,
        description,
        files,
        boardConfig,
        autoGenerated
      };

      // Use Git if available, otherwise save as JSON
      if (this.isGitAvailable && !autoGenerated) {
        await this.createGitSnapshot(projectPath, description);
      }

      // Always save as JSON snapshot for reliability
      const snapshotPath = path.join(projectPath, '.arduino-ai', 'snapshots', `${snapshotId}.json`);
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

      // Cleanup old auto-generated snapshots
      if (autoGenerated) {
        await this.cleanupOldSnapshots(projectPath);
      }

      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }
  }

  async getSnapshots(projectPath) {
    try {
      const snapshotsDir = path.join(projectPath, '.arduino-ai', 'snapshots');
      
      try {
        await fs.access(snapshotsDir);
      } catch (error) {
        return [];
      }

      const files = await fs.readdir(snapshotsDir);
      const snapshots = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const snapshotPath = path.join(snapshotsDir, file);
            const content = await fs.readFile(snapshotPath, 'utf8');
            const snapshot = JSON.parse(content);
            snapshots.push(snapshot);
          } catch (error) {
            console.warn(`Failed to read snapshot ${file}:`, error);
          }
        }
      }

      return snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get snapshots:', error);
      return [];
    }
  }

  async restoreSnapshot(projectPath, snapshotId) {
    try {
      const snapshotPath = path.join(projectPath, '.arduino-ai', 'snapshots', `${snapshotId}.json`);
      const content = await fs.readFile(snapshotPath, 'utf8');
      const snapshot = JSON.parse(content);

      // Create backup of current state
      await this.createSnapshot(projectPath, `Backup before restoring to: ${snapshot.description}`, true);

      // Restore files
      for (const [filename, fileContent] of Object.entries(snapshot.files)) {
        const filePath = path.join(projectPath, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, fileContent, 'utf8');
      }

      // Restore board config
      if (snapshot.boardConfig) {
        const configPath = path.join(projectPath, '.arduino-ai', 'board-config.json');
        await fs.writeFile(configPath, JSON.stringify(snapshot.boardConfig, null, 2), 'utf8');
      }

      // Update project metadata
      if (this.currentProject && this.currentProject.path === projectPath) {
        this.currentProject.modified = new Date();
        await this.saveProjectMetadata(this.currentProject);
      }
    } catch (error) {
      throw new Error(`Failed to restore snapshot: ${error.message}`);
    }
  }

  async getRecentProjects(limit = 10) {
    try {
      const projects = [];
      const projectDirs = await fs.readdir(this.projectsDir);

      for (const dir of projectDirs) {
        try {
          const projectPath = path.join(this.projectsDir, dir);
          const metadataPath = path.join(projectPath, '.arduino-ai', 'project.json');
          
          await fs.access(metadataPath);
          const metadata = await fs.readFile(metadataPath, 'utf8');
          const project = JSON.parse(metadata);
          projects.push(project);
        } catch (error) {
          // Skip invalid projects
        }
      }

      return projects
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent projects:', error);
      return [];
    }
  }

  async deleteProject(projectPath) {
    try {
      await fs.rmdir(projectPath, { recursive: true });
      
      if (this.currentProject && this.currentProject.path === projectPath) {
        this.currentProject = null;
        this.clearAutoSave();
      }
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  async getAvailableTemplates() {
    try {
      const templates = [];
      const templateFiles = await fs.readdir(this.templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.json')) {
          try {
            const templatePath = path.join(this.templatesDir, file);
            const content = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(content);
            templates.push(template);
          } catch (error) {
            console.warn(`Failed to read template ${file}:`, error);
          }
        }
      }

      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to get available templates:', error);
      return [];
    }
  }

  getCurrentProject() {
    return this.currentProject;
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.currentProject) {
      if (this.settings.autoSave) {
        this.setupAutoSave();
      } else {
        this.clearAutoSave();
      }
    }
  }

  // Helper methods
  async setupDefaultTemplates() {
    const templates = [
      {
        name: 'Basic Blink',
        description: 'Simple LED blink example - perfect for getting started',
        category: 'Getting Started',
        difficulty: 'beginner',
        estimatedTime: '10 minutes',
        learningObjectives: ['Basic Arduino structure', 'Digital output', 'Timing with delay()'],
        files: {
          'sketch.ino': `// Basic LED Blink Example
// This sketch blinks an LED connected to pin 13

const int LED_PIN = 13;  // Pin where LED is connected

void setup() {
  // Initialize digital pin as an output
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize serial communication for debugging
  Serial.begin(9600);
  Serial.println("Blink example started");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);   // Turn the LED on
  Serial.println("LED ON");
  delay(1000);                   // Wait for a second
  
  digitalWrite(LED_PIN, LOW);    // Turn the LED off
  Serial.println("LED OFF");
  delay(1000);                   // Wait for a second
}`,
          'README.md': `# Basic Blink Project

## Components Required
- Arduino Uno (or compatible)
- LED
- 220Ω resistor
- Breadboard
- Jumper wires

## Wiring
1. Connect LED anode (long leg) to pin 13
2. Connect LED cathode (short leg) to ground through 220Ω resistor

## What You'll Learn
- Basic Arduino sketch structure (setup and loop)
- Digital output with digitalWrite()
- Using delay() for timing
- Serial communication for debugging

## Next Steps
Try modifying the blink pattern or using different pins!`
        },
        components: [
          { type: 'LED', quantity: 1, description: 'Standard 5mm LED (any color)' },
          { type: 'Resistor', quantity: 1, description: '220Ω resistor (red-red-brown)' },
          { type: 'Breadboard', quantity: 1, description: 'Half-size breadboard' },
          { type: 'Jumper Wires', quantity: 2, description: 'Male-to-male jumper wires' }
        ]
      }
    ];

    for (const template of templates) {
      const templatePath = path.join(this.templatesDir, `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      try {
        await fs.access(templatePath);
        // Template already exists
      } catch (error) {
        // Template doesn't exist, create it
        await fs.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf8');
      }
    }
  }

  async getTemplate(templateName) {
    try {
      const templates = await this.getAvailableTemplates();
      return templates.find(t => t.name === templateName) || null;
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      return null;
    }
  }

  getDefaultSketch() {
    return `// Arduino Sketch
// Add your code here

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
  
}`;
  }

  generateReadme(project, templateName) {
    return `# ${project.name}

${project.description || 'Arduino project created with Arduino AI IDE'}

## Project Information
- **Created:** ${project.created.toDateString()}
- **Author:** ${project.author || 'Unknown'}
- **Version:** ${project.version || '1.0.0'}
${templateName ? `- **Template:** ${templateName}` : ''}
${project.boardConfig ? `- **Target Board:** ${project.boardConfig.name}` : ''}

## Getting Started

1. Open this project in Arduino AI IDE
2. Select the appropriate board and port
3. Upload the sketch to your Arduino
4. Open Serial Monitor to see output

## Files

- \`${path.basename(project.mainSketch)}\` - Main Arduino sketch
- \`README.md\` - This file
- \`docs/\` - Additional documentation
- \`libraries/\` - Project-specific libraries

## Dependencies

${project.libraries && project.libraries.length > 0 
  ? project.libraries.map(lib => `- ${lib}`).join('\n')
  : 'No external libraries required'}

---

*Generated by Arduino AI IDE*`;
  }

  async findArduinoFiles(projectPath) {
    const files = [];
    
    try {
      const items = await fs.readdir(projectPath);
      
      for (const item of items) {
        if (item.endsWith('.ino')) {
          files.push(path.join(projectPath, item));
        }
      }
    } catch (error) {
      console.error('Failed to find Arduino files:', error);
    }
    
    return files;
  }

  async createMetadataForExistingProject(projectPath, mainSketch) {
    const projectName = path.basename(projectPath);
    const project = {
      id: uuidv4(),
      name: projectName,
      path: projectPath,
      created: new Date(),
      modified: new Date(),
      mainSketch,
      description: 'Imported existing Arduino project',
      version: '1.0.0'
    };

    await fs.mkdir(path.join(projectPath, '.arduino-ai'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.arduino-ai', 'snapshots'), { recursive: true });
    await this.saveProjectMetadata(project);

    return project;
  }

  async getProjectFiles(projectPath) {
    const files = [];
    
    const scanDirectory = async (dirPath) => {
      try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = await fs.stat(itemPath);
          
          if (stat.isDirectory()) {
            // Skip certain directories
            if (item.startsWith('.') && item !== '.arduino-ai') continue;
            if (this.settings.excludeFromBackup.includes(item)) continue;
            
            await scanDirectory(itemPath);
          } else if (stat.isFile()) {
            // Include relevant file types
            const ext = path.extname(item).toLowerCase();
            if (['.ino', '.cpp', '.h', '.c', '.hpp', '.md', '.txt', '.json'].includes(ext)) {
              files.push(itemPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
      }
    };

    await scanDirectory(projectPath);
    return files;
  }

  async saveProjectMetadata(project) {
    const metadataPath = path.join(project.path, '.arduino-ai', 'project.json');
    await fs.writeFile(metadataPath, JSON.stringify(project, null, 2), 'utf8');
  }

  async initializeGitRepo(projectPath) {
    try {
      await this.runCommand('git', ['init'], projectPath);
      await this.runCommand('git', ['add', '.'], projectPath);
      await this.runCommand('git', ['commit', '-m', 'Initial commit'], projectPath);
    } catch (error) {
      console.warn('Failed to initialize git repository:', error);
    }
  }

  async createGitSnapshot(projectPath, message) {
    try {
      await this.runCommand('git', ['add', '.'], projectPath);
      await this.runCommand('git', ['commit', '-m', message], projectPath);
    } catch (error) {
      console.warn('Failed to create git snapshot:', error);
    }
  }

  async cleanupOldSnapshots(projectPath) {
    try {
      const snapshots = await this.getSnapshots(projectPath);
      const autoSnapshots = snapshots.filter(s => s.autoGenerated);
      
      if (autoSnapshots.length > this.settings.maxSnapshots) {
        const toDelete = autoSnapshots.slice(this.settings.maxSnapshots);
        
        for (const snapshot of toDelete) {
          const snapshotPath = path.join(projectPath, '.arduino-ai', 'snapshots', `${snapshot.id}.json`);
          try {
            await fs.unlink(snapshotPath);
          } catch (error) {
            console.warn(`Failed to delete old snapshot ${snapshot.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old snapshots:', error);
    }
  }

  getBoardName(fqbn) {
    const boardNames = {
      'arduino:avr:uno': 'Arduino Uno',
      'arduino:avr:nano': 'Arduino Nano',
      'arduino:avr:mega': 'Arduino Mega 2560',
      'arduino:avr:leonardo': 'Arduino Leonardo',
      'arduino:avr:micro': 'Arduino Micro',
      'esp32:esp32:esp32': 'ESP32 Dev Module',
      'esp8266:esp8266:nodemcuv2': 'NodeMCU 1.0 (ESP-12E Module)'
    };
    
    return boardNames[fqbn] || fqbn;
  }

  setupAutoSave() {
    this.clearAutoSave();
    
    if (this.settings.autoSave && this.currentProject) {
      this.autoSaveTimer = setInterval(() => {
        if (this.currentProject) {
          this.createSnapshot(
            this.currentProject.path, 
            `Auto-save ${new Date().toISOString()}`, 
            true
          ).catch(error => {
            console.warn('Auto-save failed:', error);
          });
        }
      }, this.settings.backupInterval * 60 * 1000);
    }
  }

  clearAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, { cwd: cwd || process.cwd() });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  cleanup() {
    this.clearAutoSave();
  }
}

module.exports = { ProjectManager };
