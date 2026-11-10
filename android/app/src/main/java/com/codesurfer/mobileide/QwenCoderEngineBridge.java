package com.codesurfer.mobileide;

import android.content.Context;
import android.content.res.AssetManager;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * QwenCoderEngineBridge — Bridge between React Native and the Qwen Coder engine.
 *
 * This wraps the native llama.cpp inference for on-device Qwen 2.5 Coder model.
 * It handles model extraction from assets, native library loading, and inference.
 *
 * The native library (libllama.so) must be present in jniLibs/<abi>/.
 * The model file (qwen2.5-coder-7b.gguf) should be in assets/models/ or
 * external storage at /sdcard/Android/data/com.codesurfer.mobileide/files/models/
 */
public class QwenCoderEngineBridge {

    private Context context;
    private boolean isInitialized = false;
    private String modelPath;
    private String externalModelPath = null;

    // Native method declarations — implemented in libllama.so
    private native boolean nativeInitialize(String modelPath, int contextSize, int gpuLayers);
    private native String nativeGenerate(String prompt, int maxTokens, float temperature);
    private native String nativeGenerateCode(String prompt, String language, int maxTokens);
    private native String nativeExplainCode(String code, String language, int maxTokens);
    private native String nativeFixCode(String code, String error, String language, int maxTokens);
    private native String nativeCompleteCode(String code, String language, int maxTokens);
    private native String nativeChat(String message, int maxTokens);
    private native void nativeCleanup();

    static {
        try {
            // Load in dependency order: base -> cpu -> ggml -> llama
            System.loadLibrary("ggml-base");
            System.loadLibrary("ggml-cpu");
            System.loadLibrary("ggml");
            System.loadLibrary("llama");
        } catch (UnsatisfiedLinkError e) {
            // Libraries not found — will fall back to mock
        }
    }

    public QwenCoderEngineBridge(Context context) {
        this.context = context;
    }

    public void initialize() throws Exception {
        if (isInitialized) {
            return;
        }

        modelPath = findModel();

        if (modelPath == null || !new File(modelPath).exists()) {
            throw new Exception("Qwen model file not found. Place qwen2.5-coder-7b.gguf in app storage or USB OTG /models/.");
        }

        boolean success;
        try {
            success = nativeInitialize(modelPath, 4096, 32);
        } catch (UnsatisfiedLinkError e) {
            throw new Exception("Qwen Coder native JNI bridge not available: " + e.getMessage());
        }

        if (!success) {
            throw new Exception("Failed to initialize Qwen Coder native engine with model: " + modelPath);
        }

        isInitialized = true;
    }

    public void setExternalModelPath(String path) {
        this.externalModelPath = path;
        if (isInitialized) {
            cleanup();
        }
    }

