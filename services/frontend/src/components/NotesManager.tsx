import { useState } from "react";
import { Note } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { getSubjectColor } from "../utils/subjectColors";
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
import { Plus, X, ArrowLeft, Pencil, Trash2, FileText, Lock, Globe, Upload } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Link } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { BookOpen } from "lucide-react";

type NotesManagerProps = {
  notes: Note[];
  onAdd: (note: Omit<Note, "id" | "createdAt">) => void;
  onUpdate: (id: string, note: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  lessonPlans: { id: string; title: string; subject: string }[];
};

export function NotesManager({ notes, onAdd, onUpdate, onDelete, onBack, lessonPlans }: NotesManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [lessonPlanId, setLessonPlanId] = useState("");

  const handleStartCreate = () => {
    setTitle("");
    setSubject("");
    setContent("");
    setTeacherName("");
    setIsPublic(true);
    setPassword("");
    setLessonPlanId("");
    setIsCreating(true);
  };

  const handleStartEdit = (note: Note) => {
    setTitle(note.title);
    setSubject(note.subject);
    setContent(note.content);
    setTeacherName(note.teacherName);
    setIsPublic(note.isPublic);
    setPassword(note.password || "");
    setLessonPlanId(note.lessonPlanId || "");
    setEditingNote(note);
    setSelectedNote(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !subject.trim() || !content.trim() || !teacherName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isPublic && !password.trim()) {
      toast.error("Please set a password for private notes");
      return;
    }

    const noteData: Omit<Note, "id" | "createdAt"> = {
      title: title.trim(),
      subject: subject.trim(),
      content: content.trim(),
      teacherName: teacherName.trim(),
      isPublic,
      ...(isPublic ? {} : { password: password.trim() }),
      lessonPlanId: lessonPlanId.trim(),
    };

    if (editingNote) {
      onUpdate(editingNote.id, noteData);
      toast.success("Note updated successfully");
      setEditingNote(null);
    } else {
      onAdd(noteData);
      toast.success("Note created successfully");
      setIsCreating(false);
    }

    // Reset form
    setTitle("");
    setSubject("");
    setContent("");
    setTeacherName("");
    setIsPublic(true);
    setPassword("");
    setLessonPlanId("");
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingNote(null);
    setTitle("");
    setSubject("");
    setContent("");
    setTeacherName("");
    setIsPublic(true);
    setPassword("");
    setLessonPlanId("");
  };

  const handleDelete = () => {
    if (deletingNote) {
      onDelete(deletingNote.id);
      setDeletingNote(null);
      setSelectedNote(null);
      toast.success("Note deleted");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'txt' || fileExtension === 'md') {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setContent(text);
          toast.success(`File "${file.name}" loaded`);
        };
        reader.readAsText(file);
      } else if (fileExtension === 'pdf') {
        // Handle PDF files
        handlePDFUpload(file);
      } else if (fileExtension === 'doc' || fileExtension === 'docx') {
        // Handle Word documents
        handleWordUpload(file);
      } else {
        toast.error('Unsupported file type. Please use .txt, .md, .pdf, .doc, or .docx files.');
      }
    }
  };

  const handlePDFUpload = async (file: File) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      setContent(fullText.trim());
      toast.success(`PDF "${file.name}" loaded successfully`);
    } catch (error) {
      console.error('Error reading PDF:', error);
      toast.error('Failed to read PDF file. Please try a different file.');
    }
  };

  const handleWordUpload = async (file: File) => {
    try {
      const mammoth = await import('mammoth');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      setContent(result.value);
      toast.success(`Word document "${file.name}" loaded successfully`);
    } catch (error) {
      console.error('Error reading Word document:', error);
      toast.error('Failed to read Word document. Please try a different file.');
    }
  };

  if (isCreating || editingNote) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{editingNote ? "Edit" : "Create"} Note</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Photosynthesis Key Concepts"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Biology"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacherName">Teacher Name *</Label>
                  <Input
                    id="teacherName"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g., Ms. Johnson"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lessonPlan" className="flex items-center gap-2">
                  <Link className="w-3 h-3" />
                  Associated Lesson Plan (Optional)
                </Label>
                <Select value={lessonPlanId} onValueChange={setLessonPlanId}>
                  <SelectTrigger id="lessonPlan">
                    <SelectValue placeholder="Select a lesson plan (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">No associated lesson</span>
                    </SelectItem>
                    {lessonPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3 h-3" />
                          <span>{plan.title}</span>
                          <Badge variant="outline" className="text-xs ml-1">{plan.subject}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Link this note to a specific lesson plan for better organization
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Note Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your notes, key concepts, examples, explanations..."
                  rows={12}
                  required
                />
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    <Upload className="w-3 h-3" />
                    Upload from file
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-xs text-gray-500">Supports .txt, .md, .pdf, .doc, .docx</span>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPublic">Make this note public</Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Public notes are accessible to all students
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                {!isPublic && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set a password for this note"
                      required={!isPublic}
                    />
                    <p className="text-xs text-gray-500">
                      Students will need this password to access the note
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingNote ? "Update" : "Create"} Note
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedNote) {
    const associatedLesson = selectedNote.lessonPlanId 
      ? lessonPlans.find(plan => plan.id === selectedNote.lessonPlanId)
      : null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleStartEdit(selectedNote)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingNote(selectedNote)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {selectedNote.isPublic ? (
                <Globe className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
              <CardTitle>{selectedNote.title}</CardTitle>
            </div>
            <CardDescription>
              {selectedNote.subject} • {selectedNote.teacherName} • {selectedNote.createdAt}
            </CardDescription>
            {associatedLesson && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                <BookOpen className="w-4 h-4 text-green-700" />
                <div className="flex-1">
                  <p className="text-xs text-green-700">Associated with lesson:</p>
                  <p className="text-sm">{associatedLesson.title}</p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="whitespace-pre-wrap text-sm p-4 bg-gray-50 rounded-lg">
                {selectedNote.content}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <AlertDialog open={!!deletingNote} onOpenChange={() => setDeletingNote(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingNote?.title}"?
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Study Notes
              </CardTitle>
              <CardDescription className="mt-1">
                Create and manage notes for students
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleStartCreate}>
                <Plus className="w-3 h-3 mr-1" />
                New Note
              </Button>
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3 pb-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No notes yet</p>
            <p className="text-sm">Create your first study note to help students learn</p>
          </div>
        ) : (
          notes.map(note => {
            const associatedLesson = note.lessonPlanId 
              ? lessonPlans.find(plan => plan.id === note.lessonPlanId)
              : null;

            return (
              <Card
                key={note.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedNote(note)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {note.isPublic ? (
                        <Globe className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <CardTitle className="text-base">{note.title}</CardTitle>
                    </div>
                    <Badge className={`shrink-0 ${getSubjectColor(note.subject)}`}>{note.subject}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {note.content.slice(0, 100)}...
                  </CardDescription>
                  {associatedLesson && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-green-700">
                      <BookOpen className="w-3 h-3" />
                      <span>Linked to: {associatedLesson.title}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{note.teacherName}</span>
                    <Badge variant={note.isPublic ? "default" : "secondary"} className="text-xs">
                      {note.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}