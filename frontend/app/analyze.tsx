import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const KEY_COLORS: { [key: string]: string } = {
  '1A': '#FF6B6B', '1B': '#FF8E8E', '2A': '#FF9F43', '2B': '#FFB366',
  '3A': '#FECA57', '3B': '#FFD97D', '4A': '#48DBFB', '4B': '#7AE7FF',
  '5A': '#00D4FF', '5B': '#4DE3FF', '6A': '#54A0FF', '6B': '#82BFFF',
  '7A': '#5F27CD', '7B': '#8854D0', '8A': '#A55EEA', '8B': '#C084F5',
  '9A': '#FF6B9D', '9B': '#FF8FB5', '10A': '#EE5A24', '10B': '#F79F1F',
  '11A': '#1DD1A1', '11B': '#55E6C1', '12A': '#10AC84', '12B': '#3DC2A5',
};

type AnalysisResult = {
  filename: string;
  estimated_bpm: number | null;
  bpm_confidence: number;
  suggested_key: string | null;
  camelot_code: string | null;
  key_confidence: number;
  duration_seconds: number | null;
  beat_count: number;
  analysis_notes: string;
  source: string;
};

export default function AnalyzeScreen() {
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savingTrack, setSavingTrack] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while recording
  const startPulse = () => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // ===== FILE UPLOAD =====
  const pickAndAnalyzeFile = async () => {
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (docResult.canceled) return;

      const file = docResult.assets[0];
      setAnalyzing(true);
      setResult(null);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'audio/mpeg',
      } as any);

      const response = await axios.post(
        `${API_URL}/api/audio/analyze`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
      );
      setResult(response.data);
    } catch (error: any) {
      console.error('Upload analysis error:', error);
      Alert.alert('Analysis Failed', error?.response?.data?.detail || 'Could not analyze file. Try a different format.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ===== MICROPHONE RECORDING =====
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to analyze audio being played.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = rec;
      setRecording(true);
      setRecordingTime(0);
      setResult(null);
      startPulse();

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording. Please check permissions.');
    }
  };

  const stopAndAnalyze = async () => {
    setRecording(false);
    stopPulse();
    if (timerRef.current) clearInterval(timerRef.current);

    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'No recording URI available');
        return;
      }

      setAnalyzing(true);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      const response = await axios.post(
        `${API_URL}/api/audio/analyze-recording`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
      );
      setResult(response.data);
    } catch (error: any) {
      console.error('Recording analysis error:', error);
      Alert.alert('Analysis Failed', error?.response?.data?.detail || 'Could not analyze recording. Try recording longer.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ===== SAVE AS TRACK =====
  const saveAsTrack = async () => {
    if (!result) return;
    setSavingTrack(true);
    try {
      const trackName = result.filename === 'mic_recording'
        ? `Recording ${new Date().toLocaleTimeString()}`
        : result.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

      await axios.post(`${API_URL}/api/tracks`, {
        title: trackName,
        artist: result.source === 'microphone' ? 'Recorded Audio' : 'Imported',
        bpm: result.estimated_bpm,
        key: result.camelot_code || null,
        energy: null,
        notes: result.analysis_notes,
      });
      Alert.alert('Saved', 'Track added to your library!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save track');
    } finally {
      setSavingTrack(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return '#1DD1A1';
    if (conf >= 50) return '#FECA57';
    return '#FF6B6B';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="waveform" size={32} color="#00D4FF" />
          <Text style={styles.headerTitle}>Audio Analyzer</Text>
          <Text style={styles.headerSub}>
            BPM + key detection powered by librosa
          </Text>
        </View>

        {/* Two Analysis Methods */}
        <View style={styles.methodsRow}>
          {/* Upload File */}
          <TouchableOpacity
            testID="upload-file-btn"
            style={styles.methodCard}
            onPress={pickAndAnalyzeFile}
            disabled={analyzing || recording}
          >
            <View style={styles.methodIconWrap}>
              <MaterialCommunityIcons name="file-music" size={36} color="#00D4FF" />
            </View>
            <Text style={styles.methodTitle}>Upload File</Text>
            <Text style={styles.methodDesc}>MP3, FLAC, WAV, M4A, OGG</Text>
          </TouchableOpacity>

          {/* Mic Listen */}
          <TouchableOpacity
            testID="mic-record-btn"
            style={[styles.methodCard, recording && styles.methodCardActive]}
            onPress={recording ? stopAndAnalyze : startRecording}
            disabled={analyzing}
          >
            <Animated.View
              style={[
                styles.methodIconWrap,
                recording && styles.methodIconRecording,
                { transform: [{ scale: recording ? pulseAnim : 1 }] },
              ]}
            >
              <MaterialCommunityIcons
                name={recording ? 'stop' : 'microphone'}
                size={36}
                color={recording ? '#FF6B6B' : '#00D4FF'}
              />
            </Animated.View>
            <Text style={styles.methodTitle}>
              {recording ? 'Tap to Stop' : 'Listen Live'}
            </Text>
            <Text style={styles.methodDesc}>
              {recording
                ? formatTime(recordingTime)
                : 'Record what\'s playing'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recording Indicator */}
        {recording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              Recording... {formatTime(recordingTime)} — Record 15s+ for best results
            </Text>
          </View>
        )}

        {/* Analyzing Spinner */}
        {analyzing && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text style={styles.analyzingText}>Analyzing audio...</Text>
            <Text style={styles.analyzingSub}>
              Detecting BPM and musical key
            </Text>
          </View>
        )}

        {/* Results */}
        {result && !analyzing && (
          <View style={styles.resultSection}>
            {/* Source badge */}
            <View style={styles.sourceBadge}>
              <MaterialCommunityIcons
                name={result.source === 'microphone' ? 'microphone' : 'file-music'}
                size={16}
                color="#00D4FF"
              />
              <Text style={styles.sourceText}>
                {result.source === 'microphone' ? 'Mic Recording' : result.filename}
              </Text>
              {result.duration_seconds && (
                <Text style={styles.durationText}>
                  {result.duration_seconds > 60
                    ? `${(result.duration_seconds / 60).toFixed(1)} min`
                    : `${result.duration_seconds}s`}
                </Text>
              )}
            </View>

            {/* BPM Result */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons name="metronome" size={24} color="#00D4FF" />
                <Text style={styles.resultLabel}>BPM</Text>
              </View>
              {result.estimated_bpm ? (
                <View style={styles.resultBody}>
                  <Text style={styles.bpmValue}>{result.estimated_bpm}</Text>
                  <View style={styles.confidenceRow}>
                    <View
                      style={[
                        styles.confidenceBar,
                        { width: `${result.bpm_confidence}%`, backgroundColor: getConfidenceColor(result.bpm_confidence) },
                      ]}
                    />
                  </View>
                  <Text style={[styles.confidenceText, { color: getConfidenceColor(result.bpm_confidence) }]}>
                    {result.bpm_confidence}% confidence
                  </Text>
                  {result.beat_count > 0 && (
                    <Text style={styles.beatCount}>
                      {result.beat_count} beats detected
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noResult}>Could not detect BPM</Text>
              )}
            </View>

            {/* Key Result */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons name="music-circle" size={24} color="#00D4FF" />
                <Text style={styles.resultLabel}>Musical Key</Text>
              </View>
              {result.suggested_key ? (
                <View style={styles.resultBody}>
                  <View style={styles.keyRow}>
                    <Text style={styles.keyValue}>{result.suggested_key}</Text>
                    {result.camelot_code && (
                      <View
                        style={[
                          styles.camelotBadge,
                          { backgroundColor: KEY_COLORS[result.camelot_code] || '#2d2d44' },
                        ]}
                      >
                        <Text style={styles.camelotText}>{result.camelot_code}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.confidenceRow}>
                    <View
                      style={[
                        styles.confidenceBar,
                        { width: `${result.key_confidence}%`, backgroundColor: getConfidenceColor(result.key_confidence) },
                      ]}
                    />
                  </View>
                  <Text style={[styles.confidenceText, { color: getConfidenceColor(result.key_confidence) }]}>
                    {result.key_confidence}% confidence
                  </Text>
                </View>
              ) : (
                <Text style={styles.noResult}>Could not detect key</Text>
              )}
            </View>

            {/* Save button */}
            <TouchableOpacity
              testID="save-track-btn"
              style={styles.saveButton}
              onPress={saveAsTrack}
              disabled={savingTrack}
            >
              {savingTrack ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Ionicons name="add-circle" size={22} color="#000" />
                  <Text style={styles.saveButtonText}>Save to Library</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Analysis Notes */}
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Analysis Details</Text>
              <Text style={styles.notesText}>{result.analysis_notes}</Text>
            </View>
          </View>
        )}

        {/* Tips when no result */}
        {!result && !analyzing && !recording && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Tips for Best Results</Text>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="file-music" size={20} color="#00D4FF" />
              <Text style={styles.tipText}>
                Upload: MP3/FLAC/WAV files work best. Longer tracks = better accuracy.
              </Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="microphone" size={20} color="#00D4FF" />
              <Text style={styles.tipText}>
                Mic: Hold phone near speaker. Record 15-30 seconds of the track.
              </Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="volume-high" size={20} color="#00D4FF" />
              <Text style={styles.tipText}>
                Use clear audio with minimal background noise for accurate key detection.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14' },
  scrollContent: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 28 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 10 },
  headerSub: { fontSize: 13, color: '#555', marginTop: 4 },
  methodsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  methodCard: {
    width: '48%', backgroundColor: '#111122', borderRadius: 18,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a2e',
  },
  methodCardActive: { borderColor: '#FF6B6B', backgroundColor: '#1a0a0a' },
  methodIconWrap: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  methodIconRecording: { backgroundColor: '#2a0a0a' },
  methodTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  methodDesc: { fontSize: 11, color: '#666', textAlign: 'center' },
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0a0a',
    borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FF6B6B',
  },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B6B', marginRight: 10,
  },
  recordingText: { fontSize: 13, color: '#FF6B6B', flex: 1 },
  analyzingBox: {
    alignItems: 'center', padding: 40, backgroundColor: '#111122',
    borderRadius: 18, marginBottom: 20,
  },
  analyzingText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16 },
  analyzingSub: { color: '#555', fontSize: 12, marginTop: 6 },
  resultSection: { marginBottom: 20 },
  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111122',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  sourceText: { color: '#ccc', fontSize: 13, marginLeft: 10, flex: 1 },
  durationText: { color: '#00D4FF', fontSize: 12, fontWeight: '600' },
  resultCard: {
    backgroundColor: '#111122', borderRadius: 18, padding: 20, marginBottom: 14,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  resultLabel: { fontSize: 14, color: '#888', fontWeight: '600', marginLeft: 10 },
  resultBody: { alignItems: 'center' },
  bpmValue: { fontSize: 56, fontWeight: '800', color: '#00D4FF' },
  keyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  keyValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginRight: 14 },
  camelotBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  camelotText: { fontSize: 16, fontWeight: '800', color: '#000' },
  confidenceRow: {
    width: '100%', height: 6, backgroundColor: '#1a1a2e', borderRadius: 3,
    marginTop: 10, overflow: 'hidden',
  },
  confidenceBar: { height: 6, borderRadius: 3 },
  confidenceText: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  beatCount: { fontSize: 11, color: '#555', marginTop: 4 },
  noResult: { color: '#666', fontSize: 14, fontStyle: 'italic' },
  saveButton: {
    backgroundColor: '#00D4FF', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 14,
  },
  saveButtonContent: { flexDirection: 'row', alignItems: 'center' },
  saveButtonText: { color: '#000', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  notesBox: {
    backgroundColor: '#111122', borderRadius: 14, padding: 16,
  },
  notesLabel: { fontSize: 12, color: '#555', marginBottom: 8, fontWeight: '600' },
  notesText: { fontSize: 12, color: '#888', lineHeight: 18 },
  tipsBox: {
    backgroundColor: '#111122', borderRadius: 18, padding: 20,
  },
  tipsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 },
  tipItem: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14,
  },
  tipText: { fontSize: 13, color: '#888', marginLeft: 12, flex: 1, lineHeight: 20 },
});
