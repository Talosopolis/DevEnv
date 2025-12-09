import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { TeacherView } from "./components/TeacherView";
import { StudentView } from "./components/StudentView";
import SpaceInvaders from "./components/SpaceInvaders";
import { GraduationCap, BookOpen, Gamepad2, Upload, FileType, Search, Hexagon, Quote, Terminal, LogOut } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import { SignIn } from "./components/SignIn";
import { LandingPage } from "./components/LandingPage";
import { Manifesto } from "./components/Manifesto";
import { Covenant } from "./components/Covenant";
import { Library } from "./components/Library";
import { Game } from "./components/Game";
import { PageLayout } from "./components/ui/PageLayout";
import { LivingBackground } from "./components/ui/LivingBackground";
import { LessonPlan, Note, Conversation, Message } from "./types";
import { MOCK_LESSON_PLANS, MOCK_NOTES } from "./mockData";

// --- Mock Data (Restored from Backup) ---
// Using imports from mockData.ts to keep this file clean but functionally identical to backup
const mockLessonPlans: LessonPlan[] = MOCK_LESSON_PLANS;
const mockNotes: Note[] = MOCK_NOTES;

const mockConversations: Conversation[] = [
  { id: '1', studentName: 'Initiator', messages: [{ id: 'm1', role: 'user', content: 'I found the biology module confusing.' }], timestamp: '2023-10-26T10:00:00Z', archived: false },
  { id: '2', studentName: 'Oracle', messages: [{ id: 'm2', role: 'assistant', content: 'The archives are vast. Focus on the core principles.' }], timestamp: '2023-10-25T14:30:00Z', archived: false },
];

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-stone-950 font-serif text-stone-200 selection:bg-amber-500/30">
        <Toaster position="top-center" toastOptions={{
          className: 'bg-stone-900 border border-amber-900/50 text-stone-200',
          descriptionClassName: 'text-stone-400'
        }} />
        <AppContent />
      </div>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, signOut, bypassAuth } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');

  // --- STATE INITIALIZATION (Raw Backup Logic) ---
  // We initialize directly with Mocks, no async loading that might fail.
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>(mockLessonPlans);
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);

  const [favoriteLessonIds, setFavoriteLessonIds] = useState<string[]>([]);
  const [activeGameTopic, setActiveGameTopic] = useState<string | null>(null);

  // Teacher Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [generatedCourse, setGeneratedCourse] = useState<any | null>(null);

  // --- NAVIGATION ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) setCurrentView(hash);
      else setCurrentView('landing');
    };

    handleHashChange(); // Initial check
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: string) => {
    window.location.hash = view;
  };


  // --- ACTION HANDLERS (From Backup) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("UPLOADING ARTIFACT TO TALOS CORE...");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', 'biology-101'); // Hardcoded for demo

    try {
      // Mocking the RAG upload for now to prevent errors
      // const res = await fetch('http://localhost:8000/ingest', { ... });

      await new Promise(resolve => setTimeout(resolve, 2000)); // Fake delay

      setUploadStatus(`ARTIFACT ANALYZED. CURRICULUM GENERATED.`);

      // Auto-add to lesson plans
      const newPlan: LessonPlan = {
        id: Date.now().toString(),
        title: "Analysed Artifact: " + file.name,
        subject: "AI Generated",
        grade: "Universal",
        description: "Curriculum generated from uploaded artifact analysis.",
        objectives: ["Mastery of uploaded content"],
        materials: ["Uploaded Document"],
        activities: ["Adaptive Quiz"],
        duration: "Self-paced",
        teacherName: "Talos AI",
        createdAt: new Date().toISOString().split('T')[0],
        isPublic: true
      };
      setLessonPlans(prev => [newPlan, ...prev]);
      setGeneratedCourse({ title: newPlan.title, modules: [] }); // Dummy preview

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error("Upload failed", err);
      setUploadStatus("TRANSMISSION FAILED. CORE OFFLINE.");
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


  // --- VIEW ROUTING ---
  if (currentView === 'landing') {
    return <LandingPage
      onLogin={() => navigateTo('signin')}
      onRegister={() => navigateTo('signin')}
      onHeroClick={() => navigateTo('manifesto')}
      onLibraryClick={() => navigateTo('library')}
      onCovenantClick={() => navigateTo('covenant')}
      onGameClick={() => navigateTo('game')}
      onGuestAccess={() => { bypassAuth(); navigateTo('dashboard'); }}
    />;
  }

  if (currentView === 'signin') {
    return <SignIn onBack={() => navigateTo('landing')} />;
  }

  // Manifesto / Covenant / Library / Game static pages
  if (currentView === 'manifesto') return <Manifesto onBack={() => navigateTo('landing')} />;
  if (currentView === 'covenant') return <Covenant onBack={() => navigateTo('landing')} />;
  if (currentView === 'library') return <Library onBack={() => navigateTo('landing')} onSearch={async () => "Search functionality coming soon."} />;
  if (currentView === 'game') return <Game onBack={() => navigateTo('landing')} />;


  // --- DASHBOARD (Main App) ---
  if (currentView === 'dashboard') {
    if (!user) {
      // Redirect to signin if not logged in (and not in bypass mode which usually sets user)
      // But if we just want to show the dashboard for debugging:
      // return <SignIn onBack={() => navigateTo('landing')} />; 
    }

    return (
      <div className="relative w-full min-h-screen bg-stone-950 text-stone-200 overflow-x-hidden">
        {/* Living Background Layer */}
        <div className="fixed inset-0 z-0">
          <LivingBackground faint={true} />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          <header className="bg-stone-900/90 backdrop-blur-md border-b border-amber-900/30 p-4 sticky top-0 z-20 flex justify-between items-center w-full shadow-lg">
            <div>
              <h1 className="flex items-center gap-2 text-amber-500 font-bold tracking-widest uppercase text-sm">
                <Hexagon className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                Talosopolis
              </h1>
              <p className="text-[10px] text-stone-500 tracking-[0.2em] ml-7">AIDED EDUCATION</p>
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                    @{user.name.split(' ')[0].toUpperCase()}
                  </p>
                  <p className="text-[9px] text-amber-500/70 tracking-widest">STUDENT</p>
                </div>
              )}
              <button onClick={() => { signOut(); navigateTo('landing'); }} className="p-2 hover:bg-red-950/30 rounded-full group transition-colors" title="Disconnect">
                <LogOut className="w-4 h-4 text-stone-600 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          </header>

          <main className="flex-grow w-full max-w-7xl mx-auto p-0 sm:p-4 pb-24">
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-amber-900/30 bg-stone-900/50 p-0 h-10 sticky top-[69px] z-10 backdrop-blur-sm">
                <TabsTrigger
                  value="student"
                  className="gap-2 rounded-none data-[state=active]:bg-amber-950/20 data-[state=active]:text-amber-500 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-stone-500 text-xs tracking-widest uppercase transition-all"
                >
                  <GraduationCap className="w-3 h-3" />
                  Scholar
                </TabsTrigger>
                <TabsTrigger
                  value="teacher"
                  className="gap-2 rounded-none data-[state=active]:bg-amber-950/20 data-[state=active]:text-amber-500 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-stone-500 text-xs tracking-widest uppercase transition-all"
                >
                  <BookOpen className="w-3 h-3" />
                  Magister
                </TabsTrigger>
                <TabsTrigger
                  value="arcade"
                  className="gap-2 rounded-none data-[state=active]:bg-amber-950/20 data-[state=active]:text-amber-500 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-stone-500 text-xs tracking-widest uppercase transition-all"
                >
                  <Gamepad2 className="w-3 h-3" />
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
                  generatedCourse={generatedCourse}
                />
              </TabsContent>
              <TabsContent value="student" className="m-0 p-0 sm:p-4 min-h-[80vh]">
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
              <TabsContent value="arcade" className="m-0 p-4 min-h-[80vh]">
                {!activeGameTopic ? (
                  <div className="space-y-6">
                    <div className="col-span-full mb-4 text-center border-b border-amber-900/30 pb-4">
                      <h2 className="text-xl font-bold text-amber-500 uppercase tracking-widest mb-1">Simulated Reality</h2>
                      <p className="text-[10px] text-stone-500 uppercase tracking-wide">Select a cartridge to initiate training protocol</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lessonPlans.map(plan => (
                        <div
                          key={plan.id}
                          onClick={() => setActiveGameTopic(plan.title)}
                          className="group cursor-pointer border border-amber-900/30 hover:border-amber-500/50 rounded-none p-6 bg-stone-900/50 hover:bg-amber-950/10 transition-all duration-300 relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none"></div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-stone-300 group-hover:text-amber-500 uppercase tracking-wide transition-colors">{plan.title}</h3>
                              <div className="flex items-center gap-2 text-[10px] text-stone-600 group-hover:text-amber-500/70 mt-2 uppercase tracking-wider">
                                <Gamepad2 className="w-3 h-3" />
                                <span>{plan.subject} • {plan.grade}</span>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 font-mono text-xs animate-pulse">
                              INSERT
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <SpaceInvaders topic={activeGameTopic} onExit={() => setActiveGameTopic(null)} />
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    );
  }

  return null;
}