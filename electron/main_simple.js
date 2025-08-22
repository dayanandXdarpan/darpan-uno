const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

// Import our services
const { ArduinoBuildService } = require('./services/arduinoBuild');
const { ArduinoSerialService } = require('./services/arduinoSerial');
const { ArduinoAIService } = require('./services/arduinoAI');
const { ProjectManager } = require('./services/projectManager');

let mainWindow;
let buildService;
let serialService;
let aiService;
let projectManager;

// Create the main application window
const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload_simple.js'),
      webSecurity: false, // Required for Arduino CLI and serial access
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      enableBlinkFeatures: 'Serial,WebUSB,WebBluetooth',
      sandbox: false,
      spellcheck: false
    },
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Attempting to connect to Vite dev server...');
  
  // Always try dev server first in this simplified version
  try {
    await mainWindow.loadURL('http://localhost:5176');
    console.log('✅ Successfully loaded app from Vite dev server on port 5176');
    mainWindow.webContents.openDevTools();
  } catch (error) {
    console.log('❌ Port 5176 failed, trying alternative ports:', error.message);
    // Try different ports in case Vite auto-selected a different one
    const ports = [5173, 5174, 5175, 5177, 5178, 5179];
    let loaded = false;
    for (const port of ports) {
      try {
        console.log(`🔍 Trying port ${port}...`);
        await mainWindow.loadURL(`http://localhost:${port}`);
        console.log(`✅ Successfully loaded app from Vite dev server on port ${port}`);
        mainWindow.webContents.openDevTools();
        loaded = true;
        break;
      } catch (e) {
        console.log(`❌ Port ${port} failed:`, e.message);
      }
    }
    if (!loaded) {
      console.log('❌ All dev server ports failed, trying built files...');
      try {
        await mainWindow.loadFile(path.join(__dirname, '../dist/renderer/renderer/index.html'));
        console.log('✅ Successfully loaded built files');
      } catch (buildError) {
        console.log('❌ Built files also failed, showing error page:', buildError.message);
        await mainWindow.loadURL('data:text/html,<h1>Arduino IDE</h1><p>Please start the Vite dev server first with: npm run dev:renderer</p><p>Or build the project with: npm run build</p>');
      }
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Permission handlers for web APIs
const setupPermissions = () => {
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
};

// App event listeners
app.whenReady().then(async () => {
  // Setup permissions first
  setupPermissions();
  
  // Initialize services
  console.log('🔧 Initializing Arduino IDE services...');
  
  try {
    buildService = new ArduinoBuildService();
    await buildService.initialize();
    console.log('✅ Arduino Build Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Arduino Build Service:', error.message);
  }

  try {
    serialService = new ArduinoSerialService();
    console.log('✅ Arduino Serial Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Arduino Serial Service:', error.message);
  }

  try {
    aiService = new ArduinoAIService();
    console.log('✅ Arduino AI Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Arduino AI Service:', error.message);
  }

  try {
    projectManager = new ProjectManager();
    console.log('✅ Project Manager initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Project Manager:', error.message);
  }

  // Set up event forwarding from services to renderer
  if (serialService) {
    serialService.on('data', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('serial:data', data);
      }
    });
    
    serialService.on('error', (error) => {
      if (mainWindow) {
        mainWindow.webContents.send('serial:error', error.message);
      }
    });
    
    serialService.on('plotData', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('serial:plotData', data);
      }
    });
  }

  if (buildService) {
    buildService.on('progress', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('build:progress', data);
      }
    });
    
    buildService.on('output', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('build:output', data);
      }
    });
  }

  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Cleanup services
  if (buildService) buildService.cleanup();
  if (serialService) serialService.cleanup();
  if (projectManager) projectManager.cleanup();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for file operations
