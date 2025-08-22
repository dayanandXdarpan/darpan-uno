import { EventEmitter } from 'events';
import { ArduinoCodeGenAI, ArduinoProjectAI, SpecializedArduinoAI, AIToolContext, CodeGenerationRequest } from './arduinoAITools';
import { AIHardwareRecognition, HardwareComponent, ProjectRequirements } from './aiHardwareRecognition';
import { ReferenceManager } from './referenceManager';
import ArduinoPromptEngine, { PromptTemplate, DevelopmentWorkflow } from './arduinoPromptEngine';

export interface SmartToolRequest {
  userQuery: string;
  projectContext?: Partial<AIToolContext>;
  requestType: 'code-generation' | 'component-selection' | 'project-planning' | 'troubleshooting' | 'learning' | 'optimization';
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  outputFormat: 'code' | 'documentation' | 'tutorial' | 'checklist' | 'diagram' | 'comprehensive';
}

export interface SmartToolResponse {
  analysis: {
    requestType: string;
    complexity: 'low' | 'medium' | 'high' | 'expert';
    estimatedTime: string;
    recommendedApproach: string;
  };
  primaryResult: {
    type: 'code' | 'plan' | 'guide' | 'selection' | 'analysis';
    content: string;
    metadata: Record<string, any>;
  };
  supportingMaterials: {
    codeExamples?: string[];
    componentRecommendations?: HardwareComponent[];
    wiring?: string;
    troubleshooting?: string[];
    nextSteps?: string[];
    learningResources?: string[];
  };
  tools: {
    usedTemplates: string[];
    recommendedWorkflow?: string;
    additionalTools: string[];
  };
  validation: {
    checklist: string[];
    commonPitfalls: string[];
    testingStrategy: string[];
  };
}

export class ArduinoSmartToolEngine extends EventEmitter {
  private codeGenAI: ArduinoCodeGenAI;
  private projectAI: ArduinoProjectAI;
  private specializedAI: SpecializedArduinoAI;
  private hardwareRecognition: AIHardwareRecognition;
  private promptEngine: ArduinoPromptEngine;
  private referenceManager: ReferenceManager;

  constructor(referenceManager: ReferenceManager) {
    super();
    this.referenceManager = referenceManager;
    this.hardwareRecognition = new AIHardwareRecognition(referenceManager);
    this.codeGenAI = new ArduinoCodeGenAI(referenceManager, this.hardwareRecognition);
    this.projectAI = new ArduinoProjectAI(this.codeGenAI, this.hardwareRecognition);
    this.specializedAI = new SpecializedArduinoAI(this.codeGenAI, this.projectAI, this.hardwareRecognition);
    this.promptEngine = new ArduinoPromptEngine();
  }

  async processSmartRequest(request: SmartToolRequest): Promise<SmartToolResponse> {
    this.emit('request-received', request);

    // Analyze the request
    const analysis = await this.analyzeRequest(request);
    
    // Determine the best tool and approach
    const toolStrategy = await this.selectOptimalStrategy(request, analysis);
    
    // Generate the primary result
    const primaryResult = await this.generatePrimaryResult(request, analysis, toolStrategy);
    
    // Generate supporting materials
    const supportingMaterials = await this.generateSupportingMaterials(request, analysis, primaryResult);
    
    // Create validation checklist
    const validation = await this.generateValidation(request, analysis, primaryResult);
    
    const response: SmartToolResponse = {
      analysis,
      primaryResult,
      supportingMaterials,
      tools: toolStrategy,
      validation
    };

    this.emit('response-generated', response);
    return response;
  }

