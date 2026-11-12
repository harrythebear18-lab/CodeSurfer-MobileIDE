#include <jni.h>
#include <android/log.h>

#include <algorithm>
#include <atomic>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "llama.h"

#define TAG "QwenJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

namespace {

std::mutex g_mutex;
llama_model * g_model = nullptr;
llama_context * g_ctx = nullptr;
std::atomic<bool> g_cancel{false};
// Tokens currently held in the KV cache, so the next prompt only decodes what changed.
std::vector<llama_token> g_cached;

const char * SYSTEM_PROMPT = "You are Qwen Coder, a helpful coding assistant inside the CodeSurfer mobile IDE. Answer concisely.";

// GetStringUTFChars returns modified UTF-8, so convert from UTF-16 instead.
std::string to_std(JNIEnv * env, jstring s) {
    if (s == nullptr) return "";
    const jsize n = env->GetStringLength(s);
    const jchar * chars = env->GetStringChars(s, nullptr);
    std::string out;
    out.reserve(n);
    for (jsize i = 0; i < n; i++) {
        uint32_t cp = chars[i];
        if (cp >= 0xD800 && cp <= 0xDBFF && i + 1 < n && chars[i + 1] >= 0xDC00 && chars[i + 1] <= 0xDFFF) {
            cp = 0x10000 + ((cp - 0xD800) << 10) + (chars[++i] - 0xDC00);
        }
        if (cp < 0x80) {
            out += (char) cp;
        } else if (cp < 0x800) {
            out += (char) (0xC0 | (cp >> 6));
            out += (char) (0x80 | (cp & 0x3F));
        } else if (cp < 0x10000) {
            out += (char) (0xE0 | (cp >> 12));
            out += (char) (0x80 | ((cp >> 6) & 0x3F));
            out += (char) (0x80 | (cp & 0x3F));
        } else {
            out += (char) (0xF0 | (cp >> 18));
            out += (char) (0x80 | ((cp >> 12) & 0x3F));
            out += (char) (0x80 | ((cp >> 6) & 0x3F));
            out += (char) (0x80 | (cp & 0x3F));
        }
    }
    env->ReleaseStringChars(s, chars);
    return out;
}

void log_to_logcat(ggml_log_level level, const char * text, void *) {
    if (level == GGML_LOG_LEVEL_ERROR) {
        __android_log_write(ANDROID_LOG_ERROR, TAG, text);
    } else if (level == GGML_LOG_LEVEL_WARN) {
        __android_log_write(ANDROID_LOG_WARN, TAG, text);
    }
}

// NewStringUTF expects modified UTF-8, so build the jstring from UTF-16 instead.
jstring to_jstring(JNIEnv * env, const std::string & s) {
    std::u16string u16;
    u16.reserve(s.size());
    for (size_t i = 0; i < s.size();) {
        unsigned char c = s[i];
        uint32_t cp;
        size_t len;
        if (c < 0x80) { cp = c; len = 1; }
        else if ((c >> 5) == 0x6) { cp = c & 0x1F; len = 2; }
        else if ((c >> 4) == 0xE) { cp = c & 0x0F; len = 3; }
        else if ((c >> 3) == 0x1E) { cp = c & 0x07; len = 4; }
        else { i++; continue; }
        if (i + len > s.size()) break;
        bool ok = true;
        for (size_t k = 1; k < len; k++) {
            unsigned char cc = s[i + k];
            if ((cc >> 6) != 0x2) { ok = false; break; }
            cp = (cp << 6) | (cc & 0x3F);
        }
        i += ok ? len : 1;
        if (!ok) continue;
        if (cp >= 0x10000) {
            cp -= 0x10000;
            u16.push_back((char16_t) (0xD800 + (cp >> 10)));
            u16.push_back((char16_t) (0xDC00 + (cp & 0x3FF)));
        } else {
            u16.push_back((char16_t) cp);
        }
    }
    return env->NewString(reinterpret_cast<const jchar *>(u16.data()), (jsize) u16.size());
}

std::string apply_template(const std::string & user) {
    const char * tmpl = llama_model_chat_template(g_model, nullptr);
    llama_chat_message msgs[2] = {
        {"system", SYSTEM_PROMPT},
        {"user", user.c_str()},
    };
    std::vector<char> buf(user.size() * 2 + 1024);
    int32_t n = llama_chat_apply_template(tmpl, msgs, 2, true, buf.data(), (int32_t) buf.size());
    if (n > (int32_t) buf.size()) {
        buf.resize(n);
        n = llama_chat_apply_template(tmpl, msgs, 2, true, buf.data(), (int32_t) buf.size());
    }
    if (n < 0) {
        // unknown template: fall back to ChatML (used by Qwen)
        return std::string("<|im_start|>system\n") + SYSTEM_PROMPT + "<|im_end|>\n<|im_start|>user\n" + user + "<|im_end|>\n<|im_start|>assistant\n";
    }
    return std::string(buf.data(), n);
}

std::string generate_raw(const std::string & prompt, int max_tokens, float temperature, const std::vector<std::string> & stops) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_cancel = false;
    if (g_model == nullptr || g_ctx == nullptr) {
        return "[Qwen Coder] Model is not loaded.";
    }