    private String findModel() {
        // 0. Check external model path (set from USB OTG or Storage Access Framework)
        if (externalModelPath != null) {
            File extModel = new File(externalModelPath);
            if (extModel.exists() && extModel.canRead()) {
                return extModel.getAbsolutePath();
            }
        }

        // 0.5 Check common USB OTG mount points (both root-level and CodeSurferMobileIDE container)
        String[] usbPaths = {
            "/mnt/usb/CodeSurferMobileIDE/models", "/mnt/usb/models",
            "/mnt/otg/CodeSurferMobileIDE/models", "/mnt/otg/models",
            "/mnt/media_rw/CodeSurferMobileIDE/models", "/mnt/media_rw/models",
            "/storage/usb/CodeSurferMobileIDE/models", "/storage/usb/models",
            "/storage/otg/CodeSurferMobileIDE/models", "/storage/otg/models",
        };
        for (String usbDir : usbPaths) {
            File usbModelDir = new File(usbDir);
            if (usbModelDir.exists() && usbModelDir.canRead()) {
                File[] models = usbModelDir.listFiles();
                if (models != null) {
                    for (File model : models) {
                        if (model.getName().endsWith(".gguf") || model.getName().endsWith(".bin")) {
                            return model.getAbsolutePath();
                        }
                    }
                }
            }
        }

        // Also check /storage subdirectories for OTG-mounted volumes
        File storageDir = new File("/storage");
        if (storageDir.exists() && storageDir.isDirectory()) {
            File[] volumes = storageDir.listFiles();
            if (volumes != null) {
                for (File volume : volumes) {
                    if (volume.isDirectory() && !volume.getName().equals("emulated") && !volume.getName().equals("self")) {
                        // Check both CodeSurferMobileIDE/models and root-level models
                        String[] modelDirPaths = {
                            "CodeSurferMobileIDE/models", "models"
                        };
                        for (String modelDirPath : modelDirPaths) {
                            File modelsDir = new File(volume, modelDirPath);
                            if (modelsDir.exists() && modelsDir.canRead()) {
                                // Search for .gguf/.bin in models dir and subdirectories
                                File[] modelFiles = modelsDir.listFiles();
                                if (modelFiles != null) {
                                    for (File model : modelFiles) {
                                        if (model.isFile() && (model.getName().endsWith(".gguf") || model.getName().endsWith(".bin"))) {
                                            return model.getAbsolutePath();
                                        }
                                        // Check subdirectories (e.g., qwen2.5-coder-7b/)
                                        if (model.isDirectory()) {
                                            File[] subFiles = model.listFiles();
                                            if (subFiles != null) {
                                                for (File subFile : subFiles) {
                                                    if (subFile.isFile() && (subFile.getName().endsWith(".gguf") || subFile.getName().endsWith(".bin"))) {
                                                        return subFile.getAbsolutePath();
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 1. Check external storage (user-placed model)
        File externalModel = new File(context.getExternalFilesDir(null), "models/qwen2.5-coder-7b.gguf");
        if (externalModel.exists()) {
            return externalModel.getAbsolutePath();
        }

        // 2. Check internal files directory
        File internalModel = new File(context.getFilesDir(), "models/qwen2.5-coder-7b.gguf");
        if (internalModel.exists()) {
            return internalModel.getAbsolutePath();
        }

        // 3. Try to extract from assets
        try {
            AssetManager assets = context.getAssets();
            String[] modelFiles = assets.list("models");

            if (modelFiles != null) {
                for (String modelFile : modelFiles) {
                    if (modelFile.endsWith(".gguf") || modelFile.endsWith(".bin")) {
                        File outputDir = new File(context.getFilesDir(), "models");
                        outputDir.mkdirs();
                        File outputFile = new File(outputDir, modelFile);

                        if (!outputFile.exists()) {
                            extractAsset(assets, "models/" + modelFile, outputFile);
                        }

                        return outputFile.getAbsolutePath();
                    }
                }
            }
        } catch (Exception e) {
            // Asset extraction failed
        }

        // 4. Return expected path for manual placement
        File modelDir = new File(context.getExternalFilesDir(null), "models");
        modelDir.mkdirs();
        return new File(modelDir, "qwen2.5-coder-7b.gguf").getAbsolutePath();
    }

    private void extractAsset(AssetManager assets, String assetPath, File outputFile) throws Exception {
        try (InputStream is = assets.open(assetPath);
             OutputStream os = new FileOutputStream(outputFile)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                os.write(buffer, 0, bytesRead);
            }
        }
    }

    public String generateCode(String prompt, String language, int maxTokens) throws Exception {
        ensureInitialized();
        try {
            return nativeGenerateCode(prompt, language, maxTokens);
        } catch (UnsatisfiedLinkError e) {
            return mockGenerate(prompt, language);
        }
    }

    public String explainCode(String code, String language, int maxTokens) throws Exception {
        ensureInitialized();
        try {
            return nativeExplainCode(code, language, maxTokens);
        } catch (UnsatisfiedLinkError e) {
            return mockExplain(code, language);
        }
    }

    public String fixCode(String code, String error, String language, int maxTokens) throws Exception {
        ensureInitialized();
        try {
            return nativeFixCode(code, error, language, maxTokens);
        } catch (UnsatisfiedLinkError e) {
            return mockFix(code, error, language);
        }
    }

    public String completeCode(String code, String language, int maxTokens) throws Exception {
        ensureInitialized();
        try {
            return nativeCompleteCode(code, language, maxTokens);
        } catch (UnsatisfiedLinkError e) {
            return mockComplete(code);
        }
    }

    public String chat(String message, int maxTokens) throws Exception {
        ensureInitialized();
        try {
            return nativeChat(message, maxTokens);
        } catch (UnsatisfiedLinkError e) {
            return "Mock chat response to: " + message;
        }
    }

    public void cleanup() {
        if (isInitialized) {
            try {
                nativeCleanup();
            } catch (UnsatisfiedLinkError e) {
                // ignore
            }
            isInitialized = false;
        }
    }

    private void ensureInitialized() throws Exception {
        if (!isInitialized) {
            initialize();
        }
    }

    // Mock fallbacks (used when native library is not available)
    private String mockGenerate(String prompt, String language) {
        return "// Generated by Qwen Coder 2.5-7B (mock)\n" +
               "// Language: " + language + "\n" +
               "// Prompt: " + prompt + "\n\n" +
               "function generated() {\n  return true;\n}";
    }

    private String mockExplain(String code, String language) {
        return "Code Explanation (mock):\n" +
               "Language: " + language + "\n" +
               code.substring(0, Math.min(200, code.length()));
    }

    private String mockFix(String code, String error, String language) {
        return "// Fixed code (mock)\n" + code;
    }

    private String mockComplete(String code) {
        if (code.endsWith("(")) return ") {\n  return result;\n}";
        if (code.endsWith("{")) return "\n  return result;\n}";
        return " // completion";
    }
}
