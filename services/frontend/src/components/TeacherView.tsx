import { useState, useRef } from "react";
import { LessonPlan, Note, Conversation } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Plus, Clock, User, Pencil, Trash2, BookOpen, Upload, MessageSquare, Lock, Globe, FileText, Paperclip, StickyNote } from "lucide-react";
import { LessonPlanForm } from "./LessonPlanForm";
import { FileUpload } from "./FileUpload";
import { ConversationReview } from "./ConversationReview";
import { NotesManager } from "./NotesManager";
import { getSubjectColor } from "../utils/subjectColors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
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

type TeacherViewProps = {
  lessonPlans: LessonPlan[];
  notes: Note[];
  conversations: Conversation[];
  onAdd: (plan: Omit<LessonPlan, "id" | "createdAt">) => void;
  onUpdate: (id: string, plan: Partial<LessonPlan>) => void;
  onDelete: (id: string) => void;
  onAddNote: (note: Omit<Note, "id" | "createdAt">) => void;
  onUpdateNote: (id: string, note: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onUpdateConversation: (id: string, updatedConversation: Partial<Conversation>) => void;
  onDeleteConversation: (id: string) => void;
  generatedCourse?: any; // New prop for AI generated structure
};

export function TeacherView({
  lessonPlans,
  notes,
  conversations,
  onAdd,
  onUpdate,
  onDelete,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateConversation,
  onDeleteConversation,
  generatedCourse
}: TeacherViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<LessonPlan | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ plan: LessonPlan, timeout: NodeJS.Timeout } | null>(null);
  const [extractedPlan, setExtractedPlan] = useState<Omit<LessonPlan, "id" | "createdAt"> | null>(null);
  const [addingNoteToLesson, setAddingNoteToLesson] = useState<LessonPlan | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTeacherName, setNoteTeacherName] = useState("");
  const [noteIsPublic, setNoteIsPublic] = useState(true);
  const [notePassword, setNotePassword] = useState("");

  const handleAdd = (plan: Omit<LessonPlan, "id" | "createdAt">) => {
    onAdd(plan);
    setShowForm(false);
    setExtractedPlan(null);
  };

  const handleEdit = (plan: Omit<LessonPlan, "id" | "createdAt">) => {
    if (editingPlan) {
      onUpdate(editingPlan.id, plan);
      setEditingPlan(null);
    }
  };

  const handleDelete = () => {
    if (deletingPlan) {
      const planToDelete = deletingPlan;
      // Store the lesson for potential undo
      const timeout = setTimeout(() => {
        onDelete(planToDelete.id);
        setRecentlyDeleted(null);
      }, 5000); // 5 seconds to undo

      setRecentlyDeleted({ plan: planToDelete, timeout });
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

  const handleExtracted = (plan: Omit<LessonPlan, "id" | "createdAt">) => {
    setExtractedPlan(plan);
    setShowUpload(false);
    setShowForm(true);
  };

  const handleAddNoteToLesson = (lesson: LessonPlan) => {
    setAddingNoteToLesson(lesson);
    setNoteTitle("");
    setNoteContent("");
    setNoteTeacherName("");
    setNoteIsPublic(true);
    setNotePassword("");
  };

  const handleNoteFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'txt' || fileExtension === 'md') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setNoteContent(text);
        if (!noteTitle) {
          setNoteTitle(file.name.replace(/\.[^/.]+$/, ""));
        }

        // Background Ingest to AI
        const formData = new FormData();
        formData.append("file", file);
        formData.append("course_id", "default");
        fetch("http://localhost:8000/ingest", { method: "POST", body: formData })
          .catch(e => console.error("AI Ingest Error:", e));

        toast.success(`File "${file.name}" loaded`);
      };
      reader.readAsText(file);
    } else if (fileExtension === 'pdf') {
      await handleNotePDFUpload(file);
    } else if (fileExtension === 'doc' || fileExtension === 'docx') {
      await handleNoteWordUpload(file);
    } else {
      toast.error('Unsupported file type. Please use .txt, .md, .pdf, .doc, or .docx files.');
    }
  };

  const handleNotePDFUpload = async (file: File) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      setNoteContent(fullText.trim());
      if (!noteTitle) {
        setNoteTitle(file.name.replace(/\.[^/.]+$/, ""));
      }

      // Background Ingest to AI
      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_id", "default");
      fetch("http://localhost:8000/ingest", { method: "POST", body: formData })
        .catch(e => console.error("AI Ingest Error:", e));

      toast.success(`PDF "${file.name}" loaded successfully`);
    } catch (error) {
      console.error('Error reading PDF:', error);
      toast.error('Failed to read PDF file. Please try a different file.');
    }
  };

  const handleNoteWordUpload = async (file: File) => {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      setNoteContent(result.value);
      if (!noteTitle) {
        setNoteTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      toast.success(`Word document "${file.name}" loaded successfully`);
    } catch (error) {
      console.error('Error reading Word document:', error);
      toast.error('Failed to read Word document. Please try a different file.');
    }
  };

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteTitle.trim() || !noteContent.trim() || !noteTeacherName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!noteIsPublic && !notePassword.trim()) {
      toast.error("Please set a password for private notes");
      return;
    }

    if (!addingNoteToLesson) return;

    const noteData: Omit<Note, "id" | "createdAt"> = {
      title: noteTitle.trim(),
      subject: addingNoteToLesson.subject,
      content: noteContent.trim(),
      teacherName: noteTeacherName.trim(),
      isPublic: noteIsPublic,
      ...(noteIsPublic ? {} : { password: notePassword.trim() }),
      lessonPlanId: addingNoteToLesson.id,
    };

    onAddNote(noteData);
    toast.success("Note added to lesson successfully");
    setAddingNoteToLesson(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteTeacherName("");
    setNoteIsPublic(true);
    setNotePassword("");
  };

  if (showConversations) {
    return (
      <ConversationReview
        conversations={conversations}
        onUpdateConversation={onUpdateConversation}
        onBack={() => setShowConversations(false)}
      />
    );
  }

  if (showUpload) {
    return (
      <FileUpload
        onExtracted={handleExtracted}
        onCancel={() => setShowUpload(false)}
      />
    );
  }

  if (showForm) {
    return (
      <LessonPlanForm
        initialData={extractedPlan as any}
        onSubmit={handleAdd}
        onCancel={() => {
          setShowForm(false);
          setExtractedPlan(null);
        }}
      />
    );
  }

  if (editingPlan) {
    return (
      <LessonPlanForm
        initialData={editingPlan}
        onSubmit={handleEdit}
        onCancel={() => setEditingPlan(null)}
      />
    );
  }

  const unreadCount = conversations.filter(conv =>
    conv.messages.some(msg => msg.role === "assistant" && !msg.editedByTeacher)
  ).length;

  // Filter out recently deleted lessons
  const displayedLessonPlans = lessonPlans.filter(plan => {
    const notDeleted = !recentlyDeleted || recentlyDeleted.plan.id !== plan.id;
    return notDeleted;
  });

  return (
    <Tabs defaultValue="lessons" className="w-full font-serif">
      <TabsContent value="lessons" className="m-0 pb-20">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setShowForm(true)} className="w-full bg-amber-600 hover:bg-amber-700 text-stone-950 font-bold rounded-none uppercase tracking-widest shadow-[0_2px_10px_rgba(217,119,6,0.2)]">
              <Plus className="w-4 h-4 mr-2" />
              New Archive
            </Button>
            <Button onClick={() => setShowUpload(true)} variant="outline" className="w-full border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 rounded-none uppercase tracking-widest">
              <Upload className="w-4 h-4 mr-2" />
              Ingest Data
            </Button>
          </div>

          {/* Generated Course Preview */}
          {generatedCourse && (
            <div className="bg-stone-900 border border-amber-500/30 rounded-none p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-1000" />

              <div className="flex items-center gap-2 mb-4 text-amber-500 border-b border-amber-900/30 pb-2">
                <div className="w-2 h-2 bg-amber-500 rounded-none rotate-45 animate-pulse" />
                <h3 className="font-bold uppercase tracking-widest text-xs">Genesis Engine // Output Stream</h3>
              </div>

              <h2 className="text-xl font-bold text-stone-200 mb-2 uppercase tracking-wide">{generatedCourse.title}</h2>
              <p className="text-stone-500 text-sm mb-6 font-mono border-l-2 border-stone-800 pl-3">{generatedCourse.description}</p>

              <div className="space-y-4">
                {generatedCourse.modules?.map((mod: any, i: number) => (
                  <div key={i} className="bg-stone-950/50 rounded-none border border-stone-800 p-4 hover:border-amber-900/50 transition-colors">
                    <h4 className="text-amber-600 font-bold text-sm mb-2 uppercase tracking-wide flex items-center gap-2">
                      <span className="text-stone-700 text-[10px]">0{i + 1}</span>
                      {mod.title}
                    </h4>
                    <p className="text-stone-500 text-xs mb-3 indent-4">{mod.description}</p>
                    <div className="pl-3 border-l border-amber-900/30 space-y-2">
                      {mod.lessons?.map((lesson: any, j: number) => (
                        <div key={j} className="text-xs text-stone-400 flex items-center gap-2 font-mono">
                          <span className="w-1 h-1 bg-stone-700 rotate-45" />
                          {lesson.title}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pb-4">
            {displayedLessonPlans.length === 0 ? (
              <div className="text-center py-20 text-stone-600 border border-dashed border-stone-800 bg-stone-900/20">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="uppercase tracking-widest text-xs mb-2">Archive Empty</p>
                <p className="text-[10px] text-stone-700">Initialize a new record to begin</p>
              </div>
            ) : (
              displayedLessonPlans.map(plan => (
                <Card key={plan.id} className="bg-stone-900 border-amber-900/20 rounded-none group hover:border-amber-500/30 transition-all">
                  <CardHeader className="pb-3 border-b border-stone-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1">
                        {plan.isPublic ? (
                          <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-stone-500 shrink-0" />
                        )}
                        <CardTitle className="text-base text-stone-200 group-hover:text-amber-500 transition-colors uppercase tracking-wide font-bold">{plan.title}</CardTitle>
                      </div>
                      <Badge className={`rounded-none uppercase tracking-widest text-[10px] bg-stone-800 text-stone-400 border border-stone-700`}>{plan.subject}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-stone-500 text-xs font-sans mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="flex items-center gap-4 text-xs text-stone-500 uppercase tracking-wider font-bold">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-700" />
                        {plan.teacherName}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-700" />
                        {plan.duration}
                      </div>
                      <Badge variant="outline" className="text-[10px] rounded-none border-stone-700 text-stone-400">{plan.grade}</Badge>
                      <Badge variant={plan.isPublic ? "default" : "secondary"} className={`text-[10px] rounded-none ${plan.isPublic ? 'bg-amber-900/20 text-amber-500 border border-amber-900/50' : 'bg-stone-800 text-stone-500 border border-stone-700'}`}>
                        {plan.isPublic ? "PUBLIC" : "RESTRICTED"}
                      </Badge>
                    </div>

                    {/* Show attached notes count */}
                    {notes.filter(note => note.lessonPlanId === plan.id).length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-950/20 p-2 border border-amber-900/20 uppercase tracking-widest font-bold">
                        <StickyNote className="w-3.5 h-3.5" />
                        <span>{notes.filter(note => note.lessonPlanId === plan.id).length} {notes.filter(note => note.lessonPlanId === plan.id).length === 1 ? 'DOC' : 'DOCS'} ATTACHED</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddNoteToLesson(plan)}
                        className="rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-[10px]"
                      >
                        <Paperclip className="w-3 h-3 mr-1" />
                        Attach
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlan(plan)}
                        className="rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-[10px]"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Modify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none border-red-900/30 text-red-700 hover:bg-red-950/10 hover:text-red-600 uppercase tracking-widest text-[10px]"
                        onClick={() => setDeletingPlan(plan)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Purge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
            <AlertDialogContent className="bg-stone-900 border-red-900/50 text-stone-200 rounded-none">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-500 uppercase tracking-widest text-sm">Initiate Purge Sequence?</AlertDialogTitle>
                <AlertDialogDescription className="text-stone-500 text-xs">
                  Permanently removing "{deletingPlan?.title}" from the archives. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs">Abort</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-900/80 hover:bg-red-800 text-stone-200 rounded-none border border-red-700 uppercase tracking-widest text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                  Confirm Purge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Add Note to Lesson Dialog */}
          <Dialog open={!!addingNoteToLesson} onOpenChange={() => setAddingNoteToLesson(null)}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-stone-900 border-amber-900/50 text-stone-200 rounded-none">
              <DialogHeader>
                <DialogTitle className="text-amber-500 uppercase tracking-widest text-sm">Append Document</DialogTitle>
                <DialogDescription className="text-stone-500 text-xs">
                  Attaching new data to module "{addingNoteToLesson?.title}"
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitNote} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="note-title" className="uppercase tracking-widest text-[10px] text-stone-400">Document Title *</Label>
                  <Input
                    id="note-title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="E.G. CLASSIFIED ANNEX A"
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note-teacher" className="uppercase tracking-widest text-[10px] text-stone-400">Author *</Label>
                  <Input
                    id="note-teacher"
                    value={noteTeacherName}
                    onChange={(e) => setNoteTeacherName(e.target.value)}
                    placeholder="E.G. MAGISTER K."
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note-content" className="uppercase tracking-widest text-[10px] text-stone-400">Content Data *</Label>
                  <Textarea
                    id="note-content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Input raw text or upload file..."
                    rows={8}
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-300 placeholder:text-stone-700 focus:border-amber-500 rounded-none font-mono text-sm leading-relaxed"
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <Label
                      htmlFor="note-file-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-none border border-stone-600 uppercase tracking-wider transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      Upload File
                    </Label>
                    <input
                      id="note-file-upload"
                      type="file"
                      accept=".txt,.md,.pdf,.doc,.docx"
                      onChange={handleNoteFileUpload}
                      className="hidden"
                    />
                    <span className="text-[10px] text-stone-500 font-mono">
                      SUPPORTS: .TXT, .MD, .PDF, .DOC
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-stone-950/50 border border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="note-public" className="uppercase tracking-widest text-[10px] text-stone-300">Public Access</Label>
                      <p className="text-[10px] text-stone-600 mt-0.5 font-mono">
                        VISIBLE TO ALL INITIATES
                      </p>
                    </div>
                    <Switch
                      id="note-public"
                      checked={noteIsPublic}
                      onCheckedChange={setNoteIsPublic}
                      className="bg-stone-800 data-[state=checked]:bg-amber-600"
                    />
                  </div>

                  {!noteIsPublic && (
                    <div className="space-y-2 pt-2 border-t border-stone-800">
                      <Label htmlFor="note-password" className="uppercase tracking-widest text-[10px] text-amber-500">Security Clearance Code *</Label>
                      <Input
                        id="note-password"
                        type="password"
                        value={notePassword}
                        onChange={(e) => setNotePassword(e.target.value)}
                        placeholder="SET ACCESS CODE"
                        required={!noteIsPublic}
                        className="bg-stone-900 border-amber-900/50 text-amber-500 placeholder:text-amber-900/50 focus:border-amber-500 rounded-none tracking-widest"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddingNoteToLesson(null)} className="rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-none bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold uppercase tracking-widest text-xs">
                    Append
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </TabsContent>

      <TabsContent value="notes" className="m-0 pb-20">
        <NotesManager
          notes={notes}
          lessonPlans={lessonPlans}
          onAdd={onAddNote}
          onUpdate={onUpdateNote}
          onDelete={onDeleteNote}
          onBack={() => { }}
        />
      </TabsContent>

      <TabsContent value="upload" className="m-0 pb-20">
        <FileUpload
          onExtracted={handleExtracted}
          onCancel={() => setShowUpload(false)}
        />
      </TabsContent>

      <TabsContent value="conversations" className="m-0 pb-20">
        <ConversationReview
          conversations={conversations}
          onUpdateConversation={onUpdateConversation}
          onBack={() => { }}
        />
      </TabsContent>

      {/* Bottom Navigation */}
      <TabsList className="fixed bottom-0 left-0 right-0 max-w-md mx-auto grid grid-cols-4 rounded-none border-t border-amber-900/30 bg-stone-950 h-16 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50">
        <TabsTrigger
          value="lessons"
          className="gap-1 flex-col h-full rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest text-[10px]"
        >
          <BookOpen className="w-5 h-5" />
          <span>Archives</span>
        </TabsTrigger>
        <TabsTrigger
          value="notes"
          className="gap-1 flex-col h-full rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest text-[10px]"
        >
          <FileText className="w-5 h-5" />
          <span>Docs</span>
        </TabsTrigger>
        <TabsTrigger
          value="upload"
          className="gap-1 flex-col h-full rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest text-[10px]"
        >
          <Upload className="w-5 h-5" />
          <span>Ingest</span>
        </TabsTrigger>
        <TabsTrigger
          value="conversations"
          className="gap-1 flex-col h-full rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest text-[10px]"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Comms</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}