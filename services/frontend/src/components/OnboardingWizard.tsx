import { useState } from "react";
import { User } from "../types";

import { db } from "../services/database";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, User as UserIcon, BookOpen, GraduationCap, Sparkles, Target, Palette, Globe, Library, Loader2, ChevronRight, AlertTriangle, Scale, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
    const { user, updateProfile } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Profile State
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);

    const [role, setRole] = useState<'student' | 'teacher' | 'undecided'>('undecided');
    const [ageBracket, setAgeBracket] = useState<string>("");
    const [gradeLevel, setGradeLevel] = useState("");
    const [educationLevel, setEducationLevel] = useState("");
    const [continent, setContinent] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [bio, setBio] = useState("");
    const [pronouns, setPronouns] = useState("");
    const [eulaAgreed, setEulaAgreed] = useState(false);
    const [aiupiAgreed, setAiupiAgreed] = useState(false);

    const INTERESTS_LIST = [
        "Computer Science", "Biology", "History", "Physics",
        "Mathematics", "Literature", "Art", "Music",
        "Economics", "Psychology", "Languages", "Chemistry"
    ];

    const toggleInterest = (interest: string) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(selectedInterests.filter(i => i !== interest));
        } else {
            setSelectedInterests([...selectedInterests, interest]);
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!username || username.length < 3) {
                toast.error("Username must be at least 3 characters.");
                return;
            }
            if (usernameError) {
                toast.error("Please choose a valid username.");
                return;
            }
            // Final check before proceeding
            setIsCheckingUsername(true);
            const isAvail = await db.checkUsernameAvailability(username);
            setIsCheckingUsername(false);
            if (!isAvail && username !== user?.username) {
                setUsernameError("Username is taken.");
                return;
            }
        }

        if (step === 2 && role === 'undecided') {
            toast.error("Please select a role to continue.");
            return;
        }
        if (step === 3) {
            if (!ageBracket) {
                toast.error("Please select your age bracket.");
                return;
            }
            if (ageBracket === '<13') {
                return; // Blocked state handled in render
            }
            if (ageBracket === '13-17' && !gradeLevel) {
                toast.error("Please select your grade level.");
                return;
            }
            if (ageBracket === '18+' && !educationLevel) {
                toast.error("Please select your education level.");
                return;
            }
        }
        if (step === 4 && !continent) {
            toast.error("Please select your region.");
            return;
        }

        if (step === 7) {
            if (!eulaAgreed || !aiupiAgreed) {
                toast.error("You must agree to all policies to continue.");
                return;
            }
            await handleSubmit();
        } else {
            setStep(step + 1);
        }
    };

    const checkUsername = async (val: string) => {
        setUsername(val);
        setUsernameError(null);
        if (val.length < 3) return;

        setIsCheckingUsername(true);
        const isAvail = await db.checkUsernameAvailability(val);
        setIsCheckingUsername(false);
        if (!isAvail) setUsernameError("Username is taken");
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await updateProfile({
                username,
                role: (role === 'undecided') ? 'student' : role, // Fallback
                ageBracket: ageBracket as any,
                gradeLevel,
                educationLevel,
                continent,
                interests: selectedInterests,
                bio,
                pronouns,
                agreedToEULA: eulaAgreed,
                agreedToAIUPI: aiupiAgreed,
                onboardingCompleted: true
            });
            toast.success("Welcome to Talosopolis!");
            onComplete();
        } catch (error) {
            toast.error("Failed to save profile. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER STEPS ---

    const renderStep1_Username = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Identify Yourself</h3>
            <p className="text-xs text-stone-500 font-mono border-l border-stone-800 pl-3">Designate a unique cognomen. Your true name shall remain veiled.</p>
            <div className="space-y-2">
                <Label className="uppercase tracking-widest text-[10px] text-stone-400">Cognomen (Username)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-600 font-mono">@</span>
                    <Input
                        value={username}
                        onChange={(e) => checkUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className={`pl-8 rounded-none border-stone-800 focus:border-amber-500 text-stone-200 uppercase tracking-wider font-mono ${usernameError ? 'border-red-900/50 bg-red-950/10' : 'bg-stone-950'}`}
                        placeholder="COGNOMEN"
                        maxLength={20}
                    />
                    {isCheckingUsername && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-amber-500" />}
                </div>
                {usernameError && <p className="text-[10px] text-red-500 font-mono uppercase tracking-wide">{usernameError}</p>}
                {!usernameError && username.length > 2 && <p className="text-[10px] text-amber-600 font-mono uppercase tracking-wide">Identifier Available</p>}
            </div>
        </div>
    );

    const renderStep2_Role = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Select Path</h3>
            <p className="text-xs text-stone-500 font-mono border-l border-stone-800 pl-3">How shall you participate in the Great Work?</p>
            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => setRole('student')}
                    className={`p-6 border rounded-none text-left transition-all group ${role === 'student' ? 'border-amber-500 bg-amber-950/10' : 'border-stone-800 hover:border-stone-600 hover:bg-stone-900'}`}
                >
                    <div className={`font-bold uppercase tracking-widest mb-1 ${role === 'student' ? 'text-amber-500' : 'text-stone-400 group-hover:text-stone-200'}`}>Initiate (Student)</div>
                    <div className="text-[10px] text-stone-600 font-mono uppercase">I seek knowledge and understanding.</div>
                </button>
                <button
                    onClick={() => setRole('teacher')}
                    className={`p-6 border rounded-none text-left transition-all group ${role === 'teacher' ? 'border-amber-500 bg-amber-950/10' : 'border-stone-800 hover:border-stone-600 hover:bg-stone-900'}`}
                >
                    <div className={`font-bold uppercase tracking-widest mb-1 ${role === 'teacher' ? 'text-amber-500' : 'text-stone-400 group-hover:text-stone-200'}`}>Magister (Teacher)</div>
                    <div className="text-[10px] text-stone-600 font-mono uppercase">I create archives and disseminate wisdom.</div>
                </button>
            </div>
        </div>
    );

    const renderStep3_Age = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Chronological Status</h3>
            <p className="text-xs text-stone-500 font-mono border-l border-stone-800 pl-3">Protocol requires age verification for content calibration.</p>

            <div className="space-y-2">
                <Label className="uppercase tracking-widest text-[10px] text-stone-400">Age Bracket</Label>
                <Select value={ageBracket} onValueChange={setAgeBracket}>
                    <SelectTrigger className="text-stone-300 bg-stone-950 border-stone-800 rounded-none uppercase tracking-wide text-xs">
                        <SelectValue placeholder="SELECT STATUS" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none">
                        <SelectItem value="<13" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Under 13</SelectItem>
                        <SelectItem value="13-17" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">13 - 17</SelectItem>
                        <SelectItem value="18+" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">18+</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {ageBracket === '<13' && (
                <div className="mt-4 p-4 bg-red-950/20 border border-red-900/50 text-red-400 flex items-start gap-3 rounded-none">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold uppercase tracking-widest text-xs">Guardian Consent Required</h4>
                        <p className="text-[10px] mt-1 font-mono uppercase">
                            Protocol 13: Minors must be registered by a designated guardian. Abort sequence active.
                        </p>
                    </div>
                </div>
            )}

            {ageBracket === '13-17' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="uppercase tracking-widest text-[10px] text-stone-400">Grade Level</Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                        <SelectTrigger className="text-stone-300 bg-stone-950 border-stone-800 rounded-none uppercase tracking-wide text-xs"><SelectValue placeholder="SELECT GRADE" /></SelectTrigger>
                        <SelectContent className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none">
                            <SelectItem value="6th" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">6th - 8th Grade</SelectItem>
                            <SelectItem value="9th" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">9th Grade</SelectItem>
                            <SelectItem value="10th" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">10th Grade</SelectItem>
                            <SelectItem value="11th" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">11th Grade</SelectItem>
                            <SelectItem value="12th" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">12th Grade</SelectItem>
                            <SelectItem value="other" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Other / Homeschool</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {ageBracket === '18+' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="uppercase tracking-widest text-[10px] text-stone-400">Education Level</Label>
                    <Select value={educationLevel} onValueChange={setEducationLevel}>
                        <SelectTrigger className="text-stone-300 bg-stone-950 border-stone-800 rounded-none uppercase tracking-wide text-xs"><SelectValue placeholder="SELECT EDUCATION" /></SelectTrigger>
                        <SelectContent className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none">
                            <SelectItem value="hs_grad" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">High School Graduate</SelectItem>
                            <SelectItem value="undergrad" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Undergraduate Student</SelectItem>
                            <SelectItem value="grad_student" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Graduate Student</SelectItem>
                            <SelectItem value="phd" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">PhD / Doctorate</SelectItem>
                            <SelectItem value="trade" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Trade School</SelectItem>
                            <SelectItem value="self_taught" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Self Taught / Lifelong Learner</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );

    const renderStep4_Location = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Regional Alignment</h3>
            <p className="text-xs text-stone-500 font-mono border-l border-stone-800 pl-3">Compliance with local data retention protocols.</p>

            <Select value={continent} onValueChange={setContinent}>
                <SelectTrigger className="text-stone-300 bg-stone-950 border-stone-800 rounded-none uppercase tracking-wide text-xs"><SelectValue placeholder="SELECT REGION" /></SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-900/30 text-stone-300 rounded-none">
                    <SelectItem value="North America" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">North America</SelectItem>
                    <SelectItem value="South America" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">South America</SelectItem>
                    <SelectItem value="Europe" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Europe</SelectItem>
                    <SelectItem value="Asia" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Asia</SelectItem>
                    <SelectItem value="Africa" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Africa</SelectItem>
                    <SelectItem value="Australia" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Australia / Oceania</SelectItem>
                    <SelectItem value="Antarctica" className="focus:bg-stone-800 focus:text-amber-500 uppercase tracking-wide text-xs">Antarctica</SelectItem>
                </SelectContent>
            </Select>

            {continent === 'Europe' && (
                <div className="mt-4 p-4 bg-stone-900 border border-blue-900/30 text-blue-400 flex items-start gap-3 rounded-none">
                    <Globe className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold uppercase tracking-widest text-xs">GDPR Protocol Active</h4>
                        <p className="text-[10px] mt-1 font-mono uppercase">
                            Europe Region Detected. GDPR Compliance mode engaged. Data visibility controls available in settings.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep5_Interests = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Intellectual Pursuits</h3>
            <p className="text-xs text-stone-500 font-mono border-l border-stone-800 pl-3">Designate your primary areas of study.</p>

            <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.map(interest => (
                    <Badge
                        key={interest}
                        variant={selectedInterests.includes(interest) ? "default" : "outline"}
                        className={`cursor-pointer px-4 py-2 rounded-none border text-[10px] uppercase tracking-widest transition-all ${selectedInterests.includes(interest) ? 'bg-amber-900/20 text-amber-500 border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.2)]' : 'border-stone-800 text-stone-500 hover:border-amber-900/50 hover:text-stone-300'}`}
                        onClick={() => toggleInterest(interest)}
                    >
                        {interest}
                    </Badge>
                ))}
            </div>
        </div>
    );

    const renderStep6_Bio = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Personal Archives</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="uppercase tracking-widest text-[10px] text-stone-400">Google Ref (Hidden)</Label>
                    <Input disabled value={user?.name || ""} className="bg-stone-900 border-stone-800 text-stone-600 rounded-none font-mono uppercase text-xs" />
                    <p className="text-[10px] text-stone-600 font-mono uppercase">Visible only to self.</p>
                </div>
                <div className="space-y-2">
                    <Label className="uppercase tracking-widest text-[10px] text-stone-400">Forms of Address</Label>
                    <Input
                        placeholder="E.G. THEY/THEM"
                        value={pronouns}
                        onChange={e => setPronouns(e.target.value)}
                        className="bg-stone-950 border-stone-800 text-stone-300 focus:border-amber-500 rounded-none uppercase tracking-wide text-xs"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="uppercase tracking-widest text-[10px] text-stone-400">Manifesto (Bio)</Label>
                <Textarea
                    placeholder="Declare your intent..."
                    maxLength={500}
                    rows={5}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="bg-stone-950 border-stone-800 text-stone-300 focus:border-amber-500 rounded-none font-mono text-xs leading-relaxed"
                />
                <div className="text-right text-[10px] text-stone-600 font-mono">
                    {bio.length}/500
                </div>
            </div>
        </div>
    );

    const renderStep7_Legal = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-amber-500 uppercase tracking-widest">Final Convenant</h3>

            <div className="space-y-4">
                <div className="border border-stone-800 bg-stone-900/50 p-4 rounded-none">
                    <div className="flex items-start gap-3">
                        <Scale className="w-5 h-5 text-stone-500 mt-0.5" />
                        <div className="space-y-2">
                            <h4 className="font-bold text-xs uppercase tracking-widest text-stone-300">End User License Agreement (EULA)</h4>
                            <div className="h-24 overflow-y-auto text-[10px] text-stone-500 bg-stone-950 border border-stone-800 p-3 font-mono leading-relaxed">
                                <p><strong className="text-stone-400">1. Acceptance of Terms.</strong> By entering the Archive, you accept the Covenant.</p>
                                <p><strong className="text-stone-400">2. MIT License.</strong> The core architecture is open.</p>
                                <p><strong className="text-stone-400">3. Content Ownership.</strong> You retain your knowledge.</p>
                                <p><strong className="text-stone-400">4. Conduct.</strong> Disruption of the Archive is prohibited.</p>
                                <p>...</p>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="eula" checked={eulaAgreed} onCheckedChange={(c: boolean) => setEulaAgreed(!!c)} className="border-stone-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 rounded-none" />
                                <label htmlFor="eula" className="text-xs font-medium leading-none text-stone-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 uppercase tracking-wide">
                                    I accept the EULA
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border border-stone-800 bg-stone-900/50 p-4 rounded-none">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5" />
                        <div className="space-y-2">
                            <h4 className="font-bold text-xs uppercase tracking-widest text-stone-300">AI & User Protection Initiative (AIUPI)</h4>
                            <p className="text-[10px] text-stone-600 font-mono uppercase">
                                This policy safeguards the integrity of both Biological and Synthetic intelligences.
                            </p>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="aiupi" checked={aiupiAgreed} onCheckedChange={(c: boolean) => setAiupiAgreed(!!c)} className="border-stone-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 rounded-none" />
                                <label htmlFor="aiupi" className="text-xs font-medium leading-none text-stone-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 uppercase tracking-wide">
                                    I accept the AIUPI Standards
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-stone-900 border border-amber-900/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-none font-serif">
                <CardHeader className="border-b border-stone-800 pb-6">
                    <div className="flex justify-between items-center mb-2">
                        <CardTitle className="text-xl text-stone-100 uppercase tracking-widest font-bold">
                            {step === 1 && "Identity Verification"}
                            {step === 2 && "Path Selection"}
                            {step === 3 && "Chronological Status"}
                            {step === 4 && "Regional Settings"}
                            {step === 5 && "Intellectual Pursuits"}
                            {step === 6 && "Personal Archives"}
                            {step === 7 && "Final Covenant"}
                        </CardTitle>
                        <div className="text-xs font-bold text-amber-600 font-mono uppercase tracking-widest">Phase {step} // 07</div>
                    </div>
                    <CardDescription className="text-stone-500 font-mono text-xs uppercase tracking-wide">Initialize your profile to begin.</CardDescription>
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-stone-800 mt-4 overflow-hidden">
                        <div
                            className="h-full bg-amber-600 transition-all duration-500 ease-out box-shadow-[0_0_10px_rgba(217,119,6,0.5)]"
                            style={{ width: `${(step / 7) * 100}%` }}
                        />
                    </div>
                </CardHeader>
                <CardContent className="min-h-[350px] pt-8">
                    {step === 1 && renderStep1_Username()}
                    {step === 2 && renderStep2_Role()}
                    {step === 3 && renderStep3_Age()}
                    {step === 4 && renderStep4_Location()}
                    {step === 5 && renderStep5_Interests()}
                    {step === 6 && renderStep6_Bio()}
                    {step === 7 && renderStep7_Legal()}
                </CardContent>
                <CardFooter className="flex justify-between border-t border-stone-800 pt-6 bg-stone-950/30">
                    <Button
                        variant="ghost"
                        onClick={() => step > 1 ? setStep(step - 1) : null}
                        disabled={step === 1}
                        className="rounded-none text-stone-500 hover:text-stone-300 hover:bg-stone-900 uppercase tracking-widest text-xs"
                    >
                        Back
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={loading || (step === 3 && ageBracket === '<13') || (step === 1 && (!!usernameError || !username))}
                        className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-bold uppercase tracking-widest text-xs px-8 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {step === 7 ? 'Seal Covenant' : 'Proceed'}
                        {!loading && step !== 7 && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
