import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { GraduationCap, BookOpen, Loader2, Info, Triangle, Hexagon } from "lucide-react";
import { isConfigured } from "../firebase";
import { PageLayout } from "./ui/PageLayout";

const LOGIN_QUOTES = [
    { text: "The beginning is the most important part of the work.", author: "Plato" },
    { text: "Knowledge is power.", author: "Francis Bacon" },
    { text: "Step into the light.", author: "Talos Protocol" }
];

export function SignIn({ onBack, onSuccess, initialMode = 'signin' }: { onBack: () => void, onSuccess: () => void, initialMode?: 'signin' | 'signup' }) {
    const { signIn, signUp, isLoading, bypassAuth } = useAuth();
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [name, setName] = useState("");
    const [role, setRole] = useState<'student' | 'teacher'>('student');
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        console.log("DEBUG: Login Button Clicked");
        setError(null);
        try {
            console.log("DEBUG: Calling AuthContext.signIn()");
            await signIn();
            console.log("DEBUG: AuthContext.signIn() returned");
            onSuccess();
        } catch (e: any) {
            console.error("Login failed", e);
            setError(e.message || "Failed to sign in. Check console.");
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) return;

        try {
            await signUp(name, role);
            onSuccess();
        } catch (e) {
            setError("Failed to create account.");
        }
    };

    return (
        <PageLayout quotes={LOGIN_QUOTES} showTicker={true}>
            <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-4 font-serif">
                <div className="w-full max-w-md bg-stone-900 border border-amber-900/30 rounded-none shadow-2xl overflow-hidden relative">
                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none"></div>

                    <div className="bg-stone-950 p-8 text-center border-b border-amber-900/30 relative">
                        <div className="absolute top-4 left-4 opacity-20">
                            <Triangle className="w-6 h-6 text-amber-500 rotate-180" />
                        </div>
                        <h2 className="text-2xl font-bold text-amber-500 tracking-widest uppercase">
                            {mode === 'signin' ? 'Authorization' : 'Initiation'}
                        </h2>
                        <p className="text-stone-500 text-xs mt-2 tracking-wide">
                            {mode === 'signin' ? 'ENTER CREDENTIALS' : 'DECLARE INTENT'}
                        </p>

                        {isConfigured ? (
                            <div className="flex items-center justify-center gap-1 mt-4 text-[10px] text-stone-600 uppercase tracking-widest">
                                <Info className="w-3 h-3" /> Secure Connection
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-1 mt-4 text-[10px] text-amber-500/50 uppercase tracking-widest border border-amber-900/30 px-2 py-1 inline-flex">
                                <Info className="w-3 h-3" /> Simulation Mode
                            </div>
                        )}
                    </div>

                    <div className="p-8 space-y-6">
                        {mode === 'signin' ? (
                            <>
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-stone-100 hover:bg-white text-stone-900 font-bold py-4 px-4 transition-all shadow-sm hover:shadow-md"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                    )}
                                    <span className="flex-1 text-center">ACCESS VIA GOOGLE</span>
                                </button>

                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-amber-900/20"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                        <span className="px-2 bg-stone-900 text-stone-600">Or</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setMode('signup')}
                                    className="w-full bg-transparent hover:bg-stone-800 text-stone-500 hover:text-amber-500 text-xs font-bold py-2 px-4 border border-transparent hover:border-amber-900/30 transition-colors uppercase tracking-widest"
                                >
                                    Initiate New Identity
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleSignUp} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-amber-500/80 mb-2 uppercase tracking-wide">Identity Designation (Full Name)</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-stone-950 border border-amber-900/30 text-stone-200 focus:border-amber-500/50 outline-none transition-all placeholder:text-stone-800"
                                        placeholder="ENTER NAME"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        className={`p-4 border flex flex-col items-center gap-2 transition-all ${role === 'student' ? 'border-amber-500 bg-amber-950/20 text-amber-500' : 'border-stone-800 bg-stone-950 text-stone-600 hover:border-stone-700'}`}
                                    >
                                        <GraduationCap size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Scholar</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('teacher')}
                                        className={`p-4 border flex flex-col items-center gap-2 transition-all ${role === 'teacher' ? 'border-amber-500 bg-amber-950/20 text-amber-500' : 'border-stone-800 bg-stone-950 text-stone-600 hover:border-stone-700'}`}
                                    >
                                        <BookOpen size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Magister</span>
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-stone-950 font-bold py-4 px-4 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] uppercase tracking-[0.2em]"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'CONFIRM IDENTITY'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode('signin')}
                                    className="w-full text-stone-600 text-xs hover:text-amber-500 mt-2 uppercase tracking-widest transition-colors"
                                >
                                    Return to Authorization
                                </button>
                            </form>
                        )}

                        {error && (
                            <div className="mt-4 text-red-500 text-xs text-center border border-red-900/30 bg-red-950/20 p-2 uppercase tracking-wide">
                                <p className="mb-2">{error}</p>
                                <button
                                    onClick={() => { bypassAuth(); onSuccess(); }}
                                    className="w-full bg-red-900/40 hover:bg-red-800/40 text-red-200 text-[10px] py-2 px-2 border border-red-500/30 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                >
                                    <Hexagon className="w-3 h-3" />
                                    Force Simulation Mode
                                </button>
                            </div>
                        )}

                        <div className="mt-4 p-2 border border-amber-900/30 text-[10px] text-stone-600 font-mono text-center">
                            <p>DEBUG: Current Origin</p>
                            <p className="text-amber-500">{window.location.origin}</p>
                            <p className="mt-1">Ensure this URL is in Firebase Authorized Domains</p>
                        </div>
                    </div>
                </div>

            </div>
        </PageLayout>
    );
}
