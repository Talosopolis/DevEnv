import { useState } from "react";
import { LessonPlan } from "../App";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { Plus, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner@2.0.3";

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
  const [password, setPassword] = useState(initialData?.password || "");

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
      password: isPublic ? "" : password,
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
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Edit" : "Create"} Lesson Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)] pr-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Photosynthesis"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Biology"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade *</Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g., 8th Grade"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration *</Label>
                  <Input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 60 minutes"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher">Teacher Name *</Label>
                  <Input
                    id="teacher"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g., Ms. Johnson"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of the lesson..."
                  rows={3}
                  required
                />
              </div>

              {/* Learning Objectives */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Learning Objectives</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(objectives, setObjectives)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {objectives.map((obj, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={obj}
                      onChange={(e) => updateItem(objectives, setObjectives, index, e.target.value)}
                      placeholder={`Objective ${index + 1}`}
                    />
                    {objectives.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(objectives, setObjectives, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Materials */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Materials Needed</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(materials, setMaterials)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {materials.map((material, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={material}
                      onChange={(e) => updateItem(materials, setMaterials, index, e.target.value)}
                      placeholder={`Material ${index + 1}`}
                    />
                    {materials.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(materials, setMaterials, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Activities</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(activities, setActivities)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {activities.map((activity, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={activity}
                      onChange={(e) => updateItem(activities, setActivities, index, e.target.value)}
                      placeholder={`Activity ${index + 1}`}
                    />
                    {activities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(activities, setActivities, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Privacy Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Privacy Settings</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked)}
                  />
                  <Label>Public</Label>
                </div>
                {!isPublic && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a password to protect this lesson plan"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {initialData ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}