package com.codesurfer.mobileide;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Qwen Coder Module - React Native native module for the on-device Qwen Coder engine.
 * Calls run on a background thread; the engine loads the model on first use.
 */
public class QwenCoderModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "QwenCoderModule";
    private final QwenCoderEngineBridge engineBridge;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public QwenCoderModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.engineBridge = QwenCoderEngineBridge.getInstance(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private interface Task {
        WritableMap run() throws Exception;
    }

    private void runAsync(Promise promise, String errorCode, String errorPrefix, Task task) {
        executor.execute(() -> {
            try {
                promise.resolve(task.run());
            } catch (Exception e) {
                promise.reject(errorCode, errorPrefix + e.getMessage());
            }
        });
    }

    private WritableMap status() {
        WritableMap result = Arguments.createMap();
        String path = engineBridge.getModelPath();
        boolean exists = path != null && new File(path).exists();
        result.putBoolean("initialized", engineBridge.isInitialized());
        result.putBoolean("modelFound", exists);
        result.putString("modelPath", path);
        result.putString("modelName", path != null ? new File(path).getName() : null);
        result.putDouble("modelSizeBytes", exists ? new File(path).length() : 0);
        return result;
    }

    @ReactMethod
    public void getStatus(Promise promise) {
        try {
            promise.resolve(status());
        } catch (Exception e) {
            promise.reject("STATUS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void initialize(Promise promise) {
        runAsync(promise, "INIT_ERROR", "Failed to initialize Qwen Coder: ", () -> {
            engineBridge.initialize();
            WritableMap result = status();
            result.putBoolean("success", true);
            return result;
        });
    }

    @ReactMethod
    public void reload(Promise promise) {
        runAsync(promise, "INIT_ERROR", "Failed to load model: ", () -> {
            engineBridge.reload();
            return status();
        });
    }

    @ReactMethod
    public void generateCode(String prompt, String language, int maxTokens, Promise promise) {
        runAsync(promise, "CODE_GENERATION_ERROR", "Failed to generate code: ", () -> {
            String response = engineBridge.generateCode(prompt, language, maxTokens);
            WritableMap result = Arguments.createMap();
            result.putString("code", response);
            result.putString("language", language);
            result.putInt("tokensGenerated", response.length() / 4);
            return result;
        });
    }

    @ReactMethod
    public void chat(String message, ReadableArray context, int maxTokens, Promise promise) {
        runAsync(promise, "CHAT_ERROR", "Failed to chat: ", () -> {
            long start = System.currentTimeMillis();
            String response = engineBridge.chat(message, maxTokens);
            WritableMap result = Arguments.createMap();
            result.putString("response", response);
            result.putInt("tokensGenerated", response.length() / 4);
            result.putDouble("durationMs", System.currentTimeMillis() - start);
            return result;
        });
    }

    @ReactMethod
    public void completeCode(String code, String language, int maxTokens, Promise promise) {
        runAsync(promise, "CODE_COMPLETION_ERROR", "Failed to complete code: ", () -> {
            WritableMap result = Arguments.createMap();
            result.putString("completion", engineBridge.completeCode(code, language, maxTokens));
            result.putString("language", language);
            return result;
        });
    }

    @ReactMethod
    public void fixCode(String code, String error, String language, int maxTokens, Promise promise) {
        runAsync(promise, "CODE_FIX_ERROR", "Failed to fix code: ", () -> {
            WritableMap result = Arguments.createMap();
            result.putString("fixedCode", engineBridge.fixCode(code, error, language, maxTokens));
            result.putString("language", language);
            result.putBoolean("hasFix", true);
            return result;
        });
    }

    @ReactMethod
    public void explainCode(String code, String language, int maxTokens, Promise promise) {
        runAsync(promise, "CODE_EXPLANATION_ERROR", "Failed to explain code: ", () -> {
            WritableMap result = Arguments.createMap();
            result.putString("explanation", engineBridge.explainCode(code, language, maxTokens));
            result.putString("language", language);
            return result;
        });
    }
}
