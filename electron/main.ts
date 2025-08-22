const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');

// Set up environment and permissions
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.ELECTRON_ENABLE_STACK_DUMPING = 'true';

// Enable experimental web platform features
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-features', 'SerialPortWebApi,WebUSB,WebBluetooth');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-running-insecure-content');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

import { ArduinoCLI } from './services/arduinoCli';
import { SerialManager } from './services/serial';
import { LSPServer } from './services/lspServer';
import { ProjectManager } from './services/projectManager';
import { AIService } from './services/ai';
import { SetupWizard } from './services/setupWizard';
import { CircuitSimulator } from './services/circuitSimulator';
import { LibraryManager } from './services/libraryManager';
import { AIModelManager } from './services/aiModelManager';

class ArduinoAIIDE {
  private mainWindow: any = null;
  private arduinoCLI: ArduinoCLI;
  private serialManager: SerialManager;
  private lspServer: LSPServer;
  private projectManager: ProjectManager;
  private aiService: AIService;
  private aiModelManager: AIModelManager;
  private setupWizard: SetupWizard;
  private circuitSimulator: CircuitSimulator;
  private libraryManager: LibraryManager;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Initialize services
    this.arduinoCLI = new ArduinoCLI();
    this.serialManager = new SerialManager();
    this.lspServer = new LSPServer();
    this.projectManager = new ProjectManager();
    this.aiService = new AIService();
    this.aiModelManager = new AIModelManager();
    this.setupWizard = new SetupWizard();
    this.circuitSimulator = new CircuitSimulator();
    this.libraryManager = new LibraryManager();
    
