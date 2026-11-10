# Qwen Coder native bridge

`qwen_jni.cpp` implements the `native*` methods of `QwenCoderEngineBridge.java` on top of llama.cpp.

Gradle builds it automatically with the NDK (`externalNativeBuild` in `android/app/build.gradle`):

- CMake downloads the pinned llama.cpp release (`LLAMA_CPP_VERSION` in `CMakeLists.txt`) and links it statically into `libqwen_jni.so`.
- ABIs: `arm64-v8a` (S24 Ultra) and `x86_64` (emulator). Other ABIs fall back to the mock backend.
- To build offline, point CMake at a local checkout: add `arguments "-DLLAMA_CPP_DIR=/path/to/llama.cpp"` to the `cmake` block.

No prebuilt `.so` files are needed in `jniLibs/`.

## Model

Any GGUF chat model works; the target is Qwen2.5-Coder-7B-Instruct (Q4_K_M, ~4.7 GB). `QwenCoderEngineBridge.findModel()` searches, in order: the path set from USB/OTG, `<usb>/CodeSurferMobileIDE/models/` and `<usb>/models/`, `Android/data/com.codesurfer.mobileide/files/models/qwen2.5-coder-7b.gguf`, internal `files/models/`, then `assets/models/`.
