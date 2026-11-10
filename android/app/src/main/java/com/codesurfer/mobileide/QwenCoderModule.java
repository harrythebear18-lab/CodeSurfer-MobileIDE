package com.codesurfer.mobileide;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

/**
 * Qwen Coder Module - React Native native module for Qwen Coder integration
 * This module provides an interface to Qwen Coder AI capabilities
 * within the CodeSurfer MobileIDE React Native app.
 */

public class QwenCoderModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "QwenCoderModule";
    private boolean isInitialized = false;
    private QwenCoderEngineBridge engineBridge;

    public QwenCoderModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.engineBridge = new QwenCoderEngineBridge(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initialize(Promise promise) {
        try {
            engineBridge.initialize();
            isInitialized = true;

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Qwen Coder engine initialized");
            result.putString("version", "2.5-7b");

            promise.resolve(result);
        } catch (Exception e) {
            isInitialized = false;
            promise.reject("INIT_ERROR", "Failed to initialize Qwen Coder: " + e.getMessage());
        }
    }

    @ReactMethod
    public void generateCode(String prompt, String language, int maxTokens, Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "Qwen Coder module is not initialized");
                return;
            }

            String response = engineBridge.generateCode(prompt, language, maxTokens);

            WritableMap result = Arguments.createMap();
            result.putString("code", response);
            result.putString("language", language);
            result.putInt("tokensGenerated", response.length() / 4);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("CODE_GENERATION_ERROR", "Failed to generate code: " + e.getMessage());
        }
    }

    @ReactMethod
    public void chat(String message, String[] context, int maxTokens, Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "Qwen Coder module is not initialized");
                return;
            }

            String response = engineBridge.chat(message, maxTokens);

            WritableMap result = Arguments.createMap();
            result.putString("response", response);
            result.putInt("tokensGenerated", response.length() / 4);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("CHAT_ERROR", "Failed to chat: " + e.getMessage());
        }
    }

    @ReactMethod
    public void completeCode(String code, String language, int maxTokens, Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "Qwen Coder module is not initialized");
                return;
            }

            String completion = engineBridge.completeCode(code, language, maxTokens);

            WritableMap result = Arguments.createMap();
            result.putString("completion", completion);
            result.putString("language", language);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("CODE_COMPLETION_ERROR", "Failed to complete code: " + e.getMessage());
        }
    }

    @ReactMethod
    public void fixCode(String code, String error, String language, int maxTokens, Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "Qwen Coder module is not initialized");
                return;
            }

            String fixedCode = engineBridge.fixCode(code, error, language, maxTokens);

            WritableMap result = Arguments.createMap();
            result.putString("fixedCode", fixedCode);
            result.putString("language", language);
            result.putBoolean("hasFix", true);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("CODE_FIX_ERROR", "Failed to fix code: " + e.getMessage());
        }
    }

    @ReactMethod
    public void explainCode(String code, String language, int maxTokens, Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "Qwen Coder module is not initialized");
                return;
            }

            String explanation = engineBridge.explainCode(code, language, maxTokens);

            WritableMap result = Arguments.createMap();
            result.putString("explanation", explanation);
            result.putString("language", language);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("CODE_EXPLANATION_ERROR", "Failed to explain code: " + e.getMessage());
        }
    }
}
