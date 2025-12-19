import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Upload, X, FileText, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export type UploadedFile = {
    id: string;
    file: File;
    certifiedRights: boolean;
    certifiedContent: boolean;
};

type WizardStepUploadProps = {
    onNext: (files: UploadedFile[]) => void;
    onBack: () => void;
    initialFiles?: UploadedFile[];
};

export function WizardStepUpload({ onNext, onBack, initialFiles = [] }: WizardStepUploadProps) {
    const [files, setFiles] = useState<UploadedFile[]>(initialFiles);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        if (newFiles.length === 0) return;

        const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            certifiedRights: false,
            certifiedContent: false
        }));

        setFiles(prev => [...prev, ...uploadedFiles]);
        toast.success(`${newFiles.length} file(s) stage for ingestion`);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const toggleRight = (id: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, certifiedRights: !f.certifiedRights } : f));
    };

    const toggleContent = (id: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, certifiedContent: !f.certifiedContent } : f));
    };

    const totalSize = files.reduce((acc, file) => acc + file.file.size, 0);
    const MAX_SIZE_MB = 50;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const isOverLimit = totalSize > MAX_SIZE_BYTES;

    const handleNext = () => {
        // Validation: Check size limit
        if (isOverLimit) {
            toast.error(`Storage limit exceeded. Maximum ${MAX_SIZE_MB}MB allowed.`);
            return;
        }

        // Validation: All files must be certified
        const uncertified = files.some(f => !f.certifiedRights || !f.certifiedContent);
        if (uncertified) {
            toast.error("All files must be certified before proceeding.");
            return;
        }
        onNext(files);
    };

    return (
        <div className="space-y-4">
            <Card className="bg-stone-900 border-amber-900/20 rounded-none">
                <CardHeader className="border-b border-stone-800">
                    <CardTitle className="text-amber-500 uppercase tracking-widest text-lg font-bold">
                        Ingest Knowledge Base
                    </CardTitle>
                    <CardDescription className="text-stone-500 text-xs">
                        Upload reference materials for the Genesis Engine. Certification required for all data artifacts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <div className={`border-2 border-dashed ${isOverLimit ? 'border-red-900/50 bg-red-950/10' : 'border-stone-800 hover:border-amber-900/50 bg-stone-950/50'} p-8 text-center transition-colors`}>
                            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 border border-stone-800">
                                    {isOverLimit ? <AlertTriangle className="h-6 w-6 text-red-500" /> : <Upload className="h-6 w-6 text-stone-400" />}
                                </div>
                                <h3 className="mt-4 text-sm font-bold uppercase tracking-widest text-stone-300">
                                    {isOverLimit ? "Storage Limit Exceeded" : "Drag artifacts or click to browse"}
                                </h3>
                                <p className="mt-2 mb-4 text-xs text-stone-500 font-mono">
                                    SUPPORTS: PDF, TXT, MD, DOCX
                                </p>
                                <div className="relative">
                                    <Input
                                        type="file"
                                        multiple
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                        accept=".pdf,.txt,.md,.doc,.docx"
                                        disabled={isOverLimit && files.length > 0} // Prevent adding more if already over, but allow initial selection
                                    />
                                    <Button variant="outline" className={`rounded-none ${isOverLimit ? 'border-red-900/30 text-red-500' : 'border-amber-900/30 text-amber-500 hover:bg-amber-950/30'} font-bold uppercase tracking-widest text-xs`}>
                                        Select Files
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Storage Meter */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                                <span className="text-stone-500">Storage Usage</span>
                                <span className={isOverLimit ? "text-red-500" : "text-amber-600"}>
                                    {(totalSize / (1024 * 1024)).toFixed(2)} MB / {MAX_SIZE_MB} MB
                                </span>
                            </div>
                            <div className="h-1 bg-stone-900 w-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${isOverLimit ? "bg-red-600" : "bg-amber-600"}`}
                                    style={{ width: `${Math.min((totalSize / MAX_SIZE_BYTES) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="space-y-4">
                                <Label className="uppercase tracking-widest text-xs text-stone-400">Staged for Ingestion ({files.length})</Label>
                                <div className="space-y-3">
                                    {files.map(file => (
                                        <div key={file.id} className="bg-stone-950 border border-stone-800 p-4 flex flex-col gap-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-amber-600" />
                                                    <div>
                                                        <p className="text-sm font-bold text-stone-300">{file.file.name}</p>
                                                        <p className="text-[10px] text-stone-600 font-mono uppercase">
                                                            {(file.file.size / 1024).toFixed(2)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFile(file.id)}
                                                    className="text-stone-600 hover:text-red-500 hover:bg-stone-900"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-stone-900">
                                                <div className="flex items-start space-x-2 bg-stone-900/50 p-2">
                                                    <Checkbox
                                                        id={`rights-${file.id}`}
                                                        checked={file.certifiedRights}
                                                        onCheckedChange={() => toggleRight(file.id)}
                                                        className="mt-0.5 border-stone-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <label
                                                            htmlFor={`rights-${file.id}`}
                                                            className="text-[10px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-stone-400 uppercase tracking-wide cursor-pointer"
                                                        >
                                                            IP Rights Certified
                                                        </label>
                                                        <p className="text-[10px] text-stone-600">
                                                            I possess rights to distribute this artifact.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start space-x-2 bg-stone-900/50 p-2">
                                                    <Checkbox
                                                        id={`content-${file.id}`}
                                                        checked={file.certifiedContent}
                                                        onCheckedChange={() => toggleContent(file.id)}
                                                        className="mt-0.5 border-stone-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <label
                                                            htmlFor={`content-${file.id}`}
                                                            className="text-[10px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-stone-400 uppercase tracking-wide cursor-pointer"
                                                        >
                                                            Safety Certified
                                                        </label>
                                                        <p className="text-[10px] text-stone-600">
                                                            Contains no hazardous content.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                {/* Footer Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <Button variant="outline" onClick={onBack} className="flex-1 rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs">
                        Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1 rounded-none bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold uppercase tracking-widest text-xs">
                        Continue to Configuration
                    </Button>
                </div>
            </Card>
        </div>
    );
}
