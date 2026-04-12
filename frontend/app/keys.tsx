import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Camelot wheel positions for visualization
const CAMELOT_POSITIONS = [
  { code: '1A', angle: 0, radius: 0.7 },
  { code: '2A', angle: 30, radius: 0.7 },
  { code: '3A', angle: 60, radius: 0.7 },
  { code: '4A', angle: 90, radius: 0.7 },
  { code: '5A', angle: 120, radius: 0.7 },
  { code: '6A', angle: 150, radius: 0.7 },
  { code: '7A', angle: 180, radius: 0.7 },
  { code: '8A', angle: 210, radius: 0.7 },
  { code: '9A', angle: 240, radius: 0.7 },
  { code: '10A', angle: 270, radius: 0.7 },
  { code: '11A', angle: 300, radius: 0.7 },
  { code: '12A', angle: 330, radius: 0.7 },
  { code: '1B', angle: 0, radius: 1 },
  { code: '2B', angle: 30, radius: 1 },
  { code: '3B', angle: 60, radius: 1 },
  { code: '4B', angle: 90, radius: 1 },
  { code: '5B', angle: 120, radius: 1 },
  { code: '6B', angle: 150, radius: 1 },
  { code: '7B', angle: 180, radius: 1 },
  { code: '8B', angle: 210, radius: 1 },
  { code: '9B', angle: 240, radius: 1 },
  { code: '10B', angle: 270, radius: 1 },
  { code: '11B', angle: 300, radius: 1 },
  { code: '12B', angle: 330, radius: 1 },
];

const KEY_COLORS: { [key: string]: string } = {
  '1A': '#FF6B6B', '1B': '#FF8E8E',
  '2A': '#FF9F43', '2B': '#FFB366',
  '3A': '#FECA57', '3B': '#FFD97D',
  '4A': '#48DBFB', '4B': '#7AE7FF',
  '5A': '#00D4FF', '5B': '#4DE3FF',
  '6A': '#54A0FF', '6B': '#82BFFF',
  '7A': '#5F27CD', '7B': '#8854D0',
  '8A': '#A55EEA', '8B': '#C084F5',
  '9A': '#FF6B9D', '9B': '#FF8FB5',
  '10A': '#EE5A24', '10B': '#F79F1F',
  '11A': '#1DD1A1', '11B': '#55E6C1',
  '12A': '#10AC84', '12B': '#3DC2A5',
};

