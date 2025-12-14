from fastapi import UploadFile
import shutil
import os

import json

# Configurable Persistence
DATA_DIR = os.getenv("DATA_DIR", "data")
os.makedirs(DATA_DIR, exist_ok=True)

VECTOR_STORE_PATH = os.path.join(DATA_DIR, "vector_store.json")

class RAGService:
    def __init__(self):
        self.upload_dir = os.path.join(DATA_DIR, "uploaded_materials")
        os.makedirs(self.upload_dir, exist_ok=True)
        self.vector_store = self._load_store()

    def _load_store(self):
        if os.path.exists(VECTOR_STORE_PATH):
            try:
                with open(VECTOR_STORE_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Failed to load vector store: {e}")
        return {}

    def _save_store(self):
        try:
            with open(VECTOR_STORE_PATH, "w") as f:
                json.dump(self.vector_store, f)
        except Exception as e:
            print(f"Failed to save vector store: {e}")

    async def ingest_file(self, file: UploadFile, course_id: str):
        file_path = os.path.join(self.upload_dir, file.filename)
        
        # Save file locally (simulating Cloud Storage upload)
        # Save file locally (simulating Cloud Storage upload)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Simulate Embedding Generation & Indexing
        # In reality: Call Gemini Embeddings API -> Store in Vector DB
        doc_id = f"{course_id}_{file.filename}"
        self.vector_store[doc_id] = {
            "filename": file.filename,
            "course_id": course_id,
            "status": "indexed",
            "mock_embedding": [0.1, 0.2, 0.3], # Placeholder 768-dim vector
            "text_content": "", # To be populated by main.py after parsing
            "chunks": []
        }
        self._save_store()
        
        return {
            "status": "success",
            "document_id": doc_id,
            "message": f"Successfully ingested {file.filename} for course {course_id}"
        }

    def add_text_to_index(self, course_id: str, filename: str, text: str):
        doc_id = f"{course_id}_{filename}"
        if doc_id in self.vector_store:
            # Chunk the text
            chunks = self._chunk_text(text)
            self.vector_store[doc_id]["chunks"] = chunks
            self.vector_store[doc_id]["text_content"] = text # Keep valid for direct reference if needed
            self._save_store()
            print(f"Indexed {len(chunks)} chunks for {doc_id}")

    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> list:
        """Splits text into overlapping chunks."""
        if not text:
            return []
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += (chunk_size - overlap)
        return chunks

    def search_context(self, query: str, token: object, course_id: str = None) -> str:
        """
        Smart Search: Finds the most relevant chunks based on keyword density.
        REQUIRES valid SafetyToken.
        """
        from aergus import aergus
        if not aergus.validate_token(token):
             print(f"RAG ACCESS DENIED: Invalid or Missing SafetyToken")
             return ""

        results = []
        
        # STOP WORDS for filtering instead of strict length
        STOP_WORDS = {"what", "when", "where", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"}
        
        # Tokenize and filter
        query_terms = [t.lower() for t in query.replace("?", "").replace(".", "").split()]
        filtered_terms = [t for t in query_terms if t not in STOP_WORDS and len(t) >= 2] # Allow 'x', 'pi', etc if needed, or at least 2 chars
        
        if not filtered_terms:
            # Fallback if everything was filtered
            filtered_terms = query_terms

        for doc_id, doc in self.vector_store.items():
            if course_id and doc["course_id"] != course_id:
                continue
                
            chunks = doc.get("chunks", [])
            for chunk in chunks:
                score = 0
                lower_chunk = chunk.lower()
                
                # TF-IDF style scoring (simplified)
                for term in filtered_terms:
                    count = lower_chunk.count(term)
                    if count > 0:
                        score += (count * 2) # Base score
                
                if score > 0:
                    results.append((score, f"From {doc['filename']}:\n{chunk}"))
                    
        # Sort by score descending
        results.sort(key=lambda x: x[0], reverse=True)
        
        # Return top 3 unique chunks
        top_chunks = [r[1] for r in results[:3]]
        return "\n\n---\n\n".join(top_chunks) if top_chunks else ""