    const llama_vocab * vocab = llama_model_get_vocab(g_model);
    int32_t n_prompt = -llama_tokenize(vocab, prompt.c_str(), (int32_t) prompt.size(), nullptr, 0, true, true);
    std::vector<llama_token> tokens(n_prompt);
    if (llama_tokenize(vocab, prompt.c_str(), (int32_t) prompt.size(), tokens.data(), n_prompt, true, true) < 0) {
        return "[Qwen Coder] Failed to tokenize prompt.";
    }

    const int32_t n_ctx = (int32_t) llama_n_ctx(g_ctx);
    if (n_prompt >= n_ctx) {
        return "[Qwen Coder] Prompt is too long for the context window.";
    }
    max_tokens = std::max(1, std::min(max_tokens, n_ctx - n_prompt));

    // Reuse the longest common prefix already in the KV cache; keep at least one token to decode.
    size_t keep = 0;
    while (keep < g_cached.size() && keep < tokens.size() && g_cached[keep] == tokens[keep]) keep++;
    if (keep == tokens.size()) keep--;
    llama_memory_t mem = llama_get_memory(g_ctx);
    if (!llama_memory_seq_rm(mem, 0, (llama_pos) keep, -1)) {
        llama_memory_clear(mem, true);
        keep = 0;
    }
    g_cached.resize(keep);

    const int32_t n_batch = (int32_t) llama_n_batch(g_ctx);
    for (size_t i = keep; i < tokens.size(); i += n_batch) {
        if (g_cancel) { return ""; }
        const int32_t n = (int32_t) std::min<size_t>(n_batch, tokens.size() - i);
        if (llama_decode(g_ctx, llama_batch_get_one(tokens.data() + i, n)) != 0) {
            LOGE("llama_decode failed on prompt");
            llama_memory_clear(mem, true);
            g_cached.clear();
            return "[Qwen Coder] Failed to process prompt.";
        }
        g_cached.insert(g_cached.end(), tokens.begin() + i, tokens.begin() + i + n);
    }

    llama_sampler * smpl = llama_sampler_chain_init(llama_sampler_chain_default_params());
    if (temperature <= 0.0f) {
        llama_sampler_chain_add(smpl, llama_sampler_init_greedy());
    } else {
        llama_sampler_chain_add(smpl, llama_sampler_init_top_k(40));
        llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.9f, 1));
        llama_sampler_chain_add(smpl, llama_sampler_init_temp(temperature));
        llama_sampler_chain_add(smpl, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));
    }

    std::string out;
    for (int i = 0; i < max_tokens && !g_cancel; i++) {
        llama_token tok = llama_sampler_sample(smpl, g_ctx, -1);
        if (llama_vocab_is_eog(vocab, tok)) break;
        char piece[256];
        int n = llama_token_to_piece(vocab, tok, piece, sizeof(piece), 0, false);
        if (n > 0) out.append(piece, n);
        bool stopped = false;
        for (const auto & stop : stops) {
            if (!stop.empty() && out.size() >= stop.size() && out.compare(out.size() - stop.size(), stop.size(), stop) == 0) {
                stopped = true;
                break;
            }
        }
        if (stopped || i + 1 == max_tokens) break;
        if (llama_decode(g_ctx, llama_batch_get_one(&tok, 1)) != 0) {
            LOGE("llama_decode failed at step %d", i);
            break;
        }
        g_cached.push_back(tok);
    }

    llama_sampler_free(smpl);
    return out;
}

std::string generate(const std::string & user, int max_tokens, float temperature) {
    if (g_model == nullptr || g_ctx == nullptr) {
        return "[Qwen Coder] Model is not loaded.";
    }
    return generate_raw(apply_template(user), max_tokens, temperature, {});
}

