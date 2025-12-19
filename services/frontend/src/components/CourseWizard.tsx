import { useState, useEffect } from "react";
import { LessonPlan } from "../types";
import { LessonPlanForm } from "./LessonPlanForm";
import { WizardStepUpload, UploadedFile } from "./WizardStepUpload";
import { WizardStepConfig, GenerationConfig } from "./WizardStepConfig";
import { WizardStepPreview } from "./WizardStepPreview";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type CourseWizardProps = {
    onCancel: () => void;
    onFinish: (courseData: any) => void;
    existingData?: LessonPlan;
};

export function CourseWizard({ onCancel, onFinish, existingData }: CourseWizardProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [basicInfo, setBasicInfo] = useState<Omit<LessonPlan, "id" | "createdAt"> | null>(null);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [config, setConfig] = useState<GenerationConfig | null>(null);
    const [generatedCourse, setGeneratedCourse] = useState<any>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");

    // Step 1: Basic Info
    const handleBasicInfoSubmit = (data: Omit<LessonPlan, "id" | "createdAt">) => {
        setBasicInfo(data);
        setStep(2);
    };

    // Step 2: Files
    const handleFilesSubmit = (uploadedFiles: UploadedFile[]) => {
        setFiles(uploadedFiles);
        setStep(3);
    };

    // Step 3: Config
    const handleConfigSubmit = (configuration: GenerationConfig) => {
        setConfig(configuration);
        setStep(4); // Start Generation
    };

    // Step 4: Generation (Real Backend)
    useEffect(() => {
        if (step === 4 && basicInfo && config) {
            const generate = async () => {
                try {
                    setGenerationError(null);
                    setProgress(0);

                    // Generate a temporary Course ID for this session
                    const courseId = basicInfo.title.toLowerCase().replace(/[^a-z0-9]/g, '-') + "-" + Math.random().toString(36).substring(7);

                    // 1. Ingest Files
                    setStatusMessage("Ingesting Knowledge Artifacts...");
                    const totalOperations = files.length + 1; // Files + Generation step
                    let completedOps = 0;

                    if (files.length > 0) {
                        await Promise.all(files.map(async (f) => {
                            const formData = new FormData();
                            formData.append("file", f.file);
                            formData.append("course_id", courseId);

                            try {
                                const res = await fetch("http://localhost:8000/ingest", {
                                    method: "POST",
                                    body: formData
                                });
                                if (!res.ok) {
                                    const err = await res.json().catch(() => ({}));
                                    throw new Error(err.detail || `Failed to ingest ${f.file.name} (Status: ${res.status})`);
                                }
                            } catch (e) {
                                console.error(e);
                                throw e;
                            } finally {
                                completedOps++;
                                setProgress((completedOps / totalOperations) * 80); // Up to 80% is ingestion
                            }
                        }));
                    }

                    // 2. Generate Course Structure
                    setStatusMessage("Constructing Curriculum Matrix...");
                    const genRes = await fetch("http://localhost:8000/generate-course", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            course_id: courseId,
                            title: basicInfo.title,
                            description: basicInfo.description,
                            module_count: config.moduleCount,
                            intensity: config.intensity
                        })
                    });

                    if (!genRes.ok) {
                        const err = await genRes.json().catch(() => ({}));
                        throw new Error(err.detail || `Genesis Engine Failure (Status: ${genRes.status})`);
                    }
                    const structure = await genRes.json();

                    setProgress(100);

                    // Merge Backend Structure with Form Data
                    const duration = `${Math.round(config.moduleCount * 3)} Weeks`;

                    const course = {
                        ...basicInfo,
                        duration: duration, // Override basic info duration with calculated one
                        modules: structure.modules || [], // Expecting { modules: [...] } from backend
                        files: files.map(f => f.file.name),
                        config,
                        // Preserve ID if editing, or let TeacherView assign new ID
                        // If existingData had an ID, we might need to preserve it, but CourseWizard output 
                        // is usually passed to `handleAdd` which makes a new ID. 
                        // If we are editing drafts, we handle that outside.
                    };

                    setGeneratedCourse(course);

                    // Delay slightly for effect
                    setTimeout(() => setStep(5), 500);

                } catch (e: any) {
                    console.error(e);
                    setGenerationError(e.message || "Unknown Error");
                }
            };

            generate();
        }
    }, [step, basicInfo, config, files]);

    // Step 5: Publish / Draft
    const handlePublish = (finalData: any) => {
        // Add status: published
        onFinish({ ...finalData, status: 'published' });
        toast.success("Course archive published successfully");
    };

    const handleSaveDraft = (finalData: any) => {
        // Add status: draft
        onFinish({ ...finalData, status: 'draft' });
        toast.success("Draft saved to archives");
    };

    return (
        <div className="w-full max-w-5xl mx-auto font-serif">
            {/* Progress Indicator */}
            <div className="mb-6 flex items-center justify-between px-2">
                {[
                    { id: 1, label: "Parameter Def" },
                    { id: 2, label: "Knowledge Base" },
                    { id: 3, label: "Config Matrix" },
                    { id: 4, label: "Genesis" },
                    { id: 5, label: "Review" }
                ].map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-500
                    ${step === s.id ? "bg-amber-600 border-amber-500 text-stone-900 scale-110 shadow-[0_0_15px_rgba(217,119,6,0.3)]" :
                                    step > s.id ? "bg-stone-800 border-amber-900/50 text-amber-600" : "bg-stone-950 border-stone-800 text-stone-600"}`}
                        >
                            {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${step === s.id ? "text-amber-500" : "text-stone-600"}`}>
                            {s.label}
                        </span>
                    </div>
                ))}
                {/* Connector Line */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-stone-900 -z-0">
                    <div
                        className="h-full bg-amber-900/30 transition-all duration-500"
                        style={{ width: `${((step - 1) / 4) * 100}%` }}
                    />
                </div>
            </div>

            <div className="min-h-[500px]">
                {step === 1 && (
                    <LessonPlanForm
                        initialData={existingData}
                        onSubmit={handleBasicInfoSubmit}
                        onCancel={onCancel}
                    />
                )}

                {step === 2 && (
                    <WizardStepUpload
                        onNext={handleFilesSubmit}
                        onBack={() => setStep(1)}
                    />
                )}

                {step === 3 && (
                    <WizardStepConfig
                        onGenerate={handleConfigSubmit}
                        onBack={() => setStep(2)}
                    />
                )}

                {step === 4 && (
                    <div className="h-[500px] flex flex-col items-center justify-center bg-stone-950 border border-amber-900/20">
                        {generationError ? (
                            <div className="text-center p-8 max-w-md bg-red-950/20 border border-red-900/50">
                                <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                <h3 className="text-xl font-bold text-red-500 uppercase tracking-widest mb-2">Genesis Matrix Failure</h3>
                                <p className="text-stone-400 font-mono text-sm mb-6">{generationError}</p>
                                <button
                                    onClick={() => setStep(3)}
                                    className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-2 uppercase tracking-wide text-xs font-bold border border-stone-600"
                                >
                                    <span className="mr-2">←</span> Return to Config
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-4 border-stone-800 border-t-amber-500 animate-spin" />
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-amber-500 animate-pulse" />
                                </div>
                                <h3 className="mt-8 text-xl font-bold text-amber-500 uppercase tracking-widest animate-pulse">
                                    Genesis Engine Active
                                </h3>
                                <p className="text-stone-500 text-sm mt-2 font-mono uppercase tracking-wide">
                                    {statusMessage}
                                </p>
                                <div className="mt-8 w-64 h-1 bg-stone-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-600 transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {step === 5 && (
                    <WizardStepPreview
                        courseData={generatedCourse}
                        onPublish={handlePublish}
                        onSaveDraft={handleSaveDraft}
                        onBack={() => setStep(3)}
                    />
                )}
            </div>
        </div>
    );
}
