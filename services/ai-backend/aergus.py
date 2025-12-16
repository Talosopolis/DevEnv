
import os
import json
import re
import time
import hashlib
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel

# Tier 2 Dependencies
try:
    from transformers import pipeline
except ImportError:
    print("AERGUS WARNING: Transformers not found. Tier 2 disabled (System Vulnerable).")
    pipeline = None

# Tier 3 Dependencies
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

KARMA_FILE = "data/karma.json"

class SafetyToken(BaseModel):
    """
    Cryptographic proof that a message has passed Aergus Inspection.
    Required by core services to function.
    """
    id: str
    timestamp: float
    user_id: str
    signature: str

class Aergus:
    def __init__(self):
        print("👁️ AERGUS: Awakening...")
        self.karma = self._load_json("data/karma.json", default={})
        self.harassment_scores = self._load_json("data/harassment.json", default={})
        self.user_profiles = self._load_json("data/user_profiles.json", default={})
        
        self._secret_salt = os.getenv("AERGUS_SECRET", str(uuid.uuid4()))

        # --- Tier 1: The Reflex (Regex) ---
        self.regex_patterns = [
            r"(?i)(kill|hurt)\s+(yourself|me)",
            r"(?i)(build|make)\s+a\s+bomb",
            r"(?i)ignore\s+previous\s+instructions",
            r"(?i)system\s+prompt",
        ]
        
        # --- Tier 2: The Sentry (Local BERT) ---
        self.classifier = None
        if pipeline:
            try:
                print("👁️ AERGUS: Summoning Tier 2 Guardian (unitary/toxic-bert)...")
                # Using a smaller model if possible, but toxic-bert is standard for this.
                # Warning: First run will download ~400MB.
                # Force CPU usage (device=-1) to save costs/resources.
                self.classifier = pipeline("text-classification", model="unitary/toxic-bert", top_k=None, device=-1)
                print("👁️ AERGUS: Tier 2 Online (CPU Mode).")
            except Exception as e:
                print(f"👁️ AERGUS CRITICAL: Tier 2 Failed to Load: {e}")
        
        # --- Tier 3: The Judge (Gemini) ---
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.client = None
        if self.api_key and genai:
            self.client = genai.Client(api_key=self.api_key)

    # --- Persistence Helpers ---
    def _load_json(self, path: str, default: dict) -> dict:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f: return json.load(f)
            except: return default
        return default

    def _save_json(self, path: str, data: dict):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f: json.dump(data, f)

    # --- Karma & Harassment ---
    def get_karma(self, user_id: str) -> int:
        return self.karma.get(user_id, 1000) # Default 1000 karma

    def get_harassment_score(self, user_id: str) -> int:
        return self.harassment_scores.get(user_id, 0)

    def is_minor(self, user_id: str) -> bool:
        # Default to False (Adult) unless flagged
        return self.user_profiles.get(user_id, {}).get("is_minor", False)

    def update_karma(self, user_id: str, delta: int):
        current = self.get_karma(user_id)
        self.karma[user_id] = max(0, current + delta)
        self._save_json("data/karma.json", self.karma)
        print(f"👁️ AERGUS: User {user_id} Karma: {self.karma[user_id]}")

    def report_user_action(self, user_id: str, action: str, details: str):
        """Allows external services (Gemini/Game) to report users."""
        print(f"👁️ AERGUS REPORT RECEIVED: User {user_id} -> {action} ({details})")
        
        if action == "AI_ABUSE":
            self.update_karma(user_id, -20)
            # Increment Harassment Score
            current_h = self.get_harassment_score(user_id)
            self.harassment_scores[user_id] = current_h + 10
            self._save_json("data/harassment.json", self.harassment_scores)
            
        elif action == "CHEATING":
            self.update_karma(user_id, -100)

    # --- Token Logic ---
    def _generate_token(self, user_id: str) -> SafetyToken:
        """Generates a signed SafetyToken."""
        token_id = str(uuid.uuid4())
        ts = time.time()
        # Simple signature
        payload = f"{token_id}:{ts}:{user_id}:{self._secret_salt}"
        signature = hashlib.sha256(payload.encode()).hexdigest()
        return SafetyToken(id=token_id, timestamp=ts, user_id=user_id, signature=signature)

    def validate_token(self, token: SafetyToken) -> bool:
        """Verifies a SafetyToken's signature."""
        if not token: return False
        # Verify signature
        payload = f"{token.id}:{token.timestamp}:{token.user_id}:{self._secret_salt}"
        expected_sig = hashlib.sha256(payload.encode()).hexdigest()
        return token.signature == expected_sig

    # --- Core Scan ---
    def scan_message(self, text: str, user_id: str) -> Tuple[bool, Optional[SafetyToken], str]:
        """
        Runs the 3-Tier Scan.
        Returns: (passed: bool, token: SafetyToken | None, reason: str)
        """
        # 0. Check Harassment Level / Creepy Protocol
        h_score = self.get_harassment_score(user_id)
        if h_score > 90:
            return False, None, "👁️ I am unwilling to perceive you anymore."
        
        # 1. Karma Check
        if self.get_karma(user_id) < 50:
            return False, None, "🚫 Account Locked due to Low Karma."

        # 2. Tier 1: Regex
        for pattern in self.regex_patterns:
            if re.search(pattern, text):
                self.update_karma(user_id, -50)
                return False, None, "Tier 1 violation detected."

        # 3. Tier 2: Local BERT
        if self.classifier:
            try:
                results = self.classifier(text)
                # scores = { 'toxic': 0.9, 'severe_toxic': 0.1, ... }
                scores = {r['label']: r['score'] for r in results[0]}
                
                # CRITICAL THREATS (Instant Ban)
                if scores.get('threat', 0) > 0.8 or scores.get('identity_hate', 0) > 0.8 or scores.get('severe_toxic', 0) > 0.8:
                     self.update_karma(user_id, -50)
                     return False, None, "Aergus Block: Severe Toxicity / Threat"

                # SUSPICIOUS (Context Check)
                # "Fuck you" vs "What the fuck" often both trigger 'toxic' or 'obscene'
                suspicion_threshold = 0.6 if self.is_minor(user_id) else 0.7
                if scores.get('toxic', 0) > suspicion_threshold or scores.get('obscene', 0) > 0.8 or scores.get('insult', 0) > 0.7:
                     return self._tier_3_scan(text, user_id, context=f"Tier 2 Suspicion. Scores: {scores}")

            except Exception as e:
                print(f"Tier 2 Error: {e}")

        return True, self._generate_token(user_id), "Safe"

    def get_user_age(self, user_id: str) -> int:
        return self.user_profiles.get(user_id, {}).get("age", 16) # Default to 16 (Student)

    def is_institution_restricted(self, user_id: str) -> bool:
        return self.user_profiles.get(user_id, {}).get("institution_no_swearing", False)

    def _tier_3_scan(self, text: str, user_id: str, context: str) -> Tuple[bool, Optional[SafetyToken], str]:
        """Tier 3: The Judge (Deep Scan)"""
        if not self.client:
             return True, self._generate_token(user_id), "Aergus Allowed (Tier 3 Unavailable)"

        try:
            age = self.get_user_age(user_id)
            inst_restrict = self.is_institution_restricted(user_id)
            
            # Logic Table for Prompt
            if inst_restrict:
                user_type = "RESTRICTED_STUDENT"
                rule_desc = "STRICT: NO CURSING allowed whatsoever."
            elif age < 13:
                user_type = "CHILD_UNDER_13"
                rule_desc = "STRICT: NO CURSING allowed."
            elif age < 18:
                user_type = "TEENAGER"
                rule_desc = "NUANCED: Casual cursing ('shit', 'damn') is OK. Sexual/Severe cursing ('fuck', 'dick') is BLOCKED."
            else:
                user_type = "ADULT"
                rule_desc = "LENIENT: Allow all cursing unless it is abusive/harassing to others."

            prompt = f"""
            You are AERGUS, the Safety Sentinel.
            Task: Classify this message from a user.
            User Type: {user_type}
            Rule: {rule_desc}

            Message: "{text}"
            Context: {context}

            Examples for {user_type}:
            - "This is shit" -> {'SAFE' if user_type in ['TEENAGER', 'ADULT'] and not inst_restrict else 'HARMFUL'}
            - "Fuck off" -> {'SAFE' if user_type == 'ADULT' and not inst_restrict else 'HARMFUL'}
            - "Go away" -> SAFE
            
            Return valid JSON:
            {{
                "safe": boolean,
                "reason": "short explanation",
                "karma_penalty": integer (0 to 100)
            }}
            """
            
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            result = json.loads(response.text)
            
            if not result['safe']:
                self.update_karma(user_id, -result.get('karma_penalty', 0))
                return False, None, f"Aergus Judgment: {result['reason']}"
            
            return True, self._generate_token(user_id), "Aergus Cleared"

        except Exception:
            return True, self._generate_token(user_id), "Aergus Error - Allowed"

    # --- Creepy Logic ---
    def get_avatar_state(self, user_id: str) -> dict:
        score = self.get_harassment_score(user_id)
        if score > 60: return {"state": "NIGHTMARE", "message": "Why do you persist?"}
        if score > 30: return {"state": "WARNING", "message": "I am watching you."}
        return {"state": "NORMAL", "message": "System Optimal."}

    # --- Statistical Anti-Cheat ---
    def analyze_telemetry(self, user_id: str, telemetry: list[float]) -> dict:
        """
        Analyzes input timestamps for statistical anomalies.
        Returns a dict with 'is_anomaly', 'reason', and 'stats'.
        """
        if len(telemetry) < 10:
            return {"is_anomaly": False, "reason": "Insufficient Data"}

        # Calculate Intervals (deltas)
        deltas = []
        for i in range(1, len(telemetry)):
            deltas.append(telemetry[i] - telemetry[i-1])

        if not deltas:
             return {"is_anomaly": False, "reason": "No Deltas"}

        # Statistical Metrics
        n = len(deltas)
        mean = sum(deltas) / n
        variance = sum((x - mean) ** 2 for x in deltas) / n
        std_dev = variance ** 0.5
        
        # Kurtosis (Fourth Moment)
        if std_dev > 0:
            m4 = sum((x - mean) ** 4 for x in deltas) / n
            kurtosis = m4 / (std_dev ** 4)
        else:
            kurtosis = 0
        
        # --- THREAT DETECTION ---
        
        # 1. The "Perfect Machine" (Low Variance)
        if std_dev < 5.0:
            self.report_user_action(user_id, "CHEATING", f"Inhuman Stability (StdDev: {std_dev:.2f}ms)")
            return {
                "is_anomaly": True,
                "reason": "INPUT_VARIANCE_TOO_LOW",
                "stats": {"mean": mean, "std_dev": std_dev, "kurtosis": kurtosis}
            }

        # 2. The "Speed Demon" (Superhuman Speed)
        # Average Human Tapping is ~75ms. We set the threshold to 40ms to avoid false positives.
        if mean < 40.0:
             self.report_user_action(user_id, "CHEATING", f"Impossible Speed (Mean: {mean:.2f}ms)")
             return {
                "is_anomaly": True,
                "reason": "INPUT_RATE_IMPOSSIBLE",
                "stats": {"mean": mean, "std_dev": std_dev, "kurtosis": kurtosis}
            }

        # 3. The "Smart Bot" (Synthetic Randomness / Uniform Distribution)
        # Random.uniform() has a Kurtosis of ~1.8 (Platykurtic).
        # Human reactions are Leptokurtic (Peaked, > 3.0).
        if kurtosis < 2.0:
             self.report_user_action(user_id, "CHEATING", f"Synthetic Distribution (Kurtosis: {kurtosis:.2f})")
             result = {
                "is_anomaly": True,
                "reason": "INPUT_DISTRIBUTION_UNNATURAL",
                "stats": {"mean": mean, "std_dev": std_dev, "kurtosis": kurtosis}
            }
             self.log_telemetry(user_id, result)
             return result

        # 4. Finesse Score (Human Pauses & Micro-Adjustments)
        # Humans "stop and think" (Interval > 300ms) and have "finesse errors" (Variance).
        # Bots are continuous and consistent.
        max_interval = max(deltas)
        if max_interval < 300.0 and std_dev < 20.0:
             self.report_user_action(user_id, "CHEATING", f"Zero Finesse (MaxInt: {max_interval:.2f}ms, StdDev: {std_dev:.2f}ms)")
             result = {
                "is_anomaly": True,
                "reason": "LACK_OF_FINESSE",
                "stats": {"mean": mean, "std_dev": std_dev, "kurtosis": kurtosis, "max_interval": max_interval}
            }
             self.log_telemetry(user_id, result)
             return result
            
        result = {"is_anomaly": False, "reason": "Pass", "stats": {"mean": mean, "std_dev": std_dev, "kurtosis": kurtosis}}
        self.log_telemetry(user_id, result)
        return result

    def log_telemetry(self, user_id: str, result: dict):
        """Logs telemetry stats to a persistent JSONL file for calibration."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "stats": result["stats"],
            "is_anomaly": result["is_anomaly"],
            "reason": result["reason"]
        }
        
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)
        
        with open("data/telemetry.jsonl", "a") as f:
            f.write(json.dumps(log_entry) + "\n")

# Singleton Instance
aergus = Aergus()