    this.setupApp();
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.setupPermissions();
      this.createMainWindow();
      this.setupMenu();
      this.setupIPCHandlers();
      this.startServices();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !this.isDevelopment,
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        enableBlinkFeatures: 'Serial,WebUSB,WebBluetooth',
        sandbox: false,
        spellcheck: false,
        enableRemoteModule: false
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1e1e1e',
        symbolColor: '#ffffff',
        height: 32
      },
      show: false
    });

    // Load the renderer
    if (this.isDevelopment) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupPermissions() {
    // Handle permission requests
    app.on('web-contents-created', (event, contents) => {
      // Handle new window requests
      contents.setWindowOpenHandler(({ url }) => {
        // Allow Arduino-related URLs
        if (url.includes('arduino.cc') || url.includes('localhost')) {
          return { action: 'allow' };
        }
        return { action: 'deny' };
      });

      // Handle permission requests
      contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        console.log(`🔐 Permission requested: ${permission}`);
        
        // Allow all permissions needed for Arduino development
        const allowedPermissions = [
          'camera',
          'microphone', 
          'geolocation',
          'notifications',
          'pointerLock',
          'fullscreen',
          'openExternal',
          'media',
          'mediaKeySystem',
          'midi',
          'serial',
          'usb',
          'bluetooth',
          'clipboard',
          'accessibility-events'
        ];
        
        const granted = allowedPermissions.includes(permission);
        console.log(`🔐 Permission ${permission}: ${granted ? 'GRANTED' : 'DENIED'}`);
        callback(granted);
      });

      // Handle permission check
      contents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        console.log(`🔍 Permission check: ${permission} from ${requestingOrigin}`);
        
        // Allow localhost and Arduino-related domains
        if (requestingOrigin.includes('localhost') || requestingOrigin.includes('arduino.cc')) {
          return true;
        }
        
        // Allow file protocol for local development
        if (requestingOrigin.startsWith('file://')) {
          return true;
        }
        
        return false;
      });

      // Allow USB and Serial device access
      contents.session.setDevicePermissionHandler((details) => {
        console.log('🔌 Device permission requested:', details);
        
        // Allow Arduino boards and serial devices
        if (details.deviceType === 'serial' || details.deviceType === 'usb') {
          // Check if it's likely an Arduino board
          const arduinoVendors = ['2341', '1A86', '10C4', '0403', '067B']; // Common Arduino vendor IDs
          if (details.device && details.device.vendorId) {
            const vendorId = details.device.vendorId.toString(16).toUpperCase();
            if (arduinoVendors.includes(vendorId)) {
              console.log('✅ Arduino device detected, granting permission');
              return true;
            }
          }
          // Allow all serial/USB devices for now (can be restricted later)
          return true;
        }
        
        return false;
      });

      // Intercept and allow Arduino-related network requests
      contents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        // Add CORS headers for Arduino-related requests
        if (details.url.includes('arduino.cc') || details.url.includes('api.openai.com') || details.url.includes('generativelanguage.googleapis.com')) {
          details.requestHeaders['Access-Control-Allow-Origin'] = '*';
          details.requestHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          details.requestHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        }
        callback({ requestHeaders: details.requestHeaders });
      });
    });
  }

  private setupMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Sketch',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow?.webContents.send('menu:new-sketch')
          },
          {
            label: 'Open Project',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openProject()
          },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.mainWindow?.webContents.send('menu:save')
          },
          { type: 'separator' },
          {
            label: 'Recent Projects',
            submenu: [] // Will be populated dynamically
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
          { type: 'separator' },
          { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => this.mainWindow?.webContents.send('menu:find') },
          { label: 'Replace', accelerator: 'CmdOrCtrl+H', click: () => this.mainWindow?.webContents.send('menu:replace') }
        ]
      },
      {
        label: 'Arduino',
        submenu: [
          {
            label: 'Verify/Compile',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.mainWindow?.webContents.send('menu:compile')
          },
          {
            label: 'Upload',
            accelerator: 'CmdOrCtrl+U',
            click: () => this.mainWindow?.webContents.send('menu:upload')
          },
          { type: 'separator' },
          {
            label: 'Board Manager',
            click: () => this.mainWindow?.webContents.send('menu:board-manager')
          },
          {
            label: 'Library Manager',
            click: () => this.mainWindow?.webContents.send('menu:library-manager')
          },
          { type: 'separator' },
          {
            label: 'Serial Monitor',
            accelerator: 'CmdOrCtrl+Shift+M',
            click: () => this.mainWindow?.webContents.send('menu:serial-monitor')
          },
          {
            label: 'Serial Plotter',
            accelerator: 'CmdOrCtrl+Shift+L',
            click: () => this.mainWindow?.webContents.send('menu:serial-plotter')
          }
        ]
      },
      {
        label: 'AI Assistant',
        submenu: [
          {
            label: 'Toggle Chat Panel',
            accelerator: 'CmdOrCtrl+T',
            click: () => this.mainWindow?.webContents.send('menu:toggle-chat')
          },
          { type: 'separator' },
          {
            label: 'Explain Code',
            accelerator: 'CmdOrCtrl+E',
            click: () => this.mainWindow?.webContents.send('menu:ai-explain')
          },
          {
            label: 'Generate Code',
            accelerator: 'CmdOrCtrl+G',
            click: () => this.mainWindow?.webContents.send('menu:ai-generate')
          },
          {
            label: 'Fix Errors',
            accelerator: 'CmdOrCtrl+Shift+F',
            click: () => this.mainWindow?.webContents.send('menu:ai-fix')
          },
          {
            label: 'Implement Feature',
            accelerator: 'CmdOrCtrl+I',
            click: () => this.mainWindow?.webContents.send('menu:ai-implement')
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => this.mainWindow?.webContents.toggleDevTools()
          },
          { type: 'separator' },
          {
            label: 'Reset Layout',
            click: () => this.mainWindow?.webContents.send('menu:reset-layout')
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Arduino Reference',
            click: () => shell.openExternal('https://www.arduino.cc/reference/en/')
          },
          {
            label: 'Getting Started',
            click: () => shell.openExternal('https://www.arduino.cc/en/Guide')
          },
          { type: 'separator' },
          {
            label: 'About',
            click: () => this.showAbout()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPCHandlers() {
    // Arduino CLI operations
    ipcMain.handle('arduino:compile', async (event, projectPath, fqbn) => {
      return await this.arduinoCLI.compile(projectPath, fqbn);
    });

    ipcMain.handle('arduino:upload', async (event, projectPath, fqbn, port) => {
      return await this.arduinoCLI.upload(projectPath, fqbn, port);
    });

    ipcMain.handle('arduino:getBoardList', async () => {
      return await this.arduinoCLI.getBoardList();
    });

    ipcMain.handle('arduino:getPortList', async () => {
      return await this.arduinoCLI.getPortList();
    });

    ipcMain.handle('arduino:installLibrary', async (event, library) => {
      return await this.arduinoCLI.installLibrary(library);
    });

    ipcMain.handle('arduino:searchLibraries', async (event, query) => {
      return await this.arduinoCLI.searchLibraries(query);
    });

    // Serial operations
    ipcMain.handle('serial:list', async () => {
      return await this.serialManager.listPorts();
    });

    ipcMain.handle('serial:connect', async (event, port, baudRate) => {
      return await this.serialManager.connect(port, baudRate);
    });

    ipcMain.handle('serial:disconnect', async () => {
      return await this.serialManager.disconnect();
    });

    ipcMain.handle('serial:send', async (event, data) => {
      return await this.serialManager.send(data);
    });

    // Project management
    ipcMain.handle('project:create', async (event, name, template) => {
      return await this.projectManager.createProject(name, template);
    });

    ipcMain.handle('project:open', async (event, projectPath) => {
      return await this.projectManager.openProject(projectPath);
    });

    ipcMain.handle('project:save', async (event, projectPath, files) => {
      return await this.projectManager.saveProject(projectPath, files);
    });

    ipcMain.handle('project:createSnapshot', async (event, projectPath, description) => {
      return await this.projectManager.createSnapshot(projectPath, description);
    });

    ipcMain.handle('project:getSnapshots', async (event, projectPath) => {
      return await this.projectManager.getSnapshots(projectPath);
    });

    ipcMain.handle('project:restoreSnapshot', async (event, projectPath, snapshotId) => {
      return await this.projectManager.restoreSnapshot(projectPath, snapshotId);
    });

    // AI operations
    ipcMain.handle('ai:chat', async (event, message, context, conversationId) => {
      return await this.aiService.processChat(message, context, conversationId);
    });

    ipcMain.handle('ai:explainCode', async (event, code, context) => {
      return await this.aiService.explainCode(code, context);
    });

    ipcMain.handle('ai:generateCode', async (event, prompt, context) => {
      return await this.aiService.generateCode(prompt, context);
    });

    ipcMain.handle('ai:fixCode', async (event, code, errors, context) => {
      return await this.aiService.fixCode(code, errors, context);
    });

    ipcMain.handle('ai:implementFeature', async (event, feature, context) => {
      return await this.aiService.implementFeature(feature, context);
    });

    // AI Model Manager operations
    ipcMain.handle('ai:getAvailableModels', async () => {
      return await this.aiModelManager.getAvailableModels();
    });

    ipcMain.handle('ai:setAPIKey', async (event, provider, apiKey) => {
      return await this.aiModelManager.setApiKey(provider, apiKey);
    });

    ipcMain.handle('ai:testConnection', async (event, modelId) => {
      return await this.aiModelManager.testConnection(modelId);
    });

    ipcMain.handle('ai:getUsageStats', async () => {
      return await this.aiModelManager.getUsageStats();
    });

    ipcMain.handle('ai:modelRequest', async (event, options) => {
      return await this.aiModelManager.makeRequest(options);
    });

    // File operations
    ipcMain.handle('file:showOpenDialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
        title: 'Open Arduino Project'
      });
      return result;
    });

    ipcMain.handle('file:showSaveDialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options);
      return result;
    });

    // Settings
    ipcMain.handle('settings:get', async (event, key) => {
      // Implement settings storage
      return null;
    });

    ipcMain.handle('settings:set', async (event, key, value) => {
      // Implement settings storage
      return true;
    });
  }

  private async startServices() {
    try {
      // Initialize Arduino CLI
      await this.arduinoCLI.initialize();
      
      // Start LSP server
      await this.lspServer.start();
      
      // Setup serial data forwarding
      this.serialManager.on('data', (data) => {
        this.mainWindow?.webContents.send('serial:data', data);
      });

      this.serialManager.on('error', (error) => {
        this.mainWindow?.webContents.send('serial:error', error);
      });

      console.log('All services started successfully');
    } catch (error) {
      console.error('Failed to start services:', error);
    }
  }

  private async openProject() {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openDirectory'],
      title: 'Open Arduino Project',
      buttonLabel: 'Open Project'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow?.webContents.send('project:open', result.filePaths[0]);
    }
  }

  private showAbout() {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About Arduino AI IDE',
      message: 'Arduino AI IDE',
      detail: 'Advanced Arduino IDE with AI Integration by Dayanand Darpan.\n\nVersion 2.0.0\nBuilt with Electron, Monaco Editor, and Arduino CLI.\n\nCreated by Dayanand Darpan\nhttps://www.dayananddarpan.me/',
      buttons: ['OK']
    });
  }

  private cleanup() {
    this.serialManager.cleanup();
    this.lspServer.stop();
  }
}

// Create the application
const arduinoIDE = new ArduinoAIIDE();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});