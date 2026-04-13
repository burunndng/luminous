from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import httpx
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenRouter API
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================== MODELS ==================

# Track Model
class Track(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    artist: str
    bpm: Optional[float] = None
    key: Optional[str] = None
    energy: Optional[int] = None  # 1-10
    notes: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TrackCreate(BaseModel):
    title: str
    artist: str
    bpm: Optional[float] = None
    key: Optional[str] = None
    energy: Optional[int] = None
    notes: Optional[str] = None
    tags: List[str] = []

class TrackUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    bpm: Optional[float] = None
    key: Optional[str] = None
    energy: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

# Setlist Model
class Setlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    venue: Optional[str] = None
    event_date: Optional[str] = None
    track_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SetlistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    venue: Optional[str] = None
    event_date: Optional[str] = None
    track_ids: List[str] = []

class SetlistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    event_date: Optional[str] = None
    track_ids: Optional[List[str]] = None

# AI Request Model
class AIRecommendationRequest(BaseModel):
    current_track_key: Optional[str] = None
    current_track_bpm: Optional[float] = None
    current_track_energy: Optional[int] = None
    mood: Optional[str] = None
    context: Optional[str] = None

# Practice Session Model
class PracticeSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    duration_seconds: int
    crossfade_count: int
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PracticeSessionCreate(BaseModel):
    duration_seconds: int
    crossfade_count: int
    notes: Optional[str] = None

# ================== CAMELOT WHEEL DATA ==================

CAMELOT_WHEEL = {
    "1A": {"key": "A♭m", "compatible": ["1A", "12A", "2A", "1B"]},
    "2A": {"key": "E♭m", "compatible": ["2A", "1A", "3A", "2B"]},
    "3A": {"key": "B♭m", "compatible": ["3A", "2A", "4A", "3B"]},
    "4A": {"key": "Fm", "compatible": ["4A", "3A", "5A", "4B"]},
    "5A": {"key": "Cm", "compatible": ["5A", "4A", "6A", "5B"]},
    "6A": {"key": "Gm", "compatible": ["6A", "5A", "7A", "6B"]},
    "7A": {"key": "Dm", "compatible": ["7A", "6A", "8A", "7B"]},
    "8A": {"key": "Am", "compatible": ["8A", "7A", "9A", "8B"]},
    "9A": {"key": "Em", "compatible": ["9A", "8A", "10A", "9B"]},
    "10A": {"key": "Bm", "compatible": ["10A", "9A", "11A", "10B"]},
    "11A": {"key": "F♯m", "compatible": ["11A", "10A", "12A", "11B"]},
    "12A": {"key": "D♭m", "compatible": ["12A", "11A", "1A", "12B"]},
    "1B": {"key": "B", "compatible": ["1B", "12B", "2B", "1A"]},
    "2B": {"key": "F♯", "compatible": ["2B", "1B", "3B", "2A"]},
    "3B": {"key": "D♭", "compatible": ["3B", "2B", "4B", "3A"]},
    "4B": {"key": "A♭", "compatible": ["4B", "3B", "5B", "4A"]},
    "5B": {"key": "E♭", "compatible": ["5B", "4B", "6B", "5A"]},
    "6B": {"key": "B♭", "compatible": ["6B", "5B", "7B", "6A"]},
    "7B": {"key": "F", "compatible": ["7B", "6B", "8B", "7A"]},
    "8B": {"key": "C", "compatible": ["8B", "7B", "9B", "8A"]},
    "9B": {"key": "G", "compatible": ["9B", "8B", "10B", "9A"]},
    "10B": {"key": "D", "compatible": ["10B", "9B", "11B", "10A"]},
    "11B": {"key": "A", "compatible": ["11B", "10B", "12B", "11A"]},
    "12B": {"key": "E", "compatible": ["12B", "11B", "1B", "12A"]},
}

# Key to Camelot mapping
KEY_TO_CAMELOT = {
    "A♭m": "1A", "Abm": "1A", "G#m": "1A",
    "E♭m": "2A", "Ebm": "2A", "D#m": "2A",
    "B♭m": "3A", "Bbm": "3A", "A#m": "3A",
    "Fm": "4A",
    "Cm": "5A",
    "Gm": "6A",
    "Dm": "7A",
    "Am": "8A",
    "Em": "9A",
    "Bm": "10A",
    "F♯m": "11A", "F#m": "11A", "Gbm": "11A",
    "D♭m": "12A", "Dbm": "12A", "C#m": "12A",
    "B": "1B",
    "F♯": "2B", "F#": "2B", "Gb": "2B",
    "D♭": "3B", "Db": "3B", "C#": "3B",
    "A♭": "4B", "Ab": "4B", "G#": "4B",
    "E♭": "5B", "Eb": "5B", "D#": "5B",
    "B♭": "6B", "Bb": "6B", "A#": "6B",
    "F": "7B",
    "C": "8B",
    "G": "9B",
    "D": "10B",
    "A": "11B",
    "E": "12B",
}

# ================== ROUTES ==================

@api_router.get("/")
async def root():
    return {"message": "DJ Toolkit API", "version": "1.0.0"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ================== TRACK ROUTES ==================

@api_router.post("/tracks", response_model=Track)
async def create_track(track_input: TrackCreate):
    track = Track(**track_input.dict())
    await db.tracks.insert_one(track.dict())
    return track

@api_router.get("/tracks", response_model=List[Track])
async def get_tracks():
    tracks = await db.tracks.find().sort("created_at", -1).to_list(1000)
    return [Track(**track) for track in tracks]

@api_router.get("/tracks/{track_id}", response_model=Track)
async def get_track(track_id: str):
    track = await db.tracks.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return Track(**track)

@api_router.put("/tracks/{track_id}", response_model=Track)
async def update_track(track_id: str, track_update: TrackUpdate):
    existing = await db.tracks.find_one({"id": track_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Track not found")
    
    update_data = {k: v for k, v in track_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.tracks.update_one({"id": track_id}, {"$set": update_data})
    updated = await db.tracks.find_one({"id": track_id})
    return Track(**updated)

@api_router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    result = await db.tracks.delete_one({"id": track_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Track not found")
    return {"message": "Track deleted successfully"}

# ================== SETLIST ROUTES ==================

@api_router.post("/setlists", response_model=Setlist)
async def create_setlist(setlist_input: SetlistCreate):
    setlist = Setlist(**setlist_input.dict())
    await db.setlists.insert_one(setlist.dict())
    return setlist

@api_router.get("/setlists", response_model=List[Setlist])
async def get_setlists():
    setlists = await db.setlists.find().sort("created_at", -1).to_list(1000)
    return [Setlist(**setlist) for setlist in setlists]

@api_router.get("/setlists/{setlist_id}", response_model=Setlist)
async def get_setlist(setlist_id: str):
    setlist = await db.setlists.find_one({"id": setlist_id})
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")
    return Setlist(**setlist)

@api_router.put("/setlists/{setlist_id}", response_model=Setlist)
async def update_setlist(setlist_id: str, setlist_update: SetlistUpdate):
    existing = await db.setlists.find_one({"id": setlist_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Setlist not found")
    
    update_data = {k: v for k, v in setlist_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.setlists.update_one({"id": setlist_id}, {"$set": update_data})
    updated = await db.setlists.find_one({"id": setlist_id})
    return Setlist(**updated)

@api_router.delete("/setlists/{setlist_id}")
async def delete_setlist(setlist_id: str):
    result = await db.setlists.delete_one({"id": setlist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Setlist not found")
    return {"message": "Setlist deleted successfully"}

@api_router.get("/setlists/{setlist_id}/tracks", response_model=List[Track])
async def get_setlist_tracks(setlist_id: str):
    setlist = await db.setlists.find_one({"id": setlist_id})
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")
    
    tracks = []
    for track_id in setlist.get("track_ids", []):
        track = await db.tracks.find_one({"id": track_id})
        if track:
            tracks.append(Track(**track))
    return tracks

# ================== CAMELOT/HARMONIC MIXING ROUTES ==================

@api_router.get("/camelot/wheel")
async def get_camelot_wheel():
    return CAMELOT_WHEEL

@api_router.get("/camelot/compatible/{key}")
async def get_compatible_keys(key: str):
    # Try direct lookup
    if key in CAMELOT_WHEEL:
        return {
            "input_key": key,
            "camelot_code": key,
            "musical_key": CAMELOT_WHEEL[key]["key"],
            "compatible_codes": CAMELOT_WHEEL[key]["compatible"],
            "compatible_keys": [CAMELOT_WHEEL[c]["key"] for c in CAMELOT_WHEEL[key]["compatible"]]
        }
    
    # Try key to camelot mapping
    camelot_code = KEY_TO_CAMELOT.get(key)
    if camelot_code:
        return {
            "input_key": key,
            "camelot_code": camelot_code,
            "musical_key": CAMELOT_WHEEL[camelot_code]["key"],
            "compatible_codes": CAMELOT_WHEEL[camelot_code]["compatible"],
            "compatible_keys": [CAMELOT_WHEEL[c]["key"] for c in CAMELOT_WHEEL[camelot_code]["compatible"]]
        }
    
    raise HTTPException(status_code=404, detail=f"Key '{key}' not found in Camelot wheel")

@api_router.get("/tracks/compatible/{track_id}")
async def get_compatible_tracks(track_id: str):
    track = await db.tracks.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if not track.get("key"):
        raise HTTPException(status_code=400, detail="Track has no key assigned")
    
    # Get compatible keys
    key = track["key"]
    camelot_code = KEY_TO_CAMELOT.get(key, key)
    
    if camelot_code not in CAMELOT_WHEEL:
        raise HTTPException(status_code=400, detail=f"Key '{key}' not found in Camelot wheel")
    
    compatible_codes = CAMELOT_WHEEL[camelot_code]["compatible"]
    compatible_keys = [CAMELOT_WHEEL[c]["key"] for c in compatible_codes]
    
    # Add all variations of compatible keys for matching
    all_compatible = set()
    for ck in compatible_keys:
        all_compatible.add(ck)
        # Add reverse mapping keys
        for k, v in KEY_TO_CAMELOT.items():
            if CAMELOT_WHEEL.get(v, {}).get("key") == ck:
                all_compatible.add(k)
    
    # Find compatible tracks
    all_tracks = await db.tracks.find({"id": {"$ne": track_id}}).to_list(1000)
    compatible_tracks = []
    
    for t in all_tracks:
        if t.get("key") in all_compatible or KEY_TO_CAMELOT.get(t.get("key")) in compatible_codes:
            compatible_tracks.append(Track(**t))
    
    return {
        "source_track": Track(**track),
        "compatible_tracks": compatible_tracks,
        "compatible_codes": compatible_codes
    }

# ================== AI RECOMMENDATION ROUTES ==================

@api_router.post("/ai/recommendations")
async def get_ai_recommendations(request: AIRecommendationRequest):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    
    # Build prompt
    prompt_parts = ["You are an expert DJ assistant. Based on the following information, suggest mixing strategies and track recommendations:\n"]
    
    if request.current_track_key:
        prompt_parts.append(f"- Current track key: {request.current_track_key}")
        camelot = KEY_TO_CAMELOT.get(request.current_track_key, request.current_track_key)
        if camelot in CAMELOT_WHEEL:
            compatible = CAMELOT_WHEEL[camelot]["compatible"]
            prompt_parts.append(f"- Compatible Camelot codes for harmonic mixing: {', '.join(compatible)}")
    
    if request.current_track_bpm:
        prompt_parts.append(f"- Current BPM: {request.current_track_bpm}")
        prompt_parts.append(f"- Recommended BPM range for smooth transition: {request.current_track_bpm - 5} - {request.current_track_bpm + 5}")
    
    if request.current_track_energy:
        prompt_parts.append(f"- Current energy level: {request.current_track_energy}/10")
    
    if request.mood:
        prompt_parts.append(f"- Desired mood: {request.mood}")
    
    if request.context:
        prompt_parts.append(f"- Additional context: {request.context}")
    
    prompt_parts.append("\nProvide:\n1. 3-5 specific mixing techniques for this scenario\n2. Genre suggestions that would work well\n3. Energy flow recommendations\n4. Tips for the transition\n\nKeep response concise and practical for a working DJ.")
    
    prompt = "\n".join(prompt_parts)
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            response = await http_client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "z-ai/glm-5.1",
                    "messages": [
                        {"role": "system", "content": "You are an expert DJ and music producer assistant. Provide practical, actionable advice for DJs."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1024,
                    "temperature": 0.7
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail=f"AI service error: {response.status_code}")
            
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
            
            return {
                "recommendations": ai_response,
                "input": request.dict(),
                "model": "z-ai/glm-5.1"
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logger.error(f"AI recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ================== PRACTICE SESSION ROUTES ==================

@api_router.post("/practice", response_model=PracticeSession)
async def create_practice_session(session_input: PracticeSessionCreate):
    session = PracticeSession(**session_input.dict())
    await db.practice_sessions.insert_one(session.dict())
    return session

@api_router.get("/practice", response_model=List[PracticeSession])
async def get_practice_sessions():
    sessions = await db.practice_sessions.find().sort("created_at", -1).to_list(100)
    return [PracticeSession(**session) for session in sessions]

@api_router.get("/practice/stats")
async def get_practice_stats():
    sessions = await db.practice_sessions.find().to_list(1000)
    
    if not sessions:
        return {
            "total_sessions": 0,
            "total_practice_time": 0,
            "total_crossfades": 0,
            "average_session_duration": 0
        }
    
    total_time = sum(s.get("duration_seconds", 0) for s in sessions)
    total_crossfades = sum(s.get("crossfade_count", 0) for s in sessions)
    
    return {
        "total_sessions": len(sessions),
        "total_practice_time": total_time,
        "total_crossfades": total_crossfades,
        "average_session_duration": total_time / len(sessions) if sessions else 0
    }

# ================== PDF EXPORT ROUTES ==================

@api_router.get("/setlists/{setlist_id}/export/pdf")
async def export_setlist_pdf(setlist_id: str):
    """Export setlist to PDF"""
    setlist = await db.setlists.find_one({"id": setlist_id})
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")
    
    # Get tracks
    tracks = []
    for track_id in setlist.get("track_ids", []):
        track = await db.tracks.find_one({"id": track_id})
        if track:
            tracks.append(track)
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#00D4FF'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#666666'),
        spaceAfter=10,
        alignment=TA_CENTER
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph(f"🎧 {setlist.get('name', 'Setlist')}", title_style))
    
    # Venue and date
    if setlist.get('venue') or setlist.get('event_date'):
        info_parts = []
        if setlist.get('venue'):
            info_parts.append(f"📍 {setlist['venue']}")
        if setlist.get('event_date'):
            info_parts.append(f"📅 {setlist['event_date']}")
        elements.append(Paragraph(" | ".join(info_parts), subtitle_style))
    
    if setlist.get('description'):
        elements.append(Paragraph(setlist['description'], styles['Normal']))
    
    elements.append(Spacer(1, 20))
    
    # Tracks table
    if tracks:
        table_data = [['#', 'Track', 'Artist', 'Key', 'BPM', 'Energy']]
        for i, track in enumerate(tracks, 1):
            table_data.append([
                str(i),
                track.get('title', '-'),
                track.get('artist', '-'),
                track.get('key', '-'),
                str(track.get('bpm', '-')) if track.get('bpm') else '-',
                f"{track.get('energy', '-')}/10" if track.get('energy') else '-'
            ])
        
        table = Table(table_data, colWidths=[0.5*inch, 2.5*inch, 2*inch, 0.7*inch, 0.7*inch, 0.7*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#00D4FF')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No tracks in this setlist", styles['Normal']))
    
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Generated by DJ Toolkit | {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"{setlist.get('name', 'setlist').replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ================== AUDIO ANALYSIS ROUTES ==================

class AudioAnalysisResult(BaseModel):
    filename: str
    estimated_bpm: Optional[float] = None
    suggested_key: Optional[str] = None
    duration_seconds: Optional[float] = None
    analysis_notes: str

@api_router.post("/audio/analyze", response_model=AudioAnalysisResult)
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyze uploaded audio file for BPM and key estimation.
    Note: This is a simplified analysis. For production, use dedicated audio analysis libraries.
    """
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Estimate duration based on file size (rough approximation)
    # MP3: ~1MB per minute at 128kbps
    estimated_duration = (file_size / (1024 * 1024)) * 60  # rough estimate
    
    # For a real implementation, you'd use librosa or similar
    # Here we provide guidance for manual entry
    analysis_notes = f"""
Audio file received: {filename}
File size: {file_size / 1024:.1f} KB
Estimated duration: ~{estimated_duration:.0f} seconds

For accurate BPM detection:
1. Use the Tap Tempo feature while listening
2. Or use software like rekordbox, Serato, or Mixed In Key

For key detection:
1. Use Mixed In Key or KeyFinder software
2. Or train your ear with reference tracks
"""
    
    return AudioAnalysisResult(
        filename=filename,
        estimated_bpm=None,
        suggested_key=None,
        duration_seconds=round(estimated_duration, 1),
        analysis_notes=analysis_notes.strip()
    )

# ================== DJ TIPS DATABASE ==================

DJ_TIPS = {
    "beatmatching": [
        {
            "title": "The 1% Rule",
            "source": "Ean Golden (DJ TechTools)",
            "tip": "When beatmatching, adjust pitch in increments of 0.1-0.3%. Large adjustments are audible; small nudges are seamless.",
            "category": "technique"
        },
        {
            "title": "Use Visual Cues Sparingly",
            "source": "Carl Cox masterclass",
            "tip": "Rely on your ears first. Waveforms are a backup, not a crutch. Train by closing your eyes during practice.",
            "category": "technique"
        },
        {
            "title": "Ride the Pitch Fader",
            "source": "Laidback Luke tutorials",
            "tip": "Instead of constantly nudging the jog wheel, make micro-adjustments to the pitch fader for smoother corrections.",
            "category": "technique"
        }
    ],
    "harmonic_mixing": [
        {
            "title": "The Energy Boost",
            "source": "Mark Davis (Mixed In Key creator)",
            "tip": "Moving up one position on the Camelot wheel (e.g., 8A → 9A) creates a natural energy lift perfect for building peaks.",
            "category": "harmonic"
        },
        {
            "title": "Relative Major/Minor Switch",
            "source": "DJ Fracture (Fabric resident)",
            "tip": "Switching between A and B of the same number (e.g., 8A → 8B) creates an emotional shift while staying perfectly harmonic.",
            "category": "harmonic"
        },
        {
            "title": "The Double Drop",
            "source": "Andy C technique",
            "tip": "When double-dropping, choose tracks in the same key or compatible keys. Clashing keys ruin the impact.",
            "category": "harmonic"
        }
    ],
    "transitions": [
        {
            "title": "The 32-Bar Rule",
            "source": "Pioneer DJ Academy",
            "tip": "Most electronic music is structured in 32-bar phrases. Start mixing at phrase boundaries for natural-sounding transitions.",
            "category": "structure"
        },
        {
            "title": "EQ Swap Technique",
            "source": "James Zabiela masterclass",
            "tip": "Gradually swap EQ bands: cut bass on incoming, bring it in while cutting outgoing bass. Never have two basses fighting.",
            "category": "technique"
        },
        {
            "title": "The Power of Silence",
            "source": "Sasha (Renaissance)",
            "tip": "Don't fear brief moments of silence or stripped-back sections. Tension and release is powerful.",
            "category": "artistic"
        },
        {
            "title": "Filter Transitions",
            "source": "Richie Hawtin",
            "tip": "High-pass filter the outgoing track while low-pass filtering the incoming. Creates smooth frequency handoff.",
            "category": "technique"
        }
    ],
    "energy_management": [
        {
            "title": "The Journey Arc",
            "source": "Sven Väth (Cocoon)",
            "tip": "A great set tells a story: build tension, peak, release, rebuild. Don't peak too early or stay flat.",
            "category": "programming"
        },
        {
            "title": "Read the Room",
            "source": "Seth Troxler interviews",
            "tip": "Watch the dancefloor, not your laptop. Hands up = keep energy. People chatting = they need a hook.",
            "category": "performance"
        },
        {
            "title": "The 3-Track Test",
            "source": "Derrick May (Detroit legend)",
            "tip": "If the floor isn't responding after 3 tracks, you've misread the room. Adjust immediately.",
            "category": "programming"
        }
    ],
    "technical": [
        {
            "title": "Gain Staging",
            "source": "Funktion-One sound engineers",
            "tip": "Keep your meters out of the red. Clipping sounds terrible on big systems. -6dB peaks are plenty loud.",
            "category": "sound"
        },
        {
            "title": "Hot Cue Discipline",
            "source": "A-Trak",
            "tip": "Set hot cues at phrase starts, drops, and breakdowns. Color-code them consistently across your library.",
            "category": "preparation"
        },
        {
            "title": "The Booth Monitor Trap",
            "source": "Various sound engineers",
            "tip": "Booth monitors lie about bass. Trust the main system sound or use quality headphones for low-end decisions.",
            "category": "sound"
        }
    ],
    "preparation": [
        {
            "title": "Crate Organization",
            "source": "DJ Dan (veteran house DJ)",
            "tip": "Organize by energy and mood, not just genre. A 'Peak Time Weapons' folder is more useful than 'Tech House'.",
            "category": "organization"
        },
        {
            "title": "The 3x Rule",
            "source": "Various professional DJs",
            "tip": "Prepare 3x more music than your set length. You'll need options when your planned flow doesn't fit the room.",
            "category": "preparation"
        },
        {
            "title": "Know Your Tracks",
            "source": "Laurent Garnier",
            "tip": "Listen to every track at least 5 times before playing it out. Know where the energy peaks and valleys are.",
            "category": "preparation"
        }
    ],
    "psytrance_specific": [
        {
            "title": "The Rolling Bassline Lock",
            "source": "Astrix production tutorials",
            "tip": "In psytrance, the bassline IS the groove. Match bassline patterns, not just kicks, for seamless mixing.",
            "category": "genre"
        },
        {
            "title": "Build-up Layering",
            "source": "Vini Vici studio sessions",
            "tip": "Layer the builds: let the incoming track's riser blend with the outgoing drop for massive tension.",
            "category": "genre"
        },
        {
            "title": "The 145 BPM Sweet Spot",
            "source": "Infected Mushroom",
            "tip": "Most psytrance sits at 140-148 BPM. Smaller tempo jumps (±3 BPM) are less jarring than big shifts.",
            "category": "genre"
        },
        {
            "title": "Acid Line Transitions",
            "source": "GMS (Growling Mad Scientists)",
            "tip": "Use the 303-style acid lines as transition tools - they cut through any mix and guide listener attention.",
            "category": "genre"
        }
    ]
}

@api_router.get("/tips")
async def get_all_tips():
    """Get all DJ tips organized by category"""
    return DJ_TIPS

@api_router.get("/tips/{category}")
async def get_tips_by_category(category: str):
    """Get DJ tips for a specific category"""
    if category not in DJ_TIPS:
        available = list(DJ_TIPS.keys())
        raise HTTPException(
            status_code=404, 
            detail=f"Category not found. Available: {', '.join(available)}"
        )
    return {category: DJ_TIPS[category]}

@api_router.get("/tips/random/{count}")
async def get_random_tips(count: int = 3):
    """Get random DJ tips"""
    import random
    all_tips = []
    for category, tips in DJ_TIPS.items():
        for tip in tips:
            all_tips.append({**tip, "main_category": category})
    
    count = min(count, len(all_tips))
    return random.sample(all_tips, count)

# Include the router in the main app (MUST be after all routes are defined)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
