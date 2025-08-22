import React, { useState, useEffect } from 'react';
import './LibraryManager.css';

interface Library {
  name: string;
  version: string;
  author: string;
  description: string;
  website?: string;
  repository?: string;
  category: string;
  architectures: string[];
  dependencies?: string[];
  installed: boolean;
  installedVersion?: string;
  availableVersions: string[];
  downloads: number;
  rating: number;
  lastUpdate: string;
  license?: string;
  examples?: string[];
}

interface LibraryCategory {
  name: string;
  count: number;
}

const LibraryManager: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filter, setFilter] = useState<'all' | 'installed' | 'updatable'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'rating' | 'date'>('name');

  const categories: LibraryCategory[] = [
    { name: 'All', count: 0 },
    { name: 'Communication', count: 0 },
    { name: 'Data Processing', count: 0 },
    { name: 'Data Storage', count: 0 },
    { name: 'Device Control', count: 0 },
    { name: 'Display', count: 0 },
    { name: 'Other', count: 0 },
    { name: 'Sensors', count: 0 },
    { name: 'Signal Input/Output', count: 0 },
    { name: 'Timing', count: 0 },
    { name: 'Uncategorized', count: 0 }
  ];

  useEffect(() => {
    if (isOpen) {
      loadLibraries();
    }
  }, [isOpen]);

  const loadLibraries = async () => {
    setLoading(true);
    try {
      // Mock popular Arduino libraries
      const popularLibraries: Library[] = [
        {
          name: 'WiFi',
          version: '1.2.7',
          author: 'Arduino',
          description: 'Enables network connection (local and Internet) using the Arduino WiFi Shield.',
          website: 'http://www.arduino.cc/en/Reference/WiFi',
          category: 'Communication',
          architectures: ['avr', 'esp32', 'esp8266'],
          installed: true,
          installedVersion: '1.2.7',
          availableVersions: ['1.2.7', '1.2.6', '1.2.5'],
          downloads: 2500000,
          rating: 4.8,
          lastUpdate: '2023-10-15',
          license: 'LGPL-2.1',
          examples: ['WiFiScan', 'WiFiWebClient', 'WiFiWebServer']
        },
        {
          name: 'Servo',
          version: '1.2.1',
          author: 'Michael Margolis, Arduino',
          description: 'Allows Arduino boards to control a variety of servo motors.',
          website: 'http://www.arduino.cc/en/Reference/Servo',
          category: 'Device Control',
          architectures: ['avr', 'megaavr', 'mbed', 'samd'],
          installed: true,
          installedVersion: '1.2.1',
          availableVersions: ['1.2.1', '1.2.0', '1.1.8'],
          downloads: 3200000,
          rating: 4.9,
          lastUpdate: '2023-09-20',
          license: 'LGPL-2.1',
          examples: ['Knob', 'Sweep', 'ServoControl']
        },
        {
          name: 'LiquidCrystal',
          version: '1.0.7',
          author: 'Arduino, Adafruit',
          description: 'Allows communication with alphanumerical liquid crystal displays (LCDs).',
          category: 'Display',
          architectures: ['avr', 'megaavr', 'samd'],
          installed: false,
          availableVersions: ['1.0.7', '1.0.6', '1.0.5'],
          downloads: 2800000,
          rating: 4.7,
          lastUpdate: '2023-08-10',
          license: 'LGPL-2.1',
          examples: ['HelloWorld', 'Blink', 'Cursor']
        },
        {
          name: 'ArduinoJson',
          version: '6.21.3',
          author: 'Benoit Blanchon',
          description: 'An efficient JSON library for embedded C++. Perfect for IoT projects.',
          website: 'https://arduinojson.org/',
          repository: 'https://github.com/bblanchon/ArduinoJson',
          category: 'Data Processing',
          architectures: ['*'],
          installed: false,
          availableVersions: ['6.21.3', '6.21.2', '6.21.1'],
          downloads: 1500000,
          rating: 4.9,
          lastUpdate: '2023-11-05',
          license: 'MIT',
          examples: ['JsonParser', 'JsonGenerator', 'HttpClient']
        },
        {
          name: 'DHT sensor library',
          version: '1.4.4',
          author: 'Adafruit',
          description: 'Arduino library for DHT11, DHT22, etc Temp & Humidity Sensors',
          website: 'https://github.com/adafruit/DHT-sensor-library',
          category: 'Sensors',
          architectures: ['avr', 'esp32', 'esp8266'],
          dependencies: ['Adafruit Unified Sensor'],
          installed: false,
          availableVersions: ['1.4.4', '1.4.3', '1.4.2'],
          downloads: 1200000,
          rating: 4.6,
          lastUpdate: '2023-07-15',
          license: 'MIT',
          examples: ['DHTtester', 'DHT_ESP32']
        },
        {
          name: 'WiFiManager',
          version: '2.0.16-rc.2',
          author: 'tzapu',
          description: 'ESP8266/ESP32 WiFi Connection manager with web captive portal',
          repository: 'https://github.com/tzapu/WiFiManager',
          category: 'Communication',
          architectures: ['esp32', 'esp8266'],
          installed: false,
          availableVersions: ['2.0.16-rc.2', '2.0.15-rc.1', '2.0.14-rc.1'],
          downloads: 890000,
          rating: 4.8,
          lastUpdate: '2023-09-30',
          license: 'MIT',
          examples: ['AutoConnect', 'AutoConnectWithFeedback', 'OnDemandConfigPortal']
        },
        {
          name: 'PubSubClient',
          version: '2.8',
          author: 'Nick O\'Leary',
          description: 'A client library for MQTT messaging.',
          website: 'http://pubsubclient.knolleary.net/',
          category: 'Communication',
          architectures: ['*'],
          installed: false,
          availableVersions: ['2.8', '2.7', '2.6'],
          downloads: 750000,
          rating: 4.7,
          lastUpdate: '2023-06-20',
          license: 'MIT',
          examples: ['mqtt_basic', 'mqtt_auth', 'mqtt_reconnect']
        },
        {
          name: 'FastLED',
          version: '3.6.0',
          author: 'Daniel Garcia',
          description: 'A fast LED library for Arduino',
          website: 'http://fastled.io/',
          category: 'Display',
          architectures: ['avr', 'esp32', 'esp8266', 'samd'],
          installed: false,
          availableVersions: ['3.6.0', '3.5.0', '3.4.0'],
          downloads: 650000,
          rating: 4.8,
          lastUpdate: '2023-08-25',
          license: 'MIT',
          examples: ['Blink', 'ColorPalette', 'RainbowCycle']
        }
      ];

      setLibraries(popularLibraries);
    } catch (error) {
      console.error('Failed to load libraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const installLibrary = async (library: Library) => {
    setLoading(true);
    try {
      console.log(`Installing library: ${library.name}`);
      // Simulate installation with dependencies
      if (library.dependencies) {
        for (const dep of library.dependencies) {
          console.log(`Installing dependency: ${dep}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLibraries(prev => prev.map(lib => 
        lib.name === library.name 
          ? { ...lib, installed: true, installedVersion: lib.version }
          : lib
      ));
      
      console.log(`✅ Successfully installed ${library.name}`);
    } catch (error) {
      console.error('Failed to install library:', error);
    } finally {
      setLoading(false);
    }
  };

  const uninstallLibrary = async (library: Library) => {
    setLoading(true);
    try {
      console.log(`Uninstalling library: ${library.name}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLibraries(prev => prev.map(lib => 
        lib.name === library.name 
          ? { ...lib, installed: false, installedVersion: undefined }
          : lib
      ));
      
      console.log(`✅ Successfully uninstalled ${library.name}`);
    } catch (error) {
      console.error('Failed to uninstall library:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLibraries = libraries
    .filter(library => {
      const matchesSearch = library.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           library.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           library.author.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || library.category === selectedCategory;
      
      switch (filter) {
        case 'installed':
          return matchesSearch && matchesCategory && library.installed;
        case 'updatable':
          return matchesSearch && matchesCategory && library.installed && 
                 library.availableVersions[0] !== library.installedVersion;
        default:
          return matchesSearch && matchesCategory;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'downloads':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'date':
          return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

  if (!isOpen) return null;

  return (
    <div className="library-manager-overlay">
      <div className="library-manager">
        <div className="library-manager-header">
          <h2>📚 Library Manager</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="library-manager-controls">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search libraries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="category-section">
            <label>Category:</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label>Filter:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Libraries</option>
              <option value="installed">Installed</option>
              <option value="updatable">Updatable</option>
            </select>
          </div>

          <div className="sort-section">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="name">Name</option>
              <option value="downloads">Downloads</option>
              <option value="rating">Rating</option>
              <option value="date">Last Update</option>
            </select>
          </div>

          <button 
            onClick={loadLibraries} 
            className="refresh-btn"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        <div className="library-manager-content">
          <div className="libraries-list">
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading libraries...</span>
              </div>
            )}

            {!loading && filteredLibraries.length === 0 && (
              <div className="no-results">
                <p>No libraries found matching your criteria.</p>
              </div>
            )}

            {!loading && filteredLibraries.map(library => (
              <div 
                key={library.name} 
                className={`library-item ${selectedLibrary?.name === library.name ? 'selected' : ''}`}
                onClick={() => setSelectedLibrary(library)}
              >
                <div className="library-info">
                  <div className="library-header">
                    <h3>{library.name}</h3>
                    <div className="library-meta">
                      <span className={`status ${library.installed ? 'installed' : 'not-installed'}`}>
                        {library.installed ? `✅ v${library.installedVersion}` : '📦 Available'}
                      </span>
                      <span className="rating">⭐ {library.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <p className="library-description">{library.description}</p>
                  
                  <div className="library-details">
                    <span className="author">👤 {library.author}</span>
                    <span className="version">📦 v{library.version}</span>
                    <span className="category">🏷️ {library.category}</span>
                    <span className="downloads">📥 {library.downloads.toLocaleString()}</span>
                    <span className="last-update">📅 {library.lastUpdate}</span>
                  </div>
                </div>

                <div className="library-actions">
                  {library.installed ? (
                    <div className="installed-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          uninstallLibrary(library);
                        }}
                        className="uninstall-btn"
                        disabled={loading}
                      >
                        🗑️ Remove
                      </button>
                      {library.availableVersions[0] !== library.installedVersion && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            installLibrary(library);
                          }}
                          className="update-btn"
                          disabled={loading}
                        >
                          🔄 Update
                        </button>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        installLibrary(library);
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

          {selectedLibrary && (
            <div className="library-details-panel">
              <h3>📋 Library Details</h3>
              
              <div className="detail-section">
                <div className="detail-item">
                  <strong>Name:</strong> {selectedLibrary.name}
                </div>
                <div className="detail-item">
                  <strong>Version:</strong> {selectedLibrary.version}
                </div>
                <div className="detail-item">
                  <strong>Author:</strong> {selectedLibrary.author}
                </div>
                <div className="detail-item">
                  <strong>Category:</strong> {selectedLibrary.category}
                </div>
                <div className="detail-item">
                  <strong>Rating:</strong> ⭐ {selectedLibrary.rating.toFixed(1)} / 5.0
                </div>
                <div className="detail-item">
                  <strong>Downloads:</strong> {selectedLibrary.downloads.toLocaleString()}
                </div>
                <div className="detail-item">
                  <strong>Last Update:</strong> {selectedLibrary.lastUpdate}
                </div>
                {selectedLibrary.license && (
                  <div className="detail-item">
                    <strong>License:</strong> {selectedLibrary.license}
                  </div>
                )}
              </div>

              <div className="detail-section">
                <strong>Description:</strong>
                <p>{selectedLibrary.description}</p>
              </div>

              <div className="detail-section">
                <strong>Supported Architectures:</strong>
                <div className="architectures">
                  {selectedLibrary.architectures.map(arch => (
                    <span key={arch} className="architecture-tag">
                      {arch === '*' ? 'All' : arch}
                    </span>
                  ))}
                </div>
              </div>

              {selectedLibrary.dependencies && (
                <div className="detail-section">
                  <strong>Dependencies:</strong>
                  <div className="dependencies">
                    {selectedLibrary.dependencies.map(dep => (
                      <span key={dep} className="dependency-tag">{dep}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLibrary.examples && (
                <div className="detail-section">
                  <strong>Example Sketches:</strong>
                  <div className="examples">
                    {selectedLibrary.examples.map(example => (
                      <span key={example} className="example-tag">{example}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <strong>Available Versions:</strong>
                <div className="versions">
                  {selectedLibrary.availableVersions.map(version => (
                    <span 
                      key={version} 
                      className={`version-tag ${version === selectedLibrary.installedVersion ? 'current' : ''}`}
                    >
                      {version}
                      {version === selectedLibrary.installedVersion && ' (installed)'}
                    </span>
                  ))}
                </div>
              </div>

              {(selectedLibrary.website || selectedLibrary.repository) && (
                <div className="detail-section">
                  <strong>Links:</strong>
                  <div className="links">
                    {selectedLibrary.website && (
                      <a href={selectedLibrary.website} target="_blank" rel="noopener noreferrer">
                        🌐 Website
                      </a>
                    )}
                    {selectedLibrary.repository && (
                      <a href={selectedLibrary.repository} target="_blank" rel="noopener noreferrer">
                        📁 Repository
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="library-manager-footer">
          <div className="status-info">
            <span>📊 Total: {libraries.length} libraries</span>
            <span>✅ Installed: {libraries.filter(l => l.installed).length}</span>
            <span>🔄 Updates: {libraries.filter(l => l.installed && l.availableVersions[0] !== l.installedVersion).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryManager;
