import { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Sparkles, Layers, Clock, Zap } from "lucide-react";

export type GenerationConfig = {
    moduleCount: number;
    intensity: "standard" | "comprehensive" | "intensive";
};

type WizardStepConfigProps = {
    onGenerate: (config: GenerationConfig) => void;
    onBack: () => void;
};

export function WizardStepConfig({ onGenerate, onBack }: WizardStepConfigProps) {
    const [moduleCount, setModuleCount] = useState([8]); // Default to 8
    const [intensity, setIntensity] = useState<"standard" | "comprehensive" | "intensive">("standard");

    const handleGenerate = () => {
        onGenerate({
            moduleCount: moduleCount[0],
            intensity,
        });
    };

    return (
        <div className="space-y-4">
            <Card className="bg-stone-900 border-amber-900/20 rounded-none">
                <CardHeader className="border-b border-stone-800">
                    <CardTitle className="text-amber-500 uppercase tracking-widest text-lg font-bold">
                        Output Configuration
                    </CardTitle>
                    <CardDescription className="text-stone-500 text-xs">
                        Configure parameters for the Genesis Engine curriculum generation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">

                    {/* Module Count */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="uppercase tracking-widest text-xs text-stone-300 font-bold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-600" />
                                Module Structure
                            </Label>
                            <Badge className="bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded-none text-xs px-2 py-0.5 font-mono">
                                {moduleCount[0]} MODULES
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center gap-6 py-4">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    const newVal = Math.max(4, moduleCount[0] - 1);
                                    setModuleCount([newVal]);
                                }}
                                disabled={moduleCount[0] <= 4}
                                className="w-12 h-12 rounded-full border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200"
                            >
                                <span className="text-xl font-bold">-</span>
                            </Button>

                            <div className="flex flex-col items-center justify-center w-32">
                                <span className="text-4xl font-bold text-amber-500 font-mono">{moduleCount[0]}</span>
                                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Modules</span>
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    const newVal = Math.min(20, moduleCount[0] + 1);
                                    setModuleCount([newVal]);
                                }}
                                disabled={moduleCount[0] >= 20}
                                className="w-12 h-12 rounded-full border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200"
                            >
                                <span className="text-xl font-bold">+</span>
                            </Button>
                        </div>
                        <p className="text-[10px] text-stone-500 font-mono flex justify-between">
                            <span>MIN: 4 MODULES (1 MONTH)</span>
                            <span>MAX: 20 MODULES (5 MONTHS)</span>
                        </p>
                        <p className="text-xs text-stone-400 border-l mb-2 border-stone-700 pl-3">
                            Each module represents approximately 2-4 weeks of instruction, subdivided into weekly lessons.
                            Estimated Course Duration: <span className="text-amber-500 font-bold">{Math.round(moduleCount[0] * 3)} Weeks</span>
                        </p>
                    </div>

                    {/* Intensity / Detail Level */}
                    <div className="space-y-4 pt-4 border-t border-stone-800">
                        <Label className="uppercase tracking-widest text-xs text-stone-300 font-bold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-600" />
                            Processing Intensity
                        </Label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Standard */}
                            <div
                                onClick={() => setIntensity("standard")}
                                className={`cursor-pointer border p-4 transition-all hover:bg-stone-800 ${intensity === "standard" ? "border-amber-500 bg-amber-950/10" : "border-stone-800 bg-stone-950"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] uppercase tracking-widest font-bold ${intensity === "standard" ? "text-amber-500" : "text-stone-500"}`}>Standard</span>
                                    {intensity === "standard" && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                                </div>
                                <p className="text-[10px] text-stone-400">Balanced depth. Suitable for general overview and standard curriculums.</p>
                            </div>

                            {/* Comprehensive */}
                            <div
                                onClick={() => setIntensity("comprehensive")}
                                className={`cursor-pointer border p-4 transition-all hover:bg-stone-800 ${intensity === "comprehensive" ? "border-amber-500 bg-amber-950/10" : "border-stone-800 bg-stone-950"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] uppercase tracking-widest font-bold ${intensity === "comprehensive" ? "text-amber-500" : "text-stone-500"}`}>Comprehensive</span>
                                    {intensity === "comprehensive" && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                                </div>
                                <p className="text-[10px] text-stone-400">Enhanced detail. generated quizzes and additional reading materials included.</p>
                            </div>

                            {/* Intensive */}
                            <div
                                onClick={() => setIntensity("intensive")}
                                className={`cursor-pointer border p-4 transition-all hover:bg-stone-800 ${intensity === "intensive" ? "border-amber-500 bg-amber-950/10" : "border-stone-800 bg-stone-950"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] uppercase tracking-widest font-bold ${intensity === "intensive" ? "text-amber-500" : "text-stone-500"}`}>Intensive</span>
                                    {intensity === "intensive" && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                                </div>
                                <p className="text-[10px] text-stone-400">Maximum depth. High-token generation for advanced academic requirements.</p>
                            </div>
                        </div>
                    </div>

                </CardContent>
                {/* Footer Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <Button variant="outline" onClick={onBack} className="flex-1 rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200 uppercase tracking-widest text-xs">
                        Back
                    </Button>
                    <Button onClick={handleGenerate} className="flex-1 rounded-none bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(217,119,6,0.2)]">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Initialize Genesis Sequence
                    </Button>
                </div>
            </Card>
        </div>
    );
}
