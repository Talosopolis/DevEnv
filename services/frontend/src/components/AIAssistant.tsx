import { useState, useRef, useEffect } from "react";
import { LessonPlan, Message, Conversation, Note } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Send, Bot, User, Save, Plus, ThumbsUp, ThumbsDown, Clock, X, BookOpen, FileText } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Alert, AlertDescription } from "./ui/alert";
import { generateSmartResponse, CitationSource } from "../utils/aiResponseHelper";

type AIAssistantProps = {
  lessonPlans: LessonPlan[];
  notes: Note[];
  studentName?: string | null;
  loadedConversation?: Conversation | null;
  onConversationComplete?: (conversation: Conversation) => void;
  onNewConversation?: () => void;
  onNavigateToLesson?: (lessonPlanId: string) => void;
};

export function AIAssistant({ 
  lessonPlans,
  notes,
  studentName: initialStudentName,
  loadedConversation,
  onConversationComplete,
  onNewConversation,
  onNavigateToLesson
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(
    loadedConversation?.messages || [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm your AI study assistant. I can help answer questions about your lesson plans. Ask me anything about the topics covered in your classes!",
      }
    ]
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(initialStudentName || loadedConversation?.studentName || null);
  const [showNameInput, setShowNameInput] = useState(!initialStudentName && !loadedConversation);
  const [nameInput, setNameInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(loadedConversation?.id || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  const [draftConversation, setDraftConversation] = useState<{ messages: Message[]; timestamp: string } | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load draft conversation on mount
  useEffect(() => {
    if (studentName && !loadedConversation) {
      const draftKey = `ai-assistant-draft-${studentName}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          // Only show draft if it's not just the welcome message
          if (draft.messages && draft.messages.length > 1) {
            setDraftConversation(draft);
            setShowDraftAlert(true);
          }
        } catch (e) {
          console.error("Failed to load draft conversation:", e);
        }
      }
    }
  }, [studentName, loadedConversation]);

  // Auto-save current conversation to localStorage
  useEffect(() => {
    if (studentName && messages.length > 1 && !conversationId && !loadedConversation) {
      const draftKey = `ai-assistant-draft-${studentName}`;
      const draft = {
        messages: messages,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [messages, studentName, conversationId, loadedConversation]);

  // Auto-save conversation after each interaction (debounced)
  useEffect(() => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save if we have messages and a student name
    if (studentName && messages.length > 1 && !isTyping) {
      // Wait 2 seconds after the last message before auto-saving
      autoSaveTimeoutRef.current = setTimeout(() => {
        const conversation: Conversation = {
          id: conversationId || Date.now().toString(),
          studentName: studentName,
          messages: messages.filter(m => !m.id.startsWith("welcome")),
          timestamp: new Date().toISOString()
        };

        // Update conversation ID if it's a new conversation
        if (!conversationId) {
          setConversationId(conversation.id);
        }

        onConversationComplete?.(conversation);
        
        // Clear draft after auto-saving
        localStorage.removeItem(`ai-assistant-draft-${studentName}`);
      }, 2000); // 2 second delay
    }

    // Cleanup function
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [messages, studentName, isTyping, conversationId, onConversationComplete]);

  // Update when a conversation is loaded
  useEffect(() => {
    if (loadedConversation) {
      setMessages(loadedConversation.messages);
      setStudentName(loadedConversation.studentName);
      setConversationId(loadedConversation.id);
      setShowNameInput(false);
      setShowDraftAlert(false);
      // Clear any draft when loading a saved conversation
      if (loadedConversation.studentName) {
        localStorage.removeItem(`ai-assistant-draft-${loadedConversation.studentName}`);
      }
    }
  }, [loadedConversation]);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setStudentName(nameInput.trim());
      setShowNameInput(false);
    }
  };

  const handleRestoreDraft = () => {
    if (draftConversation) {
      setMessages(draftConversation.messages);
      setShowDraftAlert(false);
      toast.success("Draft conversation restored");
    }
  };

  const handleDismissDraft = () => {
    if (studentName) {
      localStorage.removeItem(`ai-assistant-draft-${studentName}`);
    }
    setDraftConversation(null);
    setShowDraftAlert(false);
  };

  const handleRating = (messageId: string, rating: "helpful" | "not-helpful") => {
    setMessages(messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, rating: msg.rating === rating ? null : rating }
        : msg
    ));
  };

  const handleNewConversation = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: "Hi! I'm your AI study assistant. I can help answer questions about your lesson plans. Ask me anything about the topics covered in your classes!",
      }
    ]);
    setConversationId(null);
    setShowDraftAlert(false);
    // Clear the draft when starting a new conversation
    if (studentName) {
      localStorage.removeItem(`ai-assistant-draft-${studentName}`);
    }
    onNewConversation?.();
  };

  const handleSaveConversation = () => {
    if (messages.length <= 1 || !studentName) return; // Skip if only welcome message or no name

    const conversation: Conversation = {
      id: conversationId || Date.now().toString(),
      studentName: studentName,
      messages: messages.filter(m => !m.id.startsWith("welcome")), // Exclude welcome messages
      timestamp: new Date().toISOString()
    };

    setConversationId(conversation.id);
    onConversationComplete?.(conversation);
    
    // Clear the draft after saving
    localStorage.removeItem(`ai-assistant-draft-${studentName}`);
    
    toast.success("Conversation saved");
  };

  // Note: generateAIResponse has been replaced with generateSmartResponse from utils
  const generateAIResponse = (userMessage: string): { content: string; relatedPlans: string[] } => {
    const lowerMessage = userMessage.toLowerCase();
    const relatedPlans: string[] = [];
    
    // Extract keywords from the user's message for better matching
    const keywords = lowerMessage
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['what', 'when', 'where', 'which', 'about', 'this', 'that', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'does', 'they', 'their', 'there'].includes(word));
    
    // Score and find relevant notes
    const scoredNotes = notes.map(note => {
      const noteText = `${note.title} ${note.content} ${note.subject}`.toLowerCase();
      let score = 0;
      
      // Exact phrase match gets highest score
      if (noteText.includes(lowerMessage)) score += 10;
      
      // Count keyword matches
      keywords.forEach(keyword => {
        if (noteText.includes(keyword)) score += 1;
      });
      
      return { note, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    // Score and find relevant lesson plans
    const scoredLessons = lessonPlans.map(plan => {
      let score = 0;
      const planText = `${plan.title} ${plan.subject} ${plan.description} ${plan.objectives.join(' ')} ${plan.activities.join(' ')}`.toLowerCase();
      
      // Exact phrase match
      if (planText.includes(lowerMessage)) score += 10;
      
      // Keyword matches
      keywords.forEach(keyword => {
        if (planText.includes(keyword)) score += 1;
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
      // Sort notes by relevance (how many keywords they match)
      const scoredNotes = relevantNotes.map(note => {
        const noteText = `${note.title} ${note.content}`.toLowerCase();
        const score = keywords.filter(keyword => noteText.includes(keyword)).length;
        return { note, score };
      }).sort((a, b) => b.score - a.score);
      
      const note = scoredNotes[0].note;
      
      // Add the associated lesson plan if it exists
      if (note.lessonPlanId && !relatedPlans.includes(note.lessonPlanId)) {
        relatedPlans.push(note.lessonPlanId);
      }
      
      // Extract relevant snippet from note content
      const contentLines = note.content.split('\n').filter(line => line.trim());
      let relevantContent = '';
      
      // Try to find lines that mention keywords from the question
      const matchingLines = contentLines.filter(line => 
        keywords.some(keyword => line.toLowerCase().includes(keyword))
      );
      
      if (matchingLines.length > 0) {
        // Take more lines if they're relevant
        relevantContent = matchingLines.slice(0, 8).join('\n');
      } else {
        // Fall back to the beginning of the note
        relevantContent = contentLines.slice(0, 8).join('\n');
      }
      
      // Trim if too long
      if (relevantContent.length > 500) {
        relevantContent = relevantContent.substring(0, 500) + '...';
      }
      
      let response = `Based on the study notes "${note.title}" by ${note.teacherName}:\n\n${relevantContent}`;
      
      // If multiple notes are relevant, mention them
      if (scoredNotes.length > 1) {
        const otherNotes = scoredNotes.slice(1, 3).map(n => n.note);
        response += `\n\n📝 Also see notes: ${otherNotes.map(n => n.title).join(', ')}`;
      }
      
      // Add associated lesson plan information
      if (note.lessonPlanId) {
        const associatedLesson = lessonPlans.find(p => p.id === note.lessonPlanId);
        if (associatedLesson) {
          response += `\n\n📚 This is covered in the lesson: "${associatedLesson.title}"`;
        }
      }
      
      // Add other related lessons if found
      const otherRelatedLessons = relatedPlans
        .filter(planId => planId !== note.lessonPlanId)
        .map(planId => lessonPlans.find(p => p.id === planId))
        .filter((p): p is LessonPlan => p !== undefined);
      
      if (otherRelatedLessons.length > 0) {
        response += `\n\nRelated lessons:\n${otherRelatedLessons.map(l => `• ${l.title}`).join('\n')}`;
      }
      
      return {
        content: response,
        relatedPlans
      };
    }

    // Generate contextual responses based on common question patterns
    if (lowerMessage.includes("what is") || lowerMessage.includes("explain") || lowerMessage.includes("tell me about")) {
      if (relevantLessons.length > 0) {
        const lesson = relevantLessons[0];
        
        // Check if there are notes associated with this lesson
        const lessonNotes = notes.filter(n => n.lessonPlanId === lesson.id);
        let response = `Based on the lesson plan "${lesson.title}" by ${lesson.teacherName}, ${lesson.description}\n\nKey learning objectives include:\n${lesson.objectives.slice(0, 2).map(obj => `• ${obj}`).join('\n')}`;
        
        if (lessonNotes.length > 0) {
          response += `\n\n📝 Additional study notes available:\n${lessonNotes.map(n => `• ${n.title}`).join('\n')}`;
        }
        
        response += `\n\nWould you like to know more about any specific aspect?`;
        
        return {
          content: response,
          relatedPlans
        };
      }
    }

    if (lowerMessage.includes("how") || lowerMessage.includes("steps") || lowerMessage.includes("process")) {
      if (relevantLessons.length > 0) {
        const lesson = relevantLessons[0];
        if (lesson.activities.length > 0) {
          let response = `Here's how we'll cover this in "${lesson.title}":\n\n${lesson.activities.slice(0, 3).map((act, idx) => `${idx + 1}. ${act}`).join('\n')}\n\nThis lesson is designed for ${lesson.grade} students and takes about ${lesson.duration}.`;
          
          // Add notes if available
          const lessonNotes = notes.filter(n => n.lessonPlanId === lesson.id);
          if (lessonNotes.length > 0) {
            response += `\n\n📝 For more detailed explanations, check the study notes: "${lessonNotes[0].title}"`;
          }
          
          return {
            content: response,
            relatedPlans
          };
        }
      }
    }

    if (lowerMessage.includes("material") || lowerMessage.includes("need") || lowerMessage.includes("bring")) {
      if (relevantLessons.length > 0) {
        const lesson = relevantLessons[0];
        return {
          content: `For the "${lesson.title}" lesson, you'll need:\n${lesson.materials.map(mat => `• ${mat}`).join('\n')}\n\nMake sure to bring these to class!`,
          relatedPlans
        };
      }
    }

    if (lowerMessage.includes("when") || lowerMessage.includes("how long") || lowerMessage.includes("duration")) {
      if (relevantLessons.length > 0) {
        const lesson = relevantLessons[0];
        return {
          content: `The "${lesson.title}" lesson is planned for ${lesson.duration}. It was created by ${lesson.teacherName} for ${lesson.grade} students.`,
          relatedPlans
        };
      }
    }

    // Subject-specific questions
    const subjects = Array.from(new Set([
      ...lessonPlans.map(p => p.subject.toLowerCase()),
      ...notes.map(n => n.subject.toLowerCase())
    ]));
    const mentionedSubject = subjects.find(subject => lowerMessage.includes(subject));
    
    if (mentionedSubject) {
      const subjectLessons = lessonPlans.filter(p => p.subject.toLowerCase() === mentionedSubject);
      const subjectNotes = notes.filter(n => n.subject.toLowerCase() === mentionedSubject);
      
      if (subjectLessons.length > 0 || subjectNotes.length > 0) {
        relatedPlans.push(...subjectLessons.map(p => p.id));
        
        let response = `I found materials related to ${mentionedSubject}:\n\n`;
        
        if (subjectLessons.length > 0) {
          response += `📚 Lesson Plans:\n${subjectLessons.map(lesson => `• ${lesson.title} (${lesson.grade})`).join('\n')}\n\n`;
        }
        
        if (subjectNotes.length > 0) {
          response += `📝 Study Notes:\n${subjectNotes.map(note => `• ${note.title}`).join('\n')}\n\n`;
        }
        
        response += `Which would you like to learn more about?`;
        
        return {
          content: response,
          relatedPlans
        };
      }
    }

    if (relevantLessons.length > 0) {
      const lesson = relevantLessons[0];
      relatedPlans.push(lesson.id);
      
      let response = `I found information about this in "${lesson.title}". ${lesson.description}\n\nThe main objectives are:\n${lesson.objectives.slice(0, 2).map(obj => `• ${obj}`).join('\n')}`;
      
      // Check for associated notes
      const lessonNotes = notes.filter(n => n.lessonPlanId === lesson.id);
      if (lessonNotes.length > 0) {
        response += `\n\n📝 Related study notes: ${lessonNotes.map(n => n.title).join(', ')}`;
      }
      
      response += `\n\nIs there something specific you'd like to know?`;
      
      return {
        content: response,
        relatedPlans
      };
    }

    // Default response when no relevant lessons or notes found
    if (lessonPlans.length === 0 && notes.length === 0) {
      return {
        content: "I don't have any lesson plans or study notes to reference yet. Once your teachers upload materials, I'll be able to help answer questions about them!",
        relatedPlans: []
      };
    }

    let defaultResponse = `I couldn't find specific information about that in the available materials. However, I can help with:\n\n`;
    
    if (lessonPlans.length > 0) {
      defaultResponse += `📚 Lessons:\n${lessonPlans.slice(0, 2).map(plan => `• ${plan.title} (${plan.subject})`).join('\n')}\n\n`;
    }
    
    if (notes.length > 0) {
      defaultResponse += `📝 Study Notes:\n${notes.slice(0, 2).map(note => `• ${note.title} (${note.subject})`).join('\n')}\n\n`;
    }
    
    defaultResponse += `Try asking about one of these topics!`;
    
    return {
        content: defaultResponse,
        relatedPlans: []
      };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const { content, relatedPlans, citation } = generateSmartResponse(input, notes, lessonPlans);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        relatedLessonPlans: relatedPlans,
        citation: citation,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 800);
  };

  const getRelatedLessonPlan = (planId: string): LessonPlan | undefined => {
    return lessonPlans.find(p => p.id === planId);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-240px)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Study Assistant
          </CardTitle>
          <div className="flex gap-2">
            {!showNameInput && studentName && loadedConversation && (
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            )}
          </div>
        </div>
        {loadedConversation && (
          <p className="text-xs text-gray-500 mt-1">
            Conversation from {new Date(loadedConversation.timestamp).toLocaleDateString()}
          </p>
        )}
        {conversationId && !loadedConversation && messages.length > 1 && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Auto-saved
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-0">
        {/* Draft Alert */}
        {showDraftAlert && draftConversation && (
          <div className="px-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm">
                    <strong>Draft found!</strong> You have an unsaved conversation from{" "}
                    {new Date(draftConversation.timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {draftConversation.messages.length} messages
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={handleRestoreDraft}>
                    Restore
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismissDraft}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Name Input */}
        {showNameInput ? (
          <div className="px-4 py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Bot className="w-8 h-8 text-green-700" />
            </div>
            <div>
              <h3 className="text-lg mb-2">Welcome to AI Study Assistant</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please enter your name to get started
              </p>
            </div>
            <div className="space-y-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetName()}
                placeholder="Your name"
                className="max-w-xs mx-auto"
              />
              <Button onClick={handleSetName} disabled={!nameInput.trim()}>
                Start Chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-green-700" />
                      </div>
                    )}
                    <div className={`flex-1 ${message.role === "user" ? "flex justify-end" : ""}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          message.role === "user"
                            ? "bg-green-700 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        {message.editedByTeacher && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            Reviewed by teacher
                          </Badge>
                        )}
                        
                        {/* Clickable Citation */}
                        {message.citation && message.citation.lessonPlanId && (
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 w-full justify-start"
                              onClick={() => {
                                if (message.citation?.lessonPlanId) {
                                  onNavigateToLesson?.(message.citation.lessonPlanId);
                                  toast.success(`Opening ${message.citation.lessonPlanTitle}`);
                                }
                              }}
                            >
                              <BookOpen className="w-3 h-3 mr-1 shrink-0" />
                              <span className="text-left">
                                View this lesson: {message.citation.lessonPlanTitle}
                              </span>
                            </Button>
                          </div>
                        )}
                        
                        {message.relatedPlans && message.relatedPlans.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Related lessons:</p>
                            {message.relatedPlans.map((planTitle, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs mr-1 mb-1">
                                {planTitle}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Rating buttons for assistant messages */}
                      {message.role === "assistant" && !message.id.startsWith("welcome") && (
                        <div className="flex gap-1 mt-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 ${
                              message.rating === "helpful" 
                                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                : "text-gray-400 hover:text-green-600"
                            }`}
                            onClick={() => handleRating(message.id, "helpful")}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 ${
                              message.rating === "not-helpful" 
                                ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                : "text-gray-400 hover:text-red-600"
                            }`}
                            onClick={() => handleRating(message.id, "not-helpful")}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-green-700" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="px-4 pb-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask a question about your lessons..."
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon" disabled={!input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                AI responses are based on available lesson plans and study notes
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}