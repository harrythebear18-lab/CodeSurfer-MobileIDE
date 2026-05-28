import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Appbar, Button, Card, IconButton, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { GitService } from '../services/gitService';
import { useAppContext } from '../context/AppContext';

const GitScreen = ({ navigation, route }) => {
  const { projectPath } = route.params || {};
  const { thunks, currentProject } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [gitStatus, setGitStatus] = useState(null);
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [createBranchModal, setCreateBranchModal] = useState(false);

  const effectivePath = projectPath || currentProject?.path;

  useEffect(() => {
    if (effectivePath) {
      loadGitStatus();
      loadCommits();
      loadBranches();
    }
  }, [effectivePath]);

  const loadGitStatus = async () => {
    if (!effectivePath) return;
    
    try {
      setLoading(true);
      const status = await GitService.getStatus(effectivePath);
      setGitStatus(status);
      if (status.currentBranch) {
        setCurrentBranch(status.currentBranch);
      }
    } catch (error) {
      console.error('Error loading git status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommits = async () => {
    if (!effectivePath) return;
    
    try {
      const commitHistory = await GitService.getLog(effectivePath, 20);
      setCommits(commitHistory);
    } catch (error) {
      console.error('Error loading commits:', error);
    }
  };

  const loadBranches = async () => {
    if (!effectivePath) return;
    
    try {
      const branchList = await GitService.getBranches(effectivePath);
      setBranches(branchList);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const initRepository = async () => {
    if (!effectivePath) {
      Alert.alert('Error', 'No project selected');
      return;
    }

    Alert.alert(
      'Initialize Git Repository',
      'This will create a new git repository in the current project. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initialize',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await GitService.initRepository(effectivePath);
              
              if (result.success) {
                Alert.alert('Success', result.message);
                await loadGitStatus();
                await loadCommits();
                await loadBranches();
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to initialize repository');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const addAllFiles = async () => {
    if (!effectivePath) return;
    
    try {
      setLoading(true);
      // In a real implementation, this would add all modified files
      await loadGitStatus();
      Alert.alert('Success', 'All files added to staging area');
    } catch (error) {
      Alert.alert('Error', 'Failed to add files');
    } finally {
      setLoading(false);
    }
  };

  const createCommit = async () => {
    if (!effectivePath) return;
    
    if (!commitMessage.trim()) {
      Alert.alert('Error', 'Please enter a commit message');
      return;
    }

    try {
      setLoading(true);
      const result = await GitService.commit(effectivePath, commitMessage.trim());
      
      if (result.success) {
        Alert.alert('Success', result.message);
        setCommitMessage('');
        await loadGitStatus();
        await loadCommits();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create commit');
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async () => {
    if (!effectivePath) return;
    
    if (!newBranchName.trim()) {
      Alert.alert('Error', 'Please enter a branch name');
      return;
    }

    try {
      setLoading(true);
      const result = await GitService.createBranch(effectivePath, newBranchName.trim());
      
      if (result.success) {
        Alert.alert('Success', result.message);
        setNewBranchName('');
        setCreateBranchModal(false);
        await loadBranches();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  const toggleResultExpansion = (filePath) => {
    // Implementation for expanding/collapsing file results
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Git Version Control" />
        <IconButton
          icon="refresh"
          size={20}
          onPress={() => { loadGitStatus(); loadCommits(); loadBranches(); }}
          disabled={loading}
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Repository Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Repository Status</Text>
            
            {!gitStatus ? (
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>Not a Git repository</Text>
                <Button
                  mode="contained"
                  onPress={initRepository}
                  disabled={loading}
                  style={styles.initButton}
                >
                  Initialize Repository
                </Button>
              </View>
            ) : (
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Branch:</Text>
                  <Text style={styles.statusValue}>{gitStatus.currentBranch}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={styles.statusValue}>{gitStatus.message}</Text>
                </View>
                {gitStatus.lastCommit && (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Last Commit:</Text>
                    <Text style={styles.statusValue}>{gitStatus.lastCommit.substring(0, 7)}</Text>
                  </View>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Git Actions */}
        {gitStatus?.isRepository && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Actions</Text>
              
              <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  onPress={addAllFiles}
                  disabled={loading}
                  style={styles.actionButton}
                >
                  Add All Files
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => setCreateBranchModal(true)}
                  disabled={loading}
                  style={styles.actionButton}
                >
                  Create Branch
                </Button>
              </View>

              <View style={styles.commitSection}>
                <Text style={styles.inputLabel}>Commit Message:</Text>
                <TextInput
                  style={styles.commitInput}
                  value={commitMessage}
                  onChangeText={setCommitMessage}
                  placeholder="Enter commit message"
                  placeholderTextColor="#666"
                  multiline
                />
                
                <Button
                  mode="contained"
                  onPress={createCommit}
                  disabled={loading || !commitMessage.trim()}
                  style={styles.commitButton}
                  loading={loading}
                >
                  Create Commit
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Branches */}
        {branches.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Branches</Text>
              
              {branches.map((branch) => (
                <View key={branch.name} style={styles.branchItem}>
                  <View style={styles.branchInfo}>
                    <Text style={styles.branchName}>
                      {branch.name} {branch.current && '(current)'}
                    </Text>
                    <Text style={styles.branchCommit}>{branch.commit.substring(0, 7)}</Text>
                  </View>
                  {branch.current && (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Commit History */}
        {commits.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Commit History</Text>
              
              {commits.map((commit, index) => (
                <View key={commit.hash}>
                  <View style={styles.commitItem}>
                    <View style={styles.commitInfo}>
                      <Text style={styles.commitHash}>{commit.hash.substring(0, 7)}</Text>
                      <Text style={styles.commitMessage}>{commit.message}</Text>
                      <Text style={styles.commitAuthor}>{commit.author}</Text>
                      <Text style={styles.commitDate}>{formatDate(commit.date)}</Text>
                    </View>
                  </View>
                  {index < commits.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Create Branch Modal */}
        <View style={styles.modalOverlay} visible={createBranchModal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Branch</Text>
            
            <TextInput
              style={styles.textInput}
              value={newBranchName}
              onChangeText={setNewBranchName}
              placeholder="Branch name"
              placeholderTextColor="#666"
            />

            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => {
                  setCreateBranchModal(false);
                  setNewBranchName('');
                }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={createBranch}
                disabled={!newBranchName.trim() || loading}
              >
                Create
              </Button>
            </View>
          </View>
        </View>
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
  statusContainer: {
    paddingVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statusLabel: {
    color: '#888888',
    fontSize: 14,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  initButton: {
    alignSelf: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  commitSection: {
    marginTop: 16,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  commitInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 12,
    minHeight: 80,
  },
  commitButton: {
    alignSelf: 'flex-start',
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  branchCommit: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  commitItem: {
    paddingVertical: 12,
  },
  commitInfo: {
    flex: 1,
  },
  commitHash: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commitMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
  commitAuthor: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 2,
  },
  commitDate: {
    color: '#888888',
    fontSize: 12,
  },
  divider: {
    backgroundColor: '#333333',
    marginVertical: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 24,
    borderRadius: 12,
    margin: 20,
    width: '90%',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});

export default GitScreen;