export default function KeysScreen() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [compatibleKeys, setCompatibleKeys] = useState<string[]>([]);
  const [camelotWheel, setCamelotWheel] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    key: '',
    bpm: '',
  });

  useEffect(() => {
    fetchCamelotWheel();
    fetchTracks();
  }, []);

  const fetchCamelotWheel = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/camelot/wheel`);
      setCamelotWheel(response.data);
    } catch (error) {
      console.error('Error fetching Camelot wheel:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tracks`);
      setTracks(response.data);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  const handleKeySelect = async (code: string) => {
    setSelectedKey(code);
    try {
      const response = await axios.get(`${API_URL}/api/camelot/compatible/${code}`);
      setCompatibleKeys(response.data.compatible_codes);
    } catch (error) {
      console.error('Error getting compatible keys:', error);
    }
  };

  const addTrack = async () => {
    if (!newTrack.title || !newTrack.artist) {
      Alert.alert('Error', 'Please enter title and artist');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/tracks`, {
        title: newTrack.title,
        artist: newTrack.artist,
        key: newTrack.key || null,
        bpm: newTrack.bpm ? parseFloat(newTrack.bpm) : null,
      });
      setShowAddTrack(false);
      setNewTrack({ title: '', artist: '', key: '', bpm: '' });
      fetchTracks();
      Alert.alert('Success', 'Track added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add track');
    }
  };

  const getKeyPosition = (code: string, containerSize: number) => {
    const pos = CAMELOT_POSITIONS.find((p) => p.code === code);
    if (!pos) return { x: 0, y: 0 };
    const angleRad = (pos.angle - 90) * (Math.PI / 180);
    const maxRadius = containerSize / 2 - 30;
    const radius = maxRadius * pos.radius;
    return {
      x: containerSize / 2 + radius * Math.cos(angleRad) - 20,
      y: containerSize / 2 + radius * Math.sin(angleRad) - 20,
    };
  };

  const wheelSize = 320;

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
        {/* Camelot Wheel */}
        <View style={styles.wheelSection}>
          <Text style={styles.sectionTitle}>Camelot Wheel</Text>
          <Text style={styles.subtitle}>Tap a key to see compatible mixes</Text>
          
          <View style={[styles.wheelContainer, { width: wheelSize, height: wheelSize }]}>
            {/* Background circles */}
            <View style={[styles.wheelRing, styles.outerRing]} />
            <View style={[styles.wheelRing, styles.innerRing]} />
            
            {/* Key buttons */}
            {CAMELOT_POSITIONS.map((pos) => {
              const position = getKeyPosition(pos.code, wheelSize);
              const isSelected = selectedKey === pos.code;
              const isCompatible = compatibleKeys.includes(pos.code);
              
              return (
                <TouchableOpacity
                  key={pos.code}
                  style={[
                    styles.keyButton,
                    {
                      left: position.x,
                      top: position.y,
                      backgroundColor: isSelected
                        ? '#00D4FF'
                        : isCompatible
                        ? KEY_COLORS[pos.code]
                        : '#2d2d44',
                    },
                  ]}
                  onPress={() => handleKeySelect(pos.code)}
                >
                  <Text
                    style={[
                      styles.keyButtonText,
                      { color: isSelected || isCompatible ? '#000' : '#fff' },
                    ]}
                  >
                    {pos.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Key Info */}
        {selectedKey && camelotWheel[selectedKey] && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View
                style={[
                  styles.keyBadge,
                  { backgroundColor: KEY_COLORS[selectedKey] },
                ]}
              >
                <Text style={styles.keyBadgeText}>{selectedKey}</Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>
                  {camelotWheel[selectedKey].key}
                </Text>
                <Text style={styles.infoSubtitle}>Musical Key</Text>
              </View>
            </View>
            
            <View style={styles.compatibleSection}>
              <Text style={styles.compatibleTitle}>Compatible Keys</Text>
              <View style={styles.compatibleList}>
                {compatibleKeys.map((code) => (
                  <View
                    key={code}
                    style={[
                      styles.compatibleBadge,
                      { backgroundColor: KEY_COLORS[code] },
                    ]}
                  >
                    <Text style={styles.compatibleBadgeText}>
                      {code} ({camelotWheel[code]?.key})
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Mixing Tips</Text>
              <Text style={styles.tipText}>
                • Same key: Perfect energy match
              </Text>
              <Text style={styles.tipText}>
                • +1/-1: Smooth progression
              </Text>
              <Text style={styles.tipText}>
                • A to B: Major/minor switch
              </Text>
            </View>
          </View>
        )}

        {/* Track Library */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <Text style={styles.sectionTitle}>Track Library</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddTrack(true)}
            >
              <Ionicons name="add" size={24} color="#00D4FF" />
            </TouchableOpacity>
          </View>

          {tracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes" size={48} color="#444" />
              <Text style={styles.emptyText}>No tracks yet</Text>
              <Text style={styles.emptySubtext}>Add tracks to see harmonic matches</Text>
            </View>
          ) : (
            tracks.slice(0, 5).map((track) => (
              <View key={track.id} style={styles.trackItem}>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackArtist}>{track.artist}</Text>
                </View>
                <View style={styles.trackMeta}>
                  {track.key && (
                    <View
                      style={[
                        styles.trackKeyBadge,
                        { backgroundColor: KEY_COLORS[track.key] || '#2d2d44' },
                      ]}
                    >
                      <Text style={styles.trackKeyText}>{track.key}</Text>
                    </View>
                  )}
                  {track.bpm && (
                    <Text style={styles.trackBpm}>{track.bpm} BPM</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Track Modal */}
      <Modal visible={showAddTrack} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Track</Text>
              <TouchableOpacity onPress={() => setShowAddTrack(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Track Title"
              placeholderTextColor="#666"
              value={newTrack.title}
              onChangeText={(text) => setNewTrack({ ...newTrack, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Artist"
              placeholderTextColor="#666"
              value={newTrack.artist}
              onChangeText={(text) => setNewTrack({ ...newTrack, artist: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Key (e.g., 8A, Am, C)"
              placeholderTextColor="#666"
              value={newTrack.key}
              onChangeText={(text) => setNewTrack({ ...newTrack, key: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="BPM"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newTrack.bpm}
              onChangeText={(text) => setNewTrack({ ...newTrack, bpm: text })}
            />

            <TouchableOpacity style={styles.submitButton} onPress={addTrack}>
              <Text style={styles.submitButtonText}>Add Track</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  wheelSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wheelContainer: {
    position: 'relative',
  },
  wheelRing: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  outerRing: {
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  innerRing: {
    width: '70%',
    height: '70%',
    top: '15%',
    left: '15%',
  },
  keyButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  keyBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  infoTextContainer: {
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  compatibleSection: {
    marginBottom: 15,
  },
  compatibleTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  compatibleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  compatibleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  compatibleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  tipsSection: {
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    padding: 15,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4FF',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 5,
  },
  librarySection: {
    marginBottom: 20,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
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
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  trackArtist: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackKeyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 10,
  },
  trackKeyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  trackBpm: {
    fontSize: 12,
    color: '#00D4FF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
