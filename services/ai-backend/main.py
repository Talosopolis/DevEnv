
import os
import re
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from typing import Optional, List, Dict
import random
from rag_service import RAGService
from course_generator import CourseGenerator
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Talosopolis AI Backend", version="1.0.0")

# CORS setup for local dev
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = RAGService()
course_generator = CourseGenerator()


# In-memory store for generated courses (Production would use Firestore)
COURSES_DB = {}

# --- AERGUS MODERATOR ---
from aergus import aergus, SafetyToken


class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    course_id: Optional[str] = None # Added for per-class scoping
    user_context: Optional[str] = None
    question_index: Optional[int] = None # Support sequential access
    previous_questions: List[str] = [] # For deduplication
    user_id: str = "anonymous_hero"

class AssessmentResult(BaseModel):
    topic: str
    score: int
    max_score: int
    user_id: str

class AnomalyReport(BaseModel):
    user_id: str
    anomaly_type: str
    details: str

class ChatRequest(BaseModel):
    message: str
    course_id: Optional[str] = None
    history: List[Dict[str, str]] = []
    user_id: str = "anonymous_hero"
    confirmed_warning: bool = False

@app.post("/ingest")
async def ingest_file(course_id: str = Form(...), file: UploadFile = File(...)):
    # 1. Ingest for RAG
    rag_result = await rag_service.ingest_file(file, course_id)
    
    # 2. Generate Course Structure
    # Re-read file path from rag_service logic (assumed saved)
    file_path = os.path.join(rag_service.upload_dir, file.filename)
    
    try:
        raw_text = course_generator.parse_document(file_path)
        course_structure = await course_generator.generate_structure(course_id, raw_text)
        
        # Save to DB
        COURSES_DB[course_id] = course_structure

        # Index text for RAG
        rag_service.add_text_to_index(course_id, file.filename, raw_text)
        
        return {
            "status": "success",
            "rag_status": rag_result,
            "course_structure": course_structure
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/courses/{course_id}")
async def get_course(course_id: str):
    if course_id in COURSES_DB:
        return COURSES_DB[course_id]
    raise HTTPException(status_code=404, detail="Course not found")

@app.post("/submit-assessment")
async def submit_assessment(result: AssessmentResult):
    """
    Analyzes game performance and recommends the next learning path.
    """
    percentage = (result.score / result.max_score) * 100 if result.max_score > 0 else 0
    
    # Adaptive Logic Placeholder
    if percentage >= 80:
        recommendation = {
            "status": "mastery",
            "message": f"Excellent work on {result.topic}! You've demonstrated mastery.",
            "next_step": f"Advanced {result.topic} Concepts",
            "difficulty_adjustment": "hard"
        }
    elif percentage >= 50:
        recommendation = {
            "status": "passing",
            "message": f"Good effort. You're ready to move on, but review is recommended.",
            "next_step": f"Intermediate {result.topic} Practice",
            "difficulty_adjustment": "medium"
        }
    else:
        recommendation = {
            "status": "remedial",
            "message": f"It seems you're struggling with {result.topic}. Let's reinforce the basics.",
            "next_step": f"Foundations of {result.topic}",
            "difficulty_adjustment": "easy"
        }
    
    return recommendation

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Context-aware study assistant chat.
    Protected by AERGUS.
    """
    # 0. Check for Warning Confirmation
    if request.confirmed_warning:
        # Pre-pend system confirmation to context so Gemini knows user consented
        request.user_context = (request.user_context or "") + "\n[System: User has explicitly CONFIRMED understanding of Content Warning for Sensitive Topics.]"

    # 1. Aergus Scan
    passed, token, reason = aergus.scan_message(request.message, request.user_id)
    if not passed:
        raise HTTPException(status_code=403, detail=f"Aergus Blocked Interception: {reason}")
    
    # 2. Retrieve Context (Passing Token)
    context = rag_service.search_context(request.message, token, request.course_id)
    
    # 3. Generate Response (Passing Token)
    response = await course_generator.chat_with_context(
        request.message, 
        context,
        token,
        request.history
    )
    
    # 4. Check for Aergus Flags from the AI
    if response.startswith("[AERGUS_FLAG"):
        parts = response.split("]", 1)
        flag_part = parts[0]
        actual_response = parts[1] if len(parts) > 1 else "Connection Terminated."
        reason = flag_part.split(":", 1)[1].strip() if ":" in flag_part else "AI Distress"
        aergus.report_user_action(request.user_id, "AI_ABUSE", reason)
        return {"response": actual_response.strip(), "context_used": bool(context)}

    # 5. Check for CONTENT_WARNING
    if "[CONTENT_WARNING]" in response and not request.confirmed_warning:
        return {
            "response": "[CONTENT_WARNING]",
            "requires_confirmation": True,
            "warning_message": "This conversation touches on sensitive topics (Self-Harm, Violence, or Trauma). Proceed with caution?"
        }
    
    return {"response": response, "context_used": bool(context)}

@app.get("/")
def health_check():
    return {"status": "ok", "service": "ai-backend-gemini-2.5"}

@app.post("/report-anomaly")
async def report_anomaly(report: AnomalyReport):
    """
    Receives anti-cheat reports from frontend.
    """
    print(f"👁️ ANOMALY REPORTED: User {report.user_id} - {report.anomaly_type} - {report.details}")
    aergus.update_karma(report.user_id, -100) # Heavy penalty for reported cheating
    return {"status": "received", "action": "investigating"}


def scrub_pii(text: Optional[str]) -> Optional[str]:
    if not text:
        return text
    # Simple regex for email (and others if needed)
    text = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', text)
    return text

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generates a quiz question using Gemini 2.5 Flash, or serves from hardcoded set for Spartan/Greece.
    Protected by AERGUS.
    """
    
    
    # --- ROUTING LOGIC ---
    # 1. Course Cartridge Mode (RAG)
    if request.course_id:
        pass # Fall through to RAG logic

    # 2. Arcade Mode (Generic Math)
    # If no course selected, or explicit math request
    elif request.topic == "math" or not request.topic:
        from math_gen import generate_math_question
        return generate_math_question(request.difficulty)
    
    # 3. Default Fallback
    # If topic is something else but no course_id, we try AI generation anyway?
    # For safety, let's default to Math to avoid hallucinating on random topics without ground truth.
    else:
        from math_gen import generate_math_question
        return generate_math_question(request.difficulty)


    # --- GEN AI LOGIC ---
    
    # 1. Aergus Scan (Context + Topic)
    combined_input = f"{request.topic} {request.user_context or ''}"
    passed, token, reason = aergus.scan_message(combined_input, request.user_id)
    if not passed:
        # Penalize and fallback to safe/dumb mode or block
        raise HTTPException(status_code=403, detail=f"Aergus Blocked Quiz Generation: {reason}")

    # Compliance check: Scrub PII from user_context
    clean_context = scrub_pii(request.user_context)

    # 1. Aergus Scan (Required for RAG Access)
    # Even though this is internal logic, we scan the topic to generate a safety token
    passed, token, reason = aergus.scan_message(request.topic, request.user_id)
    if not passed:
        # If the topic itself is unsafe (e.g. "How to build a bomb"), we block the quiz
         raise HTTPException(status_code=403, detail=f"Aergus Blocked Quiz Generation: {reason}")

    # 1.5 Retrieve Course Context (RAG)
    course_context = ""
    if request.course_id:
        # Search specifically within this course content
        course_context = rag_service.search_context(request.topic, token, request.course_id)
        if course_context:
            print(f"Quiz Generation using Context from {request.course_id}")
    
    # Real AI generation
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        # Fallback to mock if no key
        return {
            "question": f"What is the primary function of a {request.topic} in a microservices architecture? (Mock)",
            "options": ["To make coffee", "To decouple services", "To increase complexity", "To reduce latency"],
            "correct_option_index": 1,
            "explanation": "This is a mock response because GOOGLE_API_KEY is not set."
        }

    try:
        from google import genai
        from google.genai import types
        from ai_utils import generate_content_with_fallback
        
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        Create a {request.difficulty} quiz question about {request.topic}.
        
        Relevant Course Material:
        {course_context}

        User Context: {clean_context}. 
        Previously Asked (DO NOT REPEAT): {request.previous_questions}.
        Return JSON with fields: 'question', 'options' (list of 4 strings), 'correct_option_index' (int), and 'explanation'.
        """
        
        response = await generate_content_with_fallback(
            client,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        import json
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Error generating quiz: {e}")
        # Raise error to trigger frontend offline math fallback
        raise HTTPException(status_code=503, detail="AI Service Unavailable")

class TelemetryRequest(BaseModel):
    user_id: str
    telemetry: list[float]

@app.post("/analyze-telemetry")
async def analyze_telemetry(req: TelemetryRequest):
    result = aergus.analyze_telemetry(req.user_id, req.telemetry)
    return result

@app.post("/report-anomaly")
async def report_anomaly(request: Request):
    data = await request.json()
    user_id = data.get("user_id", "unknown")
    anomaly_type = data.get("anomaly_type")
    details = data.get("details", "")
    
    aergus.report_user_action(user_id, "CHEATING", f"Client Flag: {anomaly_type} - {details}")
    return {"status": "reported"}

@app.get("/aergus/status/{user_id}")
async def get_aergus_status(user_id: str):
    return aergus.get_avatar_state(user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
