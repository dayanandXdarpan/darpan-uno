import { EventEmitter } from 'events';
import { TerminalExecutor } from './terminalExecutor';
import { EnhancedArduinoCLI, ArduinoCompileResult, ArduinoUploadResult } from './enhancedArduinoCLI';
import { DeviceManager, DevicePort, IdentifiedDevice } from './deviceManager';
import { EnhancedSerialManager } from './enhancedSerial';
import { ArduinoAutoFixer, FixResult } from './arduinoAutoFixer';
import { ArduinoKnowledgeBase } from './arduinoKnowledgeBase';

export interface ToolbeltRequest {
  type: 'execute' | 'compile' | 'upload' | 'analyze' | 'fix' | 'learn' | 'simulate';
  target?: string;
  code?: string;
  board?: string;
  port?: string;
  library?: string;
  component?: string;
  context?: any;
}

export interface ToolbeltResponse {
  success: boolean;
  data?: any;
  error?: string;
  suggestions?: string[];
  nextSteps?: string[];
  confidence?: number;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  tools: string[];
  estimatedTime: string;
}

/**
 * Arduino Master Assistant - Orchestrates the complete Arduino Agent Toolbelt
 * Integrates all toolbelt services into a unified intelligent development agent
 */
export class ArduinoMasterAssistant extends EventEmitter {
  // Core Toolbelt Services
  private terminalExecutor: TerminalExecutor;
  private arduinoCLI: EnhancedArduinoCLI;
  private deviceManager: DeviceManager;
  private serialManager: EnhancedSerialManager;
  private autoFixer: ArduinoAutoFixer;
  private knowledgeBase: ArduinoKnowledgeBase;
  
  // Agent State
  private capabilities: Map<string, AgentCapability> = new Map();
  private activeProject: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    super();
    
    // Initialize core toolbelt services
    this.terminalExecutor = new TerminalExecutor();
    this.arduinoCLI = new EnhancedArduinoCLI();
    this.deviceManager = new DeviceManager();
    this.serialManager = new EnhancedSerialManager();
    this.autoFixer = new ArduinoAutoFixer(this.arduinoCLI);
    this.knowledgeBase = new ArduinoKnowledgeBase();
    
