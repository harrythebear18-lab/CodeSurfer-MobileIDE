import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { USBStorageModule } = NativeModules;

class ModelReassemblyService {
  constructor() {
    this.reassembling = false;
    this.progress = 0;
    this.onProgressCallback = null;
  }

  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  updateProgress(progress, message) {
    this.progress = progress;
    if (this.onProgressCallback) {
      this.onProgressCallback({ progress, message });
    }
  }

  async readManifest(usbModelDir) {
    try {
      if (USBStorageModule && USBStorageModule.readFile) {
        const content = await USBStorageModule.readFile(`${usbModelDir}/manifest.json`);
        return JSON.parse(content);
      }
      return null;
    } catch (e) {
      console.error('Failed to read manifest:', e);
      return null;
    }
  }

  async findChunkedModelOnUSB(usbRootPath) {
    const possibleDirs = [
      `${usbRootPath}/CodeSurferMobileIDE/models/qwen2.5-coder-7b`,
      `${usbRootPath}/models/qwen2.5-coder-7b`,
    ];

    for (const dir of possibleDirs) {
      const manifest = await this.readManifest(dir);
      if (manifest && manifest.chunks && manifest.chunks.length > 0) {
        return { dir, manifest };
      }
    }

    // Also try scanning /storage subdirectories
    if (USBStorageModule && USBStorageModule.listFiles) {
      const storageDirs = ['/storage', '/mnt'];
      for (const storageDir of storageDirs) {
        try {
          const volumes = await USBStorageModule.listFiles(storageDir);
          if (volumes) {
            for (const vol of volumes) {
              if (!vol.isDirectory) continue;
              const modelDir = `${vol.path}/CodeSurferMobileIDE/models/qwen2.5-coder-7b`;
              const manifest = await this.readManifest(modelDir);
              if (manifest && manifest.chunks && manifest.chunks.length > 0) {
                return { dir: modelDir, manifest };
              }
            }
          }
        } catch (e) {}
      }
    }

    return null;
  }

  async reassembleToInternal(usbModelDir, manifest) {
    if (this.reassembling) {
      throw new Error('Reassembly already in progress');
    }

    this.reassembling = true;
    this.progress = 0;

    try {
      const internalModelDir = `${FileSystem.documentDirectory}models`;
      await FileSystem.makeDirectoryAsync(internalModelDir, { intermediates: true });

      const outputPath = `${internalModelDir}/${manifest.originalFile || 'qwen2.5-coder-7b.gguf'}`;

      // Check if already reassembled
      const existing = await FileSystem.getInfoAsync(outputPath);
      if (existing.exists && existing.size === manifest.totalSize) {
        this.updateProgress(100, 'Model already reassembled');
        this.reassembling = false;
        return { success: true, path: outputPath, skipped: true };
      }

      // Sort chunks by index
      const sortedChunks = [...manifest.chunks].sort((a, b) => a.index - b.index);
      const totalChunks = sortedChunks.length;

      // Use native reassembly for large files (streaming append with fsync)
      if (USBStorageModule && USBStorageModule.reassembleModel) {
        const chunkPaths = sortedChunks.map(c => `${usbModelDir}/${c.filename}`);
        this.updateProgress(10, `Reassembling ${totalChunks} chunks...`);

        const success = await USBStorageModule.reassembleModel(chunkPaths, outputPath);
        if (!success) {
          throw new Error('Native reassembly failed');
        }
      } else {
        // Fallback: use expo FileSystem (slower, may have memory limits)
        this.updateProgress(10, `Reassembling ${totalChunks} chunks (fallback mode)...`);

        for (let i = 0; i < sortedChunks.length; i++) {
          const chunk = sortedChunks[i];
          const chunkPath = `${usbModelDir}/${chunk.filename}`;
          const progressPercent = 10 + Math.round(((i + 1) / totalChunks) * 80);

          this.updateProgress(progressPercent, `Copying chunk ${i + 1}/${totalChunks}...`);

          if (USBStorageModule && USBStorageModule.readFile) {
            const content = await USBStorageModule.readFile(chunkPath);
            if (i === 0) {
              await FileSystem.writeAsStringAsync(outputPath, content);
            } else {
              await FileSystem.writeAsStringAsync(outputPath, content, { append: true });
            }
          } else {
            throw new Error('No method available to read USB files');
          }
        }
      }

      // Verify
      this.updateProgress(95, 'Verifying reassembled model...');
      const result = await FileSystem.getInfoAsync(outputPath);
      if (!result.exists) {
        throw new Error('Reassembled file not found');
      }

      if (manifest.totalSize && result.size !== manifest.totalSize) {
        console.warn(`Size mismatch: expected ${manifest.totalSize}, got ${result.size}`);
      }

      this.updateProgress(100, 'Model reassembly complete');
      this.reassembling = false;
      return { success: true, path: outputPath, size: result.size };
    } catch (error) {
      this.reassembling = false;
      this.updateProgress(0, `Reassembly failed: ${error.message}`);
      throw error;
    }
  }

  isReassembling() {
    return this.reassembling;
  }

  getProgress() {
    return this.progress;
  }
}

export default new ModelReassemblyService();
export { ModelReassemblyService };
