import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { LessonPlan } from "../types";
import { toast } from "sonner";

type FileUploadProps = {
  onExtracted: (plan: Omit<LessonPlan, "id" | "createdAt">) => void;
  onCancel: () => void;
};

export function FileUpload({ onExtracted, onCancel }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'pdf' || fileExtension === 'doc' || fileExtension === 'docx') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a .pdf, .doc, or .docx file");
        setFile(null);
      }
    }
  };

  const simulateExtraction = async (file: File): Promise<Omit<LessonPlan, "id" | "createdAt">> => {
    // Simulate file processing with progress
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Simulate extracted data based on file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // Mock extracted lesson plan data
    // In a real implementation, this would use libraries like:
    // - pdf.js or pdfjs-dist for PDF parsing
    // - mammoth.js for .docx parsing
    const mockExtractedPlan: Omit<LessonPlan, "id" | "createdAt"> = {
      title: file.name.replace(/\.(pdf|doc|docx)$/i, ''),
      subject: "Science",
      grade: "9th Grade",
      description: `Lesson plan extracted from ${file.name}. This is a comprehensive lesson covering key concepts and activities designed to engage students in active learning.`,
      objectives: [
        "Understand the main concepts presented in the lesson",
        "Apply knowledge through hands-on activities",
        "Demonstrate comprehension through assessment"
      ],
      materials: [
        "Textbook",
        "Worksheets",
        "Presentation slides",
        "Lab equipment"
      ],
      activities: [
        "Introduction and warm-up discussion (10 min)",
        "Main lesson presentation (20 min)",
        "Group activity or lab work (25 min)",
        "Review and assessment (15 min)"
      ],
      duration: "70 minutes",
      teacherName: "Current Teacher"
    };

    return mockExtractedPlan;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Simulate extraction (keep this for the UI "Lesson Plan" data)
      const extractedPlan = await simulateExtraction(file);

      // 2. REAL Backend Ingestion (for RAG)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_id", "default"); // Global context for now

      try {
        await fetch("http://localhost:8000/ingest", {
          method: "POST",
          body: formData,
        });
        toast.success("File added to AI Knowledge Base!");
      } catch (backendError) {
        console.error("Backend ingest failed:", backendError);
        toast.error("AI Ingest failed (is backend running?), but continuing...");
      }

      toast.success("File processed successfully!");
      onExtracted(extractedPlan);
    } catch (err) {
      setError("Failed to process the file. Please try again or enter the lesson plan manually.");
      toast.error("Failed to process file");
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Lesson Plan</CardTitle>
        <CardDescription>
          Upload a .pdf, .doc, or .docx file and we'll extract the lesson plan details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-green-700" />
            </div>
            <div>
              <p className="text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500 mt-1">
                PDF, DOC, or DOCX (max 10MB)
              </p>
            </div>
          </label>
        </div>

        {/* Selected File */}
        {file && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Processing file...</span>
              <span className="text-gray-900">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {progress === 100 && !error && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              File processed successfully! Review and edit the extracted information.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={!file || isProcessing}
          >
            {isProcessing ? "Processing..." : "Upload & Extract"}
          </Button>
        </div>

        {/* Info Note */}
        <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-900">
          <p>
            <strong>Note:</strong> After extraction, you'll be able to review and edit all details before saving.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
