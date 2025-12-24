import json
import os
from typing import Dict, Any

DATA_FILE = "courses.json"

class PersistenceService:
    def __init__(self, data_file: str = DATA_FILE):
        self.data_file = data_file
        self.ensure_file_exists()

    def ensure_file_exists(self):
        if not os.path.exists(self.data_file):
            with open(self.data_file, 'w') as f:
                json.dump({}, f)

    def load_courses(self) -> Dict[str, Any]:
        try:
            with open(self.data_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def save_courses(self, courses_db: Dict[str, Any]):
        try:
            with open(self.data_file, 'w') as f:
                json.dump(courses_db, f, indent=4)
        except Exception as e:
            print(f"Error saving courses: {e}")
