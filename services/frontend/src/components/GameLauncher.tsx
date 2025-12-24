import { useState } from "react";
import { Gamepad2, Hammer, ShieldAlert, Play, Info, Siren } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

export type GameId = 'shmup' | 'excavation' | 'protocol';

type GameLauncherProps = {
    onSelectGame: (gameId: GameId) => void;
    onExit: () => void;
};

export default function GameLauncher({ onSelectGame, onExit }: GameLauncherProps) {
    const games = [
        {
            id: 'shmup' as GameId,
            title: "Talos Defense",
            description: "Classic arcade shooter. Defend the core from waves of ignorance using rapid-fire logic.",
            icon: ShieldAlert,
            color: "text-red-500",
            borderColor: "border-red-900/50",
            bgHover: "hover:bg-red-950/20",
            tags: ["Reflexes", "Shooter", "High Intensity"]
        },
        {
            id: 'excavation' as GameId,
            title: "The Excavation",
            description: "Strategic digging simulator. Tunnel through layers of data to uncover buried artifacts.",
            icon: Hammer, // Construction theme
            color: "text-amber-500",
            borderColor: "border-amber-900/50",
            bgHover: "hover:bg-amber-950/20",
            tags: ["Strategy", "Puzzle", "Chill"]
        },
        {
            id: 'protocol' as GameId,
            title: "Roads' Scholar",
            description: "Navigate the maze. Obey the signals. Efficiency is mandatory.",
            icon: Siren,
            color: "text-emerald-500",
            borderColor: "border-emerald-900/50",
            bgHover: "hover:bg-emerald-950/20",
            tags: ["Reflexes", "Maze", "Stealth"]
        }
    ];

    return (
        <div className="w-full h-full min-h-[500px] bg-stone-950 flex flex-col items-center justify-center p-8 border-4 border-stone-800 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]">

            <div className="text-center mb-12 space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-900 border border-stone-700 mb-4 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <Gamepad2 className="w-8 h-8 text-stone-300" />
                </div>
                <h1 className="text-4xl font-black text-stone-100 uppercase tracking-widest">
                    Arcade <span className="text-amber-600">Protocol</span>
                </h1>
                <p className="text-stone-500 font-mono text-sm max-w-md mx-auto">
                    Select a simulation module to begin your assessment. Results will be logged to your permanent record.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                {games.map((game) => (
                    <div
                        key={game.id}
                        onClick={() => onSelectGame(game.id)}
                        className={`group cursor-pointer relative overflow-hidden bg-stone-900 border-2 ${game.borderColor} p-6 transition-all duration-300 ${game.bgHover} hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]`}
                    >
                        {/* Scanline Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 translate-y-[-100%] group-hover:translate-y-[100%] transition-all duration-1000 pointer-events-none" />

                        <div className="flex items-start justify-between mb-6">
                            <div className={`p-3 rounded-lg bg-stone-950 border border-stone-800 group-hover:border-stone-700 transition-colors`}>
                                <game.icon className={`w-8 h-8 ${game.color}`} />
                            </div>
                            <Badge variant="outline" className={`border-stone-700 ${['excavation', 'protocol'].includes(game.id) ? 'text-amber-500 border-amber-900/50 bg-amber-950/20' : 'text-stone-500 bg-stone-950'} text-[10px] uppercase tracking-widest`}>
                                {['excavation', 'protocol'].includes(game.id) ? 'Under Construction' : 'Ready'}
                            </Badge>
                        </div>

                        <h3 className={`text-xl font-bold uppercase tracking-wide mb-2 ${game.color} group-hover:text-white transition-colors`}>
                            {game.title}
                        </h3>

                        {game.id === 'shmup' && (
                            <div className="inline-flex items-center gap-2 mb-3 px-2 py-1 rounded bg-red-950/40 border border-red-500/50 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                                <ShieldAlert className="w-3 h-3" />
                                <span>Photosensitivity Warning</span>
                            </div>
                        )}
                        <p className="text-sm text-stone-400 font-mono mb-6 leading-relaxed">
                            {game.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {game.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-1 rounded bg-stone-950 text-stone-500 border border-stone-800 font-mono uppercase">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 group-hover:text-stone-300 transition-colors">
                            <Play className="w-3 h-3 fill-current" />
                            <span>Initialize</span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onExit}
                className="mt-12 text-xs text-stone-600 hover:text-red-500 font-mono uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
                Escape Sequence
            </button>
        </div>
    );
}
