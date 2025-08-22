import React, { useState, useEffect, useMemo } from 'react';
import './SketchBookManager.css';

interface SketchItem {
  id: string;
  name: string;
  path: string;
  lastModified: Date;
  size: number;
  isFolder: boolean;
  files: string[];
  description?: string;
  tags: string[];
  favorite: boolean;
  parentPath?: string;
}

interface SketchBookManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSketch: (sketchPath: string) => void;
}

const SketchBookManager: React.FC<SketchBookManagerProps> = ({
  isOpen,
  onClose,
  onOpenSketch
}) => {
  const [sketches, setSketches] = useState<SketchItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(false);
  const [selectedSketch, setSelectedSketch] = useState<SketchItem | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Initialize sketchbook
  useEffect(() => {
    if (isOpen) {
      loadSketchbook();
    }
  }, [isOpen, currentPath]);

  const loadSketchbook = async () => {
    setLoading(true);
    try {
      // Get sketchbook from Electron main process
      const sketchbookData = await window.electronAPI?.getSketchbook?.(currentPath) || [];
      setSketches(sketchbookData);
    } catch (error) {
      console.error('Failed to load sketchbook:', error);
      // Fallback to mock data for development
      loadMockSketchbook();
    } finally {
      setLoading(false);
    }
  };

  const loadMockSketchbook = () => {
    const mockSketches: SketchItem[] = [
      {
        id: '1',
        name: 'LED_Blink_Custom',
        path: '/sketchbook/LED_Blink_Custom',
        lastModified: new Date('2024-01-15'),
        size: 2048,
        isFolder: false,
        files: ['LED_Blink_Custom.ino'],
        description: 'Custom LED blinking pattern with variable timing',
        tags: ['LED', 'Basic', 'Custom'],
        favorite: true,
        parentPath: '/sketchbook'
      },
      {
        id: '2',
        name: 'Temperature_Monitor',
        path: '/sketchbook/Temperature_Monitor',
        lastModified: new Date('2024-01-14'),
        size: 5120,
        isFolder: false,
        files: ['Temperature_Monitor.ino', 'config.h'],
        description: 'Temperature monitoring system with LCD display',
        tags: ['Sensor', 'LCD', 'Monitoring'],
        favorite: false,
        parentPath: '/sketchbook'
      },
      {
        id: '3',
        name: 'Robot_Control',
        path: '/sketchbook/Projects/Robot_Control',
        lastModified: new Date('2024-01-10'),
        size: 15360,
        isFolder: true,
        files: ['Robot_Control.ino', 'motors.cpp', 'sensors.cpp', 'README.md'],
        description: 'Complete robot control system with remote interface',
        tags: ['Robot', 'Control', 'Motors', 'Advanced'],
        favorite: true,
        parentPath: '/sketchbook/Projects'
      },
      {
        id: '4',
        name: 'WiFi_WebServer',
        path: '/sketchbook/Projects/WiFi_WebServer',
        lastModified: new Date('2024-01-08'),
        size: 8192,
        isFolder: false,
        files: ['WiFi_WebServer.ino', 'web_pages.h'],
        description: 'ESP32 web server for home automation',
        tags: ['WiFi', 'Web', 'ESP32', 'IoT'],
        favorite: false,
        parentPath: '/sketchbook/Projects'
      },
      {
        id: '5',
        name: 'Projects',
        path: '/sketchbook/Projects',
        lastModified: new Date('2024-01-15'),
        size: 0,
        isFolder: true,
        files: [],
        tags: [],
        favorite: false,
        parentPath: '/sketchbook'
      }
    ];

    setSketches(mockSketches);
  };

  // Filter and sort sketches
  const filteredAndSortedSketches = useMemo(() => {
    let filtered = sketches.filter(sketch => {
      const matchesSearch = searchTerm === '' || 
        sketch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sketch.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sketch.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFavorites = !showFavoritesOnly || sketch.favorite;
      
      return matchesSearch && matchesFavorites;
    });

    // Sort sketches
    filtered.sort((a, b) => {
      // Folders first
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }

      let compareValue = 0;
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'date':
          compareValue = a.lastModified.getTime() - b.lastModified.getTime();
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [sketches, searchTerm, sortBy, sortOrder, showFavoritesOnly]);

  const handleSketchSelect = (sketch: SketchItem) => {
    setSelectedSketch(sketch);
  };

  const handleSketchOpen = (sketch: SketchItem) => {
    if (sketch.isFolder) {
      setCurrentPath(sketch.path);
      setSelectedSketch(null);
    } else {
      onOpenSketch(sketch.path);
      onClose();
    }
  };

  const handleNavigateUp = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      setCurrentPath(parentPath);
      setSelectedSketch(null);
    }
  };

  const handleNewSketch = async () => {
    try {
      const sketchName = prompt('Enter sketch name:');
      if (sketchName) {
        await window.electronAPI?.createNewSketch?.(currentPath, sketchName);
        loadSketchbook();
      }
    } catch (error) {
      console.error('Failed to create new sketch:', error);
    }
  };

  const handleDeleteSketch = async () => {
    if (selectedSketch && confirm(`Delete ${selectedSketch.name}?`)) {
      try {
        await window.electronAPI?.deleteSketch?.(selectedSketch.path);
        loadSketchbook();
        setSelectedSketch(null);
      } catch (error) {
        console.error('Failed to delete sketch:', error);
      }
    }
  };

  const handleRenameSketch = async () => {
    if (selectedSketch) {
      const newName = prompt('Enter new name:', selectedSketch.name);
      if (newName && newName !== selectedSketch.name) {
        try {
          await window.electronAPI?.renameSketch?.(selectedSketch.path, newName);
          loadSketchbook();
          setSelectedSketch(null);
        } catch (error) {
          console.error('Failed to rename sketch:', error);
        }
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (selectedSketch) {
      try {
        await window.electronAPI?.toggleSketchFavorite?.(selectedSketch.path);
        loadSketchbook();
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    }
  };

  const handleRevealInExplorer = async () => {
    if (selectedSketch) {
      try {
        await window.electronAPI?.revealSketchInExplorer?.(selectedSketch.path);
      } catch (error) {
        console.error('Failed to reveal in explorer:', error);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBreadcrumbs = (): string[] => {
    if (!currentPath) return ['Sketchbook'];
    return ['Sketchbook', ...currentPath.split('/').filter(p => p)];
  };

  if (!isOpen) return null;

  return (
    <div className="sketchbook-overlay">
      <div className="sketchbook-manager">
        <div className="sketchbook-header">
          <h2>Sketch Book Manager</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="sketchbook-toolbar">
          <div className="breadcrumbs">
            {getBreadcrumbs().map((crumb, index) => (
              <span key={index} className="breadcrumb">
                {index > 0 && <span className="separator">›</span>}
                <span className="crumb-text">{crumb}</span>
              </span>
            ))}
          </div>

          <div className="toolbar-actions">
            {currentPath && (
              <button onClick={handleNavigateUp} className="nav-btn">
                ↑ Up
              </button>
            )}
            <button onClick={handleNewSketch} className="new-btn">
              + New Sketch
            </button>
          </div>
        </div>

        <div className="sketchbook-controls">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search sketches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <label className="favorites-filter">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              Favorites only
            </label>
          </div>

          <div className="view-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="size">Sort by Size</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            <div className="view-mode-buttons">
              <button
                onClick={() => setViewMode('list')}
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                title="List View"
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                title="Grid View"
              >
                ⊞
              </button>
            </div>
          </div>
        </div>

        <div className="sketchbook-content">
          <div className="sketches-list">
            {loading ? (
              <div className="loading-message">Loading sketchbook...</div>
            ) : filteredAndSortedSketches.length === 0 ? (
              <div className="no-results">
                {searchTerm ? 'No sketches match your search' : 'No sketches found'}
              </div>
            ) : (
              <div className={`sketches-container ${viewMode}`}>
                {filteredAndSortedSketches.map((sketch) => (
                  <div
                    key={sketch.id}
                    onClick={() => handleSketchSelect(sketch)}
                    onDoubleClick={() => handleSketchOpen(sketch)}
                    className={`sketch-item ${selectedSketch?.id === sketch.id ? 'selected' : ''} ${viewMode}`}
                  >
                    <div className="sketch-icon">
                      {sketch.isFolder ? '📁' : '📄'}
                      {sketch.favorite && <span className="favorite-star">⭐</span>}
                    </div>
                    
                    <div className="sketch-info">
                      <h4 className="sketch-name">{sketch.name}</h4>
                      {sketch.description && (
                        <p className="sketch-description">{sketch.description}</p>
                      )}
                      
                      <div className="sketch-meta">
                        <span className="sketch-date">{formatDate(sketch.lastModified)}</span>
                        {!sketch.isFolder && (
                          <span className="sketch-size">{formatFileSize(sketch.size)}</span>
                        )}
                        <span className="sketch-files">{sketch.files.length} files</span>
                      </div>
                      
                      {sketch.tags.length > 0 && (
                        <div className="sketch-tags">
                          {sketch.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedSketch && (
            <div className="sketch-details">
              <div className="details-header">
                <div className="sketch-title">
                  <span className="sketch-icon-large">
                    {selectedSketch.isFolder ? '📁' : '📄'}
                  </span>
                  <div>
                    <h3>{selectedSketch.name}</h3>
                    <p className="sketch-path">{selectedSketch.path}</p>
                  </div>
                  <button
                    onClick={handleToggleFavorite}
                    className={`favorite-btn ${selectedSketch.favorite ? 'active' : ''}`}
                    title={selectedSketch.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ⭐
                  </button>
                </div>
              </div>

              <div className="details-content">
                {selectedSketch.description && (
                  <div className="detail-section">
                    <h4>Description</h4>
                    <p>{selectedSketch.description}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h4>Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Type:</strong> {selectedSketch.isFolder ? 'Folder' : 'Sketch'}
                    </div>
                    <div className="info-item">
                      <strong>Last Modified:</strong> {formatDate(selectedSketch.lastModified)}
                    </div>
                    {!selectedSketch.isFolder && (
                      <div className="info-item">
                        <strong>Size:</strong> {formatFileSize(selectedSketch.size)}
                      </div>
                    )}
                    <div className="info-item">
                      <strong>Files:</strong> {selectedSketch.files.length}
                    </div>
                  </div>
                </div>

                {selectedSketch.files.length > 0 && (
                  <div className="detail-section">
                    <h4>Files</h4>
                    <div className="files-list">
                      {selectedSketch.files.map((file, index) => (
                        <div key={index} className="file-item">{file}</div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSketch.tags.length > 0 && (
                  <div className="detail-section">
                    <h4>Tags</h4>
                    <div className="tags-list">
                      {selectedSketch.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="details-actions">
                <button
                  onClick={() => handleSketchOpen(selectedSketch)}
                  className="open-btn primary"
                >
                  {selectedSketch.isFolder ? 'Open Folder' : 'Open Sketch'}
                </button>
                <button
                  onClick={handleRenameSketch}
                  className="rename-btn secondary"
                >
                  Rename
                </button>
                <button
                  onClick={handleRevealInExplorer}
                  className="reveal-btn secondary"
                >
                  Show in Explorer
                </button>
                <button
                  onClick={handleDeleteSketch}
                  className="delete-btn danger"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SketchBookManager;
