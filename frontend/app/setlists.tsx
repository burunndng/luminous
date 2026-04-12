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

export default function SetlistsScreen() {
  const [setlists, setSetlists] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSetlist, setSelectedSetlist] = useState<any>(null);
  const [setlistTracks, setSetlistTracks] = useState<any[]>([]);
  const [newSetlist, setNewSetlist] = useState({
    name: '',
    venue: '',
    event_date: '',
    description: '',
  });
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [setlistsRes, tracksRes] = await Promise.all([
        axios.get(`${API_URL}/api/setlists`),
        axios.get(`${API_URL}/api/tracks`),
      ]);
      setSetlists(setlistsRes.data);
      setTracks(tracksRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSetlist = async () => {
    if (!newSetlist.name) {
      Alert.alert('Error', 'Please enter a setlist name');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/setlists`, {
        name: newSetlist.name,
        venue: newSetlist.venue || null,
        event_date: newSetlist.event_date || null,
        description: newSetlist.description || null,
      });
      setShowCreateModal(false);
      setNewSetlist({ name: '', venue: '', event_date: '', description: '' });
      fetchData();
      Alert.alert('Success', 'Setlist created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create setlist');
    }
  };

  const openSetlistDetail = async (setlist: any) => {
    setSelectedSetlist(setlist);
    try {
      const response = await axios.get(`${API_URL}/api/setlists/${setlist.id}/tracks`);
      setSetlistTracks(response.data);
    } catch (error) {
      setSetlistTracks([]);
    }
    setShowDetailModal(true);
  };

  const deleteSetlist = async (id: string) => {
    Alert.alert(
      'Delete Setlist',
      'Are you sure you want to delete this setlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/setlists/${id}`);
              setShowDetailModal(false);
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete setlist');
            }
          },
        },
      ]
    );
  };

  const addTrackToSetlist = async (trackId: string) => {
    if (!selectedSetlist) return;
    try {
      const newTrackIds = [...(selectedSetlist.track_ids || []), trackId];
      await axios.put(`${API_URL}/api/setlists/${selectedSetlist.id}`, {
        track_ids: newTrackIds,
      });
      setSelectedSetlist({ ...selectedSetlist, track_ids: newTrackIds });
      const response = await axios.get(`${API_URL}/api/setlists/${selectedSetlist.id}/tracks`);
      setSetlistTracks(response.data);
      setShowAddTrackModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add track');
    }
  };

  const removeTrackFromSetlist = async (trackId: string) => {
    if (!selectedSetlist) return;
    try {
      const newTrackIds = (selectedSetlist.track_ids || []).filter(
        (id: string) => id !== trackId
      );
      await axios.put(`${API_URL}/api/setlists/${selectedSetlist.id}`, {
        track_ids: newTrackIds,
      });
      setSelectedSetlist({ ...selectedSetlist, track_ids: newTrackIds });
      setSetlistTracks(setlistTracks.filter((t) => t.id !== trackId));
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove track');
    }
  };

  const getAvailableTracks = () => {
    const usedIds = selectedSetlist?.track_ids || [];
    return tracks.filter((t) => !usedIds.includes(t.id));
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Your Setlists</Text>
            <Text style={styles.headerSubtitle}>
              {setlists.length} setlist{setlists.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Setlists Grid */}
        {setlists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="albums" size={64} color="#333" />
            <Text style={styles.emptyTitle}>No Setlists Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first setlist for your next gig
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.emptyButtonText}>Create Setlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.setlistGrid}>
            {setlists.map((setlist) => (
              <TouchableOpacity
                key={setlist.id}
                style={styles.setlistCard}
                onPress={() => openSetlistDetail(setlist)}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="musical-notes" size={32} color="#00D4FF" />
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {setlist.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {setlist.track_ids?.length || 0} tracks
                </Text>
                {setlist.venue && (
                  <View style={styles.cardVenue}>
                    <Ionicons name="location" size={12} color="#666" />
                    <Text style={styles.cardVenueText} numberOfLines={1}>
                      {setlist.venue}
                    </Text>
                  </View>
                )}
                {setlist.event_date && (
                  <View style={styles.cardDate}>
                    <Ionicons name="calendar" size={12} color="#666" />
                    <Text style={styles.cardDateText}>{setlist.event_date}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Library Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{tracks.length}</Text>
              <Text style={styles.statLabel}>Total Tracks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{setlists.length}</Text>
              <Text style={styles.statLabel}>Setlists</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {tracks.filter((t) => t.key).length}
              </Text>
              <Text style={styles.statLabel}>With Keys</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Create Setlist Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Setlist</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Setlist Name *"
              placeholderTextColor="#666"
              value={newSetlist.name}
              onChangeText={(text) =>
                setNewSetlist({ ...newSetlist, name: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Venue"
              placeholderTextColor="#666"
              value={newSetlist.venue}
              onChangeText={(text) =>
                setNewSetlist({ ...newSetlist, venue: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Event Date (e.g., July 15, 2025)"
              placeholderTextColor="#666"
              value={newSetlist.event_date}
              onChangeText={(text) =>
                setNewSetlist({ ...newSetlist, event_date: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              value={newSetlist.description}
              onChangeText={(text) =>
                setNewSetlist({ ...newSetlist, description: text })
              }
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={createSetlist}
            >
              <Text style={styles.submitButtonText}>Create Setlist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Setlist Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailModal]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSetlist?.name}</Text>
                {selectedSetlist?.venue && (
                  <Text style={styles.modalSubtitle}>
                    {selectedSetlist.venue}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tracksList}>
              {setlistTracks.length === 0 ? (
                <View style={styles.emptyTracks}>
                  <Text style={styles.emptyTracksText}>
                    No tracks in this setlist
                  </Text>
                </View>
              ) : (
                setlistTracks.map((track, index) => (
                  <View key={track.id} style={styles.trackItem}>
                    <Text style={styles.trackNumber}>{index + 1}</Text>
                    <View style={styles.trackDetails}>
                      <Text style={styles.trackTitle}>{track.title}</Text>
                      <Text style={styles.trackArtist}>{track.artist}</Text>
                    </View>
                    <View style={styles.trackMeta}>
                      {track.key && (
                        <Text style={styles.trackKey}>{track.key}</Text>
                      )}
                      {track.bpm && (
                        <Text style={styles.trackBpm}>{track.bpm}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeTrackFromSetlist(track.id)}
                    >
                      <Ionicons name="remove-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.addTrackButton}
                onPress={() => setShowAddTrackModal(true)}
              >
                <Ionicons name="add" size={20} color="#000" />
                <Text style={styles.addTrackText}>Add Track</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteSetlist(selectedSetlist?.id)}
              >
                <Ionicons name="trash" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Track to Setlist Modal */}
      <Modal visible={showAddTrackModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Track</Text>
              <TouchableOpacity onPress={() => setShowAddTrackModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tracksList}>
              {getAvailableTracks().length === 0 ? (
                <View style={styles.emptyTracks}>
                  <Text style={styles.emptyTracksText}>
                    No available tracks. Add tracks in the Keys tab.
                  </Text>
                </View>
              ) : (
                getAvailableTracks().map((track) => (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.trackItem}
                    onPress={() => addTrackToSetlist(track.id)}
                  >
                    <View style={styles.trackDetails}>
                      <Text style={styles.trackTitle}>{track.title}</Text>
                      <Text style={styles.trackArtist}>{track.artist}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#00D4FF" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  createButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D4FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  emptyButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  setlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  setlistCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#00D4FF',
    marginBottom: 8,
  },
  cardVenue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardVenueText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  cardDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDateText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  statsSection: {
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
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
  detailModal: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  tracksList: {
    maxHeight: 400,
  },
  emptyTracks: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTracksText: {
    color: '#666',
    textAlign: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  trackNumber: {
    width: 30,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  trackArtist: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  trackMeta: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  trackKey: {
    fontSize: 12,
    color: '#00D4FF',
    fontWeight: '600',
  },
  trackBpm: {
    fontSize: 11,
    color: '#666',
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  addTrackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
  },
  addTrackText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deleteButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
