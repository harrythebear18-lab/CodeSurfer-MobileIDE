import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ProgressBarAndroid,
  Platform,
  ProgressViewIOS,
} from 'react-native';
import { Appbar, Button, Card, Paragraph, Divider, List, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import USBStorageService from '../services/usbStorageService';
import USBDeploymentService, { DEPLOYMENT_MODE, DEPLOYMENT_STATUS } from '../services/usbDeploymentService';

const DeploymentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [deployStatus, setDeployStatus] = useState(DEPLOYMENT_STATUS.IDLE);
  const [mode, setMode] = useState(DEPLOYMENT_MODE.USB_LIVE);
  const [usbConnected, setUsbConnected] = useState(false);

  const refreshState = useCallback(async () => {
    setLoading(true);
    const connected = await USBStorageService.checkUSBConnected();
    setUsbConnected(connected);

    if (connected) {
      const s = await USBDeploymentService.getDeploymentSummary();
      setSummary(s);
    } else {
      setSummary(null);
    }

    setMode(USBDeploymentService.getMode());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    USBDeploymentService.setProgressCallback(({ status, progress: p, message }) => {
      setDeployStatus(status);
      setProgress(p);
      setProgressMessage(message);
    });
  }, []);

  const handleDeploy = async () => {
    Alert.alert(
      'Deploy to Standalone',
      'This will copy the AI model (~4.7GB) and workspace files from USB to your device internal storage. After deployment, the USB drive can be safely removed.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: async () => {
            setDeploying(true);
            USBDeploymentService.reset();
            const result = await USBDeploymentService.deployToStandalone();
            setDeploying(false);

            if (result.success) {
              Alert.alert(
                'Deployment Complete',
                'Model and workspace copied to device storage. You can now safely remove the USB drive.\n\nThe app will use the internal model for AI inference.',
                [{ text: 'OK', onPress: () => refreshState() }]
              );
            } else {
              Alert.alert(
                'Deployment Failed',
                result.error || 'Unknown error occurred during deployment.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleSwitchMode = async (newMode) => {
    if (newMode === DEPLOYMENT_MODE.USB_LIVE) {
      const ok = await USBDeploymentService.switchToUSBLiveMode();
      if (ok) {
        setMode(DEPLOYMENT_MODE.USB_LIVE);
        Alert.alert('Mode Switched', 'Now running in USB Live mode. Model loads from USB OTG.');
      } else {
        Alert.alert('No USB', 'USB drive not detected. Connect via OTG to use USB Live mode.');
      }
    } else {
      const ok = await USBDeploymentService.switchToStandaloneMode();
      if (ok) {
        setMode(DEPLOYMENT_MODE.STANDALONE);
        Alert.alert('Mode Switched', 'Now running in Standalone mode. Model loads from device storage.');
      } else {
        Alert.alert('No Internal Model', 'No model found in internal storage. Deploy from USB first.');
      }
    }
    refreshState();
  };

  const handleRemoveInternalModel = () => {
    Alert.alert(
      'Remove Internal Model',
      'This will delete the copied model from device storage to free up space. You will need USB Live mode or redeploy to use AI again.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await USBDeploymentService.removeInternalModel();
            if (result.success) {
              Alert.alert('Removed', 'Internal model deleted. Space freed up.');
              refreshState();
            } else {
              Alert.alert('Error', result.error || 'Failed to remove model');
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  const renderProgressBar = (value) => {
    if (Platform.OS === 'android') {
      return <ProgressBarAndroid styleAttr="Horizontal" progress={value / 100} color="#2196F3" />;
    }
    return <ProgressViewIOS progress={value / 100} progressTintColor="#2196F3" />;
  };

  const isDeployed = summary?.internalModelExists;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="USB Deployment" />
        <IconButton icon="refresh" color="#FFFFFF" onPress={refreshState} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* USB Status Card */}
        <Card style={styles.card}>
          <Card.Title
            title="USB Connection"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <Ionicons
                name={usbConnected ? 'usb' : 'usb-dead'}
                size={24}
                color={usbConnected ? '#4CAF50' : '#F44336'}
              />
            )}
          />
          <Card.Content>
            {loading ? (
              <ActivityIndicator color="#2196F3" />
            ) : usbConnected ? (
              <>
                <Paragraph style={styles.text}>
                  Status: <Text style={styles.successText}>Connected</Text>
                </Paragraph>
                <Paragraph style={styles.text}>
                  Path: {USBStorageService.getUSBRootPath()}
                </Paragraph>
                {summary?.modelOnUSB && (
                  <Paragraph style={styles.text}>
                    Model: {summary.modelOnUSB.split('/').pop()} ({formatBytes(summary.modelSize)})
                  </Paragraph>
                )}
                {summary?.chunkedModel && (
                  <Paragraph style={styles.text}>
                    Chunked model: {summary.chunkedModel.manifest.chunks.length} parts ({formatBytes(summary.modelSize)})
                  </Paragraph>
                )}
                {summary?.apkOnUSB && (
                  <Paragraph style={styles.text}>
                    APK: {summary.apkOnUSB.split('/').pop()}
                  </Paragraph>
                )}
                <Paragraph style={styles.text}>
                  Workspace files: {summary?.workspaceFiles?.length || 0}
                </Paragraph>
              </>
            ) : (
              <Paragraph style={styles.warningText}>
                No USB drive detected. Connect a USB drive via OTG adapter to deploy or run in USB Live mode.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Current Mode Card */}
        <Card style={styles.card}>
          <Card.Title
            title="Current Mode"
            titleStyle={styles.cardTitle}
            left={(props) => <Ionicons name="swap-horizontal" size={24} color="#2196F3" />}
          />
          <Card.Content>
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === DEPLOYMENT_MODE.USB_LIVE && styles.modeButtonActive,
                ]}
                onPress={() => handleSwitchMode(DEPLOYMENT_MODE.USB_LIVE)}
                disabled={!usbConnected}
              >
                <Ionicons
                  name="usb"
                  size={28}
                  color={mode === DEPLOYMENT_MODE.USB_LIVE ? '#FFFFFF' : '#2196F3'}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === DEPLOYMENT_MODE.USB_LIVE && styles.modeButtonTextActive,
                  ]}
                >
                  USB Live
                </Text>
                <Text style={styles.modeSubtext}>Run from USB</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === DEPLOYMENT_MODE.STANDALONE && styles.modeButtonActive,
                ]}
                onPress={() => handleSwitchMode(DEPLOYMENT_MODE.STANDALONE)}
                disabled={!isDeployed}
              >
                <Ionicons
                  name="phone-portrait"
                  size={28}
                  color={mode === DEPLOYMENT_MODE.STANDALONE ? '#FFFFFF' : '#2196F3'}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === DEPLOYMENT_MODE.STANDALONE && styles.modeButtonTextActive,
                  ]}
                >
                  Standalone
                </Text>
                <Text style={styles.modeSubtext}>Run from device</Text>
              </TouchableOpacity>
            </View>

            {isDeployed && (
              <TouchableOpacity onPress={handleRemoveInternalModel} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={16} color="#F44336" />
                <Text style={styles.removeText}>Remove internal model (free space)</Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        {/* Deployment Card */}
        <Card style={styles.card}>
          <Card.Title
            title="Deploy to Standalone"
            titleStyle={styles.cardTitle}
            left={(props) => <Ionicons name="cloud-download" size={24} color="#FF9800" />}
          />
          <Card.Content>
            {isDeployed ? (
              <Paragraph style={styles.successText}>
                Model already deployed to internal storage. You can run in Standalone mode without USB.
              </Paragraph>
            ) : !usbConnected ? (
              <Paragraph style={styles.warningText}>
                Connect USB drive to deploy model to device storage.
              </Paragraph>
            ) : !summary?.modelOnUSB && !summary?.chunkedModel ? (
              <Paragraph style={styles.warningText}>
                No model file found on USB. Place a .gguf file in /CodeSurferMobileIDE/models/ on the USB drive.
              </Paragraph>
            ) : (
              <>
                <Paragraph style={styles.text}>
                  Copy the AI model and workspace from USB to device internal storage. After deployment, the USB can be safely removed.
                </Paragraph>
                {summary?.chunkedModel && (
                  <Paragraph style={styles.textSmall}>
                    Model is split into {summary.chunkedModel.manifest.chunks.length} chunks (FAT32 compatible). Will be reassembled on device.
                  </Paragraph>
                )}
                <Paragraph style={styles.textSmall}>
                  Model size: {formatBytes(summary.modelSize)}
                </Paragraph>
                <Paragraph style={styles.textSmall}>
                  This will use ~{formatBytes(summary.modelSize)} of device storage.
                </Paragraph>

                <Button
                  mode="contained"
                  onPress={handleDeploy}
                  disabled={deploying}
                  style={styles.deployButton}
                  icon="download"
                >
                  {deploying ? 'Deploying...' : 'Deploy Now'}
                </Button>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Progress Card */}
        {deploying && (
          <Card style={styles.card}>
            <Card.Title
              title="Deployment Progress"
              titleStyle={styles.cardTitle}
              left={(props) => <ActivityIndicator color="#2196F3" />}
            />
            <Card.Content>
              <Text style={styles.progressMessage}>{progressMessage}</Text>
              {renderProgressBar(progress)}
              <Text style={styles.progressPercent}>{progress}%</Text>
            </Card.Content>
          </Card>
        )}

        {/* APK Install Card */}
        {usbConnected && summary?.apkOnUSB && (
          <Card style={styles.card}>
            <Card.Title
              title="APK Update Available"
              titleStyle={styles.cardTitle}
              left={(props) => <Ionicons name="apps" size={24} color="#4CAF50" />}
            />
            <Card.Content>
              <Paragraph style={styles.text}>
                An APK was found on the USB drive in /binaries/.
              </Paragraph>
              <Paragraph style={styles.textSmall}>
                File: {summary.apkOnUSB.split('/').pop()}
              </Paragraph>
              <Button
                mode="outlined"
                onPress={() => USBStorageService.installAPKFromUSB()}
                style={styles.deployButton}
                icon="install-mobile"
              >
                Install APK from USB
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Safe Removal Card */}
        {usbConnected && (
          <Card style={styles.card}>
            <Card.Title
              title="Safe USB Removal"
              titleStyle={styles.cardTitle}
              left={(props) => <Ionicons name="eject" size={24} color="#FF9800" />}
            />
            <Card.Content>
              <Paragraph style={styles.text}>
                Flush all write buffers before removing the USB drive to prevent data corruption.
              </Paragraph>
              <Button
                mode="outlined"
                onPress={async () => {
                  await USBStorageService.safeUnmount();
                  Alert.alert(
                    'Safe to Remove',
                    'All buffers flushed. You can now safely unplug the USB drive from the notification bar.',
                    [{ text: 'OK', onPress: () => refreshState() }]
                  );
                }}
                style={styles.deployButton}
                icon="eject"
              >
                Flush & Safe Remove
              </Button>
            </Card.Content>
          </Card>
        )}
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
  card: {
    margin: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  textSmall: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 2,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  warningText: {
    color: '#FF9800',
    fontSize: 14,
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#2A2A2A',
  },
  modeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  modeButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  modeSubtext: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  removeText: {
    color: '#F44336',
    fontSize: 13,
  },
  deployButton: {
    marginTop: 12,
  },
  progressMessage: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
  },
  progressPercent: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default DeploymentScreen;
