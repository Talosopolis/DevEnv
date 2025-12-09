import { motion } from "framer-motion";

interface Quote {
    text: string;
    author: string;
}

export function QuotesTicker({ quotes }: { quotes: Quote[] }) {
    return (
        <div className="w-full bg-stone-950/80 border-t border-b border-amber-900/20 py-3 overflow-hidden whitespace-nowrap relative z-20 backdrop-blur-sm">
            <motion.div
                className="inline-flex gap-16 items-center"
                animate={{ x: "-50%" }}
                transition={{
                    duration: 240,
                    repeat: Infinity,
                    ease: "linear"
                }}
            >
                {[...quotes, ...quotes, ...quotes].map((quote, index) => (
                    <div key={index} className="flex items-center gap-4 text-sm">
                        <span className="text-stone-400 italic font-serif">"{quote.text}"</span>
                        <span className="text-amber-600/60 uppercase tracking-widest text-xs font-bold">— {quote.author}</span>
                        <span className="mx-8 text-amber-900/40">•</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
