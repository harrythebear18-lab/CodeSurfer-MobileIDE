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
import { Appbar, Button, Card, IconButton, Divider, Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { SearchService } from '../services/searchService';
import { useAppContext } from '../context/AppContext';

const SearchScreen = ({ navigation, route }) => {
  const { projectPath } = route.params || {};
  const { currentProject } = useAppContext();
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [expandedResults, setExpandedResults] = useState({});
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });

  const effectivePath = projectPath || currentProject?.path;

  const performSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    if (!effectivePath) {
      Alert.alert('Error', 'No project selected');
      return;
    }

    const validation = SearchService.validateSearchQuery(query);
    if (!validation.valid) {
      Alert.alert('Error', validation.error);
      return;
    }

    try {
      setLoading(true);
      const results = await SearchService.searchInProject(effectivePath, query, searchOptions);
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const previewReplace = async () => {
    if (!query.trim() || !replacement.trim()) {
      Alert.alert('Error', 'Please enter both search query and replacement');
      return;
    }

    if (!effectivePath) {
      Alert.alert('Error', 'No project selected');
      return;
    }

    try {
      setLoading(true);
      const results = await SearchService.replaceInProject(effectivePath, query, replacement, {
        ...searchOptions,
        previewOnly: true,
      });
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Error', 'Replace preview failed');
    } finally {
      setLoading(false);
    }
  };

  const executeReplace = async () => {
    if (!query.trim() || !replacement.trim()) {
      Alert.alert('Error', 'Please enter both search query and replacement');
      return;
    }

    if (!searchResults?.results || searchResults.results.length === 0) {
      Alert.alert('Error', 'No matches found to replace');
      return;
    }

    Alert.alert(
      'Confirm Replace',
      `This will replace ${searchResults.totalReplacements} occurrences in ${searchResults.totalFiles} files. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const results = await SearchService.replaceInProject(effectivePath, query, replacement, {
                ...searchOptions,
                previewOnly: false,
              });
              setSearchResults(results);
              Alert.alert('Success', `Replaced ${results.totalReplacements} occurrences`);
              setReplaceMode(false);
            } catch (error) {
              Alert.alert('Error', 'Replace failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleResultExpansion = (filePath) => {
    setExpandedResults(prev => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  const navigateToFile = (filePath, line, column) => {
    navigation.navigate('Editor', { 
      filePath, 
      fileName: filePath.split('/').pop(),
      initialLine: line,
      initialColumn: column,
    });
  };

  const clearResults = () => {
    setSearchResults(null);
    setExpandedResults({});
  };

  const renderSearchOptions = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.sectionTitle}>Search Options</Text>
        
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Case Sensitive</Text>
          <Switch
            value={searchOptions.caseSensitive}
            onValueChange={(value) => setSearchOptions(prev => ({ ...prev, caseSensitive: value }))}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Whole Word</Text>
          <Switch
            value={searchOptions.wholeWord}
            onValueChange={(value) => setSearchOptions(prev => ({ ...prev, wholeWord: value }))}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Regular Expression</Text>
          <Switch
            value={searchOptions.regex}
            onValueChange={(value) => setSearchOptions(prev => ({ ...prev, regex: value }))}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderSearchInput = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.sectionTitle}>{replaceMode ? 'Replace' : 'Search'}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Search for:</Text>
          <TextInput
            style={styles.textInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Enter search query..."
            placeholderTextColor="#666"
            multiline
          />
        </View>

        {replaceMode && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Replace with:</Text>
            <TextInput
              style={styles.textInput}
              value={replacement}
              onChangeText={setReplacement}
              placeholder="Enter replacement text..."
              placeholderTextColor="#666"
              multiline
            />
          </View>
        )}

        <View style={styles.buttonRow}>
          <Button
            mode={replaceMode ? "outlined" : "contained"}
            onPress={replaceMode ? previewReplace : performSearch}
            disabled={loading || !query.trim()}
            loading={loading}
            style={styles.searchButton}
          >
            {replaceMode ? 'Preview Replace' : 'Search'}
          </Button>

          {replaceMode && (
            <Button
              mode="contained"
              onPress={executeReplace}
              disabled={loading || !searchResults?.results?.length}
              style={styles.replaceButton}
            >
              Execute Replace
            </Button>
          )}
        </View>

        <View style={styles.modeToggle}>
          <Button
            mode="text"
            onPress={() => setReplaceMode(!replaceMode)}
          >
            {replaceMode ? 'Switch to Search' : 'Switch to Replace'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSearchResults = () => {
    if (!searchResults) return null;

    if (!searchResults.success) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.errorText}>Search failed: {searchResults.error}</Text>
          </Card.Content>
        </Card>
      );
    }

    if (searchResults.results.length === 0) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>No matches found</Text>
          </Card.Content>
        </Card>
      );
    }

    const stats = SearchService.getSearchStats(searchResults);

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            <IconButton
              icon="delete"
              size={20}
              onPress={clearResults}
            />
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {stats.totalMatches} matches in {stats.filesWithMatches} files
            </Text>
            {replaceMode && searchResults.previewOnly && (
              <Text style={styles.previewText}>
                Preview mode - {searchResults.totalReplacements} replacements pending
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />

          {searchResults.results.map((fileResult) => (
            <View key={fileResult.filePath} style={styles.fileResult}>
              <TouchableOpacity
                style={styles.fileHeader}
                onPress={() => toggleResultExpansion(fileResult.filePath)}
              >
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{fileResult.relativePath}</Text>
                  <Text style={styles.fileStats}>
                    {fileResult.totalMatches} match{fileResult.totalMatches !== 1 ? 'es' : ''}
                  </Text>
                </View>
                <Ionicons
                  name={expandedResults[fileResult.filePath] ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              {expandedResults[fileResult.filePath] && (
                <View style={styles.matchesContainer}>
                  {fileResult.results.slice(0, 10).map((match, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.matchItem}
                      onPress={() => navigateToFile(fileResult.filePath, match.line, match.column)}
                    >
                      <Text style={styles.matchLine}>Line {match.line}: {match.column}</Text>
                      <Text style={styles.matchText} numberOfLines={2}>
                        {match.text}
                      </Text>
                      {replaceMode && searchResults.previewOnly && (
                        <Text style={styles.replacementText}>
                          → {match.match} → {replacement}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {fileResult.results.length > 10 && (
                    <Text style={styles.moreText}>
                      ... and {fileResult.results.length - 10} more matches
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Search & Replace" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {renderSearchOptions()}
        {renderSearchInput()}
        {renderSearchResults()}
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
    minHeight: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  searchButton: {
    flex: 1,
  },
  replaceButton: {
    flex: 1,
  },
  modeToggle: {
    alignItems: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsContainer: {
    marginBottom: 8,
  },
  statsText: {
    color: '#888888',
    fontSize: 14,
  },
  previewText: {
    color: '#FFB74D',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    backgroundColor: '#333333',
    marginVertical: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  fileResult: {
    marginBottom: 16,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  fileStats: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  matchesContainer: {
    paddingLeft: 16,
  },
  matchItem: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  matchLine: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  replacementText: {
    color: '#4CAF50',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  moreText: {
    color: '#888888',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 4,
  },
});

export default SearchScreen;
