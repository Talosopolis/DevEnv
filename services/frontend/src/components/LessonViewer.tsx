import { useState } from "react";
import { LessonPlan, Note } from "../App";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  FileText
} from "lucide-react";
import { getSubjectColor } from "../utils/subjectColors";

type LessonViewerProps = {
  lessonPlan: LessonPlan;
  notes: Note[];
  onExit: () => void;
  onNoteClick?: (note: Note) => void;
};

type Section = "overview" | "objectives" | "materials" | "activities" | "notes" | "complete";

export function LessonViewer({ lessonPlan, notes, onExit, onNoteClick }: LessonViewerProps) {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-white hover:bg-white/20 mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Lesson
          </Button>
          
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg">{lessonPlan.title}</h1>
              <Badge className={`shrink-0 ${getSubjectColor(lessonPlan.subject)}`}>{lessonPlan.subject}</Badge>
            </div>
            <p className="text-amber-100 text-sm">{lessonPlan.teacherName} • {lessonPlan.grade}</p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-amber-100">Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-green-800" />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-6">
            {currentSection === "overview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-4">
                  <BookOpen className="w-6 h-6" />
                  <h2 className="text-xl">Lesson Overview</h2>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{lessonPlan.description}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{lessonPlan.duration}</p>
                  </CardContent>
                </Card>

                {lessonNotes.length > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <FileText className="w-4 h-4" />
                        Study Notes Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">
                        {lessonNotes.length} {lessonNotes.length === 1 ? 'note' : 'notes'} attached to help you study
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
                  <p><strong>What you'll learn:</strong></p>
                  <ul className="mt-2 space-y-1 ml-4">
                    {lessonPlan.objectives.slice(0, 2).map((obj, idx) => (
                      <li key={idx} className="list-disc">{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {currentSection === "objectives" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-4">
                  <Target className="w-6 h-6" />
                  <h2 className="text-xl">Learning Objectives</h2>
                </div>

                <p className="text-gray-600 mb-4">
                  By the end of this lesson, you should be able to:
                </p>

                <div className="space-y-3">
                  {lessonPlan.objectives.map((objective, index) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-all ${
                        checkedObjectives.has(index) 
                          ? 'bg-green-50 border-green-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleObjective(index)}
                    >
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="mt-0.5">
                          {checkedObjectives.has(index) ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <p className={checkedObjectives.has(index) ? 'text-green-900' : 'text-gray-700'}>
                          {objective}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
                  <p><strong>Tip:</strong> Click on each objective as you understand it!</p>
                </div>
              </div>
            )}

            {currentSection === "materials" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-4">
                  <Package className="w-6 h-6" />
                  <h2 className="text-xl">Materials Needed</h2>
                </div>

                <p className="text-gray-600 mb-4">
                  Make sure you have these materials ready:
                </p>

                <div className="space-y-3">
                  {lessonPlan.materials.map((material, index) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-all ${
                        checkedMaterials.has(index) 
                          ? 'bg-green-50 border-green-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleMaterial(index)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div>
                          {checkedMaterials.has(index) ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <p className={checkedMaterials.has(index) ? 'text-green-900' : 'text-gray-700'}>
                          {material}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
                  <p><strong>Ready to start?</strong> Make sure all materials are checked off before proceeding!</p>
                </div>
              </div>
            )}

            {currentSection === "activities" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-4">
                  <Activity className="w-6 h-6" />
                  <h2 className="text-xl">Lesson Activities</h2>
                </div>

                <p className="text-gray-600 mb-4">
                  Follow along with these activities:
                </p>

                <div className="space-y-3">
                  {lessonPlan.activities.map((activity, index) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-all ${
                        completedActivities.has(index) 
                          ? 'bg-green-50 border-green-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleActivity(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <span className="text-green-700 font-semibold text-sm">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className={completedActivities.has(index) ? 'text-green-900' : 'text-gray-700'}>
                              {activity}
                            </p>
                          </div>
                          <div className="mt-1">
                            {completedActivities.has(index) ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300" />
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-4">
                  <FileText className="w-6 h-6" />
                  <h2 className="text-xl">Study Notes</h2>
                </div>

                <p className="text-gray-600 mb-4">
                  Additional notes and resources for this lesson:
                </p>

                <div className="space-y-3">
                  {lessonNotes.map((note) => (
                    <Card 
                      key={note.id}
                      className="cursor-pointer hover:bg-gray-50 transition-all"
                      onClick={() => onNoteClick?.(note)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            {note.title}
                          </CardTitle>
                          <Badge className={getSubjectColor(note.subject)}>{note.subject}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {note.content.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>By {note.teacherName}</span>
                            <span>•</span>
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-sm text-green-600">
                          <span>View full note</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
                  <p><strong>Study tip:</strong> Review these notes to deepen your understanding of the lesson topics.</p>
                </div>
              </div>
            )}

            {currentSection === "complete" && (
              <div className="space-y-4 text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                
                <h2 className="text-2xl text-gray-900">Lesson Complete!</h2>
                <p className="text-gray-600">
                  Great job completing "{lessonPlan.title}"
                </p>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Objectives understood:</span>
                      <span className="font-semibold">
                        {checkedObjectives.size}/{lessonPlan.objectives.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Materials checked:</span>
                      <span className="font-semibold">
                        {checkedMaterials.size}/{lessonPlan.materials.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Activities completed:</span>
                      <span className="font-semibold">
                        {completedActivities.size}/{lessonPlan.activities.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900 mt-4">
                  <p>Keep up the great work! Review the lesson anytime or ask the AI assistant if you have questions.</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={goToPreviousSection}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={currentSection === "complete" ? onExit : goToNextSection}
              className="flex-1"
            >
              {currentSection === "complete" ? "Exit Lesson" : "Next"}
              {currentSection !== "complete" && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
