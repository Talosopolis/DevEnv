import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { TeacherView } from "./components/TeacherView";
import { StudentView } from "./components/StudentView";
import SpaceInvaders from "./components/SpaceInvaders";
import { GraduationCap, BookOpen, Gamepad2, Upload, FileType } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

export type LessonPlan = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  description: string;
  objectives: string[];
  materials: string[];
  activities: string[];
  duration: string;
  teacherName: string;
  createdAt: string;
  isPublic: boolean;
  password?: string;
};

export type Note = {
  id: string;
  title: string;
  subject: string;
  content: string;
  teacherName: string;
  createdAt: string;
  fileUrl?: string;
  isPublic: boolean;
  password?: string;
  lessonPlanId?: string; // Links note to a specific lesson plan
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  relatedPlans?: string[];
  editedByTeacher?: boolean;
  rating?: "helpful" | "not-helpful" | null;
  citation?: {
    noteId?: string;
    noteTitle?: string;
    lessonPlanId?: string;
    lessonPlanTitle?: string;
  };
};

export type Conversation = {
  id: string;
  studentName: string;
  messages: Message[];
  timestamp: string;
  archived?: boolean;
};

// Mock data for demonstration
export const mockLessonPlans: LessonPlan[] = [
  {
    id: "1",
    title: "Introduction to Photosynthesis",
    subject: "Biology",
    grade: "8th Grade",
    description: "Learn how plants convert sunlight into energy through photosynthesis.",
    objectives: [
      "Understand the process of photosynthesis",
      "Identify the key components needed for photosynthesis",
      "Explain the importance of photosynthesis in the ecosystem"
    ],
    materials: ["Plant samples", "Microscope", "Worksheets", "Videos"],
    activities: [
      "Introduction and video presentation (15 min)",
      "Hands-on observation with microscope (20 min)",
      "Group discussion and Q&A (15 min)",
      "Worksheet completion (10 min)"
    ],
    duration: "60 minutes",
    teacherName: "Ms. Johnson",
    createdAt: "2025-10-20",
    isPublic: true
  },
  {
    id: "2",
    title: "World War II: Causes and Effects",
    subject: "History",
    grade: "10th Grade",
    description: "Explore the major causes and global effects of World War II.",
    objectives: [
      "Identify key events leading to WWII",
      "Analyze the political and economic factors",
      "Understand the war's impact on modern society"
    ],
    materials: ["Textbook", "Historical documents", "Map", "Documentary clips"],
    activities: [
      "Timeline activity (20 min)",
      "Document analysis in groups (25 min)",
      "Class discussion on impacts (20 min)",
      "Exit ticket reflection (5 min)"
    ],
    duration: "70 minutes",
    teacherName: "Mr. Chen",
    createdAt: "2025-10-18",
    isPublic: false,
    password: "history2025"
  },
  {
    id: "3",
    title: "Solving Linear Equations",
    subject: "Mathematics",
    grade: "7th Grade",
    description: "Master techniques for solving linear equations with one variable.",
    objectives: [
      "Solve one-step and two-step equations",
      "Apply inverse operations correctly",
      "Check solutions for accuracy"
    ],
    materials: ["Whiteboard", "Practice worksheets", "Calculator", "Online quiz"],
    activities: [
      "Warm-up review of inverse operations (10 min)",
      "Teacher demonstration of examples (15 min)",
      "Guided practice in pairs (20 min)",
      "Independent practice and assessment (15 min)"
    ],
    duration: "60 minutes",
    teacherName: "Mrs. Rodriguez",
    createdAt: "2025-10-22",
    isPublic: true
  }
];

export const mockNotes: Note[] = [
  {
    id: "1",
    title: "Photosynthesis Key Concepts",
    subject: "Biology",
    content: `Photosynthesis Overview:
- Process by which plants convert light energy into chemical energy
- Occurs in chloroplasts, specifically in chlorophyll
- Chemical equation: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂

Key Points:
1. Light-dependent reactions (occur in thylakoid membranes)
   - Light energy is captured by chlorophyll
   - Water molecules are split (photolysis)
   - Produces ATP and NADPH
   - Releases oxygen as byproduct

2. Light-independent reactions (Calvin Cycle - occurs in stroma)
   - Uses ATP and NADPH from light reactions
   - Carbon dioxide is fixed into glucose
   - Does not require direct light

Important Terms:
- Chlorophyll: Green pigment that absorbs light
- Stomata: Pores for gas exchange
- Glucose: Sugar product used for plant energy

Common Misconceptions:
- Plants don't only photosynthesize during the day (they also respire)
- Oxygen is a byproduct, not the main purpose
- Water provides electrons, not just hydrogen`,
    teacherName: "Ms. Johnson",
    createdAt: "2025-10-21",
    isPublic: true,
    lessonPlanId: "1" // Links to "Introduction to Photosynthesis"
  },
  {
    id: "2",
    title: "WWII Timeline and Major Events",
    subject: "History",
    content: `World War II Timeline (1939-1945)

Pre-War Events:
- 1933: Hitler becomes Chancellor of Germany
- 1936: Germany remilitarizes Rhineland
- 1938: Munich Agreement, Kristallnacht
- 1939: Germany invades Poland (Sept 1) - War begins

Major Events:
1940:
- Battle of Britain
- France falls to Germany
- Tripartite Pact signed

1941:
- Germany invades Soviet Union (Operation Barbarossa)
- Pearl Harbor attack (Dec 7) - US enters war
- Atlantic Charter

1942:
- Battle of Midway
- Stalingrad begins
- El Alamein

1943:
- Stalingrad ends - turning point
- Italy surrenders
- Tehran Conference

1944:
- D-Day (June 6)
- Liberation of Paris
- Battle of the Bulge

1945:
- Yalta Conference
- Germany surrenders (May 8 - VE Day)
- Atomic bombs dropped on Japan
- Japan surrenders (Aug 15 - VJ Day)

Key Themes:
- Totalitarianism vs Democracy
- Alliance systems
- Total war
- Holocaust
- Technological advancement`,
    teacherName: "Mr. Chen",
    createdAt: "2025-10-19",
    isPublic: false,
    password: "history2025",
    lessonPlanId: "3" // Links to "World War II: Causes and Consequences"
  }
];

