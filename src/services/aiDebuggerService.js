import * as FileSystem from 'expo-file-system';
import { FileSystemService } from './fileSystemService';
import { RealCompilerService } from './realCompilerService';

export class AIDebuggerService {
  static DEBUG_SESSIONS = new Map();
  static AI_ASSISTANT_URL = 'https://api.openai.com/v1/chat/completions';
  static AI_MODEL = 'gpt-4';

  static async createAIDebugSession(filePath, language, workingDirectory) {
    try {
      const sessionId = this.generateSessionId();
      
      const session = {
        id: sessionId,
        filePath,
        language,
        workingDirectory,
        status: 'created',
        breakpoints: [],
        aiContext: {
          codeAnalysis: null,
          errorPatterns: [],
          suggestions: [],
          learningData: new Map(),
        },
        currentLine: null,
        paused: false,
        startTime: new Date().toISOString(),
      };

      this.DEBUG_SESSIONS.set(sessionId, session);

      // Analyze code with AI
      const analysisResult = await this.analyzeCodeWithAI(session);
      
      if (!analysisResult.success) {
        this.DEBUG_SESSIONS.delete(sessionId);
        return analysisResult;
      }

      session.aiContext.codeAnalysis = analysisResult.analysis;

      return {
        success: true,
        sessionId,
        session,
        message: 'AI Debug session created',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async analyzeCodeWithAI(session) {
    try {
      const code = await FileSystem.readFileAsStringAsync(session.filePath);
      
      // Prepare AI prompt for code analysis
      const prompt = this.buildCodeAnalysisPrompt(code, session.language);
      
      // Get AI analysis
      const aiResponse = await this.callAI(prompt);
      
      if (!aiResponse.success) {
        return aiResponse;
      }

      const analysis = this.parseCodeAnalysis(aiResponse.content);

      return {
        success: true,
        analysis,
        message: 'Code analyzed with AI',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static buildCodeAnalysisPrompt(code, language) {
    return `You are an expert debugging assistant for a mobile IDE. Analyze this ${language} code and provide debugging insights:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Potential bugs or issues
2. Suggested breakpoints
3. Code quality issues
4. Performance considerations
5. Security vulnerabilities
6. Best practices recommendations

Format your response as JSON:
{
  "potentialBugs": [{"line": 1, "issue": "description", "severity": "high|medium|low"}],
  "suggestedBreakpoints": [{"line": 1, "reason": "description"}],
  "codeQuality": [{"line": 1, "issue": "description", "suggestion": "fix"}],
  "performance": [{"line": 1, "issue": "description", "optimization": "suggestion"}],
  "security": [{"line": 1, "vulnerability": "description", "fix": "solution"}],
  "bestPractices": [{"line": 1, "practice": "description", "implementation": "suggestion"}]
}`;
  }

  static async callAI(prompt) {
    try {
      // In a real implementation, this would call OpenAI API
      // For now, we'll simulate AI response
      const mockResponse = this.mockAIResponse(prompt);
      
      return {
        success: true,
        content: mockResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static mockAIResponse(prompt) {
    // Simulate AI response based on prompt content
    if (prompt.includes('potentialBugs')) {
      return JSON.stringify({
        potentialBugs: [
          { line: 5, issue: "Variable used before initialization", severity: "high" },
          { line: 12, issue: "Possible null reference", severity: "medium" },
          { line: 18, issue: "Infinite loop condition", severity: "high" },
        ],
        suggestedBreakpoints: [
          { line: 5, reason: "Check variable initialization" },
          { line: 12, reason: "Validate null reference" },
          { line: 18, reason: "Monitor loop condition" },
        ],
        codeQuality: [
          { line: 8, issue: "Function too long", suggestion: "Break into smaller functions" },
          { line: 15, issue: "Magic number", suggestion: "Use named constant" },
        ],
        performance: [
          { line: 22, issue: "Inefficient loop", optimization: "Use for...of instead" },
        ],
        security: [
          { line: 25, issue: "Unvalidated input", fix: "Add input validation" },
        ],
        bestPractices: [
          { line: 3, practice: "Add error handling", implementation: "Try-catch block" },
          { line: 10, practice: "Use const instead of let", implementation: "Change to const" },
        ],
      });
    }
    
    return '{ "analysis": "Mock AI analysis completed" }';
  }

  static parseCodeAnalysis(aiContent) {
    try {
      return JSON.parse(aiContent);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        potentialBugs: [],
        suggestedBreakpoints: [],
        codeQuality: [],
        performance: [],
        security: [],
        bestPractices: [],
      };
    }
  }

  static async setAIBreakpoint(sessionId, lineNumber, reason = null) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Get AI suggestion for breakpoint
      const aiSuggestion = await this.getAIBreakpointSuggestion(session, lineNumber);
      
      const breakpoint = {
        id: this.generateBreakpointId(),
        lineNumber,
        reason: reason || aiSuggestion.reason,
        aiSuggested: true,
        aiConfidence: aiSuggestion.confidence,
        enabled: true,
        hitCount: 0,
        created: new Date().toISOString(),
      };

      session.breakpoints.push(breakpoint);

      return {
        success: true,
        breakpoint,
        aiSuggestion,
        message: `AI breakpoint set at line ${lineNumber}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getAIBreakpointSuggestion(session, lineNumber) {
    try {
      const code = await FileSystem.readFileAsStringAsync(session.filePath);
      const lines = code.split('\n');
      const targetLine = lines[lineNumber - 1] || '';

      // Ask AI for breakpoint suggestion
      const prompt = `Analyze this line of code for debugging:

Line ${lineNumber}: ${targetLine}

Language: ${session.language}

Should a breakpoint be set here? Why? Provide confidence level (0-100).

Format as JSON:
{
  "shouldBreak": true/false,
  "reason": "explanation",
  "confidence": 85
}`;

      const aiResponse = await this.callAI(prompt);
      
      if (aiResponse.success) {
        const suggestion = JSON.parse(aiResponse.content);
        return {
          shouldBreak: suggestion.shouldBreak || true,
          reason: suggestion.reason || "AI suggested breakpoint",
          confidence: suggestion.confidence || 75,
        };
      }

      // Fallback suggestion
      return {
        shouldBreak: true,
        reason: "AI analysis suggests this is a good debugging point",
        confidence: 70,
      };
    } catch (error) {
      return {
        shouldBreak: true,
        reason: "AI analysis unavailable",
        confidence: 50,
      };
    }
  }

  static async analyzeErrorWithAI(sessionId, error, lineNumber, context) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Get surrounding code for context
      const code = await FileSystem.readFileAsStringAsync(session.filePath);
      const lines = code.split('\n');
      const contextLines = this.getContextLines(lines, lineNumber, 5);

      // Ask AI to analyze the error
      const prompt = `Analyze this error and suggest fixes:

Error: ${error}
Language: ${session.language}
Line: ${lineNumber}

Code Context:
${contextLines}

Please provide:
1. Root cause analysis
2. Suggested fixes
3. Prevention strategies
4. Related code patterns to check

Format as JSON:
{
  "rootCause": "description",
  "suggestedFixes": [{"fix": "description", "code": "example"}],
  "prevention": ["tip1", "tip2"],
  "relatedPatterns": ["pattern1", "pattern2"]
}`;

      const aiResponse = await this.callAI(prompt);
      
      if (aiResponse.success) {
        const analysis = JSON.parse(aiResponse.content);
        
        // Store in AI context for learning
        session.aiContext.errorPatterns.push({
          error,
          lineNumber,
          analysis,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          analysis,
          message: 'AI error analysis completed',
        };
      }

      return {
        success: false,
        error: 'AI analysis failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static getContextLines(lines, targetLine, contextSize) {
    const start = Math.max(0, targetLine - contextSize - 1);
    const end = Math.min(lines.length, targetLine + contextSize);
    
    return lines.slice(start, end).map((line, index) => {
      const lineNumber = start + index + 1;
      const marker = lineNumber === targetLine ? '>>> ' : '    ';
      return `${marker}${lineNumber}: ${line}`;
    }).join('\n');
  }

  static async getAICodeSuggestion(sessionId, currentCode, cursorPosition, intent) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Ask AI for code suggestion
      const prompt = `Provide code suggestion for debugging:

Current Code:
${currentCode}

Cursor Position: ${cursorPosition}
Intent: ${intent}
Language: ${session.language}

Provide a code completion or fix that helps with debugging.

Format as JSON:
{
  "suggestion": "code suggestion",
  "explanation": "why this helps",
  "confidence": 85
}`;

      const aiResponse = await this.callAI(prompt);
      
      if (aiResponse.success) {
        const suggestion = JSON.parse(aiResponse.content);
        
        return {
          success: true,
          suggestion: suggestion.suggestion,
          explanation: suggestion.explanation,
          confidence: suggestion.confidence,
        };
      }

      return {
        success: false,
        error: 'AI suggestion failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getAIStepSuggestion(sessionId, currentContext) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Ask AI for next debugging step
      const prompt = `Suggest the next debugging step:

Current Context:
${currentContext}

Session Data:
- Language: ${session.language}
- Current Line: ${session.currentLine}
- Breakpoints: ${session.breakpoints.length}
- Previous Errors: ${session.aiContext.errorPatterns.length}

What should the developer do next to debug effectively?

Format as JSON:
{
  "nextStep": "description",
  "action": "step_over|step_into|step_out|continue|set_breakpoint",
  "targetLine": 15,
  "reasoning": "why this step",
  "confidence": 80
}`;

      const aiResponse = await this.callAI(prompt);
      
      if (aiResponse.success) {
        const suggestion = JSON.parse(aiResponse.content);
        
        return {
          success: true,
          nextStep: suggestion.nextStep,
          action: suggestion.action,
          targetLine: suggestion.targetLine,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence,
        };
      }

      return {
        success: false,
        error: 'AI step suggestion failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async learnFromDebugging(sessionId, outcome, feedback) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Store learning data
      const learningData = {
        sessionId,
        outcome,
        feedback,
        timestamp: new Date().toISOString(),
        sessionData: {
          language: session.language,
          breakpointsCount: session.breakpoints.length,
          errorPatterns: session.aiContext.errorPatterns.length,
        },
      };

      session.aiContext.learningData.set(Date.now(), learningData);

      // In a real implementation, this would be sent to improve the AI model
      console.log('AI Learning:', learningData);

      return {
        success: true,
        message: 'AI learning data recorded',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getAIDebugSummary(sessionId) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Ask AI for debugging summary
      const prompt = `Summarize this debugging session:

Session Data:
- Language: ${session.language}
- Duration: ${Date.now() - new Date(session.startTime).getTime()}ms
- Breakpoints: ${session.breakpoints.length}
- Error Patterns: ${session.aiContext.errorPatterns.length}

Code Analysis: ${JSON.stringify(session.aiContext.codeAnalysis, null, 2)}

Provide a comprehensive debugging summary with insights and recommendations.

Format as JSON:
{
  "summary": "overall summary",
  "keyInsights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"],
  "codeQualityScore": 85,
  "debuggingEfficiency": "high|medium|low"
}`;

      const aiResponse = await this.callAI(prompt);
      
      if (aiResponse.success) {
        const summary = JSON.parse(aiResponse.content);
        
        return {
          success: true,
          summary,
          message: 'AI debug summary generated',
        };
      }

      return {
        success: false,
        error: 'AI summary generation failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getAICodeReview(sessionId) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      const code = await FileSystem.readFileAsStringAsync(session.filePath);
      
      // Ask AI for comprehensive code review
      const prompt = `Perform a comprehensive code review for debugging:

${code}

Language: ${session.language}

Focus on:
1. Debugging friendliness
2. Error handling
3. Logging practices
4. Code structure for debugging
5. Testability

Format as JSON:
{
  "debuggingScore": 85,
  "issues": [{"line": 1, "issue": "description", "fix": "suggestion"}],
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

      const aiResponse = await this.callAI(prompt);
      
      if (aiResponse.success) {
        const review = JSON.parse(aiResponse.content);
        
        return {
          success: true,
          review,
          message: 'AI code review completed',
        };
      }

      return {
        success: false,
        error: 'AI code review failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async generateAIDebugReport(sessionId) {
    try {
      const session = this.DEBUG_SESSIONS.get(sessionId);
      
      if (!session) {
        throw new Error('AI Debug session not found');
      }

      // Generate comprehensive AI debug report
      const report = {
        sessionId,
        language: session.language,
        startTime: session.startTime,
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date(session.startTime).getTime(),
        breakpoints: session.breakpoints,
        aiAnalysis: session.aiContext.codeAnalysis,
        errorPatterns: session.aiContext.errorPatterns,
        learningData: Array.from(session.aiContext.learningData.values()),
      };

      return {
        success: true,
        report,
        message: 'AI debug report generated',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static generateSessionId() {
    return 'ai_debug_' + Math.random().toString(36).substr(2, 9);
  }

  static generateBreakpointId() {
    return 'ai_bp_' + Math.random().toString(36).substr(2, 9);
  }

  static async getAIDebugSession(sessionId) {
    return this.DEBUG_SESSIONS.get(sessionId) || null;
  }

  static async getAllAIDebugSessions() {
    return Array.from(this.DEBUG_SESSIONS.values());
  }

  static async getSupportedLanguages() {
    return [
      {
        name: 'JavaScript',
        id: 'javascript',
        aiSupport: true,
        features: ['error_analysis', 'code_suggestions', 'breakpoint_suggestions'],
      },
      {
        name: 'Python',
        id: 'python',
        aiSupport: true,
        features: ['error_analysis', 'code_suggestions', 'breakpoint_suggestions'],
      },
      {
        name: 'Java',
        id: 'java',
        aiSupport: true,
        features: ['error_analysis', 'code_suggestions', 'breakpoint_suggestions'],
      },
      {
        name: 'TypeScript',
        id: 'typescript',
        aiSupport: true,
        features: ['error_analysis', 'code_suggestions', 'breakpoint_suggestions'],
      },
    ];
  }
}
