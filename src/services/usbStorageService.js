import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { USBStorageModule } = NativeModules;

const USB_STRUCTURE = {
  ROOT: '/CodeSurferMobileIDE',
  SOURCE: '/source',
  MODELS: '/models',
  BINARIES: '/binaries',
  WORKSPACE: '/workspace',
};

class USBStorageService {
  constructor() {
    this.usbRootPath = null;
    this.usbConnected = false;
    this.modelPath = null;
    this.workspacePath = null;
    this.sourcePath = null;
    this.binariesPath = null;
  }

  async checkUSBConnected() {
    if (Platform.OS !== 'android') return false;

    try {
      if (USBStorageModule && USBStorageModule.getUSBDevices) {
        const devices = await USBStorageModule.getUSBDevices();
        if (devices && devices.length > 0) {
          this.usbRootPath = devices[0].path;
          this.usbConnected = true;
          await this.resolveUSBStructure();
          return true;
        }
      }

      this.usbConnected = false;
      this.usbRootPath = null;
      return false;
    } catch (error) {
      console.error('USB check failed:', error);
      this.usbConnected = false;
      return false;
    }
  }

  async resolveUSBStructure() {
    if (!this.usbRootPath) return;

    // Check for CodeSurferMobileIDE container folder on the USB drive
    const containerPath = `${this.usbRootPath}${USB_STRUCTURE.ROOT}`;
    let basePath = this.usbRootPath;

    try {
      if (USBStorageModule && USBStorageModule.listFiles) {
        const rootFiles = await USBStorageModule.listFiles(this.usbRootPath);
        if (rootFiles && rootFiles.some(f => f.name === 'CodeSurferMobileIDE' && f.isDirectory)) {
          basePath = containerPath;
        }
      }
    } catch (e) {
      // Fallback to root-level paths
    }

    this.sourcePath = `${basePath}${USB_STRUCTURE.SOURCE}`;
    this.modelPath = `${basePath}${USB_STRUCTURE.MODELS}`;
    this.binariesPath = `${basePath}${USB_STRUCTURE.BINARIES}`;
    this.workspacePath = `${basePath}${USB_STRUCTURE.WORKSPACE}`;

    if (USBStorageModule && USBStorageModule.ensureDirectory) {
      await USBStorageModule.ensureDirectory(this.sourcePath);
      await USBStorageModule.ensureDirectory(this.modelPath);
      await USBStorageModule.ensureDirectory(this.binariesPath);
      await USBStorageModule.ensureDirectory(this.workspacePath);
    }
  }

  isUSBConnected() {
    return this.usbConnected;
  }

  getUSBRootPath() {
    return this.usbRootPath;
  }

