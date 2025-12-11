import os
import json
import logging
from typing import List, Dict, Any
from pypdf import PdfReader
from google import genai
from google.genai import types

# Initialize Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CourseGenerator:
    def __init__(self):
        try:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                logger.warning("GOOGLE_API_KEY not found. Helper will fall back to mock.")
                self.client = None
            else:
                self.client = genai.Client(api_key=api_key)
        except Exception as e:
            logger.warning(f"GenAI Client not initialized: {e}. Falling back to mock generation.")
            self.client = None

    def parse_document(self, file_path: str) -> str:
        """Extracts text from a PDF or Text file."""
        text = ""
        try:
            if file_path.endswith('.pdf'):
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            else:
                with open(file_path, 'r') as f:
                    text = f.read()
        except Exception as e:
            logger.error(f"Error parsing document: {e}")
            raise
        return text

    async def generate_structure(self, topic: str, content_text: str) -> Dict[str, Any]:
        """
        Uses Gemini to generate a structured course curriculum from the provided text.
        Returns a JSON object representing the course tree.
        """
        if not self.client:
            return self._mock_course_structure(topic)

        prompt = f"""
        You are an expert curriculum designer for an advanced AI learning platform.
        
        Task: Create a detailed course structure for the topic '{topic}' based on the provided content text.
        
        Requirements:
        1. The output MUST be valid JSON.
        2. The structure must be: Course -> Modules -> Lessons.
        3. Create 3-5 Modules.
        4. Each Module should have 2-4 Lessons.
        5. Include a brief description for the Course and each Module.
        
        Content Text:
        {content_text[:10000]}  # Truncate to avoid token limits if necessary
        
        Output Format (JSON):
        {{
            "title": "Course Title",
            "description": "Course Description",
            "modules": [
                {{
                    "title": "Module 1 Title",
                    "description": "Module Description",
                    "lessons": [
                        {{ "title": "Lesson 1.1 Title", "content_summary": "Brief summary of what this lesson covers" }},
                        {{ "title": "Lesson 1.2 Title", "content_summary": "..." }}
                    ]
                }}
            ]
        }}
        """

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            # Response text should be JSON due to mime_type, but let's be safe
            course_structure = json.loads(response.text)
            return course_structure
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return self._mock_course_structure(topic)

    def _mock_course_structure(self, topic: str) -> Dict[str, Any]:
        """Fallback mock structure if AI fails or key is missing."""
        return {
            "title": f"{topic} (Mock Generated)",
            "description": "This is a fallback generated course structure because the AI service was unavailable.",
            "modules": [
                {
                    "title": "Module 1: Foundations",
                    "description": "Basic concepts and terminology.",
                    "lessons": [
                        {"title": "Introduction to the Subject", "content_summary": "Overview of key concepts."},
                        {"title": "Historical Context", "content_summary": "How we got here."}
                    ]
                },
                {
                    "title": "Module 2: Core Principles",
                    "description": "Deep dive into the mechanics.",
                    "lessons": [
                        {"title": "Key Mechanism A", "content_summary": "Detailed explanation of mechanism A."},
                        {"title": "Key Mechanism B", "content_summary": "Detailed explanation of mechanism B."}
                    ]
                },
                 {
                    "title": "Module 3: Advanced Applications",
                    "description": "Real-world usage and complex scenarios.",
                    "lessons": [
                        {"title": "Case Studies", "content_summary": "Real world examples."},
                        {"title": "Future Trends", "content_summary": "Where the field is going."}
                    ]
                }
            ]
        }

    async def chat_with_context(self, message: str, context: str, history: List[Dict[str, str]] = []) -> str:
        """
        Answers a user question based on the provided RAG context and history.
        """
        if not self.client:
            return "I'm sorry, I can't answer that right now (AI initialization failed)."

        # Construct Prompt
        system_instruction = """
        You are Talos Tutor, an advanced AI study assistant for the Talosopolis platform.
        Your goal is to help students understand their course materials.
        
        INSTRUCTIONS:
        1. Answer the student's question based PRIMARILY on the provided Context.
        2. If the answer is in the Context, cite it (e.g., "According to the uploaded material...").
        3. If the answer is NOT in the Context, use your general knowledge but mention that it's not from their specific notes.
        4. Be concise, encouraging, and use a friendly tone.
        5. If the context is empty, just answer to the best of your ability as a helpful tutor.
        """
        
        prompt = f"""
        Context from Uploaded Materials:
        {context}
        
        Student Question: {message}
        """

        try:
            # Import fallback helper
            from ai_utils import generate_content_with_fallback
            
            response = await generate_content_with_fallback(
                self.client,
                contents=prompt,
                system_instruction=system_instruction
            )
            
            return response.text
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                 return "My neural link is overloaded (Google API Quota Exceeded). Please give me a moment to cooldown and try again."
            if "503" in error_msg:
                 return "I am currently experiencing high network traffic (Model Overloaded). Please try again in a few seconds."
            
            logger.error(f"Chat generation failed: {e}")
            return f"I'm having trouble connecting to my brain uplink. Error: {error_msg[:100]}..."
