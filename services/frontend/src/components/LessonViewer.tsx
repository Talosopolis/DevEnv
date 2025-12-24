import { useState, useEffect } from "react";
import { LessonPlan, Note, Module, Lesson } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Package,
  Activity,
  BookOpen,
  ChevronRight,
  FileText,
  Lock,
  Play,
  RotateCcw,
  User
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import SpaceInvaders from "./SpaceInvaders";
import GameLauncher from "./GameLauncher";
import ExcavationGame from "./ExcavationGame";
import RedLightGreenLightGame from "./RedLightGreenLightGame";


type LessonViewerProps = {
  lessonPlan: LessonPlan;
  notes: Note[];
  onExit: () => void;
  onNoteClick?: (note: Note) => void;
};


export function LessonViewer({ lessonPlan, notes, onExit, onNoteClick }: LessonViewerProps) {
  if (lessonPlan.modules && lessonPlan.modules.length > 0) {
    return <ModularCourseViewer lessonPlan={lessonPlan} notes={notes} onExit={onExit} />;
  }
  return <LegacyLessonViewer lessonPlan={lessonPlan} notes={notes} onExit={onExit} onNoteClick={onNoteClick} />;
}

function ModularCourseViewer({ lessonPlan, notes, onExit }: { lessonPlan: LessonPlan, notes: Note[], onExit: () => void }) {
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<string, number>>({});

  // Game Selector
  const [selectedGame, setSelectedGame] = useState<'shmup' | 'excavation' | 'protocol' | null>(null);

  // Assessment State
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizTarget, setQuizTarget] = useState<{ m: number, l: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`progress_${lessonPlan.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Handle old Set format (array of strings) vs new Record
        if (Array.isArray(parsed)) {
          const migrated: Record<string, number> = {};
          parsed.forEach((k: string) => migrated[k] = 100); // Assume 100% for migration
          setCompletedLessons(migrated);
        } else {
          setCompletedLessons(parsed);
        }
      } catch (e) {
        console.error("Failed to load progress", e);
      }
    }
  }, [lessonPlan.id]);

  const initiateLessonCompletion = (moduleIdx: number, lessonIdx: number) => {
    setQuizTarget({ m: moduleIdx, l: lessonIdx });
    setShowQuiz(true);
    setSelectedGame(null); // Reset to launcher
  }

  const handleQuizPass = (score: number) => {
    if (quizTarget) {
      const lessonKey = `${quizTarget.m}-${quizTarget.l}`;
      const module = lessonPlan.modules![quizTarget.m];
      const lesson = module.lessons[quizTarget.l];

      const newRecord = { ...completedLessons, [lessonKey]: Math.max(score, completedLessons[lessonKey] || 0) };
      setCompletedLessons(newRecord);
      localStorage.setItem(`progress_${lessonPlan.id}`, JSON.stringify(newRecord));

      // Submit to Backend for Economy Rewards
      fetch('http://localhost:8000/submit-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: lesson.title,
          score: score,
          max_score: 100,
          user_id: "anonymous_hero",
          course_id: lessonPlan.id,
          module_index: quizTarget.m,
          lesson_index: quizTarget.l
        })
      }).catch(console.error);

      if (score >= 70) {
        toast.success(`LESSON MASTERED! SCORE: ${score}%`);
      } else {
        toast.warning(`ASSESSMENT COMPLETE. SCORE: ${score}%. 70% REQUIRED TO UNLOCK NEXT MODULE.`);
      }
      setShowQuiz(false);
      setQuizTarget(null);
    }
  };

  const handleQuizFail = () => {
    toast.error("ASSESSMENT FAILED. REVISE MATERIAL AND RETRY.");
    setShowQuiz(false);
    setQuizTarget(null);
  };

  const isModuleLocked = (moduleIdx: number) => {
    if (moduleIdx === 0) return false;
    const prevModule = lessonPlan.modules?.[moduleIdx - 1];
    if (!prevModule) return false;

    const prevModuleLessons = prevModule.lessons || [];
    // UNLOCK CONDITION: All lessons in previous module passed with >= 70%
    const allComplete = prevModuleLessons.every((_, lIdx) => {
      const score = completedLessons[`${moduleIdx - 1}-${lIdx}`] || 0;
      return score >= 70;
    });
    return !allComplete;
  };

  const getModuleProgress = (moduleIdx: number) => {
    const module = lessonPlan.modules?.[moduleIdx];
    if (!module || !module.lessons) return 0;
    const completedCount = module.lessons.filter((_, lIdx) => {
      const score = completedLessons[`${moduleIdx}-${lIdx}`] || 0;
      return score >= 70;
    }).length;
    return (completedCount / module.lessons.length) * 100;
  };

  // Render Logic
  if (activeModuleIndex !== null && activeLessonIndex !== null) {
    const module = lessonPlan.modules![activeModuleIndex];
    const lesson = module.lessons[activeLessonIndex];
    const lessonKey = `${activeModuleIndex}-${activeLessonIndex}`;
    const highScore = completedLessons[lessonKey] || 0;
    const isComplete = highScore >= 70;

    return (
      <div className="h-full bg-stone-950 flex flex-col font-serif">
        {/* Top Course Title Bar */}
        <div className="bg-stone-950 border-b border-amber-900/20 px-4 py-2 flex items-center shrink-0">
          <h1 className="text-stone-400 font-serif font-bold text-xs uppercase tracking-[0.2em]">{lessonPlan.title}</h1>
        </div>

        <div className="bg-stone-900 border-b border-amber-900/30 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveLessonIndex(null)} className="text-stone-400 hover:text-amber-500">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-stone-200 font-bold uppercase tracking-wide text-sm">{module.title}</h2>
              <p className="text-stone-500 text-xs font-mono">LESSON {activeLessonIndex + 1}: {lesson.title}</p>
            </div>
          </div>
          <Badge variant={isComplete ? "default" : "outline"} className={`rounded-none uppercase tracking-widest ${isComplete ? "bg-amber-900/20 text-amber-500 border-amber-900/50" : "text-stone-500 border-stone-700"}`}>
            {isComplete ? "Completed" : "In Progress"}
          </Badge>
        </div>

        {showQuiz ? (
          <div className="flex-1 bg-stone-950 p-4 flex flex-col items-center justify-center min-h-0">
            {!selectedGame ? (
              <GameLauncher
                onSelectGame={setSelectedGame}
                onExit={() => setShowQuiz(false)}
              />
            ) : (
              <div className={`w-full max-w-5xl aspect-[4/3] border-4 border-stone-800 bg-black rounded-lg overflow-hidden shadow-[0_0_50px_rgba(217,119,6,0.1)] relative transition-colors duration-500 ${selectedGame === 'excavation' ? 'border-amber-900/40' : ''}`}>
                <div className="absolute top-0 left-0 right-0 bg-stone-900/80 border-b border-stone-800 p-2 flex justify-between items-center z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() => setSelectedGame(null)}
                      className="cursor-pointer hover:bg-stone-800 p-1 rounded transition-colors text-stone-500 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-amber-500 font-bold uppercase tracking-widest border-l border-stone-700 pl-2">
                      {selectedGame === 'shmup' ? 'Defense Protocol' : selectedGame === 'excavation' ? 'Excavation Protocol' : 'Traffic Control Protocol'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] text-stone-400 font-mono">LIVE FEED</span>
                  </div>
                </div>

                {selectedGame === 'shmup' ? (
                  <SpaceInvaders
                    key={`shmup-${activeModuleIndex}-${activeLessonIndex}`}
                    topic={lessonPlan.title}
                    courseId={lessonPlan.id}
                    contextNotes={notes.filter(n => n.lessonPlanId === lessonPlan.id).map(n => n.content)}
                    contextContent={lesson.content}
                    onPass={(score) => handleQuizPass(score)}
                    onFail={handleQuizFail}
                    onExit={() => setShowQuiz(false)}
                    questionCount={3}
                  />
                ) : selectedGame === 'excavation' ? (
                  <ExcavationGame
                    key={`dig-${activeModuleIndex}-${activeLessonIndex}`}
                    courseId={lessonPlan.id}
                    topic={lessonPlan.title}
                    contextContent={lesson.content}
                    question={`Identify the core principle of: ${lesson.title}`} // Fallback
                    options={["Analysis", "Synthesis", "Evaluation", "Application"]} // Fallback
                    correctOptionIndex={0}
                    onPass={(score) => handleQuizPass(score)}
                    onFail={handleQuizFail}
                    onExit={() => setShowQuiz(false)}
                  />
                ) : (
                  <RedLightGreenLightGame
                    key={`protocol-${activeModuleIndex}-${activeLessonIndex}`}
                    courseId={lessonPlan.id}
                    topic={lesson.title}
                    contextContent={lesson.content}
                    contextNotes={notes.filter(n => n.lessonPlanId === lessonPlan.id).map(n => n.content)}
                    question={lesson.quiz?.question || `Identify the core principle of: ${lesson.title}`}
                    options={lesson.quiz?.options || ["Analysis", "Synthesis", "Evaluation", "Application"]}
                    correctOptionIndex={lesson.quiz?.correctIndex ?? 0}
                    onPass={(score) => {
                      handleQuizPass(score);
                      toast.success("Protocol Passed! Credits Awarded.");
                    }}
                    onFail={() => {
                      toast.error("Protocol Failed. Try Again.");
                    }}
                    onExit={() => {
                      setShowQuiz(false);
                      setSelectedGame(null);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="flex-1 p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-amber-500 uppercase tracking-widest">{lesson.title}</h1>
                <div className="flex items-center gap-4 text-xs font-mono text-stone-500 border-b border-stone-800 pb-4">
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {lesson.duration}</span>
                  <span className="flex items-center gap-2"><User className="w-4 h-4" /> {lessonPlan.teacherName}</span>
                </div>
                <div className="prose prose-invert prose-amber max-w-none text-stone-300">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold uppercase tracking-widest text-amber-500 mt-6 mb-4" {...props} />,
                      h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold uppercase tracking-wide text-stone-200 mt-6 mb-3 border-b border-stone-800 pb-2" {...props} />,
                      h3: ({ node, ...props }: any) => <h3 className="text-base font-bold text-amber-600 mt-4 mb-2" {...props} />,
                      p: ({ node, ...props }: any) => <p className="mb-4 leading-relaxed" {...props} />,
                      ul: ({ node, ...props }: any) => <ul className="list-disc list-inside space-y-1 mb-4 text-stone-400" {...props} />,
                      ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside space-y-1 mb-4 text-stone-400" {...props} />,
                      li: ({ node, ...props }: any) => <li className="pl-2" {...props} />,
                      blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-amber-500/50 pl-4 italic text-stone-500 my-4" {...props} />,
                      strong: ({ node, ...props }: any) => <strong className="text-amber-500 font-bold" {...props} />,
                      em: ({ node, ...props }: any) => <em className="text-amber-200" {...props} />,
                      code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                          <div className="bg-stone-900 border border-stone-800 p-4 rounded-none my-4 overflow-x-auto font-mono text-sm text-stone-300">
                            <code className={className} {...props}>{children}</code>
                          </div>
                        ) : (
                          <code className="bg-stone-800 px-1.5 py-0.5 rounded-sm text-amber-500 font-mono text-xs border border-stone-700" {...props}>{children}</code>
                        );
                      }
                    }}
                  >
                    {lesson.content || lesson.description || "No content available."}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="pt-12 flex justify-center">
                <div className="flex flex-col items-center gap-4 w-full max-w-md">
                  <Button
                    onClick={() => initiateLessonCompletion(activeModuleIndex, activeLessonIndex)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-stone-950 font-bold px-8 py-6 rounded-none uppercase tracking-widest shadow-[0_0_20px_rgba(217,119,6,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!lesson.content || lesson.content.length < 50}
                  >
                    {(!lesson.content || lesson.content.length < 50) ? "CONTENT MISSING - CANNOT ASSESS" : (isComplete ? "RE-INITIATE ASSESSMENT" : "INITIATE ASSESSMENT")}
                    {!(!lesson.content || lesson.content.length < 50) && <CheckCircle2 className="w-5 h-5 ml-3" />}
                  </Button>

                  <div className="flex flex-col items-center gap-1">
                    {highScore > 0 && (
                      <div className={`font-mono text-sm font-bold ${highScore >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
                        BEST SCORE: {highScore}%
                      </div>
                    )}
                    <div className="text-stone-500 text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500/20"></span>
                      {highScore >= 70 ? "REWARD CLAIMED (0 LEPTA)" : "REWARD AVAILABLE: 50 LEPTA"}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  return (
    <div className="h-full bg-stone-950 flex flex-col font-serif">
      <div className="bg-stone-900 border-b border-amber-900/30 p-6 shrink-0 flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onExit} className="text-stone-500 hover:text-stone-300 uppercase tracking-widest text-xs mb-2 pl-0 hover:bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-stone-100 uppercase tracking-widest">{lessonPlan.title}</h1>
          <p className="text-stone-500 text-sm font-mono mt-1">{lessonPlan.description}</p>
        </div>
        <div className="text-right">
          <Badge className="rounded-none bg-stone-800 text-stone-400 border border-stone-700 uppercase tracking-widest mb-1">{lessonPlan.subject}</Badge>
          <p className="text-[10px] text-stone-600 font-mono tracking-widest">{lessonPlan.modules?.length} MODULES</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 gap-4">
          {lessonPlan.modules?.map((module, mIdx) => {
            const locked = isModuleLocked(mIdx);
            const progress = getModuleProgress(mIdx);
            const isExpanded = activeModuleIndex === mIdx;

            return (
              <Card key={mIdx} className={`rounded-none border transition-all duration-300 ${locked ? "bg-stone-950 border-stone-900 opacity-60" : "bg-stone-900 border-stone-800 hover:border-amber-900/50"}`}>
                <div
                  className={`p-6 flex items-start gap-4 cursor-pointer ${locked ? "cursor-not-allowed" : ""}`}
                  onClick={() => !locked && setActiveModuleIndex(isExpanded ? null : mIdx)}
                >
                  <div className={`w-12 h-12 flex items-center justify-center border shrink-0 ${locked ? "border-stone-800 bg-stone-900 text-stone-700" : (progress === 100 ? "border-amber-900/50 bg-amber-950/20 text-amber-500" : "border-stone-700 bg-stone-800 text-stone-400")}`}>
                    {locked ? <Lock className="w-5 h-5" /> : (progress === 100 ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-lg font-bold font-mono">{(mIdx + 1).toString().padStart(2, '0')}</span>)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-bold uppercase tracking-wide ${locked ? "text-stone-600" : "text-stone-200"}`}>{module.title}</h3>
                      {!locked && <ChevronRight className={`w-5 h-5 text-stone-600 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
                    </div>
                    <p className="text-sm text-stone-500 line-clamp-2 mb-4 font-mono">{module.description}</p>

                    {!locked && (
                      <div className="relative h-1 bg-stone-800 w-full max-w-xs">
                        <div className="absolute top-0 left-0 h-full bg-amber-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && !locked && (
                  <div className="border-t border-stone-800 bg-stone-950/30 p-4 space-y-2 animate-in slide-in-from-top-2">
                    {module.lessons.map((lesson, lIdx) => {
                      const lessonKey = `${mIdx}-${lIdx}`;
                      const score = completedLessons[lessonKey] || 0;
                      const complete = score >= 70;
                      return (
                        <div
                          key={lIdx}
                          onClick={() => setActiveLessonIndex(lIdx)}
                          className="flex items-center justify-between p-3 hover:bg-stone-800/50 cursor-pointer border border-transparent hover:border-stone-800 group transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${complete ? "bg-amber-500" : "bg-stone-700 group-hover:bg-amber-500/50"}`} />
                            <span className={`text-sm font-mono uppercase tracking-wide ${complete ? "text-stone-400" : "text-stone-300"}`}>{lesson.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-stone-600 font-mono">{lesson.duration}</span>
                            {complete ? <CheckCircle2 className="w-4 h-4 text-amber-900" /> : <Play className="w-3 h-3 text-stone-600 group-hover:text-amber-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}

          {lessonPlan.citations && lessonPlan.citations.length > 0 && (
            <div className="mt-12 mb-8 border-t border-stone-800 pt-8">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-5 h-5 text-stone-500" />
                <h3 className="text-stone-500 font-bold uppercase tracking-widest text-sm">Course References (APA)</h3>
              </div>
              <div className="grid gap-3">
                {lessonPlan.citations.map((citation) => (
                  <div key={citation.id} className="bg-stone-900/50 border border-stone-800 p-4 font-mono text-xs text-stone-400 hover:border-amber-900/30 hover:bg-stone-900 transition-colors cursor-text selection:bg-amber-900/50 selection:text-amber-200">
                    <p className="leading-relaxed pl-6 -indent-6">{citation.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

type Section = "overview" | "objectives" | "materials" | "activities" | "notes" | "complete";

function LegacyLessonViewer({ lessonPlan, notes, onExit, onNoteClick }: LessonViewerProps) {
  const [currentSection, setCurrentSection] = useState<Section>("overview");
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());
  const [checkedObjectives, setCheckedObjectives] = useState<Set<number>>(new Set());
  const [checkedMaterials, setCheckedMaterials] = useState<Set<number>>(new Set());
  const [completedActivities, setCompletedActivities] = useState<Set<number>>(new Set());

  // Filter notes attached to this lesson
  const lessonNotes = notes.filter(note => note.lessonPlanId === lessonPlan.id);

  const sections: Section[] = lessonNotes.length > 0
    ? ["overview", "objectives", "materials", "activities", "notes", "complete"]
    : ["overview", "objectives", "materials", "activities", "complete"];

  const sectionTitles = {
    overview: "Overview",
    objectives: "Learning Objectives",
    materials: "Materials",
    activities: "Activities",
    notes: "Study Notes",
    complete: "Complete"
  };

  const currentIndex = sections.indexOf(currentSection);
  const progressPercentage = ((currentIndex + 1) / sections.length) * 100;

  const markSectionComplete = (section: Section) => {
    setCompletedSections(prev => new Set(prev).add(section));
  };

  const goToNextSection = () => {
    markSectionComplete(currentSection);
    const nextIndex = currentIndex + 1;
    if (nextIndex < sections.length) {
      setCurrentSection(sections[nextIndex]);
    }
  };

  const goToPreviousSection = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSection(sections[prevIndex]);
    }
  };

  const toggleObjective = (index: number) => {
    setCheckedObjectives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleMaterial = (index: number) => {
    setCheckedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleActivity = (index: number) => {
    setCompletedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full bg-stone-950 flex flex-col">
      <div className="w-full bg-stone-950 h-full flex flex-col border-amber-900/30">
        {/* Header */}
        <div className="bg-stone-900 border-b border-amber-900/30 p-4 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (currentSection === "overview") {
                onExit();
              } else {
                setCurrentSection("overview");
              }
            }}
            className="text-stone-400 hover:text-amber-500 hover:bg-stone-800 mb-3 uppercase tracking-wide text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentSection === "overview" ? "Exit Lesson" : "Return to Overview"}
          </Button>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold text-stone-200 uppercase tracking-wide">{lessonPlan.title}</h1>
              <Badge className={`shrink-0 rounded-none border border-stone-700 bg-stone-800 text-stone-400 uppercase tracking-widest`}>{lessonPlan.subject}</Badge>
            </div>
            <p className="text-stone-500 text-sm font-mono uppercase tracking-wide">
              {lessonPlan.teacherName} • {lessonPlan.grade}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs mb-2 uppercase tracking-widest font-bold">
              <span className="text-amber-500">Progress</span>
              <span className="text-stone-400">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-1 bg-stone-800 [&>div]:bg-amber-600" />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 w-full">
            {currentSection === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-amber-500 mb-6 border-b border-amber-900/30 pb-2">
                  <BookOpen className="w-6 h-6" />
                  <h2 className="text-xl font-bold uppercase tracking-widest">Lesson Overview</h2>
                </div>

                <Card className="bg-stone-900 border-amber-900/30 rounded-none">
                  <CardHeader>
                    <CardTitle className="text-stone-200 uppercase tracking-wide text-sm font-bold">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-stone-400 leading-relaxed text-sm font-mono">{lessonPlan.description}</p>
                  </CardContent>
                </Card>

                <Card className="bg-stone-900 border-amber-900/30 rounded-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-stone-200 uppercase tracking-wide text-sm font-bold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-stone-400 text-sm font-mono">{lessonPlan.duration}</p>
                  </CardContent>
                </Card>

                {lessonNotes.length > 0 && (
                  <Card
                    className="bg-amber-950/10 border-amber-900/40 rounded-none cursor-pointer hover:bg-amber-950/20 transition-all group"
                    onClick={() => setCurrentSection("notes")}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2 text-amber-500 uppercase tracking-wide text-sm font-bold">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Study Notes Available
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-700 group-hover:text-amber-500 transition-colors" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-stone-400 font-mono">
                        {lessonNotes.length} {lessonNotes.length === 1 ? 'note' : 'notes'} attached to help you study
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-stone-900 border border-stone-800 p-4 text-sm text-stone-400">
                  <p className="text-amber-500 font-bold uppercase tracking-widest mb-2">Key Concepts</p>
                  <ul className="space-y-2 ml-4">
                    {lessonPlan.objectives.slice(0, 2).map((obj, idx) => (
                      <li key={idx} className="list-disc text-xs">{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {currentSection === "objectives" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-amber-500 mb-6 border-b border-amber-900/30 pb-2">
                  <Target className="w-6 h-6" />
                  <h2 className="text-xl font-bold uppercase tracking-widest">Learning Objectives</h2>
                </div>

                <p className="text-stone-500 mb-4 text-sm uppercase tracking-wide font-bold">
                  Target Proficiency Levels:
                </p>

                <div className="space-y-3">
                  {lessonPlan.objectives.map((objective, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all rounded-none border ${checkedObjectives.has(index)
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-stone-900 border-stone-800 hover:border-amber-900/50'
                        }`}
                      onClick={() => toggleObjective(index)}
                    >
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="mt-0.5">
                          {checkedObjectives.has(index) ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-600" />
                          )}
                        </div>
                        <p className={`text-sm ${checkedObjectives.has(index) ? 'text-stone-200' : 'text-stone-400'}`}>
                          {objective}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentSection === "materials" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-amber-500 mb-6 border-b border-amber-900/30 pb-2">
                  <Package className="w-6 h-6" />
                  <h2 className="text-xl font-bold uppercase tracking-widest">Required Assets</h2>
                </div>

                <p className="text-stone-500 mb-4 text-sm uppercase tracking-wide font-bold">
                  verify inventory:
                </p>

                <div className="space-y-3">
                  {lessonPlan.materials.map((material, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all rounded-none border ${checkedMaterials.has(index)
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-stone-900 border-stone-800 hover:border-amber-900/50'
                        }`}
                      onClick={() => toggleMaterial(index)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div>
                          {checkedMaterials.has(index) ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-600" />
                          )}
                        </div>
                        <p className={`text-sm ${checkedMaterials.has(index) ? 'text-stone-200' : 'text-stone-400'}`}>
                          {material}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentSection === "activities" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-amber-500 mb-6 border-b border-amber-900/30 pb-2">
                  <Activity className="w-6 h-6" />
                  <h2 className="text-xl font-bold uppercase tracking-widest">Activity Log</h2>
                </div>

                <p className="text-stone-500 mb-4 text-sm uppercase tracking-wide font-bold">
                  Execute Sequence:
                </p>

                <div className="space-y-3">
                  {lessonPlan.activities.map((activity, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all rounded-none border ${completedActivities.has(index)
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-stone-900 border-stone-800 hover:border-amber-900/50'
                        }`}
                      onClick={() => toggleActivity(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-6 h-6 rounded-none flex items-center justify-center shrink-0 border ${completedActivities.has(index) ? 'bg-amber-900/30 border-amber-500 text-amber-500' : 'bg-stone-800 border-stone-700 text-stone-500'
                            }`}>
                            <span className="font-bold text-xs">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${completedActivities.has(index) ? 'text-stone-200' : 'text-stone-400'}`}>
                              {activity}
                            </p>
                          </div>
                          <div className="mt-0.5">
                            {completedActivities.has(index) ? (
                              <CheckCircle2 className="w-5 h-5 text-amber-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-stone-600" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentSection === "notes" && lessonNotes.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-amber-500 mb-6 border-b border-amber-900/30 pb-2">
                  <FileText className="w-6 h-6" />
                  <h2 className="text-xl font-bold uppercase tracking-widest">Study Notes</h2>
                </div>

                <div className="space-y-3">
                  {lessonNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="cursor-pointer bg-stone-900 border-stone-800 hover:border-amber-500/50 transition-all rounded-none group"
                      onClick={() => onNoteClick?.(note)}
                    >
                      <CardHeader className="pb-3 border-b border-stone-800">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-stone-200 group-hover:text-amber-500 transition-colors uppercase tracking-wide font-bold">
                            <FileText className="w-4 h-4 text-amber-700" />
                            {note.title}
                          </CardTitle>
                          <Badge className="rounded-none bg-stone-800 text-stone-500 border border-stone-700 text-[10px] uppercase tracking-widest">{note.subject}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="space-y-3">
                          <p className="text-xs text-stone-500 line-clamp-2 font-mono">
                            {note.content.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-stone-600 uppercase tracking-wider font-bold">
                            <span>ARCHIVIST: {note.teacherName}</span>
                            <span>•</span>
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-amber-700 group-hover:text-amber-500 transition-colors font-bold uppercase tracking-widest">
                          <span>Access Data</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentSection === "complete" && (
              <div className="space-y-6 text-center py-12">
                <div className="w-24 h-24 bg-stone-900 border border-amber-500/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <CheckCircle2 className="w-12 h-12 text-amber-500" />
                </div>

                <h2 className="text-2xl text-stone-200 uppercase tracking-widest font-bold">Module Complete</h2>
                <p className="text-stone-500 font-mono text-sm">
                  "{lessonPlan.title}" successfully processed.
                </p>

                <Card className="mt-8 bg-stone-900 border-amber-900/30 rounded-none max-w-lg mx-auto">
                  <CardHeader className="border-b border-stone-800">
                    <CardTitle className="text-stone-300 uppercase tracking-wide text-sm">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-left pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500 uppercase tracking-wide font-bold">Objectives:</span>
                      <span className="font-mono text-amber-500">
                        {checkedObjectives.size}/{lessonPlan.objectives.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500 uppercase tracking-wide font-bold">Materials:</span>
                      <span className="font-mono text-amber-500">
                        {checkedMaterials.size}/{lessonPlan.materials.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500 uppercase tracking-wide font-bold">Activities:</span>
                      <span className="font-mono text-amber-500">
                        {completedActivities.size}/{lessonPlan.activities.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation */}
        <div className="border-t border-amber-900/30 bg-stone-900 p-4 shrink-0">
          <div className="flex gap-4 max-w-4xl mx-auto w-full">
            <Button
              variant="outline"
              onClick={goToPreviousSection}
              disabled={currentIndex === 0}
              className="flex-1 rounded-none border-stone-700 text-stone-400 hover:text-stone-200 hover:bg-stone-800 uppercase tracking-widest text-xs font-bold h-12"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={currentSection === "complete" ? onExit : goToNextSection}
              className="flex-1 rounded-none bg-amber-700 hover:bg-amber-600 text-stone-950 uppercase tracking-widest text-xs font-bold h-12"
            >
              {currentSection === "complete" ? "Terminate Session" : "Next Phase"}
              {currentSection !== "complete" && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
