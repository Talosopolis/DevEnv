
import os
import asyncio
from dotenv import load_dotenv
from google import genai

load_dotenv()

async def test():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("No API Key found")
        return

    print(f"Testing with Key: {api_key[:5]}...")
    
    client = genai.Client(api_key=api_key)
    
    # Try 2.5 Flash Lite
    try:
        print("\nAttempting gemini-2.5-flash-lite...")
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents="Hello"
        )
        print("Success with gemini-2.5-flash-lite")
    except Exception as e:
        print(f"Failed gemini-2.5-flash-lite: {e}")

    # Try 2.0 Flash Lite (Stable)
    try:
        print("\nAttempting gemini-2.0-flash-lite...")
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite", 
            contents="Hello"
        )
        print("Success with gemini-2.0-flash-lite")
    except Exception as e:
        print(f"Failed gemini-2.0-flash-lite: {e}")

if __name__ == "__main__":
    asyncio.run(test())
