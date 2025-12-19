import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { CheckCircle2, Edit3, Save, FileDown } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type WizardStepPreviewProps = {
    courseData: any; // The structure returned by AI
    onPublish: (data: any) => void;
    onSaveDraft: (data: any) => void;
    onBack: () => void;
};

export function WizardStepPreview({ courseData, onPublish, onSaveDraft, onBack }: WizardStepPreviewProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [editableData, setEditableData] = useState(courseData);

    const handlePublish = async () => {
        setIsPublishing(true);
        // Simulate publishing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        onPublish(editableData);
        setIsPublishing(false);
    };

    const handleSaveDraft = async () => {
        setIsPublishing(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        onSaveDraft(editableData);
        setIsPublishing(false);
    };

    const updateModule = (index: number, field: string, value: string) => {
        const newModules = [...editableData.modules];
        newModules[index] = { ...newModules[index], [field]: value };
        setEditableData({ ...editableData, modules: newModules });
    };

    const updateLesson = (modIndex: number, lessonIndex: number, field: string, value: string) => {
        const newModules = [...editableData.modules];
        const newLessons = [...newModules[modIndex].lessons];
        newLessons[lessonIndex] = { ...newLessons[lessonIndex], [field]: value };
        newModules[modIndex] = { ...newModules[modIndex], lessons: newLessons };
        setEditableData({ ...editableData, modules: newModules });
    };

    return (
        <div className="space-y-4">
            <Card className="bg-stone-900 border-amber-900/20 rounded-none">
                <CardHeader className="border-b border-stone-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-amber-500 uppercase tracking-widest text-lg font-bold">
                                Review & Publish protocol
                            </CardTitle>
                            <CardDescription className="text-stone-500 text-xs">
                                Verify generated curriculum structure before final archival. All fields are editable.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <ScrollArea className="h-[calc(100vh-280px)] pr-4">

                        <div className="bg-stone-950/50 border border-stone-800 p-6 mb-6">
                            <h2 className="text-xl font-bold text-stone-200 uppercase tracking-widest mb-2">{editableData.title}</h2>
                            <p className="text-sm text-stone-400 font-serif italic mb-4">{editableData.description}</p>
                            <div className="grid grid-cols-3 gap-4 text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                                <div>SUBJ: <span className="text-amber-600">{editableData.subject}</span></div>
                                <div>LVL: <span className="text-amber-600">{editableData.grade}</span></div>
                                <div>DUR: <span className="text-amber-600">{editableData.duration}</span></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs uppercase tracking-widest text-stone-500 font-bold border-b border-stone-800 pb-2">Generated Modules</h3>
                            {editableData.modules?.map((mod: any, i: number) => (
                                <div key={i} className="group relative bg-stone-900 border border-stone-800 hover:border-amber-900/50 transition-all p-4">
                                    <div className="flex items-start gap-4">
                                        <span className="text-2xl font-bold text-stone-800 group-hover:text-amber-900/40 transition-colors font-mono select-none">
                                            {(i + 1).toString().padStart(2, '0')}
                                        </span>
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                value={mod.title}
                                                onChange={(e) => updateModule(i, 'title', e.target.value)}
                                                className="text-amber-500 font-bold text-sm uppercase tracking-wide bg-transparent border-transparent hover:border-stone-700 focus:border-amber-500 rounded-none px-0 h-auto py-1"
                                            />
                                            <Textarea
                                                value={mod.description}
                                                onChange={(e) => updateModule(i, 'description', e.target.value)}
                                                className="text-xs text-stone-400 leading-relaxed max-w-3xl bg-transparent border-transparent hover:border-stone-700 focus:border-amber-500 rounded-none px-0 min-h-[60px]"
                                            />

                                            {mod.lessons && mod.lessons.length > 0 && (
                                                <div className="pt-3 mt-3 border-t border-stone-800/50 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {mod.lessons.map((lesson: any, j: number) => (
                                                        <div key={j} className="flex items-center gap-2 text-[10px] text-stone-500 font-mono bg-stone-950/30 p-1.5 rounded-none border border-transparent hover:border-stone-700 group/lesson">
                                                            <span className="w-1.5 h-1.5 bg-stone-700 rotate-45 shrink-0" />
                                                            <input
                                                                value={lesson.title}
                                                                onChange={(e) => updateLesson(i, j, 'title', e.target.value)}
                                                                className="bg-transparent w-full outline-none text-stone-500 focus:text-amber-500 transition-colors"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </ScrollArea>
                </CardContent>
                {/* Footer Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <Button variant="outline" onClick={onBack} disabled={isPublishing} className="flex-1 rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs">
                        Refine Configuration
                    </Button>

                    <Button variant="outline" onClick={handleSaveDraft} disabled={isPublishing} className="flex-1 rounded-none border-amber-900/30 text-amber-600 hover:bg-amber-950/20 hover:text-amber-500 uppercase tracking-widest text-xs">
                        <FileDown className="w-4 h-4 mr-2" />
                        Save Draft
                    </Button>

                    <Button onClick={handlePublish} disabled={isPublishing} className="flex-1 rounded-none bg-emerald-700 hover:bg-emerald-600 text-stone-950 font-bold uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(5,150,105,0.2)]">
                        {isPublishing ? (
                            <span className="animate-pulse">Finalizing Archive...</span>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Authorize & Publish
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
