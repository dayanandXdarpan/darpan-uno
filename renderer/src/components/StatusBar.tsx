import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  isConnected: boolean;
  selectedBoard: string;
  selectedPort: string;
  currentFile: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  selectedBoard,
  selectedPort,
  currentFile
}) => {
  const getBoardDisplayName = (fqbn: string) => {
    if (!fqbn) return 'No board selected';
    
    // Parse FQBN to get a friendly name
    const parts = fqbn.split(':');
    if (parts.length >= 3) {
      const [vendor, architecture, board] = parts;
      return `${vendor.toUpperCase()} ${board.replace(/([A-Z])/g, ' $1').trim()}`;
    }
    
    return fqbn;
  };

  const getFileDisplayName = (filePath: string) => {
    if (!filePath) return 'No file selected';
    return filePath.split(/[\\/]/).pop() || filePath;
  };

  const getConnectionStatus = () => {
    if (!selectedPort) return 'No port selected';
    if (isConnected) return `Connected to ${selectedPort}`;
    return `Ready to connect to ${selectedPort}`;
  };

  return (
    <div className="status-bar">
      <div className="status-section file-info">
        <span className="status-icon">📄</span>
        <span className="status-text" title={currentFile}>
          {getFileDisplayName(currentFile)}
        </span>
      </div>

      <div className="status-section board-info">
        <span className="status-icon">🔧</span>
        <span className="status-text" title={selectedBoard}>
          {getBoardDisplayName(selectedBoard)}
        </span>
      </div>

      <div className="status-section connection-info">
        <span className={`status-icon ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢' : '🔴'}
        </span>
        <span className="status-text">
          {getConnectionStatus()}
        </span>
      </div>

      <div className="status-section app-info">
        <span className="status-text">Darpan Uno v2.0.0</span>
      </div>
    </div>
  );
};
