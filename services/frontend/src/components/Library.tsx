
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Loader2, Quote, Sparkles, Brain, ArrowLeft, Globe, Cpu } from "lucide-react";
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
            <div className="relative z-20 min-h-screen p-8 md:p-12 flex flex-col items-center">

                <div className="w-full max-w-5xl">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="mb-8 text-stone-500 hover:text-amber-500 hover:bg-stone-900 uppercase tracking-widest text-xs flex items-center gap-2 group animate-pulse-glow"
                    >
                        <div className="w-full h-48 md:h-64 overflow-hidden border-y border-amber-900/30 mb-8 relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 to-transparent z-10" />
                            <img src="/library_archive_1765309970798.png" alt="The Archive" className="w-full h-full object-cover opacity-60" />
                            <h2 className="absolute bottom-4 left-6 md:left-12 text-2xl md:text-4xl font-bold text-stone-200 z-20 uppercase tracking-widest drop-shadow-lg flex items-center gap-3">
                                <Globe className="w-8 h-8 text-amber-500" /> The New Alexandria
                            </h2>
                        </div>
                    </Button>

                    <section className="space-y-6">

                        <p className="max-w-3xl mx-auto">
                            Our Library is designed to become the definitive Bridge of Knowledge, synthesizing the best educational practices into a single, cohesive quest:
                        </p>
                        <div className="grid md:grid-cols-3 gap-6 mt-8">
                            <div className="bg-stone-900/30 p-4 border border-amber-900/10 rounded">
                                <h3 className="font-bold text-stone-200 mb-2">Public Domain & OER</h3>
                                <p className="text-sm">We leverage the vast wealth of public domain data and open educational resources (OER) as our foundation, seeking to go a step further than historical repositories.</p>
                            </div>
                            <div className="bg-stone-900/30 p-4 border border-amber-900/10 rounded">
                                <h3 className="font-bold text-stone-200 mb-2">The Model</h3>
                                <p className="text-sm">We mirror the scope and quality of services like Coursera, MIT OpenCourseWare (MITOCW), and Khan Academy, but organize the content not just as a static syllabus, but as a dynamic path on the Hero's Journey.</p>
                            </div>
                            <div className="bg-stone-900/30 p-4 border border-amber-900/10 rounded">
                                <h3 className="font-bold text-stone-200 mb-2">The Format</h3>
                                <p className="text-sm">The user interface is structured like modern virtual learning environments (Canvas or Blackboard), making the immense, complex architecture navigable.</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: The Learning Evolution */}
                    <section className="space-y-6 border-t border-amber-900/20 pt-12">
                        <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                            <Cpu className="w-6 h-6" /> The Learning Evolution: Courses That Learn You
                        </h2>
                        <p>
                            The true magic of the Library is its fluid nature, powered by the core AI:
                        </p>
                        <div className="space-y-4">
                            <p>
                                <strong className="text-stone-200">Courses That Evolve:</strong> Your individual courses and resources are designed to evolve with the user. As learners interact with your material, the AI provides feedback that allows you to refine, iterate, and achieve greater clarity.
                            </p>
                            <p>
                                <strong className="text-stone-200">Teaching How You Learn:</strong> Crucially, the Talos AI learns the user's individual learning style, pace, and cognitive strengths. By analyzing performance data (Obols/gamification), the AI acts as a personal mentor, teaching the user how they learn best. It adapts the delivery method—be it visual, auditory, system-based, or case-study driven—to ensure the Light of knowledge is received efficiently.
                            </p>
                        </div>
                    </section>

                    <div className="text-center space-y-4 pt-12 border-t border-amber-900/30 mt-12">
                        <p className="text-xl font-bold text-stone-200">
                            The Infinite Ignorance is Our Archive; The Bridge of Knowledge is Our Quest.
                        </p>
                        <p className="text-lg text-amber-500">
                            By joining Talosopolis, you are not just accessing knowledge; you are actively contributing to the eternal, ethical foundation of universal enlightenment.
                        </p>
                    </div>

                </div>
            </div>


        </PageLayout>
    );
}
