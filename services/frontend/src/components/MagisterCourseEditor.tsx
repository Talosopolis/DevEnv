import { useState, MouseEvent } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { CheckCircle2, Edit3, Save, FileDown, Plus, Trash2, Sparkles, ChevronDown, ChevronRight, RefreshCw, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { Label } from "./ui/label";

// Type definitions matching our app
// We use 'any' for courseData temporarily to be flexible with the wizard output vs existing LessonPlan
type MagisterCourseEditorProps = {
    courseData: any;
    onSave: (data: any, status: 'draft' | 'published') => void;
    onBack?: () => void;
    isWizardMode?: boolean;
};

export function MagisterCourseEditor({ courseData, onSave, onBack, isWizardMode = false }: MagisterCourseEditorProps) {
    const [data, setData] = useState(courseData);
    const [expandedModule, setExpandedModule] = useState<number | null>(0);
    const [editingLesson, setEditingLesson] = useState<{ modIdx: number, lessIdx: number } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    const updateField = (field: string, value: string) => {
        setData({ ...data, [field]: value });
    };

    const updateArrayField = (field: string, index: number, value: string) => {
        const newArray = [...(data[field] || [])];
        newArray[index] = value;
        setData({ ...data, [field]: newArray });
    };

    const addArrayItem = (field: string) => {
        const newArray = [...(data[field] || [])];
        newArray.push("");
        setData({ ...data, [field]: newArray });
    };

    const removeArrayItem = (field: string, index: number) => {
        const newArray = [...(data[field] || [])];
        newArray.splice(index, 1);
        setData({ ...data, [field]: newArray });
    };

    const updateModule = (index: number, field: string, value: string) => {
        const newModules = [...(data.modules || [])];
        newModules[index] = { ...newModules[index], [field]: value };
        setData({ ...data, modules: newModules });
    };

    const addModule = () => {
        const newModules = [...(data.modules || [])];
        newModules.push({
            title: "New Module",
            description: "Description of the module",
            lessons: []
        });
        setData({ ...data, modules: newModules });
        setExpandedModule(newModules.length - 1);
    };

    const removeModule = (index: number) => {
        const newModules = [...data.modules];
        newModules.splice(index, 1);
        setData({ ...data, modules: newModules });
        if (expandedModule === index) setExpandedModule(null);

        // Safety: Update editing pointer if affected
        if (editingLesson) {
            if (editingLesson.modIdx === index) {
                setEditingLesson(null);
            } else if (editingLesson.modIdx > index) {
                setEditingLesson({ ...editingLesson, modIdx: editingLesson.modIdx - 1 });
            }
        }
    };

    const updateLesson = (modIndex: number, lessonIndex: number, field: string, value: string) => {
        const newModules = [...data.modules];
        newModules[modIndex].lessons[lessonIndex] = {
            ...newModules[modIndex].lessons[lessonIndex],
            [field]: value
        };
        setData({ ...data, modules: newModules });
        setVerificationResult(null); // Clear verification on edit
    };

    const addLesson = (modIndex: number) => {
        const newModules = [...data.modules];
        newModules[modIndex].lessons.push({
            title: "New Lesson",
            duration: "15 min",
            content: ""
        });
        setData({ ...data, modules: newModules });
        setEditingLesson({ modIdx: modIndex, lessIdx: newModules[modIndex].lessons.length - 1 });
    };

    const removeLesson = (modIndex: number, lessonIndex: number) => {
        const newModules = [...data.modules];
        newModules[modIndex].lessons.splice(lessonIndex, 1);
        setData({ ...data, modules: newModules });

        // Safety: Update editing pointer if affected
        if (editingLesson && editingLesson.modIdx === modIndex) {
            if (editingLesson.lessIdx === lessonIndex) {
                setEditingLesson(null);
            } else if (editingLesson.lessIdx > lessonIndex) {
                setEditingLesson({ ...editingLesson, lessIdx: editingLesson.lessIdx - 1 });
            }
        }
    };

    const generateLessonContent = async (modIndex: number, lessonIndex: number) => {
        const lesson = data.modules[modIndex].lessons[lessonIndex];
        setIsGenerating(true);
        try {
            const response = await fetch('http://localhost:8000/generate-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: data.id || "temp_wizard_id",
                    topic: lesson.title,
                    level: data.grade || "Intermediate",
                    user_id: "anonymous_hero",
                    // Pass enriched context
                    description: data.description || "",
                    objectives: data.objectives || [],
                    materials: data.materials || [],
                    module_index: modIndex,
                    lesson_index: lessonIndex
                })
            });

            if (!response.ok) {
                if (response.status === 402) {
                    toast.error("Insufficient Obols to generate content.");
                    return;
                }
                throw new Error("Generation failed");
            }

            const result = await response.json();
            updateLesson(modIndex, lessonIndex, 'content', result.content);
            toast.success("Content Generated", { description: `Cost: ${result.cost_incurred} Obols` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate content");
        } finally {
            setIsGenerating(false);
        }
    };

    const verifyContent = async (modIndex: number, lessonIndex: number) => {
        const lesson = data.modules[modIndex].lessons[lessonIndex];
        if (!lesson.content || lesson.content.length < 10) {
            toast.error("Content too short to verify.");
            return;
        }

        setIsVerifying(true);
        try {
            const response = await fetch('http://localhost:8000/quality-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: lesson.content,
                    topic: lesson.title,
                    user_id: "anonymous_hero" // TODO: Get actual user
                })
            });

            if (!response.ok) {
                if (response.status === 402) {
                    toast.error("Insufficient Obols for Quality Check.");
                    return;
                }
                throw new Error("Verification failed");
            }

            const result = await response.json();
            setVerificationResult(result);

            if (result.status === 'pass') {
                toast.success("Quality Verified", { description: "Content meets all pedagogical standards." });
            } else {
                toast.error("Quality Issues Found", { description: result.feedback });
            }

        } catch (e) {
            console.error(e);
            toast.error("Failed to verify content");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-stone-950 text-stone-200 font-sans">
            {/* Header Toolbar */}
            <div className="bg-stone-900 border-b border-amber-900/30 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="text-stone-400 hover:text-stone-200">
                            <ChevronDown className="rotate-90 w-5 h-5" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-lg font-bold uppercase tracking-widest text-amber-500">Magister Editor</h1>
                        <p className="text-xs text-stone-500 font-mono">CURRICULUM CONTROL PANEL</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onSave(data, 'draft')} className="border-stone-700 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded-none uppercase tracking-widest text-xs">
                        <Save className="w-4 h-4 mr-2" /> Save Draft
                    </Button>
                    <Button onClick={() => onSave(data, 'published')} className="bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold rounded-none uppercase tracking-widest text-xs">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Publish
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="curriculum" className="flex-1 flex flex-col">
                <div className="bg-stone-950 border-b border-stone-800 px-6">
                    <TabsList className="bg-transparent h-12 gap-6 p-0">
                        <TabsTrigger value="overview" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 uppercase tracking-widest text-xs font-bold px-0 pb-0">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="curriculum" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-500 text-stone-500 hover:text-stone-300 uppercase tracking-widest text-xs font-bold px-0 pb-0">
                            Curriculum & Content
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB 1: OVERVIEW */}
                <TabsContent value="overview" className="flex-1 p-8 m-0 bg-stone-950/50">
                    <ScrollArea className="h-full max-w-4xl mx-auto pr-8">
                        <div className="space-y-8 pb-20">
                            <div className="space-y-4">
                                <Label className="text-amber-600 uppercase tracking-widest text-xs font-bold">Course Metadata</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="uppercase tracking-widest text-[10px] text-stone-500">Module Title *</Label>
                                        <Input
                                            value={data.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                            className="bg-stone-900 border-amber-900/20 focus:border-amber-500 rounded-none h-10 text-stone-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase tracking-widest text-[10px] text-stone-500">Discipline *</Label>
                                        <Input
                                            value={data.subject}
                                            onChange={(e) => updateField('subject', e.target.value)}
                                            className="bg-stone-900 border-amber-900/20 focus:border-amber-500 rounded-none h-10 text-stone-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase tracking-widest text-[10px] text-stone-500">Target Level *</Label>
                                        <Input
                                            value={data.grade}
                                            onChange={(e) => updateField('grade', e.target.value)}
                                            className="bg-stone-900 border-amber-900/20 focus:border-amber-500 rounded-none h-10 text-stone-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase tracking-widest text-[10px] text-stone-500">Est. Duration *</Label>
                                        <Input
                                            value={data.duration}
                                            onChange={(e) => updateField('duration', e.target.value)}
                                            className="bg-stone-900 border-amber-900/20 focus:border-amber-500 rounded-none h-10 text-stone-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="uppercase tracking-widest text-[10px] text-stone-500">Abstract *</Label>
                                <Textarea
                                    value={data.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    className="bg-stone-900 border-amber-900/20 focus:border-amber-500 rounded-none min-h-[100px] text-stone-300 font-mono text-sm leading-relaxed"
                                />
                            </div>

                            {/* Objectives */}
                            <div className="space-y-4 pt-4 border-t border-stone-800">
                                <div className="flex items-center justify-between">
                                    <Label className="text-amber-600 uppercase tracking-widest text-xs font-bold">Learning Objectives</Label>
                                    <Button size="sm" variant="ghost" onClick={() => addArrayItem('objectives')} className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-500">
                                        <Plus className="w-3 h-3 mr-1" /> Add Objective
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {data.objectives?.map((obj: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <Input
                                                value={obj}
                                                onChange={(e) => updateArrayField('objectives', i, e.target.value)}
                                                className="bg-stone-900/50 border-stone-800 focus:border-amber-500 rounded-none h-9 text-sm text-stone-400"
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => removeArrayItem('objectives', i)} className="h-9 w-9 text-stone-600 hover:text-red-500">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!data.objectives || data.objectives.length === 0) && (
                                        <div className="p-4 border border-dashed border-stone-800 text-center text-stone-600 text-xs">
                                            No objectives defined.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Materials */}
                            <div className="space-y-4 pt-4 border-t border-stone-800">
                                <div className="flex items-center justify-between">
                                    <Label className="text-amber-600 uppercase tracking-widest text-xs font-bold">Required Materials</Label>
                                    <Button size="sm" variant="ghost" onClick={() => addArrayItem('materials')} className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-500">
                                        <Plus className="w-3 h-3 mr-1" /> Add Material
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {data.materials?.map((mat: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <Input
                                                value={mat}
                                                onChange={(e) => updateArrayField('materials', i, e.target.value)}
                                                className="bg-stone-900/50 border-stone-800 focus:border-amber-500 rounded-none h-9 text-sm text-stone-400"
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => removeArrayItem('materials', i)} className="h-9 w-9 text-stone-600 hover:text-red-500">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!data.materials || data.materials.length === 0) && (
                                        <div className="p-4 border border-dashed border-stone-800 text-center text-stone-600 text-xs">
                                            No materials required.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* TAB 2: CURRICULUM */}
                <TabsContent value="curriculum" className="flex-1 flex overflow-hidden m-0">
                    {/* Sidebar: Module Structure */}
                    <div className="w-96 border-r border-stone-800 bg-stone-950 flex flex-col shrink-0">
                        <div className="p-4 border-b border-stone-800 bg-stone-900/50">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500">Course Map</h3>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-3">
                                {data.modules?.map((mod: any, i: number) => (
                                    <div key={i} className="group">
                                        <div
                                            className={`border rounded-sm transition-all duration-200 ${expandedModule === i ? 'bg-stone-900 border-amber-900/30' : 'bg-stone-900/30 border-stone-800 hover:border-stone-700'}`}
                                        >
                                            <div
                                                className="flex items-start justify-between p-3 cursor-pointer select-none"
                                                onClick={() => setExpandedModule(expandedModule === i ? null : i)}
                                            >
                                                <div className="flex items-start gap-3 overflow-hidden">
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border shrink-0 mt-0.5 ${expandedModule === i ? 'bg-amber-950/30 border-amber-900/50 text-amber-500' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                                                        {(i + 1).toString().padStart(2, '0')}
                                                    </div>
                                                    <div className={`text-xs font-bold uppercase tracking-wide leading-relaxed ${expandedModule === i ? 'text-stone-200' : 'text-stone-400 group-hover:text-stone-300'}`}>
                                                        {mod.title}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-stone-600 hover:text-red-500 hover:bg-red-950/20" onClick={(e: MouseEvent) => { e.stopPropagation(); removeModule(i); }}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {expandedModule === i && (
                                                <div className="bg-stone-950/30 p-2 space-y-1 rounded-b-sm">
                                                    {mod.lessons?.map((lesson: any, j: number) => (
                                                        <div
                                                            key={j}
                                                            onClick={() => setEditingLesson({ modIdx: i, lessIdx: j })}
                                                            className={`pl-3 pr-2 py-2 text-xs font-mono flex items-start justify-between cursor-pointer rounded-sm border mb-1 transition-all ${editingLesson?.modIdx === i && editingLesson?.lessIdx === j ? 'bg-amber-950/10 border-amber-900/30 text-amber-500' : 'border-transparent text-stone-500 hover:bg-stone-800 hover:text-stone-300'}`}
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${editingLesson?.modIdx === i && editingLesson?.lessIdx === j ? 'bg-amber-500' : 'bg-stone-800'}`} />
                                                                <span className="leading-relaxed">{lesson.title}</span>
                                                            </div>
                                                            <ChevronRight className={`w-3 h-3 shrink-0 mt-0.5 transition-transform ${editingLesson?.modIdx === i && editingLesson?.lessIdx === j ? 'translate-x-0.5 opacity-100' : 'opacity-0'}`} />
                                                        </div>
                                                    ))}
                                                    <Button variant="ghost" size="sm" onClick={() => addLesson(i)} className="w-full text-[10px] text-stone-500 hover:text-amber-500 hover:bg-stone-900 uppercase tracking-widest h-8 border border-dashed border-stone-800/50 hover:border-amber-900/30">
                                                        <Plus className="w-3 h-3 mr-1" /> Add Lesson
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <Button variant="outline" onClick={addModule} className="w-full border-dashed border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600 hover:bg-stone-900 uppercase tracking-widest text-xs h-12">
                                    <Plus className="w-4 h-4 mr-2" /> Add Module
                                </Button>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Main Content Area: Lesson Editor */}
                    <div className="flex-1 flex flex-col bg-stone-950 relative">
                        {editingLesson ? (
                            (() => {
                                const mod = data.modules[editingLesson.modIdx];
                                const lesson = mod.lessons[editingLesson.lessIdx];
                                return (
                                    <>
                                        {/* Editor Toolbar / Header */}
                                        <div className="p-6 border-b border-stone-800 bg-stone-900/20">
                                            <div className="flex gap-6 items-start">
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Lesson Title</label>
                                                    <Input
                                                        value={lesson.title}
                                                        onChange={(e) => updateLesson(editingLesson.modIdx, editingLesson.lessIdx, 'title', e.target.value)}
                                                        className="text-lg font-bold bg-stone-900/50 border-stone-800 focus:border-amber-500 focus:bg-stone-900 rounded-sm h-10 px-4 transition-colors"
                                                        placeholder="Enter lesson title..."
                                                    />
                                                </div>
                                                <div className="w-40 space-y-2">
                                                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Duration</label>
                                                    <Input
                                                        value={lesson.duration}
                                                        onChange={(e) => updateLesson(editingLesson.modIdx, editingLesson.lessIdx, 'duration', e.target.value)}
                                                        className="font-mono text-sm bg-stone-900/50 border-stone-800 focus:border-amber-500 focus:bg-stone-900 rounded-sm h-10 px-3 text-center transition-colors"
                                                        placeholder="e.g. 15 min"
                                                    />
                                                </div>
                                                <div className="pt-6">
                                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-stone-600 hover:text-red-500 hover:bg-red-950/10 rounded-sm" onClick={() => removeLesson(editingLesson.modIdx, editingLesson.lessIdx)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 p-6 flex flex-col min-h-0 relative bg-stone-950">
                                            <div className="flex items-center justify-between mb-3 bg-stone-900/30 p-2 rounded-sm border border-stone-800/50">
                                                <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-2 pl-2">
                                                    <Edit3 className="w-3 h-3" />
                                                    Editor Mode
                                                </label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => verifyContent(editingLesson.modIdx, editingLesson.lessIdx)}
                                                        disabled={isVerifying || isGenerating}
                                                        className={`h-7 px-3 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all ${verificationResult ? (verificationResult.status === 'pass' ? 'bg-emerald-950/50 text-emerald-500 border border-emerald-900 hover:bg-emerald-900/50' : 'bg-red-950/50 text-red-500 border border-red-900 hover:bg-red-900/50') : 'bg-stone-800 text-stone-400 border border-stone-700 hover:text-amber-500 hover:border-amber-900'}`}
                                                    >
                                                        {isVerifying ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-2" />}
                                                        {verificationResult ? (verificationResult.status === 'pass' ? "Verified" : "Issues Found") : "Quality Check"}
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => generateLessonContent(editingLesson.modIdx, editingLesson.lessIdx)}
                                                        disabled={isGenerating || isVerifying}
                                                        className="h-7 px-3 bg-amber-950/30 text-amber-500 border border-amber-900/50 hover:bg-amber-900/40 text-[10px] uppercase tracking-widest font-bold rounded-sm"
                                                    >
                                                        {isGenerating ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                                                        Generate AI
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex-1 relative group">
                                                <Textarea
                                                    value={lesson.content || ""}
                                                    onChange={(e) => updateLesson(editingLesson.modIdx, editingLesson.lessIdx, 'content', e.target.value)}
                                                    className="w-full h-full bg-stone-900/20 border-stone-800 focus:border-amber-500/50 rounded-sm font-mono text-sm leading-relaxed p-4 resize-none text-stone-300 focus:ring-0 focus:bg-stone-900/50 transition-all custom-scrollbar"
                                                    placeholder="# Lesson Content... (Markdown Supported)"
                                                />

                                                {/* Verification Result Overlay/Warning */}
                                                {verificationResult && verificationResult.status === 'fail' && (
                                                    <div className="absolute bottom-6 left-6 right-6 bg-red-950/90 border border-red-500/50 p-4 text-xs shadow-lg backdrop-blur-sm z-10 animate-in slide-in-from-bottom-2">
                                                        <div className="flex items-start gap-4">
                                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                                            <div className="flex-1">
                                                                <h4 className="text-red-500 font-bold uppercase tracking-widest mb-1">
                                                                    Quality Assurance Flag
                                                                </h4>
                                                                <p className="text-stone-300 leading-relaxed">{verificationResult.feedback}</p>
                                                                {verificationResult.issues && (
                                                                    <ul className="list-disc list-inside mt-2 text-stone-400 space-y-1">
                                                                        {verificationResult.issues.map((issue: string, k: number) => (
                                                                            <li key={k}>{issue}</li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-200" onClick={() => setVerificationResult(null)}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-stone-600">
                                <Edit3 className="w-16 h-16 mb-4 opacity-20" />
                                <p className="uppercase tracking-widest text-sm font-bold">Select a lesson to edit</p>
                                <p className="text-xs mt-2 font-mono opacity-50">Or add a new module to begin</p>
                            </div>
                        )}
                    </div >
                </TabsContent>
            </Tabs>
        </div>
    );
}
