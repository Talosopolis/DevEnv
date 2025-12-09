import { motion } from "framer-motion";

interface Quote {
    text: string;
    author: string;
}

export function QuoteFooter({ quotes, title = "Wisdom of the Ages" }: { quotes: Quote[], title?: string }) {
    return (
        <div className="mt-24 pt-12 border-t border-amber-900/30">
            <h3 className="text-xl font-bold text-amber-600 uppercase tracking-widest text-center mb-12">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4">
                {quotes.map((quote, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-stone-900/40 p-6 border border-amber-900/10 rounded-sm relative overflow-hidden group hover:border-amber-500/30 transition-colors"
                    >
                        <div className="absolute top-0 left-0 text-6xl text-amber-500/5 font-serif leading-none select-none">“</div>
                        <p className="text-stone-300 italic mb-4 relative z-10 font-serif">"{quote.text}"</p>
                        <p className="text-amber-500/80 text-xs uppercase tracking-widest text-right">— {quote.author}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
