import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { Appbar, IconButton, Menu } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { FileSystemService } from '../services/fileSystemService';
import USBStorageService from '../services/usbStorageService';

const EditorScreen = ({ route, navigation }) => {
  const { fileName, filePath } = route.params || {};
  const [currentFile, setCurrentFile] = useState(fileName || 'untitled.js');
  const [currentFilePath, setCurrentFilePath] = useState(filePath || null);
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = content.split('\n');
  const lineCount = lines.length;

  const loadFile = async () => {
    if (!currentFilePath) {
      setContent('// Start coding here\n');
      setLoading(false);
      return;
    }

    try {
      const fileContent = await FileSystemService.readFile(currentFilePath);
      setContent(fileContent);

      const extension = FileSystemService.getFileExtension(currentFile);
      const detectedLanguage = FileSystemService.getLanguageFromExtension(extension);
      setLanguage(detectedLanguage);
    } catch (error) {
      console.error('Error loading file:', error);
      setContent('// Error loading file\n');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFile();
  }, [currentFilePath]);

  const handleContentChange = (text) => {
    setContent(text);
    setHasUnsavedChanges(true);
  };

  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrollY(y);
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTo({ y, animated: false });
    }
  };

  const runCode = () => {
    console.log('Running code:', content);
  };

  const saveFile = async () => {
    try {
      if (!currentFilePath) {
        console.log('Save as functionality not implemented yet');
        return;
      }

      const isUSBPath = currentFilePath.includes('/mnt/') || currentFilePath.includes('/storage/');

      if (isUSBPath && USBStorageService.isUSBConnected()) {
        await USBStorageService.writeFileToUSB(currentFilePath, content);
      } else {
        await FileSystemService.writeFile(currentFilePath, content);
      }

      setHasUnsavedChanges(false);
      console.log('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const renderLineNumbers = () => {
    return (
      <ScrollView
        ref={lineNumbersRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.lineNumbersScroll}
        contentContainerStyle={styles.lineNumbersContent}
      >
        {lines.map((_, index) => (
          <Text key={index} style={styles.lineNumber}>
            {index + 1}
          </Text>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={currentFile} />
        <IconButton
          icon="play"
          mode="contained"
          size={20}
          onPress={runCode}
        />
        <IconButton
          icon={hasUnsavedChanges ? "content-save" : "content-save-outline"}
          size={20}
          onPress={saveFile}
          color={hasUnsavedChanges ? "#FFB74D" : undefined}
        />
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={20}
              onPress={openMenu}
            />
          }
        >
          <Menu.Item onPress={() => {}} title="Find & Replace" />
          <Menu.Item onPress={() => {}} title="Format Code" />
          <Menu.Item onPress={() => {}} title="Settings" />
        </Menu>
      </Appbar.Header>

      <View style={styles.editorContainer}>
        {renderLineNumbers()}
        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          <TextInput
            ref={editorRef}
            style={styles.editorInput}
            value={content}
            onChangeText={handleContentChange}
            multiline={true}
            scrollEnabled={false}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="default"
            textAlignVertical="top"
            placeholder=""
            placeholderTextColor="#666666"
          />
        </ScrollView>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Lines: {lineCount}</Text>
          <Text style={styles.statusText}>UTF-8</Text>
          <Text style={styles.statusText}>{language}</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Git')}>
            <Ionicons name="git-branch-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Terminal')}>
            <Ionicons name="terminal-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="folder-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  editorContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
  },
  lineNumbersScroll: {
    width: 50,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#1A1A1A',
  },
  lineNumbersContent: {
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  lineNumber: {
    color: '#555555',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
    textAlign: 'right',
  },
  editorScroll: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  editorScrollContent: {
    flexGrow: 1,
  },
  editorInput: {
    flex: 1,
    minHeight: '100%',
    padding: 12,
    paddingTop: 12,
    backgroundColor: '#1E1E1E',
    color: '#D4D4D4',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  bottomBar: {
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  statusText: {
    color: '#888888',
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  quickAction: {
    padding: 8,
  },
});

export default EditorScreen;