  private async analyzeRequest(request: SmartToolRequest): Promise<SmartToolResponse['analysis']> {
    const queryLower = request.userQuery.toLowerCase();
    
    // Determine request complexity
    let complexity: 'low' | 'medium' | 'high' | 'expert' = 'medium';
    
    const complexityIndicators = {
      low: ['simple', 'basic', 'beginner', 'led', 'button', 'blink'],
      medium: ['sensor', 'display', 'motor', 'communication', 'wifi', 'bluetooth'],
      high: ['system', 'integration', 'multiple', 'real-time', 'precision', 'control'],
      expert: ['industrial', 'safety', 'custom', 'protocol', 'optimization', 'machine learning']
    };

    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => queryLower.includes(indicator))) {
        complexity = level as any;
      }
    }

    // Estimate time based on complexity and request type
    const timeEstimates = {
      'code-generation': { low: '1-2 hours', medium: '3-6 hours', high: '1-2 days', expert: '3-5 days' },
      'component-selection': { low: '30 minutes', medium: '1-2 hours', high: '2-4 hours', expert: '1 day' },
      'project-planning': { low: '1-2 hours', medium: '4-8 hours', high: '1-3 days', expert: '1-2 weeks' },
      'troubleshooting': { low: '15-30 minutes', medium: '1-2 hours', high: '3-6 hours', expert: '1-2 days' },
      'learning': { low: '30-60 minutes', medium: '2-4 hours', high: '1-2 days', expert: '1 week' },
      'optimization': { low: '1-2 hours', medium: '3-6 hours', high: '1-2 days', expert: '3-5 days' }
    };

    const estimatedTime = timeEstimates[request.requestType][complexity];

    // Recommend approach based on request analysis
    const recommendedApproach = this.determineRecommendedApproach(request, complexity);

    return {
      requestType: request.requestType,
      complexity,
      estimatedTime,
      recommendedApproach
    };
  }

  private determineRecommendedApproach(request: SmartToolRequest, complexity: string): string {
    const approaches = {
      'code-generation': {
        low: 'Use template-based generation with minimal customization',
        medium: 'Combine templates with custom logic and error handling',
        high: 'Design modular architecture with comprehensive testing',
        expert: 'Implement custom algorithms with optimization and validation'
      },
      'component-selection': {
        low: 'Use pre-selected component combinations for common projects',
        medium: 'Analyze requirements and recommend suitable components',
        high: 'Perform detailed compatibility analysis and cost optimization',
        expert: 'Custom component analysis with performance modeling'
      },
      'project-planning': {
        low: 'Follow established workflow templates with basic customization',
        medium: 'Adapt workflows based on specific requirements and constraints',
        high: 'Design custom workflow with risk analysis and mitigation',
        expert: 'Comprehensive planning with advanced methodologies and tools'
      },
      'troubleshooting': {
        low: 'Check common issues and basic debugging steps',
        medium: 'Systematic diagnosis with component and code analysis',
        high: 'Advanced debugging with instrumentation and testing',
        expert: 'Root cause analysis with comprehensive system evaluation'
      },
      'learning': {
        low: 'Structured tutorials with step-by-step guidance',
        medium: 'Interactive learning with practical examples and exercises',
        high: 'Advanced concepts with real-world project integration',
        expert: 'Research-level topics with cutting-edge techniques'
      },
      'optimization': {
        low: 'Basic performance improvements and code cleanup',
        medium: 'Algorithmic optimization and resource management',
        high: 'System-level optimization with profiling and analysis',
        expert: 'Advanced optimization with custom algorithms and hardware tuning'
      }
    };

    return approaches[request.requestType][complexity] || 'Standard approach based on best practices';
  }

  private async selectOptimalStrategy(
    request: SmartToolRequest, 
    analysis: SmartToolResponse['analysis']
  ): Promise<SmartToolResponse['tools']> {
    const usedTemplates: string[] = [];
    let recommendedWorkflow: string | undefined;
    const additionalTools: string[] = [];

    // Select templates based on request content
    const promptSuggestions = await this.promptEngine.suggestPrompts(
      request.userQuery, 
      request.projectContext || {}
    );

    if (promptSuggestions.templates.length > 0) {
      usedTemplates.push(...promptSuggestions.templates.slice(0, 3).map(t => t.id));
    }

    if (promptSuggestions.workflows.length > 0) {
      recommendedWorkflow = promptSuggestions.workflows[0].id;
    }

    // Determine additional tools based on request type and complexity
    switch (request.requestType) {
      case 'code-generation':
        additionalTools.push('syntax-validator', 'performance-analyzer');
        if (analysis.complexity === 'high' || analysis.complexity === 'expert') {
          additionalTools.push('architecture-designer', 'test-generator');
        }
        break;

      case 'component-selection':
        additionalTools.push('compatibility-checker', 'cost-optimizer');
        if (analysis.complexity === 'high' || analysis.complexity === 'expert') {
          additionalTools.push('performance-modeler', 'lifecycle-analyzer');
        }
        break;

      case 'project-planning':
        additionalTools.push('timeline-estimator', 'resource-planner');
        if (analysis.complexity === 'high' || analysis.complexity === 'expert') {
          additionalTools.push('risk-analyzer', 'stakeholder-manager');
        }
        break;

      case 'troubleshooting':
        additionalTools.push('diagnostic-wizard', 'error-analyzer');
        additionalTools.push('solution-finder', 'knowledge-base');
        break;

      case 'learning':
        additionalTools.push('tutorial-generator', 'progress-tracker');
        additionalTools.push('example-finder', 'practice-generator');
        break;

      case 'optimization':
        additionalTools.push('performance-profiler', 'resource-analyzer');
        if (analysis.complexity === 'high' || analysis.complexity === 'expert') {
          additionalTools.push('algorithm-optimizer', 'hardware-tuner');
        }
        break;
    }

    return {
      usedTemplates,
      recommendedWorkflow,
      additionalTools
    };
  }

  private async generatePrimaryResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis'],
    toolStrategy: SmartToolResponse['tools']
  ): Promise<SmartToolResponse['primaryResult']> {
    switch (request.requestType) {
      case 'code-generation':
        return await this.generateCodeResult(request, analysis, toolStrategy);
      
      case 'component-selection':
        return await this.generateComponentSelectionResult(request, analysis);
      
      case 'project-planning':
        return await this.generateProjectPlanResult(request, analysis);
      
      case 'troubleshooting':
        return await this.generateTroubleshootingResult(request, analysis);
      
      case 'learning':
        return await this.generateLearningResult(request, analysis);
      
      case 'optimization':
        return await this.generateOptimizationResult(request, analysis);
      
      default:
        return {
          type: 'analysis',
          content: 'Request type not recognized. Please specify a valid request type.',
          metadata: { error: 'Unknown request type' }
        };
    }
  }

  private async generateCodeResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis'],
    toolStrategy: SmartToolResponse['tools']
  ): Promise<SmartToolResponse['primaryResult']> {
    // Create a context from the request
    const context: AIToolContext = {
      projectType: 'sensor-project',
      targetBoard: 'arduino-uno',
      experienceLevel: request.targetAudience,
      programmingLanguage: 'arduino-c',
      communicationProtocols: [],
      powerRequirements: 'usb',
      environmentalConditions: 'indoor',
      ...request.projectContext
    };

    // Create code generation request
    const codeRequest: CodeGenerationRequest = {
      description: request.userQuery,
      components: [], // Will be populated by component recognition
      features: this.extractFeatures(request.userQuery),
      codeStyle: request.outputFormat === 'tutorial' ? 'educational' : 'clean',
      includeLibraries: true,
      includeTesting: analysis.complexity === 'high' || analysis.complexity === 'expert',
      optimizeFor: analysis.complexity === 'expert' ? 'performance' : 'readability'
    };

    // Recognize components from the query
    const recognizedComponents = await this.hardwareRecognition.recognizeFromDescription(request.userQuery);
    if (recognizedComponents.length > 0) {
      codeRequest.components = recognizedComponents.slice(0, 5).map(r => r.component.id);
    }

    // Generate code using the AI
    const codeResult = await this.codeGenAI.generateCode(codeRequest, context);

    let content = '';
    
    switch (request.outputFormat) {
      case 'code':
        content = codeResult.mainCode;
        break;
      
      case 'tutorial':
        content = this.formatAsTutorial(codeResult, codeRequest, context);
        break;
      
      case 'comprehensive':
        content = this.formatAsComprehensiveGuide(codeResult, codeRequest, context);
        break;
      
      default:
        content = codeResult.mainCode;
    }

    return {
      type: 'code',
      content,
      metadata: {
        codeResult,
        context,
        request: codeRequest,
        resourceUsage: codeResult.estimatedResourceUsage
      }
    };
  }

  private async generateComponentSelectionResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis']
  ): Promise<SmartToolResponse['primaryResult']> {
    // Create project requirements from the request
    const requirements: ProjectRequirements = {
      description: request.userQuery,
      functions: this.extractFeatures(request.userQuery),
      constraints: {
        experienceLevel: request.targetAudience === 'expert' ? 'advanced' : request.targetAudience,
        operatingEnvironment: 'indoor',
        budget: analysis.complexity === 'low' ? 50 : analysis.complexity === 'medium' ? 100 : 200
      }
    };

    // Get component suggestions
    const suggestions = await this.hardwareRecognition.suggestComponents(requirements);
    
    let content = '';
    
    switch (request.outputFormat) {
      case 'checklist':
        content = this.formatAsComponentChecklist(suggestions, requirements);
        break;
      
      case 'comprehensive':
        content = this.formatAsComponentGuide(suggestions, requirements);
        break;
      
      default:
        content = this.formatAsComponentList(suggestions, requirements);
    }

    return {
      type: 'selection',
      content,
      metadata: {
        suggestions,
        requirements,
        totalCost: suggestions.reduce((sum, s) => sum + (s.component.price || 0), 0)
      }
    };
  }

  private async generateProjectPlanResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis']
  ): Promise<SmartToolResponse['primaryResult']> {
    const requirements: ProjectRequirements = {
      description: request.userQuery,
      functions: this.extractFeatures(request.userQuery),
      constraints: {
        experienceLevel: request.targetAudience === 'expert' ? 'advanced' : request.targetAudience,
        budget: analysis.complexity === 'low' ? 100 : analysis.complexity === 'medium' ? 300 : 500
      }
    };

    const projectPlan = await this.projectAI.planProject(requirements);
    
    let content = '';
    
    switch (request.outputFormat) {
      case 'checklist':
        content = this.formatAsProjectChecklist(projectPlan);
        break;
      
      case 'comprehensive':
        content = projectPlan.projectPlan + '\n\n' + this.formatProjectDetails(projectPlan);
        break;
      
      default:
        content = projectPlan.projectPlan;
    }

    return {
      type: 'plan',
      content,
      metadata: {
        projectPlan,
        timeline: projectPlan.estimatedTimeline,
        budget: projectPlan.budgetEstimate
      }
    };
  }

  private async generateTroubleshootingResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis']
  ): Promise<SmartToolResponse['primaryResult']> {
    const troubleshootingSteps = this.generateTroubleshootingSteps(request.userQuery, analysis.complexity);
    
    let content = '';
    
    switch (request.outputFormat) {
      case 'checklist':
        content = this.formatAsTroubleshootingChecklist(troubleshootingSteps);
        break;
      
      case 'comprehensive':
        content = this.formatAsTroubleshootingGuide(troubleshootingSteps, request.userQuery);
        break;
      
      default:
        content = troubleshootingSteps.join('\n\n');
    }

    return {
      type: 'guide',
      content,
      metadata: {
        issueType: this.classifyIssue(request.userQuery),
        complexity: analysis.complexity
      }
    };
  }

  private async generateLearningResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis']
  ): Promise<SmartToolResponse['primaryResult']> {
    const learningPath = this.generateLearningPath(request.userQuery, request.targetAudience);
    
    let content = '';
    
    switch (request.outputFormat) {
      case 'tutorial':
        content = this.formatAsLearningTutorial(learningPath, request.userQuery);
        break;
      
      case 'comprehensive':
        content = this.formatAsCompleteLearningGuide(learningPath, request.userQuery);
        break;
      
      default:
        content = learningPath.join('\n\n');
    }

    return {
      type: 'guide',
      content,
      metadata: {
        learningLevel: request.targetAudience,
        estimatedTime: analysis.estimatedTime
      }
    };
  }

  private async generateOptimizationResult(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis']
  ): Promise<SmartToolResponse['primaryResult']> {
    const optimizationStrategies = this.generateOptimizationStrategies(request.userQuery, analysis.complexity);
    
    let content = '';
    
    switch (request.outputFormat) {
      case 'checklist':
        content = this.formatAsOptimizationChecklist(optimizationStrategies);
        break;
      
      case 'comprehensive':
        content = this.formatAsOptimizationGuide(optimizationStrategies, request.userQuery);
        break;
      
      default:
        content = optimizationStrategies.join('\n\n');
    }

    return {
      type: 'analysis',
      content,
      metadata: {
        optimizationType: this.classifyOptimization(request.userQuery),
        complexity: analysis.complexity
      }
    };
  }

  private async generateSupportingMaterials(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis'],
    primaryResult: SmartToolResponse['primaryResult']
  ): Promise<SmartToolResponse['supportingMaterials']> {
    const materials: SmartToolResponse['supportingMaterials'] = {};

    // Generate code examples if relevant
    if (request.requestType === 'code-generation' || request.requestType === 'learning') {
      materials.codeExamples = await this.generateCodeExamples(request.userQuery, request.targetAudience);
    }

    // Get component recommendations
    if (request.requestType === 'component-selection' || request.requestType === 'project-planning') {
      const requirements: ProjectRequirements = {
        description: request.userQuery,
        functions: this.extractFeatures(request.userQuery),
        constraints: { experienceLevel: request.targetAudience === 'expert' ? 'advanced' : request.targetAudience }
      };
      const suggestions = await this.hardwareRecognition.suggestComponents(requirements);
      materials.componentRecommendations = suggestions.slice(0, 5).map(s => s.component);
    }

    // Generate wiring diagram description
    if (materials.componentRecommendations && materials.componentRecommendations.length > 0) {
      materials.wiring = await this.hardwareRecognition.generateWiringDiagram(
        materials.componentRecommendations.map(c => c.id)
      );
    }

    // Generate troubleshooting tips
    materials.troubleshooting = this.generateTroubleshootingTips(request.userQuery, analysis.complexity);

    // Generate next steps
    materials.nextSteps = this.generateNextSteps(request, analysis);

    // Generate learning resources
    materials.learningResources = this.generateLearningResources(request.userQuery, request.targetAudience);

    return materials;
  }

  private async generateValidation(
    request: SmartToolRequest,
    analysis: SmartToolResponse['analysis'],
    primaryResult: SmartToolResponse['primaryResult']
  ): Promise<SmartToolResponse['validation']> {
    const checklist = this.generateValidationChecklist(request, analysis);
    const commonPitfalls = this.generateCommonPitfalls(request.userQuery, request.targetAudience);
    const testingStrategy = this.generateTestingStrategy(request, analysis);

    return {
      checklist,
      commonPitfalls,
      testingStrategy
    };
  }

  // Utility methods for formatting and content generation
  private extractFeatures(query: string): string[] {
    const features: string[] = [];
    const queryLower = query.toLowerCase();

    // Extract common features from the query
    const featureKeywords = {
      'temperature monitoring': ['temperature', 'temp', 'thermal', 'heat'],
      'motion detection': ['motion', 'movement', 'pir', 'detect'],
      'distance measurement': ['distance', 'range', 'ultrasonic', 'proximity'],
      'data logging': ['log', 'record', 'store', 'save'],
      'wireless communication': ['wifi', 'bluetooth', 'wireless', 'remote'],
      'display output': ['display', 'screen', 'lcd', 'oled', 'show'],
      'motor control': ['motor', 'servo', 'stepper', 'actuator'],
      'sensor reading': ['sensor', 'read', 'measure', 'detect'],
      'led control': ['led', 'light', 'indicator', 'illumination'],
      'button input': ['button', 'switch', 'input', 'press']
    };

    Object.entries(featureKeywords).forEach(([feature, keywords]) => {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        features.push(feature);
      }
    });

    return features.length > 0 ? features : ['basic functionality'];
  }

  private formatAsTutorial(codeResult: any, request: CodeGenerationRequest, context: AIToolContext): string {
    return `# Arduino Tutorial: ${request.description}

## Introduction
This tutorial will guide you through creating ${request.description.toLowerCase()} using Arduino.

## What You'll Learn
- How to set up the hardware components
- Programming concepts for ${context.projectType}
- Best practices for ${context.targetBoard}

## Components Needed
${request.components.map(c => `- ${c}`).join('\n')}

## Step 1: Hardware Setup
Connect your components according to the wiring diagram below.

## Step 2: Understanding the Code
Let me explain each part of the code:

\`\`\`cpp
${codeResult.mainCode}
\`\`\`

## Key Programming Concepts
- Pin configuration and modes
- Reading sensor data
- Error handling and validation
- Serial communication for debugging

## Step 3: Testing and Validation
1. Upload the code to your Arduino
2. Open the Serial Monitor
3. Verify that readings are displayed correctly
4. Test edge cases and error conditions

## Troubleshooting
Common issues and their solutions:
- Check all connections
- Verify power supply
- Confirm library installations
- Review Serial Monitor output

## Next Steps
- Experiment with different settings
- Add additional features
- Create a custom enclosure
- Share your project with the community`;
  }

  private formatAsComprehensiveGuide(codeResult: any, request: CodeGenerationRequest, context: AIToolContext): string {
    return `# Comprehensive Arduino Project Guide: ${request.description}

## Project Overview
${request.description}

## System Architecture
This project implements a ${context.projectType} using ${context.targetBoard} with the following components:
${request.components.map(c => `- ${c}`).join('\n')}

## Technical Specifications
- Target Board: ${context.targetBoard}
- Programming Language: ${context.programmingLanguage}
- Power Requirements: ${context.powerRequirements}
- Operating Environment: ${context.environmentalConditions}

## Complete Source Code
\`\`\`cpp
${codeResult.mainCode}
\`\`\`

## Resource Usage Analysis
${JSON.stringify(codeResult.estimatedResourceUsage, null, 2)}

## Implementation Notes
${codeResult.comments?.join('\n') || 'No additional comments available.'}

## Testing Strategy
${codeResult.testingCode || 'Basic functionality testing recommended.'}

## Documentation
${codeResult.documentation}

## Wiring Diagram
${codeResult.schematic || 'Refer to component datasheets for specific wiring.'}

## Performance Optimization
Consider the following optimizations for production use:
- Memory usage optimization
- Power consumption reduction
- Code execution efficiency
- Error handling enhancement

## Maintenance and Support
- Regular testing of sensor accuracy
- Periodic calibration procedures
- Software update procedures
- Hardware inspection guidelines`;
  }

  private formatAsComponentChecklist(suggestions: any[], requirements: ProjectRequirements): string {
    return `# Component Selection Checklist

## Project Requirements
${requirements.description}

## Required Functions
${requirements.functions.map(f => `- [ ] ${f}`).join('\n')}

## Recommended Components

### Primary Components
${suggestions.slice(0, 3).map((s, i) => `${i + 1}. **${s.component.name}**
   - [ ] Verify compatibility with chosen microcontroller
   - [ ] Check operating voltage requirements
   - [ ] Confirm availability and price ($${s.component.price || 'TBD'})
   - [ ] Review datasheet and specifications`).join('\n\n')}

### Supporting Components
- [ ] Breadboard or PCB for prototyping
- [ ] Jumper wires and connectors
- [ ] Power supply (appropriate voltage/current)
- [ ] Resistors (pull-up, current limiting)
- [ ] Capacitors (if needed for power filtering)

## Pre-Purchase Verification
- [ ] All components are compatible with each other
- [ ] Total budget is within constraints
- [ ] All necessary tools are available
- [ ] Shipping and availability confirmed

## Post-Purchase Testing
- [ ] Test each component individually
- [ ] Verify pin assignments and connections
- [ ] Confirm proper operation before integration
- [ ] Document any issues or modifications needed`;
  }

  private generateTroubleshootingSteps(query: string, complexity: string): string[] {
    const steps = [
      '1. **Initial Assessment**\n   - Clearly describe the problem\n   - Note when the issue occurs\n   - Document any error messages',
      
      '2. **Basic Hardware Checks**\n   - Verify all connections are secure\n   - Check power supply voltage and current\n   - Ensure components are properly seated',
      
      '3. **Software Verification**\n   - Confirm code compiles without errors\n   - Check for correct pin assignments\n   - Verify library installations',
      
      '4. **Serial Monitor Debugging**\n   - Add debug print statements\n   - Monitor sensor readings in real-time\n   - Check for unexpected values or patterns'
    ];

    if (complexity === 'high' || complexity === 'expert') {
      steps.push(
        '5. **Advanced Diagnostics**\n   - Use oscilloscope for signal analysis\n   - Measure voltage levels at critical points\n   - Analyze timing and protocol compliance',
        
        '6. **Systematic Component Testing**\n   - Test each component individually\n   - Swap components if duplicates available\n   - Use known-good components for comparison'
      );
    }

    steps.push(
      `${steps.length + 1}. **Documentation and Support**\n   - Document findings and solutions\n   - Search community forums and documentation\n   - Contact technical support if needed`
    );

    return steps;
  }

  private generateLearningPath(query: string, audience: string): string[] {
    const basePath = [
      '**Arduino Fundamentals**\n   - Understanding microcontrollers\n   - Arduino IDE setup and usage\n   - Basic programming concepts',
      
      '**Electronics Basics**\n   - Voltage, current, and resistance\n   - Digital vs analog signals\n   - Reading schematics and datasheets',
      
      '**Programming Concepts**\n   - Variables and data types\n   - Functions and control structures\n   - Libraries and code organization'
    ];

    if (audience === 'intermediate' || audience === 'advanced' || audience === 'expert') {
      basePath.push(
        '**Advanced Topics**\n   - Interrupt handling\n   - Communication protocols (I2C, SPI, UART)\n   - Power management and optimization',
        
        '**Project Development**\n   - System design and architecture\n   - Testing and validation procedures\n   - Documentation and maintenance'
      );
    }

    if (audience === 'expert') {
      basePath.push(
        '**Professional Development**\n   - Custom PCB design\n   - Regulatory compliance and safety\n   - Production and manufacturing considerations'
      );
    }

    return basePath;
  }

  private generateOptimizationStrategies(query: string, complexity: string): string[] {
    const strategies = [
      '**Code Optimization**\n   - Remove unnecessary delays and blocking operations\n   - Use efficient algorithms and data structures\n   - Minimize memory allocation and deallocation',
      
      '**Performance Optimization**\n   - Optimize loop structures and conditional statements\n   - Use appropriate data types for variables\n   - Implement efficient state machines',
      
      '**Resource Management**\n   - Monitor and optimize memory usage\n   - Reduce power consumption for battery projects\n   - Optimize I/O operations and timing'
    ];

    if (complexity === 'high' || complexity === 'expert') {
      strategies.push(
        '**Advanced Optimization**\n   - Assembly language optimization for critical sections\n   - Hardware acceleration and dedicated processors\n   - Custom algorithms for specific requirements',
        
        '**System-Level Optimization**\n   - Optimize component selection and placement\n   - Implement predictive algorithms and caching\n   - Use parallel processing and multi-threading where applicable'
      );
    }

    return strategies;
  }

  // Additional utility methods
  private generateCodeExamples(query: string, audience: string): string[] {
    return [
      '// Basic sensor reading example',
      '// Error handling implementation',
      '// Communication protocol example'
    ];
  }

  private generateTroubleshootingTips(query: string, complexity: string): string[] {
    return [
      'Check all physical connections',
      'Verify power supply specifications',
      'Review code for logical errors',
      'Test components individually'
    ];
  }

  private generateNextSteps(request: SmartToolRequest, analysis: SmartToolResponse['analysis']): string[] {
    return [
      'Review and understand the provided solution',
      'Gather required components and tools',
      'Set up development environment',
      'Implement and test the solution',
      'Document your results and learnings'
    ];
  }

  private generateLearningResources(query: string, audience: string): string[] {
    return [
      'Arduino official documentation',
      'Component datasheets and specifications',
      'Community forums and tutorials',
      'Advanced programming resources'
    ];
  }

  private generateValidationChecklist(request: SmartToolRequest, analysis: SmartToolResponse['analysis']): string[] {
    return [
      'All requirements are addressed',
      'Code compiles without errors',
      'Hardware connections are verified',
      'Testing procedures are defined',
      'Documentation is complete'
    ];
  }

  private generateCommonPitfalls(query: string, audience: string): string[] {
    return [
      'Incorrect pin assignments',
      'Power supply issues',
      'Missing pull-up resistors',
      'Timing and delay problems',
      'Library compatibility issues'
    ];
  }

  private generateTestingStrategy(request: SmartToolRequest, analysis: SmartToolResponse['analysis']): string[] {
    return [
      'Unit testing of individual components',
      'Integration testing of complete system',
      'Performance testing under various conditions',
      'Error handling and edge case testing',
      'Long-term reliability testing'
    ];
  }

  private classifyIssue(query: string): string {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('compile') || queryLower.includes('error')) return 'compilation';
    if (queryLower.includes('upload') || queryLower.includes('flash')) return 'upload';
    if (queryLower.includes('sensor') || queryLower.includes('read')) return 'sensor';
    if (queryLower.includes('display') || queryLower.includes('screen')) return 'display';
    if (queryLower.includes('communication') || queryLower.includes('connect')) return 'communication';
    return 'general';
  }

  private classifyOptimization(query: string): string {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('speed') || queryLower.includes('performance')) return 'performance';
    if (queryLower.includes('memory') || queryLower.includes('ram')) return 'memory';
    if (queryLower.includes('power') || queryLower.includes('battery')) return 'power';
    if (queryLower.includes('size') || queryLower.includes('space')) return 'size';
    return 'general';
  }

  private formatAsComponentGuide(suggestions: any[], requirements: ProjectRequirements): string {
    return `# Component Selection Guide\n\n${suggestions.map(s => `## ${s.component.name}\n${s.component.description}\n**Price:** $${s.component.price || 'TBD'}\n**Reason:** ${s.reason}`).join('\n\n')}`;
  }

  private formatAsComponentList(suggestions: any[], requirements: ProjectRequirements): string {
    return suggestions.map(s => `${s.component.name} - $${s.component.price || 'TBD'}`).join('\n');
  }

  private formatAsProjectChecklist(projectPlan: any): string {
    return `# Project Checklist\n\n${projectPlan.implementationPhases.map((phase: string, i: number) => `- [ ] ${phase}`).join('\n')}`;
  }

  private formatProjectDetails(projectPlan: any): string {
    return `## Timeline: ${projectPlan.estimatedTimeline}\n## Budget: $${projectPlan.budgetEstimate}\n## Risks:\n${projectPlan.riskAssessment.map((risk: string) => `- ${risk}`).join('\n')}`;
  }

  private formatAsTroubleshootingChecklist(steps: string[]): string {
    return steps.map((step, i) => `- [ ] ${step.replace(/^\d+\.\s*/, '')}`).join('\n');
  }

  private formatAsTroubleshootingGuide(steps: string[], query: string): string {
    return `# Troubleshooting Guide: ${query}\n\n${steps.join('\n\n')}`;
  }

  private formatAsLearningTutorial(path: string[], query: string): string {
    return `# Learning Tutorial: ${query}\n\n${path.join('\n\n')}`;
  }

  private formatAsCompleteLearningGuide(path: string[], query: string): string {
    return `# Complete Learning Guide: ${query}\n\n${path.join('\n\n')}\n\n## Practice Projects\n- Start with simple examples\n- Build complexity gradually\n- Document your progress`;
  }

  private formatAsOptimizationChecklist(strategies: string[]): string {
    return strategies.map(strategy => `- [ ] ${strategy.replace(/^\*\*.*?\*\*\n/, '')}`).join('\n');
  }

  private formatAsOptimizationGuide(strategies: string[], query: string): string {
    return `# Optimization Guide: ${query}\n\n${strategies.join('\n\n')}`;
  }
}

export default ArduinoSmartToolEngine;