  async findModelOnUSB() {
    if (!this.usbConnected || !this.modelPath) return null;

    try {
      if (USBStorageModule && USBStorageModule.listFiles) {
        const files = await USBStorageModule.listFiles(this.modelPath);
        if (files && files.length > 0) {
          const ggufFile = files.find(f => f.name.endsWith('.gguf'));
          if (ggufFile) {
            return `${this.modelPath}/${ggufFile.name}`;
          }
          const binFile = files.find(f => f.name.endsWith('.bin'));
          if (binFile) {
            return `${this.modelPath}/${binFile.name}`;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to find model on USB:', error);
      return null;
    }
  }

  async getModelPath() {
    if (this.modelPath) {
      const usbModel = await this.findModelOnUSB();
      if (usbModel) return usbModel;
    }

    const internalModelDir = `${FileSystem.documentDirectory}models`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(internalModelDir);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(internalModelDir);
        const gguf = files.find(f => f.endsWith('.gguf'));
        if (gguf) return `${internalModelDir}/${gguf}`;
        const bin = files.find(f => f.endsWith('.bin'));
        if (bin) return `${internalModelDir}/${bin}`;
      }
    } catch (e) {
      // Internal model not found
    }

    return null;
  }

  async readFileFromUSB(filePath) {
    if (!this.usbConnected) {
      throw new Error('USB not connected');
    }

    try {
      if (USBStorageModule && USBStorageModule.readFile) {
        return await USBStorageModule.readFile(filePath);
      }
      throw new Error('USBStorageModule native module not available');
    } catch (error) {
      console.error('USB read failed:', error);
      throw error;
    }
  }

  async writeFileToUSB(filePath, content) {
    if (!this.usbConnected) {
      throw new Error('USB not connected');
    }

    try {
      if (USBStorageModule && USBStorageModule.writeFile) {
        await USBStorageModule.writeFile(filePath, content);
        await this.flushFile(filePath);
        return true;
      }
      throw new Error('USBStorageModule native module not available');
    } catch (error) {
      console.error('USB write failed:', error);
      throw error;
    }
  }

  async flushFile(filePath) {
    try {
      if (USBStorageModule && USBStorageModule.flushFile) {
        await USBStorageModule.flushFile(filePath);
      }
    } catch (error) {
      console.warn('Flush failed (non-fatal):', error);
    }
  }

  async flushAll() {
    if (!this.usbConnected) return;

    try {
      if (USBStorageModule && USBStorageModule.flushAll) {
        await USBStorageModule.flushAll();
      }
    } catch (error) {
      console.warn('Flush all failed (non-fatal):', error);
    }
  }

  async safeUnmount() {
    try {
      await this.flushAll();

      if (USBStorageModule && USBStorageModule.unmountUSB) {
        await USBStorageModule.unmountUSB();
      }

      this.usbConnected = false;
      this.usbRootPath = null;
      this.modelPath = null;
      this.workspacePath = null;
      this.sourcePath = null;
      this.binariesPath = null;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async listWorkspaceFiles() {
    if (!this.usbConnected || !this.workspacePath) return [];

    try {
      if (USBStorageModule && USBStorageModule.listFiles) {
        return await USBStorageModule.listFiles(this.workspacePath);
      }
      return [];
    } catch (error) {
      console.error('List workspace failed:', error);
      return [];
    }
  }

  async saveToWorkspace(fileName, content) {
    if (!this.usbConnected || !this.workspacePath) {
      throw new Error('USB not connected or workspace not available');
    }

    const filePath = `${this.workspacePath}/${fileName}`;
    await this.writeFileToUSB(filePath, content);
    return filePath;
  }

  async readFromWorkspace(fileName) {
    if (!this.usbConnected || !this.workspacePath) {
      throw new Error('USB not connected or workspace not available');
    }

    const filePath = `${this.workspacePath}/${fileName}`;
    return await this.readFileFromUSB(filePath);
  }

  async listSourceFiles() {
    if (!this.usbConnected || !this.sourcePath) return [];

    try {
      if (USBStorageModule && USBStorageModule.listFiles) {
        return await USBStorageModule.listFiles(this.sourcePath);
      }
      return [];
    } catch (error) {
      console.error('List source failed:', error);
      return [];
    }
  }

  async listBinaries() {
    if (!this.usbConnected || !this.binariesPath) return [];

    try {
      if (USBStorageModule && USBStorageModule.listFiles) {
        return await USBStorageModule.listFiles(this.binariesPath);
      }
      return [];
    } catch (error) {
      console.error('List binaries failed:', error);
      return [];
    }
  }

  async findAPKOnUSB() {
    const binaries = await this.listBinaries();
    if (binaries && binaries.length > 0) {
      const apk = binaries.find(f => f.name.endsWith('.apk'));
      if (apk) {
        return `${this.binariesPath}/${apk.name}`;
      }
    }
    return null;
  }

  async installAPKFromUSB() {
    if (!this.usbConnected) {
      throw new Error('USB not connected');
    }

    const apkPath = await this.findAPKOnUSB();
    if (!apkPath) {
      throw new Error('No APK found in /binaries/ on USB drive');
    }

    try {
      if (USBStorageModule && USBStorageModule.installAPK) {
        return await USBStorageModule.installAPK(apkPath);
      }
      throw new Error('USBStorageModule.installAPK not available');
    } catch (error) {
      console.error('APK install failed:', error);
      throw error;
    }
  }

  async requestStoragePermissions() {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE,
      ]);

      return Object.values(granted).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  getUSBInfo() {
    return {
      connected: this.usbConnected,
      rootPath: this.usbRootPath,
      modelPath: this.modelPath,
      workspacePath: this.workspacePath,
      sourcePath: this.sourcePath,
      binariesPath: this.binariesPath,
    };
  }
}

export default new USBStorageService();
export { USBStorageService, USB_STRUCTURE };
