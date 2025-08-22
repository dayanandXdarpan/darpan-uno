const { contextBridge, ipcRenderer } = require('electron');

// Simple API for the renderer process
const electronAPI = {
  // File operations
  file: {
    read: (filePath) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
    exists: (filePath) => ipcRenderer.invoke('file:exists', filePath),
    list: (dirPath) => ipcRenderer.invoke('file:list', dirPath),
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },

  // Arduino operations (placeholders)
  arduino: {
    compile: (filePath, board) => ipcRenderer.invoke('arduino:compile', filePath, board),
    upload: (filePath, board, port) => ipcRenderer.invoke('arduino:upload', filePath, board, port),
    getBoardList: () => ipcRenderer.invoke('arduino:getBoardList'),
    getAvailablePorts: () => ipcRenderer.invoke('arduino:getAvailablePorts')
  },

  // Serial operations (placeholders)
  serial: {
    connect: (port, baudRate) => ipcRenderer.invoke('serial:connect', port, baudRate),
    disconnect: () => ipcRenderer.invoke('serial:disconnect'),
    write: (data) => ipcRenderer.invoke('serial:write', data),
    onData: (callback) => {
      // Placeholder - simulate some data
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          callback(`Sensor reading: ${Math.floor(Math.random() * 1024)}`);
        }
      }, 2000);
      
      return () => clearInterval(interval); // Return cleanup function
    }
  },

  // AI operations (placeholders)
  ai: {
    chat: (messages, context) => ipcRenderer.invoke('ai:chat', messages, context),
    explainCode: (code, language) => ipcRenderer.invoke('ai:explainCode', code, language),
    fixError: (error, code) => ipcRenderer.invoke('ai:fixError', error, code),
    generateCode: (prompt, language) => ipcRenderer.invoke('ai:generateCode', prompt, language)
  },

  // Project operations
  project: {
    getTemplates: () => ipcRenderer.invoke('project:getTemplates'),
    create: (name, templateName, path) => ipcRenderer.invoke('project:create', name, templateName, path),
    open: (path) => ipcRenderer.invoke('project:open', path),
    save: (path) => ipcRenderer.invoke('project:save', path),
    createSnapshot: (name, description) => ipcRenderer.invoke('project:createSnapshot', name, description),
    restoreSnapshot: (snapshotId) => ipcRenderer.invoke('project:restoreSnapshot', snapshotId),
    getSnapshots: () => ipcRenderer.invoke('project:getSnapshots')
  },

  // Menu event listeners
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:newFile', () => callback('newFile'));
    ipcRenderer.on('menu:openFile', () => callback('openFile'));
    ipcRenderer.on('menu:save', () => callback('save'));
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeAllListeners('menu:newFile');
      ipcRenderer.removeAllListeners('menu:openFile');
      ipcRenderer.removeAllListeners('menu:save');
    };
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
