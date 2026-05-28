import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Appbar, List, Button, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(4);
  const [wordWrap, setWordWrap] = useState(true);
  const [minimap, setMinimap] = useState(false);
  const [autoComplete, setAutoComplete] = useState(true);
  const [linting, setLinting] = useState(true);

  const settingsGroups = [
    {
      title: 'Editor',
      items: [
        {
          key: 'fontSize',
          title: 'Font Size',
          description: `Current: ${fontSize}px`,
          type: 'slider',
          value: fontSize,
          onValueChange: setFontSize,
          min: 10,
          max: 24,
        },
        {
          key: 'tabSize',
          title: 'Tab Size',
          description: `Spaces: ${tabSize}`,
          type: 'slider',
          value: tabSize,
          onValueChange: setTabSize,
          min: 2,
          max: 8,
        },
        {
          key: 'wordWrap',
          title: 'Word Wrap',
          description: 'Wrap long lines',
          type: 'switch',
          value: wordWrap,
          onValueChange: setWordWrap,
        },
        {
          key: 'minimap',
          title: 'Minimap',
          description: 'Show code minimap',
          type: 'switch',
          value: minimap,
          onValueChange: setMinimap,
        },
      ],
    },
    {
      title: 'Features',
      items: [
        {
          key: 'autoSave',
          title: 'Auto Save',
          description: 'Save files automatically',
          type: 'switch',
          value: autoSave,
          onValueChange: setAutoSave,
        },
        {
          key: 'autoComplete',
          title: 'Auto Complete',
          description: 'Show code suggestions',
          type: 'switch',
          value: autoComplete,
          onValueChange: setAutoComplete,
        },
        {
          key: 'linting',
          title: 'Linting',
          description: 'Check for code errors',
          type: 'switch',
          value: linting,
          onValueChange: setLinting,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          key: 'darkMode',
          title: 'Dark Mode',
          description: 'Use dark theme',
          type: 'switch',
          value: darkMode,
          onValueChange: setDarkMode,
        },
      ],
    },
  ];

  const renderSettingItem = (item) => {
    if (item.type === 'switch') {
      return (
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingDescription}>{item.description}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: '#333333', true: '#2196F3' }}
            thumbColor={item.value ? '#FFFFFF' : '#888888'}
          />
        </View>
      );
    }

    if (item.type === 'slider') {
      return (
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingDescription}>{item.description}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => item.onValueChange(Math.max(item.min, item.value - 1))}
            >
              <Ionicons name="remove" size={20} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.sliderValue}>{item.value}</Text>
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => item.onValueChange(Math.min(item.max, item.value + 1))}
            >
              <Ionicons name="add" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupContent}>
              {group.items.map((item, itemIndex) => (
                <View key={item.key}>
                  {renderSettingItem(item)}
                  {itemIndex < group.items.length - 1 && (
                    <Divider style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>About</Text>
          <View style={styles.groupContent}>
            <List.Item
              title="Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="License"
              description="MIT License"
              left={(props) => <List.Icon {...props} icon="file-document-outline" />}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="GitHub"
              description="View source code"
              left={(props) => <List.Icon {...props} icon="github" />}
              onPress={() => console.log('Open GitHub')}
            />
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => console.log('Reset settings')}
            style={styles.actionButton}
          >
            Reset Settings
          </Button>
          <Button
            mode="contained"
            onPress={() => console.log('Export settings')}
            style={styles.actionButton}
          >
            Export Settings
          </Button>
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
  scrollView: {
    flex: 1,
  },
  settingsGroup: {
    margin: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  groupTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  groupContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#888888',
    fontSize: 14,
    marginTop: 2,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  sliderValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    minWidth: 24,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#333333',
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

export default SettingsScreen;
