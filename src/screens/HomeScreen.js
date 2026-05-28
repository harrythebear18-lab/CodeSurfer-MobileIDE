import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Card, Button, List, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const recentProjects = [
    { id: 1, name: 'My React App', language: 'JavaScript', lastModified: '2 hours ago' },
    { id: 2, name: 'Python Scripts', language: 'Python', lastModified: '1 day ago' },
    { id: 3, name: 'Web Design', language: 'HTML/CSS', lastModified: '3 days ago' },
  ];

  const quickActions = [
    {
      title: 'New Project',
      icon: 'add-circle-outline',
      onPress: () => console.log('Create new project'),
    },
    {
      title: 'Open File',
      icon: 'folder-open-outline',
      onPress: () => navigation.navigate('FileManager'),
    },
    {
      title: 'Git Clone',
      icon: 'git-branch-outline',
      onPress: () => console.log('Clone repository'),
    },
    {
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

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
        {recentProjects.map((project) => (
          <Card key={project.id} style={styles.projectCard}>
            <Card.Content>
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.name}</Text>
                <IconButton
                  icon="chevron-right"
                  size={20}
                  onPress={() => navigation.navigate('Editor')}
                />
              </View>
              <Text style={styles.projectLanguage}>{project.language}</Text>
              <Text style={styles.projectModified}>Modified {project.lastModified}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
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
});

export default HomeScreen;