    this.initializeToolbelt();
    this.setupEventHandlers();
  }

  private async initializeToolbelt(): Promise<void> {
    try {
      console.log('🔧 Initializing Arduino Agent Toolbelt...');
      
      // Register all capabilities
      await this.registerCapabilities();
      
      // Setup inter-service communication
      this.setupServiceIntegration();
      
      this.isInitialized = true;
      this.emit('initialized');
      console.log('✅ Arduino Agent Toolbelt initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize toolbelt:', error);
      this.emit('error', error);
    }
  }

  private async registerCapabilities(): Promise<void> {
    const capabilities: AgentCapability[] = [
      // Part A: Terminal Execution & Commands
      {
        id: 'terminal-execution',
        name: 'Terminal Command Execution',
        description: 'Execute any terminal command with streaming output and pattern matching',
        category: 'infrastructure',
        complexity: 'basic',
        tools: ['run', 'expect', 'parseOutput', 'killProcess'],
        estimatedTime: '1-5 seconds'
      },
      
      // Part D: Arduino CLI Integration
      {
        id: 'arduino-cli',
        name: 'Arduino CLI Operations',
        description: 'Complete Arduino CLI wrapper with enhanced parsing and error handling',
        category: 'development',
        complexity: 'intermediate',
        tools: ['compile', 'upload', 'boardList', 'libInstall', 'sketchCreate'],
        estimatedTime: '5-30 seconds'
      },
      
      // Part E: Device Management
      {
        id: 'device-management',
        name: 'Hardware Device Detection',
        description: 'Intelligent device identification and port management',
        category: 'hardware',
        complexity: 'advanced',
        tools: ['identify', 'reset', 'bootloader', 'portScan', 'firmwareDetect'],
        estimatedTime: '2-10 seconds'
      },
      
      // Part F: Serial I/O & Telemetry
      {
        id: 'serial-communication',
        name: 'Advanced Serial Communication',
        description: 'Pattern matching, data logging, and sensor data parsing',
        category: 'communication',
        complexity: 'intermediate',
        tools: ['open', 'expect', 'record', 'parseSensor', 'export'],
        estimatedTime: '1-60 seconds'
      },
      
      // Part K: Error Recovery
      {
        id: 'auto-recovery',
        name: 'Intelligent Error Recovery',
        description: 'Automatic error detection, diagnosis, and fixing',
        category: 'intelligence',
        complexity: 'expert',
        tools: ['diagnose', 'fix', 'retry', 'suggest', 'learn'],
        estimatedTime: '5-120 seconds'
      },
      
      // Part I: Knowledge Base
      {
        id: 'knowledge-base',
        name: 'Component Knowledge System',
        description: 'Comprehensive database of components, datasheets, and code templates',
        category: 'knowledge',
        complexity: 'basic',
        tools: ['search', 'datasheet', 'pinout', 'template', 'recommend'],
        estimatedTime: '1-5 seconds'
      }
    ];

    capabilities.forEach(cap => this.capabilities.set(cap.id, cap));
    console.log(`📋 Registered ${capabilities.length} agent capabilities`);
  }

  private setupServiceIntegration(): void {
    // Auto-fixer integration with Arduino CLI
    this.arduinoCLI.on('compilationError', async (error) => {
      console.log('🔧 Auto-fixing compilation error...');
      this.emit('autoFixSuggestion', { error, service: 'autoFixer' });
    });

    // Device manager integration
    this.deviceManager.on('deviceDetected', async (device) => {
      console.log(`📱 Device detected: ${device.board} on ${device.port}`);
      this.emit('deviceSuggestion', {
        action: 'monitor',
        device: device,
        suggestion: 'Start serial monitoring?'
      });
    });
  }

  private setupEventHandlers(): void {
    // Forward important events
    this.terminalExecutor.on('commandComplete', (result) => {
      this.emit('terminalResult', result);
    });

    this.arduinoCLI.on('uploadComplete', (result) => {
      this.emit('uploadComplete', result);
      if (result.returns.success) {
        // Auto-suggest serial monitoring
        this.emit('suggestion', {
          type: 'serial',
          message: 'Upload successful! Start serial monitoring?',
          action: 'startSerial'
        });
      }
    });

    this.serialManager.on('dataReceived', (data) => {
      this.emit('serialData', data);
    });
  }

  // Public API Methods

  /**
   * Execute a high-level toolbelt request
   */
  async execute(request: ToolbeltRequest): Promise<ToolbeltResponse> {
    try {
      if (!this.isInitialized) {
        await this.initializeToolbelt();
      }

      console.log(`🚀 Executing ${request.type} request:`, request);

      switch (request.type) {
        case 'compile':
          return await this.handleCompileRequest(request);
        case 'upload':
          return await this.handleUploadRequest(request);
        case 'analyze':
          return await this.handleAnalyzeRequest(request);
        case 'fix':
          return await this.handleFixRequest(request);
        case 'execute':
          return await this.handleExecuteRequest(request);
        default:
          return {
            success: false,
            error: `Unknown request type: ${request.type}`,
            suggestions: ['Try: compile, upload, analyze, fix, execute']
          };
      }
    } catch (error) {
      console.error('❌ Toolbelt execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: ['Check your request parameters', 'Try a simpler operation first']
      };
    }
  }

  private async handleExecuteRequest(request: ToolbeltRequest): Promise<ToolbeltResponse> {
    if (!request.target) {
      return {
        success: false,
        error: 'Command required for execution',
        suggestions: ['Provide a terminal command to execute']
      };
    }

    const result = await this.terminalExecutor.run(request.target);
    
    return {
      success: result.exitCode === 0,
      data: result,
      error: result.stderr,
      suggestions: result.exitCode === 0 ? 
        ['Command completed successfully'] : 
        ['Check command syntax', 'Verify paths', 'Check permissions']
    };
  }

  private async handleCompileRequest(request: ToolbeltRequest): Promise<ToolbeltResponse> {
    if (!request.code && !request.target) {
      return {
        success: false,
        error: 'Code or target file required for compilation',
        suggestions: ['Provide code content or target file path']
      };
    }

    const result = await this.arduinoCLI.compile(
      request.target || 'temp_sketch',
      request.board || 'arduino:avr:uno'
    );

    if (!result.returns.success && result.returns.errors.length > 0) {
      // Suggest auto-fixing include path errors
      const includeErrors = result.returns.errors.filter(e => 
        e.message.includes('No such file') || e.message.includes('#include')
      );
      
      if (includeErrors.length > 0) {
        this.emit('autoFixSuggestion', {
          type: 'include_fix',
          errors: includeErrors,
          projectPath: request.target || 'temp_sketch'
        });
      }
    }

    return {
      success: result.returns.success,
      data: result,
      error: result.returns.stderr,
      suggestions: result.returns.success ? 
        ['Ready to upload to device'] : 
        ['Check code syntax', 'Verify board selection', 'Install missing libraries'],
      nextSteps: result.returns.success ? ['upload'] : ['fix_errors']
    };
  }

  private async handleUploadRequest(request: ToolbeltRequest): Promise<ToolbeltResponse> {
    if (!request.target) {
      return {
        success: false,
        error: 'Target sketch required for upload',
        suggestions: ['Provide sketch path or compile first']
      };
    }

    // Auto-detect device if port not specified
    let port = request.port;
    if (!port) {
      const devices = await this.deviceManager.listPorts();
      const detectedDevice = devices.find(d => d.vendorId && d.productId);
      if (detectedDevice) {
        port = detectedDevice.path;
        console.log(`📱 Auto-detected device on port: ${port}`);
      }
    }

    if (!port) {
      return {
        success: false,
        error: 'No Arduino device found',
        suggestions: ['Connect Arduino device', 'Check USB cable', 'Install drivers']
      };
    }

    const result = await this.arduinoCLI.upload(
      request.target,
      request.board || 'arduino:avr:uno',
      port
    );

    return {
      success: result.returns.success,
      data: result,
      error: result.returns.stderr,
      suggestions: result.returns.success ? 
        ['Upload complete! Start serial monitoring?'] : 
        ['Check device connection', 'Verify board selection', 'Try resetting device'],
      nextSteps: result.returns.success ? ['serial_monitor', 'test_functionality'] : ['diagnose_upload']
    };
  }

  private async handleAnalyzeRequest(request: ToolbeltRequest): Promise<ToolbeltResponse> {
    const analysis: any = {
      timestamp: new Date().toISOString(),
      type: request.type
    };

    if (request.code) {
      // Code analysis
      analysis.codeMetrics = {
        lines: request.code.split('\n').length,
        functions: (request.code.match(/void\s+\w+\s*\(/g) || []).length,
        includes: (request.code.match(/#include\s*[<"]\w+\.h[>"]/g) || []).length
      };

      // Basic component detection
      const sensors = ['DHT', 'BMP', 'MPU', 'analog', 'digital'].filter(component => 
        request.code.toLowerCase().includes(component.toLowerCase())
      );
      analysis.detectedComponents = sensors;

      // Suggestions based on analysis
      const suggestions = [];
      if (analysis.codeMetrics.includes === 0) {
        suggestions.push('Consider adding library includes');
      }
      if (analysis.codeMetrics.functions < 2) {
        suggestions.push('Consider adding helper functions');
      }
      if (sensors.length > 0) {
        suggestions.push('Add sensor calibration routines');
      }

      return {
        success: true,
        data: analysis,
        suggestions: suggestions,
        confidence: 0.8
      };
    }

    if (request.component) {
      // Component knowledge lookup - simplified for now
      const basicInfo = {
        name: request.component,
        category: 'component',
        description: `Basic information for ${request.component}`,
        pins: 'See datasheet for pinout information'
      };
      
      return {
        success: true,
        data: basicInfo,
        suggestions: ['View datasheet', 'Generate example code', 'Check pinout']
      };
    }

    return {
      success: false,
      error: 'No analysis target specified',
      suggestions: ['Provide code or component name for analysis']
    };
  }

  private async handleFixRequest(request: ToolbeltRequest): Promise<ToolbeltResponse> {
    if (!request.context) {
      return {
        success: false,
        error: 'Error context required for fixing',
        suggestions: ['Provide error message or compilation output']
      };
    }

    // Use auto-fixer for include path issues
    if (request.context.includes('No such file') || request.context.includes('#include')) {
      const fix = await this.autoFixer.fixIncludePaths(
        request.target || 'temp_sketch',
        [{ message: request.context }]
      );

      return {
        success: fix.success,
        data: fix,
        error: fix.success ? undefined : 'Unable to automatically fix include paths',
        suggestions: fix.suggestions || [],
        confidence: 0.7
      };
    }

    return {
      success: false,
      error: 'Unable to automatically fix this error type',
      suggestions: ['Try manual debugging', 'Check Arduino documentation', 'Ask for help']
    };
  }

  // Utility Methods

  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getStatus(): any {
    return {
      initialized: this.isInitialized,
      activeProject: this.activeProject,
      capabilities: this.capabilities.size,
      services: {
        terminal: 'TerminalExecutor',
        arduino: 'EnhancedArduinoCLI',
        device: 'DeviceManager',
        serial: 'EnhancedSerialManager',
        autofix: 'ArduinoAutoFixer',
        knowledge: 'ArduinoKnowledgeBase'
      }
    };
  }

  // Quick Actions for common tasks
  
  async quickCompile(sketchPath: string, board?: string): Promise<ToolbeltResponse> {
    return this.execute({
      type: 'compile',
      target: sketchPath,
      board: board || 'arduino:avr:uno'
    });
  }

  async quickUpload(sketchPath: string, port?: string, board?: string): Promise<ToolbeltResponse> {
    return this.execute({
      type: 'upload',
      target: sketchPath,
      port: port,
      board: board || 'arduino:avr:uno'
    });
  }

  async quickDeploy(sketchPath: string, board?: string): Promise<ToolbeltResponse> {
    // Compile first, then upload if successful
    const compileResult = await this.quickCompile(sketchPath, board);
    if (!compileResult.success) {
      return compileResult;
    }

    return this.quickUpload(sketchPath, undefined, board);
  }

  async detectDevices(): Promise<DevicePort[]> {
    return this.deviceManager.listPorts();
  }

  async identifyDevice(port: string): Promise<IdentifiedDevice | null> {
    return this.deviceManager.identify(port);
  }
}

export default ArduinoMasterAssistant;
