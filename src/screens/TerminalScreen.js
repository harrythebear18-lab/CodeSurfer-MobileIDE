import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Appbar, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { RealTerminalService } from '../services/realTerminalService';
import { useAppContext } from '../context/AppContext';

const TerminalScreen = ({ navigation }) => {
  const { currentProject } = useAppContext();
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDirectory, setCurrentDirectory] = useState('/');
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Initialize terminal
    const welcomeMessage = `CodeSurfer MobileIDE Terminal v1.0.0
Type 'help' for available commands.
${currentProject ? `Current project: ${currentProject.name}` : 'No project selected'}
$ `;
    setOutput(welcomeMessage);
  }, [currentProject]);

  useEffect(() => {
    // Auto-scroll to bottom when output changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [output]);

  const executeCommand = async (command) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    // Add to history
    const newHistory = [...history, trimmedCommand];
    setHistory(newHistory);
    setHistoryIndex(-1);

    // Add command to output
    setOutput(prev => prev + trimmedCommand + '\n');

    try {
      const result = await RealTerminalService.executeCommand(trimmedCommand, currentDirectory);
      
      if (result.success) {
        setOutput(prev => prev + result.output + '\n$ ');
      } else {
        setOutput(prev => prev + `Error: ${result.error}\n$ `);
      }
    } catch (error) {
      setOutput(prev => prev + `Error: ${error.message}\n$ `);
    }
  };

  const handleKeyPress = (e) => {
    if (e.nativeEvent.key === 'Enter') {
      executeCommand(input);
      setInput('');
    } else if (e.nativeEvent.key === 'ArrowUp') {
      // Navigate history up
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.nativeEvent.key === 'ArrowDown') {
      // Navigate history down
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const clearTerminal = () => {
    setOutput('$ ');
    setInput('');
    setHistoryIndex(-1);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Terminal" subtitle={currentDirectory} />
        <IconButton
          icon="delete"
          size={20}
          onPress={clearTerminal}
        />
      </Appbar.Header>

      <ScrollView
        ref={scrollViewRef}
        style={styles.terminalContainer}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.outputText}>{output}</Text>
      </ScrollView>

      <View style={styles.inputContainer}>
        <Text style={styles.prompt}>$ </Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => executeCommand(input)}
          placeholder="Enter command..."
          placeholderTextColor="#666"
          autoCorrect={false}
          autoCapitalize="none"
          multiline={false}
        />
        <IconButton
          icon="send"
          size={20}
          onPress={() => executeCommand(input)}
          disabled={!input.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#1E1E1E',
    elevation: 0,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  terminalContent: {
    padding: 16,
  },
  outputText: {
    color: '#00FF00',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  prompt: {
    color: '#00FF00',
    fontSize: 14,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#00FF00',
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
});

export default TerminalScreen;
