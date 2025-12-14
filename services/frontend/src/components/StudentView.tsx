import { useState } from "react";
import { LessonPlan, Conversation, Note } from "../types";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Search, Clock, User, Target, Package, Activity, BookOpen, Bot, Rocket, History, Lock, Globe, FileText, Heart, Gamepad2, Trash2, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AIAssistant } from "./AIAssistant";
import { LessonViewer } from "./LessonViewer";
import { StudentConversationHistory } from "./StudentConversationHistory";
import { Quiz } from "./Quiz";
import { toast } from "sonner";
import { getSubjectColor } from "../utils/subjectColors";

type StudentViewProps = {
  lessonPlans: LessonPlan[];
  notes: Note[];
  conversations: Conversation[];
  favoriteLessonIds: string[];
  onConversationComplete?: (conversation: Conversation) => void;
  onUpdateConversation: (id: string, updatedConversation: Partial<Conversation>) => void;
  onDeleteConversation: (id: string) => void;
  onToggleFavorite: (lessonId: string) => void;
};

export function StudentView({
  lessonPlans,
  notes,
  conversations,
  favoriteLessonIds,
  onConversationComplete,
  onUpdateConversation,
  onDeleteConversation,
  onToggleFavorite
}: StudentViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [viewingLesson, setViewingLesson] = useState<LessonPlan | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loadedConversation, setLoadedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<string>("lessons");
  const [unlockedLessons, setUnlockedLessons] = useState<Set<string>>(new Set());
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<LessonPlan | null>(null);
  const [unlockedNotes, setUnlockedNotes] = useState<Set<string>>(new Set());
  const [pendingNote, setPendingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<LessonPlan | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ plan: LessonPlan, timeout: NodeJS.Timeout } | null>(null);
  const [unfavoritingPlan, setUnfavoritingPlan] = useState<LessonPlan | null>(null);
  const [recentlyUnfavorited, setRecentlyUnfavorited] = useState<{ planId: string, timeout: NodeJS.Timeout } | null>(null);

  // Get unique subjects
  const subjects = ["all", ...Array.from(new Set(lessonPlans.map(plan => plan.subject)))];

  // Filter lesson plans
  const filteredPlans = lessonPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || plan.subject === selectedSubject;
    const notDeleted = !recentlyDeleted || recentlyDeleted.plan.id !== plan.id;
    return matchesSearch && matchesSubject && notDeleted;
  });

  const handlePlanClick = (plan: LessonPlan) => {
    if (!plan.isPublic && !unlockedLessons.has(plan.id)) {
      setPendingPlan(plan);
      setShowPasswordDialog(true);
    } else {
      setSelectedPlan(plan);
    }
  };

  const handlePasswordSubmitUpdated = () => {
    if (!pendingPlan && !pendingNote) return;

    if (pendingPlan && passwordInput === pendingPlan.password) {
      setUnlockedLessons(prev => new Set(prev).add(pendingPlan.id));
      setSelectedPlan(pendingPlan);
      setShowPasswordDialog(false);
      setPasswordInput("");
      setPendingPlan(null);
      toast.success("Lesson unlocked successfully!");
    } else if (pendingNote && passwordInput === pendingNote.password) {
      setUnlockedNotes(prev => new Set(prev).add(pendingNote.id));
      setSelectedNote(pendingNote);
      setShowPasswordDialog(false);
      setPasswordInput("");
      setPendingNote(null);
      toast.success("Note unlocked successfully!");
    } else {
      toast.error("Incorrect password. Please try again.");
      setPasswordInput("");
    }
  };

  const handleLaunchLesson = (plan: LessonPlan) => {
    if (!plan.isPublic && !unlockedLessons.has(plan.id)) {
      toast.error("Please unlock this lesson first");
      setSelectedPlan(null);
      return;
    }
    setSelectedPlan(null);
    setViewingLesson(plan);
  };

  const handleContinueConversation = (conversation: Conversation) => {
    setLoadedConversation(conversation);
    setStudentName(conversation.studentName);
    setShowHistory(false);
    setActiveTab("ai");
  };

  const handleNewConversation = () => {
    setLoadedConversation(null);
  };

  const handleViewLinkedLesson = (lessonPlanId: string) => {
    const linkedPlan = lessonPlans.find(plan => plan.id === lessonPlanId);
    if (linkedPlan) {
      setSelectedNote(null);
      setActiveTab("lessons");
      // Small delay to ensure tab switch completes before showing dialog
      setTimeout(() => {
        handlePlanClick(linkedPlan);
      }, 100);
    }
  };

  const handleDeleteLesson = () => {
    if (deletingPlan) {
      // Store the lesson for potential undo
      const timeout = setTimeout(() => {
        setRecentlyDeleted(null);
      }, 5000); // 5 seconds to undo

      setRecentlyDeleted({ plan: deletingPlan, timeout });
      setDeletingPlan(null);

      toast.success("Lesson deleted", {
        action: {
          label: "Undo",
          onClick: () => handleUndoDelete(),
        },
      });
    }
  };

  const handleUndoDelete = () => {
    if (recentlyDeleted) {
      clearTimeout(recentlyDeleted.timeout);
      setRecentlyDeleted(null);
      toast.success("Lesson restored");
    }
  };

  const handleUnfavoriteLesson = () => {
    if (unfavoritingPlan) {
      // Store the plan ID for potential undo
      const timeout = setTimeout(() => {
        setRecentlyUnfavorited(null);
      }, 5000); // 5 seconds to undo

      setRecentlyUnfavorited({ planId: unfavoritingPlan.id, timeout });
      onToggleFavorite(unfavoritingPlan.id);
      setUnfavoritingPlan(null);

      toast.success("Removed from favorites", {
        action: {
          label: "Undo",
          onClick: () => handleUndoUnfavorite(),
        },
      });
    }
  };

  const handleUndoUnfavorite = () => {
    if (recentlyUnfavorited) {
      clearTimeout(recentlyUnfavorited.timeout);
      onToggleFavorite(recentlyUnfavorited.planId); // Toggle back to favorite
      setRecentlyUnfavorited(null);
      toast.success("Restored to favorites");
    }
  };

  const isLessonUnlocked = (plan: LessonPlan) => {
    return plan.isPublic || unlockedLessons.has(plan.id);
  };

  const isNoteUnlocked = (note: Note) => {
    return note.isPublic || unlockedNotes.has(note.id);
  };

  const handleNoteClick = (note: Note) => {
    if (!note.isPublic && !unlockedNotes.has(note.id)) {
      setPendingNote(note);
      setPendingPlan(null);
      setShowPasswordDialog(true);
    } else {
      setSelectedNote(note);
    }
  };

  // Filter available lessons for AI (only public or unlocked)
  const availableLessonsForAI = lessonPlans.filter(plan => isLessonUnlocked(plan));

  // Filter available notes for AI (only public or unlocked)
  const availableNotesForAI = notes.filter(note => isNoteUnlocked(note));

  // Filter notes by subject
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // If viewing a lesson, show the lesson viewer
  if (viewingLesson) {
    return (
      <LessonViewer
        lessonPlan={viewingLesson}
        notes={availableNotesForAI}
        onExit={() => setViewingLesson(null)}
        onNoteClick={handleNoteClick}
      />
    );
  }

  // If viewing conversation history, show the history component
  if (showHistory && studentName) {
    return (
      <StudentConversationHistory
        conversations={conversations}
        studentName={studentName}
        onBack={() => setShowHistory(false)}
        onContinueConversation={handleContinueConversation}
        onUpdateConversation={onUpdateConversation}
        onDeleteConversation={onDeleteConversation}
      />
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full font-serif">
      <TabsContent value="lessons" className="m-0 pb-20">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 w-4 h-4" />
              <Input
                type="text"
                placeholder="SEARCH ANNALS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-900 border-amber-900/30 text-stone-200 placeholder:text-stone-600 focus:border-amber-500 rounded-none uppercase tracking-wide text-xs"
              />
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none uppercase tracking-wide text-xs">
                <SelectValue placeholder="FILTER BY DISCIPLINE" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none">
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject} className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">
                    {subject === "all" ? "All Disciplines" : subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pb-4">
            {filteredPlans.length === 0 ? (
              <div className="text-center py-20 text-stone-600 border border-dashed border-stone-800 bg-stone-900/20">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="uppercase tracking-widest text-xs">No records found in the archives</p>
              </div>
            ) : (
              filteredPlans.map(plan => (
                <Card
                  key={plan.id}
                  className="cursor-pointer hover:border-amber-500/50 transition-all bg-stone-900 border-amber-900/20 rounded-none group"
                  onClick={() => handlePlanClick(plan)}
                >
                  <CardHeader className="pb-3 border-b border-stone-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1">
                        {!plan.isPublic && (
                          <div className="shrink-0">
                            {unlockedLessons.has(plan.id) ? (
                              <Globe className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-stone-500" />
                            )}
                          </div>
                        )}
                        <CardTitle className="text-base text-stone-200 group-hover:text-amber-500 transition-colors uppercase tracking-wide font-bold">{plan.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`rounded-none uppercase tracking-widest text-[10px] bg-stone-800 text-stone-400 border border-stone-700`}>{plan.subject}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-stone-800 text-stone-500 hover:text-amber-500"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onToggleFavorite(plan.id);
                            toast.success(
                              favoriteLessonIds.includes(plan.id)
                                ? "Removed from favorites"
                                : "Added to favorites"
                            );
                          }}
                        >
                          <Heart
                            className={`w-4 h-4 ${favoriteLessonIds.includes(plan.id)
                              ? "fill-amber-500 text-amber-500"
                              : "text-stone-600"
                              }`}
                          />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2 text-stone-500 text-xs font-sans mt-2">
                      {!plan.isPublic && !unlockedLessons.has(plan.id)
                        ? "Restricted Access. Authentication Required."
                        : plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-6 text-xs text-stone-500 uppercase tracking-wider font-bold">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-700" />
                        {plan.teacherName}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-700" />
                        {plan.duration}
                      </div>
                      {(() => {
                        const noteCount = availableNotesForAI.filter(n => n.lessonPlanId === plan.id).length;
                        return noteCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <FileText className="w-3 h-3" />
                            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="notes" className="m-0 pb-20">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 w-4 h-4" />
              <Input
                type="text"
                placeholder="SEARCH NOTES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-900 border-amber-900/30 text-stone-200 placeholder:text-stone-600 focus:border-amber-500 rounded-none uppercase tracking-wide text-xs"
              />
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none uppercase tracking-wide text-xs">
                <SelectValue placeholder="FILTER BY DISCIPLINE" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none">
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject} className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">
                    {subject === "all" ? "All Disciplines" : subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pb-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-20 text-stone-600 border border-dashed border-stone-800 bg-stone-900/20">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="uppercase tracking-widest text-xs">No notes found</p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:border-amber-500/50 transition-all bg-stone-900 border-amber-900/20 rounded-none group"
                  onClick={() => handleNoteClick(note)}
                >
                  <CardHeader className="pb-3 border-b border-stone-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1">
                        {!note.isPublic && (
                          <div className="shrink-0">
                            {unlockedNotes.has(note.id) ? (
                              <Globe className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-stone-500" />
                            )}
                          </div>
                        )}
                        <CardTitle className="text-base text-stone-200 group-hover:text-amber-500 transition-colors uppercase tracking-wide font-bold">{note.title}</CardTitle>
                      </div>
                      <Badge className={`rounded-none uppercase tracking-widest text-[10px] bg-stone-800 text-stone-400 border border-stone-700`}>{note.subject}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-stone-500 text-xs font-sans mt-2">
                      {!note.isPublic && !unlockedNotes.has(note.id)
                        ? "Restricted Access. Authentication Required."
                        : note.content.slice(0, 100) + "..."}
                    </CardDescription>
                    {note.lessonPlanId && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-700 uppercase tracking-widest font-bold">
                        <BookOpen className="w-3 h-3" />
                        <span>
                          REQ: {lessonPlans.find(plan => plan.id === note.lessonPlanId)?.title || "UNKNOWN"}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4 text-xs text-stone-500 uppercase tracking-wider font-bold">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-700" />
                        {note.teacherName}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Password Dialog */}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="max-w-md bg-stone-900 border-amber-900/50 text-stone-200 rounded-none">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-500 uppercase tracking-widest text-sm">
                  <Lock className="w-4 h-4" />
                  Security Clearance Required
                </DialogTitle>
                <DialogDescription className="text-stone-500 text-xs mt-2">
                  This {pendingPlan ? "module" : "document"} is classified. Enter access code.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-stone-400">{pendingPlan ? "Module ID" : "Doc ID"}: <span className="text-stone-300">{pendingPlan?.title || pendingNote?.title}</span></label>
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmitUpdated()}
                    placeholder="ENTER CODE"
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-widest"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordInput("");
                    setPendingPlan(null);
                    setPendingNote(null);
                  }}
                  className="rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs"
                >
                  Abort
                </Button>
                <Button onClick={handlePasswordSubmitUpdated} className="rounded-none bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold uppercase tracking-widest text-xs">
                  Authorize
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Note Detail Dialog */}
          <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
            <DialogContent className="max-w-md max-h-[85vh] bg-stone-900 border-amber-900/50 text-stone-200 rounded-none">
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-lg font-bold text-amber-500 uppercase tracking-wide">{selectedNote?.title}</DialogTitle>
                  <Badge className={`rounded-none bg-stone-800 text-stone-400 border border-stone-700 uppercase tracking-widest text-[10px]`}>{selectedNote?.subject}</Badge>
                </div>
                <DialogDescription className="text-stone-500 text-xs font-mono">{selectedNote?.teacherName}</DialogDescription>
                {selectedNote?.lessonPlanId && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-amber-950/20 rounded-none border border-amber-900/30">
                    <BookOpen className="w-3 h-3 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-[10px] text-amber-600 uppercase tracking-widest font-bold">Reference Module:</p>
                      <p className="text-xs text-stone-400">
                        {lessonPlans.find(plan => plan.id === selectedNote.lessonPlanId)?.title || "Unknown"}
                      </p>
                    </div>
                  </div>
                )}
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="whitespace-pre-wrap text-sm p-4 bg-stone-950 border border-stone-800 text-stone-300 font-mono leading-relaxed">
                  {selectedNote?.content}
                </div>
              </ScrollArea>

              {selectedNote?.lessonPlanId && (
                <DialogFooter className="mt-4">
                  <Button
                    onClick={() => selectedNote.lessonPlanId && handleViewLinkedLesson(selectedNote.lessonPlanId)}
                    className="w-full rounded-none bg-amber-900/20 border border-amber-900/50 text-amber-500 hover:bg-amber-900/40 hover:text-amber-400 uppercase tracking-widest text-xs font-bold"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Access Linked Module
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </TabsContent>

      <TabsContent value="ai" className="m-0 pb-20">
        <div className="space-y-4">
          {studentName && (
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="w-full rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs"
            >
              <History className="w-4 h-4 mr-2" />
              View Conversation Logs
            </Button>
          )}
          <AIAssistant
            lessonPlans={availableLessonsForAI}
            notes={availableNotesForAI}
            studentName={studentName}
            loadedConversation={loadedConversation}
            onConversationComplete={(conv) => {
              onConversationComplete?.(conv);
              setStudentName(conv.studentName);
            }}
            onNewConversation={handleNewConversation}
            onNavigateToLesson={(lessonPlanId) => {
              const lesson = lessonPlans.find(p => p.id === lessonPlanId);
              if (lesson) {
                setActiveTab("lessons");
                handlePlanClick(lesson);
              }
            }}
          />
        </div>
      </TabsContent>

      <TabsContent value="favorites" className="m-0 pb-20">
        <div className="space-y-4">
          <div className="space-y-3 pb-4">
            {favoriteLessonIds.length === 0 ? (
              <div className="text-center py-20 text-stone-600 border border-dashed border-stone-800 bg-stone-900/20">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="uppercase tracking-widest text-xs">No favorites designated</p>
                <p className="text-[10px] mt-2 text-stone-700">Mark modules for quick access</p>
              </div>
            ) : (
              lessonPlans
                .filter(plan => favoriteLessonIds.includes(plan.id))
                .map(plan => (
                  <Card
                    key={plan.id}
                    className="cursor-pointer hover:border-amber-500/50 transition-all bg-stone-900 border-amber-900/20 rounded-none group"
                    onClick={() => handlePlanClick(plan)}
                  >
                    <CardHeader className="pb-3 border-b border-stone-800">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1">
                          {!plan.isPublic && (
                            <div className="shrink-0">
                              {unlockedLessons.has(plan.id) ? (
                                <Globe className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Lock className="w-4 h-4 text-stone-500" />
                              )}
                            </div>
                          )}
                          <CardTitle className="text-base text-stone-200 group-hover:text-amber-500 transition-colors uppercase tracking-wide font-bold">{plan.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`rounded-none uppercase tracking-widest text-[10px] bg-stone-800 text-stone-400 border border-stone-700`}>{plan.subject}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-stone-800 text-stone-500 hover:text-amber-500"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setUnfavoritingPlan(plan);
                            }}
                          >
                            <Heart className="w-4 h-4 fill-amber-500 text-amber-500" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2 text-stone-500 text-xs font-sans mt-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-6 text-xs text-stone-500 uppercase tracking-wider font-bold">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-amber-700" />
                          {plan.teacherName}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-700" />
                          {plan.duration}
                        </div>
                        {(() => {
                          const noteCount = availableNotesForAI.filter(n => n.lessonPlanId === plan.id).length;
                          return noteCount > 0 ? (
                            <div className="flex items-center gap-1.5 text-amber-600">
                              <FileText className="w-3 h-3" />
                              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="games" className="m-0 pb-20">
        <div className="space-y-4">
          <Quiz lessonPlans={availableLessonsForAI} notes={availableNotesForAI} />
        </div>
      </TabsContent>

      {/* Bottom Navigation */}
      <TabsList className="fixed bottom-0 left-0 right-0 max-w-md mx-auto flex rounded-none border-t bg-white h-16 shadow-lg">
        <TabsTrigger value="lessons" className="gap-1 flex-col h-full flex-1">
          <BookOpen className="w-4 h-4" />
          <span className="text-xs">Lessons</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-1 flex-col h-full flex-1">
          <FileText className="w-4 h-4" />
          <span className="text-xs">Notes</span>
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-1.5 flex-col h-full flex-[1.5] bg-gradient-to-b from-green-50 to-transparent">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center -mt-6 shadow-lg border-4 border-white">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs -mt-1">AI</span>
        </TabsTrigger>
        <TabsTrigger value="favorites" className="gap-1 flex-col h-full flex-1">
          <Heart className="w-4 h-4" />
          <span className="text-xs">Favorites</span>
        </TabsTrigger>
        <TabsTrigger value="games" className="gap-1 flex-col h-full flex-1">
          <Gamepad2 className="w-4 h-4" />
          <span className="text-xs">Games</span>
        </TabsTrigger>
      </TabsList>

      {/* Global Dialogs - Accessible from all tabs */}

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Unlock {pendingPlan ? "Lesson Plan" : "Note"}
            </DialogTitle>
            <DialogDescription>
              This {pendingPlan ? "lesson plan" : "note"} is password protected. Please enter the password to access it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm">{pendingPlan ? "Lesson" : "Note"}: {pendingPlan?.title || pendingNote?.title}</label>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmitUpdated()}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordInput("");
                setPendingPlan(null);
                setPendingNote(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmitUpdated}>
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Plan Detail Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle>{selectedPlan?.title}</DialogTitle>
              <Badge className={selectedPlan ? getSubjectColor(selectedPlan.subject) : ""}>{selectedPlan?.subject}</Badge>
            </div>
            <DialogDescription>{selectedPlan?.description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="w-4 h-4" />
                  {selectedPlan?.teacherName}
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-4 h-4" />
                  {selectedPlan?.duration}
                </div>
                <Badge variant="outline">{selectedPlan?.grade}</Badge>
              </div>

              {/* Learning Objectives */}
              <div>
                <h3 className="flex items-center gap-2 text-gray-700 mb-2">
                  <Target className="w-4 h-4" />
                  Learning Objectives
                </h3>
                <ul className="space-y-1 ml-6">
                  {selectedPlan?.objectives.map((obj, idx) => (
                    <li key={idx} className="text-sm text-gray-600 list-disc">{obj}</li>
                  ))}
                </ul>
              </div>

              {/* Materials */}
              <div>
                <h3 className="flex items-center gap-2 text-gray-700 mb-2">
                  <Package className="w-4 h-4" />
                  Materials Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlan?.materials.map((material, idx) => (
                    <Badge key={idx} variant="outline">{material}</Badge>
                  ))}
                </div>
              </div>

              {/* Activities */}
              <div>
                <h3 className="flex items-center gap-2 text-gray-700 mb-2">
                  <Activity className="w-4 h-4" />
                  Activities
                </h3>
                <ol className="space-y-2 ml-6">
                  {selectedPlan?.activities.map((activity, idx) => (
                    <li key={idx} className="text-sm text-gray-600 list-decimal">{activity}</li>
                  ))}
                </ol>
              </div>

              {/* Attached Notes */}
              {selectedPlan && (() => {
                const attachedNotes = availableNotesForAI.filter(n => n.lessonPlanId === selectedPlan.id);
                return attachedNotes.length > 0 ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-gray-700 mb-2">
                      <FileText className="w-4 h-4" />
                      Study Notes ({attachedNotes.length})
                    </h3>
                    <div className="space-y-2">
                      {attachedNotes.map((note) => (
                        <div
                          key={note.id}
                          className="text-sm bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-green-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNoteClick(note);
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-green-900">{note.title}</div>
                            <div className="text-xs text-gray-600 mt-1">By {note.teacherName}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-green-600 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              onClick={() => selectedPlan && handleLaunchLesson(selectedPlan)}
              className="w-full"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Launch Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlan?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLesson} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unfavorite Confirmation Dialog */}
      <AlertDialog open={!!unfavoritingPlan} onOpenChange={() => setUnfavoritingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{unfavoritingPlan?.title}" from your favorites?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfavoriteLesson} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}