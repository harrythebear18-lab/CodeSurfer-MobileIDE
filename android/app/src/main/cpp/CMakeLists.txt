cmake_minimum_required(VERSION 3.22.1)

project(qwen_jni LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

set(LLAMA_CPP_VERSION "v0.9.0")
set(LLAMA_CPP_SHA256 "5d0f1aaf55fd8629c29a55e81b7cb63b80239f83c33a580963071204896836a8")

# Use a local llama.cpp checkout if LLAMA_CPP_DIR is set, otherwise download the pinned release.
if(DEFINED LLAMA_CPP_DIR)
    set(FETCHCONTENT_SOURCE_DIR_LLAMA_CPP ${LLAMA_CPP_DIR})
endif()

FetchContent_Declare(
    llama_cpp
    URL https://github.com/ggml-org/llama.cpp/archive/refs/tags/${LLAMA_CPP_VERSION}.tar.gz
    URL_HASH SHA256=${LLAMA_CPP_SHA256}
)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_APP OFF CACHE BOOL "" FORCE)
set(LLAMA_OPENSSL OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
if(ANDROID_ABI STREQUAL "arm64-v8a")
    set(GGML_CPU_ARM_ARCH "armv8.2-a+dotprod+fp16" CACHE STRING "" FORCE)
endif()

FetchContent_MakeAvailable(llama_cpp)

add_library(qwen_jni SHARED qwen_jni.cpp)
target_link_libraries(qwen_jni PRIVATE llama android log)
