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
  Switch,
} from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { runAgent, localBackend, ollamaBackend, checkOllama } from '../services/agentService';
import { FilePermissionService } from '../services/filePermissionService';

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
const SETTINGS_PATH = `${FileSystem.documentDirectory}agent_settings.json`;
const DEFAULT_SETTINGS = {
  engine: 'local', // local | ollama
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen2.5-coder:7b',
  requireApproval: true,
  planning: 'auto', // auto | on | off
};

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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [ollamaCheck, setOllamaCheck] = useState(null);
  const [expanded, setExpanded] = useState({});
  const historyRef = useRef([]);
  const cancelRef = useRef(false);
  const backendRef = useRef(null);
  const approvalsRef = useRef({});

  useEffect(() => {
    FileSystem.readAsStringAsync(SETTINGS_PATH)
      .then((t) => setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(t) }))
      .catch(() => {});
  }, []);

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      FileSystem.writeAsStringAsync(SETTINGS_PATH, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

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

  const addItem = (item) => setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...item }]);
  const patchItem = (id, patch) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const usingOllama = settings.engine === 'ollama';
  const planningOn = settings.planning === 'on' || (settings.planning === 'auto' && (usingOllama || hasLargeModel));

  const requestApproval = (change) =>
    new Promise((resolve) => {
      approvalsRef.current[change.id] = resolve;
      setMessages((prev) => [...prev, { id: `approve-${change.id}`, role: 'approval', change, decision: null }]);
    });

  const decide = (item, approved) => {
    const resolve = approvalsRef.current[item.change.id];
    delete approvalsRef.current[item.change.id];
    patchItem(item.id, { decision: approved ? 'approved' : 'rejected' });
    if (resolve) resolve(approved);
  };

  const stop = async () => {
    cancelRef.current = true;
    Object.values(approvalsRef.current).forEach((resolve) => resolve(false));
    approvalsRef.current = {};
    if (backendRef.current) await backendRef.current.cancel();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!usingOllama && engineState !== 'ready') {
      Alert.alert('AI not ready', 'Load or download a model first, or switch to Ollama in settings.');
      return;
    }
    addItem({ role: 'user', text });
    setInput('');
    setBusy(true);
    cancelRef.current = false;
    const backend = usingOllama
      ? ollamaBackend({ url: settings.ollamaUrl, model: settings.ollamaModel })
      : localBackend(QwenCoderModule);
    backendRef.current = backend;
    const planId = `plan-${Date.now()}`;
    let planShown = false;
    try {
      await FilePermissionService.ensureUserWorkspace();
      historyRef.current = await runAgent({
        backend,
        history: historyRef.current,
        userText: text,
        planning: planningOn,
        requireApproval: settings.requireApproval,
        isCancelled: () => cancelRef.current,
        requestApproval,
        onEvent: (e) => {
          if (e.type === 'plan') {
            if (planShown) patchItem(planId, { plan: e.plan });
            else {
              planShown = true;
              setMessages((prev) => [...prev, { id: planId, role: 'plan', plan: e.plan }]);
            }
          } else if (e.type === 'tool_start') {
            setMessages((prev) => [...prev, { id: `tool-${e.id}`, role: 'tool', label: e.label, args: e.args, status: 'running' }]);
          } else if (e.type === 'tool_end') {
            patchItem(`tool-${e.id}`, { status: e.ok ? 'ok' : 'failed', result: e.text });
          } else if (e.type === 'assistant') {
            addItem({ role: 'assistant', text: e.text, meta: e.durationMs ? `${(e.durationMs / 1000).toFixed(1)}s · ${backend.label}` : backend.label });
          } else if (e.type === 'note') {
            addItem({ role: 'note', text: e.text });
          } else if (e.type === 'stopped') {
            addItem({ role: 'note', text: 'Stopped.' });
          }
        },
      });
      if (!usingOllama) setEngineState('ready');
    } catch (e) {
      addItem({ role: 'error', text: cancelRef.current ? 'Stopped.' : e.message });
    } finally {
      backendRef.current = null;
      setBusy(false);
      if (!usingOllama) refreshStatus().catch(() => {});
    }
  };

  const clearChat = () => {
    historyRef.current = [];
    setMessages([]);
  };

  const testOllama = async () => {
    setOllamaCheck({ state: 'checking' });
    try {
      const names = await checkOllama({ url: settings.ollamaUrl, model: settings.ollamaModel });
      setOllamaCheck({ state: 'ok', text: `Connected. Models: ${names.join(', ')}` });
    } catch (e) {
      setOllamaCheck({ state: 'error', text: e.message });
    }
  };

  const renderSettings = () => (
    <View style={styles.statusCard}>
      <Text style={styles.settingsTitle}>Engine</Text>
      <View style={styles.chipRow}>
        {[['local', 'On-device'], ['ollama', 'Ollama server']].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, settings.engine === key && styles.chipActive]}
            onPress={() => updateSettings({ engine: key })}
            disabled={busy}
          >
            <Text style={styles.chipText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {usingOllama && (
        <View>
          <TextInput
            style={styles.settingsInput}
            value={settings.ollamaUrl}
            onChangeText={(v) => updateSettings({ ollamaUrl: v.trim() })}
            placeholder="http://192.168.1.10:11434"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.settingsInput}
            value={settings.ollamaModel}
            onChangeText={(v) => updateSettings({ ollamaModel: v.trim() })}
            placeholder="qwen2.5-coder:7b"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={testOllama}>
            <Text style={styles.link}>{ollamaCheck?.state === 'checking' ? 'Checking...' : 'Test connection'}</Text>
          </TouchableOpacity>
          {ollamaCheck?.text ? (
            <Text style={ollamaCheck.state === 'ok' ? styles.okText : styles.errorText}>{ollamaCheck.text}</Text>
          ) : null}
        </View>
      )}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Ask before changing files</Text>
        <Switch value={settings.requireApproval} onValueChange={(v) => updateSettings({ requireApproval: v })} />
      </View>
      <Text style={styles.settingsTitle}>Plan checklist</Text>
      <View style={styles.chipRow}>
        {[['auto', 'Auto'], ['on', 'On'], ['off', 'Off']].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, settings.planning === key && styles.chipActive]}
            onPress={() => updateSettings({ planning: key })}
          >
            <Text style={styles.chipText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.dim}>Auto: on for 7B and Ollama, off for 1.5B (small models get confused by it).</Text>
      <TouchableOpacity onPress={clearChat} disabled={busy}>
        <Text style={styles.link}>Clear conversation</Text>
      </TouchableOpacity>
    </View>
  );

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
            {usingOllama ? `Ollama: ${settings.ollamaModel}` : `On-device: ${line}`}
          </Text>
          {engineState === 'loading' && <ActivityIndicator size="small" color={color} />}
          {engineState === 'error' && (
            <TouchableOpacity onPress={() => loadEngine(true)}>
              <Text style={styles.link}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowSettings((v) => !v)} style={styles.gear} accessibilityLabel="AI settings">
            <Ionicons name={showSettings ? 'close' : 'settings-outline'} size={20} color="#AAA" />
          </TouchableOpacity>
        </View>
        <Text style={styles.dim}>
          Tools: read, search and edit files in your projects{settings.requireApproval ? ' · asks before every change' : ' · changes WITHOUT asking'}
          {planningOn ? ' · plan checklist' : ''}
        </Text>
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

  const renderDiff = (diff) =>
    diff.map((d, i) => (
      <Text
        key={i}
        style={[styles.diffLine, d.type === 'add' ? styles.diffAdd : d.type === 'del' ? styles.diffDel : styles.diffCtx]}
      >
        {d.type === 'add' ? '+ ' : d.type === 'del' ? '- ' : ''}
        {d.text}
      </Text>
    ));

  const renderMessage = ({ item }) => {
    if (item.role === 'plan') {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan</Text>
          {item.plan.map((p, i) => (
            <View key={i} style={styles.planRow}>
              <Ionicons
                name={p.status === 'done' ? 'checkmark-circle' : p.status === 'in_progress' ? 'ellipse' : 'ellipse-outline'}
                size={16}
                color={p.status === 'done' ? '#4CAF50' : p.status === 'in_progress' ? '#2196F3' : '#777'}
              />
              <Text style={[styles.planText, p.status === 'done' && styles.planDone]}>{p.step}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (item.role === 'tool') {
      const open = expanded[item.id];
      const icon = item.status === 'running' ? null : item.status === 'ok' ? 'checkmark' : 'close';
      return (
        <TouchableOpacity style={styles.toolCard} onPress={() => setExpanded((e) => ({ ...e, [item.id]: !open }))}>
          <View style={styles.statusRow}>
            {icon ? (
              <Ionicons name={icon} size={16} color={item.status === 'ok' ? '#4CAF50' : '#F44336'} />
            ) : (
              <ActivityIndicator size="small" color="#2196F3" />
            )}
            <Text style={styles.toolLabel} numberOfLines={1}>{item.label}</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#777" />
          </View>
          {open && item.result ? <Text style={styles.toolResult} selectable>{item.result}</Text> : null}
        </TouchableOpacity>
      );
    }
    if (item.role === 'approval') {
      const { change, decision } = item;
      return (
        <View style={[styles.card, styles.approvalCard]}>
          <Text style={styles.cardTitle}>
            {change.isNew ? 'Create' : 'Change'} {change.path}?
          </Text>
          <View style={styles.diffBox}>{renderDiff(change.diff)}</View>
          {decision ? (
            <Text style={decision === 'approved' ? styles.okText : styles.errorText}>
              {decision === 'approved' ? 'Approved' : 'Rejected'}
            </Text>
          ) : (
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.decisionButton, styles.approveButton]} onPress={() => decide(item, true)}>
                <Text style={styles.primaryButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.decisionButton, styles.rejectButton]} onPress={() => decide(item, false)}>
                <Text style={styles.primaryButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    if (item.role === 'note') {
      return <Text style={styles.note}>{item.text}</Text>;
    }
    return (
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {renderStatus()}
      {showSettings && renderSettings()}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ask Qwen Coder anything, or ask it to change a file, e.g. "Fix the bug in myproj/app.js". It can read and edit files in your projects; you approve each change.
          </Text>
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
        {busy ? (
          <TouchableOpacity style={[styles.sendButton, styles.stopButton]} onPress={stop} accessibilityLabel="Stop">
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendDisabled]}
            onPress={send}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        )}
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
  stopButton: { backgroundColor: '#C62828' },
  gear: { marginLeft: 10, padding: 2 },
  settingsTitle: { color: '#DDD', fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  settingsInput: { color: '#fff', backgroundColor: '#121212', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { borderWidth: 1, borderColor: '#444', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 6 },
  chipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipText: { color: '#fff', fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  switchLabel: { color: '#DDD', fontSize: 14 },
  okText: { color: '#4CAF50', marginTop: 6, fontSize: 13 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 10, padding: 12, marginBottom: 10 },
  approvalCard: { borderWidth: 1, borderColor: '#FF9800' },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  planText: { color: '#DDD', fontSize: 14, marginLeft: 8, flex: 1 },
  planDone: { color: '#888', textDecorationLine: 'line-through' },
  toolCard: { backgroundColor: '#181818', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#2196F3' },
  toolLabel: { color: '#CCC', fontSize: 13, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo', marginLeft: 8, flex: 1 },
  toolResult: { color: '#AAA', fontSize: 12, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo', marginTop: 8 },
  diffBox: { backgroundColor: '#121212', borderRadius: 6, padding: 8, marginBottom: 8 },
  diffLine: { fontSize: 12, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo' },
  diffAdd: { color: '#81C784' },
  diffDel: { color: '#E57373' },
  diffCtx: { color: '#888' },
  decisionButton: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginRight: 8 },
  approveButton: { backgroundColor: '#2E7D32' },
  rejectButton: { backgroundColor: '#C62828' },
  note: { color: '#888', fontSize: 12, fontStyle: 'italic', marginBottom: 8, textAlign: 'center' },
});

export default AIChatScreen;
