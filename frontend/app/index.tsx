import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BPMScreen() {
  const [bpm, setBpm] = useState<number>(0);
  const [taps, setTaps] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [manualBpm, setManualBpm] = useState(120);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

  // Pulse animation based on BPM
  useEffect(() => {
    if (bpm > 0) {
      const interval = 60000 / bpm;
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
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

  // Glow animation
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    setIsActive(true);

    if (Platform.OS !== 'web') {
      try {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    setTaps(prev => {
      const newTaps = [...prev, now].slice(-8);
      if (newTaps.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < newTaps.length; i++) {
          intervals.push(newTaps[i] - newTaps[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const calculatedBpm = Math.round(60000 / avgInterval);
        setBpm(Math.min(Math.max(calculatedBpm, 20), 300));
      }
      return newTaps;
    });
  }, []);

  const resetBpm = () => {
    setTaps([]);
    setBpm(0);
    setIsActive(false);
  };

  const adjustManualBpm = (delta: number) => {
    setManualBpm((prev) => Math.min(Math.max(prev + delta, 20), 300));
  };

  // Memoized waveform bars
  const waveformBars = useRef(
    Array.from({ length: 30 }, () => Math.random() * 60 + 20)
  ).current;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Waveform Visualization */}
        <View style={styles.waveformContainer}>
          <Text style={styles.sectionLabel}>WAVEFORM</Text>
          <View style={styles.waveform}>
            {waveformBars.map((height, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: bpm > 0 ? height : 16,
                    opacity: glowAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.4, 1, 0.4],
                    }),
                  },
                ]}
              />
            ))}
          </View>
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
          testID="tap-tempo-btn"
          style={[styles.tapButton, isActive && styles.tapButtonActive]}
          onPress={handleTap}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="gesture-tap"
            size={48}
            color={isActive ? '#0d0d1a' : '#00D4FF'}
          />
          <Text style={[styles.tapText, isActive && styles.tapTextActive]}>
            TAP TEMPO
          </Text>
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity testID="reset-bpm-btn" style={styles.resetButton} onPress={resetBpm}>
          <Ionicons name="refresh" size={18} color="#FF6B6B" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        {/* Manual BPM Adjuster */}
        <View style={styles.manualContainer}>
          <Text style={styles.sectionLabel}>MANUAL BPM</Text>
          <View style={styles.manualControls}>
            <TouchableOpacity style={styles.adjustButton} onPress={() => adjustManualBpm(-5)}>
              <Text style={styles.adjustText}>-5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} onPress={() => adjustManualBpm(-1)}>
              <Text style={styles.adjustText}>-1</Text>
            </TouchableOpacity>
            <View style={styles.manualBpmDisplay}>
              <Text style={styles.manualBpmValue}>{manualBpm}</Text>
            </View>
            <TouchableOpacity style={styles.adjustButton} onPress={() => adjustManualBpm(1)}>
              <Text style={styles.adjustText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} onPress={() => adjustManualBpm(5)}>
              <Text style={styles.adjustText}>+5</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            testID="use-manual-bpm-btn"
            style={styles.useButton}
            onPress={() => setBpm(manualBpm)}
          >
            <Text style={styles.useButtonText}>Use This BPM</Text>
          </TouchableOpacity>
        </View>

        {/* BPM Guide */}
        <View style={styles.guideContainer}>
          <Text style={styles.sectionLabel}>BPM REFERENCE</Text>
          <View style={styles.guideGrid}>
            {[
              { genre: 'Hip-Hop', range: '85-115', color: '#FF6B6B' },
              { genre: 'House', range: '120-130', color: '#00D4FF' },
              { genre: 'Techno', range: '130-150', color: '#A55EEA' },
              { genre: 'Drum & Bass', range: '160-180', color: '#FF9F43' },
              { genre: 'Dubstep', range: '140-150', color: '#54A0FF' },
              { genre: 'Psytrance', range: '140-150', color: '#1DD1A1' },
            ].map((item, index) => (
              <View key={index} style={styles.guideItem}>
                <View style={[styles.guideAccent, { backgroundColor: item.color }]} />
                <View style={styles.guideContent}>
                  <Text style={styles.guideGenre}>{item.genre}</Text>
                  <Text style={[styles.guideRange, { color: item.color }]}>{item.range}</Text>
                </View>
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
    backgroundColor: '#0a0a14',
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#555',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
  },
  waveformContainer: {
    marginBottom: 24,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 100,
    backgroundColor: '#111122',
    borderRadius: 14,
    padding: 12,
  },
  waveBar: {
    width: 5,
    backgroundColor: '#00D4FF',
    borderRadius: 3,
  },
  bpmDisplayContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  bpmLabel: {
    fontSize: 11,
    color: '#555',
    marginBottom: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  bpmCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#111122',
    borderWidth: 3,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#00D4FF',
  },
  tapCount: {
    marginTop: 10,
    fontSize: 13,
    color: '#555',
  },
  tapButton: {
    backgroundColor: '#111122',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4FF',
    marginBottom: 12,
  },
  tapButtonActive: {
    backgroundColor: '#00D4FF',
  },
  tapText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#00D4FF',
    marginTop: 8,
    letterSpacing: 2,
  },
  tapTextActive: {
    color: '#0d0d1a',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 28,
  },
  resetText: {
    color: '#FF6B6B',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  manualContainer: {
    backgroundColor: '#111122',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  manualControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  adjustButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  adjustText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  manualBpmDisplay: {
    width: 90,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  manualBpmValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  useButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#0d0d1a',
    fontWeight: '800',
    fontSize: 15,
  },
  guideContainer: {
    backgroundColor: '#111122',
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
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  guideAccent: {
    width: 4,
  },
  guideContent: {
    padding: 12,
  },
  guideGenre: {
    color: '#ddd',
    fontSize: 13,
    fontWeight: '600',
  },
  guideRange: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '700',
  },
});
