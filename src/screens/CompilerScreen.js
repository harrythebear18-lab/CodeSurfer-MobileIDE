import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Appbar, Button, Card, List, IconButton, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { CompilerService } from '../services/compilerService';
import { FileSystemService } from '../services/fileSystemService';

const CompilerScreen = ({ route, navigation }) => {
  const { projectPath } = route.params || {};
  const [compiling, setCompiling] = useState(false);
  const [buildOutput, setBuildOutput] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [compilationResult, setCompilationResult] = useState(null);

  useEffect(() => {
    loadConnectedDevices();
  }, []);

  const loadConnectedDevices = async () => {
    try {
      const connectedDevices = await CompilerService.getConnectedDevices();
      setDevices(connectedDevices);
      if (connectedDevices.length > 0) {
        setSelectedDevice(connectedDevices[0]);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const compileProject = async () => {
    if (!projectPath) {
      Alert.alert('Error', 'No project path specified');
      return;
    }

    setCompiling(true);
    setBuildOutput('Starting compilation...\n');
    setBuildProgress(0);

    try {
      // Step 1: Check for build.gradle
      setBuildOutput(prev => prev + 'Checking for build.gradle...\n');
      setBuildProgress(10);
      
      const buildResult = await CompilerService.buildGradleProject(projectPath);
      
      if (!buildResult.success) {
        throw new Error('Build failed: ' + buildResult.errors.join(', '));
      }

      setBuildOutput(prev => prev + buildResult.output + '\n');
      setBuildProgress(60);

      // Step 2: Check if APK was created
      if (buildResult.apkPath) {
        setBuildOutput(prev => prev + `APK created: ${buildResult.apkPath}\n`);
        setBuildProgress(80);
      }

      // Step 3: Ready for installation
      setBuildOutput(prev => prev + 'Build completed successfully!\n');
      setBuildProgress(100);
      
      setCompilationResult({
        success: true,
        apkPath: buildResult.apkPath,
        output: buildResult.output,
      });

    } catch (error) {
      setBuildOutput(prev => prev + `ERROR: ${error.message}\n`);
      setCompilationResult({
        success: false,
        error: error.message,
      });
    } finally {
      setCompiling(false);
    }
  };

  const installAPK = async () => {
    if (!compilationResult?.apkPath) {
      Alert.alert('Error', 'No APK available for installation');
      return;
    }

    if (!selectedDevice) {
      Alert.alert('Error', 'No device selected');
      return;
    }

    try {
      setBuildOutput(prev => prev + `\nInstalling APK on ${selectedDevice.model}...\n`);
      
      const installResult = await CompilerService.installAPK(compilationResult.apkPath);
      
      if (installResult.success) {
        setBuildOutput(prev => prev + installResult.output + '\n');
        Alert.alert('Success', 'App installed successfully!');
      } else {
        throw new Error(installResult.error);
      }
    } catch (error) {
      setBuildOutput(prev => prev + `Installation failed: ${error.message}\n`);
      Alert.alert('Error', 'Failed to install app');
    }
  };

  const runADBCommand = async (command) => {
    try {
      setBuildOutput(prev => prev + `\n$ adb ${command}\n`);
      
      const result = await CompilerService.runADBCommand(command);
      
      if (result.success) {
        setBuildOutput(prev => prev + result.output + '\n');
      } else {
        setBuildOutput(prev => prev + `Error: ${result.error}\n`);
      }
    } catch (error) {
      setBuildOutput(prev => prev + `Command failed: ${error.message}\n`);
    }
  };

  const clearOutput = () => {
    setBuildOutput('');
    setCompilationResult(null);
    setBuildProgress(0);
  };

  const refreshDevices = () => {
    loadConnectedDevices();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Android Compiler" />
        <IconButton
          icon="refresh"
          size={20}
          onPress={refreshDevices}
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Device Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Connected Devices</Text>
            {devices.length === 0 ? (
              <Text style={styles.emptyText}>No devices connected</Text>
            ) : (
              devices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceItem,
                    selectedDevice?.id === device.id && styles.selectedDevice,
                  ]}
                  onPress={() => setSelectedDevice(device)}
                >
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.model}</Text>
                    <Text style={styles.deviceDetails}>{device.id} • API {device.sdk}</Text>
                  </View>
                  <Ionicons
                    name={selectedDevice?.id === device.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedDevice?.id === device.id ? "#2196F3" : "#666"}
                  />
                </TouchableOpacity>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Build Controls */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Build Controls</Text>
            
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={compileProject}
                disabled={compiling || !projectPath}
                style={styles.buildButton}
                loading={compiling}
              >
                {compiling ? 'Building...' : 'Build Project'}
              </Button>
              
              <Button
                mode="outlined"
                onPress={installAPK}
                disabled={!compilationResult?.success || !selectedDevice}
                style={styles.installButton}
              >
                Install APK
              </Button>
            </View>

            {compiling && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Building... {buildProgress}%</Text>
                <ProgressBar
                  progress={buildProgress / 100}
                  color="#2196F3"
                  style={styles.progressBar}
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick ADB Commands */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Quick ADB Commands</Text>
            
            <View style={styles.commandGrid}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => runADBCommand('devices')}
              >
                <Ionicons name="phone-portrait" size={20} color="#2196F3" />
                <Text style={styles.commandText}>List Devices</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => runADBCommand('logcat')}
              >
                <Ionicons name="list" size={20} color="#2196F3" />
                <Text style={styles.commandText}>View Logcat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => runADBCommand('shell pm list packages')}
              >
                <Ionicons name="apps" size={20} color="#2196F3" />
                <Text style={styles.commandText}>List Packages</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => runADBCommand('shell getprop')}
              >
                <Ionicons name="settings" size={20} color="#2196F3" />
                <Text style={styles.commandText}>System Props</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Build Output */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.outputHeader}>
              <Text style={styles.sectionTitle}>Build Output</Text>
              <IconButton
                icon="delete"
                size={20}
                onPress={clearOutput}
              />
            </View>
            
            <View style={styles.outputContainer}>
              {buildOutput ? (
                <Text style={styles.outputText}>{buildOutput}</Text>
              ) : (
                <Text style={styles.emptyText}>No output yet. Start a build to see results.</Text>
              )}
            </View>
          </Card.Content>
        </Card>
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedDevice: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  deviceDetails: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buildButton: {
    flex: 1,
  },
  installButton: {
    flex: 1,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  commandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  commandButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  commandText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 8,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  outputContainer: {
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
  },
  outputText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default CompilerScreen;
