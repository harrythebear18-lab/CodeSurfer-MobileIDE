import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PerformanceMonitor = ({ children }) => {
  const [fps, setFps] = useState(60);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const renderStartTime = useRef(Date.now());

  useEffect(() => {
    let animationFrameId;
    
    const calculateFPS = () => {
      frameCount.current++;
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime.current;
      
      if (deltaTime >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / deltaTime));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(calculateFPS);
    };
    
    animationFrameId = requestAnimationFrame(calculateFPS);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    // Calculate render time
    const endTime = Date.now();
    setRenderTime(endTime - renderStartTime.current);
  }, [children]);

  useEffect(() => {
    // Monitor memory usage (if available)
    const checkMemory = () => {
      if (performance && performance.memory) {
        const used = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
        setMemoryUsage(used);
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory();

    return () => clearInterval(interval);
  }, []);

  const getPerformanceStatus = () => {
    if (fps >= 55 && memoryUsage < 100) return 'excellent';
    if (fps >= 30 && memoryUsage < 200) return 'good';
    if (fps >= 15 && memoryUsage < 400) return 'poor';
    return 'critical';
  };

  const getStatusColor = () => {
    const status = getPerformanceStatus();
    switch (status) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#FF9800';
      case 'poor': return '#FF5722';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <View style={[styles.container, { borderColor: getStatusColor() }]}>
          <Text style={styles.text}>FPS: {fps}</Text>
          <Text style={styles.text}>Memory: {memoryUsage}MB</Text>
          <Text style={styles.text}>Render: {renderTime}ms</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
