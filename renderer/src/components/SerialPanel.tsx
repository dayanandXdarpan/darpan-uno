import React, { useState, useEffect, useRef } from 'react';
import './SerialPanel.css';

interface SerialData {
  timestamp: string;
  data: string;
  type: 'sent' | 'received';
}

interface PlotData {
  timestamp: string;
  values: { [key: string]: number };
}

interface SerialPanelProps {
  isConnected: boolean;
  selectedPort: string;
}

export const SerialPanel: React.FC<SerialPanelProps> = ({ isConnected, selectedPort }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'plotter'>('monitor');
  const [serialData, setSerialData] = useState<SerialData[]>([]);
  const [plotData, setPlotData] = useState<PlotData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lineEnding, setLineEnding] = useState<'none' | 'nl' | 'cr' | 'both'>('both');
  const [maxDataPoints, setMaxDataPoints] = useState(1000);
  
  const serialOutputRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Serial data listener
  useEffect(() => {
    if (window.electronAPI?.serial) {
      const handleSerialData = (data: string) => {
        const newEntry: SerialData = {
          timestamp: new Date().toLocaleTimeString(),
          data: data,
          type: 'received'
        };
        
        setSerialData(prev => {
          const updated = [...prev, newEntry];
          return updated.slice(-maxDataPoints); // Keep only last N entries
        });

        // Try to parse plot data
        tryParseForPlot(data);
      };

      window.electronAPI.serial.onData(handleSerialData);

      return () => {
        window.electronAPI.serial.removeDataListener();
      };
    }
  }, [maxDataPoints]);

  // Auto-scroll functionality
  useEffect(() => {
    if (autoScroll && serialOutputRef.current) {
      serialOutputRef.current.scrollTop = serialOutputRef.current.scrollHeight;
    }
  }, [serialData, autoScroll]);

  // Plot rendering
  useEffect(() => {
    if (activeTab === 'plotter' && canvasRef.current && plotData.length > 0) {
      drawPlot();
    }
  }, [plotData, activeTab]);

  const tryParseForPlot = (data: string) => {
    try {
      const trimmed = data.trim();
      const plotEntry: PlotData = {
        timestamp: new Date().toISOString(),
        values: {}
      };

      // Try different parsing strategies
      if (tryParseJSON(trimmed, plotEntry) ||
          tryParseCSV(trimmed, plotEntry) ||
          tryParseKeyValue(trimmed, plotEntry) ||
          tryParseSingleNumber(trimmed, plotEntry)) {
        
        setPlotData(prev => {
          const updated = [...prev, plotEntry];
          return updated.slice(-maxDataPoints);
        });
      }
    } catch (error) {
      // Ignore parse errors
    }
  };

  const tryParseJSON = (data: string, plotEntry: PlotData): boolean => {
    try {
      if (data.startsWith('{') && data.endsWith('}')) {
        const parsed = JSON.parse(data);
        let hasNumericValue = false;
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'number') {
            plotEntry.values[key] = value;
            hasNumericValue = true;
          }
        }
        return hasNumericValue;
      }
    } catch (error) {
      // Not valid JSON
    }
    return false;
  };

  const tryParseCSV = (data: string, plotEntry: PlotData): boolean => {
    if (data.includes(',') || data.includes(' ')) {
      const values = data.split(/[,\s]+/).filter(v => v.trim());
      let hasNumericValue = false;
      values.forEach((value, index) => {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          plotEntry.values[`value${index + 1}`] = num;
          hasNumericValue = true;
        }
      });
      return hasNumericValue;
    }
    return false;
  };

  const tryParseKeyValue = (data: string, plotEntry: PlotData): boolean => {
    if (data.includes(':')) {
      const pairs = data.split(/[,\s]+/);
      let hasNumericValue = false;
      for (const pair of pairs) {
        const [key, value] = pair.split(':');
        if (key && value) {
          const num = parseFloat(value.trim());
          if (!isNaN(num)) {
            plotEntry.values[key.trim()] = num;
            hasNumericValue = true;
          }
        }
      }
      return hasNumericValue;
    }
    return false;
  };

  const tryParseSingleNumber = (data: string, plotEntry: PlotData): boolean => {
    const num = parseFloat(data);
    if (!isNaN(num)) {
      plotEntry.values.value = num;
      return true;
    }
    return false;
  };

  const drawPlot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (plotData.length < 2) return;

    // Get all unique value keys
    const allKeys = new Set<string>();
    plotData.forEach(entry => {
      Object.keys(entry.values).forEach(key => allKeys.add(key));
    });

    const keys = Array.from(allKeys);
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffd93d',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];

    // Calculate bounds
    let minY = Infinity;
    let maxY = -Infinity;
    plotData.forEach(entry => {
      Object.values(entry.values).forEach(value => {
        minY = Math.min(minY, value);
        maxY = Math.max(maxY, value);
      });
    });

    const padding = 40;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Draw background grid
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      const y = padding + (i / 10) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw data lines
    keys.forEach((key, keyIndex) => {
      ctx.strokeStyle = colors[keyIndex % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();

      let first = true;
      plotData.forEach((entry, index) => {
        if (key in entry.values) {
          const x = padding + (index / (plotData.length - 1)) * plotWidth;
          const normalizedY = (entry.values[key] - minY) / (maxY - minY);
          const y = height - padding - normalizedY * plotHeight;

          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    });

    // Draw legend
    ctx.font = '12px Arial';
    keys.forEach((key, index) => {
      ctx.fillStyle = colors[index % colors.length];
      const legendY = 20 + index * 15;
      ctx.fillRect(width - 150, legendY, 10, 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(key, width - 135, legendY + 8);
    });

    // Draw scale labels
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Arial';
    ctx.fillText(maxY.toFixed(2), 5, padding + 5);
    ctx.fillText(minY.toFixed(2), 5, height - padding + 5);
  };

  // Resize canvas to match container
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          canvasRef.current.width = container.clientWidth;
          canvasRef.current.height = container.clientHeight;
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const handleSendData = async () => {
    if (!inputValue.trim() || !isConnected) return;

    try {
      let dataToSend = inputValue;
      
      // Add line ending
      switch (lineEnding) {
        case 'nl':
          dataToSend += '\n';
          break;
        case 'cr':
          dataToSend += '\r';
          break;
        case 'both':
          dataToSend += '\r\n';
          break;
      }

      await window.electronAPI.serial.send(dataToSend);
      
      // Add to display
      const sentEntry: SerialData = {
        timestamp: new Date().toLocaleTimeString(),
        data: inputValue,
        type: 'sent'
      };
      setSerialData(prev => [...prev, sentEntry]);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send data:', error);
    }
  };

  const clearData = () => {
    setSerialData([]);
    setPlotData([]);
  };

  const saveLog = () => {
    const logContent = serialData
      .map(entry => `[${entry.timestamp}] ${entry.type === 'sent' ? '>> ' : '<< '}${entry.data}`)
      .join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const commonBaudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

  return (
    <div className="serial-panel">
      <div className="serial-header">
        <div className="serial-tabs">
          <button 
            className={`tab ${activeTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            📺 Serial Monitor
          </button>
          <button 
            className={`tab ${activeTab === 'plotter' ? 'active' : ''}`}
            onClick={() => setActiveTab('plotter')}
          >
            📊 Serial Plotter
          </button>
        </div>
        
        <div className="serial-controls">
          <select 
            value={baudRate} 
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={isConnected}
          >
            {commonBaudRates.map(rate => (
              <option key={rate} value={rate}>{rate}</option>
            ))}
          </select>
          
          <button onClick={clearData}>Clear</button>
          <button onClick={saveLog}>Save Log</button>
        </div>
      </div>

      {activeTab === 'monitor' && (
        <div className="serial-monitor">
          <div 
            ref={serialOutputRef}
            className="serial-output"
          >
            {serialData.map((entry, index) => (
              <div key={index} className={`serial-line ${entry.type}`}>
                <span className="timestamp">[{entry.timestamp}]</span>
                <span className="data">{entry.data}</span>
              </div>
            ))}
          </div>
          
          <div className="serial-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendData()}
              disabled={!isConnected}
              placeholder="Enter text to send..."
            />
            
            <select 
              value={lineEnding} 
              onChange={(e) => setLineEnding(e.target.value as any)}
            >
              <option value="none">No ending</option>
              <option value="nl">Newline</option>
              <option value="cr">Carriage return</option>
              <option value="both">Both NL & CR</option>
            </select>
            
            <button onClick={handleSendData} disabled={!isConnected || !inputValue.trim()}>
              Send
            </button>
          </div>
          
          <div className="serial-options">
            <label>
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)} 
              />
              Auto-scroll
            </label>
            
            <label>
              Max lines:
              <input 
                type="number" 
                value={maxDataPoints} 
                onChange={(e) => setMaxDataPoints(Number(e.target.value))}
                min="100"
                max="10000"
                step="100"
              />
            </label>
          </div>
        </div>
      )}

      {activeTab === 'plotter' && (
        <div className="serial-plotter">
          <canvas 
            ref={canvasRef}
            className="plot-canvas"
          />
          {plotData.length === 0 && (
            <div className="plot-empty">
              <p>No plot data received yet.</p>
              <p>Send numeric data via serial to see plots:</p>
              <ul>
                <li>Single numbers: <code>123.45</code></li>
                <li>Multiple values: <code>1.23,4.56,7.89</code></li>
                <li>Named values: <code>temp:25.3 humidity:60.2</code></li>
                <li>JSON format: <code>{`{"temp":25.3,"humidity":60.2}`}</code></li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="serial-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢' : '🔴'}
        </span>
        <span className="status-text">
          {isConnected ? `Connected to ${selectedPort} at ${baudRate} baud` : 'Disconnected'}
        </span>
        {isConnected && (
          <span className="message-count">
            {serialData.length} message{serialData.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};
