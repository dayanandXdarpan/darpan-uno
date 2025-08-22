// Electron API types for the renderer process

export interface Board {
  fqbn: string;
  name: string;
  platform: string;
  architecture: string;
}

export interface Port {
  path: string;
  label: string;
  protocol: string;
  properties?: { [key: string]: string };
}

export interface CompilerMessage {
  file: string;
  line: number;
  column: number;
  type: 'error' | 'warning';
  message: string;
}

export interface CompileResult {
  success: boolean;
  output: string;
  errors: CompilerMessage[];
  warnings: CompilerMessage[];
  sketchPath?: string;
  binaryPath?: string;
  usedLibraries?: string[];
  buildProperties?: { [key: string]: string };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: {
    code?: string;
    file?: string;
    error?: string;
    project?: string;
  };
}

export interface CircuitComponent {
  id: string;
  type: 'arduino' | 'sensor' | 'actuator' | 'resistor' | 'led' | 'button' | 'wire';
  name: string;
  pins: Pin[];
  position: { x: number; y: number };
  properties: { [key: string]: any };
}

export interface Pin {
  id: string;
  name: string;
  type: 'digital' | 'analog' | 'power' | 'ground';
  direction: 'input' | 'output' | 'bidirectional';
}

export interface Connection {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
  validated: boolean;
  issues?: string[];
}

export interface Circuit {
  id: string;
  name: string;
  components: CircuitComponent[];
  connections: Connection[];
  generatedCode?: string;
  validated: boolean;
}

export interface DebugData {
  timestamp: number;
  variables: { [name: string]: any };
  serialData: string;
  parsed?: {
    type: 'json' | 'csv' | 'keyvalue' | 'raw';
    data: any;
  };
}

export interface LibraryReference {
  name: string;
  version: string;
  author: string;
  description: string;
  repository?: string;
  documentation?: string;
  examples: string[];
  dependencies: string[];
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  code?: string;
  circuit?: Circuit;
  videoUrl?: string;
  resources: string[];
}

export interface ProjectTemplate {
  name: string;
  description: string;
  files: { [filename: string]: string };
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  files: { [path: string]: string };
}

export interface ElectronAPI {
  arduino: {
    initialize(): Promise<void>;
    compile(sketchPath: string, fqbn: string): Promise<CompileResult>;
    upload(sketchPath: string, fqbn: string, port: string): Promise<CompileResult>;
    getBoardList(): Promise<Board[]>;
    getAvailablePorts(): Promise<Port[]>;
    installLibrary(library: string): Promise<{ success: boolean; output: string }>;
    searchLibrary(query: string): Promise<LibraryReference[]>;
    getInstalledLibraries(): Promise<LibraryReference[]>;
    autoInstallDependencies(code: string): Promise<string[]>;
    validateCode(code: string, fqbn: string): Promise<CompileResult>;
  };
  
  serial: {
    connect(port: string, baudRate: number): Promise<void>;
    disconnect(): Promise<void>;
    write(data: string): Promise<void>;
    onData(callback: (data: DebugData) => void): () => void;
    getAvailablePorts(): Promise<Port[]>;
    startPlotter(): Promise<void>;
    stopPlotter(): Promise<void>;
    exportData(format: 'csv' | 'json'): Promise<string>;
  };
  
  ai: {
    chat(messages: AIMessage[], context?: string): Promise<string>;
    explainCode(code: string, language: string): Promise<string>;
    fixError(error: string, code: string): Promise<string>;
    generateCode(prompt: string, language: string, context?: any): Promise<string>;
    optimizeCode(code: string): Promise<string>;
    generateWiring(components: string[]): Promise<Circuit>;
    explainConcept(concept: string, level: 'beginner' | 'intermediate' | 'advanced'): Promise<string>;
    suggestLibraries(description: string): Promise<LibraryReference[]>;
    createTutorial(topic: string): Promise<TutorialStep[]>;
    getAvailableModels(): Promise<{ id: string; displayName: string; provider: string; isOnline: boolean; description?: string; maxTokens?: number; }[]>;
    handleUserRequest(query: string, options?: any): Promise<any>;
  };
  
  circuit: {
    create(name: string): Promise<Circuit>;
    save(circuit: Circuit): Promise<void>;
    load(id: string): Promise<Circuit>;
    validate(circuit: Circuit): Promise<{ valid: boolean; issues: string[] }>;
    generateCode(circuit: Circuit): Promise<string>;
    simulate(circuit: Circuit, inputs: any): Promise<any>;
    exportDiagram(circuit: Circuit, format: 'png' | 'svg'): Promise<string>;
    getComponentLibrary(): Promise<CircuitComponent[]>;
  };
  
