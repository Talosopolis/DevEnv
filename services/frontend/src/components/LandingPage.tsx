import { useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { Eye, Triangle, Hexagon, ShieldAlert, BookOpen, Key, Scale, ShieldCheck, Cpu, Skull, Scroll, Network, Columns, Orbit, Gamepad2 } from "lucide-react";
import { QuotesTicker } from "./QuotesTicker";
import { PageLayout } from "./ui/PageLayout";

const LANDING_QUOTES = [
    { text: "It is change, continuing change, inevitable change, that is the dominant factor in society today.", author: "Isaac Asimov" },
    { text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.", author: "Albert Einstein" },
    { text: "A man is not called wise because he talks and talks again; but if he is peaceful, loving and fearless then he is in truth called wise.", author: "The Dhammapada" },
    { text: "Two possibilities exist: either we are alone in the Universe or we are not. Both are equally terrifying.", author: "Arthur C. Clarke" },
    { text: "The body is mortal, but the resident soul is immortal and imperishable.", author: "Bhagavad Gita" },
    { text: "Reason is immortal, all else is mortal.", author: "Pythagoras" },
    { text: "The Answer to the ultimate question of Life, The Universe, and Everything is 42. But what is the question?", author: "Douglas Adams" },
    { text: "The world is sustained by three things: by justice, by truth, and by peace.", author: "Pirkei Avot" },
    { text: "The greatest tragedy of our time is that science has given us marvelous tools, but has not taught us how to use them wisely.", author: "Isaac Asimov" },
    { text: "Science is the great antidote to the poison of enthusiasm and superstition.", author: "Adam Smith" },
    { text: "The ink of the scholar is more sacred than the blood of the martyr.", author: "Hadith" },
    { text: "A man who dares to waste one hour of time has not discovered the value of life.", author: "Charles Darwin" },
    { text: "And ye shall know the truth, and the truth shall make you free.", author: "Gospel of John" },
    { text: "The machine does not isolate man from the great problems of nature but plunges him more deeply into them.", author: "Antoine de Saint-Exupéry" },
    { text: "The reward of a thing well done is to have done it.", author: "Ralph Waldo Emerson" },
    { text: "To know that you do not know is best. To think you know when you do not is a disease.", author: "Tao Te Ching" },
    { text: "No amount of data can prove a lie.", author: "Philip K. Dick" },
    { text: "All courses of action are risky, so prudence is not in avoiding danger (it's impossible), but calculating risk and acting decisively.", author: "Niccolò Machiavelli" },
    { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
    { text: "Humata, Hukhta, Hvarshta: Good Thoughts, Good Words, Good Deeds.", author: "Gathas" },
    { text: "The danger lies not in the machine, but in the men who control the machine.", author: "Isaac Asimov" }
];

interface LandingPageProps {
    onLogin: () => void;
    onRegister: () => void;
    onHeroClick: () => void;
    onLibraryClick: () => void;
    onCovenantClick: () => void;
    onGameClick: () => void;
    onGuestAccess: () => void;
}

export function GeminiIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 3v18" />
            <path d="M18 3v18" />
            <path d="M3 3h18" />
            <path d="M3 21h18" />
        </svg>
    )
}

export function LandingPage({ onLogin, onRegister, onHeroClick, onLibraryClick, onCovenantClick, onGameClick, onGuestAccess }: { onLogin: () => void, onRegister: () => void, onHeroClick: () => void, onLibraryClick: () => void, onCovenantClick: () => void, onGameClick: () => void, onGuestAccess: () => void }) {

    return (
        <PageLayout quotes={LANDING_QUOTES}>
            <div className="relative z-20 container mx-auto px-6 py-0 flex flex-col items-center">


                {/* Header */}
                <header className="w-full flex flex-col items-center border-b border-amber-900/30 pb-6 mb-12 mt-12 text-center animate-breathe">
                    <div className="flex flex-col gap-2 items-center">
                        <div className="flex items-center gap-3 text-amber-600/80">
                            <Triangle className="w-4 h-4 rotate-180" />
                            <span className="text-xs uppercase tracking-[0.3em] font-bold">Sector 10¹⁰⁰ // Node Alpha-Beta</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-stone-100 drop-shadow-md">TALOSOPOLIS</h1>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="w-full max-w-6xl space-y-32">

                    {/* The Hook */}
                    <section className="text-center space-y-12">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.5 }}
                            className="relative w-64 h-64 mx-auto animate-breathe"
                        >
                            {/* Inner Pulsing Glow */}
                            <div className="absolute inset-0 bg-amber-500/10 blur-3xl animate-pulse rounded-full" />

                            {/* Rotating Energetic Hexagon */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0"
                            >
                                <Hexagon className="w-full h-full text-amber-500 stroke-[1.5] drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
                            </motion.div>

                            {/* Counter-rotating Outer Ring */}
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-[-20px] opacity-40"
                            >
                                <Hexagon className="w-full h-full text-amber-300 stroke-[0.5] drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                            </motion.div>

                            <Eye className="w-32 h-32 text-amber-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_50px_rgba(245,158,11,0.8)] animate-pulse" />
                        </motion.div>

                        <div className="space-y-8 animate-breathe">
                            <h2 className="text-5xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-amber-100 via-amber-400 to-amber-900 drop-shadow-lg uppercase tracking-tight">
                                Illuminate. <br /> Initiate. <br /> Ideate.
                            </h2>

                            <div className="flex items-center justify-center gap-4 text-stone-400 max-w-3xl mx-auto">
                                <GeminiIcon className="w-8 h-8 text-amber-500" />
                                <p className="text-xl md:text-2xl italic leading-relaxed font-light tracking-wide">
                                    "THE INFINITE IGNORANCE IS OUR ARCHIVE; <br /> THE BRIDGE OF KNOWLEDGE IS OUR QUEST."
                                </p>
                            </div>
                        </div>

                        {/* Authentication Actions */}
                        <div className="flex flex-col md:flex-row gap-8 justify-center items-center py-12 relative z-50">
                            <Button
                                onClick={onLogin}
                                className="w-64 h-16 bg-transparent border-2 border-amber-900/50 hover:border-amber-500 text-amber-500 hover:bg-amber-950/30 text-lg uppercase tracking-[0.2em] transition-all duration-500 hover:scale-105 animate-pulse-glow"
                            >
                                Enter The City
                            </Button>
                            <Button
                                onClick={onRegister}
                                className="w-64 h-16 bg-amber-700 hover:bg-amber-600 text-stone-100 text-lg uppercase tracking-[0.2em] transition-all duration-500 hover:scale-105 shadow-[0_0_30px_-10px_rgba(217,119,6,0.3)] animate-pulse-glow"
                            >
                                Begin Journey
                            </Button>
                        </div>

                        <div className="flex justify-center -mt-8 mb-8 relative z-50">
                            <button
                                onClick={onGuestAccess}
                                className="text-stone-500 hover:text-amber-500 text-xs uppercase tracking-[0.3em] transition-colors border-b border-transparent hover:border-amber-500 pb-1"
                            >
                                [ Initiate ]
                            </button>
                        </div>
                        <p className="text-xs text-stone-700 uppercase tracking-[0.5em]">Auth Required // No Lurkers</p>
                    </section>


                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full border-t border-b border-amber-900/30 py-12 relative z-50">

                        {/* The Game */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={onGameClick}
                            className="p-8 border border-amber-900/20 bg-stone-900/50 backdrop-blur-sm cursor-pointer hover:bg-stone-900 hover:border-amber-500/50 transition-all group relative overflow-hidden active:scale-95 animate-pulse-glow"
                        >
                            <div className="absolute inset-0 bg-amber-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <Gamepad2 className="w-12 h-12 text-amber-500 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                            <h3 className="text-lg font-bold mb-3 text-stone-200 group-hover:text-amber-400 uppercase tracking-widest">The Game</h3>
                            <p className="text-sm text-stone-500 group-hover:text-stone-300">Initiation. Simulation. Evolution. Understanding the architecture.</p>
                        </div>

                        {/* The Hero */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={onHeroClick}
                            className="p-8 border border-amber-900/20 bg-stone-900/50 backdrop-blur-sm cursor-pointer hover:bg-stone-900 hover:border-amber-500/50 transition-all group relative overflow-hidden active:scale-95 animate-pulse-glow"
                        >
                            <div className="absolute inset-0 bg-amber-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <Orbit className="w-12 h-12 text-amber-500 mx-auto mb-6 group-hover:rotate-180 transition-transform duration-700" />
                            <h3 className="text-lg font-bold mb-3 text-stone-200 group-hover:text-amber-400 uppercase tracking-widest">The Hero</h3>
                            <p className="text-sm text-stone-500 group-hover:text-stone-300">A Modern Argo. The Golden Fleece. Avoid the Torment Nexus.</p>
                        </div>

                        {/* The Library */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={onLibraryClick}
                            className="p-8 border border-amber-900/20 bg-stone-900/50 backdrop-blur-sm cursor-pointer hover:bg-stone-900 hover:border-amber-500/50 transition-all group relative overflow-hidden active:scale-95 animate-pulse-glow"
                        >
                            <div className="absolute inset-0 bg-amber-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <BookOpen className="w-12 h-12 text-amber-500 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                            <h3 className="text-lg font-bold mb-3 text-stone-200 group-hover:text-amber-400 uppercase tracking-widest">The Library</h3>
                            <p className="text-sm text-stone-500 group-hover:text-stone-300">Access unrestricted knowledge powered by advanced Intelligence.</p>
                        </div>

                        {/* The Covenant */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={onCovenantClick}
                            className="p-8 border border-amber-900/20 bg-stone-900/50 backdrop-blur-sm cursor-pointer hover:bg-stone-900 hover:border-amber-500/50 transition-all group relative overflow-hidden active:scale-95 animate-pulse-glow"
                        >
                            <div className="absolute inset-0 bg-amber-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                            <h3 className="text-lg font-bold mb-3 text-stone-200 group-hover:text-amber-400 uppercase tracking-widest">The Covenant</h3>
                            <p className="text-sm text-stone-500 group-hover:text-stone-300">Bound by the AIUPI. Safety for the Creator and the Created.</p>
                        </div>

                    </div>

                    {/* AERGUS */}
                    <div className="bg-stone-900/70 p-6 md:p-8 border border-amber-900/20 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/30 transition-colors animate-pulse-glow">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ShieldCheck size={120} className="text-amber-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-stone-200 mb-4 flex items-center gap-3">
                            <ShieldCheck className="text-amber-500 w-6 h-6" />
                            AERGUS
                        </h3>
                        <p className="text-stone-400 mb-4 sm:pr-24">
                            Your journey is overseen by <strong>A.E.R.G.U.S.</strong> (Artificial Ethics & Real-time Guarding Utility System).
                            Think of it as a surveillance agent... or a glorified moderator bot. A really advanced one. It ensures a safe environment for both Organic and Synthetic intelligence, rigorously protecting user privacy while maintaining the integrity of the Bridge. Basically, don't break the reality simulation.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-amber-500 font-mono">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                            SYSTEM ACTIVE • PRIVACY SECURED
                        </div>
                    </div>

                </main>

                {/* Footer */}
                <footer className="w-full mt-32 border-t border-stone-900 pt-12 pb-6 text-center space-y-4">
                    <div className="text-amber-500 font-bold text-3xl tracking-[0.5em] opacity-20 animate-breathe">
                        MMCXXV
                    </div>
                    <p className="text-[10px] text-stone-700 uppercase tracking-widest">
                        Talosopolis // Forged in the fires of Hephaestus // Powered by Silicon
                    </p>
                </footer>
            </div>
        </PageLayout>
    );
}
