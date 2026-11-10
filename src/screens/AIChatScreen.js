import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  Alert,
} from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

const { QwenCoderModule } = NativeModules;

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
// File names must match QwenCoderEngineBridge.findModel()
const SMALL_MODEL = {
  label: 'Qwen2.5-Coder 1.5B',
  url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
  sizeBytes: 1117320768,
  path: `${MODELS_DIR}qwen2.5-coder-1.5b-instruct-q4_k_m.gguf`,
};
const LARGE_MODEL = {
  label: 'Qwen2.5-Coder 7B',
  url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
  sizeBytes: 4683073536,
  path: `${MODELS_DIR}qwen2.5-coder-7b.gguf`,
};
const partPath = (model) => `${model.path}.part`;
const HISTORY_TURNS = 2;

const formatGB = (bytes) => `${(bytes / 1e9).toFixed(1)} GB`;

const modelLabel = (name) => {
  if (!name) return 'No model';
  if (name === 'qwen2.5-coder-7b.gguf') return 'Qwen2.5-Coder 7B';
  if (name.startsWith('qwen2.5-coder-1.5b')) return 'Qwen2.5-Coder 1.5B';
  return name;
};

const AIChatScreen = () => {
  const [status, setStatus] = useState(null);
  const [engineState, setEngineState] = useState('idle'); // idle | nomodel | loading | ready | error
  const [engineError, setEngineError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [download, setDownload] = useState(null); // { model, progress } while downloading
  const downloadRef = useRef(null);
  const listRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    if (!QwenCoderModule) return null;
    const s = await QwenCoderModule.getStatus();
    setStatus(s);
    return s;
  }, []);

  const loadEngine = useCallback(async (reload = false) => {
    if (!QwenCoderModule) {
      setEngineState('error');
      setEngineError('The on-device AI engine is not included in this build.');
      return;
    }
    setEngineState('loading');
    setEngineError(null);
    try {
      const s = reload ? await QwenCoderModule.reload() : await QwenCoderModule.initialize();
      setStatus(s);
      setEngineState('ready');
    } catch (e) {
      setEngineState('error');
      setEngineError(e.message);
      refreshStatus().catch(() => {});
    }
  }, [refreshStatus]);

  useEffect(() => {
    (async () => {
      for (const m of [SMALL_MODEL, LARGE_MODEL]) {
        await FileSystem.deleteAsync(partPath(m), { idempotent: true }).catch(() => {});
      }
      const s = await refreshStatus().catch(() => null);
      if (s && s.initialized) {
        setEngineState('ready');
      } else if (s && !s.modelFound) {
        setEngineState('nomodel');
      } else {
        loadEngine(false);
      }
    })();
    return () => {
      if (downloadRef.current) downloadRef.current.pauseAsync().catch(() => {});
    };
  }, [refreshStatus, loadEngine]);

  const hasLargeModel = status?.modelName === 'qwen2.5-coder-7b.gguf';

  const startDownload = async (model) => {
    const part = partPath(model);
    try {
      const free = await FileSystem.getFreeDiskStorageAsync();
      if (free < model.sizeBytes + 500e6) {
        Alert.alert('Not enough space', `Needs about ${formatGB(model.sizeBytes)} free; you have ${formatGB(free)}.`);
        return;
      }
      await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true }).catch(() => {});
      setDownload({ model, progress: 0 });
      const resumable = FileSystem.createDownloadResumable(
        model.url,
        part,
        {},
        ({ totalBytesWritten }) => setDownload({ model, progress: totalBytesWritten / model.sizeBytes })
      );
      downloadRef.current = resumable;
      const result = await resumable.downloadAsync();
      downloadRef.current = null;
      if (!result) {
        setDownload(null);
        return;
      }
      const info = await FileSystem.getInfoAsync(part);
      if (!info.exists || info.size !== model.sizeBytes) {
        await FileSystem.deleteAsync(part, { idempotent: true });
        throw new Error('Download was incomplete. Try again on a stable connection.');
      }
      await FileSystem.moveAsync({ from: part, to: model.path });
      setDownload(null);
      await loadEngine(true);
    } catch (e) {
      downloadRef.current = null;
      setDownload(null);
      Alert.alert('Download failed', e.message);
    }
  };

  const cancelDownload = async () => {
    if (downloadRef.current) {
      await downloadRef.current.pauseAsync().catch(() => {});
      downloadRef.current = null;
    }
    if (download) await FileSystem.deleteAsync(partPath(download.model), { idempotent: true }).catch(() => {});
    setDownload(null);
  };

  const removeLargeModel = () => {
    Alert.alert('Remove 7B model?', 'The app will go back to the 1.5B model.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(LARGE_MODEL.path, { idempotent: true });
          await loadEngine(true);
        },
      },
    ]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages
      .filter((m) => m.role !== 'error')
      .slice(-HISTORY_TURNS * 2)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n\n');
    const prompt = history ? `Earlier in this conversation:\n${history}\n\nUser: ${text}` : text;

    setMessages((prev) => [...prev, { id: `${Date.now()}u`, role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const result = await QwenCoderModule.chat(prompt, [], 512);
      setEngineState('ready');
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}a`,
          role: 'assistant',
          text: result.response.trim(),
          meta: `${(result.durationMs / 1000).toFixed(1)}s`,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: `${Date.now()}e`, role: 'error', text: e.message }]);
    } finally {
      setBusy(false);
      refreshStatus().catch(() => {});
    }
  };

  const renderStatus = () => {
    let icon = 'hardware-chip-outline';
    let color = '#4CAF50';
    let line = modelLabel(status?.modelName);
    if (engineState === 'idle') {
      color = '#AAA';
      line = 'Checking...';
    } else if (engineState === 'nomodel') {
      icon = 'cloud-download-outline';
      color = '#FF9800';
      line = 'No model yet';
    } else if (engineState === 'loading') {
      color = '#FF9800';
      line = 'Loading model...';
    } else if (engineState === 'error') {
      icon = 'alert-circle-outline';
      color = '#F44336';
      line = 'AI offline';
    }
    return (
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Ionicons name={icon} size={20} color={color} />
          <Text style={[styles.statusText, { color }]} numberOfLines={2}>
            On-device: {line}
          </Text>
          {engineState === 'loading' && <ActivityIndicator size="small" color={color} />}
          {engineState === 'error' && (
            <TouchableOpacity onPress={() => loadEngine(true)}>
              <Text style={styles.link}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
        {engineError ? <Text style={styles.errorText}>{engineError}</Text> : null}
        {download ? (
          <View style={styles.downloadBox}>
            <Text style={styles.dim}>
              Downloading {download.model.label}: {Math.floor(download.progress * 100)}% of {formatGB(download.model.sizeBytes)}. Keep the app open.
            </Text>
            <ProgressBar progress={download.progress} color="#2196F3" style={styles.progress} />
            <TouchableOpacity onPress={cancelDownload}>
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : engineState === 'nomodel' ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => startDownload(SMALL_MODEL)}>
            <Text style={styles.primaryButtonText}>
              Download {SMALL_MODEL.label} ({formatGB(SMALL_MODEL.sizeBytes)}, one time)
            </Text>
          </TouchableOpacity>
        ) : hasLargeModel ? (
          <TouchableOpacity onPress={removeLargeModel} disabled={busy}>
            <Text style={styles.link}>Remove 7B and use built-in 1.5B</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => startDownload(LARGE_MODEL)} disabled={busy || engineState === 'loading'}>
            <Text style={styles.link}>
              Download {LARGE_MODEL.label} ({formatGB(LARGE_MODEL.sizeBytes)}, smarter but slower)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.bubble,
        item.role === 'user' ? styles.userBubble : item.role === 'error' ? styles.errorBubble : styles.aiBubble,
      ]}
    >
      <Text style={styles.bubbleText} selectable>
        {item.text}
      </Text>
      {item.meta ? <Text style={styles.meta}>{item.meta}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {renderStatus()}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.empty}>Ask Qwen Coder anything. It runs on this phone, no internet needed.</Text>
        }
      />
      {busy && (
        <View style={styles.thinking}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.dim}>  Thinking...</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message Qwen Coder"
          placeholderTextColor="#777"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || busy) && styles.sendDisabled]}
          onPress={send}
          disabled={!input.trim() || busy}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  statusCard: { backgroundColor: '#1E1E1E', margin: 12, marginBottom: 4, padding: 12, borderRadius: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { flex: 1, marginLeft: 8, fontSize: 14, fontWeight: '600' },
  errorText: { color: '#F44336', marginTop: 6, fontSize: 13 },
  link: { color: '#2196F3', marginTop: 8, fontSize: 14 },
  primaryButton: { backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  dim: { color: '#AAA', fontSize: 13 },
  downloadBox: { marginTop: 8 },
  progress: { marginTop: 8, height: 6, borderRadius: 3 },
  list: { padding: 12, flexGrow: 1 },
  empty: { color: '#777', textAlign: 'center', marginTop: 40, fontSize: 15 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '88%' },
  userBubble: { backgroundColor: '#1565C0', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1E1E1E', alignSelf: 'flex-start' },
  errorBubble: { backgroundColor: '#3B1414', alignSelf: 'flex-start' },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  meta: { color: '#888', fontSize: 11, marginTop: 6, textAlign: 'right' },
  thinking: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, borderTopColor: '#222' },
  input: {
    flex: 1,
    color: '#fff',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: { marginLeft: 8, backgroundColor: '#2196F3', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#333' },
});

export default AIChatScreen;
