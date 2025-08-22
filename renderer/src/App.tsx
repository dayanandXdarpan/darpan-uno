import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ElectronAPI } from './types/electron';
import './App.css';

// Declare global window type for electronAPI
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);

  useEffect(() => {
    // Check if we're in electron environment
    const checkElectron = () => {
      const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
      setIsElectronAvailable(isElectron);
      setIsLoading(false);
    };

    // Give some time for electron APIs to initialize
    setTimeout(checkElectron, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="arduino-logo">🤖</div>
          <h2>Arduino AI IDE</h2>
          <div className="loading-spinner"></div>
          <p>Initializing Arduino development environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Status indicator */}
      <div className="connection-status" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 999,
        background: isElectronAvailable ? '#2d4a2d' : '#4a2d2d',
        padding: '4px 8px',
        borderRadius: '12px',
        border: `1px solid ${isElectronAvailable ? '#4a7c59' : '#7c4a4a'}`,
        fontSize: '11px',
        color: '#cccccc',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
      }}>
        {isElectronAvailable ? '🔌 Desktop' : '🌐 Offline'}
      </div>

      <Layout />
    </div>
  );
};

export default App;