ipcMain.handle('file:read', async (event, filePath) => {
  const fs = require('fs').promises;
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:write', async (event, filePath, content) => {
  const fs = require('fs').promises;
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:exists', async (event, filePath) => {
  const fs = require('fs').promises;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('file:list', async (event, dirPath) => {
  const fs = require('fs').promises;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory()
    }));
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Arduino handlers - Real implementations
ipcMain.handle('arduino:compile', async (event, filePath, board) => {
  if (!buildService) {
    return { success: false, error: 'Build service not initialized' };
  }
  
  try {
    const result = await buildService.compile(filePath, board.fqbn);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('arduino:upload', async (event, filePath, board, port) => {
  if (!buildService) {
    return { success: false, error: 'Build service not initialized' };
  }
  
  try {
    const result = await buildService.upload(filePath, board.fqbn, port);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('arduino:getBoardList', async () => {
  if (!buildService) {
    return [];
  }
  
  try {
    return await buildService.getAvailableBoards();
  } catch (error) {
    console.error('Failed to get board list:', error);
    return [];
  }
});

ipcMain.handle('arduino:getAvailablePorts', async () => {
  if (!buildService) {
    return [];
  }
  
  try {
    return await buildService.getAvailablePorts();
  } catch (error) {
    console.error('Failed to get available ports:', error);
    return [];
  }
});

ipcMain.handle('arduino:installCore', async (event, packageName) => {
  if (!buildService) {
    return { success: false, error: 'Build service not initialized' };
  }
  
  try {
    const result = await buildService.installCore(packageName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('arduino:installLibrary', async (event, libraryName) => {
  if (!buildService) {
    return { success: false, error: 'Build service not initialized' };
  }
  
  try {
    const result = await buildService.installLibrary(libraryName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Serial handlers - Real implementations
ipcMain.handle('serial:connect', async (event, port, baudRate) => {
  if (!serialService) {
    return { success: false, error: 'Serial service not initialized' };
  }
  
  try {
    await serialService.connect(port, baudRate || 9600);
    return { success: true, message: `Connected to ${port} at ${baudRate || 9600} baud` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('serial:disconnect', async () => {
  if (!serialService) {
    return { success: false, error: 'Serial service not initialized' };
  }
  
  try {
    await serialService.disconnect();
    return { success: true, message: 'Disconnected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('serial:write', async (event, data) => {
  if (!serialService) {
    return { success: false, error: 'Serial service not initialized' };
  }
  
  try {
    await serialService.write(data);
    return { success: true, message: 'Data sent successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('serial:getConnectionStatus', async () => {
  if (!serialService) {
    return { connected: false };
  }
  
  return {
    connected: serialService.isConnected(),
    port: serialService.getCurrentPort(),
    baudRate: serialService.getCurrentBaudRate()
  };
});

// Set up serial data forwarding to renderer
if (serialService) {
  serialService.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('serial:data', data);
    }
  });
  
  serialService.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('serial:error', error.message);
    }
  });
  
  serialService.on('plotData', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('serial:plotData', data);
    }
  });
}

// AI handlers - Real implementations
ipcMain.handle('ai:chat', async (event, messages, context) => {
  if (!aiService) {
    return { success: false, error: 'AI service not initialized' };
  }
  
  try {
    const response = await aiService.chat(messages, context);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:explainCode', async (event, code, language) => {
  if (!aiService) {
    return { success: false, error: 'AI service not initialized' };
  }
  
  try {
    const explanation = await aiService.explainCode(code, language || 'arduino');
    return { success: true, explanation };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:fixError', async (event, error, code) => {
  if (!aiService) {
    return { success: false, error: 'AI service not initialized' };
  }
  
  try {
    const suggestion = await aiService.fixError(error, code);
    return { success: true, suggestion };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:generateCode', async (event, prompt, language) => {
  if (!aiService) {
    return { success: false, error: 'AI service not initialized' };
  }
  
  try {
    const code = await aiService.generateCode(prompt, language || 'arduino');
    return { success: true, code };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:optimizeCode', async (event, code, language) => {
  if (!aiService) {
    return { success: false, error: 'AI service not initialized' };
  }
  
  try {
    const optimizedCode = await aiService.optimizeCode(code, language || 'arduino');
    return { success: true, code: optimizedCode };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:getConversationHistory', async () => {
  if (!aiService) {
    return [];
  }
  
  try {
    return aiService.getConversationHistory();
  } catch (error) {
    console.error('Failed to get conversation history:', error);
    return [];
  }
});

ipcMain.handle('ai:clearConversationHistory', async () => {
  if (!aiService) {
    return { success: false, error: 'AI service not initialized' };
  }
  
  try {
    aiService.clearConversationHistory();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Project handlers - Real implementations
ipcMain.handle('project:getTemplates', async () => {
  if (!projectManager) {
    return [];
  }
  
  try {
    return await projectManager.getAvailableTemplates();
  } catch (error) {
    console.error('Failed to get project templates:', error);
    return [];
  }
});

ipcMain.handle('project:create', async (event, name, templateName, options) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    const project = await projectManager.createProject(name, templateName, options);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:open', async (event, projectPath) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    const project = await projectManager.openProject(projectPath);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:save', async (event, projectPath, files) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    await projectManager.saveProject(projectPath, files);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:createSnapshot', async (event, projectPath, description) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    const snapshot = await projectManager.createSnapshot(projectPath, description);
    return { success: true, snapshot };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:restoreSnapshot', async (event, projectPath, snapshotId) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    await projectManager.restoreSnapshot(projectPath, snapshotId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:getSnapshots', async (event, projectPath) => {
  if (!projectManager) {
    return [];
  }
  
  try {
    return await projectManager.getSnapshots(projectPath);
  } catch (error) {
    console.error('Failed to get snapshots:', error);
    return [];
  }
});

ipcMain.handle('project:getRecentProjects', async (event, limit) => {
  if (!projectManager) {
    return [];
  }
  
  try {
    return await projectManager.getRecentProjects(limit);
  } catch (error) {
    console.error('Failed to get recent projects:', error);
    return [];
  }
});

ipcMain.handle('project:getCurrent', async () => {
  if (!projectManager) {
    return null;
  }
  
  return projectManager.getCurrentProject();
});

ipcMain.handle('project:delete', async (event, projectPath) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    await projectManager.deleteProject(projectPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:getSettings', async () => {
  if (!projectManager) {
    return {};
  }
  
  return projectManager.getSettings();
});

ipcMain.handle('project:updateSettings', async (event, settings) => {
  if (!projectManager) {
    return { success: false, error: 'Project manager not initialized' };
  }
  
  try {
    projectManager.updateSettings(settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

console.log('Arduino IDE starting with real service integrations...');
