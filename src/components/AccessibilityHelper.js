import React from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';

export const AccessibilityHelper = {
  // Screen reader announcements
  announce: (message) => {
    if (__DEV__) {
      console.log('Accessibility announcement:', message);
    }
    // In a real implementation, this would use platform-specific APIs
    // For now, we'll use the web API if available
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  },

  // Focus management
  setFocus: (componentRef) => {
    if (componentRef && componentRef.current) {
      componentRef.current.focus();
    }
  },

  // Accessibility props generator
  getAccessibilityProps: (label, hint, role) => {
    return {
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: role,
      accessible: true,
    };
  },

  // Screen reader friendly text
  formatScreenReaderText: (text) => {
    // Convert technical terms to screen reader friendly format
    return text
      .replace(/\.js/g, '. JavaScript file')
      .replace(/\.py/g, '. Python file')
      .replace(/\.java/g, '. Java file')
      .replace(/\.css/g, '. CSS file')
      .replace(/\.html/g, '. HTML file')
      .replace(/\.json/g, '. JSON file')
      .replace(/\.md/g, '. Markdown file')
      .replace(/npm/g, 'N-P-M')
      .replace(/git/g, 'Git')
      .replace(/API/g, 'A-P-I');
  },

  // Check if screen reader is active
  isScreenReaderEnabled: async () => {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      return false;
    }
  },

  // Reduce motion preference
  prefersReducedMotion: () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  },

  // High contrast preference
  prefersHighContrast: () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches;
    }
    return false;
  },
};

// HOC for accessibility
export const withAccessibility = (WrappedComponent) => {
  return (props) => {
    const [screenReaderEnabled, setScreenReaderEnabled] = React.useState(false);

    React.useEffect(() => {
      AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
      
      const subscription = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        setScreenReaderEnabled
      );

      return () => subscription?.remove();
    }, []);

    return (
      <View style={styles.container}>
        <WrappedComponent 
          {...props} 
          screenReaderEnabled={screenReaderEnabled}
          accessibilityHelper={AccessibilityHelper}
        />
      </View>
    );
  };
};

// Accessibility-friendly button component
export const AccessibleButton = ({ 
  children, 
  onPress, 
  accessibilityLabel, 
  accessibilityHint,
  ...props 
}) => {
  return (
    <View
      {...AccessibilityHelper.getAccessibilityProps(
        accessibilityLabel || children,
        accessibilityHint,
        'button'
      )}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
