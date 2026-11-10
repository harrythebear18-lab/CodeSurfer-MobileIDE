package com.codesurfer.mobileide;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONObject;
import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * AIBridgeModule — Abstraction layer for on-device AI backends.
 *
 * Detects and routes to:
 * 1. Samsung Galaxy AI (Samsung devices with Galaxy AI support)
 * 2. Google Gemini Nano (via Android AICore / Google Play Services)
 * 3. Qwen Coder via llama.cpp (local JNI inference)
 * 4. Fallback mock responses
 *
 * This module is the native side of AIBridgeService.js.
 */
public class AIBridgeModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "AIBridgeModule";

    private static final String BACKEND_SAMSUNG_GALAXY_AI = "samsung_galaxy_ai";
    private static final String BACKEND_GEMINI_NANO = "gemini_nano";
    private static final String BACKEND_QWEN_LLAMACPP = "qwen_llamacpp";
    private static final String BACKEND_MOCK = "mock";

    private final ReactApplicationContext reactContext;
    private QwenCoderEngineBridge qwenBridge;
    private boolean qwenInitialized = false;
    // Inference can take a long time; keep it off the shared native modules thread.
    private final ExecutorService taskExecutor = Executors.newSingleThreadExecutor();

    public AIBridgeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void setModelPath(String path, Promise promise) {
        try {
            if (qwenBridge == null) {
                qwenBridge = QwenCoderEngineBridge.getInstance(reactContext);
            }
            qwenBridge.setExternalModelPath(path);
            qwenInitialized = false;
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("MODEL_PATH_ERROR", e.getMessage());
        }
    }

    /**
     * Detect all available AI backends on this device.
     * Returns a WritableArray of backend identifier strings.
     */
    @ReactMethod
    public void detectBackends(Promise promise) {
        try {
            List<String> backends = new ArrayList<>();

            // 1. Check Samsung Galaxy AI
            if (isSamsungGalaxyAIAvailable()) {
                backends.add(BACKEND_SAMSUNG_GALAXY_AI);
            }

            // 2. Check Google Gemini Nano (AICore)
            if (isGeminiNanoAvailable()) {
                backends.add(BACKEND_GEMINI_NANO);
            }

            // 3. Check Qwen/llama.cpp
            if (isQwenLlamaCppAvailable()) {
                backends.add(BACKEND_QWEN_LLAMACPP);
            }

            // 4. Always have mock as fallback
            backends.add(BACKEND_MOCK);

            WritableArray result = Arguments.createArray();
            for (String backend : backends) {
                result.pushString(backend);
            }

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("DETECT_ERROR", "Failed to detect AI backends: " + e.getMessage());
        }
    }

    /**
     * Execute a task on the specified backend.
     *
     * @param taskType   One of: generate_code, explain_code, fix_code, complete_code,
     *                   chat, analyze_code, analyze_error, code_review, debug_summary
     * @param backend    Backend identifier string
     * @param paramsJson JSON string with task parameters
     */
    @ReactMethod
    public void executeTask(String taskType, String backend, String paramsJson, Promise promise) {
        taskExecutor.execute(() -> runTask(taskType, backend, paramsJson, promise));
    }

    private void runTask(String taskType, String backend, String paramsJson, Promise promise) {
        try {
            JSONObject params = new JSONObject(paramsJson);

            String result;
            switch (backend) {
                case BACKEND_SAMSUNG_GALAXY_AI:
                    result = executeSamsungGalaxyAI(taskType, params);
                    break;

                case BACKEND_GEMINI_NANO:
                    result = executeGeminiNano(taskType, params);
                    break;

                case BACKEND_QWEN_LLAMACPP:
                    result = executeQwenLlamaCpp(taskType, params);
                    break;

                case BACKEND_MOCK:
                default:
                    result = executeMock(taskType, params);
                    break;
            }

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("EXECUTE_ERROR", "Task execution failed: " + e.getMessage());
        }
    }

    // ==================== Backend Detection ====================

    private boolean isSamsungGalaxyAIAvailable() {
        try {
            // Samsung Galaxy AI is available on S24 series and newer
            // Check via Samsung's SDK availability
            String manufacturer = Build.MANUFACTURER;
            if (!"samsung".equalsIgnoreCase(manufacturer)) {
                return false;
            }

            // S24 Ultra model check (also covers S24, S24+, Z Fold 6, etc.)
            String model = Build.MODEL;
            if (model != null && (model.contains("SM-S924") || model.contains("SM-S921") ||
                    model.contains("SM-S926") || model.contains("SM-F956") || model.contains("SM-F746"))) {
                return true;
            }

            // Broader check: Samsung devices with Android 14+ (One UI 6.1+) likely have Galaxy AI
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                return true;
            }

            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isGeminiNanoAvailable() {
        try {
            // Gemini Nano is available via Android's AICore (Google Play Services)
            // Check if AICore package is installed
            Context context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();

            try {
                pm.getPackageInfo("com.google.android.aicore", 0);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // AICore not found, try Google Play Services AI
            }

            // Check via Google Play Services availability
            try {
                pm.getPackageInfo("com.google.android.gms", 0);
                // Play Services exists — Gemini Nano may be downloadable
                // On Android 14+ with sufficient hardware, it's typically available
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    return true;
                }
            } catch (PackageManager.NameNotFoundException e) {
                // Play Services not found
            }

            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isQwenLlamaCppAvailable() {
        try {
            System.loadLibrary("qwen_jni");
            return true;
        } catch (UnsatisfiedLinkError e) {
            return false;
        }
    }

    // ==================== Samsung Galaxy AI ====================

    private String executeSamsungGalaxyAI(String taskType, JSONObject params) throws Exception {
        // Samsung Galaxy AI provides on-device LLM capabilities via:
        // - Samsung Neural SDK (com.samsung.android.ai.neural)
        // - Galaxy AI APIs (One UI 6.1+)
        //
        // For code tasks, we use the text generation capability.
        // The actual Samsung SDK calls would go here.

        String prompt = buildPromptFromTask(taskType, params);

        // Try Samsung's on-device AI SDK
        try {
            // Samsung Neural SDK integration point:
            // com.samsung.android.ai.neural.NeuralApi
            // For now, we attempt to use the system's built-in text generation

            // If Samsung SDK is not directly accessible via reflection,
            // fall through to a basic on-device inference
            throw new Exception("Samsung Galaxy AI SDK integration pending — using fallback");
        } catch (Exception e) {
            // Fallback: if Samsung SDK not directly accessible,
            // try Gemini Nano as secondary on-device option
            if (isGeminiNanoAvailable()) {
                return executeGeminiNano(taskType, params);
            }
            throw e;
        }
    }

    // ==================== Google Gemini Nano ====================

    private String executeGeminiNano(String taskType, JSONObject params) throws Exception {
        // Gemini Nano is accessible via Android's AICore framework
        // Using Google Generative AI on-device API
        //
        // Integration point:
        // com.google.android.aicore / Google Generative AI client
        //
        // The actual API call would be:
        // 1. Get AICore client
        // 2. Create a generative model session
        // 3. Send prompt
        // 4. Get response

        String prompt = buildPromptFromTask(taskType, params);

        try {
            // Google AICore integration point:
            // This would use com.google.android.aicore.AiCoreClient
            // or the GenerativeModel API from Google Play Services

            throw new Exception("Gemini Nano AICore integration pending — using fallback");
        } catch (Exception e) {
            // If Gemini Nano SDK not accessible, try Qwen
            if (isQwenLlamaCppAvailable()) {
                return executeQwenLlamaCpp(taskType, params);
            }
            throw e;
        }
    }

    // ==================== Qwen / llama.cpp ====================

    private String executeQwenLlamaCpp(String taskType, JSONObject params) throws Exception {
        if (!qwenInitialized) {
            initializeQwenBridge();
        }

        if (qwenBridge == null) {
            throw new Exception("Qwen bridge not available");
        }

        String prompt = buildPromptFromTask(taskType, params);
        int maxTokens = params.optInt("maxTokens", 500);
        String language = params.optString("language", "javascript");

        switch (taskType) {
            case "generate_code":
                return qwenBridge.generateCode(prompt, language, maxTokens);

            case "explain_code":
                String code = params.optString("code", "");
                return qwenBridge.explainCode(code, language, maxTokens);

            case "fix_code":
                String fixCode = params.optString("code", "");
                String error = params.optString("error", "");
                return qwenBridge.fixCode(fixCode, error, language, maxTokens);

            case "complete_code":
                String partialCode = params.optString("code", "");
                return qwenBridge.completeCode(partialCode, language, maxTokens);

            case "chat":
                String message = params.optString("message", "");
                return qwenBridge.chat(message, maxTokens);

            default:
                return qwenBridge.generateCode(prompt, language, maxTokens);
        }
    }

    private void initializeQwenBridge() {
        try {
            if (qwenBridge == null) {
                qwenBridge = QwenCoderEngineBridge.getInstance(getReactApplicationContext());
            }
            qwenBridge.initialize();
            qwenInitialized = true;
        } catch (Exception e) {
            qwenBridge = null;
            qwenInitialized = false;
        }
    }

    // ==================== Mock Fallback ====================

    private String executeMock(String taskType, JSONObject params) throws Exception {
        Thread.sleep(100);

        switch (taskType) {
            case "generate_code":
                return "// Generated code (" + params.optString("language", "javascript") + ")\n" +
                        "// Prompt: " + params.optString("prompt", "") + "\n\n" +
                        "function generated() {\n  return true;\n}";

            case "explain_code":
                return "Code Explanation (mock):\n\nThis code performs operations as written.";

            case "fix_code":
                return "// Fixed code (mock)\n" + params.optString("code", "");

            case "complete_code":
                return "\n  // Completion (mock)\n  return result;\n}";

            case "chat":
                return "Response (mock): " + params.optString("message", "");

            case "analyze_code":
                return new JSONObject()
                        .put("potentialBugs", new JSONArray())
                        .put("suggestedBreakpoints", new JSONArray())
                        .put("codeQuality", new JSONArray())
                        .put("performance", new JSONArray())
                        .put("security", new JSONArray())
                        .put("bestPractices", new JSONArray())
                        .toString();

            case "analyze_error":
                return new JSONObject()
                        .put("rootCause", "Unable to determine (mock)")
                        .put("suggestedFixes", new JSONArray())
                        .put("prevention", new JSONArray())
                        .put("relatedPatterns", new JSONArray())
                        .toString();

            case "code_review":
                return new JSONObject()
                        .put("debuggingScore", 50)
                        .put("issues", new JSONArray())
                        .put("strengths", new JSONArray())
                        .put("improvements", new JSONArray())
                        .toString();

            case "debug_summary":
                return new JSONObject()
                        .put("summary", "Debug session completed (mock)")
                        .put("keyInsights", new JSONArray())
                        .put("recommendations", new JSONArray())
                        .put("codeQualityScore", 50)
                        .put("debuggingEfficiency", "unknown")
                        .toString();

            default:
                return "(Mock response)";
        }
    }

    // ==================== Prompt Building ====================

    private String buildPromptFromTask(String taskType, JSONObject params) {
        String language = params.optString("language", "javascript");

        switch (taskType) {
            case "generate_code":
                return "Generate " + language + " code for: " + params.optString("prompt", "");

            case "explain_code":
                return "Explain this " + language + " code:\n" + params.optString("code", "");

            case "fix_code":
                String error = params.optString("error", "");
                return "Fix this " + language + " code" + (error.isEmpty() ? "" : " (error: " + error + ")") + ":\n" +
                        params.optString("code", "");

            case "complete_code":
                return "Complete this " + language + " code:\n" + params.optString("code", "");

            case "chat":
                return params.optString("message", "");

            default:
                return params.optString("prompt", params.optString("message", ""));
        }
    }
}
