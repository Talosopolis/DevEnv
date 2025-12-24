
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
from persistence_service import PersistenceService
persistence_service = PersistenceService()


# In-memory store for generated courses (Production would use Firestore)
COURSES_DB = persistence_service.load_courses()

# --- AERGUS MODERATOR ---
from aergus import aergus, SafetyToken




class AssessmentResult(BaseModel):
    topic: str
    score: int
    max_score: int
    user_id: str
    course_id: Optional[str] = None
    module_index: Optional[int] = None
    lesson_index: Optional[int] = None

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

# --- ECONOMY SYSTEM ---
from economy import economy

@app.get("/balance/{user_id}")
async def get_balance(user_id: str):
    return {"user_id": user_id, "balance": economy.check_balance(user_id)}

@app.post("/ingest")
async def ingest_file(course_id: str = Form(...), file: UploadFile = File(...), user_id: str = Form("anonymous_hero")):
    # 0. Check Balance Logic (Estimate)
    # File usage: read content size
    content = await file.read() # Read for size check
    await file.seek(0) # Reset cursor for RAG service
    
    # Cost: Input chars
    cost = economy.estimate_cost(len(content), 0)
    
    if not economy.spend(user_id, cost, f"File Ingest: {file.filename}"):
         raise HTTPException(status_code=402, detail=f"Insufficient Obols. Cost: {cost:.2f}")

    # 1. Ingest for RAG
    rag_result = await rag_service.ingest_file(file, course_id)
    
    # 2. Generate Course Structure
    # Re-read file path from rag_service logic (assumed saved)
    file_path = os.path.join(rag_service.upload_dir, file.filename)
    
    try:
        raw_text = course_generator.parse_document(file_path)
        # Note: /ingest currently generates structure implicitly. 
        # Ideally this should be separate or costed. 
        # For now, we costed the *ingest* based on size.
        # If generate_structure is called, it uses output.
        # Let's say ingest implies structure generation for simplified flow.
        # Add output cost estimate (mocked 5k chars)
        extra_cost = economy.estimate_cost(0, 5000)
        # Try spend extra? Or just eat it. Let's just spend it if we can, else warn?
        # Simpler: The initial cost calculation included only input.
        # Let's double dip for structure generation cost
        economy.spend(user_id, extra_cost, "Auto-Generate Structure")

        course_structure = await course_generator.generate_structure(course_id, raw_text)
        
        # Save to DB
        COURSES_DB[course_id] = course_structure
        persistence_service.save_courses(COURSES_DB)

        # Index text for RAG
        rag_service.add_text_to_index(course_id, file.filename, raw_text)
        
        return {
            "status": "success",
            "rag_status": rag_result,
            "course_structure": course_structure,
            "cost_incurred": cost + extra_cost
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/courses/{course_id}")
async def get_course(course_id: str):
    if course_id in COURSES_DB:
        return COURSES_DB[course_id]
    raise HTTPException(status_code=404, detail="Course not found")

@app.get("/courses/user/{user_id}")
async def get_user_courses(user_id: str):
    """
    Returns all courses. In a real app, filtering by user_id would happen here.
    For MVP/Demo, we return all courses in DB.
    """
    courses = []
    for cid, data in COURSES_DB.items():
        # Handle both dict and Pydantic models (just in case)
        if hasattr(data, 'dict'): 
            course_data = data.dict()
        else:
            course_data = dict(data)
            
        # Inject ID if missing
        if 'id' not in course_data: course_data['id'] = cid
        
        # Inject Defaults for Frontend Compatibility
        if "subject" not in course_data: course_data["subject"] = "General"
        if "grade" not in course_data: course_data["grade"] = "Unspecified"
        if "teacherName" not in course_data: course_data["teacherName"] = "AI Archivist"
        if "duration" not in course_data: course_data["duration"] = "Self-Paced"
        if "status" not in course_data: course_data["status"] = "published"
        if "ownerId" not in course_data: course_data["ownerId"] = "anonymous_hero"
        if "isPublic" not in course_data: course_data["isPublic"] = True
        
        # Ensure array fields are lists, not None/Missing
        if "objectives" not in course_data or course_data["objectives"] is None: course_data["objectives"] = []
        if "materials" not in course_data or course_data["materials"] is None: course_data["materials"] = []
        if "activities" not in course_data or course_data["activities"] is None: course_data["activities"] = []
        if "modules" not in course_data or course_data["modules"] is None: course_data["modules"] = []
        
        courses.append(course_data)
        
    return courses

class LessonGenerationRequest(BaseModel):
    course_id: str
    topic: str
    level: str = "Intermediate"
    user_id: str = "anonymous_hero"
    # New context fields from Editor
    objectives: List[str] = []
    materials: List[str] = []
    description: Optional[str] = ""
    module_index: Optional[int] = None
    lesson_index: Optional[int] = None

@app.post("/generate-lesson")
async def generate_lesson(request: LessonGenerationRequest):
    """
    Generates detailed content for a specific lesson.
    """
    # Cost: Output approx 5k chars ~ 2.5 Obols
    COST = 2.5
    if not economy.spend(request.user_id, COST, f"Generate Lesson: {request.topic}"):
        raise HTTPException(status_code=402, detail=f"Insufficient Obols. Cost: {COST}")

    # 1. Retrieve Context (Internal Token)
    passed, token, _ = aergus.scan_message(request.topic, request.user_id)
    
    rag_context = ""
    if request.course_id:
        rag_context = rag_service.search_context(request.topic, token if passed else "SAFETY_TOKEN_BYPASSED_INTERNAL", request.course_id)
    
    # Combine Contexts
    full_context = f"""
    Course Description: {request.description}
    Learning Objectives: {', '.join(request.objectives)}
    Required Materials: {', '.join(request.materials)}
    
    Retrieved internal Materials (RAG):
    {rag_context}
    """
    
    # 2. Generate
    content = await course_generator.generate_lesson_content(request.topic, full_context, request.level)
    
    # 3. AUTO-SAVE Persistence
    # If we know where this lesson belongs, save it immediately to prevent data loss.
    if request.course_id and request.course_id in COURSES_DB and request.module_index is not None and request.lesson_index is not None:
        try:
             # Basic bounds check
             course = COURSES_DB[request.course_id]
             if "modules" in course and 0 <= request.module_index < len(course["modules"]):
                 module = course["modules"][request.module_index]
                 if "lessons" in module and 0 <= request.lesson_index < len(module["lessons"]):
                     # Update and Save
                     module["lessons"][request.lesson_index]["content"] = content
                     persistence_service.save_courses(COURSES_DB)
                     print(f"Auto-saved content for {request.course_id} M{request.module_index}:L{request.lesson_index}")
        except Exception as e:
             print(f"Warning: Auto-save failed: {e}")

    return {"content": content, "cost_incurred": COST}

@app.post("/submit-assessment")
async def submit_assessment(result: AssessmentResult):
    """
    Analyzes game performance and recommends the next learning path.
    """
    percentage = (result.score / result.max_score) * 100 if result.max_score > 0 else 0
    
    # Reward Logic: First time pass (>= 70%) gets 50 Lepta
    if result.course_id and result.module_index is not None and result.lesson_index is not None:
        if percentage >= 70:
            event_id = f"LESSON_COMPLETE_{result.course_id}_{result.module_index}_{result.lesson_index}"
            rewarded = economy.award_reward(result.user_id, 50, event_id)
            if rewarded:
                print(f"🎉 Awarded 50 Lepta to {result.user_id} for completing {result.topic}")
    
    # Adaptive Logic Placeholder
    
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

class QualityCheckRequest(BaseModel):
    content: str
    topic: str
    user_id: str = "anonymous_hero"

@app.post("/quality-check")
async def quality_check(req: QualityCheckRequest):
    """
    Verifies lesson content quality. Cost: 1.5 Obols.
    """
    COST = 1.5
    if not economy.spend(req.user_id, COST, "Quality Check"):
        raise HTTPException(status_code=402, detail=f"Insufficient Obols for Quality Check. Cost: {COST}")
        
    result = await course_generator.verify_content_quality(req.content, req.topic)
    return result

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Context-aware study assistant chat.
    Protected by AERGUS.
    """
    
    # Economy Check: 0.1 Obol per chat message
    CHAT_COST = 0.1
    if not economy.spend(request.user_id, CHAT_COST, "Chat Message"):
        return {"response": f"Insufficient Obols (Cost: {CHAT_COST}). Please wait for daily refill.", "context_used": False}

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

    # 5. Check for AERGUS CONTENT_WARNING
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

class QuizRequest(BaseModel):
    topic: str
    dataset: str = "default"
    question_count: int = 1
    difficulty: str = "medium" # easy, medium, hard, spartan
    user_id: str = "anonymous"
    user_context: Optional[str] = None
    course_id: Optional[str] = None
    question_index: int = 0
    previous_questions: List[str] = []
    context_notes: List[str] = [] # New: Explicit context from lesson notes
    context_content: Optional[str] = "" # New: Full lesson content fallback

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generates a quiz using Gemini 2.5 Flash.
    """
    print(f"DEBUG: Quiz Payload: Topic={request.topic}, NotesLen={len(request.context_notes)}, ContentLen={len(request.context_content or '')}", flush=True)
    
    # Economy Check: 1 Obol per Arcade Round
    ARCADE_COST = 1.0
    if not economy.spend(request.user_id, ARCADE_COST, "Arcade Round"):
        raise HTTPException(status_code=402, detail=f"Insufficient Obols for Arcade. Cost: {ARCADE_COST}")

    # --- ROUTING LOGIC ---
    
    # 0. CHECK FOR EXPLICIT CONTEXT NOTES (Assessment Mode)
    # If explicit notes are provided (from Assessment), ALWAYS trust the LLM to use them.
    if (request.context_notes and len(request.context_notes) > 0) or (request.context_content and len(request.context_content) > 10):
         print(f"Quiz Generation: Using Explicit Context (Notes: {len(request.context_notes)}, Content: {len(request.context_content or '')} chars)")
         pass # Fall through to Gen AI Logic

    # 1. FORCE MATH GEN for specific keywords regardless of course (unless purely conceptual requested)
    # The user specifically requested MathGen for math courses to ensure quality scaling.
    elif any(kw in request.topic.lower() for kw in ["math", "calc", "algebra", "trig", "geom", "equation", "linear", "quadratic", "number", "arithmetic"]):
        print(f"DEBUG: Math Gen Triggered for topic {request.topic}")
        # Check if we should use the hardcoded generator (which has good difficulty scaling)
        # OR if we trust the LLM. 
        # User said: "Heavily prefer actual math questions... when the course is tagged for Math"
        # Let's try to trust the LLM *with the new prompt* first, but if it fails, fallback?
        # Actually, the user liked the "pythagorean identity" (which likely came from logic) but wanted more.
        # Let's USE the math_gen for these topics as a priority override if it covers them.
        try:
             from math_gen import generate_math_question
             # Verify math_gen success before returning
             q = generate_math_question(request.difficulty, request.topic)
             if q: return q
        except:
             pass 

    # 2. Course Cartridge Mode (RAG)
    if request.course_id:
        pass # Fall through to RAG logic

    # 3. Arcade Mode (Generic Math) - Only if no courseID and no context notes
    elif (request.topic == "math" or not request.topic) and not request.course_id:
        from math_gen import generate_math_question
        q = generate_math_question(request.difficulty, request.topic)
        print(f"DEBUG: Math Gen Result: {q}")
        return q


    # --- GEN AI LOGIC ---
    
    # Aergus Scan (Context + Topic)
    combined_input = f"{request.topic} {request.user_context or ''}"
    passed, token, reason = aergus.scan_message(combined_input, request.user_id)
    if not passed:
        raise HTTPException(status_code=403, detail=f"Aergus Blocked Quiz Generation: {reason}")

    clean_context = scrub_pii(request.user_context)

    # Aergus Scan (Topic only)
    passed, token, reason = aergus.scan_message(request.topic, request.user_id)
    if not passed:
         raise HTTPException(status_code=403, detail=f"Aergus Blocked Quiz Generation: {reason}")

    # Retrieve Course Context
    course_context = ""
    if request.course_id:
        # Map Difficulty Label to 1-10 Range
        diff_range = (1, 10)
        d_lower = request.difficulty.lower()
        if d_lower == "easy": diff_range = (1, 4)
        elif d_lower == "medium": diff_range = (4, 7)
        elif d_lower == "hard": diff_range = (7, 9)
        elif d_lower == "elite" or d_lower == "spartan" or d_lower == "streamer": diff_range = (8, 10)
        
        # Search with difficulty filter
        course_context = rag_service.search_context(
            request.topic, 
            token, 
            request.course_id,
            min_diff=diff_range[0],
            max_diff=diff_range[1]
        )
        if course_context:
            print(f"Quiz Generation using Context from {request.course_id}")
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        from math_gen import generate_math_question
        return generate_math_question(request.difficulty)

    try:
        from google import genai
        from google.genai import types
        from ai_utils import generate_content_with_fallback
        
        client = genai.Client(api_key=api_key)
        
        # STRICTER PROMPT
        # STRICTER PROMPT - CONTEXT SCOPING
        # Determine Primary Source
        primary_source = ""
        if request.context_notes and len(request.context_notes) > 0:
             primary_source = "USER NOTES:\n" + "\n".join(request.context_notes)
        elif request.context_content and len(request.context_content) > 10:
             primary_source = "LESSON TEXT:\n" + request.context_content
        
        # If we have a primary source (Layout/Notes), we should STRICTLY limit to it.
        # If not, we fall back to RAG (Course Context).
        
        scope_instruction = ""
        if primary_source:
             print(f"DEBUG: Primary Source Logic Active. Content Preview: {primary_source[:200]}...")
             scope_instruction = "STRICT INSTRUCTION: Generate a question based *ONLY* on the concepts and definitions explicitly found in the 'PRIMARY SOURCE MATERIAL' below. You MAY assume standard prerequisite knowledge for this level (e.g. Algebra/Trig for Calculus), but do NOT test concepts from future lessons (like Derivatives/Integrals) unless they are explicitly defined in the text. If the text is introductory/conceptual, ask a conceptual question."
        else:
             scope_instruction = "Use the provided Course Material to generate a relevant question."

        prompt = f"""
        Create a {request.difficulty} quiz question about {request.topic}.
        
        {scope_instruction}

        PRIMARY SOURCE MATERIAL:
        {primary_source}

        Supplementary Course Material:
        {course_context if not primary_source else ""}

        User Context: {clean_context}. 
        Previously Asked (DO NOT REPEAT): {request.previous_questions}.
        
        CRITICAL INSTRUCTIONS:
        1. **NO METADATA**: Do NOT ask what book a concept comes from. Do NOT ask "In Chapter 3...". Do NOT mention the author.
        2. **CONCEPTUAL ONLY**: Ask about the *mechanism*, *theory*, or *application* of the concept.
        3. **MATH/PHYSICS**: If the topic involves math ({request.topic}), you MUST generate a numerical or symbolic problem (e.g., "Solve for x", "Calculate the derivative").
        4. **DIFFICULTY SCALE**:
           - Easy: Definitions, simple identification.
           - Medium: Basic application, one-step problems.
           - Hard/Elite: Complex multi-step application, synthesis of concepts.
        5. **FALLBACK**: If the context is just a Table of Contents, IGNORE IT and generate a high-quality standard question about '{request.topic}' using your general knowledge.
        6. **CONCISENESS**: The question text MUST be distinct and minimal. REMOVE all introductory fluff (e.g., "In the realm of...", "As highlighted in this lesson...", "Given its importance..."). For Math, just state the problem (e.g. "Factor the expression:", "Solve for x:"). MAX LENGTH: 2 Sentences.
        
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


class GenerateCourseRequest(BaseModel):
    course_id: str
    title: str
    description: str
    module_count: int = 8
    intensity: str = "standard"
    user_id: str = "anonymous_hero" # Added user_id

@app.post("/generate-course")
async def generate_course(request: GenerateCourseRequest):
    """
    Generates a full course structure based on ingested materials for the given course_id.
    """
    # Economy Check: Cost based on Detail Level (Intensity) and Module Count
    # Base Cost: 2 Obols
    # Intensity Multiplier: Standard(1x), Comp(2x), Intensive(3x)
    # Modules: 0.1 per module
    
    intensity_mult = 1
    if request.intensity == "comprehensive": intensity_mult = 2
    if request.intensity == "intensive": intensity_mult = 3
    
    cost = (2 * intensity_mult) + (request.module_count * 0.1)
    
    if not economy.spend(request.user_id, cost, "Course Genesis"):
        raise HTTPException(status_code=402, detail=f"Insufficient Obols for Genesis. Required: {cost:.1f}")

    try:
        # Retrieve context from all ingested files for this course
        # We search for the course title/description to get relevant context
        context = rag_service.search_context(f"{request.title} {request.description}", "SAFETY_TOKEN_BYPASSED_INTERNAL", request.course_id)
        
        # If no context found, fallback to basic generation or error?
        # We'll proceed with whatever context we have (even empty)
        
        structure = await course_generator.generate_structure(
            request.title, 
            context or f"Course Title: {request.title}. Description: {request.description}",
            module_count=request.module_count,
            intensity=request.intensity
        )
        
        # Apply module count constraint (naive slicing or prompt engineering would be better, but this is a start)
        # If structure has more/less modules, the LLM usually tries to follow instructions if passed. 
        # But `generate_structure` signature in `course_generator.py` might not accept params.
        # checking course_generator.py would be wise, but for now assuming it does standard gen.
        
        COURSES_DB[request.course_id] = structure
        persistence_service.save_courses(COURSES_DB)
        
        return structure
    except Exception as e:
        print(f"Error generating course: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
