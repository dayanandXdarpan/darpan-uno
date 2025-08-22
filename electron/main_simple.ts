import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

// Import our services
const { ArduinoBuildService } = require('./services/arduinoBuild');
const { ArduinoSerialService } = require('./services/arduinoSerial');
const { ArduinoAIService } = require('./services/arduinoAI');
const { ProjectManager } = require('./services/projectManager');

class ArduinoIDE {
  private mainWindow: BrowserWindow | null = null;
  private buildService: any = null;
  private serialService: any = null;
  private aiService: any = null;
  private projectManager: any = null;

  constructor() {
    this.setupApp();
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      titleBarStyle: 'default',
      show: false
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu(): void {
    const template: any[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New File',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.handleNewFile()
          },
          {
            label: 'Open File',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleOpenFile()
          },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.handleSave()
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
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    // File operations
    ipcMain.handle('file:read', async (_event: any, filePath: string) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
      }
    });

    ipcMain.handle('file:write', async (_event: any, filePath: string, content: string) => {
      try {
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
      } catch (error) {
        throw new Error(`Failed to write file: ${error}`);
      }
    });

    ipcMain.handle('file:exists', async (_event: any, filePath: string) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });

    ipcMain.handle('file:list', async (_event: any, dirPath: string) => {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        return items.map(item => ({
          name: item.name,
          isDirectory: item.isDirectory(),
          path: path.join(dirPath, item.name)
        }));
      } catch (error) {
        throw new Error(`Failed to list directory: ${error}`);
      }
    });

    ipcMain.handle('dialog:showOpenDialog', async (_event: any, options: any) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, options);
      return result.filePaths;
    });

    ipcMain.handle('dialog:showSaveDialog', async (_event: any, options: any) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options);
      return result.filePath;
    });

    // Placeholder handlers for future Arduino/AI integration
    ipcMain.handle('arduino:compile', async () => {
      return { success: false, message: 'Arduino CLI not connected yet' };
    });

    ipcMain.handle('arduino:upload', async () => {
      return { success: false, message: 'Arduino CLI not connected yet' };
    });

    ipcMain.handle('arduino:getBoardList', async () => {
      return [
        { fqbn: 'arduino:avr:uno', name: 'Arduino Uno', platform: 'Arduino AVR', architecture: 'avr' },
        { fqbn: 'arduino:avr:nano', name: 'Arduino Nano', platform: 'Arduino AVR', architecture: 'avr' },
        { fqbn: 'arduino:avr:mega', name: 'Arduino Mega', platform: 'Arduino AVR', architecture: 'avr' }
      ];
    });

    ipcMain.handle('arduino:getAvailablePorts', async () => {
      return [
        { path: 'COM3', label: 'USB Serial Port (COM3)', protocol: 'serial' },
        { path: 'COM4', label: 'USB Serial Port (COM4)', protocol: 'serial' }
      ];
    });

    ipcMain.handle('serial:connect', async () => {
      return { success: false, message: 'Serial not connected yet' };
    });

    ipcMain.handle('serial:disconnect', async () => {
      return { success: true };
    });

    ipcMain.handle('serial:write', async () => {
      return { success: false, message: 'Serial not connected yet' };
    });

    ipcMain.handle('ai:chat', async () => {
      return 'AI features will be available soon! Please configure your OpenAI API key.';
    });

    ipcMain.handle('ai:explainCode', async () => {
      return 'AI code explanation will be available soon!';
    });

    ipcMain.handle('ai:fixError', async () => {
      return 'AI error fixing will be available soon!';
    });

    ipcMain.handle('ai:generateCode', async () => {
      return 'AI code generation will be available soon!';
    });

    // Project templates
    ipcMain.handle('project:getTemplates', async () => {
      return [
        {
          name: 'Blink',
          description: 'Simple LED blink example',
          files: {
            'blink.ino': `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`
          }
        },
        {
          name: 'Button',
          description: 'Read button input and control LED',
          files: {
            'button.ino': `const int buttonPin = 2;
const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }
}`
          }
        },
        {
          name: 'Sensor',
          description: 'Read analog sensor and display values',
          files: {
            'sensor.ino': `void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  Serial.print("Sensor: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);
  
  delay(500);
}`
          }
        }
      ];
    });

    ipcMain.handle('project:create', async (_event: any, name: string, templateName: string, projectPath: string) => {
      // This is a placeholder - we'll implement proper project creation later
      return projectPath;
    });
  }

  private async handleNewFile(): Promise<void> {
    this.mainWindow?.webContents.send('menu:newFile');
  }

  private async handleOpenFile(): Promise<void> {
    this.mainWindow?.webContents.send('menu:openFile');
  }

  private async handleSave(): Promise<void> {
    this.mainWindow?.webContents.send('menu:save');
  }
}

// Initialize the application
new ArduinoIDE();