const mockConversations: Conversation[] = [
  { id: '1', studentName: 'Alex', messages: [{ id: 'm1', role: 'user', content: 'I found the biology module confusing.' }], timestamp: '2023-10-26T10:00:00Z', archived: false },
  { id: '2', studentName: 'Sam', messages: [{ id: 'm2', role: 'assistant', content: 'Thanks for the feedback!' }], timestamp: '2023-10-25T14:30:00Z', archived: false },
];

export default function App() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>(mockLessonPlans);
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations); // Use mock data
  const [favoriteLessonIds, setFavoriteLessonIds] = useState<string[]>([]);
  const [activeGameTopic, setActiveGameTopic] = useState<string | null>(null);

  // Teacher Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading to Talos Cloud...");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', 'biology-101'); // Hardcoded for demo

    try {
      const res = await fetch('http://localhost:8000/ingest', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadStatus(`Success: ${data.message}`);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error("Upload failed", err);
      setUploadStatus("Upload failed. Backend offline?");
    } finally {
      setIsUploading(false);
    }
  };

  const addLessonPlan = (plan: Omit<LessonPlan, "id" | "createdAt">) => {
    const newPlan: LessonPlan = {
      ...plan,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setLessonPlans([newPlan, ...lessonPlans]);
  };

  const updateLessonPlan = (id: string, updatedPlan: Partial<LessonPlan>) => {
    setLessonPlans(lessonPlans.map(plan =>
      plan.id === id ? { ...plan, ...updatedPlan } : plan
    ));
  };

  const deleteLessonPlan = (id: string) => {
    setLessonPlans(lessonPlans.filter(plan => plan.id !== id));
  };

  const addNote = (note: Omit<Note, "id" | "createdAt">) => {
    const newNote: Note = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setNotes([...notes, newNote]);
  };

  const updateNote = (id: string, updatedNote: Partial<Note>) => {
    setNotes(notes.map(note => (note.id === id ? { ...note, ...updatedNote } : note)));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const addConversation = (conversation: Conversation) => {
    setConversations([conversation, ...conversations]);
  };

  const updateConversation = (id: string, updatedConversation: Partial<Conversation>) => {
    setConversations(conversations.map(conv =>
      conv.id === id ? { ...conv, ...updatedConversation } : conv
    ));
  };

  const deleteConversation = (id: string) => {
    setConversations(conversations.filter(conv => conv.id !== id));
  };

  const toggleFavorite = (lessonId: string) => {
    setFavoriteLessonIds(prev =>
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white p-6 pb-4">
          <h1 className="flex items-center gap-2 mb-1">
            <BookOpen className="w-7 h-7" />
            LessonShare
          </h1>
          <p className="text-amber-100 text-sm">Collaborate on education</p>
        </div>

        {/* Role Tabs */}
        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
            <TabsTrigger value="student" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Student
            </TabsTrigger>
            <TabsTrigger value="teacher" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Teacher
            </TabsTrigger>
            <TabsTrigger value="arcade" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              Arcade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teacher" className="m-0 p-4">
            <TeacherView
              lessonPlans={lessonPlans}
              notes={notes}
              conversations={conversations}
              onAdd={addLessonPlan}
              onUpdate={updateLessonPlan}
              onDelete={deleteLessonPlan}
              onAddNote={addNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onUpdateConversation={updateConversation}
              onDeleteConversation={deleteConversation}
            />
          </TabsContent>
          <TabsContent value="student" className="m-0 p-4">
            <StudentView
              lessonPlans={lessonPlans}
              notes={notes}
              conversations={conversations}
              favoriteLessonIds={favoriteLessonIds}
              onConversationComplete={addConversation}
              onUpdateConversation={updateConversation}
              onDeleteConversation={deleteConversation}
              onToggleFavorite={toggleFavorite}
            />
          </TabsContent>
          <TabsContent value="arcade" className="m-0 p-4">
            {!activeGameTopic ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full mb-4 text-center">
                  <h2 className="text-2xl font-bold text-slate-800">Select a Cartridge</h2>
                  <p className="text-slate-500">Choose a course to load into the arcade simulation.</p>
                </div>
                {lessonPlans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => setActiveGameTopic(plan.title)}
                    className="group cursor-pointer border-4 border-slate-200 hover:border-cyan-400 rounded-xl p-6 bg-slate-50 hover:bg-slate-900 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/10 transition-colors" />
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-400">{plan.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-slate-400 mt-2">
                      <Gamepad2 className="w-4 h-4" />
                      <span>{plan.subject} • {plan.grade}</span>
                    </div>
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 font-mono text-sm">
                      INSERT COIN &gt;&gt;
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SpaceInvaders topic={activeGameTopic} onExit={() => setActiveGameTopic(null)} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}