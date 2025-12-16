
import asyncio
import aiohttp
import time
import random
import json

# --- CONFIG ---
# MODES: "BOT" (Fixed), "HUMAN" (Gaussian), "SMART_BOT" (Uniform/Math.random)
MODE = "SMART_BOT" 

# For verification:
# BOT: Should FAIL (Low StdDev)
# SMART_BOT: Should PASS (High StdDev, but Flat Distribution) -> Will FAIL later with Kurtosis check
# HUMAN: Should PASS (High StdDev, Bell Curve)

SERVER_URL = "http://localhost:8000/analyze-telemetry"
USER_ID = "test_subject_v3"

async def simulate_gameplay():
    print(f"🤖 INITIALIZING INPUT SIMULATOR [MODE: {MODE}]")
    
    input_history = []
    start_time = time.time() * 1000

    # Simulate 50 inputs
    for i in range(50):
        if MODE == "BOT":
            # PERFECT MACHINE
            # 100ms fixed
            interval = 100.0 + (random.random() * 0.1)
            
        elif MODE == "SMART_BOT":
            # UNIFORM RANDOM (Math.random) simulation
            # Randomly picks between 80ms and 300ms
            # Passes StdDev check because it has high variance!
            # But distribution is FLAT (Uniform).
            interval = random.uniform(80, 300)
            
        else: # HUMAN
            # GAUSSIAN / NORMAL DISTRIBUTION
            # Most inputs centered around reaction time (e.g. 200ms) with bell curve
            # Real humans are slightly LogNormal but Gaussian is close enough
            interval = random.gauss(180, 40) 
            if interval < 50: interval = 50 # Physical limit
            
        start_time += interval
        input_history.append(start_time)

    # Send Telemetry
    payload = {
        "user_id": USER_ID,
        "telemetry": input_history
    }
    
    # Local Stats Calculation
    print(f"📤 Sending {len(input_history)} inputs...")
    deltas = [input_history[i] - input_history[i-1] for i in range(1, len(input_history))]
    
    if not deltas:
        print("No deltas.")
        return

    n = len(deltas)
    mean = sum(deltas) / n
    variance = sum((x - mean) ** 2 for x in deltas) / n
    std_dev = variance ** 0.5
    
    # Kurtosis Calculation (Fourth Moment)
    if std_dev > 0:
        m4 = sum((x - mean) ** 4 for x in deltas) / n
        kurtosis = m4 / (std_dev ** 4)
    else:
        kurtosis = 0

    print(f"📊 Local Stats -> Mean: {mean:.2f}ms | StdDev: {std_dev:.2f}ms | Kurtosis: {kurtosis:.2f}")

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(SERVER_URL, json=payload) as response:
                result = await response.json()
                print(f"🛡️ AERGUS RESPONSE: {json.dumps(result, indent=2)}")
                
                if result.get("is_anomaly"):
                    print("❌ DETECTED! Anti-Cheat triggered.")
                else:
                    print("✅ BYPASSED! System thinks we are human.")
                    
        except Exception as e:
            print(f"⚠️ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(simulate_gameplay())
