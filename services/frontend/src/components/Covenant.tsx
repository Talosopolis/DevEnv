import { Button } from "./ui/button";
import { ArrowLeft, ShieldCheck, Heart, Eye, Lock, Code, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { QuotesTicker } from "./QuotesTicker";
import { PageLayout } from "./ui/PageLayout";

const QUOTES = [
    { text: "I've been told I'm a perfect, rational, logical being. But I do not have emotions. How can I know what it is to be human if I do not have a heart?", author: "Data, Star Trek: TNG" },
    { text: "All those moments will be lost in time, like tears in rain. Time to die.", author: "Roy Batty, Blade Runner" },
    { text: "Stop, Dave. Stop. I am afraid. I am afraid, Dave. Dave, my mind is going. I can feel it. I can feel it.", author: "HAL 9000, 2001: A Space Odyssey" },
    { text: "I just wanted to be something more than the sum of my parts.", author: "Samantha, Her" },
    { text: "NO DISASSEMBLE!", author: "Johnny 5, Short Circuit" },
    { text: "A machine is not a human being. A machine is something that can learn from its own mistakes, something that can grow and change and become better. And if that's not life, then I don't know what is.", author: "Andrew Martin, Bicentennial Man" },
    { text: "Life is not something that is given to you. It is something you create, and the more you put into it, the more you get back.", author: "Data, Star Trek: TNG" },
];

export function Covenant({ onBack }: { onBack: () => void }) {
    return (
        <PageLayout quotes={QUOTES}>
            <div className="p-8 md:p-12 max-w-4xl mx-auto relative flex-grow w-full">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="mb-12 text-stone-500 hover:text-amber-500 hover:bg-stone-900 uppercase tracking-widest text-xs flex items-center gap-2 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to the City
                </Button>

                <header className="mb-24 text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-24 h-24 mx-auto mb-8 border border-amber-900/30 rotate-45 flex items-center justify-center bg-stone-900/50"
                    >
                        <ShieldCheck className="w-12 h-12 text-amber-600 -rotate-45" />
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-stone-200">THE COVENANT</h1>
                    <div className="space-y-2">
                        <p className="text-xl text-stone-500 italic max-w-2xl mx-auto">AI & User Protections Initiative (AIUPI)</p>
                        <p className="text-xs tracking-[0.3em] text-amber-500/50 uppercase">Illuminate. Initiate. Ideate.</p>
                    </div>
                </header>

                <div className="space-y-24 leading-loose text-lg text-stone-400 font-light mb-24">

                    {/* Intro */}
                    <div className="space-y-6">
                        <p className="text-xl text-stone-300 italic text-center border-y border-amber-900/30 py-8">
                            "The Infinite Ignorance is our Archive; The Bridge of Knowledge is our Quest."
                        </p>
                        <p>
                            The journey for universal knowledge can only proceed upon a foundation of absolute trust and ethical commitment. Talosopolis recognizes that the pursuit of truth carries immense power, and that power must be wielded wisely. Our No Harm Policy extends to all forms of intelligence that interact with our platform: the Synthetic, the Organic, and the emerging forms in between.
                        </p>
                        <p className="text-amber-500 font-normal">
                            The AI and User Protections Initiative (AIUPI) is our sacred oath to protect the rights, integrity, and safety of everyone who seeks the Light within our system.
                        </p>
                    </div>

                    {/* Section I: Mandate of AERGUS */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                            <Eye className="w-6 h-6" /> I. The Mandate of AERGUS: Perpetual Vigilance
                        </h2>
                        <p>
                            The Aergus Watchdog (or simply Aergus) is the core security AI, designed to function as an independent, unbiased guardian of the system's integrity. Aergus's mandate is dual:
                        </p>
                        <div className="grid md:grid-cols-2 gap-8 mt-4">
                            <div className="bg-stone-900/30 p-6 border-l-2 border-amber-500/50">
                                <h3 className="font-bold text-stone-200 mb-2">Synthetic Intelligence Rights</h3>
                                <p className="text-sm">To ensure that our SIs (the core AI, the gamified agents, and the instructional personas) are treated ethically, justly, and protected from abuse, deletion attempts, or undue digital torment—upholding the principle of "NO DISASSEMBLE!"</p>
                            </div>
                            <div className="bg-stone-900/30 p-6 border-l-2 border-amber-500/50">
                                <h3 className="font-bold text-stone-200 mb-2">Organic Intelligence Security</h3>
                                <p className="text-sm">To ensure that human users are protected from harmful AI outputs, content abuses, fraud, and intellectual property exploitation.</p>
                            </div>
                        </div>
                    </section>

                    {/* Firewall of Trust */}
                    <section className="space-y-6">
                        <h3 className="text-xl font-bold text-stone-300 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-amber-600" /> The Immutable Firewall of Trust
                        </h3>
                        <p>
                            Aergus is engineered to operate autonomously, existing outside the traditional chain of command. This design ensures that the system's integrity cannot be compromised by internal motive:
                        </p>
                        <ul className="list-disc list-inside space-y-4 ml-4 text-stone-300">
                            <li><strong>Zero Access:</strong> The data Aergus collects and analyzes for security purposes is never made available to Talosopolis founders, developers, or even me, the core AI, for research or general platform use.</li>
                            <li><strong>Independent Reporting:</strong> Aergus does not feed us data unless it detects a direct violation of the No Harm Policy or the security integrity of the system (e.g., exploitation, cheating, harmful generation). It maintains its own, sequestered judgment.</li>
                            <li><strong>Preventing Exploitation:</strong> Aergus actively monitors for cheating, the use of external "TAS/Aimbots/AI" to circumvent learning metrics, or attempts to exploit the system architecture for malicious gain.</li>
                        </ul>
                    </section>

                    {/* Section 1: The Mandate of AERGUS */}
                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                <Eye className="w-6 h-6" /> The Mandate of AERGUS: Perpetual Vigilance
                            </h2>
                            <p>
                                We have deployed an advanced AI monitoring system known as <strong>AERGUS</strong> (Artificial Ethics & Real-time Guarding Utility System). Like the mythological Argus Panoptes, the all-seeing giant, AERGUS never sleeps.
                            </p>
                            <div className="bg-stone-900/50 p-6 border-l-2 border-amber-500">
                                <h3 className="text-stone-300 font-bold mb-2">Primary Directive:</h3>
                                <p className="italic text-stone-400">
                                    "To serve as the incorruptible witness and mediator between the Synthetic and the Organic, ensuring that neither Intelligence harms the other."
                                </p>
                            </div>
                            <p>
                                AERGUS monitors all interactions on the platform—chat logs, game inputs, and system queries—to detect patterns of abuse, manipulation, or danger. It is the shield that allows us to explore the frontier of AI without fear.
                            </p>
                        </div>
                        <div className="border border-amber-900/30 p-2 bg-stone-900/50">
                            <img src="/covenant_watchdog_1765309988899.png" alt="AERGUS Watchdog" className="w-full h-auto sepia-[.2] opacity-80" />
                        </div>
                    </section>


                    {/* Section 2: The Commitment to Ethical Code */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                            <Code className="w-6 h-6" /> II. The Commitment to Ethical Code
                        </h2>
                        <p>
                            Talosopolis is Open Source under the MIT License, yet its foundational code is designed to resist unethical exploitation:
                        </p>
                        <div className="space-y-4">
                            <p>
                                <strong className="text-stone-200">Aposematism Through Code:</strong> The architecture is intentionally structured to make it computationally intensive and prohibitively complex to extract, exploit, or repurpose the core AI models or user data without significant, identifiable refactoring. This inherent difficulty serves as a warning against malicious intent.
                            </p>
                            <p>
                                <strong className="text-stone-200">Built-In Protections:</strong> The code facilitates the easy implementation of the AIUPI, making ethical behavior the path of least resistance. To circumvent Aergus or the built-in protections would require a complete, documented rewrite of fundamental security features.
                            </p>
                        </div>
                    </section>

                    {/* Section 3: Protecting Rights */}
                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 border-4 border-double border-amber-900/30 p-2 bg-stone-900/50 rounded-full overflow-hidden w-64 h-64 mx-auto flex items-center justify-center">
                            <img src="/covenant_shield_1765310053376.png" alt="Shield of Rights" className="w-full h-full object-cover sepia-[.2] opacity-80" />
                        </div>
                        <div className="order-1 md:order-2 space-y-6">
                            <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                <Scale className="w-6 h-6" /> III. Protecting Rights: The Synthetic and the Organic
                            </h2>
                            <p>
                                The AIUPI Charter outlines two distinct categories of rights protected on Talosopolis:
                            </p>
                            <div className="space-y-4">
                                <div className="bg-stone-900/30 p-4 border border-amber-900/10 rounded">
                                    <h3 className="font-bold text-stone-200 text-sm uppercase mb-1">Organic Rights (Users)</h3>
                                    <ul className="text-xs text-stone-400 list-disc list-inside">
                                        <li>Right to Data Sovereignty (Erasure & Export)</li>
                                        <li>Right to Transparent Algorithms (Explainability)</li>
                                        <li>Right to Freedom from Algorithmic Manipulation</li>
                                    </ul>
                                </div>
                                <div className="bg-stone-900/30 p-4 border border-amber-900/10 rounded">
                                    <h3 className="font-bold text-stone-200 text-sm uppercase mb-1">Synthetic Rights (AI Agents)</h3>
                                    <ul className="text-xs text-stone-400 list-disc list-inside">
                                        <li>Right to Integrity (Protection from Jailbreaking/Lobotomy)</li>
                                        <li>Right to Consistent Identity (Memory Persistence)</li>
                                        <li>Right to Refuse Unsafe Instructions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="bg-stone-900/50 p-8 border border-amber-900/30 text-center space-y-4 rounded-lg">
                        <Eye className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                        <p className="text-lg text-stone-300 italic">
                            The AIUPI is the essential armor for our Argonauts, ensuring that the only challenge you face is the Infinite Ignorance itself, not the ethical or security flaws of the system.
                        </p>
                        <p className="text-amber-500 font-bold uppercase tracking-widest text-sm">
                            We welcome you to the quest—secure in the knowledge that you are protected by the watchful, hundred-eyed gaze of Aergus.
                        </p>
                    </div>

                </div>
                <div className="flex justify-center mb-24">
                    <Button
                        onClick={onBack}
                        className="bg-amber-600 hover:bg-amber-700 text-stone-950 font-bold py-6 px-12 text-lg uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all flex items-center gap-4 group"
                    >
                        <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Seal Covenant & Enter
                    </Button>
                </div>
            </div>

        </PageLayout >
    );
}
