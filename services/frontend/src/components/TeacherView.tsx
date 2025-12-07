import { useState } from "react";
import { LessonPlan, Conversation, Note } from "../App";
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
import { toast } from "sonner@2.0.3";
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
  onDeleteConversation 
}: TeacherViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<LessonPlan | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{plan: LessonPlan, timeout: NodeJS.Timeout} | null>(null);
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
    <Tabs defaultValue="lessons" className="w-full">
      <TabsContent value="lessons" className="m-0 pb-20">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
            <Button onClick={() => setShowUpload(true)} variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>

          <div className="space-y-3 pb-4">
            {displayedLessonPlans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No lesson plans yet</p>
                <p className="text-sm">Create your first lesson plan to get started</p>
              </div>
            ) : (
              displayedLessonPlans.map(plan => (
                <Card key={plan.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {plan.isPublic ? (
                          <Globe className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <CardTitle className="text-base">{plan.title}</CardTitle>
                      </div>
                      <Badge className={`shrink-0 ${getSubjectColor(plan.subject)}`}>{plan.subject}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {plan.teacherName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {plan.duration}
                      </div>
                      <Badge variant="outline" className="text-xs">{plan.grade}</Badge>
                      <Badge variant={plan.isPublic ? "default" : "secondary"} className="text-xs">
                        {plan.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    
                    {/* Show attached notes count */}
                    {notes.filter(note => note.lessonPlanId === plan.id).length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 p-2 rounded-md">
                        <StickyNote className="w-3.5 h-3.5" />
                        <span>{notes.filter(note => note.lessonPlanId === plan.id).length} {notes.filter(note => note.lessonPlanId === plan.id).length === 1 ? 'note' : 'notes'} attached</span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddNoteToLesson(plan)}
                      >
                        <Paperclip className="w-3 h-3 mr-1" />
                        Note
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlan(plan)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeletingPlan(plan)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

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
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Add Note to Lesson Dialog */}
          <Dialog open={!!addingNoteToLesson} onOpenChange={() => setAddingNoteToLesson(null)}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Note to Lesson</DialogTitle>
                <DialogDescription>
                  Attach a study note to "{addingNoteToLesson?.title}"
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitNote} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="note-title">Note Title *</Label>
                  <Input
                    id="note-title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g., Key Concepts"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note-teacher">Teacher Name *</Label>
                  <Input
                    id="note-teacher"
                    value={noteTeacherName}
                    onChange={(e) => setNoteTeacherName(e.target.value)}
                    placeholder="e.g., Ms. Johnson"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note-content">Note Content *</Label>
                  <Textarea
                    id="note-content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter notes or upload a file below..."
                    rows={8}
                    required
                  />
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="note-file-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
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
                    <span className="text-xs text-gray-500">
                      Supports .txt, .md, .pdf, .doc, .docx
                    </span>
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="note-public">Make this note public</Label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Public notes are accessible to all students
                      </p>
                    </div>
                    <Switch
                      id="note-public"
                      checked={noteIsPublic}
                      onCheckedChange={setNoteIsPublic}
                    />
                  </div>

                  {!noteIsPublic && (
                    <div className="space-y-2">
                      <Label htmlFor="note-password">Password *</Label>
                      <Input
                        id="note-password"
                        type="password"
                        value={notePassword}
                        onChange={(e) => setNotePassword(e.target.value)}
                        placeholder="Set a password for this note"
                        required={!noteIsPublic}
                      />
                      <p className="text-xs text-gray-500">
                        Students will need this password to access the note
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddingNoteToLesson(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Note
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
          onBack={() => {}}
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
          onBack={() => {}}
        />
      </TabsContent>

      {/* Bottom Navigation */}
      <TabsList className="fixed bottom-0 left-0 right-0 max-w-md mx-auto grid grid-cols-4 rounded-none border-t bg-white h-16 shadow-lg">
        <TabsTrigger value="lessons" className="gap-1 flex-col h-full">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs">Lessons</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-1 flex-col h-full">
          <FileText className="w-5 h-5" />
          <span className="text-xs">Notes</span>
        </TabsTrigger>
        <TabsTrigger value="upload" className="gap-1 flex-col h-full">
          <Upload className="w-5 h-5" />
          <span className="text-xs">Upload</span>
        </TabsTrigger>
        <TabsTrigger value="conversations" className="gap-1 flex-col h-full">
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs">AI Chat</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}