void free_model() {
    g_cached.clear();
    if (g_ctx) { llama_free(g_ctx); g_ctx = nullptr; }
    if (g_model) { llama_model_free(g_model); g_model = nullptr; }
}

} // namespace

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeInitialize(JNIEnv * env, jobject, jstring jpath, jint context_size, jint gpu_layers) {
    std::lock_guard<std::mutex> lock(g_mutex);
    const std::string path = to_std(env, jpath);
    free_model();

    static std::once_flag backend_once;
    std::call_once(backend_once, [] {
        llama_log_set(log_to_logcat, nullptr);
        llama_backend_init();
    });

    llama_model_params mparams = llama_model_default_params();
    mparams.n_gpu_layers = gpu_layers;
    g_model = llama_model_load_from_file(path.c_str(), mparams);
    if (g_model == nullptr) {
        LOGE("Failed to load model: %s", path.c_str());
        return JNI_FALSE;
    }

    const int n_threads = (int) std::max(1u, std::min(std::thread::hardware_concurrency(), 8u));
    llama_context_params cparams = llama_context_default_params();
    cparams.n_ctx = context_size > 0 ? (uint32_t) context_size : 4096;
    cparams.n_batch = 512;
    cparams.n_threads = n_threads;
    cparams.n_threads_batch = n_threads;
    g_ctx = llama_init_from_model(g_model, cparams);
    if (g_ctx == nullptr) {
        LOGE("Failed to create context");
        free_model();
        return JNI_FALSE;
    }

    LOGI("Loaded model %s (n_ctx=%d, threads=%d)", path.c_str(), cparams.n_ctx, n_threads);
    return JNI_TRUE;
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeGenerate(JNIEnv * env, jobject, jstring prompt, jint max_tokens, jfloat temperature) {
    return to_jstring(env, generate(to_std(env, prompt), max_tokens, temperature));
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeGenerateCode(JNIEnv * env, jobject, jstring prompt, jstring language, jint max_tokens) {
    const std::string lang = to_std(env, language);
    const std::string p = "Write " + lang + " code for the following request. Reply with only the code in a single code block.\n\n" + to_std(env, prompt);
    return to_jstring(env, generate(p, max_tokens, 0.2f));
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeExplainCode(JNIEnv * env, jobject, jstring code, jstring language, jint max_tokens) {
    const std::string lang = to_std(env, language);
    const std::string p = "Explain what this " + lang + " code does.\n\n```" + lang + "\n" + to_std(env, code) + "\n```";
    return to_jstring(env, generate(p, max_tokens, 0.3f));
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeFixCode(JNIEnv * env, jobject, jstring code, jstring error, jstring language, jint max_tokens) {
    const std::string lang = to_std(env, language);
    const std::string p = "Fix this " + lang + " code. Error:\n" + to_std(env, error) + "\n\n```" + lang + "\n" + to_std(env, code) + "\n```\nReply with the corrected code and a short explanation.";
    return to_jstring(env, generate(p, max_tokens, 0.2f));
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeCompleteCode(JNIEnv * env, jobject, jstring code, jstring language, jint max_tokens) {
    const std::string lang = to_std(env, language);
    const std::string p = "Continue this " + lang + " code. Reply with only the code that comes next.\n\n```" + lang + "\n" + to_std(env, code) + "\n```";
    return to_jstring(env, generate(p, max_tokens, 0.2f));
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeChat(JNIEnv * env, jobject, jstring message, jint max_tokens) {
    return to_jstring(env, generate(to_std(env, message), max_tokens, 0.7f));
}

JNIEXPORT jstring JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeGenerateRaw(JNIEnv * env, jobject, jstring prompt, jobjectArray jstops, jint max_tokens, jfloat temperature) {
    std::vector<std::string> stops;
    const jsize n = jstops ? env->GetArrayLength(jstops) : 0;
    for (jsize i = 0; i < n; i++) {
        auto js = (jstring) env->GetObjectArrayElement(jstops, i);
        stops.push_back(to_std(env, js));
        env->DeleteLocalRef(js);
    }
    return to_jstring(env, generate_raw(to_std(env, prompt), max_tokens, temperature, stops));
}

JNIEXPORT void JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeCancel(JNIEnv *, jobject) {
    g_cancel = true;
}

JNIEXPORT void JNICALL
Java_com_codesurfer_mobileide_QwenCoderEngineBridge_nativeCleanup(JNIEnv *, jobject) {
    std::lock_guard<std::mutex> lock(g_mutex);
    free_model();
}

} // extern "C"
