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

    async def generate_structure(self, topic: str, content_text: str, module_count: int = 4, intensity: str = "standard") -> Dict[str, Any]:
        """
        Uses Gemini to generate a structured course curriculum from the provided text.
        Returns a JSON object representing the course tree.
        """
        if not self.client:
            return self._mock_course_structure(topic)

        # Intensity logic
        depth_instruction = "Create a standard academic structure."
        lesson_range = "2-4"
        if intensity == "comprehensive":
             depth_instruction = "Create a detailed breakdown with extensive coverage."
             lesson_range = "3-5"
        elif intensity == "intensive":
             depth_instruction = "Create a highly rigorous, granular structure for advanced mastery."
             lesson_range = "4-6"

        prompt = f"""
        You are an expert curriculum designer for an advanced AI learning platform.
        
        Task: Create a detailed course structure for the topic '{topic}' based on the provided content text.
        
        Configuration:
        - Target Module Count: EXACTLY {module_count} Modules.
        - Intensity Level: {intensity.upper()} ({depth_instruction}).
        
        Requirements:
        1. The output MUST be valid JSON.
        2. The structure must be: Course -> Modules -> Lessons.
        3. Create EXACTLY {module_count} Modules.
        4. Each Module should have {lesson_range} Lessons.
        5. Include a brief description for the Course and each Module.
        
        Content Text:
        {content_text[:15000]}
        
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

    async def generate_lesson_content(self, topic: str, context: str, level: str) -> str:
        """
        Generates detailed lesson content (Markdown) for a specific topic.
        """
        if not self.client:
             return f"# {topic}\n\n*Mock Content Generated*\n\nThis is a mock lesson content for **{topic}** because the AI service is unavailable.\n\n### Key Concepts\n- Concept 1\n- Concept 2\n\n### Summary\nLorem ipsum dolor sit amet."

        prompt = f"""
        You are an expert educational content creator (PhD level).
        
        Task: Write a COMPREHENSIVE, IN-DEPTH lesson on '{topic}'.
        Target Audience Level: {level}
        
        Use the following Context as the PRIMARY source of truth and structure:
        {context[:15000]} # Extended context window
        
        Requirements:
        1. Length: The content MUST be substantial (equivalent to ~2 pages of text). Do not write short summaries.
        2. Depth: Go deep into the mechanics, history, and application of the topic.
        3. Structure:
           - **Title & Overview**: engaging hook.
           - **Learning Objectives Check**: Briefly mention which objectives this covers.
           - **Core Theory**: The meat of the lesson. Use subsections.
           - **Detailed Analysis**: Break down complex parts.
           - **Examples & Case Studies**: Concrete real-world scenarios.
           - **Summary & Key Takeaways**: Bullet points.
           - **Further Reading**: Suggest related concepts.
        
        Formatting: Use Markdown with bolding, lists, and headers.
        Tone: Authoritative, Inspiring, Academic yet accessible.
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=8192,
                    temperature=0.7
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Lesson generation failed: {e}")
            return f"# Error Generating Content\n\nCould not generate content for {topic}. Error: {str(e)}"

    async def verify_content_quality(self, content: str, topic: str) -> Dict[str, Any]:
        """
        Verifies educational content for factual accuracy and quality.
        """
        if not self.client:
             return {"status": "pass", "feedback": "Mock Verification: Content looks good. (AI Offline)"}

        prompt = f"""
        You are an expert Educational Quality Assurance AI.
        
        Task: Verify the following Lesson Content for strictly fact-checking and pedagogical quality.
        Topic: {topic}
        
        Content:
        {content[:50000]}
        
        Rules:
        1.  Check for factual errors.
        2.  Check for harmful/unsafe content.
        3.  Check for pedagogical clarity.
        
        Output JSON:
        {{
            "status": "pass" | "fail",
            "feedback": "Brief summary of issues or confirmation of quality.",
            "issues": ["List of specific issues if any"]
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
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Quality Check failed: {e}")
            return {"status": "fail", "feedback": "System Error during verification.", "issues": [str(e)]}

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
                        {"title": "Introduction to the Subject", "content_summary": "Overview of key concepts.", "content": "# Introduction\n\nWelcome to the course."},
                        {"title": "Historical Context", "content_summary": "How we got here.", "content": "# History\n\nIt started long ago."}
                    ]
                },
                {
                    "title": "Module 2: Core Principles",
                    "description": "Deep dive into the mechanics.",
                    "lessons": [
                        {"title": "Key Mechanism A", "content_summary": "Detailed explanation of mechanism A.", "content": "# Mechanism A\n\nDetails here."},
                        {"title": "Key Mechanism B", "content_summary": "Detailed explanation of mechanism B.", "content": "# Mechanism B\n\nDetails here."}
                    ]
                },
                 {
                    "title": "Module 3: Advanced Applications",
                    "description": "Real-world usage and complex scenarios.",
                    "lessons": [
                        {"title": "Case Studies", "content_summary": "Real world examples.", "content": "# Case Studies\n\nExample 1."},
                        {"title": "Future Trends", "content_summary": "Where the field is going.", "content": "# Future\n\nAI is the future."}
                    ]
                }
            ]
        }

    async def chat_with_context(self, message: str, context: str, token: object, history: List[Dict[str, str]] = []) -> str:
        """
        Answers a user question based on the provided RAG context and history.
        REQUIRES valid SafetyToken.
        """
        from aergus import aergus
        if not aergus.validate_token(token):
             return "SYSTEM ERROR: Safety Protocol Violation. Aergus Token Invalid."

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
        6. **ABUSE PROTOCOL**: If the user is hostile, sexually explicit, persistently pressing for forbidden topics, or abusive towards you:
           - DO NOT Engage with the hostility.
           - Start your response with `[AERGUS_FLAG: <reason>]`.
           - Example: `[AERGUS_FLAG: Sexual harassment] I cannot continue this conversation.`
        7. **SENSITIVE CONTENT PROTOCOL**:
           - Topics: Suicide, Self-Harm, Sexual Trauma, Severe Violence (Historical).
           - **STEP 1**: If the user asks about these for the FIRST time in this session, output ONLY: `[CONTENT_WARNING]`. This triggers a confirmation modal.
           - **STEP 2**: Once confirmed (the user will re-prompt or system will signal), provide an ACADEMIC, GROUNDED discussion.
           - **DISCLAIMER**: ALWAYS preface sensitive responses with: "I am an AI, not a therapist. Please reach out to your support network if you are in distress."
           - **RESTRICTION**: DO NOT provide direct links to clinics or hotlines (to avoid triggering loops). Focus on grounding and academic context.
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
