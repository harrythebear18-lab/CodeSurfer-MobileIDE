# Qwen Coder Integration — Architecture & Implementation

## Overview

CodeSurfer MobileIDE integrates Qwen Coder 2.5-7B as the **base AI engine** for fully offline, on-device code generation, debugging, and analysis. The app runs as a standalone native Android APK with no cloud dependency.

## Architecture: AIBridgeService Abstraction Layer

The AI system uses a multi-backend abstraction layer that prioritizes local Qwen/llama.cpp as the base, with device-specific AI as additive acceleration.

### Backend Priority (fallback chain)

1. **Samsung Galaxy AI** (additive) — S24 Ultra's built-in on-device LLM via Samsung Neural SDK
2. **Google Gemini Nano** (additive) — Via Android AICore / Google Play Services
3. **Qwen Coder 2.5-7B via llama.cpp** (base) — Local JNI inference with GGUF model
4. **Ollama HTTP API** (optional) — Local server at 127.0.0.1:11434 if running
5. **Mock fallback** — Basic responses when no AI backend is available

### Key Principle

The USB drive contains everything needed as a complete base. The S24 Ultra's built-in AI is additive — the app works fully without it. Qwen Coder variants are the "secret sauce" that makes it portable.

## Implemented Components

### JavaScript Layer

- **`src/services/AIBridgeService.js`** — Abstraction layer with unified async methods:
  - `detectBackends()` — Discovers available AI backends at runtime
  - `generateCode()`, `explainCode()`, `fixCode()`, `completeCode()`, `chat()`
  - `analyzeCode()`, `analyzeError()`, `codeReview()`, `debugSummary()`
  - Automatic fallback chain with backend selection
  - Constants: `AI_BACKEND` (SAMSUNG_GALAXY_AI, GEMINI_NANO, QWEN_LLAMACPP, OLLAMA, MOCK)

- **`src/services/QwenCoderService.js`** — Wraps AIBridgeService for backward-compatible API
  - Delegates all calls to AIBridgeService
  - Returns objects matching original interface (`{code, language, tokensGenerated}`)

- **`src/services/aiDebuggerService.js`** — AI-powered debugging
  - `callAI()` now routes through AIBridgeService.chat()
  - Code analysis, error analysis, breakpoint suggestions, code review, debug reports

### Native Android Layer

- **`android/.../AIBridgeModule.java`** — React Native native module
  - `detectBackends()` — Checks Samsung manufacturer/model, AICore package, libllama.so
  - `executeTask(taskType, backend, paramsJson)` — Routes to selected backend
  - Samsung Galaxy AI detection: S24 series (SM-S924/S921/S926), Z Fold 6, Android 14+
  - Gemini Nano detection: `com.google.android.aicore` package or Play Services on Android 14+

- **`android/.../AIBridgePackage.java`** — React Native package registration
  - Registers both `AIBridgeModule` and `QwenCoderModule`

- **`android/.../QwenCoderModule.java`** — React Native module for Qwen Coder
  - Delegates to `QwenCoderEngineBridge` for real inference
  - Methods: `initialize()`, `generateCode()`, `chat()`, `completeCode()`, `fixCode()`, `explainCode()`

- **`android/.../QwenCoderEngineBridge.java`** — JNI bridge to llama.cpp
  - Loads `libllama.so` native library
  - Extracts GGUF model from assets or external storage
  - Model search order: external storage → internal files → assets
  - Native methods for all AI tasks with mock fallback

- **`android/.../MainApplication.kt`** — Updated to register `AIBridgePackage`

### Standalone APK (`qwen-coder-apk/`)

- **`QwenCoderEngine.java`** — Core engine for standalone APK
  - JNI native methods: `nativeInitialize`, `nativeGenerateCode`, `nativeExplainCode`, `nativeFixCode`, `nativeCompleteCode`, `nativeChat`, `nativeCleanup`
  - Model extraction from assets (`.gguf` and `.bin` supported)
  - Mock fallbacks for all methods

- **`MainActivity.java`** — Standalone UI with Generate/Explain/Fix buttons

## Model File

- **File**: `qwen2.5-coder-7b.gguf` (renamed from `.bin`)
- **Size**: ~4.7GB
- **Location**: `qwen-coder-apk/app/src/main/assets/models/`
- **Format**: GGUF (llama.cpp compatible)
- **Context size**: 4096 tokens
- **GPU layers**: 32 (for S24 Ultra GPU acceleration)

## Offline-First Design

Everything works without network connectivity:

- **Auth**: `realAuthService.js` uses `expo-secure-store` for local user storage — no Firebase
- **Editor**: Native `TextInput`-based code editor with line numbers — no WebView, no Monaco CDN
- **AI**: Qwen Coder via llama.cpp JNI — no cloud API calls
- **File system**: `expo-file-system` for local file operations
- **Git**: `gitService.js` with local repo management
- **Compiler**: `compilerService.js` with native module integration

## Metro Bundler Fix (Windows)

- `metro.config.js` patched for `node:sea` compatibility
- Aliases `node:sea` to empty module
- Server middleware blocks `node:sea` HTTP requests
- Preserves default transformer config from `getDefaultConfig()`

## Settings Integration

- `SettingsScreen.js` wired to `AppContext` settings state
- Settings persist via reducer state (fontSize, tabSize, wordWrap, minimap, autoComplete, linting, darkMode, autoSave)
- Reset and Export functions implemented

## Build & Deployment

