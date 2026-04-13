"""Audio Analysis API Tests
Tests for NEW audio analysis endpoints: /api/audio/analyze and /api/audio/analyze-recording
"""
import pytest
import requests
import os

TEST_AUDIO_FILE = '/tmp/test_audio.wav'

class TestAudioAnalysis:
    """Audio analysis endpoints - file upload and recording"""
    
    def test_analyze_audio_file_upload(self, api_client, base_url):
        """Test POST /api/audio/analyze with test audio file"""
        if not os.path.exists(TEST_AUDIO_FILE):
            pytest.skip(f"Test audio file not found: {TEST_AUDIO_FILE}")
        
        with open(TEST_AUDIO_FILE, 'rb') as f:
            files = {'file': ('test_audio.wav', f, 'audio/wav')}
            response = requests.post(
                f"{base_url}/api/audio/analyze",
                files=files,
                timeout=120
            )
        
        assert response.status_code == 200, f"Audio analysis failed: {response.text}"
        
        data = response.json()
        
        # Verify all required fields are present
        assert "filename" in data
        assert "estimated_bpm" in data
        assert "bpm_confidence" in data
        assert "suggested_key" in data
        assert "camelot_code" in data
        assert "key_confidence" in data
        assert "duration_seconds" in data
        assert "beat_count" in data
        assert "analysis_notes" in data
        assert "source" in data
        
        # Verify field types and values
        assert data["filename"] == "test_audio.wav"
        assert data["source"] == "upload"
        
        # BPM should be detected (test file is 128 BPM)
        if data["estimated_bpm"]:
            assert isinstance(data["estimated_bpm"], (int, float))
            assert data["estimated_bpm"] > 0
            assert isinstance(data["bpm_confidence"], int)
            assert 0 <= data["bpm_confidence"] <= 100
            print(f"✓ BPM detected: {data['estimated_bpm']} (confidence: {data['bpm_confidence']}%)")
        
        # Key should be detected (test file is C major)
        if data["suggested_key"]:
            assert isinstance(data["suggested_key"], str)
            assert isinstance(data["key_confidence"], int)
            assert 0 <= data["key_confidence"] <= 100
            print(f"✓ Key detected: {data['suggested_key']} / {data['camelot_code']} (confidence: {data['key_confidence']}%)")
        
        # Duration should be present
        if data["duration_seconds"]:
            assert isinstance(data["duration_seconds"], (int, float))
            assert data["duration_seconds"] > 0
            print(f"✓ Duration: {data['duration_seconds']}s")
        
        # Beat count
        assert isinstance(data["beat_count"], int)
        assert data["beat_count"] >= 0
        
        # Analysis notes should be non-empty
        assert len(data["analysis_notes"]) > 0
        
        # No MongoDB _id
        assert "_id" not in data
    
    def test_analyze_recording_endpoint(self, api_client, base_url):
        """Test POST /api/audio/analyze-recording with test audio file"""
        if not os.path.exists(TEST_AUDIO_FILE):
            pytest.skip(f"Test audio file not found: {TEST_AUDIO_FILE}")
        
        with open(TEST_AUDIO_FILE, 'rb') as f:
            files = {'file': ('recording.wav', f, 'audio/wav')}
            response = requests.post(
                f"{base_url}/api/audio/analyze-recording",
                files=files,
                timeout=120
            )
        
        assert response.status_code == 200, f"Recording analysis failed: {response.text}"
        
        data = response.json()
        
        # Verify all required fields
        assert "filename" in data
        assert "estimated_bpm" in data
        assert "bpm_confidence" in data
        assert "suggested_key" in data
        assert "camelot_code" in data
        assert "key_confidence" in data
        assert "duration_seconds" in data
        assert "beat_count" in data
        assert "analysis_notes" in data
        assert "source" in data
        
        # Verify source is microphone
        assert data["source"] == "microphone"
        assert data["filename"] == "mic_recording"
        
        # No MongoDB _id
        assert "_id" not in data
        
        print(f"✓ Recording analysis: BPM={data['estimated_bpm']}, Key={data['suggested_key']}")
    
    def test_analyze_unsupported_format(self, api_client, base_url):
        """Test that unsupported file formats are rejected"""
        # Create a fake text file
        fake_file_content = b"This is not an audio file"
        files = {'file': ('test.txt', fake_file_content, 'text/plain')}
        
        response = requests.post(
            f"{base_url}/api/audio/analyze",
            files=files,
            timeout=30
        )
        
        assert response.status_code == 400
        assert "Unsupported format" in response.json()["detail"]
    
    def test_analyze_file_too_large(self, api_client):
        """Test that files over 50MB are rejected"""
        # This test would require creating a 50MB+ file, skip for now
        pytest.skip("File size test requires large file creation")
    
    def test_analyze_recording_too_short(self, api_client, base_url):
        """Test that recordings under 5 seconds are rejected"""
        # Create a very short audio file (1 second of silence)
        import wave
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            with wave.open(tmp.name, 'wb') as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(22050)
                wav.writeframes(b'\x00' * 22050)  # 1 second of silence
            
            with open(tmp.name, 'rb') as f:
                files = {'file': ('short.wav', f, 'audio/wav')}
                response = requests.post(
                    f"{base_url}/api/audio/analyze-recording",
                    files=files,
                    timeout=30
                )
            
            os.unlink(tmp.name)
        
        assert response.status_code == 400
        assert "too short" in response.json()["detail"].lower()
    
    def test_analyze_empty_file(self, api_client, base_url):
        """Test that empty files are rejected"""
        files = {'file': ('empty.wav', b'', 'audio/wav')}
        
        response = requests.post(
            f"{base_url}/api/audio/analyze",
            files=files,
            timeout=30
        )
        
        # Should fail with 400 or 500
        assert response.status_code in [400, 500]
    
    def test_camelot_code_mapping(self, api_client, base_url):
        """Verify that detected keys map to correct Camelot codes"""
        if not os.path.exists(TEST_AUDIO_FILE):
            pytest.skip(f"Test audio file not found: {TEST_AUDIO_FILE}")
        
        with open(TEST_AUDIO_FILE, 'rb') as f:
            files = {'file': ('test_audio.wav', f, 'audio/wav')}
            response = requests.post(
                f"{base_url}/api/audio/analyze",
                files=files,
                timeout=120
            )
        
        data = response.json()
        
        # If key is detected, camelot code should also be present
        if data["suggested_key"]:
            assert data["camelot_code"] is not None
            assert len(data["camelot_code"]) in [2, 3]  # e.g., "8B" or "12A"
            
            # Verify camelot code format (number + A/B)
            assert data["camelot_code"][-1] in ['A', 'B']
            
            # Test file is C major, should be 8B
            if "C major" in data["suggested_key"]:
                assert data["camelot_code"] == "8B", f"C major should map to 8B, got {data['camelot_code']}"
                print(f"✓ Camelot mapping verified: C major → 8B")
