import { useState } from "react";
import { LessonPlan } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { Plus, X, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type LessonPlanFormProps = {
  initialData?: LessonPlan;
  onSubmit: (plan: Omit<LessonPlan, "id" | "createdAt">) => void;
  onCancel: () => void;
};

export function LessonPlanForm({ initialData, onSubmit, onCancel }: LessonPlanFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [grade, setGrade] = useState(initialData?.grade || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [duration, setDuration] = useState(initialData?.duration || "");
  const [teacherName, setTeacherName] = useState(initialData?.teacherName || "");
  const [objectives, setObjectives] = useState<string[]>(initialData?.objectives || [""]);
  const [materials, setMaterials] = useState<string[]>(initialData?.materials || [""]);
  const [activities, setActivities] = useState<string[]>(initialData?.activities || [""]);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      title,
      subject,
      grade,
      description,
      duration,
      teacherName,
      objectives: objectives.filter(o => o.trim() !== ""),
      materials: materials.filter(m => m.trim() !== ""),
      activities: activities.filter(a => a.trim() !== ""),
      isPublic,
      password: "", // Removed password logic
    });
  };

  const addItem = (list: string[], setter: (list: string[]) => void) => {
    setter([...list, ""]);
  };

  const updateItem = (list: string[], setter: (list: string[]) => void, index: number, value: string) => {
    const newList = [...list];
    newList[index] = value;
    setter(newList);
  };

  const removeItem = (list: string[], setter: (list: string[]) => void, index: number) => {
    setter(list.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card className="bg-stone-900 border-amber-900/20 rounded-none">
        <CardHeader className="border-b border-stone-800">
          <CardTitle className="text-amber-500 uppercase tracking-widest text-lg font-bold">
            {initialData ? "Modify Archive Record" : "Initialize New Archive"}
          </CardTitle>
          <CardDescription className="text-stone-500 text-xs">
            {initialData ? "Update module parameters" : "Define core parameters for the new educational module"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea className="h-[calc(100vh-280px)] pr-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label htmlFor="title" className="uppercase tracking-widest text-[10px] text-stone-400">Module Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.G. INTRODUCTION TO PHOTOSYNTHESIS"
                  required
                  className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="uppercase tracking-widest text-[10px] text-stone-400">Discipline *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="E.G. BIOLOGY"
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade" className="uppercase tracking-widest text-[10px] text-stone-400">Target Level *</Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="E.G. 8TH GRADE"
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="uppercase tracking-widest text-[10px] text-stone-400">Est. Duration *</Label>
                  <Input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="E.G. 60 MINUTES"
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher" className="uppercase tracking-widest text-[10px] text-stone-400">Instructor *</Label>
                  <Input
                    id="teacher"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="E.G. MS. JOHNSON"
                    required
                    className="bg-stone-950 border-amber-900/30 text-stone-200 placeholder:text-stone-700 focus:border-amber-500 rounded-none tracking-wide text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="uppercase tracking-widest text-[10px] text-stone-400">Abstract *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of the module content..."
                  rows={3}
                  required
                  className="bg-stone-950 border-amber-900/30 text-stone-300 placeholder:text-stone-700 focus:border-amber-500 rounded-none font-mono text-sm leading-relaxed"
                />
              </div>

              {/* Learning Objectives */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between">
                  <Label className="uppercase tracking-widest text-xs text-amber-600 font-bold">Objectives</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(objectives, setObjectives)}
                    className="text-stone-500 hover:text-amber-500 hover:bg-stone-800 h-6 text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Objective
                  </Button>
                </div>
                {objectives.map((obj, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={obj}
                      onChange={(e) => updateItem(objectives, setObjectives, index, e.target.value)}
                      placeholder={`OBJECTIVE ${index + 1}`}
                      className="bg-stone-950 border-stone-800 text-stone-300 focus:border-amber-500 rounded-none text-xs"
                    />
                    {objectives.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(objectives, setObjectives, index)}
                        className="h-9 w-9 text-stone-600 hover:text-red-500 hover:bg-stone-800 rounded-none"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Materials */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between">
                  <Label className="uppercase tracking-widest text-xs text-amber-600 font-bold">Required Materials</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(materials, setMaterials)}
                    className="text-stone-500 hover:text-amber-500 hover:bg-stone-800 h-6 text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Material
                  </Button>
                </div>
                {materials.map((material, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={material}
                      onChange={(e) => updateItem(materials, setMaterials, index, e.target.value)}
                      placeholder={`MATERIAL ${index + 1}`}
                      className="bg-stone-950 border-stone-800 text-stone-300 focus:border-amber-500 rounded-none text-xs"
                    />
                    {materials.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(materials, setMaterials, index)}
                        className="h-9 w-9 text-stone-600 hover:text-red-500 hover:bg-stone-800 rounded-none"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Activities */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between">
                  <Label className="uppercase tracking-widest text-xs text-amber-600 font-bold">Planned Activities</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(activities, setActivities)}
                    className="text-stone-500 hover:text-amber-500 hover:bg-stone-800 h-6 text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Activity
                  </Button>
                </div>
                {activities.map((activity, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={activity}
                      onChange={(e) => updateItem(activities, setActivities, index, e.target.value)}
                      placeholder={`ACTIVITY ${index + 1}`}
                      className="bg-stone-950 border-stone-800 text-stone-300 focus:border-amber-500 rounded-none text-xs"
                    />
                    {activities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(activities, setActivities, index)}
                        className="h-9 w-9 text-stone-600 hover:text-red-500 hover:bg-stone-800 rounded-none"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4 pt-4 border-t border-stone-800 bg-stone-950/50 p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="uppercase tracking-widest text-xs text-stone-300">Access Protocol</Label>
                    <p className="text-[10px] text-stone-600 font-mono">DETERMINES VISIBILITY FOR INITIATES</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className={`uppercase tracking-widest text-[10px] ${isPublic ? 'text-amber-500' : 'text-stone-500'}`}>
                      {isPublic ? "Public Access" : "Restricted"}
                    </Label>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={(checked: boolean) => setIsPublic(checked)}
                      className="bg-stone-800 data-[state=checked]:bg-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-none bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold uppercase tracking-widest text-xs">
                  {initialData ? "Update Archive" : "Initialize Archive"}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}