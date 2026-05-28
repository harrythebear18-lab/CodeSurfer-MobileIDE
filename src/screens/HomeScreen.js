import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Card, Button, List, IconButton, Portal, Modal } from 'react-native-paper';
import { TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { ProjectService } from '../services/projectService';
import * as FileSystem from 'expo-file-system';

const HomeScreen = ({ navigation }) => {
  const { recentProjects, thunks, loading } = useAppContext();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('react-native');
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const availableTemplates = ProjectService.getAvailableTemplates();
    setTemplates(availableTemplates);
  }, []);

  const quickActions = [
    {
      title: 'New Project',
      icon: 'add-circle-outline',
      onPress: () => setCreateModalVisible(true),
    },
    {
      title: 'Open File',
      icon: 'folder-open-outline',
      onPress: () => navigation.navigate('FileManager'),
    },
    {
      title: 'Search',
      icon: 'search-outline',
      onPress: () => navigation.navigate('Search'),
    },
    {
      title: 'Terminal',
      icon: 'terminal-outline',
      onPress: () => navigation.navigate('Terminal'),
    },
    {
      title: 'Git',
      icon: 'git-branch-outline',
      onPress: () => navigation.navigate('Git'),
    },
    {
      title: 'AI Debugger',
      icon: 'bug-outline',
      onPress: () => navigation.navigate('AIDebugger'),
    },
    {
      title: 'Compiler',
      icon: 'build-outline',
      onPress: () => navigation.navigate('Compiler'),
    },
    {
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  const createProject = async () => {
    if (!projectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    try {
      const result = await thunks.createProject(
        projectName,
        selectedTemplate,
        FileSystem.documentDirectory
      );
      
      Alert.alert('Success', `Project "${projectName}" created successfully`);
      setCreateModalVisible(false);
      setProjectName('');
      
      // Navigate to file manager with the new project
      navigation.navigate('FileManager');
    } catch (error) {
      Alert.alert('Error', 'Failed to create project');
    }
  };

  const openProject = async (project) => {
    try {
      await thunks.openProject(project.path);
      
      // Navigate to appropriate screen based on project type
      if (project.type === 'android') {
        navigation.navigate('Compiler', { projectPath: project.path });
      } else {
        navigation.navigate('FileManager');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open project');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to CodeSurfer</Text>
        <Text style={styles.subtitle}>Your mobile development environment</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionCard}
              onPress={action.onPress}
            >
              <Ionicons name={action.icon} size={32} color="#2196F3" />
              <Text style={styles.quickActionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Projects</Text>
          <Button mode="text" onPress={() => console.log('View all projects')}>
            View All
          </Button>
        </View>
        {recentProjects.length === 0 ? (
          <Card style={styles.projectCard}>
            <Card.Content>
              <Text style={styles.emptyState}>No recent projects</Text>
              <Text style={styles.emptyStateSubtext}>Create your first project to get started</Text>
            </Card.Content>
          </Card>
        ) : (
          recentProjects.map((project, index) => (
            <Card key={project.path || index} style={styles.projectCard}>
              <Card.Content>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <IconButton
                    icon="chevron-right"
                    size={20}
                    onPress={() => openProject(project)}
                  />
                </View>
                <Text style={styles.projectLanguage}>
                  {project.type || 'Unknown'} • {project.template || 'Custom'}
                </Text>
                <Text style={styles.projectModified}>
                  {project.lastModified ? new Date(project.lastModified).toLocaleDateString() : 'Unknown date'}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </View>

      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Create New Project</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Project Name:</Text>
            <TextInput
              style={styles.textInput}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Enter project name"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.templateGroup}>
            <Text style={styles.inputLabel}>Template:</Text>
            <ScrollView style={styles.templateList} horizontal showsHorizontalScrollIndicator={false}>
              {templates.map((template) => (
                <TouchableOpacity
                  key={template.key}
                  style={[
                    styles.templateCard,
                    selectedTemplate === template.key && styles.selectedTemplateCard,
                  ]}
                  onPress={() => setSelectedTemplate(template.key)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setCreateModalVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" onPress={createProject} disabled={!projectName.trim()}>
              Create
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  quickActionText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  projectCard: {
    backgroundColor: '#1E1E1E',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  projectLanguage: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
  },
  projectModified: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  emptyState: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyStateSubtext: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
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
  templateGroup: {
    marginBottom: 20,
  },
  templateList: {
    flexDirection: 'row',
  },
  templateCard: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedTemplateCard: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateDescription: {
    color: '#888888',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});

export default HomeScreen;
