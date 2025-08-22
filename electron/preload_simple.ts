const { contextBridge, ipcRenderer } = require('electron');

// Simple API for the renderer process
const electronAPI = {
  // File operations
  file: {
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    exists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
    list: (dirPath: string) => ipcRenderer.invoke('file:list', dirPath),
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },

  // Arduino operations (placeholders)
  arduino: {
    compile: (filePath: string, board: string) => ipcRenderer.invoke('arduino:compile', filePath, board),
    upload: (filePath: string, board: string, port: string) => ipcRenderer.invoke('arduino:upload', filePath, board, port),
    getBoardList: () => ipcRenderer.invoke('arduino:getBoardList'),
    getAvailablePorts: () => ipcRenderer.invoke('arduino:getAvailablePorts')
  },

  // Serial operations (placeholders)
  serial: {
    connect: (port: string, baudRate: number) => ipcRenderer.invoke('serial:connect', port, baudRate),
    disconnect: () => ipcRenderer.invoke('serial:disconnect'),
    write: (data: string) => ipcRenderer.invoke('serial:write', data),
    onData: (callback: (data: string) => void) => {
      // Placeholder - will implement real serial data events later
      return () => {}; // Return cleanup function
    }
  },

  // AI operations (placeholders)
  ai: {
    chat: (messages: any[], context?: string) => ipcRenderer.invoke('ai:chat', messages, context),
    explainCode: (code: string, language: string) => ipcRenderer.invoke('ai:explainCode', code, language),
    fixError: (error: string, code: string) => ipcRenderer.invoke('ai:fixError', error, code),
    generateCode: (prompt: string, language: string) => ipcRenderer.invoke('ai:generateCode', prompt, language)
  },

  // Project operations
  project: {
    getTemplates: () => ipcRenderer.invoke('project:getTemplates'),
    create: (name: string, templateName: string, path: string) => ipcRenderer.invoke('project:create', name, templateName, path),
    open: (path: string) => ipcRenderer.invoke('project:open', path),
    save: (path: string) => ipcRenderer.invoke('project:save', path),
    createSnapshot: (name: string, description: string) => ipcRenderer.invoke('project:createSnapshot', name, description),
    restoreSnapshot: (snapshotId: string) => ipcRenderer.invoke('project:restoreSnapshot', snapshotId),
    getSnapshots: () => ipcRenderer.invoke('project:getSnapshots')
  },

  // Menu event listeners
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:newFile', () => callback('newFile'));
    ipcRenderer.on('menu:openFile', () => callback('openFile'));
    ipcRenderer.on('menu:save', () => callback('save'));
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
