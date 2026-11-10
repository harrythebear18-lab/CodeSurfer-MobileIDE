import * as FileSystem from 'expo-file-system';
import { Platform, NativeModules } from 'react-native';

const { CompilerModule } = NativeModules;

export class CompilerService {
  static async getConnectedDevices() {
    try {
      if (Platform.OS === 'android' && CompilerModule) {
        return await CompilerModule.getConnectedDevices();
      }

      return [
        {
          id: 'emulator-5554',
          model: 'Android Emulator',
          sdk: 34,
        },
      ];
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  static async buildGradleProject(projectPath) {
    try {
      if (Platform.OS === 'android' && CompilerModule) {
        const result = await CompilerModule.buildProject(projectPath);
        return {
          success: result.success,
          output: result.output,
          errors: result.errors || [],
          apkPath: result.apkPath || null,
        };
      }

      const gradleFile = `${projectPath}build.gradle`;
      const info = await FileSystem.getInfoAsync(gradleFile);

      if (!info.exists) {
        return {
          success: false,
          output: '',
          errors: ['build.gradle not found in project directory'],
          apkPath: null,
        };
      }

      return {
        success: true,
        output: 'Build simulation completed (no native compiler available)',
        errors: [],
        apkPath: null,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [error.message],
        apkPath: null,
      };
    }
  }

  static async installAPK(apkPath) {
    try {
      if (Platform.OS === 'android' && CompilerModule) {
        const result = await CompilerModule.installAPK(apkPath);
        return {
          success: result.success,
          output: result.output,
          error: result.error,
        };
      }

      return {
        success: false,
        output: '',
        error: 'APK installation requires native compiler module',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  static async runADBCommand(command) {
    try {
      if (Platform.OS === 'android' && CompilerModule) {
        const result = await CompilerModule.runADBCommand(command);
        return {
          success: result.success,
          output: result.output,
          error: result.error,
        };
      }

      return {
        success: false,
        output: '',
        error: 'ADB commands require native compiler module',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  static async compileJavaScript(code) {
    try {
      const result = new Function(code);
      const output = String(result());
      return {
        success: true,
        output,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  static async compileTypeScript(code) {
    try {
      const strippedCode = code
        .replace(/:\s*\w+/g, '')
        .replace(/interface\s+\w+\s*{[^}]*}/g, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/as\s+\w+/g, '')
        .replace(/import\s+type\s+{[^}]+}\s+from\s+['"][^'"]+['"];?/g, '');

      const result = new Function(strippedCode);
      const output = String(result());
      return {
        success: true,
        output,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  static async compilePython(code) {
    try {
      if (Platform.OS === 'android' && CompilerModule) {
        const result = await CompilerModule.runPython(code);
        return {
          success: result.success,
          output: result.output,
          error: result.error,
        };
      }

      return {
        success: false,
        output: '',
        error: 'Python compilation requires native compiler module',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  static async compileJava(code) {
    try {
      if (Platform.OS === 'android' && CompilerModule) {
        const result = await CompilerModule.runJava(code);
        return {
          success: result.success,
          output: result.output,
          error: result.error,
        };
      }

      return {
        success: false,
        output: '',
        error: 'Java compilation requires native compiler module',
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  static getSupportedLanguages() {
    return [
      { name: 'JavaScript', id: 'javascript', available: true },
      { name: 'TypeScript', id: 'typescript', available: true },
      { name: 'Python', id: 'python', available: Platform.OS === 'android' && !!CompilerModule },
      { name: 'Java', id: 'java', available: Platform.OS === 'android' && !!CompilerModule },
    ];
  }
}
