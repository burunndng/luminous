"""Backend API tests for DJ Tool App
Tests: Health, Tracks CRUD, Setlists CRUD, Camelot Wheel, AI Recommendations, Practice Sessions, Tips, PDF Export
"""
import pytest
import requests
import time
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestHealth:
    """Health check endpoint"""
    
    def test_health_check(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

class TestTracks:
    """Track CRUD operations"""
    
    def test_create_track_and_verify(self, api_client):
        """Create track and verify persistence"""
        track_data = {
            "title": "TEST_Track_001",
            "artist": "TEST_Artist",
            "bpm": 128.0,
            "key": "8A",
            "energy": 7
        }
        
        # Create
        response = api_client.post(f"{BASE_URL}/api/tracks", json=track_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created["title"] == track_data["title"]
        assert created["artist"] == track_data["artist"]
        assert created["bpm"] == track_data["bpm"]
        assert created["key"] == track_data["key"]
        assert "id" in created
        assert "_id" not in created, "MongoDB _id should be excluded"
        
        track_id = created["id"]
        
        # Verify GET
        get_response = api_client.get(f"{BASE_URL}/api/tracks/{track_id}")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        assert retrieved["title"] == track_data["title"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tracks/{track_id}")
    
    def test_get_all_tracks(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tracks")
        assert response.status_code == 200
        tracks = response.json()
        assert isinstance(tracks, list)
    
    def test_update_track(self, api_client):
        # Create
        track_data = {"title": "TEST_Update", "artist": "TEST_Artist"}
        create_resp = api_client.post(f"{BASE_URL}/api/tracks", json=track_data)
        track_id = create_resp.json()["id"]
        
        # Update
        update_data = {"bpm": 140.0, "key": "5A"}
        update_resp = api_client.put(f"{BASE_URL}/api/tracks/{track_id}", json=update_data)
        assert update_resp.status_code == 200
        
        # Verify
        get_resp = api_client.get(f"{BASE_URL}/api/tracks/{track_id}")
        updated = get_resp.json()
        assert updated["bpm"] == 140.0
        assert updated["key"] == "5A"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tracks/{track_id}")
    
    def test_delete_track(self, api_client):
        # Create
        track_data = {"title": "TEST_Delete", "artist": "TEST_Artist"}
        create_resp = api_client.post(f"{BASE_URL}/api/tracks", json=track_data)
        track_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = api_client.delete(f"{BASE_URL}/api/tracks/{track_id}")
        assert delete_resp.status_code == 200
        
        # Verify deleted
        get_resp = api_client.get(f"{BASE_URL}/api/tracks/{track_id}")
        assert get_resp.status_code == 404

class TestSetlists:
    """Setlist CRUD operations"""
    
    def test_create_setlist_and_verify(self, api_client):
        setlist_data = {
            "name": "TEST_Setlist_001",
            "venue": "TEST_Venue",
            "event_date": "2025-02-01",
            "description": "Test setlist"
        }
        
        # Create
        response = api_client.post(f"{BASE_URL}/api/setlists", json=setlist_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["name"] == setlist_data["name"]
        assert "id" in created
        assert "_id" not in created
        
        setlist_id = created["id"]
        
        # Verify GET
        get_resp = api_client.get(f"{BASE_URL}/api/setlists/{setlist_id}")
        assert get_resp.status_code == 200
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/setlists/{setlist_id}")
    
    def test_get_all_setlists(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/setlists")
        assert response.status_code == 200
        setlists = response.json()
        assert isinstance(setlists, list)
    
    def test_get_setlist_tracks(self, api_client):
        # Create track
        track_resp = api_client.post(f"{BASE_URL}/api/tracks", json={
            "title": "TEST_Track_Setlist",
            "artist": "TEST_Artist"
        })
        track_id = track_resp.json()["id"]
        
        # Create setlist with track
        setlist_resp = api_client.post(f"{BASE_URL}/api/setlists", json={
            "name": "TEST_Setlist_Tracks",
            "track_ids": [track_id]
        })
        setlist_id = setlist_resp.json()["id"]
        
        # Get setlist tracks
        tracks_resp = api_client.get(f"{BASE_URL}/api/setlists/{setlist_id}/tracks")
        assert tracks_resp.status_code == 200
        tracks = tracks_resp.json()
        assert len(tracks) == 1
        assert tracks[0]["id"] == track_id
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/setlists/{setlist_id}")
        api_client.delete(f"{BASE_URL}/api/tracks/{track_id}")

class TestCamelotWheel:
    """Camelot wheel and harmonic mixing"""
    
    def test_get_camelot_wheel(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/camelot/wheel")
        assert response.status_code == 200
        wheel = response.json()
        assert "8A" in wheel
        assert "1B" in wheel
        assert len(wheel) == 24  # 12A + 12B
    
    def test_get_compatible_keys_8A(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/camelot/compatible/8A")
        assert response.status_code == 200
        data = response.json()
        assert data["input_key"] == "8A"
        assert data["camelot_code"] == "8A"
        assert "compatible_codes" in data
        assert "8A" in data["compatible_codes"]
        assert "7A" in data["compatible_codes"]
        assert "9A" in data["compatible_codes"]
        assert "8B" in data["compatible_codes"]
    
    def test_invalid_key(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/camelot/compatible/99Z")
        assert response.status_code == 404

class TestAIRecommendations:
    """AI Mix recommendations using OpenRouter z-ai/glm-5.1"""
    
    def test_ai_recommendations_basic(self, api_client):
        request_data = {
            "current_track_key": "8A",
            "current_track_bpm": 128.0,
            "current_track_energy": 7,
            "mood": "High Energy"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/ai/recommendations",
            json=request_data,
            timeout=30
        )
        
        assert response.status_code == 200, f"AI request failed: {response.text}"
        data = response.json()
        assert "recommendations" in data
        assert "model" in data
        assert data["model"] == "z-ai/glm-5.1"
        assert len(data["recommendations"]) > 0
    
    def test_ai_recommendations_minimal(self, api_client):
        """Test with minimal input"""
        request_data = {"current_track_bpm": 140.0}
        
        response = api_client.post(
            f"{BASE_URL}/api/ai/recommendations",
            json=request_data,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data

class TestPracticeSessions:
    """Practice session tracking"""
    
    def test_create_practice_session(self, api_client):
        session_data = {
            "duration_seconds": 300,
            "crossfade_count": 15,
            "notes": "TEST_Session"
        }
        
        response = api_client.post(f"{BASE_URL}/api/practice", json=session_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["duration_seconds"] == 300
        assert created["crossfade_count"] == 15
        assert "id" in created
        assert "_id" not in created
    
    def test_get_practice_sessions(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/practice")
        assert response.status_code == 200
        sessions = response.json()
        assert isinstance(sessions, list)
    
    def test_get_practice_stats(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/practice/stats")
        assert response.status_code == 200
        stats = response.json()
        assert "total_sessions" in stats
        assert "total_practice_time" in stats
        assert "total_crossfades" in stats
        assert "average_session_duration" in stats

class TestDJTips:
    """DJ Tips endpoints"""
    
    def test_get_all_tips(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tips")
        assert response.status_code == 200
        tips = response.json()
        assert "beatmatching" in tips
        assert "harmonic_mixing" in tips
        assert "psytrance_specific" in tips
        assert len(tips["psytrance_specific"]) > 0
    
    def test_get_psytrance_tips(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tips/psytrance_specific")
        assert response.status_code == 200
        data = response.json()
        assert "psytrance_specific" in data
        tips = data["psytrance_specific"]
        assert len(tips) >= 4  # Should have at least 4 psytrance tips
    
    def test_get_tips_by_category(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tips/beatmatching")
        assert response.status_code == 200
        data = response.json()
        assert "beatmatching" in data
    
    def test_invalid_category(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tips/invalid_category")
        assert response.status_code == 404

class TestPDFExport:
    """PDF export functionality"""
    
    def test_export_setlist_to_pdf(self, api_client):
        # Create track
        track_resp = api_client.post(f"{BASE_URL}/api/tracks", json={
            "title": "TEST_PDF_Track",
            "artist": "TEST_Artist",
            "bpm": 128.0,
            "key": "8A"
        })
        track_id = track_resp.json()["id"]
        
        # Create setlist
        setlist_resp = api_client.post(f"{BASE_URL}/api/setlists", json={
            "name": "TEST_PDF_Setlist",
            "venue": "Test Venue",
            "track_ids": [track_id]
        })
        setlist_id = setlist_resp.json()["id"]
        
        # Export to PDF
        pdf_resp = api_client.get(f"{BASE_URL}/api/setlists/{setlist_id}/export/pdf")
        assert pdf_resp.status_code == 200, f"PDF export failed: {pdf_resp.text}"
        assert pdf_resp.headers["Content-Type"] == "application/pdf"
        assert len(pdf_resp.content) > 0
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/setlists/{setlist_id}")
        api_client.delete(f"{BASE_URL}/api/tracks/{track_id}")
    
    def test_export_nonexistent_setlist(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/setlists/nonexistent-id/export/pdf")
        assert response.status_code == 404
