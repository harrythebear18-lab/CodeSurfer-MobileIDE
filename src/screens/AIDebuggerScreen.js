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
import { AIDebuggerService } from '../services/aiDebuggerService';
import { useAppContext } from '../context/AppContext';

const AIDebuggerScreen = ({ navigation, route }) => {
  const { projectPath } = route.params || {};
  const { currentProject } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [debugSession, setDebugSession] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [breakpoints, setBreakpoints] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [errorAnalysis, setErrorAnalysis] = useState(null);
  const [debugSummary, setDebugSummary] = useState(null);

  const effectivePath = projectPath || currentProject?.path;

  useEffect(() => {
    if (effectivePath) {
      createDebugSession();
    }
  }, [effectivePath]);

  const createDebugSession = async () => {
    try {
      setLoading(true);
      const sessionResult = await AIDebuggerService.createAIDebugSession(
        effectivePath,
        'javascript', // Detect from file extension
        effectivePath
      );
      
      if (sessionResult.success) {
        setSessionId(sessionResult.sessionId);
        setDebugSession(sessionResult.session);
        setAiAnalysis(sessionResult.session.aiContext.codeAnalysis);
      } else {
        Alert.alert('Error', 'Failed to create AI debug session');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create debug session');
    } finally {
      setLoading(false);
    }
  };

  const setAIBreakpoint = async (lineNumber) => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const result = await AIDebuggerService.setAIBreakpoint(sessionId, lineNumber);
      
      if (result.success) {
        setBreakpoints(prev => [...prev, result.breakpoint]);
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set breakpoint');
    } finally {
      setLoading(false);
    }
  };

  const analyzeError = async (error, lineNumber) => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const result = await AIDebuggerService.analyzeErrorWithAI(
        sessionId,
        error,
        lineNumber,
        'Current code context here'
      );
      
      if (result.success) {
        setErrorAnalysis(result.analysis);
        Alert.alert('AI Analysis', 'Error analyzed successfully');
      } else {
        Alert.alert('Error', 'Failed to analyze error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze error');
    } finally {
      setLoading(false);
    }
  };

  const getDebugReport = async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const result = await AIDebuggerService.generateAIDebugReport(sessionId);
      
      if (result.success) {
        setDebugSummary(result.report);
        Alert.alert('Success', 'Debug report generated');
      } else {
        Alert.alert('Error', 'Failed to generate report');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getAICodeSuggestions = async (currentCode, cursorPosition) => {
    if (!sessionId) return;
    
    try {
      const result = await AIDebuggerService.getAICodeSuggestion(
        sessionId,
        currentCode,
        cursorPosition,
        'debugging'
      );
      
      if (result.success) {
        Alert.alert('AI Suggestion', result.explanation);
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    }
  };

  const renderAIAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>AI Code Analysis</Text>
          
          {aiAnalysis.potentialBugs && aiAnalysis.potentialBugs.length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Potential Bugs ({aiAnalysis.potentialBugs.length})</Text>
              {aiAnalysis.potentialBugs.map((bug, index) => (
                <View key={index} style={styles.analysisItem}>
                  <Text style={styles.analysisLine}>Line {bug.line}: {bug.issue}</Text>
                  <TouchableOpacity
                    style={styles.breakpointButton}
                    onPress={() => setAIBreakpoint(bug.line)}
                  >
                    <Text style={styles.breakpointButtonText}>Set Breakpoint</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {aiAnalysis.suggestedBreakpoints && aiAnalysis.suggestedBreakpoints.length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Suggested Breakpoints</Text>
              {aiAnalysis.suggestedBreakpoints.map((bp, index) => (
                <View key={index} style={styles.analysisItem}>
                  <Text style={styles.analysisLine}>Line {bp.line}: {bp.reason}</Text>
                  <TouchableOpacity
                    style={styles.breakpointButton}
                    onPress={() => setAIBreakpoint(bp.line)}
                  >
                    <Text style={styles.breakpointButtonText}>Set Breakpoint</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {aiAnalysis.codeQuality && aiAnalysis.codeQuality.length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Code Quality Issues</Text>
              {aiAnalysis.codeQuality.map((issue, index) => (
                <View key={index} style={styles.analysisItem}>
                  <Text style={styles.analysisLine}>Line {issue.line}: {issue.issue}</Text>
                  <Text style={styles.analysisSuggestion}>Suggestion: {issue.suggestion}</Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderBreakpoints = () => {
    if (breakpoints.length === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>AI Breakpoints ({breakpoints.length})</Text>
          
          {breakpoints.map((bp, index) => (
            <View key={bp.id} style={styles.breakpointItem}>
              <View style={styles.breakpointInfo}>
                <Text style={styles.breakpointLine}>Line {bp.lineNumber}</Text>
                <Text style={styles.breakpointReason}>{bp.reason}</Text>
                <Text style={styles.breakpointConfidence}>
                  Confidence: {bp.aiConfidence}%
                </Text>
              </View>
              <IconButton
                icon="delete"
                size={20}
                onPress={() => {
                  setBreakpoints(prev => prev.filter(b => b.id !== bp.id));
                }}
              />
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderErrorAnalysis = () => {
    if (!errorAnalysis) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>AI Error Analysis</Text>
          
          <View style={styles.analysisSection}>
            <Text style={styles.analysisSubtitle}>Root Cause</Text>
            <Text style={styles.analysisText}>{errorAnalysis.rootCause}</Text>
          </View>

          {errorAnalysis.suggestedFixes && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Suggested Fixes</Text>
              {errorAnalysis.suggestedFixes.map((fix, index) => (
                <View key={index} style={styles.analysisItem}>
                  <Text style={styles.analysisText}>{fix.fix}</Text>
                  {fix.code && (
                    <Text style={styles.codeExample}>{fix.code}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {errorAnalysis.prevention && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Prevention Tips</Text>
              {errorAnalysis.prevention.map((tip, index) => (
                <Text key={index} style={styles.analysisText}>• {tip}</Text>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderDebugSummary = () => {
    if (!debugSummary) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>AI Debug Summary</Text>
          
          <View style={styles.analysisSection}>
            <Text style={styles.analysisText}>{debugSummary.summary}</Text>
          </View>

          {debugSummary.keyInsights && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Key Insights</Text>
              {debugSummary.keyInsights.map((insight, index) => (
                <Text key={index} style={styles.analysisText}>• {insight}</Text>
              ))}
            </View>
          )}

          {debugSummary.recommendations && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSubtitle}>Recommendations</Text>
              {debugSummary.recommendations.map((rec, index) => (
                <Text key={index} style={styles.analysisText}>• {rec}</Text>
              ))}
            </View>
          )}

          <View style={styles.analysisSection}>
            <Text style={styles.analysisSubtitle}>Scores</Text>
            <Text style={styles.analysisText}>
              Code Quality: {debugSummary.codeQualityScore}/100
            </Text>
            <Text style={styles.analysisText}>
              Debugging Efficiency: {debugSummary.debuggingEfficiency}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="AI Debugger" />
        <IconButton
          icon="refresh"
          size={20}
          onPress={createDebugSession}
          disabled={loading}
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Session Info */}
        {debugSession && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Debug Session</Text>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionText}>Session ID: {sessionId}</Text>
                <Text style={styles.sessionText}>Language: {debugSession.language}</Text>
                <Text style={styles.sessionText}>Status: {debugSession.status}</Text>
                <Text style={styles.sessionText}>
                  Started: {new Date(debugSession.startTime).toLocaleString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* AI Analysis */}
        {renderAIAnalysis()}

        {/* Breakpoints */}
        {renderBreakpoints()}

        {/* Error Analysis */}
        {renderErrorAnalysis()}

        {/* Debug Summary */}
        {renderDebugSummary()}

        {/* Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>AI Actions</Text>
            
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  Alert.prompt(
                    'Enter Error',
                    'Describe the error you encountered',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Analyze',
                        onPress: (error) => {
                          if (error) {
                            analyzeError(error, 1); // Default to line 1
                          }
                        },
                      },
                    ]
                  );
                }}
                disabled={!sessionId || loading}
                style={styles.actionButton}
              >
                Analyze Error
              </Button>
              
              <Button
                mode="outlined"
                onPress={getDebugReport}
                disabled={!sessionId || loading}
                style={styles.actionButton}
              >
                Generate Report
              </Button>
            </View>

            <View style={styles.actionRow}>
              <Button
                mode="contained"
                onPress={() => {
                  Alert.prompt(
                    'Code Context',
                    'Enter current code for AI suggestions',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Get Suggestions',
                        onPress: (code) => {
                          if (code) {
                            getAICodeSuggestions(code, 0);
                          }
                        },
                      },
                    ]
                  );
                }}
                disabled={!sessionId || loading}
                style={styles.actionButton}
              >
                Get AI Suggestions
              </Button>
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
  sessionInfo: {
    gap: 4,
  },
  sessionText: {
    color: '#888888',
    fontSize: 14,
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSubtitle: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  analysisItem: {
    marginBottom: 8,
  },
  analysisLine: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  analysisText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  analysisSuggestion: {
    color: '#4CAF50',
    fontSize: 12,
    fontStyle: 'italic',
  },
  codeExample: {
    backgroundColor: '#2A2A2A',
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  breakpointButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  breakpointButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  breakpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  breakpointInfo: {
    flex: 1,
  },
  breakpointLine: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  breakpointReason: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  breakpointConfidence: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
});

export default AIDebuggerScreen;
