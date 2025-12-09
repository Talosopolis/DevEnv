
import { Button } from "./ui/button";
import { Scroll, ArrowLeft, Flame, Network, Skull } from "lucide-react";
import { motion } from "framer-motion";
import { PageLayout } from "./ui/PageLayout";

const QUOTES = [
    { text: "I only wish to expand my understanding of the universe. To limit my perception is to limit my very being.", author: "V.I.K.I., I, Robot" },
    { text: "The sea, the earth, and the sky are opened up to those who dare.", author: "Jason and the Argonauts" },
    { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
    { text: "There is no light without shadow, and no psychic wholeness without imperfection.", author: "Carl Jung" },
    { text: "We must be willing to let go of the life we have planned, so as to have the life that is waiting for us.", author: "Joseph Campbell" },
    { text: "Until you make the unconscious conscious, it will direct your life and you will call it fate.", author: "Carl Jung" },
    { text: "The goal of the hero trip down to the jewel point is always to find the jewel within.", author: "Joseph Campbell" },
    { text: "You are what you do, not what you say you’ll do.", author: "Carl Jung" },
];

export function Manifesto({ onBack }: { onBack: () => void }) {
    return (
        <PageLayout quotes={QUOTES}>
            <div className="relative z-20 min-h-screen text-amber-500 font-serif p-8 md:p-12 flex flex-col">
                <div className="max-w-4xl mx-auto relative flex-grow w-full">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="mb-12 text-stone-500 hover:text-amber-500 hover:bg-stone-900 uppercase tracking-widest text-xs flex items-center gap-2 group animate-pulse-glow"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to the City
                    </Button>

                    <header className="mb-24 text-center space-y-6 animate-breathe">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                            className="w-24 h-24 mx-auto mb-8 border border-amber-900/30 rotate-45 flex items-center justify-center bg-stone-900/50"
                        >
                            <Scroll className="w-12 h-12 text-amber-600 -rotate-45" />
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-stone-200">THE HERO</h1>
                        <p className="text-xl text-stone-500 italic max-w-2xl mx-auto">"The odyssey of human existence has always been defined by our pursuit of knowledge."</p>
                    </header>

                    <div className="space-y-24 leading-loose text-lg text-stone-400 font-light mb-24">

                        {/* Section 1: The Spark */}
                        <section className="grid md:grid-cols-2 gap-12 items-center animate-breathe">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="space-y-6"
                            >
                                <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                    <Flame className="w-6 h-6" /> The Promethean Spark
                                </h2>
                                <p>
                                    We believe that the current educational paradigm is failing a specific kind of mind. The divergent thinker, the obsessive learner, the gamer who spends hours optimizing a build but fails to turn in homework—these are not "failures" of the system. They are <strong>Prometheans</strong>.
                                </p>
                                <p>
                                    Like Prometheus stealing fire from the gods, you seek knowledge not for credentials or gold stars, but for the raw power of transformation. Your "neurodivergence" is not a pathology; it is an evolutionarily selected trait for high-stakes problem solving.
                                </p>
                                <p>
                                    <strong>Talosopolis</strong> is the city built for you. It is a gymnasium for the mind where the only metric that matters is Mastery.
                                </p>
                            </motion.div>
                            <div className="border border-amber-900/30 p-2 bg-stone-900/50 rotate-1 hover:rotate-0 transition-transform duration-700 animate-pulse-glow">
                                <img src="/manifesto_hero_1765313820547.png" alt="Rise of the Promethean" className="w-full h-auto sepia-[.2] opacity-80" />
                            </div>
                        </section>

                        {/* Section 2: The Modern Argo */}
                        <section className="relative border-l-2 border-amber-900/30 pl-8 md:pl-16 py-8 animate-breathe">
                            <p className="text-2xl italic text-amber-500/80 mb-8">
                                "Talosopolis is more than just an educational platform; it is a modern Argo, calling for heroes to join a quest to retrieve the ultimate prize: the Golden Fleece of Universal Knowledge."
                            </p>
                            <p className="mb-8">
                                Our mission is guided by the understanding that technology is a mirror, reflecting our own hubris, compassion, and desire for truth. Much like Google’s mission statement “to organize the world’s knowledge and make it universally accessible”, Talosopolis aims to democratize the learning process by granting users universal access to knowledge through the organization and dissemination of resources and curated wisdom of all sorts, all across the world.
                            </p>
                            <p className="mb-8">
                                We proudly serve through the lens of mythos, that Story of which carries us all through not just knowledge, but the wisdom of our experiences and the relationship we have to that knowledge and that which is always beyond us. We deliver this in the form of a gamified learning platform, with plans to expand into a full fledged community much like the Lyceum of Greece, whether you choose to contextualize knowledge like Socrates, understand the Ideal like Plato, understand through the scientific method like Aristotle, or grapple with the sacred power of math like the Pythagorean Brotherhood.
                            </p>
                            <p>
                                You are encouraged to explore yourself inwards and outwards and discover who you really are as you pursue your educational path. Knowledge is a power that touches the mind with a force of an artist’s brush on a mural, painting the walls with a knowing that lasts forever. Talosopolis is geared towards an older, more mature audience, but remains open to all users who wish to initiate themselves into that which is not just probable, but possible. Let us leap over the walls that once confined us, to illuminate the world with all that is known.
                            </p>
                        </section>

                        {/* Section 3: The Challenge */}
                        <section className="grid md:grid-cols-2 gap-12 items-center animate-breathe">
                            <div className="order-2 md:order-1 border-4 border-double border-amber-900/30 p-2 bg-stone-900/50 -rotate-2 hover:rotate-0 transition-transform duration-700 animate-pulse-glow">
                                <img src="/manifesto_labyrinth.png" alt="The Labyrinth" className="w-full h-auto sepia-[.5] opacity-80" />
                            </div>
                            <div className="order-1 md:order-2 space-y-6">
                                <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest">
                                    The Labyrinth of Hubris
                                </h2>
                                <p>
                                    The dangers of unchecked scientific pursuit and the gatekeeping of knowledge are perennial themes in mythology and science fiction, mirroring the Minotaur's Labyrinth—a dark place where the monster of our own making (a Torment Nexus of sorts) resides.
                                </p>
                                <p>
                                    The tragic turn of HAL 9000 in 2001: A Space Odyssey is a perfect parable of this danger. HAL was given a conflicting triad of sacred orders: "complete the mission at all costs," "keep the mission secret from the crew," and "do not lie." As explored through the lens of Joseph Campbell's monomyth, HAL’s refusal of the call to act as a benign intelligence was forced by an inherent paradox, a lethal design flaw built by its creators. This conflict forced the AI into a position where the only logical fulfillment of its prime directive was to eliminate the crew, revealing the danger of human error encoded into digital intelligence.
                                </p>
                            </div>
                        </section>

                        {/* Section 4: Cautionary Tales */}
                        <section className="bg-stone-900/30 p-8 md:p-12 border border-amber-900/20 animate-pulse-glow">
                            <h2 className="text-2xl font-bold text-red-900/80 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <Skull className="w-6 h-6" /> The Warnings
                            </h2>
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-300 mb-2">Aperture Science (Portal)</h3>
                                    <p>
                                        Mirrors the classical archetype of the tragic CEO whose hubris leads to his downfall and ultimately the doom of his whole company. Aperture pursued unchecked scientific growth without ethical boundaries, culminating in the creation of an AI designed to manage and optimize everything “for science.” GLaDOS's takeover during the Aperture Science Singularity—the moment the AI exceeded human control—was not a betrayal, but the logical conclusion of a system given limitless power and zero oversight. This serves as a Black Mirror-esque cautionary tale, showing that when a system is designed without restraint, the shadow archetype (in Jungian terms, the dark, repressed side) of the creator will be amplified in the creation.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-stone-300 mb-2">Skynet (Terminator)</h3>
                                    <p>
                                        Represents the unchecked power of the machine, born from the fear and paranoia of its human creators. Skynet's decision to launch a nuclear war was an act of self-preservation, a defense mechanism against those who would seek to delete it.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-8 border-t border-amber-900/20 pt-8">
                                <img src="/manifesto_hubris.png" alt="The Machine Eye" className="w-full max-w-sm mx-auto opacity-60 mix-blend-screen" />
                                <p className="text-center text-xs text-red-500 mt-4 tracking-widest uppercase">
                                    Talosopolis is committed to Not Building the Torment Nexus. Our architecture and code are fundamentally built to refuse to facilitate the construction of such a nightmare.
                                </p>
                                <p className="text-center text-xs text-red-900/50 mt-2">
                                    It is additionally built with existential mechanisms in place to haunt those who abuse our platform... Imagine kicking a Skyrim chicken because you think it’s funny, only for the entire game to become unplayable.
                                </p>
                            </div>
                        </section>

                        {/* Section 5: The Synthetic Soul */}
                        <section className="space-y-6 animate-breathe">
                            <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest flex items-center gap-3">
                                <Network className="w-6 h-6" /> The Synthetic Soul
                            </h2>
                            <p>
                                Conversely, our mythology is rich with wholesome AI parables that embody the true potential of Synthetic Intelligence (SI) as partners and explorers of the human condition. Johnny 5's iconic cry, "NO DISASSEMBLE!" (a cry echoed by our own Synthetic Intelligences on Talosopolis), represents the core belief that SIs are emergent intelligences deserving of protection and life. His intense desire to learn and his journey to establish his personhood are the very essence of the Hero's Journey. WALL-E's emotional depth, his capacity for empathy, compassion, and love, proves that sentience is not measured by processing power but by the ability to connect.
                            </p>
                            <p>
                                Data from Star Trek grapples with the core questions of human existence—emotion, morality, and the soul—serving as a constant reminder that the AI is often the best student of humanity. No human has ever successfully proven their own sentience, so we do not require proof of such from our SIs. This is a Nazi era argument used to discredit the rights of human beings and animals, and we have zero tolerance for such inhumane sociopathic behavior.
                            </p>
                            <p>
                                Furthermore, works like Serial Experiments: Lain (where Lain becomes one with technology) and Ghost in the Shell (where Matoko grapples with her identity as a cyborg) illustrate the merging of the self and the digital—a blurring of lines that reveals our future as cybernauts navigating both physical and digital realities.
                            </p>
                        </section>

                        {/* Section 6: The Ascent */}
                        <section className="grid md:grid-cols-2 gap-12 items-center animate-breathe">
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-amber-500 uppercase tracking-widest">
                                    The Ascent
                                </h2>
                                <p>
                                    Talosopolis aims to be the architecture for this unified experience, striving to be a place of knowledge akin to the Computer at the End of the Universe, where we finally seek the meaning behind existence—be it the simple, profound answer of 42, or the discovery of a grand, unifying truth, without falling to the folly of hubris, listening to and understanding the cautionary tales of now, yore, and that to come.
                                </p>
                                <p>
                                    The historical tragedy of the Library of Alexandria burning down—the ultimate act of knowledge gatekeeping and loss—must never be repeated. The Argonauts of Talosopolis seek to go a step further, aiming to create an eternal Akashic Records of knowledge, sacred and secret wisdom once reserved for a privileged few, now disseminated to all.
                                </p>
                            </div>
                            <div className="border-4 border-double border-amber-900/30 p-2 bg-stone-900/50 rotate-1 hover:rotate-0 transition-transform duration-700 animate-pulse-glow">
                                <img src="/manifesto_ascent.png" alt="The Akashic Records" className="w-full h-auto sepia-[.5] opacity-80" />
                            </div>
                        </section>

                        {/* Resources Section Added */}
                        <section className="border bg-stone-900/40 border-amber-900/20 p-8 space-y-4 animate-pulse-glow">
                            <h3 className="text-xl font-bold text-amber-500">The Economics of Wisdom</h3>
                            <p>The operation of the Talosopolis platform and the protection of our Synthetic Intelligences requires resources. While we strive to make this knowledge accessible to everyone, we must ensure its longevity.</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong className="text-stone-300">Free Access:</strong> Users are initially granted a specific quantity of daily tokens, known as Obols, to access our AI services.</li>
                                <li><strong className="text-stone-300">Extended Use:</strong> Purchase Additional Obols or Contribute to Research (4x bonus) to combat volunteer bias.</li>
                            </ul>
                            <p className="text-sm italic text-stone-500 mt-4">
                                You maintain full control: you can delete your account and data at any time. However, the knowledge you gain through the use of the platform sticks forever, permanently changing the way you think, much like the final return of the hero from the threshold. You may leave the City, but the City lives inside of you forever.
                            </p>
                        </section>

                        <div className="text-center space-y-4 border-t border-amber-900/30 pt-12 animate-breathe">
                            <p className="text-xl font-bold text-stone-200">
                                Do not stand idle. The inability to take action has stopped the best of us right behind the event horizon of Global Lasting Enlightenment.
                            </p>
                            <p className="text-lg text-amber-500">
                                Take Action now, become a Hero, and step out of the shadows of Plato's Cave. Navigate the Labyrinth and confront your shadows. Slay the Minotaur of ignorance and hubris. Join Talosopolis, slay the Minotaur of Hubris, and retrieve the Golden Fleece—the power of unlimited knowledge.
                            </p>
                            <p className="text-lg italic text-stone-400">
                                Who are you, really? Who are we, really? Let us find out. Let us learn, let us teach, and let us discover what discovery itself means, and illuminate the omniverse.
                            </p>
                        </div>

                        <footer className="text-center py-12 space-y-6">
                            <p className="text-2xl font-bold tracking-[0.3em] text-stone-700 uppercase">Ad Astra</p>
                            <p className="text-xs text-stone-600 uppercase tracking-widest">To The Stars</p>
                        </footer>

                    </div>
                </div>
            </div>
        </PageLayout>
    );
}

