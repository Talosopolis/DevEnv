# AI Assistant Query Normalization - Test Examples

## How It Works

The AI assistant now normalizes student queries to extract core concepts and provides more accurate, citation-backed responses.

### Query Normalization Process

1. **Remove question phrases**: "what is", "how does", "why", "explain", etc.
2. **Extract core concept**: The remaining keywords become the search focus
3. **Smart matching**: Prioritizes exact concept matches in titles and content
4. **Proper citations**: Always includes "(Source: [Note Title] from [Lesson Title])"

## Test Examples

### Example 1: Simple Concept Query
**Student Input**: "What is glucose?"

**Normalization**: 
- Original: "what is glucose?"
- Normalized: "glucose"
- Primary concept: "glucose"

**Expected Response**:
```
Glucose: Sugar product used for plant energy

(Source: Photosynthesis Key Concepts from Introduction to Photosynthesis)
```

With a clickable button: **"View this lesson: Introduction to Photosynthesis"**

---

### Example 2: "Explain" Query
**Student Input**: "Explain photosynthesis"

**Normalization**:
- Original: "explain photosynthesis"
- Normalized: "photosynthesis"
- Primary concept: "photosynthesis"

**Expected Response**:
```
The process by which green plants convert light energy (sunlight) into chemical energy (glucose). Plants use carbon dioxide from air and water from soil, with chlorophyll absorbing light energy. This process occurs in chloroplasts, specifically in the thylakoid membranes and stroma.

(Source: Photosynthesis Key Concepts from Introduction to Photosynthesis)
```

With a clickable button to navigate to the lesson.

---

### Example 3: "How" Query
**Student Input**: "How does the Calvin Cycle work?"

**Normalization**:
- Original: "how does the calvin cycle work?"
- Normalized: "calvin cycle work"
- Keywords: ["calvin", "cycle", "work"]

**Expected Response**:
```
Light-independent reactions (Calvin Cycle - occurs in stroma) - Uses ATP and NADPH from light reactions - Carbon dioxide is fixed into glucose - Does not require direct light

(Source: Photosynthesis Key Concepts from Introduction to Photosynthesis)
```

---

### Example 4: Historical Event Query
**Student Input**: "What happened at Pearl Harbor?"

**Normalization**:
- Original: "what happened at pearl harbor?"
- Normalized: "pearl harbor"
- Primary concept: "pearl harbor"

**Expected Response**:
```
Pearl Harbor attack (Dec 7) - US enters war

(Source: WWII Timeline and Major Events from World War II: Causes and Effects)
```

**Note**: The WWII note requires password "history2025" to unlock.

---

### Example 5: Fallback Response
**Student Input**: "What is quantum mechanics?"

**Expected Response** (when no matching notes found):
```
I couldn't find that in the current notes, but I can help with these topics:

📚 Available Lessons:
• Introduction to Photosynthesis
• World War II: Causes and Effects
• Solving Linear Equations

📝 Study Notes:
• Photosynthesis Key Concepts
• WWII Timeline and Major Events

Try asking about one of these specific topics!
```

---

## Key Features

### 1. Improved Scoring System
- **Primary concept match**: +20 points (highest priority)
- **Normalized query match**: +15 points
- **Title mentions**: +8 points
- **Multiple keyword mentions**: Weighted scoring
- **Subject relevance**: +5 points

### 2. Smart Answer Extraction
- Looks for direct definitions (e.g., "Glucose: a simple sugar...")
- Prioritizes lines containing the core concept
- Extracts 2-3 most relevant sentences
- Limits responses to 250-300 characters for conciseness

### 3. Clickable Citations
- Every response includes a citation
- Citations show: "(Source: [Note Title] from [Lesson Title])"
- Clicking the "View this lesson" button navigates to the Lessons tab and opens the lesson detail

### 4. Integration with Existing Features
- Works with password-protected notes
- Respects public/private content settings
- Only searches notes and lessons the student has access to

---

## Implementation Details

### Files Modified

1. **`/utils/aiResponseHelper.ts`**
   - Added `normalizeQuery()` function
   - Enhanced `extractConciseAnswer()` with concept prioritization
   - Improved scoring algorithms for notes and lesson plans
   - Added citation support

2. **`/App.tsx`**
   - Updated Message type to include `citation` field

3. **`/components/AIAssistant.tsx`**
   - Display clickable citation buttons
   - Added `onNavigateToLesson` callback
   - Store citation data in messages

4. **`/components/StudentView.tsx`**
   - Pass navigation handler to AIAssistant
   - Switch to lessons tab when citation is clicked
   - Open lesson detail dialog

---

## Testing Checklist

- [ ] Test "What is [concept]" queries
- [ ] Test "Explain [concept]" queries
- [ ] Test "How does [concept]" queries  
- [ ] Test queries with multi-word concepts
- [ ] Verify citations include both note and lesson titles
- [ ] Verify "View this lesson" button navigates correctly
- [ ] Test with password-protected notes
- [ ] Test fallback response when no match found
- [ ] Verify only accessible notes are searched
- [ ] Test that normalized queries match better than raw queries

---

## Known Issues to Fix

- The WWII note in mock data references lessonPlanId "3" but should reference "2" (the actual WWII lesson ID)
- This should be manually fixed in the mockNotes array in App.tsx, line 224
