import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import { Appbar, Button, Card, Paragraph, Divider, List, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import USBStorageService from '../services/usbStorageService';
import USBDeploymentService, { DEPLOYMENT_MODE } from '../services/usbDeploymentService';

const { USBStorageModule } = NativeModules;

const USBCompanionScreen = ({ navigation }) => {
  const [usbConnected, setUsbConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [usbInfo, setUsbInfo] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [apkInfo, setApkInfo] = useState(null);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [binaryFiles, setBinaryFiles] = useState([]);
  const [mode, setMode] = useState(DEPLOYMENT_MODE.USB_LIVE);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [eventLog, setEventLog] = useState([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanIntervalRef = useRef(null);
  const eventListenerRef = useRef(null);

  const addLogEntry = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [{ id: Date.now(), timestamp, message, type }, ...prev].slice(0, 50));
  }, []);

  const scanUSB = useCallback(async (silent = false) => {
    if (!silent) setScanning(true);

    try {
      const connected = await USBStorageService.checkUSBConnected();
      setUsbConnected(connected);

      if (connected) {
        const info = USBStorageService.getUSBInfo();
        setUsbInfo(info);

        const model = await USBStorageService.findModelOnUSB();
        setModelInfo(model ? { path: model, name: model.split('/').pop() } : null);

        const wsFiles = await USBStorageService.listWorkspaceFiles();
        setWorkspaceFiles(wsFiles || []);

        const srcFiles = await USBStorageService.listSourceFiles();
        setSourceFiles(srcFiles || []);

        const binFiles = await USBStorageService.listBinaries();
        setBinaryFiles(binFiles || []);

        const apk = await USBStorageService.findAPKOnUSB();
        setApkInfo(apk ? { path: apk, name: apk.split('/').pop() } : null);

        if (!silent) addLogEntry(`USB scanned: ${info.rootPath}`, 'success');
      } else {
        setUsbInfo(null);
        setModelInfo(null);
        setWorkspaceFiles([]);
        setSourceFiles([]);
        setBinaryFiles([]);
        setApkInfo(null);
        if (!silent) addLogEntry('No USB detected', 'warning');
      }

      setMode(USBDeploymentService.getMode());
      setLastScan(new Date().toLocaleTimeString());
    } catch (error) {
      if (!silent) addLogEntry(`Scan error: ${error.message}`, 'error');
    } finally {
      if (!silent) setScanning(false);
    }
  }, [addLogEntry]);

  // Initial scan
  useEffect(() => {
    scanUSB();
    addLogEntry('USB Companion started', 'info');
  }, [scanUSB, addLogEntry]);

  // Auto-refresh polling (every 3 seconds)
  useEffect(() => {
    if (!autoRefresh) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    scanIntervalRef.current = setInterval(() => {
      scanUSB(true);
    }, 3000);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [autoRefresh, scanUSB]);

  // Native event listener for USB attach/detach
  useEffect(() => {
    if (Platform.OS === 'android' && USBStorageModule) {
      let emitter;
      try {
        emitter = new NativeEventEmitter(USBStorageModule);
        const subscription = emitter.addListener('USBStateChanged', (event) => {
          if (event.connected) {
            addLogEntry(`USB attached: ${event.path || 'unknown'}`, 'success');
            scanUSB();
          } else {
            addLogEntry('USB detached', 'warning');
            setUsbConnected(false);
            setUsbInfo(null);
            setModelInfo(null);
            setWorkspaceFiles([]);
            setSourceFiles([]);
            setBinaryFiles([]);
            setApkInfo(null);
          }
        });
        eventListenerRef.current = subscription;
      } catch (e) {
        // Event emitter not available — polling will handle it
      }

      return () => {
        if (eventListenerRef.current) {
          eventListenerRef.current.remove();
        }
      };
    }
  }, [scanUSB, addLogEntry]);

  // Pulse animation when USB connected
  useEffect(() => {
    if (usbConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [usbConnected, pulseAnim]);

  const handleDeploy = () => {
    navigation.navigate('Deployment');
  };

  const handleInstallAPK = async () => {
    if (!apkInfo) return;
    Alert.alert(
      'Install APK',
      `Install ${apkInfo.name} from USB?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Install',
          onPress: async () => {
            try {
              await USBStorageService.installAPKFromUSB();
              addLogEntry(`APK install triggered: ${apkInfo.name}`, 'success');
            } catch (e) {
              addLogEntry(`APK install failed: ${e.message}`, 'error');
              Alert.alert('Install Failed', e.message);
            }
          },
        },
      ]
    );
  };

  const handleSafeRemove = async () => {
    Alert.alert(
      'Safe USB Removal',
      'Flush all write buffers and prepare for safe removal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Safe Remove',
          onPress: async () => {
            await USBStorageService.safeUnmount();
            addLogEntry('USB flushed and safe for removal', 'success');
            Alert.alert('Safe to Remove', 'All buffers flushed. Unplug the USB drive safely from the notification bar.');
            scanUSB();
          },
        },
      ]
    );
  };

  const handleRequestPermissions = async () => {
    const granted = await USBStorageService.requestStoragePermissions();
    if (granted) {
      addLogEntry('Storage permissions granted', 'success');
      scanUSB();
    } else {
      addLogEntry('Storage permissions denied', 'error');
      Alert.alert('Permissions Required', 'Storage permissions are needed to access USB OTG drives.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  const renderFileList = (files, emptyMessage) => {
    if (!files || files.length === 0) {
      return <Text style={styles.emptyText}>{emptyMessage}</Text>;
    }
    return files.map((file, i) => (
      <View key={i} style={styles.fileRow}>
        <Ionicons
          name={file.isDirectory ? 'folder-outline' : 'document-outline'}
          size={18}
          color={file.isDirectory ? '#FFB74D' : '#81C784'}
        />
        <Text style={styles.fileName}>{file.name}</Text>
        {!file.isDirectory && (
          <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="USB OTG Companion" />
        <Appbar.Action
          icon={autoRefresh ? 'pause' : 'play'}
          color="#FFFFFF"
          onPress={() => setAutoRefresh(!autoRefresh)}
        />
        <Appbar.Action
          icon="refresh"
          color="#FFFFFF"
          onPress={() => scanUSB()}
        />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* USB Status Hero */}
        <View style={styles.statusHero}>
          <Animated.View
            style={[
              styles.usbIconContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons
              name={usbConnected ? 'usb' : 'usb-dead'}
              size={48}
              color={usbConnected ? '#4CAF50' : '#666666'}
            />
          </Animated.View>
          <Text style={[styles.statusText, { color: usbConnected ? '#4CAF50' : '#666666' }]}>
            {usbConnected ? 'USB CONNECTED' : 'NO USB DETECTED'}
          </Text>
          {usbInfo?.rootPath && (
            <Text style={styles.pathText}>{usbInfo.rootPath}</Text>
          )}
          {lastScan && (
            <Text style={styles.scanText}>Last scan: {lastScan}</Text>
          )}
          {scanning && <ActivityIndicator color="#2196F3" size="small" style={{ marginTop: 8 }} />}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, !usbConnected && styles.disabledBtn]}
            onPress={handleDeploy}
            disabled={!usbConnected}
          >
            <Ionicons name="cloud-download" size={22} color="#FF9800" />
            <Text style={styles.quickActionText}>Deploy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, !apkInfo && styles.disabledBtn]}
            onPress={handleInstallAPK}
            disabled={!apkInfo}
          >
            <Ionicons name="download-outline" size={22} color="#4CAF50" />
            <Text style={styles.quickActionText}>Install APK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, !usbConnected && styles.disabledBtn]}
            onPress={handleSafeRemove}
            disabled={!usbConnected}
          >
            <Ionicons name="exit-outline" size={22} color="#F44336" />
            <Text style={styles.quickActionText}>Safe Remove</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={handleRequestPermissions}
          >
            <Ionicons name="key" size={22} color="#2196F3" />
            <Text style={styles.quickActionText}>Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Badge */}
        <View style={styles.modeBadgeContainer}>
          <Badge style={[styles.modeBadge, mode === DEPLOYMENT_MODE.STANDALONE ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#FF9800' }]}>
            {mode === DEPLOYMENT_MODE.STANDALONE ? 'STANDALONE' : 'USB LIVE'}
          </Badge>
        </View>

        {/* USB Contents */}
        {usbConnected && (
          <>
            {/* Models */}
            <Card style={styles.card}>
              <Card.Title
                title="/models/"
                titleStyle={styles.cardTitle}
                left={(props) => <Ionicons name="cube" size={22} color="#9C27B0" />}
                right={() => modelInfo ? <Badge style={styles.countBadge}>1</Badge> : <Badge style={[styles.countBadge, { backgroundColor: '#666' }]}>0</Badge>}
              />
              <Card.Content>
                {modelInfo ? (
                  <View style={styles.fileRow}>
                    <Ionicons name="document-outline" size={18} color="#81C784" />
                    <Text style={styles.fileName}>{modelInfo.name}</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No .gguf or .bin model found</Text>
                )}
              </Card.Content>
            </Card>

            {/* Binaries */}
            <Card style={styles.card}>
              <Card.Title
                title="/binaries/"
                titleStyle={styles.cardTitle}
                left={(props) => <Ionicons name="archive" size={22} color="#607D8B" />}
                right={() => binaryFiles.length > 0 ? <Badge style={styles.countBadge}>{binaryFiles.length}</Badge> : <Badge style={[styles.countBadge, { backgroundColor: '#666' }]}>0</Badge>}
              />
              <Card.Content>
                {renderFileList(binaryFiles, 'No binaries found')}
              </Card.Content>
            </Card>

            {/* Workspace */}
            <Card style={styles.card}>
              <Card.Title
                title="/workspace/"
                titleStyle={styles.cardTitle}
                left={(props) => <Ionicons name="folder-open" size={22} color="#FFB74D" />}
                right={() => workspaceFiles.length > 0 ? <Badge style={styles.countBadge}>{workspaceFiles.length}</Badge> : <Badge style={[styles.countBadge, { backgroundColor: '#666' }]}>0</Badge>}
              />
              <Card.Content>
                {renderFileList(workspaceFiles, 'No workspace files found')}
              </Card.Content>
            </Card>

            {/* Source */}
            <Card style={styles.card}>
              <Card.Title
                title="/source/"
                titleStyle={styles.cardTitle}
                left={(props) => <Ionicons name="code-slash" size={22} color="#2196F3" />}
                right={() => sourceFiles.length > 0 ? <Badge style={styles.countBadge}>{sourceFiles.length}</Badge> : <Badge style={[styles.countBadge, { backgroundColor: '#666' }]}>0</Badge>}
              />
              <Card.Content>
                {renderFileList(sourceFiles, 'No source files found')}
              </Card.Content>
            </Card>
          </>
        )}

        {/* Event Log */}
        <Card style={styles.card}>
          <Card.Title
            title="Event Log"
            titleStyle={styles.cardTitle}
            left={(props) => <Ionicons name="terminal" size={22} color="#888888" />}
            right={() => (
              <TouchableOpacity onPress={() => setEventLog([])}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          />
          <Card.Content>
            {eventLog.length === 0 ? (
              <Text style={styles.emptyText}>No events yet</Text>
            ) : (
              eventLog.map((entry) => (
                <View key={entry.id} style={styles.logRow}>
                  <Text style={styles.logTime}>{entry.timestamp}</Text>
                  <Text
                    style={[
                      styles.logMessage,
                      entry.type === 'success' && styles.logSuccess,
                      entry.type === 'error' && styles.logError,
                      entry.type === 'warning' && styles.logWarning,
                    ]}
                  >
                    {entry.message}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#1E1E1E',
    elevation: 0,
  },
  scrollView: {
    flex: 1,
  },
  statusHero: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  usbIconContainer: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pathText: {
    color: '#888888',
    fontSize: 13,
    marginTop: 4,
  },
  scanText: {
    color: '#555555',
    fontSize: 11,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  quickActionBtn: {
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  quickActionText: {
    color: '#CCCCCC',
    fontSize: 11,
  },
  modeBadgeContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modeBadge: {
    fontSize: 11,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  countBadge: {
    backgroundColor: '#2196F3',
    fontSize: 11,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fileName: {
    color: '#CCCCCC',
    fontSize: 14,
    flex: 1,
  },
  fileSize: {
    color: '#888888',
    fontSize: 12,
  },
  emptyText: {
    color: '#666666',
    fontSize: 13,
    fontStyle: 'italic',
  },
  logRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    gap: 8,
  },
  logTime: {
    color: '#555555',
    fontSize: 11,
    minWidth: 70,
  },
  logMessage: {
    color: '#CCCCCC',
    fontSize: 12,
    flex: 1,
  },
  logSuccess: { color: '#4CAF50' },
  logError: { color: '#F44336' },
  logWarning: { color: '#FF9800' },
  clearText: {
    color: '#888888',
    fontSize: 12,
    paddingRight: 8,
  },
});

export default USBCompanionScreen;
