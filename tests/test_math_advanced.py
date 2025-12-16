import requests
import json
import random

URL = "http://localhost:8000/generate-quiz"

def test_topic(topic, difficulty="medium", name="Test"):
    print(f"\n--- {name} ({topic}/{difficulty}) ---")
    try:
        res = requests.post(URL, json={
            "topic": topic,
            "difficulty": difficulty
        })
        if res.status_code == 200:
            data = res.json()
            print(f"Q: {data.get('question')}")
            print(f"A: {data.get('options')[data.get('correct_option_index')]}")
            print(f"Exp: {data.get('explanation')}")
        else:
            print(f"Error: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Exception: {e}")

# 1. Test Generic Math (Should trigger MathGen)
test_topic("math", "medium", "Generic Math (Practice Check)")

# 2. Test Spartan/Expert (Should trigger Pre-Calc including Trig/Integrals)
# We have to spam a bit since it selects random topics
print("\n--- Spamming Expert for Trig/Integrals ---")
for _ in range(10):
    test_topic("math", "expert", "Expert Attempt")
