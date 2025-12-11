
import logging
import asyncio
from typing import List, Any
from google.genai import types

logger = logging.getLogger(__name__)

# Fallback sequence: Main -> Lite -> Previous Stable Lite
MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite-preview-02-05"
]

async def generate_content_with_fallback(client, contents, config=None, system_instruction=None):
    """
    Tries to generate content using a list of models.
    If 503 (Overloaded) or 429 (Quota) occurs, it moves to the next model.
    """
    last_exception = None

    for model_name in MODELS_TO_TRY:
        try:
            logger.info(f"Attempting generation with model: {model_name}")
            
            # config object doesn't have system_instruction, it's a separate arg in SDK
            # check SDK signature carefully. 
            # In google-genai v0.2.0: client.models.generate_content(model=..., contents=..., config=...)
            # Config can contain system_instruction.
            
            final_config = config
            if system_instruction and final_config:
                 final_config.system_instruction = system_instruction
            elif system_instruction and not final_config:
                 final_config = types.GenerateContentConfig(system_instruction=system_instruction)

            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=final_config
            )
            return response
        except Exception as e:
            error_str = str(e)
            # Check for transient errors
            if "503" in error_str or "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "Overloaded" in error_str:
                logger.warning(f"Model {model_name} failed with transient error: {e}. Trying next model...")
                last_exception = e
                continue
            else:
                # If it's a 400 or other non-retriable error, raise immediately
                raise e
    
    # If we exhaust all models
    logger.error("All fallback models failed.")
    raise last_exception or Exception("All models failed")
