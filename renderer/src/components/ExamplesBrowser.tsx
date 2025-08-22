import React, { useState, useEffect, useMemo } from 'react';
import './ExamplesBrowser.css';

interface ExampleItem {
  id: string;
  name: string;
  path: string;
  description: string;
  category: string;
  subcategory?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  author: string;
  tags: string[];
  files: string[];
  isBuiltIn: boolean;
  lastModified: Date;
}

interface ExampleCategory {
  name: string;
  icon: string;
  count: number;
  subcategories?: string[];
}

interface ExamplesBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExample: (examplePath: string) => void;
}

const ExamplesBrowser: React.FC<ExamplesBrowserProps> = ({
  isOpen,
  onClose,
  onOpenExample
}) => {
  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [categories, setCategories] = useState<ExampleCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'difficulty' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [selectedExample, setSelectedExample] = useState<ExampleItem | null>(null);

  // Initialize examples and categories
  useEffect(() => {
    if (isOpen) {
      loadExamples();
    }
  }, [isOpen]);

  const loadExamples = async () => {
    setLoading(true);
    try {
      // Get examples from Electron main process
      const examplesList = await window.electronAPI?.getArduinoExamples?.() || [];
      setExamples(examplesList);
      
      // Generate categories from examples
      const categoryMap = new Map<string, { count: number; subcategories: Set<string> }>();
      
      examplesList.forEach((example: ExampleItem) => {
        if (!categoryMap.has(example.category)) {
          categoryMap.set(example.category, { count: 0, subcategories: new Set() });
        }
        const cat = categoryMap.get(example.category)!;
        cat.count++;
        if (example.subcategory) {
          cat.subcategories.add(example.subcategory);
        }
      });

      const categoriesList: ExampleCategory[] = [
        { name: 'all', icon: '📁', count: examplesList.length },
        ...Array.from(categoryMap.entries()).map(([name, data]) => ({
          name,
          icon: getCategoryIcon(name),
          count: data.count,
          subcategories: Array.from(data.subcategories)
        }))
      ];

      setCategories(categoriesList);
    } catch (error) {
      console.error('Failed to load examples:', error);
      // Fallback to mock data for development
      loadMockExamples();
    } finally {
      setLoading(false);
    }
  };

  const loadMockExamples = () => {
    const mockExamples: ExampleItem[] = [
      {
        id: '1',
        name: 'Blink',
        path: '/examples/01.Basics/Blink',
        description: 'Turn an LED on and off every second',
        category: 'Basics',
        difficulty: 'Beginner',
        author: 'Arduino',
        tags: ['LED', 'Digital Output', 'Basics'],
        files: ['Blink.ino'],
        isBuiltIn: true,
        lastModified: new Date('2023-01-01')
      },
      {
        id: '2',
        name: 'DigitalReadSerial',
        path: '/examples/01.Basics/DigitalReadSerial',
        description: 'Read a digital input and print it to serial monitor',
        category: 'Basics',
        difficulty: 'Beginner',
        author: 'Arduino',
        tags: ['Digital Input', 'Serial', 'Basics'],
        files: ['DigitalReadSerial.ino'],
        isBuiltIn: true,
        lastModified: new Date('2023-01-01')
      },
      {
        id: '3',
        name: 'Servo Sweep',
        path: '/examples/Servo/Sweep',
        description: 'Sweeps the shaft of a servo motor back and forth',
        category: 'Motors',
        subcategory: 'Servo',
        difficulty: 'Intermediate',
        author: 'Arduino',
        tags: ['Servo', 'Motors', 'PWM'],
        files: ['Sweep.ino'],
        isBuiltIn: true,
        lastModified: new Date('2023-01-01')
      },
      {
        id: '4',
        name: 'WiFi Web Server',
        path: '/examples/WiFi/WebServer',
        description: 'A simple web server that shows the value of analog inputs',
        category: 'Communication',
        subcategory: 'WiFi',
        difficulty: 'Advanced',
        author: 'Arduino',
        tags: ['WiFi', 'Web Server', 'HTTP'],
        files: ['WebServer.ino'],
        isBuiltIn: true,
        lastModified: new Date('2023-01-01')
      }
    ];

    setExamples(mockExamples);

    const mockCategories: ExampleCategory[] = [
      { name: 'all', icon: '📁', count: mockExamples.length },
      { name: 'Basics', icon: '🔤', count: 2 },
      { name: 'Motors', icon: '⚙️', count: 1, subcategories: ['Servo'] },
      { name: 'Communication', icon: '📡', count: 1, subcategories: ['WiFi'] }
    ];

    setCategories(mockCategories);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'Basics': '🔤',
      'Digital': '💾',
      'Analog': '📊',
      'Communication': '📡',
      'Control': '🎛️',
      'Sensors': '🔍',
      'Display': '🖥️',
      'Motors': '⚙️',
      'USB': '🔌',
      'Ethernet': '🌐',
      'WiFi': '📶',
      'Bluetooth': '📘',
      'Storage': '💿'
    };
    return icons[category] || '📄';
  };

  // Filter and sort examples
  const filteredAndSortedExamples = useMemo(() => {
    let filtered = examples.filter(example => {
      const matchesCategory = selectedCategory === 'all' || example.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        example.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });

    // Sort examples
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'category':
          compareValue = a.category.localeCompare(b.category);
          break;
        case 'difficulty':
          const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
          compareValue = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
        case 'date':
          compareValue = a.lastModified.getTime() - b.lastModified.getTime();
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [examples, selectedCategory, searchTerm, sortBy, sortOrder]);

  const handleExampleSelect = (example: ExampleItem) => {
    setSelectedExample(example);
  };

  const handleOpenExample = async () => {
    if (selectedExample) {
      try {
        await window.electronAPI?.openArduinoExample?.(selectedExample.path);
        onOpenExample(selectedExample.path);
        onClose();
      } catch (error) {
        console.error('Failed to open example:', error);
      }
    }
  };

  const handleImportExample = async () => {
    if (selectedExample) {
      try {
        await window.electronAPI?.importArduinoExample?.(selectedExample.path);
        console.log('Example imported to sketchbook');
      } catch (error) {
        console.error('Failed to import example:', error);
      }
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Beginner': return '#4ade80';
      case 'Intermediate': return '#f59e0b';
      case 'Advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="examples-overlay">
      <div className="examples-browser">
        <div className="examples-header">
          <h2>Arduino Examples</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="examples-toolbar">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search examples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="sort-section">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="difficulty">Sort by Difficulty</option>
              <option value="date">Sort by Date</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="examples-content">
          <div className="categories-sidebar">
            <div className="categories-list">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">
                    {category.name === 'all' ? 'All Examples' : category.name}
                  </span>
                  <span className="category-count">{category.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="examples-main">
            <div className="examples-list">
              {loading ? (
                <div className="loading-message">Loading examples...</div>
              ) : filteredAndSortedExamples.length === 0 ? (
                <div className="no-results">
                  {searchTerm ? 'No examples match your search' : 'No examples found'}
                </div>
              ) : (
                filteredAndSortedExamples.map((example) => (
                  <div
                    key={example.id}
                    onClick={() => handleExampleSelect(example)}
                    className={`example-item ${selectedExample?.id === example.id ? 'selected' : ''}`}
                  >
                    <div className="example-header">
                      <h4 className="example-name">{example.name}</h4>
                      <span
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(example.difficulty) }}
                      >
                        {example.difficulty}
                      </span>
                    </div>
                    
                    <p className="example-description">{example.description}</p>
                    
                    <div className="example-meta">
                      <span className="example-category">
                        {getCategoryIcon(example.category)} {example.category}
                        {example.subcategory && ` › ${example.subcategory}`}
                      </span>
                      <span className="example-author">by {example.author}</span>
                    </div>
                    
                    <div className="example-tags">
                      {example.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedExample && (
              <div className="example-details">
                <div className="details-header">
                  <h3>{selectedExample.name}</h3>
                  <span
                    className="difficulty-badge large"
                    style={{ backgroundColor: getDifficultyColor(selectedExample.difficulty) }}
                  >
                    {selectedExample.difficulty}
                  </span>
                </div>
                
                <p className="details-description">{selectedExample.description}</p>
                
                <div className="details-info">
                  <div className="info-item">
                    <strong>Category:</strong> {selectedExample.category}
                    {selectedExample.subcategory && ` › ${selectedExample.subcategory}`}
                  </div>
                  <div className="info-item">
                    <strong>Author:</strong> {selectedExample.author}
                  </div>
                  <div className="info-item">
                    <strong>Files:</strong> {selectedExample.files.join(', ')}
                  </div>
                  <div className="info-item">
                    <strong>Type:</strong> {selectedExample.isBuiltIn ? 'Built-in' : 'Custom'}
                  </div>
                </div>
                
                <div className="details-tags">
                  {selectedExample.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
                
                <div className="details-actions">
                  <button
                    onClick={handleOpenExample}
                    className="open-btn primary"
                  >
                    Open Example
                  </button>
                  <button
                    onClick={handleImportExample}
                    className="import-btn secondary"
                  >
                    Import to Sketchbook
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamplesBrowser;
