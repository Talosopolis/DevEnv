from fastapi import UploadFile
import shutil
import os

# Simulated Vector Store (In-Memory)
# In production, this would be Vertex AI Vector Search or Weaviate
VECTOR_STORE = {}

class RAGService:
    def __init__(self):
        self.upload_dir = "uploaded_materials"
        os.makedirs(self.upload_dir, exist_ok=True)

    async def ingest_file(self, file: UploadFile, course_id: str):
        file_path = os.path.join(self.upload_dir, file.filename)
        
        # Save file locally (simulating Cloud Storage upload)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Simulate Embedding Generation & Indexing
        # In reality: Call Gemini Embeddings API -> Store in Vector DB
        doc_id = f"{course_id}_{file.filename}"
        VECTOR_STORE[doc_id] = {
            "filename": file.filename,
            "course_id": course_id,
            "status": "indexed",
            "mock_embedding": [0.1, 0.2, 0.3], # Placeholder 768-dim vector
            "text_content": "" # To be populated by main.py after parsing
        }
        
        return {
            "status": "success",
            "document_id": doc_id,
            "message": f"Successfully ingested {file.filename} for course {course_id}"
        }

    def add_text_to_index(self, course_id: str, filename: str, text: str):
        doc_id = f"{course_id}_{filename}"
        if doc_id in VECTOR_STORE:
            VECTOR_STORE[doc_id]["text_content"] = text
            print(f"Indexed text for {doc_id} ({len(text)} chars)")

    def search_context(self, query: str, course_id: str = None) -> str:
        # Simple Keyword/Substring Search (Mock RAG)
        # In production this would use Vector Search (Cosine Similarity)
        results = []
        query_terms = query.lower().split()
        
        for doc_id, doc in VECTOR_STORE.items():
            if course_id and doc["course_id"] != course_id:
                continue
                
            content = doc.get("text_content", "")
            if not content:
                continue
                
            # Naive scoring: count term matches
            score = 0
            lower_content = content.lower()
            for term in query_terms:
                if len(term) > 3 and term in lower_content:
                    score += 1
            
            if score > 0:
                # Extract relevant snippet (naive window around first match)
                first_match_idx = lower_content.find(query_terms[0]) if query_terms else -1
                if first_match_idx != -1:
                    start = max(0, first_match_idx - 200)
                    end = min(len(content), first_match_idx + 800)
                    snippet = content[start:end]
                    results.append((score, f"From {doc['filename']}: ...{snippet}..."))
                    
        # Sort by score descending
        results.sort(key=lambda x: x[0], reverse=True)
        
        # Return top 3 unique snippets
        top_snippets = [r[1] for r in results[:3]]
        return "\n\n".join(top_snippets) if top_snippets else ""
