import { LessonPlan, Note } from "../App";

export type CitationSource = {
  noteId?: string;
  noteTitle?: string;
  lessonPlanId?: string;
  lessonPlanTitle?: string;
};

/**
 * Normalizes a student query by removing common question phrases
 * and extracting the core concept or keyword
 */
export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim();
  
  // Remove common question phrases at the start
  const questionPhrases = [
    'what is',
    'what are',
    'what does',
    'what\'s',
    'how does',
    'how do',
    'how can',
    'how to',
    'why is',
    'why are',
    'why does',
    'why do',
    'when is',
    'when are',
    'when does',
    'when did',
    'where is',
    'where are',
    'who is',
    'who are',
    'which is',
    'which are',
    'can you explain',
    'explain',
    'tell me about',
    'describe',
    'define'
  ];
  
  for (const phrase of questionPhrases) {
    if (normalized.startsWith(phrase + ' ')) {
      normalized = normalized.substring(phrase.length).trim();
      break;
    }
  }
  
  // Remove trailing question marks and punctuation
  normalized = normalized.replace(/[?!.]+$/, '').trim();
  
  // Remove articles at the beginning
  const articles = ['a ', 'an ', 'the '];
  for (const article of articles) {
    if (normalized.startsWith(article)) {
      normalized = normalized.substring(article.length).trim();
      break;
    }
  }
  
  return normalized;
}

export function extractConciseAnswer(text: string, keywords: string[], primaryConcept?: string): string | null {
  const lines = text.split('\n').filter(line => line.trim());
  
  // First, look for exact concept definition (e.g., "Glucose: a simple sugar...")
  if (primaryConcept) {
    const conceptRegex = new RegExp(`^\\s*${primaryConcept}\\s*[:−-]`, 'i');
    const directDefinition = lines.find(line => conceptRegex.test(line));
    if (directDefinition) {
      // Clean up the definition
      const definition = directDefinition.replace(conceptRegex, '').trim();
      return definition.length > 250 ? definition.substring(0, 250) + '...' : definition;
    }
  }
  
  // Look for definition-style content (term: definition)
  const definitionLines = lines.filter(line => 
    line.includes(':') && 
    !line.includes('http') &&
    (primaryConcept ? line.toLowerCase().includes(primaryConcept) : 
     keywords.some(keyword => line.toLowerCase().includes(keyword)))
  );
  
  if (definitionLines.length > 0) {
    // Prioritize lines that start with the concept
    const priorityDefinition = definitionLines.find(line => {
      if (primaryConcept) {
        return line.toLowerCase().startsWith(primaryConcept) ||
               line.toLowerCase().startsWith('- ' + primaryConcept);
      }
      return false;
    });
    
    if (priorityDefinition) {
      const answer = priorityDefinition.trim();
      return answer.length > 250 ? answer.substring(0, 250) + '...' : answer;
    }
    
    // Return first 1-2 definition lines, concise
    const answer = definitionLines.slice(0, 2).join(' ').trim();
    return answer.length > 250 ? answer.substring(0, 250) + '...' : answer;
  }
  
  // Look for lines that contain the primary concept or keywords
  const matchingLines = lines.filter(line => {
    if (primaryConcept && line.toLowerCase().includes(primaryConcept)) {
      return true;
    }
    return keywords.some(keyword => line.toLowerCase().includes(keyword));
  });
  
  if (matchingLines.length > 0) {
    // Prioritize lines mentioning the primary concept
    const conceptLines = primaryConcept 
      ? matchingLines.filter(line => line.toLowerCase().includes(primaryConcept))
      : matchingLines;
    
    const linesToUse = conceptLines.length > 0 ? conceptLines : matchingLines;
    
    // Get first 2-3 matching sentences
    const answer = linesToUse.slice(0, 3).join(' ').trim();
    // Keep it concise - max 2-3 sentences
    const sentences = answer.match(/[^.!?]+[.!?]+/g) || [answer];
    const concise = sentences.slice(0, 3).join(' ').trim();
    return concise.length > 300 ? concise.substring(0, 300) + '...' : concise;
  }
  
  return null;
}

