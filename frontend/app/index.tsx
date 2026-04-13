import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function BPMScreen() {
  const [bpm, setBpm] = useState<number>(0);
  const [taps, setTaps] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [manualBpm, setManualBpm] = useState(120);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveformAnim = useRef(new Animated.Value(0)).current;

  // Reset after 2 seconds of no tapping
  useEffect(() => {
    if (taps.length > 0) {
      const timer = setTimeout(() => {
        setTaps([]);
        setIsActive(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [taps]);

  // Pulse animation
  useEffect(() => {
    if (bpm > 0) {
      const interval = 60000 / bpm;
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: interval * 0.15,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: interval * 0.85,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [bpm]);

  // Waveform animation
  useEffect(() => {
    const wave = Animated.loop(
      Animated.timing(waveformAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    wave.start();
    return () => wave.stop();
  }, []);

  const handleTap = () => {
    const now = Date.now();
    setIsActive(true);
    
    // Trigger haptic feedback if available
    if (Platform.OS !== 'web') {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    const newTaps = [...taps, now].slice(-8); // Keep last 8 taps
    setTaps(newTaps);

    if (newTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.min(Math.max(calculatedBpm, 20), 300)); // Clamp between 20-300
    }
  };

  const resetBpm = () => {
    setTaps([]);
    setBpm(0);
    setIsActive(false);
  };

  const adjustManualBpm = (delta: number) => {
    setManualBpm((prev) => Math.min(Math.max(prev + delta, 20), 300));
  };

  const useManualBpm = () => {
    setBpm(manualBpm);
  };

  // Generate waveform bars
  const generateWaveform = () => {
    const bars = [];
    for (let i = 0; i < 30; i++) {
      const height = Math.random() * 60 + 20;
      bars.push(
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: bpm > 0 ? height : 20,
              opacity: waveformAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 1, 0.5],
              }),
            },
          ]}
        />
      );
    }
    return bars;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Waveform Visualization */}
        <View style={styles.waveformContainer}>
          <Text style={styles.sectionTitle}>Audio Waveform</Text>
          <View style={styles.waveform}>{generateWaveform()}</View>
        </View>

        {/* BPM Display */}
        <View style={styles.bpmDisplayContainer}>
          <Text style={styles.bpmLabel}>DETECTED BPM</Text>
          <Animated.View
            style={[
              styles.bpmCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.bpmValue}>{bpm || '--'}</Text>
          </Animated.View>
          <Text style={styles.tapCount}>
            {taps.length > 0 ? `${taps.length} taps` : 'Tap to start'}
          </Text>
        </View>

        {/* Tap Button */}
        <TouchableOpacity
          style={[styles.tapButton, isActive && styles.tapButtonActive]}
          onPress={handleTap}
          activeOpacity={0.7}
        >
          <Ionicons
            name="hand-left"
            size={48}
            color={isActive ? '#1a1a2e' : '#00D4FF'}
          />
          <Text style={[styles.tapText, isActive && styles.tapTextActive]}>
            TAP TEMPO
          </Text>
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={resetBpm}>
          <Ionicons name="refresh" size={20} color="#FF6B6B" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        {/* Manual BPM Adjuster */}
        <View style={styles.manualContainer}>
          <Text style={styles.sectionTitle}>Manual BPM</Text>
          <View style={styles.manualControls}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustManualBpm(-5)}
            >
              <Ionicons name="remove" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustManualBpm(-1)}
            >
              <Text style={styles.adjustText}>-1</Text>
            </TouchableOpacity>
            <View style={styles.manualBpmDisplay}>
              <Text style={styles.manualBpmValue}>{manualBpm}</Text>
            </View>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustManualBpm(1)}
            >
              <Text style={styles.adjustText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustManualBpm(5)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.useButton} onPress={useManualBpm}>
            <Text style={styles.useButtonText}>Use This BPM</Text>
          </TouchableOpacity>
        </View>

        {/* BPM Guide */}
        <View style={styles.guideContainer}>
          <Text style={styles.sectionTitle}>BPM Reference</Text>
          <View style={styles.guideGrid}>
            {[
              { genre: 'Hip-Hop', range: '85-115' },
              { genre: 'House', range: '120-130' },
              { genre: 'Techno', range: '130-150' },
              { genre: 'Drum & Bass', range: '160-180' },
              { genre: 'Dubstep', range: '140-150' },
              { genre: 'Psytrance', range: '140-150' },
            ].map((item, index) => (
              <View key={index} style={styles.guideItem}>
                <Text style={styles.guideGenre}>{item.genre}</Text>
                <Text style={styles.guideRange}>{item.range}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    padding: 16,
  },
  waveformContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 100,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 10,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#00D4FF',
    borderRadius: 3,
  },
  bpmDisplayContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bpmLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    letterSpacing: 2,
  },
  bpmCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1a1a2e',
    borderWidth: 4,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  tapCount: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  tapButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4FF',
    marginBottom: 15,
  },
  tapButtonActive: {
    backgroundColor: '#00D4FF',
  },
  tapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginTop: 10,
  },
  tapTextActive: {
    color: '#1a1a2e',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 30,
  },
  resetText: {
    color: '#FF6B6B',
    marginLeft: 8,
    fontSize: 16,
  },
  manualContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  manualControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  adjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  adjustText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  manualBpmDisplay: {
    width: 80,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  manualBpmValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  useButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  guideContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  guideItem: {
    width: '48%',
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  guideGenre: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  guideRange: {
    color: '#00D4FF',
    fontSize: 12,
    marginTop: 4,
  },
});
