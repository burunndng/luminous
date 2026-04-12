import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MOODS = [
  'High Energy',
  'Chill',
  'Progressive',
  'Dark',
  'Uplifting',
  'Groovy',
];

const KEYS = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
];

export default function AIScreen() {
  const [currentKey, setCurrentKey] = useState('');
  const [currentBpm, setCurrentBpm] = useState('');
  const [currentEnergy, setCurrentEnergy] = useState(5);
  const [selectedMood, setSelectedMood] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [showKeyPicker, setShowKeyPicker] = useState(false);

  const getRecommendations = async () => {
    setLoading(true);
    setRecommendations('');
    
    try {
      const response = await axios.post(`${API_URL}/api/ai/recommendations`, {
        current_track_key: currentKey || null,
        current_track_bpm: currentBpm ? parseFloat(currentBpm) : null,
        current_track_energy: currentEnergy,
        mood: selectedMood || null,
        context: context || null,
      });
      
      setRecommendations(response.data.recommendations);
    } catch (error: any) {
      console.error('AI Error:', error);
      setRecommendations(
        'Unable to get recommendations. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setCurrentKey('');
    setCurrentBpm('');
    setCurrentEnergy(5);
    setSelectedMood('');
    setContext('');
    setRecommendations('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={32} color="#00D4FF" />
            </View>
            <Text style={styles.headerTitle}>AI Mix Assistant</Text>
            <Text style={styles.headerSubtitle}>
              Get smart mixing suggestions powered by GLM-5.1
            </Text>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            {/* Key Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Track Key</Text>
              <TouchableOpacity
                style={styles.keySelector}
                onPress={() => setShowKeyPicker(!showKeyPicker)}
              >
                <Text style={[styles.keySelectorText, !currentKey && styles.placeholder]}>
                  {currentKey || 'Select key...'}
                </Text>
                <Ionicons
                  name={showKeyPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              
              {showKeyPicker && (
                <View style={styles.keyPickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.keyRow}>
                      {KEYS.filter((k) => k.includes('A')).map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.keyOption,
                            currentKey === key && styles.keyOptionSelected,
                          ]}
                          onPress={() => {
                            setCurrentKey(key);
                            setShowKeyPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.keyOptionText,
                              currentKey === key && styles.keyOptionTextSelected,
                            ]}
                          >
                            {key}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.keyRow}>
                      {KEYS.filter((k) => k.includes('B')).map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.keyOption,
                            currentKey === key && styles.keyOptionSelected,
                          ]}
                          onPress={() => {
                            setCurrentKey(key);
                            setShowKeyPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.keyOptionText,
                              currentKey === key && styles.keyOptionTextSelected,
                            ]}
                          >
                            {key}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* BPM Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current BPM</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 128"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={currentBpm}
                onChangeText={setCurrentBpm}
              />
            </View>

            {/* Energy Slider */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Energy Level: {currentEnergy}/10</Text>
              <View style={styles.energyContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.energyDot,
                      level <= currentEnergy && styles.energyDotActive,
                    ]}
                    onPress={() => setCurrentEnergy(level)}
                  />
                ))}
              </View>
            </View>

            {/* Mood Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Desired Mood</Text>
              <View style={styles.moodContainer}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodChip,
                      selectedMood === mood && styles.moodChipSelected,
                    ]}
                    onPress={() =>
                      setSelectedMood(selectedMood === mood ? '' : mood)
                    }
                  >
                    <Text
                      style={[
                        styles.moodChipText,
                        selectedMood === mood && styles.moodChipTextSelected,
                      ]}
                    >
                      {mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Context */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Context</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Peak time at a festival, Opening set..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                value={context}
                onChangeText={setContext}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={getRecommendations}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#000" />
                  <Text style={styles.submitButtonText}>
                    Get Recommendations
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
              <Ionicons name="refresh" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Results */}
          {recommendations && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <Ionicons name="bulb" size={24} color="#00D4FF" />
                <Text style={styles.resultsTitle}>AI Recommendations</Text>
              </View>
              <View style={styles.resultsContent}>
                <Text style={styles.resultsText}>{recommendations}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  aiIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#00D4FF',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  inputSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  keySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 15,
  },
  keySelectorText: {
    fontSize: 16,
    color: '#fff',
  },
  placeholder: {
    color: '#666',
  },
  keyPickerContainer: {
    marginTop: 10,
  },
  keyRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  keyOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  keyOptionSelected: {
    backgroundColor: '#00D4FF',
  },
  keyOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  keyOptionTextSelected: {
    color: '#000',
  },
  energyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2d2d44',
  },
  energyDotActive: {
    backgroundColor: '#00D4FF',
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2d2d44',
    marginRight: 10,
    marginBottom: 10,
  },
  moodChipSelected: {
    backgroundColor: '#00D4FF',
  },
  moodChipText: {
    fontSize: 14,
    color: '#fff',
  },
  moodChipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4FF',
    borderRadius: 14,
    padding: 16,
    marginRight: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  clearButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  resultsContent: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 15,
  },
  resultsText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 22,
  },
});