export function generateSmartResponse(
  userMessage: string,
  notes: Note[],
  lessonPlans: LessonPlan[]
): { content: string; relatedPlans: string[]; citation?: CitationSource } {
  const lowerMessage = userMessage.toLowerCase();
  const relatedPlans: string[] = [];
  
  // Normalize the query to extract core concept
  const normalizedQuery = normalizeQuery(userMessage);
  
  // Extract keywords from the normalized query
  const stopWords = ['what', 'when', 'where', 'which', 'about', 'this', 'that', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'does', 'they', 'their', 'there', 'been', 'being', 'were', 'was'];
  
  const keywords = normalizedQuery
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !stopWords.includes(word));
  
  // If we have a short normalized query (1-3 words), treat it as a primary concept
  const primaryConcept = normalizedQuery.split(/\s+/).length <= 3 ? normalizedQuery : null;
  
  // Score and find relevant notes
  const scoredNotes = notes.map(note => {
    const noteText = `${note.title} ${note.content} ${note.subject}`.toLowerCase();
    let score = 0;
    
    // Primary concept match gets highest priority
    if (primaryConcept && noteText.includes(primaryConcept)) {
      score += 20;
    }
    
    // Normalized query match (very high priority)
    if (noteText.includes(normalizedQuery)) {
      score += 15;
    }
    
    // Exact original phrase match gets high score
    if (noteText.includes(lowerMessage)) {
      score += 10;
    }
    
    // Title match bonus (concept mentioned in title is likely important)
    if (note.title.toLowerCase().includes(normalizedQuery)) {
      score += 8;
    }
    
    // Count keyword matches
    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = noteText.match(keywordRegex);
      if (matches) {
        score += matches.length * 2; // Multiple mentions = more relevant
      }
    });
    
    // Subject relevance - if the concept is in the subject name
    if (note.subject.toLowerCase().includes(normalizedQuery)) {
      score += 5;
    }
    
    return { note, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Score and find relevant lesson plans
  const scoredLessons = lessonPlans.map(plan => {
    let score = 0;
    const planText = `${plan.title} ${plan.subject} ${plan.description} ${plan.objectives.join(' ')} ${plan.activities.join(' ')}`.toLowerCase();
    
    // Primary concept match
    if (primaryConcept && planText.includes(primaryConcept)) {
      score += 18;
    }
    
    // Normalized query match
    if (planText.includes(normalizedQuery)) {
      score += 12;
    }
    
    // Exact phrase match
    if (planText.includes(lowerMessage)) {
      score += 10;
    }
    
    // Title match bonus
    if (plan.title.toLowerCase().includes(normalizedQuery)) {
      score += 8;
    }
    
    // Keyword matches with position weighting
    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      
      // Title mentions are worth more
      if (plan.title.toLowerCase().match(keywordRegex)) {
        score += 3;
      }
      
      // Description mentions
      if (plan.description.toLowerCase().match(keywordRegex)) {
        score += 2;
      }
      
      // Objective mentions
      plan.objectives.forEach(obj => {
        if (obj.toLowerCase().match(keywordRegex)) {
          score += 2;
        }
      });
      
      // Activity mentions
      if (plan.activities.join(' ').toLowerCase().match(keywordRegex)) {
        score += 1;
      }
    });
    
    return { plan, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  
  const relevantNotes = scoredNotes.map(item => item.note);
  const relevantLessons = scoredLessons.map(item => item.plan);
  
  // Track related plans
  relevantLessons.forEach(lesson => {
    if (!relatedPlans.includes(lesson.id)) {
      relatedPlans.push(lesson.id);
    }
  });

  // If we found relevant notes, use them to provide detailed answers
  if (relevantNotes.length > 0) {
    const topNote = relevantNotes[0];
    
    // Find the associated lesson plan
    let associatedLesson: LessonPlan | undefined;
    if (topNote.lessonPlanId) {
      associatedLesson = lessonPlans.find(p => p.id === topNote.lessonPlanId);
      if (associatedLesson && !relatedPlans.includes(associatedLesson.id)) {
        relatedPlans.push(associatedLesson.id);
      }
    }
    
    // Extract the most relevant answer from the note
    const extractedAnswer = extractConciseAnswer(topNote.content, keywords, primaryConcept || undefined);
    
    let response = '';
    
    if (extractedAnswer) {
      response = extractedAnswer;
    } else {
      // If no specific extract, provide first few meaningful lines
      const contentLines = topNote.content.split('\n').filter(line => line.trim());
      const snippet = contentLines.slice(0, 3).join(' ').trim();
      response = snippet.length > 250 ? snippet.substring(0, 250) + '...' : snippet;
    }
    
    // Add source citation with lesson plan title if available
    if (associatedLesson) {
      response += `\n\n(Source: ${topNote.title} from ${associatedLesson.title})`;
    } else {
      response += `\n\n(Source: ${topNote.title})`;
    }
    
    // Add references to other relevant materials if available
    if (relevantNotes.length > 1) {
      const otherNotes = relevantNotes.slice(1, 2);
      response += `\n\nYou might also check: ${otherNotes.map(n => n.title).join(', ')}`;
    }
    
    // Create citation data
    const citation: CitationSource = {
      noteId: topNote.id,
      noteTitle: topNote.title,
      lessonPlanId: associatedLesson?.id,
      lessonPlanTitle: associatedLesson?.title
    };
    
    return {
      content: response,
      relatedPlans,
      citation
    };
  }
  
  // If no notes but relevant lessons found
  if (relevantLessons.length > 0) {
    const topLesson = relevantLessons[0];
    
    if (!relatedPlans.includes(topLesson.id)) {
      relatedPlans.push(topLesson.id);
    }
    
    // Try to extract answer from lesson description and objectives
    let response = '';
    
    // Check if description contains the answer
    const descriptionMatch = keywords.some(keyword => 
      topLesson.description.toLowerCase().includes(keyword)
    );
    
    if (descriptionMatch) {
      response = topLesson.description;
    } else {
      // Look in objectives
      const relevantObjective = topLesson.objectives.find(obj =>
        keywords.some(keyword => obj.toLowerCase().includes(keyword))
      );
      
      if (relevantObjective) {
        response = relevantObjective;
      } else {
        response = topLesson.description;
      }
    }
    
    // Keep it concise
    const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
    response = sentences.slice(0, 2).join(' ').trim();
    
    response += `\n\n(Source: ${topLesson.title})`;
    
    // Suggest checking notes if available
    const lessonNotes = notes.filter(n => n.lessonPlanId === topLesson.id);
    if (lessonNotes.length > 0) {
      response += `\n\nFor more details, see: ${lessonNotes.map(n => n.title).join(', ')}`;
    }
    
    const citation: CitationSource = {
      lessonPlanId: topLesson.id,
      lessonPlanTitle: topLesson.title
    };
    
    return {
      content: response,
      relatedPlans,
      citation
    };
  }

  // Default response when no relevant lessons or notes found
  if (lessonPlans.length === 0 && notes.length === 0) {
    return {
      content: "I don't have any lesson plans or study notes to reference yet. Once your teachers upload materials, I'll be able to help answer questions about them!",
      relatedPlans: []
    };
  }

  let defaultResponse = `I couldn't find that in the current notes, but I can help with these topics:\n\n`;
  
  if (lessonPlans.length > 0) {
    defaultResponse += `📚 Available Lessons:\n${lessonPlans.slice(0, 3).map(plan => `• ${plan.title}`).join('\n')}`;
    if (lessonPlans.length > 3) {
      defaultResponse += `\n• ...and ${lessonPlans.length - 3} more`;
    }
    defaultResponse += '\n\n';
  }
  
  if (notes.length > 0) {
    defaultResponse += `📝 Study Notes:\n${notes.slice(0, 3).map(note => `• ${note.title}`).join('\n')}`;
    if (notes.length > 3) {
      defaultResponse += `\n• ...and ${notes.length - 3} more`;
    }
    defaultResponse += '\n\n';
  }
  
  defaultResponse += 'Try asking about one of these specific topics!';
  
  return {
    content: defaultResponse,
    relatedPlans: []
  };
}
