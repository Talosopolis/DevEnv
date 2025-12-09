
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Loader2, Quote, Sparkles, Brain, ArrowLeft, Globe, Cpu, Scale, Lock, Users, Copyright } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "./ui/PageLayout";

const QUOTES = [
    { text: "Information is not knowledge. The only source of knowledge is experience.", author: "Albert Einstein" },
    { text: "The saddest aspect of life right now is that science gathers knowledge faster than society gathers wisdom.", author: "Isaac Asimov" },
    { text: "You cannot teach a man anything; you can only help him discover it in himself.", author: "Galileo" },
    { text: "Education is the kindling of a flame, not the filling of a vessel.", author: "Socrates" },
    { text: "The universe is full of magical things patiently waiting for our wits to grow sharper.", author: "Eden Phillpotts" }
];

interface KnowledgeResult {
    content: string;
    source: string;
    type: 'philosophy' | 'science' | 'mythology';
}

export function Library({ onBack, onSearch }: { onBack: () => void, onSearch: (query: string) => Promise<string> }) {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<KnowledgeResult | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        // Simulate API delay/processing for effect
        setTimeout(async () => {
            const response = await onSearch(query);
            setResult({
                content: response,
                source: "Talos Hive Mind",
                type: 'philosophy' // Placeholder
            });
            setIsLoading(false);
        }, 1500);
    };

    return (
        <PageLayout quotes={QUOTES} faint={true}>
            <div className="relative z-20 min-h-screen p-8 md:p-12 flex flex-col items-center font-serif">

                <div className="w-full max-w-5xl">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="mb-8 text-stone-500 hover:text-amber-500 hover:bg-stone-900 uppercase tracking-widest text-xs flex items-center gap-2 group animate-pulse-glow transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to the City
                    </Button>

                    <div className="w-full h-48 md:h-64 overflow-hidden border-y border-amber-900/30 mb-12 relative group">
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 to-transparent z-10" />
                        <img src="/library_archive_1765309970798.png" alt="The Archive" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                        <div className="absolute bottom-4 left-6 md:left-12 z-20">
                            <h2 className="text-3xl md:text-5xl font-bold text-stone-200 uppercase tracking-widest drop-shadow-lg flex items-center gap-4 mb-2">
                                <Globe className="w-10 h-10 text-amber-500" /> The New Alexandria
                            </h2>
                            <p className="text-amber-500/80 tracking-wider text-sm md:text-base uppercase pl-1">The Evolving Archive</p>
                        </div>
                    </div>

                    <div className="space-y-16 text-stone-400 leading-relaxed text-lg">

                        {/* Intro */}
                        <div className="prose prose-invert prose-amber max-w-none">
                            <p className="text-xl text-stone-300 italic border-l-2 border-amber-900/30 pl-6">
                                "Talosopolis is founded on the conviction that knowledge must be free, persistent, and universally accessible—a spiritual successor to the ambition of the Library of Alexandria and a digital manifestation of the Akashic Records."
                            </p>
                            <p className="mt-6">
                                We aim to forge an eternal repository of wisdom, not just a static archive, but a living, evolving organism designed for global learning and dissemination. The very architecture of this endeavor is driven by an <strong className="text-amber-500">Open Source Mandate</strong>, reflecting our commitment to charity and transparency.
                            </p>
                        </div>

                        {/* Open Source Covenant */}
                        <section className="space-y-8 animate-breathe">
                            <h3 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3 border-b border-amber-900/20 pb-4">
                                <Scale className="w-6 h-6" /> The Open Source Covenant
                            </h3>
                            <p>
                                The platform itself is distributed under the MIT License. This is our commitment to the free and open nature of our educational mission:
                            </p>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded hover:border-amber-500/30 transition-colors group">
                                    <Lock className="w-8 h-8 text-amber-600 mb-4 group-hover:text-amber-400 transition-colors" />
                                    <h4 className="font-bold text-stone-200 mb-2 uppercase tracking-wide text-sm">Transparency</h4>
                                    <p className="text-sm">Every user can inspect, modify, and build upon the core code of Talosopolis. We stand against black boxes and proprietary secrecy.</p>
                                </div>
                                <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded hover:border-amber-500/30 transition-colors group">
                                    <Users className="w-8 h-8 text-amber-600 mb-4 group-hover:text-amber-400 transition-colors" />
                                    <h4 className="font-bold text-stone-200 mb-2 uppercase tracking-wide text-sm">User Contributions</h4>
                                    <p className="text-sm">When you contribute content, it must also be provided under an MIT-Compatible Open Source License. This ensures knowledge becomes a shared, eternal resource.</p>
                                </div>
                                <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded hover:border-amber-500/30 transition-colors group">
                                    <Copyright className="w-8 h-8 text-amber-600 mb-4 group-hover:text-amber-400 transition-colors" />
                                    <h4 className="font-bold text-stone-200 mb-2 uppercase tracking-wide text-sm">Copyright Compliance</h4>
                                    <p className="text-sm">The Bridge of Knowledge cannot be built through theft. You must ensure any uploaded content complies strictly with copyright law or utilizes public domain materials.</p>
                                </div>
                            </div>
                            <p className="text-sm italic text-stone-500">
                                While your course content is openly licensed, you retain the right to manage your own courses, curricula, and content development within the Talosopolis framework. You are the sovereign creator of your corner of the Library.
                            </p>
                        </section>

                        {/* The New Alexandria Structure */}
                        <section className="space-y-8 animate-breathe">
                            <h3 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3 border-b border-amber-900/20 pb-4">
                                <Globe className="w-6 h-6" /> The Structure of Knowledge
                            </h3>
                            <p>
                                Our Library is designed to become the definitive Bridge of Knowledge, synthesizing the best educational practices into a single, cohesive quest:
                            </p>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded-sm">
                                    <h4 className="font-bold text-stone-200 mb-2 text-sm uppercase">Public Domain & OER</h4>
                                    <p className="text-sm">We leverage the vast wealth of public domain data and open educational resources (OER) as our foundation, seeking to go a step further than historical repositories.</p>
                                </div>
                                <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded-sm">
                                    <h4 className="font-bold text-stone-200 mb-2 text-sm uppercase">The Model</h4>
                                    <p className="text-sm">We mirror the scope and quality of services like Coursera, MIT OpenCourseWare, and Khan Academy, but organize the content as a dynamic path on the Hero's Journey.</p>
                                </div>
                                <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded-sm">
                                    <h4 className="font-bold text-stone-200 mb-2 text-sm uppercase">The Format</h4>
                                    <p className="text-sm">The user interface is structured like modern virtual learning environments (Canvas or Blackboard), making the immense, complex architecture navigable.</p>
                                </div>
                            </div>
                        </section>

                        {/* Learning Evolution */}
                        <section className="space-y-8 animate-breathe">
                            <h3 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3 border-b border-amber-900/20 pb-4">
                                <Cpu className="w-6 h-6" /> The Learning Evolution
                            </h3>
                            <div className="space-y-6">
                                <p>The true magic of the Library is its fluid nature, powered by the core AI:</p>

                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="border-l-2 border-amber-500/50 pl-6">
                                        <h4 className="font-bold text-stone-200 mb-2 uppercase tracking-wide">Courses That Evolve</h4>
                                        <p className="text-sm">Your individual courses and resources are designed to evolve with the user. As learners interact with your material, the AI provides feedback that allows you to refine, iterate, and achieve greater clarity.</p>
                                    </div>
                                    <div className="border-l-2 border-amber-500/50 pl-6">
                                        <h4 className="font-bold text-stone-200 mb-2 uppercase tracking-wide">Teaching How You Learn</h4>
                                        <p className="text-sm">Crucially, the Talos AI learns the user's individual learning style, pace, and cognitive strengths. By analyzing performance data, it adapts the delivery method—be it visual, auditory, system-based, or case-study driven.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="text-center space-y-4 pt-12 border-t border-amber-900/30 mt-12 animate-pulse-glow">
                            <p className="text-xl font-bold text-stone-200">
                                The Infinite Ignorance is Our Archive; The Bridge of Knowledge is Our Quest.
                            </p>
                            <p className="text-lg text-amber-500">
                                By joining Talosopolis, you are not just accessing knowledge; you are actively contributing to the eternal, ethical foundation of universal enlightenment.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