  debug: {
    startSession(port: string): Promise<void>;
    stopSession(): Promise<void>;
    setBreakpoint(file: string, line: number): Promise<void>;
    removeBreakpoint(file: string, line: number): Promise<void>;
    onData(callback: (data: DebugData) => void): () => void;
    getVariables(): Promise<{ [name: string]: any }>;
    sendCommand(command: string): Promise<string>;
  };
  
  project: {
    create(name: string, templateName: string, path: string): Promise<string>;
    open(path: string): Promise<void>;
    save(path: string): Promise<void>;
    createSnapshot(name: string, description: string): Promise<ProjectSnapshot>;
    restoreSnapshot(snapshotId: string): Promise<void>;
    getSnapshots(): Promise<ProjectSnapshot[]>;
    getTemplates(): Promise<ProjectTemplate[]>;
    backup(destination: string): Promise<void>;
    sync(provider: 'github' | 'firebase'): Promise<void>;
    collaborate(inviteEmail: string): Promise<void>;
    getHistory(): Promise<any[]>;
  };
  
  learning: {
    getTutorials(level?: string, topic?: string): Promise<TutorialStep[]>;
    searchDocumentation(query: string): Promise<any[]>;
    getExamples(component: string): Promise<any[]>;
    checkProgress(userId: string): Promise<any>;
    suggestNextStep(currentProject: string): Promise<TutorialStep>;
  };
  
  file: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    list(path: string): Promise<string[]>;
    watch(path: string, callback: (event: string, path: string) => void): () => void;
    showOpenDialog(options: any): Promise<string[]>;
    showSaveDialog(options: any): Promise<string>;
    backup(source: string, destination: string): Promise<void>;
  };
  
  system: {
    getSystemInfo(): Promise<any>;
    checkUpdates(): Promise<{ available: boolean; version?: string }>;
    installUpdate(): Promise<void>;
    openExternal(url: string): Promise<void>;
    showNotification(title: string, body: string): Promise<void>;
    setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void>;
  };

  // Board Manager methods
  getAvailableBoards(): Promise<any[]>;
  getBoardInfo(boardId: string): Promise<any>;
  installBoardPackage(packageUrl: string): Promise<void>;
  uninstallBoardPackage(packageName: string): Promise<void>;
  updateBoardPackages(): Promise<void>;

  // Library Manager methods
  getInstalledLibraries(): Promise<any[]>;
  searchLibraries(query: string): Promise<any[]>;
  getLibraryInfo(libraryName: string): Promise<any>;
  updateLibrary(libraryName: string): Promise<void>;
  uninstallLibrary(libraryName: string): Promise<void>;
  updateAllLibraries(): Promise<void>;

  // Serial Plotter methods
  startSerialPlotter(port: string, baudRate: number): Promise<void>;
  stopSerialPlotter(): Promise<void>;
  onSerialPlotterData(callback: (data: any) => void): void;
  removeSerialPlotterListener(callback: (data: any) => void): void;

  // Preferences methods
  getPreferences(): Promise<any>;
  setPreference(key: string, value: any): Promise<void>;
  resetPreferences(): Promise<void>;
  exportPreferences(filePath: string): Promise<void>;
  importPreferences(filePath: string): Promise<void>;
  selectDirectory(): Promise<string | null>;
  selectFile(filters?: any[]): Promise<string | null>;

  // Examples Browser methods
  getArduinoExamples(): Promise<any[]>;
  openArduinoExample(examplePath: string): Promise<void>;
  importArduinoExample(examplePath: string): Promise<void>;

  // Sketch Book Manager methods
  getSketchbook(path?: string): Promise<any[]>;
  createNewSketch(parentPath: string, sketchName: string): Promise<void>;
  deleteSketch(sketchPath: string): Promise<void>;
  renameSketch(sketchPath: string, newName: string): Promise<void>;
  toggleSketchFavorite(sketchPath: string): Promise<void>;
  revealSketchInExplorer(sketchPath: string): Promise<void>;

  // Output Console methods
  onLogEvent(callback: (event: any) => void): void;
  removeLogListener(callback: (event: any) => void): void;
  getOutputLogs(): Promise<any[]>;
  exportOutputLogs(logs: any[]): Promise<void>;

  // New AI Tools methods
  aiTools: {
    initializeAITools(): Promise<void>;
    getQuickActions(): Promise<any[]>;
    getSystemCapabilities(): Promise<any>;
    executeQuickAction(actionId: string): Promise<any>;
    suggestTools(query: string): Promise<any[]>;
    handleUserRequest(query: string, context?: any): Promise<any>;
    recognizeHardware(description: string): Promise<any[]>;
    recognizeHardwareFromImage(imageData: any): Promise<any[]>;
    suggestComponents(requirements: any): Promise<any[]>;
    healthCheck(): Promise<any>;
  };
}

// Note: Window.electronAPI type is declared in the main preload.ts file
// This interface is for reference only - actual implementation in preload.ts
