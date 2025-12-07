import { useState } from "react";
import { LessonPlan, Conversation, Note } from "../App";
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
import { toast } from "sonner@2.0.3";
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
  const [recentlyDeleted, setRecentlyDeleted] = useState<{plan: LessonPlan, timeout: NodeJS.Timeout} | null>(null);
  const [unfavoritingPlan, setUnfavoritingPlan] = useState<LessonPlan | null>(null);
  const [recentlyUnfavorited, setRecentlyUnfavorited] = useState<{planId: string, timeout: NodeJS.Timeout} | null>(null);

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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsContent value="lessons" className="m-0 pb-20">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search lesson plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject === "all" ? "All Subjects" : subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pb-4">
            {filteredPlans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No lesson plans found</p>
              </div>
            ) : (
              filteredPlans.map(plan => (
                <Card 
                  key={plan.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handlePlanClick(plan)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {!plan.isPublic && (
                          <div className="shrink-0">
                            {unlockedLessons.has(plan.id) ? (
                              <Globe className="w-4 h-4 text-green-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        )}
                        <CardTitle className="text-base">{plan.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={getSubjectColor(plan.subject)}>{plan.subject}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
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
                            className={`w-4 h-4 ${
                              favoriteLessonIds.includes(plan.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-gray-400"
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {!plan.isPublic && !unlockedLessons.has(plan.id) 
                        ? "This lesson plan is password protected. Click to unlock." 
                        : plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {plan.teacherName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {plan.duration}
                      </div>
                      {(() => {
                        const noteCount = availableNotesForAI.filter(n => n.lessonPlanId === plan.id).length;
                        return noteCount > 0 ? (
                          <div className="flex items-center gap-1 text-green-600">
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
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject === "all" ? "All Subjects" : subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pb-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No notes found</p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <Card 
                  key={note.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleNoteClick(note)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {!note.isPublic && (
                          <div className="shrink-0">
                            {unlockedNotes.has(note.id) ? (
                              <Globe className="w-4 h-4 text-green-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        )}
                        <CardTitle className="text-base">{note.title}</CardTitle>
                      </div>
                      <Badge className={`shrink-0 ${getSubjectColor(note.subject)}`}>{note.subject}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {!note.isPublic && !unlockedNotes.has(note.id) 
                        ? "This note is password protected. Click to unlock." 
                        : note.content.slice(0, 100) + "..."}
                    </CardDescription>
                    {note.lessonPlanId && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-green-700">
                        <BookOpen className="w-3 h-3" />
                        <span>
                          Linked to: {lessonPlans.find(plan => plan.id === note.lessonPlanId)?.title || "Lesson"}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
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

          {/* Note Detail Dialog */}
          <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
            <DialogContent className="max-w-md max-h-[85vh]">
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle>{selectedNote?.title}</DialogTitle>
                  <Badge className={selectedNote ? getSubjectColor(selectedNote.subject) : ""}>{selectedNote?.subject}</Badge>
                </div>
                <DialogDescription>{selectedNote?.teacherName}</DialogDescription>
                {selectedNote?.lessonPlanId && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                    <BookOpen className="w-4 h-4 text-green-700" />
                    <div className="flex-1">
                      <p className="text-xs text-green-700">Associated with lesson:</p>
                      <p className="text-sm">
                        {lessonPlans.find(plan => plan.id === selectedNote.lessonPlanId)?.title || "Lesson"}
                      </p>
                    </div>
                  </div>
                )}
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="whitespace-pre-wrap text-sm p-4 bg-gray-50 rounded-lg">
                  {selectedNote?.content}
                </div>
              </ScrollArea>
              
              {selectedNote?.lessonPlanId && (
                <DialogFooter className="mt-4">
                  <Button 
                    onClick={() => selectedNote.lessonPlanId && handleViewLinkedLesson(selectedNote.lessonPlanId)}
                    className="w-full"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Linked Lesson
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
              className="w-full"
            >
              <History className="w-4 h-4 mr-2" />
              View Conversation History
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
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No favorite lessons yet</p>
                <p className="text-sm mt-2">Tap the heart icon on any lesson to save it here</p>
              </div>
            ) : (
              lessonPlans
                .filter(plan => favoriteLessonIds.includes(plan.id))
                .map(plan => (
                  <Card 
                    key={plan.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handlePlanClick(plan)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          {!plan.isPublic && (
                            <div className="shrink-0">
                              {unlockedLessons.has(plan.id) ? (
                                <Globe className="w-4 h-4 text-green-600" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          )}
                          <CardTitle className="text-base">{plan.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={getSubjectColor(plan.subject)}>{plan.subject}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnfavoritingPlan(plan);
                            }}
                          >
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {!plan.isPublic && !unlockedLessons.has(plan.id) 
                          ? "This lesson plan is password protected. Click to unlock." 
                          : plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {plan.teacherName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {plan.duration}
                        </div>
                        {(() => {
                          const noteCount = availableNotesForAI.filter(n => n.lessonPlanId === plan.id).length;
                          return noteCount > 0 ? (
                            <div className="flex items-center gap-1 text-green-600">
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