# DJ Toolkit - Product Requirements Document

## Overview
A comprehensive mobile tool app for DJs featuring BPM detection, harmonic mixing guidance, setlist management, AI-powered mixing recommendations, and practice tools.

## Features

### 1. BPM Detector & Tap Tempo
- Interactive tap tempo with real-time BPM calculation (keeps last 8 taps)
- Animated pulse visualization synced to detected BPM
- Manual BPM adjuster with ±1 and ±5 buttons
- Audio waveform visualization
- BPM reference guide for genres: Hip-Hop, House, Techno, D&B, Dubstep, Psytrance

### 2. Key Finder & Harmonic Mixing
- Interactive Camelot Wheel with 24 keys (12A-12B)
- Tap any key to see compatible mixes (same, ±1, A↔B switch)
- Track Library with key/BPM metadata per track
- Audio file import via device picker
- Track deletion (long press)
- Key-to-Camelot and reverse mapping

### 3. Setlist Manager
- Create setlists with name, venue, event date, description
- Add/remove tracks from setlists
- PDF export with styled table (track #, title, artist, key, BPM, energy)
- Library stats dashboard
- Setlist grid view with venue/date metadata

### 4. AI Mix Assistant
- Powered by OpenRouter API with z-ai/glm-5.1 model
- Inputs: track key, BPM, energy level (1-10), mood, context
- 6 mood presets: High Energy, Chill, Progressive, Dark, Uplifting, Groovy
- Returns practical mixing techniques, genre suggestions, energy flow tips

### 5. Practice Timer
- Session timer with start/stop
- Animated crossfader visualization (Deck A ↔ B)
- Crossfade counter
- Practice session persistence with stats tracking
- Stats: total time, total crossfades, session count, avg duration

### 6. Pro DJ Tips
- 25+ tips across 7 categories
- Categories: Beatmatching, Harmonic Mixing, Transitions, Energy Management, Technical, Preparation, Psytrance
- Sourced from: Carl Cox, Sasha, Richie Hawtin, Astrix, Infected Mushroom, Pioneer DJ Academy, Mark Davis (Mixed In Key), and more
- Category filter with horizontal scroll

## Tech Stack
- **Frontend:** Expo React Native (SDK 54) with expo-router tab navigation
- **Backend:** FastAPI (Python) on port 8001
- **Database:** MongoDB
- **AI:** OpenRouter API with z-ai/glm-5.1 model
- **PDF:** ReportLab for server-side PDF generation

## API Endpoints
- `GET /api/health` - Health check
- `POST/GET/PUT/DELETE /api/tracks` - Track CRUD
- `POST/GET/PUT/DELETE /api/setlists` - Setlist CRUD
- `GET /api/setlists/{id}/tracks` - Get setlist tracks
- `GET /api/setlists/{id}/export/pdf` - Export setlist as PDF
- `GET /api/camelot/wheel` - Full Camelot wheel data
- `GET /api/camelot/compatible/{key}` - Compatible keys lookup
- `POST /api/ai/recommendations` - AI mixing recommendations
- `POST/GET /api/practice` - Practice sessions
- `GET /api/practice/stats` - Practice statistics
- `GET /api/tips` - All DJ tips
- `GET /api/tips/{category}` - Tips by category
- `POST /api/audio/analyze` - Audio file analysis
