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
// Import styles for KaTeX
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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

    try {
      // Real Backend Call
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content })).slice(-5), // Send last 5 messages for context
          course_id: "default" // Use global context for now to match uploads
        })
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I'm having trouble connecting to the server.",
        // relatedLessonPlans: data.related_ids, // Future: Backend could return these
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble reaching my brain. Please check if the backend is running.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getRelatedLessonPlan = (planId: string): LessonPlan | undefined => {
    return lessonPlans.find(p => p.id === planId);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-240px)] bg-stone-950 border-amber-900/30 shadow-[0_0_30px_rgba(251,191,36,0.05)] rounded-none relative overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(120,53,15,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(120,53,15,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

      <CardHeader className="pb-3 border-b border-amber-900/20 bg-stone-950/80 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-amber-500">
            <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            TALOS_AI_NODE // V.2.5
          </CardTitle>
          <div className="flex gap-2">
            {!showNameInput && studentName && loadedConversation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                className="h-7 text-[10px] uppercase tracking-widest bg-stone-900 border-stone-800 text-stone-400 hover:text-amber-500 hover:border-amber-500/50 rounded-none transition-all"
              >
                <Plus className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
        {loadedConversation && (
          <p className="text-[10px] font-mono text-stone-600 mt-1 uppercase tracking-wider">
            Log Timestamp: {new Date(loadedConversation.timestamp).toLocaleDateString()}
          </p>
        )}
        {conversationId && !loadedConversation && messages.length > 1 && (
          <p className="text-[10px] font-mono text-amber-900/70 mt-1 flex items-center gap-1 uppercase tracking-wider">
            <Save className="w-3 h-3" />
            Auto-Archived
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 p-0 relative z-0 overflow-hidden">
        {/* Draft Alert */}
        {showDraftAlert && draftConversation && (
          <div className="px-4 pt-4">
            <div className="border border-amber-500/30 bg-amber-950/20 p-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-mono text-amber-500 uppercase tracking-wide">
                  ⚠ Partial Transmission Found
                </p>
                <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                  {new Date(draftConversation.timestamp).toLocaleString()} • {draftConversation.messages.length} packets
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={handleRestoreDraft} className="h-6 text-[10px] bg-amber-900/40 hover:bg-amber-900/60 text-amber-500 border border-amber-900/50 rounded-none uppercase">
                  Recover
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismissDraft} className="h-6 w-6 p-0 text-stone-500 hover:text-stone-300 rounded-none">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Name Input */}
        {showNameInput ? (
          <div className="px-4 py-12 text-center space-y-6 flex flex-col items-center justify-center h-full">
            <div className="relative">
              <div className="w-20 h-20 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto animate-[spin_10s_linear_infinite]">
                <div className="w-16 h-16 border border-dashed border-amber-500/20 rounded-full opacity-50" />
              </div>
              <Bot className="w-8 h-8 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono text-amber-500 uppercase tracking-widest mb-2">Identify Yourself</h3>
              <p className="text-xs text-stone-500 font-mono uppercase tracking-wide">
                Clearance Code Required
              </p>
            </div>
            <div className="space-y-3 w-full max-w-xs">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetName()}
                placeholder="ENTER_DESIGNATION..."
                className="bg-stone-900 border-amber-900/30 text-amber-500 placeholder:text-amber-900/30 font-mono text-xs text-center rounded-none focus:border-amber-500/70 h-10 tracking-widest"
              />
              <Button
                onClick={handleSetName}
                disabled={!nameInput.trim()}
                className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-mono rounded-none uppercase tracking-widest text-xs h-10"
              >
                Initialize Link
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Custom Scroll Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent hover:scrollbar-thumb-amber-900/50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-none border border-amber-900/30 bg-stone-900 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-amber-600" />
                    </div>
                  )}

                  <div className={`flex-1 max-w-[85%] flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`relative px-5 py-4 text-sm font-mono leading-relaxed shadow-lg backdrop-blur-sm
                        ${message.role === "user"
                          ? "bg-amber-950/30 text-amber-100 border-l-2 border-amber-600 rounded-r-lg rounded-tl-lg"
                          : "bg-stone-900/80 text-stone-300 border-l-2 border-stone-600 rounded-r-lg rounded-bl-lg"
                        }`}
                    >
                      {/* Technical Header */}
                      <div className="text-[9px] uppercase tracking-widest mb-2 opacity-50 flex items-center gap-2 select-none">
                        {message.role === "user" ? '>> USR_INPUT' : '>> SYS_RESPONSE'}
                        <span className="w-full h-px bg-current opacity-20" />
                      </div>

                      <div className="prose prose-invert prose-stone max-w-none prose-p:leading-relaxed prose-pre:bg-stone-950 prose-pre:border prose-pre:border-stone-800">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-2 last:mb-0" {...props} />,
                            a: ({ node, ...props }) => <a className="text-amber-500 hover:underline" {...props} />,
                            code: ({ node, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '')
                              return match ? (
                                <code className={`${className} bg-stone-950 px-1 py-0.5 rounded text-amber-200`} {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="bg-stone-950 px-1 py-0.5 rounded text-amber-500 text-xs" {...props}>
                                  {children}
                                </code>
                              )
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {message.editedByTeacher && (
                        <div className="mt-2 text-[9px] text-amber-500/70 flex items-center gap-1 uppercase tracking-wider border-t border-amber-500/10 pt-1">
                          <User className="w-3 h-3" /> MAGISTER_OVERRIDE
                        </div>
                      )}

                      {/* Clickable Citation */}
                      {message.citation && message.citation.lessonPlanId && (
                        <div className="mt-4 pt-3 border-t border-stone-800/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-2 text-[10px] text-amber-500 hover:text-amber-400 hover:bg-amber-950/30 w-full justify-start font-mono rounded-none border border-amber-900/20"
                            onClick={() => {
                              if (message.citation?.lessonPlanId) {
                                onNavigateToLesson?.(message.citation.lessonPlanId);
                                toast.success(`Accessing Archive: ${message.citation.lessonPlanTitle}`);
                              }
                            }}
                          >
                            <BookOpen className="w-3 h-3 mr-2 shrink-0" />
                            <span className="text-left uppercase tracking-wide truncate">
                              Ref: {message.citation.lessonPlanTitle}
                            </span>
                          </Button>
                        </div>
                      )}

                      {message.relatedPlans && message.relatedPlans.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-stone-800/50">
                          <p className="text-[9px] text-stone-500 mb-2 uppercase tracking-widest">Linked Archives:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.relatedPlans.map((planTitle, idx) => (
                              <div key={idx} className="text-[10px] px-2 py-0.5 bg-stone-950 border border-stone-800 text-stone-400 font-mono rounded-none">
                                {planTitle}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rating buttons */}
                    {message.role === "assistant" && !message.id.startsWith("welcome") && (
                      <div className="flex flex-col gap-1 ml-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRating(message.id, "helpful")}
                          className={`p-1 hover:bg-stone-800 rounded-none transition-colors ${message.rating === "helpful" ? "text-amber-500" : "text-stone-600"}`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRating(message.id, "not-helpful")}
                          className={`p-1 hover:bg-stone-800 rounded-none transition-colors ${message.rating === "not-helpful" ? "text-red-500" : "text-stone-600"}`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-none border border-amber-500/30 bg-amber-950/30 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 justify-start animate-pulse">
                  <div className="w-8 h-8 rounded-none border border-amber-900/30 bg-stone-900 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="bg-stone-900 border-l-2 border-stone-600 px-5 py-4 rounded-r-lg rounded-bl-lg">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-none animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-none animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-none animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} className="h-4" /> {/* Spacer at bottom */}
            </div>

            <div className="p-4 bg-stone-950/90 border-t border-amber-900/20 backdrop-blur-md sticky bottom-0 z-20">
              <div className="flex gap-2 relative group">
                {/* Glowing border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-900/0 via-amber-500/20 to-amber-900/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="QUERY_DATABASE..."
                  className="flex-1 bg-stone-900 border-stone-800 text-stone-200 placeholder:text-stone-700 font-mono text-sm h-11 rounded-none px-4 focus:border-amber-500/50 focus:ring-0 focus:bg-stone-900 transition-colors uppercase tracking-wide"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={!input.trim()}
                  className="h-11 w-11 rounded-none bg-stone-900 border border-stone-800 hover:bg-amber-950 hover:border-amber-500/50 hover:text-amber-500 text-stone-500 transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[9px] text-stone-700 mt-2 text-center font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <span className="w-1 h-1 bg-amber-900 rounded-full animate-pulse" />
                Talos_Network_Status: CONNECTED
                <span className="w-1 h-1 bg-amber-900 rounded-full animate-pulse" />
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}