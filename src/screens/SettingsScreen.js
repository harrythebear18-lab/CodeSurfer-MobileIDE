import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Appbar, List, Button, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { AppContext, actions } from '../context/AppContext';

const SettingsScreen = ({ navigation }) => {
  const { state, dispatch } = useContext(AppContext);
  const settings = state.settings;

  const updateSetting = (key, value) => {
    dispatch(actions.setSetting(key, value));
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            dispatch(actions.updateSettings({
              fontSize: 14,
              tabSize: 4,
              wordWrap: true,
              minimap: false,
              autoComplete: true,
              linting: true,
              darkMode: true,
              autoSave: true,
            }));
          },
        },
      ]
    );
  };

  const exportSettings = async () => {
    try {
      await Share.share({
        message: JSON.stringify(settings, null, 2),
        title: 'CodeSurfer Settings',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export settings');
    }
  };

  const settingsGroups = [
    {
      title: 'Editor',
      items: [
        {
          key: 'fontSize',
          title: 'Font Size',
          description: `Current: ${settings.fontSize}px`,
          type: 'slider',
          value: settings.fontSize,
          onValueChange: (v) => updateSetting('fontSize', v),
          min: 10,
          max: 24,
        },
        {
          key: 'tabSize',
          title: 'Tab Size',
          description: `Spaces: ${settings.tabSize}`,
          type: 'slider',
          value: settings.tabSize,
          onValueChange: (v) => updateSetting('tabSize', v),
          min: 2,
          max: 8,
        },
        {
          key: 'wordWrap',
          title: 'Word Wrap',
          description: 'Wrap long lines',
          type: 'switch',
          value: settings.wordWrap,
          onValueChange: (v) => updateSetting('wordWrap', v),
        },
        {
          key: 'minimap',
          title: 'Minimap',
          description: 'Show code minimap',
          type: 'switch',
          value: settings.minimap,
          onValueChange: (v) => updateSetting('minimap', v),
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
          value: settings.autoSave,
          onValueChange: (v) => updateSetting('autoSave', v),
        },
        {
          key: 'autoComplete',
          title: 'Auto Complete',
          description: 'Show code suggestions',
          type: 'switch',
          value: settings.autoComplete,
          onValueChange: (v) => updateSetting('autoComplete', v),
        },
        {
          key: 'linting',
          title: 'Linting',
          description: 'Check for code errors',
          type: 'switch',
          value: settings.linting,
          onValueChange: (v) => updateSetting('linting', v),
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
          value: settings.darkMode,
          onValueChange: (v) => updateSetting('darkMode', v),
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
            onPress={resetSettings}
            style={styles.actionButton}
          >
            Reset Settings
          </Button>
          <Button
            mode="contained"
            onPress={exportSettings}
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
