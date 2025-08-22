const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class ArduinoIDE {
  constructor() {
    this.mainWindow = null;
    this.setupApp();
  }

  setupApp() {
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

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload_simple.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:5176');
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupMenu() {
    const template = [
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

  setupIPC() {
    // File operations
    ipcMain.handle('file:read', async (event, filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
    });

    ipcMain.handle('file:write', async (event, filePath, content) => {
      try {
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
      } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
      }
    });

    ipcMain.handle('file:exists', async (event, filePath) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });

    ipcMain.handle('file:list', async (event, dirPath) => {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        return items.map(item => ({
          name: item.name,
          isDirectory: item.isDirectory(),
          path: path.join(dirPath, item.name)
        }));
      } catch (error) {
        throw new Error(`Failed to list directory: ${error.message}`);
      }
    });

    ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result.filePaths;
    });

    ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result.filePath;
    });

    // Placeholder handlers for future features
    ipcMain.handle('arduino:compile', async () => {
      return { 
        success: false, 
        output: '',
        errors: [{
          file: '',
          line: 1,
          column: 1,
          type: 'info',
          message: 'Arduino CLI not connected yet. This is just the UI demo!'
        }],
        warnings: []
      };
    });

    ipcMain.handle('arduino:upload', async () => {
      return { 
        success: false, 
        output: '',
        errors: [{
          file: '',
          line: 1,
          column: 1,
          type: 'info',
          message: 'Arduino upload not connected yet. This is just the UI demo!'
        }],
        warnings: []
      };
    });

    ipcMain.handle('arduino:getBoardList', async () => {
      return [
        { fqbn: 'arduino:avr:uno', name: 'Arduino Uno', platform: 'Arduino AVR', architecture: 'avr' },
        { fqbn: 'arduino:avr:nano', name: 'Arduino Nano', platform: 'Arduino AVR', architecture: 'avr' },
        { fqbn: 'arduino:avr:mega', name: 'Arduino Mega 2560', platform: 'Arduino AVR', architecture: 'avr' },
        { fqbn: 'esp32:esp32:esp32', name: 'ESP32 Dev Module', platform: 'ESP32', architecture: 'esp32' }
      ];
    });

    ipcMain.handle('arduino:getAvailablePorts', async () => {
      return [
        { path: 'COM3', label: 'USB Serial Port (COM3)', protocol: 'serial' },
        { path: 'COM4', label: 'USB Serial Port (COM4)', protocol: 'serial' },
        { path: 'COM5', label: 'Arduino Uno (COM5)', protocol: 'serial' }
      ];
    });

    ipcMain.handle('serial:connect', async () => {
      return true;
    });

    ipcMain.handle('serial:disconnect', async () => {
      return true;
    });

    ipcMain.handle('serial:write', async () => {
      return true;
    });

    ipcMain.handle('ai:chat', async () => {
      return 'AI features will be available soon! 🤖\n\nFor now, enjoy the full IDE interface. Later we will connect:\n- OpenAI API for AI assistance\n- Arduino CLI for compilation\n- Serial communication for monitoring\n\nThis is just the UI demo!';
    });

    ipcMain.handle('ai:explainCode', async () => {
      return 'AI code explanation will be available soon! 📖\n\nOnce connected, I will be able to:\n- Explain your Arduino code line by line\n- Suggest improvements\n- Help with debugging\n- Recommend libraries';
    });

    ipcMain.handle('ai:fixError', async () => {
      return 'AI error fixing will be available soon! 🔧\n\nOnce connected, I will:\n- Analyze compilation errors\n- Suggest specific fixes\n- Provide code corrections\n- Explain common Arduino pitfalls';
    });

    ipcMain.handle('ai:generateCode', async () => {
      return 'AI code generation will be available soon! ✨\n\nOnce connected, I can:\n- Generate Arduino sketches from descriptions\n- Create sensor reading code\n- Build communication protocols\n- Implement control algorithms';
    });

    // Project templates
    ipcMain.handle('project:getTemplates', async () => {
      return [
        {
          name: 'Blink',
          description: 'Classic LED blink example - perfect for beginners',
          files: {
            'blink.ino': `// The classic Arduino "Hello World" - Blink!
// This sketch blinks the built-in LED on pin 13

void setup() {
  // Initialize the built-in LED pin as an output
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // Turn the LED on
  delay(1000);                       // Wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // Turn the LED off
  delay(1000);                       // Wait for a second
}
`
          }
        },
        {
          name: 'Button',
          description: 'Read button input and control LED - learn digital inputs',
          files: {
            'button.ino': `// Button controlled LED
// Connect a button to pin 2 and LED to pin 13

const int buttonPin = 2;     // Pin connected to pushbutton
const int ledPin = 13;       // Pin connected to LED

void setup() {
  // Initialize the LED pin as an output
  pinMode(ledPin, OUTPUT);
  // Initialize the button pin as input with pullup
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  // Read the state of the button
  if (digitalRead(buttonPin) == LOW) {
    // Button is pressed (LOW because of pullup)
    digitalWrite(ledPin, HIGH);
  } else {
    // Button is not pressed
    digitalWrite(ledPin, LOW);
  }
}
`
          }
        },
        {
          name: 'Sensor',
          description: 'Read analog sensor values - learn analog inputs and serial communication',
          files: {
            'sensor.ino': `// Analog sensor reading with Serial output
// Connect a potentiometer or sensor to A0

void setup() {
  // Initialize serial communication at 9600 baud
  Serial.begin(9600);
  Serial.println("Arduino Sensor Reader");
  Serial.println("=====================");
}

void loop() {
  // Read the analog value (0-1023)
  int sensorValue = analogRead(A0);
  
  // Convert to voltage (0-5V)
  float voltage = sensorValue * (5.0 / 1023.0);
  
  // Print the values
  Serial.print("Raw Value: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage);
  Serial.println("V");
  
  // Wait half a second before next reading
  delay(500);
}
`
          }
        },
        {
          name: 'ServoMotor',
          description: 'Control a servo motor - learn PWM and motor control',
          files: {
            'servo.ino': `#include <Servo.h>

// Create a servo object
Servo myServo;

void setup() {
  // Attach the servo to pin 9
  myServo.attach(9);
  Serial.begin(9600);
  Serial.println("Servo Control Demo");
}

void loop() {
  // Sweep from 0 to 180 degrees
  for (int pos = 0; pos <= 180; pos += 1) {
    myServo.write(pos);
    delay(15);
  }
  
  // Sweep back from 180 to 0 degrees
  for (int pos = 180; pos >= 0; pos -= 1) {
    myServo.write(pos);
    delay(15);
  }
}
`
          }
        }
      ];
    });

    ipcMain.handle('project:create', async (event, name, templateName, projectPath) => {
      // This is a placeholder - just return the path for now
      console.log(`Creating project "${name}" with template "${templateName}" at ${projectPath}`);
      return projectPath;
    });
  }

  handleNewFile() {
    this.mainWindow?.webContents.send('menu:newFile');
  }

  handleOpenFile() {
    this.mainWindow?.webContents.send('menu:openFile');
  }

  handleSave() {
    this.mainWindow?.webContents.send('menu:save');
  }
}

// Initialize the application
new ArduinoIDE();
