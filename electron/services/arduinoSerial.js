const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class ArduinoSerialService extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.currentPort = null;
    this.currentBaudRate = null;
    this.dataBuffer = [];
    this.plotDataBuffer = [];
    this.maxBufferSize = 1000;
    this.autoScrollEnabled = true;
    this.timestampsEnabled = true;
  }

  async connect(portPath, baudRate = 9600) {
    try {
      if (this.port && this.port.isOpen) {
        await this.disconnect();
      }

      this.port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        rtscts: false,
        xon: false,
        xoff: false,
        autoOpen: false
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      // Set up event handlers
      this.port.on('open', () => {
        this.currentPort = portPath;
        this.currentBaudRate = baudRate;
        this.emit('connected', { port: portPath, baudRate });
        console.log(`Serial connected to ${portPath} at ${baudRate} baud`);
      });

      this.port.on('close', () => {
        this.currentPort = null;
        this.currentBaudRate = null;
        this.emit('disconnected');
        console.log('Serial disconnected');
      });

      this.port.on('error', (error) => {
        this.emit('error', error);
        console.error('Serial port error:', error);
      });

      this.parser.on('data', (data) => {
        this.handleIncomingData(data);
      });

      // Open the port
      await new Promise((resolve, reject) => {
        this.port.open((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to connect to ${portPath}: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.port && this.port.isOpen) {
      await new Promise((resolve) => {
        this.port.close((error) => {
          if (error) {
            console.error('Error closing serial port:', error);
          }
          resolve();
        });
      });
    }
    
    this.port = null;
    this.parser = null;
    this.currentPort = null;
    this.currentBaudRate = null;
  }

  async write(data) {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not connected');
    }

    return new Promise((resolve, reject) => {
      this.port.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          // Echo the sent data to the UI
          this.addToBuffer(`> ${data}`, 'sent');
          resolve();
        }
      });
    });
  }

  handleIncomingData(data) {
    const trimmedData = data.toString().trim();
    
    if (trimmedData.length === 0) {
      return;
    }

    // Add timestamp if enabled
    const timestamp = this.timestampsEnabled ? new Date().toLocaleTimeString() : null;
    
    // Add to main data buffer
    this.addToBuffer(trimmedData, 'received', timestamp);
    
    // Check if this looks like plottable data
    this.checkForPlotData(trimmedData, timestamp);
    
    // Emit the data to the renderer
    this.emit('data', {
      data: trimmedData,
      timestamp,
      type: 'received'
    });
  }

  addToBuffer(data, type, timestamp = null) {
    const entry = {
      data,
      type,
      timestamp: timestamp || new Date().toLocaleTimeString(),
      id: Date.now() + Math.random()
    };

    this.dataBuffer.push(entry);
    
    // Maintain buffer size
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift();
    }
  }

  checkForPlotData(data, timestamp) {
    // Try to parse numeric data for plotting
    const plotPatterns = [
      // Single number: "123.45"
      /^-?\d+\.?\d*$/,
      // Multiple numbers separated by comma/space: "1.23,4.56,7.89"
      /^-?\d+\.?\d*[\s,]+-?\d+\.?\d*([\s,]+-?\d+\.?\d*)*$/,
      // Named values: "temp:25.3 humidity:60.2"
      /^[a-zA-Z_][a-zA-Z0-9_]*:-?\d+\.?\d*([\s,]+[a-zA-Z_][a-zA-Z0-9_]*:-?\d+\.?\d*)*$/,
      // JSON-like: "{"temp":25.3,"humidity":60.2}"
      /^\{[^}]+\}$/
    ];

    for (const pattern of plotPatterns) {
      if (pattern.test(data)) {
        try {
          const plotData = this.parseForPlot(data, timestamp);
          if (plotData) {
            this.plotDataBuffer.push(plotData);
            
            // Maintain plot buffer size
            if (this.plotDataBuffer.length > this.maxBufferSize) {
              this.plotDataBuffer.shift();
            }
            
            this.emit('plotData', plotData);
          }
        } catch (error) {
          // Ignore parse errors for plot data
        }
        break;
      }
    }
  }

  parseForPlot(data, timestamp) {
    const plotData = {
      timestamp: timestamp || new Date().toISOString(),
      values: {}
    };

    try {
      // Try JSON first
      if (data.startsWith('{') && data.endsWith('}')) {
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'number') {
            plotData.values[key] = value;
          }
        }
      }
      // Named values: "temp:25.3 humidity:60.2"
      else if (data.includes(':')) {
        const pairs = data.split(/[\s,]+/);
        for (const pair of pairs) {
          const [name, value] = pair.split(':');
          if (name && value && !isNaN(parseFloat(value))) {
            plotData.values[name.trim()] = parseFloat(value);
          }
        }
      }
      // Multiple comma/space separated numbers
      else if (data.includes(',') || data.includes(' ')) {
        const numbers = data.split(/[\s,]+/).filter(s => s.trim());
        numbers.forEach((num, index) => {
          const value = parseFloat(num);
          if (!isNaN(value)) {
            plotData.values[`value${index + 1}`] = value;
          }
        });
      }
      // Single number
      else {
        const value = parseFloat(data);
        if (!isNaN(value)) {
          plotData.values.value = value;
        }
      }

      // Only return if we found at least one numeric value
      return Object.keys(plotData.values).length > 0 ? plotData : null;
    } catch (error) {
      return null;
    }
  }

  async getAvailablePorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (error) {
      console.error('Failed to list serial ports:', error);
      return [];
    }
  }

  isConnected() {
    return this.port && this.port.isOpen;
  }

  getCurrentPort() {
    return this.currentPort;
  }

  getCurrentBaudRate() {
    return this.currentBaudRate;
  }

  getDataBuffer() {
    return [...this.dataBuffer];
  }

  getPlotDataBuffer() {
    return [...this.plotDataBuffer];
  }

  clearBuffers() {
    this.dataBuffer = [];
    this.plotDataBuffer = [];
    this.emit('buffersCleared');
  }

  setAutoScroll(enabled) {
    this.autoScrollEnabled = enabled;
  }

  setTimestamps(enabled) {
    this.timestampsEnabled = enabled;
  }

  setMaxBufferSize(size) {
    this.maxBufferSize = Math.max(100, Math.min(10000, size));
    
    // Trim buffers if they're too large
    while (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift();
    }
    while (this.plotDataBuffer.length > this.maxBufferSize) {
      this.plotDataBuffer.shift();
    }
  }

  getStats() {
    return {
      connected: this.isConnected(),
      port: this.currentPort,
      baudRate: this.currentBaudRate,
      dataBufferSize: this.dataBuffer.length,
      plotDataBufferSize: this.plotDataBuffer.length,
      autoScroll: this.autoScrollEnabled,
      timestamps: this.timestampsEnabled
    };
  }

  cleanup() {
    if (this.isConnected()) {
      this.disconnect().catch(console.error);
    }
  }
}

module.exports = { ArduinoSerialService };
