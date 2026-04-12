import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PracticeScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [crossfadeCount, setCrossfadeCount] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      
      // Start crossfader animation
      const crossfade = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      crossfade.start();
      
      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      fadeAnim.stopAnimation();
      pulseAnim.stopAnimation();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const fetchData = async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/practice`),
        axios.get(`${API_URL}/api/practice/stats`),
      ]);
      setSessions(sessionsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching practice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startSession = () => {
    setIsRunning(true);
    setElapsedTime(0);
    setCrossfadeCount(0);
  };

  const recordCrossfade = () => {
    setCrossfadeCount((prev) => prev + 1);
  };

  const endSession = async () => {
    setIsRunning(false);
    
    if (elapsedTime > 10) {
      try {
        await axios.post(`${API_URL}/api/practice`, {
          duration_seconds: elapsedTime,
          crossfade_count: crossfadeCount,
          notes: null,
        });
        fetchData();
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timer Display */}
        <Animated.View
          style={[
            styles.timerContainer,
            { transform: [{ scale: isRunning ? pulseAnim : 1 }] },
          ]}
        >
          <View style={styles.timerRing}>
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.timerLabel}>
              {isRunning ? 'Session Active' : 'Ready to Practice'}
            </Text>
          </View>
        </Animated.View>

        {/* Crossfader Visualization */}
        <View style={styles.crossfaderSection}>
          <Text style={styles.sectionTitle}>Crossfader Practice</Text>
          <View style={styles.crossfaderTrack}>
            <View style={styles.deckLabel}>
              <Text style={styles.deckText}>A</Text>
            </View>
            <View style={styles.crossfaderBg}>
              <Animated.View
                style={[
                  styles.crossfaderKnob,
                  {
                    transform: [
                      {
                        translateX: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-60, 60],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <View style={styles.deckLabel}>
              <Text style={styles.deckText}>B</Text>
            </View>
          </View>
          
          <View style={styles.crossfadeCountContainer}>
            <Text style={styles.crossfadeLabel}>Crossfades</Text>
            <Text style={styles.crossfadeCount}>{crossfadeCount}</Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {!isRunning ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startSession}
            >
              <Ionicons name="play" size={32} color="#000" />
              <Text style={styles.startButtonText}>Start Session</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.crossfadeButton}
                onPress={recordCrossfade}
              >
                <Ionicons name="swap-horizontal" size={28} color="#fff" />
                <Text style={styles.crossfadeButtonText}>Record Crossfade</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.stopButton}
                onPress={endSession}
              >
                <Ionicons name="stop" size={24} color="#FF6B6B" />
                <Text style={styles.stopButtonText}>End Session</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#00D4FF" />
                <Text style={styles.statValue}>
                  {formatDuration(stats.total_practice_time)}
                </Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="swap-horizontal" size={24} color="#FF6B9D" />
                <Text style={styles.statValue}>{stats.total_crossfades}</Text>
                <Text style={styles.statLabel}>Crossfades</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={24} color="#FECA57" />
                <Text style={styles.statValue}>{stats.total_sessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="analytics" size={24} color="#54A0FF" />
                <Text style={styles.statValue}>
                  {formatDuration(Math.round(stats.average_session_duration))}
                </Text>
                <Text style={styles.statLabel}>Avg Duration</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Sessions */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="fitness" size={48} color="#333" />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={styles.emptySubtext}>
                Start practicing to track your progress
              </Text>
            </View>
          ) : (
            sessions.slice(0, 5).map((session, index) => (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="musical-notes" size={20} color="#00D4FF" />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDuration}>
                    {formatDuration(session.duration_seconds)}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.sessionStats}>
                  <Text style={styles.sessionCrossfades}>
                    {session.crossfade_count}
                  </Text>
                  <Text style={styles.sessionCrossfadesLabel}>crossfades</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Practice Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color="#FECA57" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Smooth Transitions</Text>
              <Text style={styles.tipText}>
                Practice matching the beat of both tracks before moving the crossfader. 
                Start with tracks that have similar BPMs.
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="ear" size={24} color="#54A0FF" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Listen to the Phrase</Text>
              <Text style={styles.tipText}>
                Start your transitions at the beginning of a phrase (usually every 16 or 32 beats) 
                for more natural-sounding mixes.
              </Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1a1a2e',
    borderWidth: 4,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  crossfaderSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 15,
  },
  crossfaderTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  deckLabel: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  crossfaderBg: {
    flex: 1,
    height: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 6,
    marginHorizontal: 15,
    justifyContent: 'center',
  },
  crossfaderKnob: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00D4FF',
    alignSelf: 'center',
  },
  crossfadeCountContainer: {
    alignItems: 'center',
  },
  crossfadeLabel: {
    fontSize: 12,
    color: '#666',
  },
  crossfadeCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  controls: {
    marginBottom: 30,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4FF',
    borderRadius: 16,
    padding: 20,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  crossfadeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00D4FF',
    marginBottom: 15,
  },
  crossfadeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  stopButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginLeft: 8,
  },
  statsSection: {
    marginBottom: 25,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  historySection: {
    marginBottom: 25,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#444',
    marginTop: 5,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sessionDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sessionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  sessionCrossfades: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  sessionCrossfadesLabel: {
    fontSize: 10,
    color: '#666',
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
});
