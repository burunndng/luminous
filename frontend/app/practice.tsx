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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TIP_CATEGORIES = [
  { key: 'all', label: 'All Tips', icon: 'bulb' },
  { key: 'beatmatching', label: 'Beatmatching', icon: 'musical-note' },
  { key: 'harmonic_mixing', label: 'Harmonic', icon: 'musical-notes' },
  { key: 'transitions', label: 'Transitions', icon: 'swap-horizontal' },
  { key: 'energy_management', label: 'Energy', icon: 'flame' },
  { key: 'technical', label: 'Technical', icon: 'settings' },
  { key: 'preparation', label: 'Prep', icon: 'folder' },
  { key: 'psytrance_specific', label: 'Psytrance', icon: 'planet' },
];

export default function PracticeScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [crossfadeCount, setCrossfadeCount] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tips, setTips] = useState<any>({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTips, setShowTips] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    fetchTips();
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      
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
      setRefreshing(false);
    }
  };

  const fetchTips = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tips`);
      setTips(response.data);
    } catch (error) {
      console.error('Error fetching tips:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchTips();
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

  const getFilteredTips = () => {
    if (selectedCategory === 'all') {
      const allTips: any[] = [];
      Object.entries(tips).forEach(([category, categoryTips]: [string, any]) => {
        categoryTips.forEach((tip: any) => {
          allTips.push({ ...tip, main_category: category });
        });
      });
      return allTips;
    }
    return tips[selectedCategory]?.map((tip: any) => ({ ...tip, main_category: selectedCategory })) || [];
  };

  const getCategoryIcon = (category: string) => {
    const cat = TIP_CATEGORIES.find(c => c.key === category);
    return cat?.icon || 'bulb';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      beatmatching: '#FF6B6B',
      harmonic_mixing: '#00D4FF',
      transitions: '#FECA57',
      energy_management: '#FF9F43',
      technical: '#54A0FF',
      preparation: '#1DD1A1',
      psytrance_specific: '#A55EEA',
    };
    return colors[category] || '#00D4FF';
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" />
        }
      >
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

        {/* DJ Tips Section */}
        <View style={styles.tipsSection}>
          <TouchableOpacity 
            style={styles.tipsSectionHeader}
            onPress={() => setShowTips(!showTips)}
          >
            <View style={styles.tipsHeaderLeft}>
              <Ionicons name="school" size={24} color="#00D4FF" />
              <Text style={styles.tipsMainTitle}>Pro DJ Tips</Text>
            </View>
            <Ionicons 
              name={showTips ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {showTips && (
            <>
              {/* Category Filter */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {TIP_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.key && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                  >
                    <Ionicons 
                      name={cat.icon as any} 
                      size={16} 
                      color={selectedCategory === cat.key ? '#000' : '#888'} 
                    />
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === cat.key && styles.categoryChipTextActive,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tips List */}
              <View style={styles.tipsList}>
                {getFilteredTips().slice(0, 6).map((tip: any, index: number) => (
                  <View 
                    key={index} 
                    style={[
                      styles.tipCard,
                      { borderLeftColor: getCategoryColor(tip.main_category) }
                    ]}
                  >
                    <View style={styles.tipHeader}>
                      <View style={[
                        styles.tipCategoryBadge,
                        { backgroundColor: getCategoryColor(tip.main_category) + '30' }
                      ]}>
                        <Ionicons 
                          name={getCategoryIcon(tip.main_category) as any}
                          size={14}
                          color={getCategoryColor(tip.main_category)}
                        />
                        <Text style={[
                          styles.tipCategoryText,
                          { color: getCategoryColor(tip.main_category) }
                        ]}>
                          {tip.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipText}>{tip.tip}</Text>
                    <View style={styles.tipSource}>
                      <Ionicons name="person" size={12} color="#666" />
                      <Text style={styles.tipSourceText}>{tip.source}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

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
            sessions.slice(0, 5).map((session) => (
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
  tipsSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 25,
  },
  tipsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipsMainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  categoryScroll: {
    marginBottom: 15,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#00D4FF',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  tipsList: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tipCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
    textTransform: 'capitalize',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#bbb',
    lineHeight: 20,
    marginBottom: 10,
  },
  tipSource: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipSourceText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 5,
    fontStyle: 'italic',
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
});
