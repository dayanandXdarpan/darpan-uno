import React, { useState, useEffect, useCallback } from 'react';
import './EnhancedProjectExplorer.css';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  expanded?: boolean;
  size?: number;
  modified?: Date;
}

interface EnhancedProjectExplorerProps {
  onFileSelect: (filePath: string) => void;
  currentFile: string;
  className?: string;
}

export const EnhancedProjectExplorer: React.FC<EnhancedProjectExplorerProps> = ({
  onFileSelect,
  currentFile,
  className = ''
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    isDirectory: boolean;
  } | null>(null);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPath, setNewItemPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWorkspaceFiles();
  }, []);

  const loadWorkspaceFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate file system loading (replace with actual implementation)
      const mockFiles: FileNode[] = [
        {
          name: 'Arduino Projects',
          path: '/projects',
          isDirectory: true,
          expanded: true,
          children: [
            {
              name: 'BlinkLED',
              path: '/projects/BlinkLED',
              isDirectory: true,
              children: [
                {
                  name: 'BlinkLED.ino',
                  path: '/projects/BlinkLED/BlinkLED.ino',
                  isDirectory: false,
                  size: 1024,
                  modified: new Date()
                }
              ]
            },
            {
              name: 'TemperatureSensor',
              path: '/projects/TemperatureSensor',
              isDirectory: true,
              children: [
                {
                  name: 'TemperatureSensor.ino',
                  path: '/projects/TemperatureSensor/TemperatureSensor.ino',
                  isDirectory: false,
                  size: 2048,
                  modified: new Date()
                },
                {
                  name: 'README.md',
                  path: '/projects/TemperatureSensor/README.md',
                  isDirectory: false,
                  size: 512,
                  modified: new Date()
                }
              ]
            }
          ]
        },
        {
          name: 'Libraries',
          path: '/libraries',
          isDirectory: true,
          children: []
        },
        {
          name: 'Examples',
          path: '/examples',
          isDirectory: true,
          children: []
        }
      ];
      
      setFileTree(mockFiles);
      setCurrentPath('/projects');
    } catch (error) {
      console.error('Failed to load workspace files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleFolder = useCallback((path: string) => {
    const updateExpanded = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path && node.isDirectory) {
          return { ...node, expanded: !node.expanded };
        } else if (node.children) {
          return { ...node, children: updateExpanded(node.children) };
        }
        return node;
      });
    };

    setFileTree(prev => updateExpanded(prev));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
      isDirectory
    });
  }, []);

  const handleNewFile = useCallback((parentPath: string) => {
    setNewItemPath(parentPath);
    setNewItemName('');
    setShowNewFileDialog(true);
    setContextMenu(null);
  }, []);

  const handleNewFolder = useCallback((parentPath: string) => {
    setNewItemPath(parentPath);
    setNewItemName('');
    setShowNewFolderDialog(true);
    setContextMenu(null);
  }, []);

  const createNewItem = useCallback(async (isDirectory: boolean) => {
    if (!newItemName.trim()) return;

    const fullPath = `${newItemPath}/${newItemName}`;
    
    try {
      // Simulate file/folder creation (replace with actual implementation)
      const newNode: FileNode = {
        name: newItemName,
        path: fullPath,
        isDirectory,
        size: isDirectory ? undefined : 0,
        modified: new Date(),
        children: isDirectory ? [] : undefined
      };

      // Add to file tree
      const addToTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === newItemPath && node.isDirectory) {
            return {
              ...node,
              children: [...(node.children || []), newNode].sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) {
                  return a.isDirectory ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
              }),
              expanded: true
            };
          } else if (node.children) {
            return { ...node, children: addToTree(node.children) };
          }
          return node;
        });
      };

      setFileTree(prev => addToTree(prev));
      
      // If it's a file, select it
      if (!isDirectory) {
        onFileSelect(fullPath);
      }

      setShowNewFileDialog(false);
      setShowNewFolderDialog(false);
      setNewItemName('');
      setNewItemPath('');
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  }, [newItemName, newItemPath, onFileSelect]);

  const deleteItem = useCallback(async (path: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Simulate deletion (replace with actual implementation)
      const removeFromTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.filter(node => node.path !== path)
          .map(node => {
            if (node.children) {
              return { ...node, children: removeFromTree(node.children) };
            }
            return node;
          });
      };

      setFileTree(prev => removeFromTree(prev));
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }, []);

  const openInSystemExplorer = useCallback((path: string) => {
    // Simulate opening in system file explorer (replace with actual implementation)
    console.log('Opening in system explorer:', path);
    setContextMenu(null);
  }, []);

  const renderFileNode = useCallback((node: FileNode, depth: number = 0): React.ReactNode => {
    const isSelected = node.path === currentFile;
    const hasChildren = node.isDirectory && node.children && node.children.length > 0;
    const isEmpty = node.isDirectory && (!node.children || node.children.length === 0);

    return (
      <div key={node.path} className="file-node">
        <div
          className={`file-item ${isSelected ? 'selected' : ''} ${node.isDirectory ? 'directory' : 'file'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleFolder(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node.path, node.isDirectory)}
        >
          <span className="file-icon">
            {node.isDirectory ? (
              node.expanded ? '📂' : '📁'
            ) : (
              getFileIcon(node.name)
            )}
          </span>
          <span className="file-name">{node.name}</span>
          {node.size !== undefined && (
            <span className="file-size">{formatFileSize(node.size)}</span>
          )}
        </div>

        {node.isDirectory && node.expanded && (
          <div className="file-children">
            {isEmpty ? (
              <div
                className="empty-folder"
                style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                onClick={() => handleNewFile(node.path)}
              >
                📄 Click to create first file
              </div>
            ) : (
              hasChildren && node.children!.map(child => renderFileNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  }, [currentFile, onFileSelect, toggleFolder, handleContextMenu, handleNewFile]);

  const filteredFileTree = useCallback(() => {
    if (!searchQuery.trim()) return fileTree;

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce((acc: FileNode[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            expanded: true // Auto-expand during search
          });
        }
        
        return acc;
      }, []);
    };

    return filterNodes(fileTree);
  }, [fileTree, searchQuery]);

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ino': return '🔧';
      case 'cpp': case 'c': return '⚙️';
      case 'h': return '📋';
      case 'md': return '📝';
      case 'json': return '🔧';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className={`enhanced-project-explorer ${className}`}>
      {/* Header */}
      <div className="explorer-header">
        <div className="explorer-title">
          <span>📁</span>
          <span>Project Explorer</span>
        </div>
        <div className="explorer-actions">
          <button
            className="action-btn"
            onClick={() => handleNewFile(currentPath)}
            title="New File"
          >
            📄
          </button>
          <button
            className="action-btn"
            onClick={() => handleNewFolder(currentPath)}
            title="New Folder"
          >
            📁
          </button>
          <button
            className="action-btn"
            onClick={loadWorkspaceFiles}
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* File Tree */}
      <div className="file-tree-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading files...</span>
          </div>
        ) : filteredFileTree().length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No Files Found</h3>
            <p>This workspace is empty or no files match your search.</p>
            <button
              className="create-first-file-btn"
              onClick={() => handleNewFile(currentPath)}
            >
              Create First File
            </button>
          </div>
        ) : (
          <div className="file-tree">
            {filteredFileTree().map(node => renderFileNode(node))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div className="context-menu-item" onClick={() => handleNewFile(contextMenu.path)}>
            📄 New File
          </div>
          <div className="context-menu-item" onClick={() => handleNewFolder(contextMenu.path)}>
            📁 New Folder
          </div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item" onClick={() => openInSystemExplorer(contextMenu.path)}>
            🔍 Reveal in Explorer
          </div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item danger" onClick={() => deleteItem(contextMenu.path)}>
            🗑️ Delete
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Create New File</h3>
            <input
              type="text"
              placeholder="File name (e.g., sketch.ino)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="dialog-input"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') createNewItem(false);
                if (e.key === 'Escape') setShowNewFileDialog(false);
              }}
            />
            <div className="dialog-actions">
              <button onClick={() => setShowNewFileDialog(false)}>Cancel</button>
              <button onClick={() => createNewItem(false)} disabled={!newItemName.trim()}>
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="dialog-input"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') createNewItem(true);
                if (e.key === 'Escape') setShowNewFolderDialog(false);
              }}
            />
            <div className="dialog-actions">
              <button onClick={() => setShowNewFolderDialog(false)}>Cancel</button>
              <button onClick={() => createNewItem(true)} disabled={!newItemName.trim()}>
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProjectExplorer;
