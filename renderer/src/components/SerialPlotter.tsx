import React, { useState, useEffect } from 'react';
import './SerialPlotter.css';

interface PlotData {
  timestamp: number;
  values: number[];
  labels: string[];
}

interface PlotSeries {
  label: string;
  color: string;
  visible: boolean;
  data: Array<{ x: number; y: number }>;
}

const SerialPlotter: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPort, setSelectedPort] = useState('COM3');
  const [baudRate, setBaudRate] = useState(9600);
  const [availablePorts, setAvailablePorts] = useState(['COM3', 'COM4', 'COM5']);
  const [isRunning, setIsRunning] = useState(false);
  const [plotData, setPlotData] = useState<PlotSeries[]>([]);
  const [maxDataPoints, setMaxDataPoints] = useState(100);
  const [autoScale, setAutoScale] = useState(true);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(1023);
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [dataRate, setDataRate] = useState(0);
  const [lastDataTime, setLastDataTime] = useState(0);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
  ];

  useEffect(() => {
    if (isOpen) {
      loadAvailablePorts();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && isConnected) {
      interval = setInterval(() => {
        generateMockData();
      }, 100); // 10 Hz update rate
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isConnected]);

  const loadAvailablePorts = async () => {
    try {
      const ports = await window.electronAPI?.serial?.getAvailablePorts?.() || [];
      const portNames = ports.map(port => port.path);
      setAvailablePorts(portNames.length > 0 ? portNames : ['COM3', 'COM4', 'COM5']);
    } catch (error) {
      console.error('Failed to load ports:', error);
    }
  };

  const connectToPort = async () => {
    try {
      if (isConnected) {
        await window.electronAPI?.serial?.disconnect?.();
        setIsConnected(false);
        setIsRunning(false);
        console.log('Disconnected from serial port');
      } else {
        await window.electronAPI?.serial?.connect?.(selectedPort, baudRate);
        setIsConnected(true);
        console.log(`Connected to ${selectedPort} at ${baudRate} baud`);
        
        // Set up data listener
        window.electronAPI?.serial?.onData?.((data: any) => {
          const dataString = typeof data === 'string' ? data : data.data || data.toString();
          parseSerialData(dataString);
        });
      }
    } catch (error) {
      console.error('Failed to connect/disconnect:', error);
      setIsConnected(false);
    }
  };

  const parseSerialData = (data: string) => {
    try {
      const lines = data.split('\n');
      lines.forEach(line => {
        line = line.trim();
        if (line) {
          // Try to parse comma-separated values
          const values = line.split(',').map(val => {
            const num = parseFloat(val.trim());
            return isNaN(num) ? 0 : num;
          });
          
          if (values.length > 0 && values.some(v => !isNaN(v))) {
            addDataPoint(values);
          }
        }
      });
    } catch (error) {
      console.error('Failed to parse serial data:', error);
    }
  };

  const generateMockData = () => {
    const time = Date.now();
    const t = time / 1000;
    
    // Generate mock sensor data
    const values = [
      Math.sin(t * 0.5) * 200 + 512,           // Sine wave
      Math.cos(t * 0.3) * 150 + 400,           // Cosine wave
      Math.random() * 100 + 300,               // Random noise
      Math.abs(Math.sin(t * 0.8)) * 300 + 100  // Absolute sine
    ];
    
    addDataPoint(values);
  };

  const addDataPoint = (values: number[]) => {
    const timestamp = Date.now();
    setLastDataTime(timestamp);
    
    // Calculate data rate
    setDataRate(prev => {
      const timeDiff = timestamp - prev;
      return timeDiff > 0 ? 1000 / timeDiff : 0;
    });

    setPlotData(prevSeries => {
      const newSeries = [...prevSeries];
      
      // Ensure we have enough series for all values
      while (newSeries.length < values.length) {
        const index = newSeries.length;
        newSeries.push({
          label: `Signal ${index + 1}`,
          color: colors[index % colors.length],
          visible: true,
          data: []
        });
      }
      
      // Add new data points to each series
      values.forEach((value, index) => {
        if (newSeries[index]) {
          newSeries[index].data.push({
            x: timestamp,
            y: value
          });
          
          // Limit data points
          if (newSeries[index].data.length > maxDataPoints) {
            newSeries[index].data = newSeries[index].data.slice(-maxDataPoints);
          }
        }
      });
      
      return newSeries;
    });
  };

  const clearData = () => {
    setPlotData(prev => prev.map(series => ({
      ...series,
      data: []
    })));
  };

  const toggleSeries = (index: number) => {
    setPlotData(prev => prev.map((series, i) => 
      i === index ? { ...series, visible: !series.visible } : series
    ));
  };

  const exportData = () => {
    const csv = plotData.map(series => {
      const header = `Time,${series.label}`;
      const rows = series.data.map(point => `${point.x},${point.y}`).join('\n');
      return `${header}\n${rows}`;
    }).join('\n\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_plot_data_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPlot = () => {
    if (plotData.length === 0 || plotData.every(s => s.data.length === 0)) {
      return (
        <div className="empty-plot">
          <p>📊 No data to display</p>
          <p>Connect to a serial port and start receiving data to see the plot.</p>
        </div>
      );
    }

    const visibleSeries = plotData.filter(s => s.visible && s.data.length > 0);
    if (visibleSeries.length === 0) {
      return (
        <div className="empty-plot">
          <p>📊 All series are hidden</p>
          <p>Enable at least one series in the legend to see the plot.</p>
        </div>
      );
    }

    // Calculate plot bounds
    let minTime = Infinity, maxTime = -Infinity;
    let minValue = autoScale ? Infinity : yMin;
    let maxValue = autoScale ? -Infinity : yMax;

    visibleSeries.forEach(series => {
      series.data.forEach(point => {
        minTime = Math.min(minTime, point.x);
        maxTime = Math.max(maxTime, point.x);
        if (autoScale) {
          minValue = Math.min(minValue, point.y);
          maxValue = Math.max(maxValue, point.y);
        }
      });
    });

    if (autoScale) {
      const range = maxValue - minValue;
      const padding = range * 0.1;
      minValue -= padding;
      maxValue += padding;
    }

    const plotWidth = 800;
    const plotHeight = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = plotWidth - margin.left - margin.right;
    const chartHeight = plotHeight - margin.top - margin.bottom;

    const timeRange = maxTime - minTime || 1;
    const valueRange = maxValue - minValue || 1;

    return (
      <svg className="plot-svg" width={plotWidth} height={plotHeight}>
        <defs>
          <clipPath id="plot-area">
            <rect 
              x={margin.left} 
              y={margin.top} 
              width={chartWidth} 
              height={chartHeight} 
            />
          </clipPath>
        </defs>
        
        {/* Grid */}
        {showGrid && (
          <g className="grid">
            {/* Vertical grid lines */}
            {Array.from({ length: 11 }, (_, i) => {
              const x = margin.left + (chartWidth * i / 10);
              return (
                <line
                  key={`vgrid-${i}`}
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + chartHeight}
                  stroke="#444"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            })}
            
            {/* Horizontal grid lines */}
            {Array.from({ length: 11 }, (_, i) => {
              const y = margin.top + (chartHeight * i / 10);
              return (
                <line
                  key={`hgrid-${i}`}
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + chartWidth}
                  y2={y}
                  stroke="#444"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            })}
          </g>
        )}
        
        {/* Axes */}
        <g className="axes">
          {/* X-axis */}
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke="#666"
            strokeWidth="2"
          />
          
          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="#666"
            strokeWidth="2"
          />
          
          {/* Y-axis labels */}
          {Array.from({ length: 6 }, (_, i) => {
            const value = minValue + (maxValue - minValue) * (1 - i / 5);
            const y = margin.top + (chartHeight * i / 5);
            return (
              <text
                key={`ylabel-${i}`}
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#ccc"
                fontSize="12"
              >
                {value.toFixed(1)}
              </text>
            );
          })}
          
          {/* X-axis label */}
          <text
            x={margin.left + chartWidth / 2}
            y={plotHeight - 5}
            textAnchor="middle"
            fill="#ccc"
            fontSize="12"
          >
            Time
          </text>
          
          {/* Y-axis label */}
          <text
            x={15}
            y={margin.top + chartHeight / 2}
            textAnchor="middle"
            fill="#ccc"
            fontSize="12"
            transform={`rotate(-90, 15, ${margin.top + chartHeight / 2})`}
          >
            Value
          </text>
        </g>
        
        {/* Plot lines */}
        <g clipPath="url(#plot-area)">
          {visibleSeries.map((series, seriesIndex) => {
            if (series.data.length < 2) return null;
            
            const pathData = series.data.map((point, i) => {
              const x = margin.left + ((point.x - minTime) / timeRange) * chartWidth;
              const y = margin.top + chartHeight - ((point.y - minValue) / valueRange) * chartHeight;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');
            
            return (
              <path
                key={`series-${seriesIndex}`}
                d={pathData}
                stroke={series.color}
                strokeWidth="2"
                fill="none"
                opacity="0.8"
              />
            );
          })}
        </g>
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="serial-plotter-overlay">
      <div className="serial-plotter">
        <div className="plotter-header">
          <h2>📈 Serial Plotter</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="plotter-controls">
          <div className="connection-controls">
            <div className="port-section">
              <label>Port:</label>
              <select 
                value={selectedPort} 
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={isConnected}
                className="port-select"
              >
                {availablePorts.map(port => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </select>
            </div>

            <div className="baud-section">
              <label>Baud:</label>
              <select 
                value={baudRate} 
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={isConnected}
                className="baud-select"
              >
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
                <option value={57600}>57600</option>
                <option value={115200}>115200</option>
              </select>
            </div>

            <button 
              onClick={connectToPort}
              className={`connect-btn ${isConnected ? 'connected' : ''}`}
            >
              {isConnected ? '🔴 Disconnect' : '🔗 Connect'}
            </button>

            <button 
              onClick={() => setIsRunning(!isRunning)}
              disabled={!isConnected}
              className={`run-btn ${isRunning ? 'running' : ''}`}
            >
              {isRunning ? '⏸️ Pause' : '▶️ Start'}
            </button>
          </div>

          <div className="plot-controls">
            <div className="control-group">
              <label>Max Points:</label>
              <input
                type="number"
                value={maxDataPoints}
                onChange={(e) => setMaxDataPoints(Number(e.target.value))}
                min="10"
                max="1000"
                className="number-input"
              />
            </div>

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={autoScale}
                  onChange={(e) => setAutoScale(e.target.checked)}
                />
                Auto Scale
              </label>
            </div>

            {!autoScale && (
              <>
                <div className="control-group">
                  <label>Y Min:</label>
                  <input
                    type="number"
                    value={yMin}
                    onChange={(e) => setYMin(Number(e.target.value))}
                    className="number-input"
                  />
                </div>
                <div className="control-group">
                  <label>Y Max:</label>
                  <input
                    type="number"
                    value={yMax}
                    onChange={(e) => setYMax(Number(e.target.value))}
                    className="number-input"
                  />
                </div>
              </>
            )}

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Grid
              </label>
            </div>

            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                />
                Legend
              </label>
            </div>

            <button onClick={clearData} className="clear-btn">
              🗑️ Clear
            </button>

            <button onClick={exportData} className="export-btn">
              💾 Export
            </button>
          </div>
        </div>

        <div className="plotter-content">
          <div className="plot-area">
            {renderPlot()}
          </div>

          {showLegend && plotData.length > 0 && (
            <div className="legend">
              <h4>📊 Series</h4>
              {plotData.map((series, index) => (
                <div key={index} className="legend-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={series.visible}
                      onChange={() => toggleSeries(index)}
                    />
                    <span 
                      className="color-indicator"
                      style={{ backgroundColor: series.color }}
                    />
                    {series.label} ({series.data.length} pts)
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="plotter-status">
          <div className="status-item">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? `Connected to ${selectedPort}` : 'Disconnected'}
          </div>
          
          {isConnected && (
            <>
              <div className="status-item">
                📊 Data Rate: {dataRate.toFixed(1)} Hz
              </div>
              
              <div className="status-item">
                📈 Series: {plotData.filter(s => s.visible).length}/{plotData.length}
              </div>
              
              <div className="status-item">
                🕒 Last: {lastDataTime ? new Date(lastDataTime).toLocaleTimeString() : 'Never'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SerialPlotter;
