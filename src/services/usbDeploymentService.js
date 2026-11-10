import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import USBStorageService from './usbStorageService';
import ModelReassemblyService from './modelReassemblyService';

const { USBStorageModule } = NativeModules;

const DEPLOYMENT_MODE = {
  USB_LIVE: 'usb_live',
  STANDALONE: 'standalone',
};

const DEPLOYMENT_STATUS = {
  IDLE: 'idle',
  CHECKING_USB: 'checking_usb',
  COPYING_MODEL: 'copying_model',
  COPYING_WORKSPACE: 'copying_workspace',
  INSTALLING_APK: 'installing_apk',
  VERIFYING: 'verifying',
  COMPLETE: 'complete',
  ERROR: 'error',
};

class USBDeploymentService {
  constructor() {
    this.mode = DEPLOYMENT_MODE.USB_LIVE;
    this.deploymentStatus = DEPLOYMENT_STATUS.IDLE;
    this.progress = 0;
    this.progressMessage = '';
    this.onProgressCallback = null;
  }

  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  updateProgress(status, progress, message) {
    this.deploymentStatus = status;
    this.progress = progress;
    this.progressMessage = message;
    if (this.onProgressCallback) {
      this.onProgressCallback({ status, progress, message });
    }
  }

  getMode() {
    return this.mode;
  }

  setMode(mode) {
    this.mode = mode;
  }

  getStatus() {
    return {
      status: this.deploymentStatus,
      progress: this.progress,
      message: this.progressMessage,
      mode: this.mode,
    };
  }

  async checkUSBReady() {
    this.updateProgress(DEPLOYMENT_STATUS.CHECKING_USB, 0, 'Checking USB connection...');

    const connected = await USBStorageService.checkUSBConnected();
    if (!connected) {
      this.updateProgress(DEPLOYMENT_STATUS.ERROR, 0, 'No USB drive detected. Connect via OTG and try again.');
      return false;
    }

    const usbInfo = USBStorageService.getUSBInfo();
    this.updateProgress(DEPLOYMENT_STATUS.CHECKING_USB, 10, `USB connected: ${usbInfo.rootPath}`);
    return true;
  }

  async getDeploymentSummary() {
    const connected = await USBStorageService.checkUSBConnected();
    if (!connected) return null;

    const summary = {
      usbPath: USBStorageService.getUSBRootPath(),
      modelOnUSB: null,
      modelSize: 0,
      chunkedModel: null,
      workspaceFiles: [],
      apkOnUSB: null,
      internalModelExists: false,
      internalWorkspaceFiles: [],
      deployRequired: false,
    };

    const usbModel = await USBStorageService.findModelOnUSB();
    if (usbModel) {
      summary.modelOnUSB = usbModel;
      try {
        if (USBStorageModule && USBStorageModule.getFileInfo) {
          const info = await USBStorageModule.getFileInfo(usbModel);
          summary.modelSize = info.size || 0;
        }
      } catch (e) {}
    }

    // Also check for chunked model
    const chunked = await ModelReassemblyService.findChunkedModelOnUSB(USBStorageService.getUSBRootPath());
    if (chunked) {
      summary.chunkedModel = chunked;
      summary.modelSize = chunked.manifest.totalSize || summary.modelSize;
    }

    summary.workspaceFiles = await USBStorageService.listWorkspaceFiles();

    summary.apkOnUSB = await USBStorageService.findAPKOnUSB();

    const internalModel = await USBStorageService.getModelPath();
    if (internalModel) {
      summary.internalModelExists = true;
    }

    try {
      const internalWsDir = `${FileSystem.documentDirectory}workspace`;
      const dirInfo = await FileSystem.getInfoAsync(internalWsDir);
      if (dirInfo.exists) {
        summary.internalWorkspaceFiles = await FileSystem.readDirectoryAsync(internalWsDir);
      }
    } catch (e) {}

    summary.deployRequired = !summary.internalModelExists && (!!summary.modelOnUSB || !!summary.chunkedModel);

    return summary;
  }

