import React, { useState, useEffect } from 'react';
import './BoardManager.css';

interface Board {
  id: string;
  name: string;
  fqbn: string;
  version: string;
  installed: boolean;
  description: string;
  architecture: string;
  maintainer: string;
  website?: string;
  size?: string;
}

interface BoardPackage {
  name: string;
  maintainer: string;
  website: string;
  email: string;
  boards: Board[];
}

const BoardManager: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'installed' | 'updatable'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBoards();
    }
  }, [isOpen]);

  const loadBoards = async () => {
    setLoading(true);
    try {
      // Load available boards from Arduino CLI
      const installedBoards = await window.electronAPI?.arduino?.getBoardList?.() || [];
      
      // Mock data for popular Arduino boards
      const popularBoards: Board[] = [
        {
          id: 'arduino:avr:uno',
          name: 'Arduino Uno',
          fqbn: 'arduino:avr:uno',
          version: '1.8.6',
          installed: true,
          description: 'Arduino Uno R3 based on ATmega328P',
          architecture: 'AVR',
          maintainer: 'Arduino',
          website: 'https://www.arduino.cc/',
          size: '5.2 MB'
        },
        {
          id: 'arduino:avr:nano',
          name: 'Arduino Nano',
          fqbn: 'arduino:avr:nano',
          version: '1.8.6',
          installed: true,
          description: 'Arduino Nano based on ATmega328P',
          architecture: 'AVR',
          maintainer: 'Arduino',
          size: '5.2 MB'
        },
        {
          id: 'arduino:avr:mega',
          name: 'Arduino Mega 2560',
          fqbn: 'arduino:avr:mega',
          version: '1.8.6',
          installed: false,
          description: 'Arduino Mega 2560 based on ATmega2560',
          architecture: 'AVR',
          maintainer: 'Arduino',
          size: '5.2 MB'
        },
        {
          id: 'esp32:esp32:esp32',
          name: 'ESP32 Dev Module',
          fqbn: 'esp32:esp32:esp32',
          version: '2.0.14',
          installed: false,
          description: 'ESP32 Development Module',
          architecture: 'ESP32',
          maintainer: 'Espressif Systems',
          website: 'https://github.com/espressif/arduino-esp32',
          size: '150 MB'
        },
        {
          id: 'arduino:samd:arduino_zero',
          name: 'Arduino Zero',
          fqbn: 'arduino:samd:arduino_zero',
          version: '1.8.13',
          installed: false,
          description: 'Arduino Zero (Programming/Debug Port)',
          architecture: 'SAMD',
          maintainer: 'Arduino',
          size: '18.5 MB'
        },
        {
          id: 'arduino:mbed_nano:nanoble',
          name: 'Arduino Nano 33 BLE',
          fqbn: 'arduino:mbed_nano:nanoble',
          version: '4.0.10',
          installed: false,
          description: 'Arduino Nano 33 BLE',
          architecture: 'mbed',
          maintainer: 'Arduino',
          size: '142 MB'
        }
      ];

      setBoards(popularBoards);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const installBoard = async (board: Board) => {
    setLoading(true);
    try {
      console.log(`Installing board: ${board.name}`);
      // Simulate installation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBoards(prev => prev.map(b => 
        b.id === board.id ? { ...b, installed: true } : b
      ));
      
      console.log(`✅ Successfully installed ${board.name}`);
    } catch (error) {
      console.error('Failed to install board:', error);
    } finally {
      setLoading(false);
    }
  };

  const uninstallBoard = async (board: Board) => {
    setLoading(true);
    try {
      console.log(`Uninstalling board: ${board.name}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBoards(prev => prev.map(b => 
        b.id === board.id ? { ...b, installed: false } : b
      ));
      
      console.log(`✅ Successfully uninstalled ${board.name}`);
    } catch (error) {
      console.error('Failed to uninstall board:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBoards = boards.filter(board => {
    const matchesSearch = board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         board.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filter) {
      case 'installed':
        return matchesSearch && board.installed;
      case 'updatable':
        return matchesSearch && board.installed; // Simplified - in real implementation check for updates
      default:
        return matchesSearch;
    }
  });

  if (!isOpen) return null;

  return (
    <div className="board-manager-overlay">
      <div className="board-manager">
        <div className="board-manager-header">
          <h2>🔧 Board Manager</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="board-manager-controls">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search boards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <label>Filter:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Boards</option>
              <option value="installed">Installed</option>
              <option value="updatable">Updatable</option>
            </select>
          </div>

          <button 
            onClick={loadBoards} 
            className="refresh-btn"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        <div className="board-manager-content">
          <div className="boards-list">
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading boards...</span>
              </div>
            )}

            {!loading && filteredBoards.length === 0 && (
              <div className="no-results">
                <p>No boards found matching your criteria.</p>
              </div>
            )}

            {!loading && filteredBoards.map(board => (
              <div 
                key={board.id} 
                className={`board-item ${selectedBoard?.id === board.id ? 'selected' : ''}`}
                onClick={() => setSelectedBoard(board)}
              >
                <div className="board-info">
                  <div className="board-header">
                    <h3>{board.name}</h3>
                    <span className={`status ${board.installed ? 'installed' : 'not-installed'}`}>
                      {board.installed ? '✅ Installed' : '📦 Available'}
                    </span>
                  </div>
                  
                  <p className="board-description">{board.description}</p>
                  
                  <div className="board-details">
                    <span className="architecture">Architecture: {board.architecture}</span>
                    <span className="version">Version: {board.version}</span>
                    <span className="maintainer">By: {board.maintainer}</span>
                    {board.size && <span className="size">Size: {board.size}</span>}
                  </div>
                </div>

                <div className="board-actions">
                  {board.installed ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        uninstallBoard(board);
                      }}
                      className="uninstall-btn"
                      disabled={loading}
                    >
                      🗑️ Remove
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        installBoard(board);
                      }}
                      className="install-btn"
                      disabled={loading}
                    >
                      📥 Install
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedBoard && (
            <div className="board-details-panel">
              <h3>📋 Board Details</h3>
              <div className="detail-item">
                <strong>Name:</strong> {selectedBoard.name}
              </div>
              <div className="detail-item">
                <strong>FQBN:</strong> {selectedBoard.fqbn}
              </div>
              <div className="detail-item">
                <strong>Architecture:</strong> {selectedBoard.architecture}
              </div>
              <div className="detail-item">
                <strong>Version:</strong> {selectedBoard.version}
              </div>
              <div className="detail-item">
                <strong>Maintainer:</strong> {selectedBoard.maintainer}
              </div>
              {selectedBoard.website && (
                <div className="detail-item">
                  <strong>Website:</strong> 
                  <a href={selectedBoard.website} target="_blank" rel="noopener noreferrer">
                    {selectedBoard.website}
                  </a>
                </div>
              )}
              <div className="detail-item">
                <strong>Description:</strong>
                <p>{selectedBoard.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="board-manager-footer">
          <div className="status-info">
            <span>📊 Total: {boards.length} boards</span>
            <span>✅ Installed: {boards.filter(b => b.installed).length}</span>
            <span>📦 Available: {boards.filter(b => !b.installed).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardManager;
