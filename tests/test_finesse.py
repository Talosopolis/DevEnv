import requests
import json
import random

URL = "http://localhost:8000/analyze-telemetry"
USER_ID = "test_finesse"

def test(name, deltas):
    # Construct telemetry from deltas (cumulative sum)
    telemetry = []
    curr = 1000000
    telemetry.append(curr)
    for d in deltas:
        curr += d
        telemetry.append(curr)
        
    print(f"\n--- Testing: {name} ---")
    print(f"Deltas: {deltas[:5]}... (Len: {len(deltas)})")
    
    try:
        res = requests.post(URL, json={"user_id": USER_ID, "telemetry": telemetry})
        data = res.json()
        print(f"Result: {data['is_anomaly']} | Reason: {data.get('reason')} | Stats: {data.get('stats')}")
    except Exception as e:
        print(f"Error: {e}")

# 1. Zero Finesse (Perfect Machine)
# Mean: 100ms, StdDev: 0, Max: 100ms
test("Zero Finesse (Machine)", [100] * 20)

# 2. Thinking Pause
# Mean: ~120ms, StdDev: High, Max: 500ms
deltas_think = [100] * 19 + [500]
test("Human Thinking (Pause)", deltas_think)

# 3. High Finesse (Jitter)
# Mean: 100ms, StdDev: High (~28ms), Max: 140ms (No pause but high variance)
deltas_jitter = [random.randint(60, 140) for _ in range(20)]
test("Human Finesse (Jitter)", deltas_jitter)
