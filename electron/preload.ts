import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Arduino CLI operations
  arduino: {
    compile: (projectPath: string, fqbn: string) => 
      ipcRenderer.invoke('arduino:compile', projectPath, fqbn),
    upload: (projectPath: string, fqbn: string, port: string) => 
      ipcRenderer.invoke('arduino:upload', projectPath, fqbn, port),
    getBoardList: () => 
      ipcRenderer.invoke('arduino:getBoardList'),
    getPortList: () => 
      ipcRenderer.invoke('arduino:getPortList'),
    installLibrary: (library: string) => 
      ipcRenderer.invoke('arduino:installLibrary', library),
    searchLibraries: (query: string) => 
      ipcRenderer.invoke('arduino:searchLibraries', query)
  },

  // Serial operations
  serial: {
    list: () => 
      ipcRenderer.invoke('serial:list'),
    connect: (port: string, baudRate: number) => 
      ipcRenderer.invoke('serial:connect', port, baudRate),
    disconnect: () => 
      ipcRenderer.invoke('serial:disconnect'),
    send: (data: string) => 
      ipcRenderer.invoke('serial:send', data),
    onData: (callback: (data: string) => void) => 
      ipcRenderer.on('serial:data', (_, data) => callback(data)),
    onError: (callback: (error: string) => void) => 
      ipcRenderer.on('serial:error', (_, error) => callback(error)),
    removeDataListener: () => 
      ipcRenderer.removeAllListeners('serial:data'),
    removeErrorListener: () => 
      ipcRenderer.removeAllListeners('serial:error')
  },

  // Project management
  project: {
    create: (name: string, template?: string) => 
      ipcRenderer.invoke('project:create', name, template),
    open: (projectPath: string) => 
      ipcRenderer.invoke('project:open', projectPath),
    save: (projectPath: string, files: Record<string, string>) => 
      ipcRenderer.invoke('project:save', projectPath, files),
    createSnapshot: (projectPath: string, description: string) => 
      ipcRenderer.invoke('project:createSnapshot', projectPath, description),
    getSnapshots: (projectPath: string) => 
      ipcRenderer.invoke('project:getSnapshots', projectPath),
    restoreSnapshot: (projectPath: string, snapshotId: string) => 
      ipcRenderer.invoke('project:restoreSnapshot', projectPath, snapshotId),
    onOpen: (callback: (projectPath: string) => void) => 
      ipcRenderer.on('project:open', (_, projectPath) => callback(projectPath))
  },

  // AI operations
  ai: {
    chat: (message: string, context: any, conversationId?: string) => 
      ipcRenderer.invoke('ai:chat', message, context, conversationId),
    explainCode: (code: string, context?: any) => 
      ipcRenderer.invoke('ai:explainCode', code, context),
    generateCode: (prompt: string, context: any) => 
      ipcRenderer.invoke('ai:generateCode', prompt, context),
    fixCode: (code: string, errors: any[], context?: any) => 
      ipcRenderer.invoke('ai:fixCode', code, errors, context),
    implementFeature: (feature: string, context: any) => 
      ipcRenderer.invoke('ai:implementFeature', feature, context),
    getAvailableModels: () => 
      ipcRenderer.invoke('ai:getAvailableModels'),
    setAPIKey: (provider: string, apiKey: string) => 
      ipcRenderer.invoke('ai:setAPIKey', provider, apiKey),
    testConnection: (modelId: string) => 
      ipcRenderer.invoke('ai:testConnection', modelId),
    getUsageStats: () => 
      ipcRenderer.invoke('ai:getUsageStats'),
    modelRequest: (options: any) => 
      ipcRenderer.invoke('ai:modelRequest', options)
  },

  // File operations
  file: {
    read: (path: string) => 
      ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => 
      ipcRenderer.invoke('file:write', path, content),
    showOpenDialog: () => 
      ipcRenderer.invoke('file:showOpenDialog'),
    showSaveDialog: (options: any) => 
      ipcRenderer.invoke('file:showSaveDialog', options)
  },

  // Circuit operations
  circuit: {
    getComponentLibrary: () => 
      ipcRenderer.invoke('circuit:getComponentLibrary'),
    validate: (circuit: any) => 
      ipcRenderer.invoke('circuit:validate', circuit),
    generateCode: (circuit: any) => 
      ipcRenderer.invoke('circuit:generateCode', circuit)
  },

  // AI Tools operations
  aiTools: {
    initializeAITools: () => 
      ipcRenderer.invoke('aiTools:initialize'),
    getQuickActions: () => 
      ipcRenderer.invoke('aiTools:getQuickActions'),
    getSystemCapabilities: () => 
      ipcRenderer.invoke('aiTools:getSystemCapabilities'),
    executeQuickAction: (actionId: string) => 
      ipcRenderer.invoke('aiTools:executeQuickAction', actionId),
    suggestTools: (query: string) => 
      ipcRenderer.invoke('aiTools:suggestTools', query),
    handleUserRequest: (query: string, context?: any) => 
      ipcRenderer.invoke('aiTools:handleUserRequest', query, context),
    recognizeHardware: (description: string) => 
      ipcRenderer.invoke('aiTools:recognizeHardware', description),
    recognizeHardwareFromImage: (imageData: any) => 
      ipcRenderer.invoke('aiTools:recognizeHardwareFromImage', imageData),
    suggestComponents: (requirements: any) => 
      ipcRenderer.invoke('aiTools:suggestComponents', requirements),
    getAllModels: () => 
      ipcRenderer.invoke('aiTools:getAllModels'),
    getConfig: () => 
      ipcRenderer.invoke('aiTools:getConfig'),
    getUsageStats: () => 
      ipcRenderer.invoke('aiTools:getUsageStats'),
    setSelectedModel: (modelId: string) => 
      ipcRenderer.invoke('aiTools:setSelectedModel', modelId),
    setApiKey: (provider: string, apiKey: string) => 
      ipcRenderer.invoke('aiTools:setApiKey', provider, apiKey),
    setOfflineMode: (offline: boolean) => 
      ipcRenderer.invoke('aiTools:setOfflineMode', offline),
    testConnection: (modelId: string) => 
      ipcRenderer.invoke('aiTools:testConnection', modelId)
  },

  // Settings
  settings: {
    get: (key: string) => 
      ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => 
      ipcRenderer.invoke('settings:set', key, value)
  },

  // Menu events
  menu: {
    onNewSketch: (callback: () => void) => 
      ipcRenderer.on('menu:new-sketch', callback),
    onSave: (callback: () => void) => 
      ipcRenderer.on('menu:save', callback),
    onCompile: (callback: () => void) => 
      ipcRenderer.on('menu:compile', callback),
    onUpload: (callback: () => void) => 
      ipcRenderer.on('menu:upload', callback),
    onToggleChat: (callback: () => void) => 
      ipcRenderer.on('menu:toggle-chat', callback),
    onAIExplain: (callback: () => void) => 
      ipcRenderer.on('menu:ai-explain', callback),
    onAIGenerate: (callback: () => void) => 
      ipcRenderer.on('menu:ai-generate', callback),
    onAIFix: (callback: () => void) => 
      ipcRenderer.on('menu:ai-fix', callback),
    onAIImplement: (callback: () => void) => 
      ipcRenderer.on('menu:ai-implement', callback),
    onBoardManager: (callback: () => void) => 
      ipcRenderer.on('menu:board-manager', callback),
    onLibraryManager: (callback: () => void) => 
      ipcRenderer.on('menu:library-manager', callback),
    onSerialMonitor: (callback: () => void) => 
      ipcRenderer.on('menu:serial-monitor', callback),
    onSerialPlotter: (callback: () => void) => 
      ipcRenderer.on('menu:serial-plotter', callback),
    onFind: (callback: () => void) => 
      ipcRenderer.on('menu:find', callback),
    onReplace: (callback: () => void) => 
      ipcRenderer.on('menu:replace', callback),
    onResetLayout: (callback: () => void) => 
      ipcRenderer.on('menu:reset-layout', callback)
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      arduino: {
        compile: (projectPath: string, fqbn: string) => Promise<any>;
        upload: (projectPath: string, fqbn: string, port: string) => Promise<any>;
        getBoardList: () => Promise<any[]>;
        getPortList: () => Promise<any[]>;
        installLibrary: (library: string) => Promise<boolean>;
        searchLibraries: (query: string) => Promise<any[]>;
      };
      serial: {
        list: () => Promise<any[]>;
        connect: (port: string, baudRate: number) => Promise<any>;
        disconnect: () => Promise<any>;
        send: (data: string) => Promise<any>;
        onData: (callback: (data: string) => void) => void;
        onError: (callback: (error: string) => void) => void;
        removeDataListener: () => void;
        removeErrorListener: () => void;
      };
      project: {
        create: (name: string, template?: string) => Promise<any>;
        open: (projectPath: string) => Promise<any>;
        save: (projectPath: string, files: Record<string, string>) => Promise<any>;
        createSnapshot: (projectPath: string, description: string) => Promise<any>;
        getSnapshots: (projectPath: string) => Promise<any[]>;
        restoreSnapshot: (projectPath: string, snapshotId: string) => Promise<any>;
        onOpen: (callback: (projectPath: string) => void) => void;
      };
      ai: {
        chat: (message: string, context: any, conversationId?: string) => Promise<any>;
        explainCode: (code: string, context?: any) => Promise<any>;
        generateCode: (prompt: string, context: any) => Promise<any>;
        fixCode: (code: string, errors: any[], context?: any) => Promise<any>;
        implementFeature: (feature: string, context: any) => Promise<any>;
        getAvailableModels: () => Promise<any[]>;
        setAPIKey: (provider: string, apiKey: string) => Promise<boolean>;
        testConnection: (modelId: string) => Promise<any>;
        getUsageStats: () => Promise<any>;
        modelRequest: (options: any) => Promise<any>;
      };
      file: {
        read: (path: string) => Promise<string>;
        write: (path: string, content: string) => Promise<void>;
        showOpenDialog: () => Promise<any>;
        showSaveDialog: (options: any) => Promise<any>;
      };
      circuit: {
        getComponentLibrary: () => Promise<any[]>;
        validate: (circuit: any) => Promise<any>;
        generateCode: (circuit: any) => Promise<string>;
      };
      aiTools: {
        initializeAITools: () => Promise<void>;
        getQuickActions: () => Promise<any[]>;
        getSystemCapabilities: () => Promise<any>;
        executeQuickAction: (actionId: string) => Promise<any>;
        suggestTools: (query: string) => Promise<any[]>;
        handleUserRequest: (query: string, context?: any) => Promise<any>;
        recognizeHardware: (description: string) => Promise<any[]>;
        recognizeHardwareFromImage: (imageData: any) => Promise<any[]>;
        suggestComponents: (requirements: any) => Promise<any[]>;
        getAllModels: () => Promise<any[]>;
        getConfig: () => Promise<any>;
        getUsageStats: () => Promise<any>;
        setSelectedModel: (modelId: string) => Promise<boolean>;
        setApiKey: (provider: string, apiKey: string) => Promise<boolean>;
        setOfflineMode: (offline: boolean) => Promise<boolean>;
        testConnection: (modelId: string) => Promise<any>;
      };
      settings: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<boolean>;
      };
      menu: {
        onNewSketch: (callback: () => void) => void;
        onSave: (callback: () => void) => void;
        onCompile: (callback: () => void) => void;
        onUpload: (callback: () => void) => void;
        onToggleChat: (callback: () => void) => void;
        onAIExplain: (callback: () => void) => void;
        onAIGenerate: (callback: () => void) => void;
        onAIFix: (callback: () => void) => void;
        onAIImplement: (callback: () => void) => void;
        onBoardManager: (callback: () => void) => void;
        onLibraryManager: (callback: () => void) => void;
        onSerialMonitor: (callback: () => void) => void;
        onSerialPlotter: (callback: () => void) => void;
        onFind: (callback: () => void) => void;
        onReplace: (callback: () => void) => void;
        onResetLayout: (callback: () => void) => void;
      };
    };
  }
}