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
  /* Removed password state variables */
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<LessonPlan | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ plan: LessonPlan, timeout: ReturnType<typeof setTimeout> } | null>(null);
  const [unfavoritingPlan, setUnfavoritingPlan] = useState<LessonPlan | null>(null);
  const [recentlyUnfavorited, setRecentlyUnfavorited] = useState<{ planId: string, timeout: ReturnType<typeof setTimeout> } | null>(null);

  // Get unique subjects
  const subjects = ["all", ...Array.from(new Set((lessonPlans || []).map(plan => plan.subject || "General")))];

  // Filter lesson plans
  const filteredPlans = lessonPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || plan.subject === selectedSubject;
    const notDeleted = !recentlyDeleted || recentlyDeleted.plan.id !== plan.id;
    const isPublished = plan.status === 'published' || !plan.status; // Legacy plans have no status
    return matchesSearch && matchesSubject && notDeleted && isPublished;
  });

  const handlePlanClick = (plan: LessonPlan) => {
    setSelectedPlan(plan);
  };

  /* Removed handlePasswordSubmitUpdated */

  const handleLaunchLesson = (plan: LessonPlan) => {
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

  /* Removed isLessonUnlocked and isNoteUnlocked */

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
  };

  // Filter available lessons for AI (all available now)
  const availableLessonsForAI = lessonPlans;

  // Filter available notes for AI (all available now)
  const availableNotesForAI = notes;

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
      <>
        <LessonViewer
          lessonPlan={viewingLesson}
          notes={availableNotesForAI}
          onExit={() => setViewingLesson(null)}
          onNoteClick={handleNoteClick}
        />

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
      </>
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
                        <CardTitle className="text-base text-stone-200 group-hover:text-amber-500 transition-colors uppercase tracking-wide font-bold">{note.title}</CardTitle>
                      </div>
                      <Badge className={`rounded-none uppercase tracking-widest text-[10px] bg-stone-800 text-stone-400 border border-stone-700`}>{note.subject}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-stone-500 text-xs font-sans mt-2">
                      {note.content.slice(0, 100) + "..."}
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

          {/* Password Dialog Removed */}{/* Note Detail Dialog */}
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

      <TabsContent value="ai" className="m-0 h-full">
        <div className="h-full">
          {studentName && (
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="w-full rounded-none border-t-0 border-x-0 border-b border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-stone-300 uppercase tracking-widest text-[10px] h-8 bg-stone-900"
            >
              <History className="w-3 h-3 mr-2" />
              Conversation Logs
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
      <TabsList className="fixed bottom-0 left-0 right-0 w-full flex rounded-none border-t border-amber-900/30 bg-stone-900 h-16 shadow-lg z-50">
        <TabsTrigger
          value="lessons"
          className="gap-1 flex-col h-full flex-1 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors bg-transparent data-[state=active]:bg-transparent"
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest mt-1">Lessons</span>
        </TabsTrigger>
        <TabsTrigger
          value="notes"
          className="gap-1 flex-col h-full flex-1 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors bg-transparent data-[state=active]:bg-transparent"
        >
          <FileText className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest mt-1">Notes</span>
        </TabsTrigger>
        <TabsTrigger
          value="ai"
          className="gap-1.5 flex-col h-full flex-[1.5] bg-transparent data-[state=active]:bg-transparent relative group"
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] border-4 border-stone-900 transition-transform group-hover:scale-110">
              <Bot className="w-6 h-6 text-stone-900 fill-stone-900" />
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest mt-8 font-bold text-amber-500">AI</span>
        </TabsTrigger>
        <TabsTrigger
          value="favorites"
          className="gap-1 flex-col h-full flex-1 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors bg-transparent data-[state=active]:bg-transparent"
        >
          <Heart className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest mt-1">Favs</span>
        </TabsTrigger>
        <TabsTrigger
          value="games"
          className="gap-1 flex-col h-full flex-1 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors bg-transparent data-[state=active]:bg-transparent"
        >
          <Gamepad2 className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest mt-1">Games</span>
        </TabsTrigger>
      </TabsList>

      {/* Global Dialogs - Accessible from all tabs */}

      {/* Password Dialog Removed */}

      {/* Lesson Plan Detail Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-md max-h-[85vh] bg-stone-900 border-amber-900/50 text-stone-200 rounded-none">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-xl font-bold text-stone-200 uppercase tracking-wide">{selectedPlan?.title}</DialogTitle>
              <Badge className={`rounded-none bg-stone-800 text-stone-400 border border-stone-700 uppercase tracking-widest text-[10px]`}>{selectedPlan?.subject}</Badge>
            </div>
            <DialogDescription className="text-stone-500 text-xs font-mono mt-2">{selectedPlan?.description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 text-xs border-b border-stone-800 pb-4">
                <div className="flex items-center gap-1.5 text-stone-400 uppercase tracking-wider font-bold">
                  <User className="w-3 h-3 text-amber-700" />
                  {selectedPlan?.teacherName}
                </div>
                <div className="flex items-center gap-1.5 text-stone-400 uppercase tracking-wider font-bold">
                  <Clock className="w-3 h-3 text-amber-700" />
                  {selectedPlan?.duration}
                </div>
                <Badge variant="outline" className="rounded-none border-stone-700 text-stone-500 uppercase tracking-widest text-[10px]">{selectedPlan?.grade}</Badge>
              </div>

              {/* Learning Objectives */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-amber-500 text-sm uppercase tracking-widest font-bold">
                  <Target className="w-4 h-4" />
                  Learning Objectives
                </h3>
                <ul className="space-y-2 ml-1">
                  {(selectedPlan?.objectives || []).map((obj, idx) => (
                    <li key={idx} className="text-xs text-stone-400 flex items-start gap-2">
                      <span className="text-amber-700/50 mt-1">•</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Materials */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-amber-500 text-sm uppercase tracking-widest font-bold">
                  <Package className="w-4 h-4" />
                  Materials Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedPlan?.materials || []).map((material, idx) => (
                    <Badge key={idx} variant="outline" className="rounded-none border-stone-700 text-stone-400 bg-stone-900/50 uppercase tracking-widest text-[10px]">{material}</Badge>
                  ))}
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-amber-500 text-sm uppercase tracking-widest font-bold">
                  <Activity className="w-4 h-4" />
                  Activity Log
                </h3>
                <div className="relative border-l border-stone-800 ml-2 space-y-4 py-2">
                  {(selectedPlan?.activities || []).map((activity, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-stone-900 border border-amber-900/50 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-amber-700" />
                      </div>
                      <p className="text-xs text-stone-400">{activity}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attached Notes */}
              {selectedPlan && (() => {
                const attachedNotes = availableNotesForAI.filter(n => n.lessonPlanId === selectedPlan.id);
                return attachedNotes.length > 0 ? (
                  <div className="space-y-3 border-t border-stone-800 pt-4">
                    <h3 className="flex items-center gap-2 text-amber-500 text-sm uppercase tracking-widest font-bold">
                      <FileText className="w-4 h-4" />
                      Study Notes ({attachedNotes.length})
                    </h3>
                    <div className="space-y-2">
                      {attachedNotes.map((note) => (
                        <div
                          key={note.id}
                          className="text-xs bg-amber-950/10 border border-amber-900/20 p-3 flex items-center justify-between cursor-pointer hover:bg-amber-900/20 hover:border-amber-500/30 transition-all group"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNoteClick(note);
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-bold text-stone-300 uppercase tracking-wide group-hover:text-amber-500 transition-colors">{note.title}</div>
                            <div className="text-[10px] text-stone-600 mt-1 font-mono">ARCHIVIST: {note.teacherName}</div>
                          </div>
                          <ArrowRight className="w-3 h-3 text-stone-600 group-hover:text-amber-500 transition-colors shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 pt-4 border-t border-stone-800">
            <Button
              onClick={() => selectedPlan && handleLaunchLesson(selectedPlan)}
              className="w-full rounded-none bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold uppercase tracking-widest text-xs h-10"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Initialize Module
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