  async deployToStandalone() {
    try {
      const ready = await this.checkUSBReady();
      if (!ready) {
        return { success: false, error: 'USB not ready' };
      }

      const summary = await this.getDeploymentSummary();
      if (!summary) {
        this.updateProgress(DEPLOYMENT_STATUS.ERROR, 0, 'Failed to read USB contents');
        return { success: false, error: 'Failed to read USB contents' };
      }

      // Check for chunked model first, then single file
      const chunkedModel = await ModelReassemblyService.findChunkedModelOnUSB(USBStorageService.getUSBRootPath());

      if (!summary.modelOnUSB && !chunkedModel) {
        this.updateProgress(DEPLOYMENT_STATUS.ERROR, 0, 'No model file found on USB in /models/');
        return { success: false, error: 'No model file found on USB' };
      }

      const result = {
        modelCopied: false,
        modelReassembled: false,
        workspaceSynced: false,
        apkInstalled: false,
        modelPath: null,
      };

      // Step 1: Copy or reassemble model from USB to internal storage
      this.updateProgress(DEPLOYMENT_STATUS.COPYING_MODEL, 20, 'Copying model from USB to device storage...');

      let modelResult;
      if (chunkedModel) {
        // Chunked model — reassemble
        this.updateProgress(DEPLOYMENT_STATUS.COPYING_MODEL, 20, `Reassembling ${chunkedModel.manifest.chunks.length} model chunks...`);
        ModelReassemblyService.setProgressCallback(({ progress, message }) => {
          const overallProgress = 20 + Math.round(progress * 0.4);
          this.updateProgress(DEPLOYMENT_STATUS.COPYING_MODEL, overallProgress, message);
        });
        modelResult = await ModelReassemblyService.reassembleToInternal(chunkedModel.dir, chunkedModel.manifest);
        result.modelReassembled = true;
      } else {
        // Single file — direct copy
        modelResult = await this.copyModelToInternal(summary.modelOnUSB);
      }

      if (modelResult.success) {
        result.modelCopied = true;
        result.modelPath = modelResult.path;
      } else {
        this.updateProgress(DEPLOYMENT_STATUS.ERROR, 20, `Model deploy failed: ${modelResult.error}`);
        return { success: false, error: `Model deploy failed: ${modelResult.error}` };
      }

      // Step 2: Sync workspace files from USB to internal
      this.updateProgress(DEPLOYMENT_STATUS.COPYING_WORKSPACE, 60, 'Syncing workspace files...');
      const wsResult = await this.syncWorkspaceToInternal(summary.workspaceFiles);
      result.workspaceSynced = wsResult.success;

      // Step 3: Install APK if present on USB
      if (summary.apkOnUSB) {
        this.updateProgress(DEPLOYMENT_STATUS.INSTALLING_APK, 80, 'Installing APK from USB...');
        try {
          await USBStorageService.installAPKFromUSB();
          result.apkInstalled = true;
        } catch (e) {
          console.warn('APK install skipped:', e.message);
        }
      }

      // Step 4: Verify deployment
      this.updateProgress(DEPLOYMENT_STATUS.VERIFYING, 90, 'Verifying deployment...');
      const verifyOk = await this.verifyDeployment(result.modelPath);
      if (!verifyOk) {
        this.updateProgress(DEPLOYMENT_STATUS.ERROR, 90, 'Deployment verification failed');
        return { success: false, error: 'Verification failed', partial: result };
      }

      // Step 5: Switch mode to standalone
      this.mode = DEPLOYMENT_MODE.STANDALONE;
      this.updateProgress(DEPLOYMENT_STATUS.COMPLETE, 100, 'Deployment complete! USB can be safely removed.');

      // Flush USB before telling user to remove
      await USBStorageService.flushAll();

      return { success: true, ...result };
    } catch (error) {
      this.updateProgress(DEPLOYMENT_STATUS.ERROR, 0, error.message);
      return { success: false, error: error.message };
    }
  }

  async copyModelToInternal(usbModelPath) {
    try {
      const internalModelDir = `${FileSystem.documentDirectory}models`;
      const modelFileName = usbModelPath.split('/').pop();
      const internalPath = `${internalModelDir}/${modelFileName}`;

      // Check if already copied
      const existing = await FileSystem.getInfoAsync(internalPath);
      if (existing.exists) {
        return { success: true, path: internalPath, skipped: true };
      }

      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(internalModelDir, { intermediates: true });

      // Use native copy for large files (4.7GB) — expo FileSystem copy can't access USB paths
      if (USBStorageModule && USBStorageModule.copyFileToInternal) {
        const success = await USBStorageModule.copyFileToInternal(usbModelPath, internalPath);
        if (success) {
          return { success: true, path: internalPath };
        }
      }

      // Fallback: try expo FileSystem (may work for smaller models)
      try {
        await FileSystem.copyAsync({
          from: usbModelPath,
          to: internalPath,
        });
        return { success: true, path: internalPath };
      } catch (e) {
        return { success: false, error: `Native copy unavailable and expo copy failed: ${e.message}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncWorkspaceToInternal(usbWorkspaceFiles) {
    try {
      const internalWsDir = `${FileSystem.documentDirectory}workspace`;
      await FileSystem.makeDirectoryAsync(internalWsDir, { intermediates: true });

      if (!usbWorkspaceFiles || usbWorkspaceFiles.length === 0) {
        return { success: true, copied: 0 };
      }

      let copied = 0;
      for (const file of usbWorkspaceFiles) {
        if (file.isDirectory) continue;

        const content = await USBStorageService.readFileFromUSB(file.path);
        const internalPath = `${internalWsDir}/${file.name}`;
        await FileSystem.writeAsStringAsync(internalPath, content);
        copied++;
      }

      return { success: true, copied };
    } catch (error) {
      console.warn('Workspace sync failed (non-fatal):', error.message);
      return { success: false, error: error.message, copied: 0 };
    }
  }

  async verifyDeployment(modelPath) {
    try {
      if (!modelPath) return false;
      const info = await FileSystem.getInfoAsync(modelPath);
      return info.exists;
    } catch (e) {
      return false;
    }
  }

  async switchToUSBLiveMode() {
    this.mode = DEPLOYMENT_MODE.USB_LIVE;
    const connected = await USBStorageService.checkUSBConnected();
    return connected;
  }

  async switchToStandaloneMode() {
    const internalModel = await USBStorageService.getModelPath();
    if (internalModel) {
      this.mode = DEPLOYMENT_MODE.STANDALONE;
      return true;
    }
    return false;
  }

  async removeInternalModel() {
    try {
      const internalModel = await USBStorageService.getModelPath();
      if (internalModel) {
        await FileSystem.deleteAsync(internalModel, { idempotent: true });
      }
      const modelDir = `${FileSystem.documentDirectory}models`;
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(modelDir);
        if (files.length === 0) {
          await FileSystem.deleteAsync(modelDir, { idempotent: true });
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  isStandaloneMode() {
    return this.mode === DEPLOYMENT_MODE.STANDALONE;
  }

  isUSBLiveMode() {
    return this.mode === DEPLOYMENT_MODE.USB_LIVE;
  }

  reset() {
    this.deploymentStatus = DEPLOYMENT_STATUS.IDLE;
    this.progress = 0;
    this.progressMessage = '';
  }
}

export default new USBDeploymentService();
export { USBDeploymentService, DEPLOYMENT_MODE, DEPLOYMENT_STATUS };
