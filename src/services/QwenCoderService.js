/**
 * Qwen Coder Service - Integration for Qwen Coder functionality
 * This service provides an interface to Qwen Coder AI capabilities
 * within the CodeSurfer MobileIDE React Native app.
 */

import AIBridgeService, { AI_BACKEND } from './AIBridgeService';

class QwenCoderService {
  constructor() {
    this.isInitialized = false;
    this.isAvailable = false;
  }

  async initialize() {
    try {
      await AIBridgeService.initialize();

      const backends = AIBridgeService.getAvailableBackends();
      const hasReal = backends.some(b => b !== AI_BACKEND.MOCK);

      this.isAvailable = true;
      this.isInitialized = true;

      console.log(`QwenCoderService initialized via AIBridge. Backend: ${AIBridgeService.getPreferredBackend()}`);
      return hasReal || true;
    } catch (error) {
      console.error('Failed to initialize QwenCoderService:', error);
      this.isAvailable = false;
      return false;
    }
  }

  async generateCode(prompt, language = 'javascript', maxTokens = 500) {
    const result = await AIBridgeService.generateCode(prompt, language, maxTokens);
    return { code: result.content, language, tokensGenerated: Math.floor(result.content.length / 4) };
  }

  async chat(message, context = [], maxTokens = 300) {
    const result = await AIBridgeService.chat(message, context, maxTokens);
    return { response: result.content, tokensGenerated: Math.floor(result.content.length / 4) };
  }

  async completeCode(code, language = 'javascript', maxTokens = 100) {
    const result = await AIBridgeService.completeCode(code, language, maxTokens);
    return { completion: result.content, language };
  }

  async fixCode(code, error = '', language = 'javascript', maxTokens = 500) {
    const result = await AIBridgeService.fixCode(code, error, language, maxTokens);
    return { fixedCode: result.content, language, hasFix: true };
  }

  async explainCode(code, language = 'javascript', maxTokens = 300) {
    const result = await AIBridgeService.explainCode(code, language, maxTokens);
    return { explanation: result.content, language };
  }

  isServiceAvailable() {
    return this.isAvailable && this.isInitialized;
  }

  getBackendInfo() {
    return AIBridgeService.getBackendInfo();
  }
}

export default new QwenCoderService();
