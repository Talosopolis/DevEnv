import React, { ReactNode } from 'react';
import { LivingBackground } from './LivingBackground';
import { QuotesTicker } from '../QuotesTicker';

interface PageLayoutProps {
    children: React.ReactNode;
    className?: string;
    quotes?: { text: string; author: string }[];
    faint?: boolean;
    showTicker?: boolean;
    backgroundOriginY?: number;
    backgroundOriginX?: number;
    backgroundRef?: React.MutableRefObject<{ x: number, y: number } | null>;
}

export function PageLayout({ children, faint = false, quotes = [], showTicker = true, backgroundOriginY, backgroundOriginX, backgroundRef }: PageLayoutProps) {
    return (
        <div className="relative min-h-screen font-sans text-stone-200 selection:bg-amber-900/30 selection:text-amber-100 overflow-x-hidden">
            {/* 1. Background Layer */}
            <LivingBackground faint={faint} originY={backgroundOriginY} originX={backgroundOriginX} backgroundRef={backgroundRef} />

            {/* 2. Content Layer */}
            <div className="relative z-10 flex flex-col min-h-screen">

                {/* Top Ticker */}
                {showTicker && (
                    <div className="w-full border-b border-amber-900/60 bg-stone-950/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-amber-900/10">
                        <QuotesTicker quotes={quotes} />
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-grow flex flex-col relative z-10">
                    {children}
                </main>

                {/* Footer */}
                <footer className="relative z-10 w-full py-8 text-center border-t border-amber-900/60 bg-stone-950/80 backdrop-blur-sm mt-auto">
                    <div className="text-amber-500/40 font-bold text-2xl tracking-[0.5em] animate-pulse">
                        TALOSOPOLIS
                    </div>
                    <p className="text-[10px] text-stone-600 uppercase tracking-widest mt-2 max-w-2xl mx-auto px-4">
                        NOTICE: The consumption of knowledge results in unintended enlightenment, existential dread, or the spontaneous manifestation of tentacles. Talosopolis is not responsible for any paradoxes created within your local timeline. Please keep your hands and feet inside the vehicle at all times. Do not feed the SI's.
                    </p>
                </footer>
            </div>
        </div>
    );
}
