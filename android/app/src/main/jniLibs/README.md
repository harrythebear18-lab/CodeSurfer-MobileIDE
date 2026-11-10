# jniLibs — Native Shared Libraries

Place cross-compiled `libllama.so` files here. Android will package them into the APK automatically.

## Directory Structure

```
jniLibs/
├── arm64-v8a/       ← S24 Ultra (primary target)
│   └── libllama.so
├── armeabi-v7a/     ← Older ARM devices (optional)
│   └── libllama.so
└── x86_64/          ← Emulator testing (optional)
    └── libllama.so
```

## How to Build libllama.so

### Prerequisites
- Android NDK 25+ (tested with 26.1.10909125)
- CMake 3.14+
- llama.cpp source (clone from https://github.com/ggerganov/llama.cpp)

### Quick Build (Linux/WSL/Mac)

```bash
export ANDROID_NDK=/path/to/android-sdk/ndk/26.1.10909125
cd llama.cpp

cmake \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-28 \
  -DBUILD_SHARED_LIBS=ON \
  -DGGML_OPENMP=OFF \
  -DGGML_VULKAN=ON \
  -DLLAMA_CURL=OFF \
  -DCMAKE_BUILD_TYPE=Release \
  -B build-android-arm64

cmake --build build-android-arm64 --config Release -j$(nproc)
```

### Copy Output

```bash
cp build-android-arm64/bin/libllama.so ../CodeSurfer-MobileIDE/android/app/src/main/jniLibs/arm64-v8a/
```

If Vulkan acceleration is enabled, also copy any dependent `.so` files (e.g., `libggml.so`).

### Or Use the Build Script

```bash
cd CodeSurfer-MobileIDE/scripts
export ANDROID_NDK=/path/to/ndk
./build-libllama-android.sh
```

## S24 Ultra Specifics

- **ABI**: arm64-v8a
- **Target API**: android-28 (Android 9+, S24 Ultra runs Android 14+)
- **GPU**: Vulkan ON for GPU acceleration (Adreno 750)
- **Memory**: `android:largeHeap="true"` in manifest for 4.7GB model mmap
- **Context**: 4096 tokens, 32 GPU layers

## Verification

After building, verify the .so is arm64:

```bash
file libllama.so
# Should show: ELF 64-bit LSB shared object, ARM aarch64
```
