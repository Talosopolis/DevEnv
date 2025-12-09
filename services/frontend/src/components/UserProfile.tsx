import { useState, useEffect } from "react";
import { User } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { User as UserIcon, Mail, BookOpen, GraduationCap, MapPin, Heart, Shield, Settings, Save, Loader2, LogOut, Briefcase, Globe, Lock, Edit } from "lucide-react";
import { toast } from "sonner";

export function UserProfile({ onBack }: { onBack: () => void }) {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Edit State
    const [bio, setBio] = useState(user?.bio || "");
    const [pronouns, setPronouns] = useState(user?.pronouns || "");
    const [name, setName] = useState(user?.name || "");

    if (!user) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfile({
                bio,
                pronouns,
                name
            });
            setIsEditing(false);
            toast.success("Profile updated");
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const isMinor = user.ageBracket === '<13' || user.ageBracket === '13-17';

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 font-serif">
            <Button variant="ghost" onClick={onBack} className="mb-4 text-stone-500 hover:text-amber-500 hover:bg-stone-900 uppercase tracking-widest text-xs">
                ← Return to Dashboard
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ID CARD */}
                <Card className="md:col-span-1 h-fit bg-stone-900 border-amber-900/30 rounded-none shadow-2xl">
                    <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
                        <Avatar className="w-32 h-32 border-4 border-stone-800 shadow-[0_0_20px_rgba(217,119,6,0.1)]">
                            <AvatarImage src={user.avatarUrl} className="object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                            <AvatarFallback className="bg-stone-800 text-amber-500 text-3xl font-bold">{user.name[0]}</AvatarFallback>
                        </Avatar>

                        <div>
                            <h2 className="text-2xl font-bold text-stone-200 uppercase tracking-wide">{user.name}</h2>
                            {user.pronouns && <span className="text-[10px] text-stone-500 bg-stone-950 px-3 py-1 rounded-none border border-stone-800 uppercase tracking-widest">{user.pronouns}</span>}
                        </div>

                        <Badge className={`${user.role === 'teacher' ? 'bg-amber-900/20 text-amber-500 border-amber-900/50' : 'bg-stone-800 text-stone-400 border-stone-700'} capitalize mt - 2 px - 4 py - 1 rounded - none text - xs tracking - widest border`}>
                            {user.role}
                        </Badge>

                        <div className="w-full pt-6 border-t border-stone-800 space-y-4 text-xs text-left">
                            <div className="flex items-center gap-3 text-stone-500 uppercase tracking-wider font-bold">
                                <Briefcase className="w-4 h-4 shrink-0 text-amber-700" />
                                <span>{user.ageBracket === '18+' ? (user.educationLevel?.replace('_', ' ') || "Adult Learner") : (user.gradeLevel || "Student")}</span>
                            </div>

                            {/* Location Logic: Hidden for Minors, Granular for Adults */}
                            {!isMinor && user.continent && (
                                <div className="flex items-center gap-3 text-stone-500 uppercase tracking-wider font-bold">
                                    <MapPin className="w-4 h-4 shrink-0 text-amber-700" />
                                    <span>{user.continent == 'Europe' ? 'EU Resident' : user.continent}</span>
                                    <Globe className="w-3 h-3 ml-auto text-stone-700" />
                                </div>
                            )}
                            {isMinor && (
                                <div className="flex items-center gap-3 text-stone-600 italic">
                                    <MapPin className="w-4 h-4 shrink-0" />
                                    <span>Location Hidden (Minor)</span>
                                    <Lock className="w-3 h-3 ml-auto text-stone-700" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* BIO & INTERESTS */}
                <Card className="md:col-span-2 bg-stone-900 border-amber-900/30 rounded-none shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-stone-800 pb-4">
                        <CardTitle className="text-amber-500 uppercase tracking-widest text-sm font-bold">Personal Record</CardTitle>
                        {!isEditing ? (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-none border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-amber-500 uppercase tracking-widest text-[10px]">
                                <Edit className="w-3 h-3 mr-2" /> Modify
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-stone-500 hover:text-stone-300 uppercase tracking-widest text-[10px] rounded-none">
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={loading} className="bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold uppercase tracking-widest text-[10px] rounded-none">
                                    <Save className="w-3 h-3 mr-2" /> Update
                                </Button>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-8 pt-6">
                        {/* Bio Section */}
                        <div className="space-y-2">
                            <Label className="uppercase tracking-widest text-[10px] text-stone-500 font-bold">Biography</Label>
                            {isEditing ? (
                                <Textarea
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                    className="bg-stone-950 border-amber-900/30 text-stone-300 placeholder:text-stone-700 focus:border-amber-500 rounded-none font-mono text-sm leading-relaxed"
                                />
                            ) : (
                                <p className="text-stone-400 leading-relaxed min-h-[100px] whitespace-pre-wrap font-serif italic text-lg border-l-2 border-stone-800 pl-4">
                                    "{user.bio || "No biography recorded."}"
                                </p>
                            )}
                        </div>

                        {isEditing && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="uppercase tracking-widest text-[10px] text-stone-500 font-bold">Cognomen (Display Name)</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} className="bg-stone-950 border-amber-900/30 text-stone-300 rounded-none uppercase tracking-wide" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase tracking-widest text-[10px] text-stone-500 font-bold">Forms of Address</Label>
                                    <Input value={pronouns} onChange={e => setPronouns(e.target.value)} className="bg-stone-950 border-amber-900/30 text-stone-300 rounded-none uppercase tracking-wide" />
                                </div>
                            </div>
                        )}

                        {/* Interests Cloud */}
                        <div className="space-y-3 pt-4 border-t border-stone-800">
                            <Label className="uppercase tracking-widest text-[10px] text-stone-500 font-bold">Intellectual Pursuits</Label>
                            <div className="flex flex-wrap gap-2">
                                {user.interests?.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="px-3 py-1 bg-stone-950 text-stone-400 border border-stone-800 rounded-none uppercase tracking-widest text-[10px] hover:border-amber-900/50 hover:text-amber-500 transition-colors">
                                        {tag}
                                    </Badge>
                                ))}
                                {user.interests?.length === 0 && (
                                    <span className="text-xs text-stone-600 italic font-mono">No interests recorded.</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