### Prerequisites
- Android SDK (compileSdk 34, minSdk 21)
- NDK 25.1.8937393
- Java 17
- `libllama.so` compiled for arm64-v8a (S24 Ultra)

### Model Placement
The GGUF model can be placed in:
1. App assets: `app/src/main/assets/models/qwen2.5-coder-7b.gguf`
2. External storage: `/sdcard/Android/data/com.codesurfer.mobileide/files/models/`
3. Internal files: app's `filesDir/models/`

### Native Library
`libllama.so` must be placed in:
- `android/app/src/main/jniLibs/arm64-v8a/libllama.so`
- `qwen-coder-apk/app/src/main/jniLibs/arm64-v8a/libllama.so`

## File Summary

| File | Purpose |
|------|---------|
| `src/services/AIBridgeService.js` | AI abstraction layer (multi-backend) |
| `src/services/QwenCoderService.js` | Qwen Coder wrapper (delegates to AIBridge) |
| `src/services/aiDebuggerService.js` | AI debugging (uses AIBridge) |
| `src/services/realAuthService.js` | Offline auth (SecureStore, no Firebase) |
| `src/screens/EditorScreen.js` | Native TextInput code editor (no WebView) |
| `src/screens/SettingsScreen.js` | Settings wired to AppContext |
| `android/.../AIBridgeModule.java` | Native AI backend detection & routing |
| `android/.../AIBridgePackage.java` | React Native module registration |
| `android/.../QwenCoderModule.java` | Native Qwen Coder module |
| `android/.../QwenCoderEngineBridge.java` | JNI bridge to llama.cpp |
| `android/.../MainApplication.kt` | Registers AIBridgePackage |
| `android/.../USBStorageModule.java` | Native USB OTG storage access (read/write/flush/install) |
| `qwen-coder-apk/.../QwenCoderEngine.java` | Standalone APK engine |
| `qwen-coder-apk/.../MainActivity.java` | Standalone APK UI |
| `metro.config.js` | Metro bundler with node:sea fix |
| `src/services/usbStorageService.js` | USB OTG service (model discovery, workspace sync, flush) |

## USB OTG Portable Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                   USB DRIVE (64GB+)                    │
│                                                        │
│  ├── /source/        ──────> React Native App Source   │
│  ├── /models/        ──────> Qwen GGUF / Weights       │
│  ├── /binaries/      ──────> APK Release & Build Tools │
│  └── /workspace/     ──────> Active Code Repos & Notes │
└──────────────────────────┬─────────────────────────────┘
                           │ Physical OTG Attachment
                           ▼
┌────────────────────────────────────────────────────────┐
│                   S24 ULTRA (HOST)                     │
│                                                        │
│  • Reads app build / installs direct from USB OTG      │
│  • Loads GGUF model directly into RAM/NPU from USB     │
│  • Saves all commit logs & edits back to USB           │
└────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Decoupled Model Storage**: GGUF models live in `/models/` on USB, not in the APK. This keeps the APK small and fast to update. The `AIBridgeService` dynamically selects model paths from USB OTG first, then internal storage.

2. **Native Library Stays in APK**: `libllama.so` remains inside the APK's `jniLibs/` — Android's kernel prevents executing binaries directly off USB (`noexec` flag). The native lib reads model weights from USB, but executes from internal storage.

3. **Write Buffering & Safe Removal**: All USB writes use `fsync`/`getFD().sync()` at the native level (`USBStorageModule.writeFile`, `flushFile`). The `USBStorageService.safeUnmount()` method flushes all buffers before unmount. Users should also use Android's notification bar to safely unmount OTG.

4. **Workspace Sync**: Edits made in the mobile IDE write directly back to `/workspace/` on the USB drive. When plugged into a desktop (Win 10/11), the exact workspace state is immediately available.

5. **Direct APK Installation**: Compiled APK sits in `/binaries/` on the USB root. `USBStorageModule.installAPK()` triggers Android's package installer directly from the OTG path — no ADB or Wi-Fi transfer needed.

### USB Model Path Resolution (Priority Order)

1. External model path set via `AIBridgeModule.setModelPath()` (from Storage Access Framework)
2. USB OTG mount points: `/mnt/usb/models/`, `/mnt/otg/models/`, `/storage/*/models/`
3. App external storage: `/sdcard/Android/data/com.codesurfer.mobileide/files/models/`
4. App internal files: `context.getFilesDir()/models/`
5. App assets: `assets/models/` (extracted to internal storage on first run)

### USB Storage Service API

| Method | Purpose |
|--------|---------|
| `checkUSBConnected()` | Detect OTG connection and resolve volume path |
| `findModelOnUSB()` | Search `/models/` for `.gguf` or `.bin` files |
| `getModelPath()` | Resolve model from USB → internal → assets |
| `readFileFromUSB(path)` | Read file from OTG storage |
| `writeFileToUSB(path, content)` | Write + fsync to OTG storage |
| `flushFile(path)` | Force flush specific file to disk |
| `flushAll()` | Flush all pending writes |
| `safeUnmount()` | Flush + unmount (safe removal) |
| `saveToWorkspace(name, content)` | Write to `/workspace/` on USB |
| `readFromWorkspace(name)` | Read from `/workspace/` on USB |
| `findAPKOnUSB()` | Search `/binaries/` for `.apk` |
| `installAPKFromUSB()` | Trigger Android package installer from OTG |
| `requestStoragePermissions()` | Request MANAGE_EXTERNAL_STORAGE on Android 11+ |
