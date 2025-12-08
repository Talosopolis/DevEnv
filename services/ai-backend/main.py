
import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict
import random
from rag_service import RAGService
from course_generator import CourseGenerator

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

# --- Hardcoded Dataset for Reliable Gameplay (Spartan Mode) ---
SPARTAN_GREECE_QUIZ = [
    {
        "question": "Which Spartan King led the 300 at the Battle of Thermopylae?",
        "options": ["Leonidas I", "Agis IV", "Menelaus", "Lysander"],
        "correct_option_index": 0,
        "explanation": "King Leonidas I led the Greek coalition against the Persian Empire in 480 BC."
    },
    {
        "question": "What was the rigorous state-sponsored education system for Spartan youth called?",
        "options": ["The Academy", "The Agoge", "The Lyceum", "The Symposium"],
        "correct_option_index": 1,
        "explanation": "The Agoge was the mandatory training program for all male Spartan citizens, focusing on military training."
    },
    {
        "question": "What was the name of the large round shield carried by a Spartan Hoplite?",
        "options": ["Aspis (Hoplon)", "Scutum", "Targe", "Phalanx"],
        "correct_option_index": 0,
        "explanation": "The Hoplon (or Aspis) was the heavy bronze-covered wood shield that defined the Hoplite class."
    },
    {
        "question": "Sparta was the principal enemy of which city-state during the Peloponnesian War?",
        "options": ["Thebes", "Corinth", "Athens", "Argos"],
        "correct_option_index": 2,
        "explanation": "The Peloponnesian War (431–404 BC) was a conflict for hegemony between the Delian League (Athens) and the Peloponnesian League (Sparta)."
    },
    {
        "question": "Who was the legendary lawgiver credited with reforming Spartan society?",
        "options": ["Solon", "Pericles", "Lycurgus", "Draco"],
        "correct_option_index": 2,
        "explanation": "Lycurgus established the military-oriented reformation of Spartan society in accordance with the Oracle of Apollo."
    },
    {
        "question": "What was the primary tactical formation used by the Spartan army?",
        "options": ["The Phalanx", "The Testudo", "The Wedge", "Skirmishing"],
        "correct_option_index": 0,
        "explanation": "The Phalanx was a rectangular mass military formation, usually composed entirely of heavy infantry armed with spears."
    },
    {
        "question": "Which phrase did Spartan mothers essentially say to their sons upon leaving for war?",
        "options": ["Conquer or Die", "With it or on it", "For glory", "Return victorious"],
        "correct_option_index": 1,
        "explanation": "'Come back with your shield - or on it' (E tan e epi tas) implied victory or death."
    },
    {
        "question": "Who were the subjugated population of serfs that supported the Spartan economy?",
        "options": ["The Helots", "The Perioikoi", "The Metics", "The Hoplites"],
        "correct_option_index": 0,
        "explanation": "Helots were the unfree population of Laconia and Messenia, forced to work the land for Spartan citizens."
    },
    {
        "question": "How many kings did Sparta officially have at any given time?",
        "options": ["One", "Two", "Three", "None (Council only)"],
        "correct_option_index": 1,
        "explanation": "Sparta was an oligarchy with two kings from the Agiad and Eurypontid families."
    },
    {
        "question": "What was the name of the elite Spartan secret police used to control the Helots?",
        "options": ["The Krypteia", "The Immortals", "The Ephors", "The Gerousia"],
        "correct_option_index": 0,
        "explanation": "The Krypteia was a state institution involving young Spartan men who monitored and terrorized the Helot population."
    },
     {
        "question": "In 404 BC, Sparta defeated Athens, ending which major conflict?",
        "options": ["The Persian War", "The Peloponnesian War", "The Trojan War", "The Corinthian War"],
        "correct_option_index": 1,
        "explanation": "The victory established Sparta as the temporary hegemonic power of Greece."
    },
    {
        "question": "What famous 'Laconic' reply did the Spartans send to Philip II of Macedon?",
        "options": ["None", "If", "Try", "Never"],
        "correct_option_index": 1,
        "explanation": "Philip wrote a long threat, and the Spartans replied with a single word: 'If'."
    }
]

class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    user_context: Optional[str] = None
    question_index: Optional[int] = None # Support sequential access

class AssessmentResult(BaseModel):
    topic: str
    score: int
    max_score: int
    user_id: str

class ChatRequest(BaseModel):
    message: str
    course_id: Optional[str] = None
    history: List[Dict[str, str]] = []

def scrub_pii(text: Optional[str]) -> str:
    if not text:
        return ""
    # TODO: Implement robust PII redaction (e.g., using DLP API)
    return text.replace("@", "[REDACTED_EMAIL]").replace("phone", "[REDACTED_PHONE]")

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
    """
    # 1. Retrieve Context
    context = rag_service.search_context(request.message, request.course_id)
    
    # 2. Generate Response
    response = await course_generator.chat_with_context(
        request.message, 
        context, 
        request.history
    )
    
    return {"response": response, "context_used": bool(context)}

@app.get("/")
def health_check():
    return {"status": "ok", "service": "ai-backend-gemini-2.5"}

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generates a quiz question using Gemini 2.5 Flash, or serves from hardcoded set for Spartan/Greece.
    """
    
    # --- SPARTAN / GREECE OVERRIDE ---
    # deterministic sequential access
    if (request.topic.lower() == "ancient greece" or request.difficulty == "spartan") and request.question_index is not None:
         idx = request.question_index % len(SPARTAN_GREECE_QUIZ)
         return SPARTAN_GREECE_QUIZ[idx]
    
    # Fallback to random if no index
    if request.topic.lower() == "ancient greece" or request.difficulty == "spartan":
        return random.choice(SPARTAN_GREECE_QUIZ)


    # --- GEN AI LOGIC ---
    
    # Compliance check: Scrub PII from user_context
    clean_context = scrub_pii(request.user_context)
    
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
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        Create a {request.difficulty} quiz question about {request.topic}. 
        Context: {clean_context}. 
        Return JSON with fields: 'question', 'options' (list of 4 strings), 'correct_option_index' (int), and 'explanation'.
        """
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        import json
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Error generating quiz: {e}")
        # Fallback to random selected question from hardcoded set so game is playable
        import random
        fallback = random.choice(SPARTAN_GREECE_QUIZ).copy() # Copy to avoid mutating global
        fallback["explanation"] += f" (Offline Mode: {str(e)[:20]}...)"
        return fallback

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
