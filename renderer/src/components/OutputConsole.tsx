import React, { useState, useEffect, useRef } from 'react';
import './OutputConsole.css';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  source: string;
  message: string;
  details?: string;
}

interface OutputConsoleProps {
  isVisible: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

const OutputConsole: React.FC<OutputConsoleProps> = ({
  isVisible,
  onToggle,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [maxLogs, setMaxLogs] = useState(1000);
  const consoleRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Initialize output console
  useEffect(() => {
    // Listen for log events from the main process
    const handleLogEvent = (event: any) => {
      addLog(event.level, event.source, event.message, event.details);
    };

    window.electronAPI?.onLogEvent?.(handleLogEvent);

    // Load existing logs
    loadExistingLogs();

    return () => {
      window.electronAPI?.removeLogListener?.(handleLogEvent);
    };
  }, []);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && isVisible) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isVisible]);

  const loadExistingLogs = async () => {
    try {
      const existingLogs = await window.electronAPI?.getOutputLogs?.() || [];
      setLogs(existingLogs);
    } catch (error) {
      console.error('Failed to load existing logs:', error);
      // Add some mock logs for development
      addMockLogs();
    }
  };

  const addMockLogs = () => {
    const mockLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date(),
        level: 'info',
        source: 'Arduino CLI',
        message: 'Arduino CLI version 0.35.3 initialized'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 5000),
        level: 'success',
        source: 'Compiler',
        message: 'Sketch compiled successfully',
        details: 'Binary size: 924 bytes (2% of program storage space)'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 10000),
        level: 'warning',
        source: 'Uploader',
        message: 'Board not found on port COM3, trying COM4...'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 15000),
        level: 'error',
        source: 'Library Manager',
        message: 'Failed to install library "WiFi101"',
        details: 'Network error: Connection timeout'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 20000),
        level: 'debug',
        source: 'Serial Monitor',
        message: 'Port COM4 opened successfully (9600 baud)'
      }
    ];

    setLogs(mockLogs);
  };

  const addLog = (level: LogEntry['level'], source: string, message: string, details?: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      source,
      message,
      details
    };

    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      // Limit the number of logs to prevent memory issues
      if (updatedLogs.length > maxLogs) {
        return updatedLogs.slice(-maxLogs);
      }
      return updatedLogs;
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = async () => {
    try {
      await window.electronAPI?.exportOutputLogs?.(filteredLogs);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const copyAllLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.details ? '\n  ' + log.details : ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText);
  };

  const copyLog = (log: LogEntry) => {
    const logText = `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.details ? '\n  ' + log.details : ''}`;
    navigator.clipboard.writeText(logText);
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getLevelIcon = (level: LogEntry['level']): string => {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'debug': return '🐛';
      default: return '📝';
    }
  };

  const getLevelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'info': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'success': return '#10b981';
      case 'debug': return '#6b7280';
      default: return '#d4d4d4';
    }
  };

  // Filter logs based on level, source, and search term
  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSource = filterSource === 'all' || log.source === filterSource;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLevel && matchesSource && matchesSearch;
  });

  // Get unique sources for filter dropdown
  const uniqueSources = Array.from(new Set(logs.map(log => log.source)));

  // Get log level counts
  const levelCounts = logs.reduce((counts, log) => {
    counts[log.level] = (counts[log.level] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  if (!isVisible) return null;

  return (
    <div className="output-console">
      <div className="console-header">
        <div className="header-title">
          <h3>Output Console</h3>
          <div className="log-stats">
            <span className="stat">Total: {logs.length}</span>
            {Object.entries(levelCounts).map(([level, count]) => (
              <span
                key={level}
                className="stat"
                style={{ color: getLevelColor(level as LogEntry['level']) }}
              >
                {getLevelIcon(level as LogEntry['level'])} {count}
              </span>
            ))}
          </div>
        </div>

        <div className="header-actions">
          <button onClick={onToggle} className="toggle-btn" title="Minimize/Maximize">
            {isVisible ? '▼' : '▲'}
          </button>
          {onClose && (
            <button onClick={onClose} className="close-btn" title="Close">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="console-toolbar">
        <div className="filter-controls">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="success">Success</option>
            <option value="debug">Debug</option>
          </select>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="console-options">
          <label className="option-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            Auto-scroll
          </label>

          <label className="option-label">
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(e) => setWordWrap(e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            Word wrap
          </label>
        </div>

        <div className="action-buttons">
          <button onClick={copyAllLogs} className="action-btn" title="Copy all visible logs">
            📋 Copy
          </button>
          <button onClick={exportLogs} className="action-btn" title="Export logs to file">
            💾 Export
          </button>
          <button onClick={clearLogs} className="action-btn danger" title="Clear all logs">
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="console-content" ref={consoleRef}>
        <div className={`logs-container ${wordWrap ? 'word-wrap' : ''}`}>
          {filteredLogs.length === 0 ? (
            <div className="no-logs">
              {searchTerm || filterLevel !== 'all' || filterSource !== 'all' 
                ? 'No logs match the current filters' 
                : 'No logs to display'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`log-entry ${log.level}`}
                onClick={() => copyLog(log)}
                title="Click to copy this log entry"
              >
                <div className="log-header">
                  <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                  <span 
                    className="log-level"
                    style={{ color: getLevelColor(log.level) }}
                  >
                    {getLevelIcon(log.level)} {log.level.toUpperCase()}
                  </span>
                  <span className="log-source">[{log.source}]</span>
                </div>
                <div className="log-message">{log.message}</div>
                {log.details && (
                  <div className="log-details">{log.details}</div>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="console-footer">
        <div className="footer-info">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
        
        <div className="footer-settings">
          <label className="setting-label">
            Max logs:
            <input
              type="number"
              value={maxLogs}
              onChange={(e) => setMaxLogs(Math.max(100, parseInt(e.target.value) || 1000))}
              className="number-input"
              min="100"
              max="10000"
              step="100"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default OutputConsole;
