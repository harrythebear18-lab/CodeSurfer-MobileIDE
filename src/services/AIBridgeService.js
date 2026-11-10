import { NativeModules, Platform } from 'react-native';
import USBStorageService from './usbStorageService';

const { AIBridgeModule } = NativeModules;

const AI_BACKEND = {
  SAMSUNG_GALAXY_AI: 'samsung_galaxy_ai',
  GEMINI_NANO: 'gemini_nano',
  QWEN_LLAMACPP: 'qwen_llamacpp',
  OLLAMA_HTTP: 'ollama_http',
  MOCK: 'mock',
};

const TASK_TYPE = {
  GENERATE_CODE: 'generate_code',
  EXPLAIN_CODE: 'explain_code',
  FIX_CODE: 'fix_code',
  COMPLETE_CODE: 'complete_code',
  CHAT: 'chat',
  ANALYZE_CODE: 'analyze_code',
  ANALYZE_ERROR: 'analyze_error',
  CODE_REVIEW: 'code_review',
  DEBUG_SUMMARY: 'debug_summary',
};

class AIBridgeService {
  constructor() {
    this.availableBackends = [];
    this.preferredBackend = null;
    this.initialized = false;
    this.ollamaUrl = 'http://127.0.0.1:11434';
    this.ollamaModel = 'qwen2.5-coder:7b';
    this.modelPath = null;
    this.modelFromUSB = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Check for USB OTG connection and model
      const usbConnected = await USBStorageService.checkUSBConnected();
      if (usbConnected) {
        const usbModel = await USBStorageService.findModelOnUSB();
        if (usbModel) {
          this.modelPath = usbModel;
          this.modelFromUSB = true;
          console.log(`AIBridge: Model found on USB OTG: ${usbModel}`);
        }
      }

      // Fall back to internal model if no USB model
      if (!this.modelPath) {
        const internalModel = await USBStorageService.getModelPath();
        if (internalModel) {
          this.modelPath = internalModel;
          this.modelFromUSB = false;
          console.log(`AIBridge: Model found in internal storage: ${internalModel}`);
        }
      }

      if (Platform.OS === 'android' && AIBridgeModule) {
        const backends = await AIBridgeModule.detectBackends();
        this.availableBackends = backends || [];

        // If we have a model path, ensure QWEN_LLAMACPP is in available backends
        if (this.modelPath && !this.availableBackends.includes(AI_BACKEND.QWEN_LLAMACPP)) {
          this.availableBackends.push(AI_BACKEND.QWEN_LLAMACPP);
        }

        // Pass model path to native module if supported
        if (AIBridgeModule.setModelPath && this.modelPath) {
          await AIBridgeModule.setModelPath(this.modelPath);
        }
      } else {
        this.availableBackends = [AI_BACKEND.MOCK];
      }

      this.preferredBackend = this.selectBestBackend();
      this.initialized = true;

      console.log(`AIBridge initialized. Available: [${this.availableBackends.join(', ')}], Preferred: ${this.preferredBackend}, Model: ${this.modelPath || 'none'}`);
    } catch (error) {
      console.error('AIBridge initialization failed:', error);
      this.availableBackends = [AI_BACKEND.MOCK];
      this.preferredBackend = AI_BACKEND.MOCK;
      this.initialized = true;
    }
  }

  selectBestBackend() {
    const priority = [
      AI_BACKEND.SAMSUNG_GALAXY_AI,
      AI_BACKEND.GEMINI_NANO,
      AI_BACKEND.QWEN_LLAMACPP,
      AI_BACKEND.OLLAMA_HTTP,
      AI_BACKEND.MOCK,
    ];

    for (const backend of priority) {
      if (this.availableBackends.includes(backend)) {
        return backend;
      }
    }

    return AI_BACKEND.MOCK;
  }

  setPreferredBackend(backend) {
    if (this.availableBackends.includes(backend)) {
      this.preferredBackend = backend;
      return true;
    }
    return false;
  }

  setOllamaConfig(url, model) {
    this.ollamaUrl = url || this.ollamaUrl;
    this.ollamaModel = model || this.ollamaModel;
  }

  setModelPath(path) {
    this.modelPath = path;
    this.modelFromUSB = path && path.includes('/mnt/') || (path && path.includes('/storage/'));
    if (Platform.OS === 'android' && AIBridgeModule && AIBridgeModule.setModelPath) {
      AIBridgeModule.setModelPath(path);
    }
  }

  getModelPath() {
    return this.modelPath;
  }

  isModelFromUSB() {
    return this.modelFromUSB;
  }

  async refreshUSBModel() {
    const usbConnected = await USBStorageService.checkUSBConnected();
    if (usbConnected) {
      const usbModel = await USBStorageService.findModelOnUSB();
      if (usbModel) {
        this.modelPath = usbModel;
        this.modelFromUSB = true;
        if (Platform.OS === 'android' && AIBridgeModule && AIBridgeModule.setModelPath) {
          await AIBridgeModule.setModelPath(usbModel);
        }
        if (!this.availableBackends.includes(AI_BACKEND.QWEN_LLAMACPP)) {
          this.availableBackends.push(AI_BACKEND.QWEN_LLAMACPP);
        }
        this.preferredBackend = this.selectBestBackend();
        return true;
      }
    }
    return false;
  }

  getAvailableBackends() {
    return this.availableBackends;
  }

  getPreferredBackend() {
    return this.preferredBackend;
  }

  isAvailable() {
    return this.initialized && this.preferredBackend !== AI_BACKEND.MOCK;
  }

  async generateCode(prompt, language = 'javascript', maxTokens = 500) {
    return this.executeTask(TASK_TYPE.GENERATE_CODE, { prompt, language, maxTokens });
  }

  async explainCode(code, language = 'javascript', maxTokens = 300) {
    return this.executeTask(TASK_TYPE.EXPLAIN_CODE, { code, language, maxTokens });
  }

  async fixCode(code, error = '', language = 'javascript', maxTokens = 500) {
    return this.executeTask(TASK_TYPE.FIX_CODE, { code, error, language, maxTokens });
  }

  async completeCode(code, language = 'javascript', maxTokens = 100) {
    return this.executeTask(TASK_TYPE.COMPLETE_CODE, { code, language, maxTokens });
  }

  async chat(message, context = [], maxTokens = 300) {
    return this.executeTask(TASK_TYPE.CHAT, { message, context, maxTokens });
  }

  async analyzeCode(code, language = 'javascript') {
    return this.executeTask(TASK_TYPE.ANALYZE_CODE, { code, language, maxTokens: 500 });
  }

  async analyzeError(error, code, language = 'javascript', lineNumber = 0) {
    return this.executeTask(TASK_TYPE.ANALYZE_ERROR, { error, code, language, lineNumber, maxTokens: 500 });
  }

  async codeReview(code, language = 'javascript') {
    return this.executeTask(TASK_TYPE.CODE_REVIEW, { code, language, maxTokens: 500 });
  }

  async debugSummary(sessionData) {
    return this.executeTask(TASK_TYPE.DEBUG_SUMMARY, { sessionData, maxTokens: 400 });
  }

  async executeTask(taskType, params) {
    if (!this.initialized) {
      await this.initialize();
    }

    const request = {
      taskType,
      backend: this.preferredBackend,
      ...params,
    };

    try {
      switch (this.preferredBackend) {
        case AI_BACKEND.SAMSUNG_GALAXY_AI:
        case AI_BACKEND.GEMINI_NANO:
        case AI_BACKEND.QWEN_LLAMACPP:
          return await this.executeNative(request);

        case AI_BACKEND.OLLAMA_HTTP:
          return await this.executeOllamaHTTP(request);

        case AI_BACKEND.MOCK:
        default:
          return await this.executeMock(request);
      }
    } catch (error) {
      console.error(`AIBridge task ${taskType} failed on ${this.preferredBackend}:`, error);

      const fallbackBackend = this.getFallbackBackend();
      if (fallbackBackend && fallbackBackend !== this.preferredBackend) {
        console.log(`Falling back to ${fallbackBackend}`);
        const oldBackend = this.preferredBackend;
        this.preferredBackend = fallbackBackend;
        try {
          const result = await this.executeTask(taskType, params);
          this.preferredBackend = oldBackend;
          return result;
        } catch (fallbackError) {
          this.preferredBackend = oldBackend;
        }
      }

      return this.executeMock(request);
    }
  }

  getFallbackBackend() {
    const priority = [
      AI_BACKEND.QWEN_LLAMACPP,
      AI_BACKEND.OLLAMA_HTTP,
      AI_BACKEND.GEMINI_NANO,
      AI_BACKEND.SAMSUNG_GALAXY_AI,
      AI_BACKEND.MOCK,
    ];

    for (const backend of priority) {
      if (backend !== this.preferredBackend && this.availableBackends.includes(backend)) {
        return backend;
      }
    }

    return AI_BACKEND.MOCK;
  }

  async executeNative(request) {
    if (!AIBridgeModule) {
      throw new Error('AIBridgeModule not available');
    }

    const result = await AIBridgeModule.executeTask(
      request.taskType,
      request.backend,
      JSON.stringify(request)
    );

    return {
      success: true,
      content: result,
      backend: request.backend,
    };
  }

  async executeOllamaHTTP(request) {
    const prompt = this.buildPrompt(request);

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: {
          num_predict: request.maxTokens || 500,
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.response,
      backend: AI_BACKEND.OLLAMA_HTTP,
    };
  }

  buildPrompt(request) {
    switch (request.taskType) {
      case TASK_TYPE.GENERATE_CODE:
        return `You are an expert programmer. Generate ${request.language} code for the following request:\n\n${request.prompt}\n\nProvide only the code, no explanations.`;

      case TASK_TYPE.EXPLAIN_CODE:
        return `Explain this ${request.language} code:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nProvide a clear, concise explanation.`;

      case TASK_TYPE.FIX_CODE:
        return `Fix this ${request.language} code${request.error ? ` that has the error: ${request.error}` : ''}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nProvide the corrected code with a brief explanation of what was fixed.`;

      case TASK_TYPE.COMPLETE_CODE:
        return `Complete this ${request.language} code:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nProvide only the completion, continuing from where the code ends.`;

      case TASK_TYPE.CHAT:
        const contextStr = request.context && request.context.length > 0
          ? request.context.map(c => `${c.role}: ${c.content}`).join('\n')
          : '';
        return `${contextStr}\nuser: ${request.message}\nassistant:`;

      case TASK_TYPE.ANALYZE_CODE:
        return `Analyze this ${request.language} code for bugs, quality issues, and improvements. Respond as JSON with keys: potentialBugs, suggestedBreakpoints, codeQuality, performance, security, bestPractices.\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

      case TASK_TYPE.ANALYZE_ERROR:
        return `Analyze this error in ${request.language} code at line ${request.lineNumber}:\n\nError: ${request.error}\n\nCode:\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nRespond as JSON with keys: rootCause, suggestedFixes, prevention, relatedPatterns.`;

      case TASK_TYPE.CODE_REVIEW:
        return `Review this ${request.language} code for debugging friendliness, error handling, and testability. Respond as JSON with keys: debuggingScore, issues, strengths, improvements.\n\n\`\`\`${request.language}\n${request.code}\n\`\`\``;

      case TASK_TYPE.DEBUG_SUMMARY:
        return `Summarize this debugging session. Respond as JSON with keys: summary, keyInsights, recommendations, codeQualityScore, debuggingEfficiency.\n\n${JSON.stringify(request.sessionData, null, 2)}`;

      default:
        return request.prompt || request.message || '';
    }
  }

  async executeMock(request) {
    await new Promise(resolve => setTimeout(resolve, 200));

    switch (request.taskType) {
      case TASK_TYPE.GENERATE_CODE:
        return {
          success: true,
          content: `// Generated code (${request.language})\n// Prompt: ${request.prompt}\n\nfunction generated() {\n  // Implementation would appear here\n  return true;\n}`,
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.EXPLAIN_CODE:
        return {
          success: true,
          content: `Code Explanation:\n\nThis ${request.language} code performs operations as written. The implementation follows standard patterns.\n\n(Mock response - no AI backend available)`,
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.FIX_CODE:
        return {
          success: true,
          content: `// Fixed code (${request.language})\n${request.code}\n\n// No issues detected (mock response)`,
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.COMPLETE_CODE:
        return {
          success: true,
          content: `\n  // Completion (mock)\n  return result;\n}`,
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.CHAT:
        return {
          success: true,
          content: `Response to: ${request.message}\n\n(Mock response - no AI backend available)`,
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.ANALYZE_CODE:
        return {
          success: true,
          content: JSON.stringify({
            potentialBugs: [],
            suggestedBreakpoints: [],
            codeQuality: [],
            performance: [],
            security: [],
            bestPractices: [],
          }),
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.ANALYZE_ERROR:
        return {
          success: true,
          content: JSON.stringify({
            rootCause: 'Unable to determine (no AI backend)',
            suggestedFixes: [],
            prevention: [],
            relatedPatterns: [],
          }),
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.CODE_REVIEW:
        return {
          success: true,
          content: JSON.stringify({
            debuggingScore: 50,
            issues: [],
            strengths: [],
            improvements: [],
          }),
          backend: AI_BACKEND.MOCK,
        };

      case TASK_TYPE.DEBUG_SUMMARY:
        return {
          success: true,
          content: JSON.stringify({
            summary: 'Debug session completed (mock)',
            keyInsights: [],
            recommendations: [],
            codeQualityScore: 50,
            debuggingEfficiency: 'unknown',
          }),
          backend: AI_BACKEND.MOCK,
        };

      default:
        return {
          success: true,
          content: '(Mock response)',
          backend: AI_BACKEND.MOCK,
        };
    }
  }

  getBackendInfo() {
    return {
      available: this.availableBackends,
      preferred: this.preferredBackend,
      initialized: this.initialized,
      isReal: this.preferredBackend !== AI_BACKEND.MOCK,
      ollamaUrl: this.ollamaUrl,
      ollamaModel: this.ollamaModel,
    };
  }
}

export { AI_BACKEND, TASK_TYPE };
export default new AIBridgeService();
