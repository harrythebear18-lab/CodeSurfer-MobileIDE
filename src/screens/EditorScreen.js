import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { Appbar, Button, IconButton, Menu } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { FileSystemService } from '../services/fileSystemService';
import { useEffect } from 'react';

const EditorScreen = ({ route, navigation }) => {
  const { fileName, filePath } = route.params || {};
  const [currentFile, setCurrentFile] = useState(fileName || 'untitled.js');
  const [currentFilePath, setCurrentFilePath] = useState(filePath || null);
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const editorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js"></script>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          background-color: #1e1e1e;
        }
        #editor {
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <div id="editor"></div>
      <script>
        require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }});
        require(['vs/editor/editor.main'], function() {
          var editor = monaco.editor.create(document.getElementById('editor'), {
            value: '${content.replace(/'/g, "\\'").replace(/\n/g, '\\n')}',
            language: '${language}',
            theme: 'vs-dark',
            fontSize: 14,
            wordWrap: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true
          });

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'content_change',
            value: editor.getValue()
          }));

          editor.onDidChangeModelContent(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'content_change',
              value: editor.getValue()
            }));
          });
        });
      </script>
    </body>
    </html>
  `;

  const loadFile = async () => {
    if (!currentFilePath) {
      setContent('// Start coding here\n');
      setLoading(false);
      return;
    }

    try {
      const fileContent = await FileSystemService.readFile(currentFilePath);
      setContent(fileContent);
      
      // Detect language from file extension
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

  const handleWebViewMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'content_change') {
      setContent(data.value);
      setHasUnsavedChanges(true);
    }
  };

  const runCode = () => {
    console.log('Running code:', content);
    // TODO: Implement code execution logic
  };

  const saveFile = async () => {
    try {
      if (!currentFilePath) {
        // Save as new file
        // TODO: Implement save as dialog
        console.log('Save as functionality not implemented yet');
        return;
      }

      await FileSystemService.writeFile(currentFilePath, content);
      setHasUnsavedChanges(false);
      console.log('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

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
        <WebView
          source={{ html: editorHTML }}
          onMessage={handleWebViewMessage}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
        />
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Lines: {content.split('\n').length}</Text>
          <Text style={styles.statusText}>UTF-8</Text>
          <Text style={styles.statusText}>{language}</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="git-branch-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="terminal-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
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
    backgroundColor: '#1E1E1E',
  },
  webView: {
    flex: 1,
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
