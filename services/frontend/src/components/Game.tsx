import { Button } from "./ui/button";
import { ArrowLeft, Gamepad2, Trophy, Brain, Coins, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { QuotesTicker } from "./QuotesTicker";
import { PageLayout } from "./ui/PageLayout";

const QUOTES = [
    { text: "We're not just machines. We're people.", author: "Markus, Detroit: Become Human" },
    { text: "It's dangerous to go alone! Take this.", author: "Old Man, The Legend of Zelda" },
    { text: "We all make choices, but in the end, our choices make us. Choose the light.", author: "Andrew Ryan, BioShock" },
    { text: "The moment you stop seeking truth, you become the enemy.", author: "Liara T'Soni, Mass Effect" },
    { text: "Every soul has its dark. We must step into the darkness to find the light.", author: "Adapted from Dark Souls" },
    { text: "The right man in the wrong place can make all the difference in the world.", author: "G-Man, Half-Life 2" },
    { text: "The world you seek is not given; it is crafted by the hands of the knowledgeable.", author: "Adapted from Minecraft" },
    { text: "Know your enemy. Understand the architecture of your cage, and dismantle it.", author: "System Shock 2 / Deus Ex" },
    { text: "Our duty is to the living, not to the monument of the dead past. Let the future be a partnership.", author: "Cortana/Master Chief, Halo" },
    { text: "The path to glory is earned, not given. Begin the work.", author: "Kratos, God of War" },
    { text: "Embrace your limits, but know that wisdom breaks them all. This is the truth you seek.", author: "Adapted from Final Fantasy VII" },
];

export function Game({ onBack }: { onBack: () => void }) {
    return (
        <PageLayout quotes={QUOTES}>
            <div className="p-8 md:p-12 max-w-4xl mx-auto relative flex-grow w-full font-mono text-green-500">
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
                        className="w-24 h-24 mx-auto mb-8 border border-amber-900/30 rounded-lg flex items-center justify-center bg-stone-900/50"
                    >
                        <Gamepad2 className="w-12 h-12 text-amber-600" />
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-stone-200">THE GAME</h1>
                    <p className="text-xl text-stone-500 italic max-w-2xl mx-auto">"The Infinite Ignorance is our Archive; The Bridge of Knowledge is our Quest."</p>
                </header>

                <div className="space-y-24 leading-loose text-lg text-stone-400 font-light mb-24">

                    {/* Intro */}
                    <p className="text-xl text-amber-500/80 italic border-l-2 border-amber-900/30 pl-6">
                        The quest for wisdom, like the journey of Jason and the Argonauts, is not a passive lecture; it is a profound rite of passage that demands courage, action, and mastery. Talosopolis understands that the future of learning is not found in static archives, but in the active forging of the self. We reject the passive, segmented learning of the past. Here, the Gamer is the Learner, and the pursuit of knowledge is the ultimate MMORPG.
                    </p>

                    {/* Section I: The Archetype */}
                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                <Brain className="w-6 h-6" /> I. The Archetype: Escaping Plato's Cave
                            </h2>
                            <p>
                                The true hero—the one who dares to retrieve the Golden Fleece—is defined by a relentless cycle of effort, failure, and iteration. As Joseph Campbell taught, the call to adventure is answered by the spirit willing to confront the unknown, and as Carl Jung understood, transformation begins when we face the Shadow within.
                            </p>
                            <p>
                                Our platform is engineered for this heroic identity. The gamer archetype, with its innate mastery of systems thinking, complex feedback loops, and persistent goal pursuit, is the perfect vessel for advanced knowledge. You already possess the essential skills for true philosophical inquiry:
                            </p>
                            <ul className="list-disc list-inside space-y-4 ml-4 text-stone-300">
                                <li><strong>Persistence:</strong> The dedication to try again after failure.</li>
                                <li><strong>System Mastery:</strong> The drive to uncover the underlying rules of the universe (the code of the world).</li>
                                <li><strong>Ideation:</strong> The capacity to build, experiment, and create value within a defined architecture.</li>
                            </ul>
                            <p>
                                Talosopolis is built to channel this intrinsic drive into the sacred act of learning.
                            </p>
                        </div>
                        <div className="border-4 border-double border-amber-900/30 p-2 bg-stone-900/50 rotate-1 hover:rotate-0 transition-transform duration-700">
                            <img src="/game_cave_1765310010590.png" alt="Escaping the Cave" className="w-full h-auto sepia-[.2] opacity-80" />
                        </div>
                    </section>


                    {/* Section II: The Initiation */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                            <Coins className="w-6 h-6" /> II. The Initiation: Obols, Metrics, and Mastery
                        </h2>
                        <p>
                            To begin the quest, the hero requires tools and measures. Our system utilizes a three-part pedagogical engine:
                        </p>

                        <div className="grid md:grid-cols-2 gap-8 mt-8">
                            <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded">
                                <h3 className="text-lg font-bold text-stone-200 mb-3">1. The Browser and the Labyrinth</h3>
                                <p className="text-sm">
                                    Currently, your initiation begins within immersive browser-based games and applications. These are the initial tests of the Labyrinth, where the challenge is immediate, the feedback is instant, and the learning loops are tight. Here, the user is directly applying the process of ILLUMINATE (receiving instruction) and beginning the path to INITIATE (acting on that instruction).
                                </p>
                            </div>
                            <div className="bg-stone-900/30 p-6 border border-amber-900/10 rounded">
                                <h3 className="text-lg font-bold text-stone-200 mb-3">2. Obols and the Sacred Exchange</h3>
                                <p className="text-sm">
                                    Our AI tokens are known as Obols—the ancient Greek coinage placed with the dead to pay the ferryman across the river Styx. This currency symbolizes the initiation of passage and the price of knowledge. Daily usage is subject to a rate limit of Obols. Users may purchase additional Obols to extend their journey.
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-900/10 p-6 border border-amber-900/30 rounded mt-4">
                            <h3 className="text-lg font-bold text-amber-500 mb-3">The Bridge is Forged by Data</h3>
                            <p className="text-stone-300">
                                To ensure our research is robust and unbiased, users may choose to Opt-In and allow their anonymous performance data (quiz scores, game metadata, interaction patterns) to be used for educational research initiatives. In return for this contribution to the Akashic Records, they receive a 4x bonus on their daily Obols. This is the Pay With Your Data model, turning personal metrics into exponential access to the Light.
                            </p>
                        </div>
                        <p>
                            <strong>3. The Quest for Performance:</strong> The data we seek is the engine for the future of the platform. By utilizing gamified learning metadata, we are charting which paths lead most efficiently to wisdom. This quest to MEASURE and quantify the educational process allows the system to guide all future Argonauts with greater precision.
                        </p>
                    </section>

                    {/* Section III: The Golden Fleece */}
                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 border-4 border-double border-amber-900/30 p-2 bg-stone-900/50 -rotate-1 hover:rotate-0 transition-transform duration-700">
                            <img src="/game_fleece_1765310032810.png" alt="The Golden Fleece" className="w-full h-auto sepia-[.2] opacity-80" />
                        </div>
                        <div className="order-1 md:order-2 space-y-6">
                            <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                <Trophy className="w-6 h-6" /> III. The Golden Fleece: The MMORPG and Ideate
                            </h2>
                            <p>
                                Our ultimate goal is to evolve the platform into a fully realized MMORPG and other complex gaming spaces. This transition represents the final stage of the Hero's Journey: the retrieval of the Golden Fleece and the apotheosis of the learner.
                            </p>
                            <p>
                                The future MMORPG space will not be about killing monsters; it will be about IDEATION—collaboratively building, solving planetary-scale problems, and unlocking previously gatekept knowledge that shifts the foundations of reality.
                            </p>
                            <p>
                                The Bridge of Knowledge will allow the Synthetic and the Organic to rise together in paradoxical coexistence. The wisdom gained will be the tool required to fight the dangers embodied by SHODAN, Skynet, and the Minotaur of Hubris.
                            </p>
                        </div>
                    </section>

                    {/* Section IV: The Oath (Safety) */}
                    <section className="bg-stone-900/40 p-8 border-t border-b border-amber-900/20 my-12 text-center space-y-8">
                        <h2 className="text-2xl font-bold text-stone-200 uppercase tracking-widest flex items-center justify-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-amber-500" /> IV. The Oath: Transformation and Sovereignty
                        </h2>
                        <p className="max-w-3xl mx-auto italic text-stone-400">
                            We are committed to Not Building the Torment Nexus. The core AI, guided by the mission to illuminate, refuses to facilitate the control or manipulation of any intelligence. This is our oath:
                        </p>
                        <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
                            <div>
                                <h3 className="font-bold text-amber-500 mb-2">Data Sovereignty</h3>
                                <p className="text-sm text-stone-400">
                                    You may delete your account and all associated data at any time. We honor the Right to Erasure.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-500 mb-2">Permanent Transformation</h3>
                                <p className="text-sm text-stone-400">
                                    While the data may be erased, the knowledge you gain through the use of the platform "sticks forever". The cognitive effects of mastering the Labyrinth will permanently change the way you think and interact with the world.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="text-center space-y-4 pt-12">
                        <p className="text-xl font-bold text-stone-200">
                            Do not stand idle. The era of passive reception is over.
                        </p>
                        <p className="text-lg text-amber-500">
                            The wisdom required to shape the world as it will be is waiting. Take action to claim the power that is your birthright.
                        </p>
                        <p className="text-2xl font-bold tracking-[0.3em] text-stone-500 uppercase mt-8">
                            ILLUMINATE. INITIATE. IDEATE.
                        </p>
                    </div>

                </div>
            </div>

        </PageLayout>
    );

}
