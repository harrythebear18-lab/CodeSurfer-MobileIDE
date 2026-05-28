import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Appbar, Button, IconButton, FAB, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const FileManagerScreen = ({ navigation }) => {
  const [files, setFiles] = useState([
    { id: 1, name: 'src', type: 'folder', size: '-', modified: '2024-05-28' },
    { id: 2, name: 'package.json', type: 'file', size: '2.1 KB', modified: '2024-05-28' },
    { id: 3, name: 'README.md', type: 'file', size: '4.5 KB', modified: '2024-05-28' },
    { id: 4, name: 'App.js', type: 'file', size: '1.2 KB', modified: '2024-05-28' },
    { id: 5, name: 'assets', type: 'folder', size: '-', modified: '2024-05-28' },
    { id: 6, name: 'docs', type: 'folder', size: '-', modified: '2024-05-28' },
  ]);

  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('file');

  const getFileIcon = (type, name) => {
    if (type === 'folder') {
      return 'folder-outline';
    }
    
    const extension = name.split('.').pop().toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'logo-javascript';
      case 'ts':
      case 'tsx':
        return 'logo-typescript';
      case 'py':
        return 'logo-python';
      case 'html':
        return 'logo-html5';
      case 'css':
        return 'logo-css3';
      case 'json':
        return 'code-json';
      case 'md':
        return 'document-text-outline';
      default:
        return 'document-outline';
    }
  };

  const handleFilePress = (file) => {
    if (file.type === 'folder') {
      setCurrentPath(`${currentPath}${file.name}/`);
      // In a real app, you would load the files for this folder
    } else {
      navigation.navigate('Editor', { fileName: file.name });
    }
  };

  const handleLongPress = (file) => {
    const isSelected = selectedFiles.includes(file.id);
    if (isSelected) {
      setSelectedFiles(selectedFiles.filter(id => id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file.id]);
    }
  };

  const createNewItem = () => {
    if (!newFileName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newItem = {
      id: Date.now(),
      name: newFileName,
      type: newFileType,
      size: newFileType === 'file' ? '0 KB' : '-',
      modified: new Date().toISOString().split('T')[0],
    };

    setFiles([newItem, ...files]);
    setCreateModalVisible(false);
    setNewFileName('');
    setNewFileType('file');
  };

  const deleteSelectedFiles = () => {
    if (selectedFiles.length === 0) return;

    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${selectedFiles.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFiles(files.filter(file => !selectedFiles.includes(file.id)));
            setSelectedFiles([]);
          },
        },
      ]
    );
  };

  const renderFileItem = ({ item }) => {
    const isSelected = selectedFiles.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.fileItem, isSelected && styles.selectedFileItem]}
        onPress={() => handleFilePress(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.fileIcon}>
          <Ionicons
            name={getFileIcon(item.type, item.name)}
            size={24}
            color={item.type === 'folder' ? '#FFB74D' : '#64B5F6'}
          />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.name}</Text>
          <Text style={styles.fileDetails}>
            {item.size} • {item.modified}
          </Text>
        </View>
        <IconButton
          icon="chevron-forward"
          size={20}
          iconColor="#666"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="File Manager" subtitle={currentPath} />
        {selectedFiles.length > 0 && (
          <IconButton
            icon="trash"
            mode="contained"
            size={20}
            onPress={deleteSelectedFiles}
          />
        )}
      </Appbar.Header>

      <View style={styles.pathBar}>
        <TouchableOpacity onPress={() => setCurrentPath('/')}>
          <Text style={styles.pathText}>Home</Text>
        </TouchableOpacity>
        {currentPath.split('/').filter(Boolean).map((segment, index) => (
          <Text key={index} style={styles.pathText}>
            {' / '}{segment}
          </Text>
        ))}
      </View>

      <FlatList
        data={files}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.fileList}
        contentContainerStyle={styles.fileListContent}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      />

      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Create New Item</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name:</Text>
            <TextInput
              style={styles.textInput}
              value={newFileName}
              onChangeText={setNewFileName}
              placeholder="Enter name"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.typeGroup}>
            <Text style={styles.inputLabel}>Type:</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeButton, newFileType === 'file' && styles.selectedTypeButton]}
                onPress={() => setNewFileType('file')}
              >
                <Ionicons name="document-outline" size={20} color="#2196F3" />
                <Text style={styles.typeButtonText}>File</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, newFileType === 'folder' && styles.selectedTypeButton]}
                onPress={() => setNewFileType('folder')}
              >
                <Ionicons name="folder-outline" size={20} color="#FFB74D" />
                <Text style={styles.typeButtonText}>Folder</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setCreateModalVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" onPress={createNewItem}>
              Create
            </Button>
          </View>
        </Modal>
      </Portal>
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
  pathBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  pathText: {
    color: '#2196F3',
    fontSize: 14,
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    padding: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedFileItem: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  fileIcon: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  fileDetails: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 24,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  typeGroup: {
    marginBottom: 20,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedTypeButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});

export default FileManagerScreen;
