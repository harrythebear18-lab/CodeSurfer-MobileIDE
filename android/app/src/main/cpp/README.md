# Qwen Coder native bridge

`qwen_jni.cpp` implements the `native*` methods of `QwenCoderEngineBridge.java` on top of llama.cpp.

Gradle builds it automatically with the NDK (`externalNativeBuild` in `android/app/build.gradle`):

- CMake downloads the pinned llama.cpp release (`LLAMA_CPP_VERSION` in `CMakeLists.txt`) and links it statically into `libqwen_jni.so`.
- ABIs: `arm64-v8a` (S24 Ultra) and `x86_64` (emulator). On other ABIs the Qwen backend reports an error.
- To build offline, point CMake at a local checkout: add `arguments "-DLLAMA_CPP_DIR=/path/to/llama.cpp"` to the `cmake` block.

No prebuilt `.so` files are needed in `jniLibs/`.

## Model

Qwen2.5-Coder-1.5B-Instruct Q4_K_M (~1.1 GB) is bundled in the APK: the Gradle task `downloadBundledModel` fetches it into `build/generated/qwen-model/models/` (SHA-256 pinned) and it is packed uncompressed into `assets/models/`. On first use it is extracted to internal `files/models/`. Build with `-PskipBundledModel=true` to leave it out.

The AI Chat screen can download Qwen2.5-Coder-7B-Instruct Q4_K_M (~4.7 GB) to `files/models/qwen2.5-coder-7b.gguf`, which then takes priority over the bundled model.

`QwenCoderEngineBridge.findModel()` searches, in order: the path set from USB/OTG, `<usb>/CodeSurferMobileIDE/models/` and `<usb>/models/`, `Android/data/com.codesurfer.mobileide/files/models/qwen2.5-coder-7b.gguf`, internal `files/models/qwen2.5-coder-7b.gguf`, then `assets/models/`.
