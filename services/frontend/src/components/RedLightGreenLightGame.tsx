import React, { useRef, useEffect, useState } from 'react';
import { Button } from "./ui/button";
import { Siren, Skull, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { calculateOptimalTSP, calculateLeptaScore } from './ScoringUtils';
import { generateMathQuestion, MathDifficulty } from '../utils/MathGen';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- Types ---
interface RedLightGreenLightGameProps {
    courseId: string;
    topic: string;
    contextContent?: string;
    contextNotes?: string[]; // Added for AI Context
    question?: string;
    options?: string[];
    correctOptionIndex?: number;
    onPass: (score: number) => void;
    onFail: () => void;
    onExit: () => void;
}

type CellType = 'WALL' | 'PATH' | 'START' | 'END' | 'ITEM';
type FragmentType = 'A' | 'B' | 'C' | 'D';
type Difficulty = 'STANDARD' | 'ADVANCED' | 'EXPERT' | 'ELITE';

// Hazards
interface Hazard {
    id: string;
    type: 'POLICE' | 'SPIKE' | 'LASER' | 'HUNTER';
    x: number;
    y: number;
    active: boolean;
    offset: number;
    dir?: { x: number; y: number };
    state?: 'IDLE' | 'PURSUIT' | 'STUNNED' | 'RESTING';
    stunStart?: number;
    movesCount?: number;
    startX?: number;
    startY?: number;
    facing?: number;
    interval?: number;
    length?: number;
}

const TILE_SIZE = 32;
const GRID_WIDTH = 23;
const GRID_HEIGHT = 17;

// --- Maze Generation ---
const generateMaze = (width: number, height: number): { grid: CellType[][], start: [number, number], end: [number, number], itemMap: Record<string, FragmentType> } => {
    const grid: CellType[][] = Array(height).fill(null).map(() => Array(width).fill('WALL'));
    const itemMap: Record<string, FragmentType> = {};

    const stack: [number, number][] = [[1, 1]];
    grid[1][1] = 'PATH';
    grid[1][2] = 'PATH';

    const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]];

    while (stack.length > 0) {
        const [cx, cy] = stack[stack.length - 1];
        const neighbors: [number, number][] = [];

        directions.forEach(([dx, dy]) => {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 'WALL') {
                neighbors.push([nx, ny]);
            }
        });

        if (neighbors.length > 0) {
            const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
            grid[(cy + ny) / 2][(cx + nx) / 2] = 'PATH';
            grid[ny][nx] = 'PATH';
            stack.push([nx, ny]);
        } else {
            stack.pop();
        }
    }

    grid[1][1] = 'START';
    const endX = width - 2;
    const endY = height - 2;

    grid[endY][endX] = 'END';
    grid[endY][endX - 1] = 'PATH';

    // Place Fragments (4 of each type A, B, C, D) => 16 items
    const types: FragmentType[] = [
        'A', 'A', 'A', 'A',
        'B', 'B', 'B', 'B',
        'C', 'C', 'C', 'C',
        'D', 'D', 'D', 'D'
    ];

    let attempts = 0;
    while (types.length > 0 && attempts < 2000) {
        attempts++;
        const rx = Math.floor(Math.random() * (width - 2)) + 1;
        const ry = Math.floor(Math.random() * (height - 2)) + 1;
        const key = `${rx},${ry}`;

        if (grid[ry][rx] === 'PATH' && !itemMap[key] && !(rx === 1 && ry === 1) && !(rx === endX && ry === endY)) {
            grid[ry][rx] = 'ITEM';
            itemMap[key] = types.pop()!;
        }
    }

    return { grid, start: [1, 1], end: [endX, endY], itemMap };
};

export default function RedLightGreenLightGame({
    courseId,
    topic,
    contextContent,
    contextNotes = [],
    question = "Unknown Signal Detected",
    options = ["Alpha", "Beta", "Gamma", "Delta"],
    correctOptionIndex = 0,
    onPass,
    onFail,
    onExit
}: RedLightGreenLightGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [started, setStarted] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('ADVANCED');
    const [mathDifficulty, setMathDifficulty] = useState<Difficulty>('ADVANCED');
    const [practiceMode, setPracticeMode] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(question);
    const [currentOptions, setCurrentOptions] = useState(options);
    const [currentCorrectIndex, setCurrentCorrectIndex] = useState(correctOptionIndex);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const [endTileStatus, setEndTileStatus] = useState<'IDLE' | 'DENY' | 'SUCCESS'>('IDLE');
    const [offlineMode, setOfflineMode] = useState(false);

    // Persistence: History & Count
    const [previousQuestions, setPreviousQuestions] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(`quiz_history_${courseId}`) || '[]'); } catch { return []; }
    });
    // Count is trickier: We want it to persist on Refresh/Remount, but maybe not forever?
    // Let's persist it by CourseID.
    const [solvedCount, setSolvedCount] = useState(() => {
        return parseInt(localStorage.getItem(`quiz_count_${courseId}`) || '0');
    });

    // Save Effects
    useEffect(() => {
        // Limit history to 100
        const limited = previousQuestions.slice(-100);
        localStorage.setItem(`quiz_history_${courseId}`, JSON.stringify(limited));
    }, [previousQuestions, courseId]);

    useEffect(() => {
        localStorage.setItem(`quiz_count_${courseId}`, solvedCount.toString());
    }, [solvedCount, courseId]);

    // Pre-fetch Ref
    const nextQuizData = useRef<{ question: string; options: string[]; correctIndex: number } | null>(null);

    const lastTimeRef = useRef(Date.now());
    const lastInputRef = useRef(Date.now());
    const lastIdlePenaltyRef = useRef(0);

    const lastHunterMoveRef = useRef(0);
    const lastProcessedCrashRef = useRef(0);

    // Animation Refs
    const knockbackAnimRef = useRef<{ active: boolean, startX: number, startY: number, targetX: number, targetY: number, startTime: number } | null>(null);
    const particlesRef = useRef<{ x: number, y: number, vx: number, vy: number, life: number, color: string }[]>([]);
    const hitFlashRef = useRef(0);
    const [animating, setAnimating] = useState(false);

    // Helper: A* Pathfinding for Hunter (Strict Shortest Path)
    const findNextStep = (start: { x: number, y: number }, target: { x: number, y: number }, grid: CellType[][]): { x: number, y: number } => {
        // Priority Queue (Open Set) - Simple Array for small grid is fine
        let openSet: { x: number, y: number, f: number, g: number }[] = [];
        const closedSet = new Set<string>();
        const cameFrom = new Map<string, { x: number, y: number }>();
        const gScore = new Map<string, number>();

        const startKey = `${start.x},${start.y}`;
        gScore.set(startKey, 0);

        // Manhattan Heuristic
        const h = (a: { x: number, y: number }, b: { x: number, y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

        openSet.push({ ...start, g: 0, f: h(start, target) });

        while (openSet.length > 0) {
            // Sort by lowest F
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;
            const currentKey = `${current.x},${current.y}`;

            if (current.x === target.x && current.y === target.y) {
                // Reconstruct Path
                const path: { x: number, y: number }[] = [];
                let curr: { x: number, y: number } = current;
                while (cameFrom.has(`${curr.x},${curr.y}`)) {
                    path.unshift(curr);
                    curr = cameFrom.get(`${curr.x},${curr.y}`)!;
                }
                return path[0] || target; // First step
            }

            closedSet.add(currentKey);

            const neighbors = [
                { x: current.x, y: current.y - 1 },
                { x: current.x, y: current.y + 1 },
                { x: current.x - 1, y: current.y },
                { x: current.x + 1, y: current.y }
            ];

            for (const n of neighbors) {
                if (n.y >= 0 && n.y < grid.length && n.x >= 0 && n.x < grid[0].length && grid[n.y][n.x] !== 'WALL') {
                    const nKey = `${n.x},${n.y}`;
                    if (closedSet.has(nKey)) continue;

                    const tentG = (gScore.get(currentKey) || 0) + 1;

                    if (tentG < (gScore.get(nKey) ?? Infinity)) {
                        cameFrom.set(nKey, current);
                        gScore.set(nKey, tentG);
                        const f = tentG + h(n, target);

                        const openIdx = openSet.findIndex(o => o.x === n.x && o.y === n.y);
                        if (openIdx !== -1) {
                            openSet[openIdx].f = f;
                            openSet[openIdx].g = tentG;
                        } else {
                            openSet.push({ ...n, g: tentG, f });
                        }
                    }
                }
            }
        }
        return start; // No path found
    };

    const [gameState, setGameState] = useState<{
        grid: CellType[][],
        itemMap: Record<string, FragmentType>,
        player: { x: number, y: number },
        traffic: 'RED' | 'YELLOW' | 'GREEN',
        score: number,
        inventory: FragmentType[],
        timeLeft: number,
        gameOver: boolean,
        hazards: Hazard[],
        crashEvent?: { time: number, x: number, y: number },
        collectedItems: { x: number, y: number }[],
        stats: { moves: number, keystrokes: number, damage: number, startTime: number, mistakes: number }
    } | null>(null);

    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    const trafficRef = useRef({
        state: 'GREEN' as 'RED' | 'YELLOW' | 'GREEN',
        nextSwitch: 0
    });

    const [msg, setMsg] = useState("SELECT DIFFICULTY TO INITIALIZE");

    // Helper: Scatter Items (Pure Function)
    const scatterItems = (grid: CellType[][], itemMap: Record<string, FragmentType>, inventory: FragmentType[], playerPos: { x: number, y: number }) => {
        const newGrid = grid.map(row => [...row]);
        const newMap = { ...itemMap };

        // Find candidates for scattering
        const freeTiles: { x: number, y: number }[] = [];
        newGrid.forEach((row, y) => row.forEach((t, x) => {
            if (t === 'PATH' && !(x === playerPos.x && y === playerPos.y)) freeTiles.push({ x, y });
        }));

        // Shuffle candidates
        for (let i = freeTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [freeTiles[i], freeTiles[j]] = [freeTiles[j], freeTiles[i]];
        }

        // Scatter inventory items
        inventory.forEach(type => {
            const pos = freeTiles.pop();
            if (pos) {
                newGrid[pos.y][pos.x] = 'ITEM';
                newMap[`${pos.x},${pos.y}`] = type;
            }
        });

        return { newGrid, newMap };
    };

    // Helper: Crash Player (Knockback)
    const crashPlayer = (px: number, py: number, hx: number, hy: number) => {
        // Calculate direction FROM hazard TO player
        let dx = px - hx;
        let dy = py - hy;

        // Normalize (Simple sign check, assuming adjacency)
        if (dx === 0 && dy === 0) { dx = 1; } // Fallback

        const dirX = Math.sign(dx);
        const dirY = Math.sign(dy);

        setGameState(prev => {
            if (!prev) return null;
            let cx = px;
            let cy = py;

            // Move until Wall
            while (true) {
                const nx = cx + dirX;
                const ny = cy + dirY;
                if (prev.grid[ny]?.[nx] === 'WALL' || prev.grid[ny]?.[nx] === undefined) {
                    break;
                }
                cx = nx;
                cy = ny;
            }
            return { ...prev, player: { x: cx, y: cy } };
        });
    };

    // Initialize Game Logic
    // Initialize Game Logic
    const initGame = (diff: Difficulty, initialScore = 1000, isPractice = false) => {
        const data = generateMaze(GRID_WIDTH, GRID_HEIGHT);
        const hazards: Hazard[] = (() => {
            const newHazards: Hazard[] = [];
            const freeTiles: { x: number, y: number }[] = [];

            // Collect free tiles
            data.grid.forEach((row, y) => row.forEach((cell, x) => {
                if (cell === 'PATH' && !(x === 1 && y === 1)) freeTiles.push({ x, y });
            }));

            // Shuffle
            for (let i = freeTiles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [freeTiles[i], freeTiles[j]] = [freeTiles[j], freeTiles[i]];
            }

            if (diff !== 'STANDARD') {
                const pathTiles: { x: number, y: number }[] = [];
                data.grid.forEach((row, y) => row.forEach((cell, x) => {
                    if (cell === 'PATH' && !(x === 1 && y === 1) && !(x === data.end[0] && y === data.end[1])) {
                        pathTiles.push({ x, y });
                    }
                }));

                const spawnHazard = (type: Hazard['type'], count: number) => {
                    for (let i = 0; i < count; i++) {
                        if (pathTiles.length === 0) break;
                        const idx = Math.floor(Math.random() * pathTiles.length);
                        const pos = pathTiles.splice(idx, 1)[0];
                        newHazards.push({
                            id: `${type}-${i}`,
                            type,
                            x: pos.x,
                            y: pos.y,
                            active: true,
                            offset: Math.random() * 2000,
                            state: 'IDLE',
                            startX: pos.x,
                            startY: pos.y
                        });
                    }
                };

                if (diff === 'EXPERT' || diff === 'ELITE') {
                    // 1. Spikes (3-7 Hard, 5-10 Streamer)
                    const spikeCount = diff === 'EXPERT' ? (3 + Math.floor(Math.random() * 5)) : (5 + Math.floor(Math.random() * 6));
                    spawnHazard('SPIKE', spikeCount);

                    // 2. Lasers (Raycast Logic)
                    // Lasers need to span valid corridors (Path -> Wall)
                    const laserCount = diff === 'EXPERT' ? 3 : 5;
                    let spawnedLasers = 0;
                    for (let i = 0; i < 200 && spawnedLasers < laserCount; i++) {
                        // Pick random path
                        if (pathTiles.length === 0) break;
                        const idx = Math.floor(Math.random() * pathTiles.length);
                        const pos = pathTiles[idx];

                        // Try directions (Horiz/Vert)
                        const dir = Math.random() > 0.5 ? { x: 1, y: 0 } : { x: 0, y: 1 };

                        // Check BACK WALL (Aperture Mount)
                        const backX = pos.x - dir.x;
                        const backY = pos.y - dir.y;
                        const hasBackWall = data.grid[backY]?.[backX] === 'WALL';

                        if (hasBackWall) {
                            // Raycast Forward to find Receptacle Wall
                            let length = 0;
                            let cx = pos.x; let cy = pos.y;
                            while (true) {
                                if (data.grid[cy]?.[cx] === 'WALL' || data.grid[cy]?.[cx] === undefined) break;
                                length++;
                                cx += dir.x; cy += dir.y;
                            }

                            // Only valid if length > 1
                            if (length > 1) {
                                // Timing: Active 3s. Safety = 2s + 0.5s per tile
                                // Period = Active + Safety
                                const activeTime = 3000;
                                const safetyTime = 2000 + (length * 500);
                                const period = activeTime + safetyTime;

                                newHazards.push({
                                    id: `LASER-${spawnedLasers}`, type: 'LASER',
                                    x: pos.x, y: pos.y,
                                    active: true, offset: Math.random() * 5000,
                                    state: 'IDLE',
                                    dir, length,
                                    interval: period
                                });
                                spawnedLasers++;
                                pathTiles.splice(idx, 1);
                            }
                        }
                    }
                }

                spawnHazard('POLICE', 4); // 4 Police Units

                // 4. Hunter (Streamer Mode)
                if (diff === 'ELITE') {
                    // Spawn far from start (Bottom Right Quadrant)
                    let hx = 20, hy = 13;
                    // Find valid spot
                    let attempts = 0;
                    while (attempts < 50) {
                        if (data.grid[hy]?.[hx] === 'PATH') break;
                        hx--;
                        if (hx < 10) { hx = 20; hy--; }
                        if (hy < 5) { hy = 15; hx = 20; }
                        attempts++;
                    }

                    newHazards.push({
                        id: 'HUNTER-1', type: 'HUNTER',
                        x: hx, y: hy,
                        active: true, offset: 0,
                        interval: Date.now(), // Use interval for LastMoveTime
                        state: 'PURSUIT'
                    });
                }
            }

            // Assign Polyrhythmic Intervals
            // Primes: 2300, 2900, 3100, 3700, 4100, 4300, 4700, 5300
            const primes = [2300, 2900, 3100, 3700, 4100, 4300, 4700, 5300, 5900];
            return newHazards.map((h, i) => ({
                ...h,
                interval: h.type === 'LASER' ? (6000 + (h.length || 1) * 200) : primes[i % primes.length] // Lasers slower + length factor
            }));
        })();

        setGameState({
            grid: data.grid,
            itemMap: data.itemMap,
            player: { x: 1, y: 1 },
            traffic: 'GREEN',
            score: initialScore,
            inventory: [],
            timeLeft: 120,
            gameOver: false,
            hazards,
            collectedItems: [],
            stats: { moves: 0, keystrokes: 0, damage: 0, startTime: Date.now(), mistakes: 0 }
        });

        trafficRef.current = { state: 'GREEN', nextSwitch: Date.now() + 3000 };
        lastTimeRef.current = Date.now();
        lastInputRef.current = Date.now();
        lastIdlePenaltyRef.current = Date.now();

        setStarted(true);
        setMsg("PROTOCOL ACTIVE. COLLECT 4 MATCHING SHARDS.");


    };

    // Wrapper for Grid Buttons
    const startGame = async (gameDiff: Difficulty, isPractice = false) => {
        setDifficulty(gameDiff);
        if (isPractice) setPracticeMode(true);
        // Pass both Math Complexity (State) and Game Physics (Arg)
        fetchAIQuiz(mathDifficulty, gameDiff, 0, false, isPractice);
    };
    const fetchAIQuiz = async (diff: Difficulty, gameDiff: Difficulty, index = 0, isPreload = false, forcePractice = false) => {
        if (solvedCount >= 10) return; // Stop at 10

        // Helper: Use MathGen Logic
        const useLocalMath = () => {
            const data = generateMathQuestion(diff as MathDifficulty); // diff is MathDifficulty
            if (isPreload) {
                nextQuizData.current = {
                    question: data.question,
                    options: data.options,
                    correctIndex: data.correct_option_index
                };
            } else {
                setCurrentQuestion(data.question);
                setCurrentOptions(data.options);
                setCurrentCorrectIndex(data.correct_option_index);
                const currentScore = index > 0 ? (gameStateRef.current?.score ?? 1000) : 1000;
                initGame(gameDiff, currentScore, forcePractice || practiceMode);
                // Preload Next
                fetchAIQuiz(diff, gameDiff, index + 1, true, forcePractice || practiceMode);
            }
        };

        if (!topic || practiceMode || forcePractice || offlineMode) {
            useLocalMath();
            return;
        }

        if (!isPreload) setLoadingQuiz(true);
        try {
            const payload = {
                topic,
                dataset: 'default',
                course_id: courseId,
                difficulty: diff.toLowerCase(), // 'standard', 'advanced', etc.
                question_index: index,
                question_index: index,
                previous_questions: previousQuestions,
                context_notes: contextNotes,
                context_content: contextContent
            };
            // 30s Timeout for Fallback (Large Contexts)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch('http://localhost:8000/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            if (data.question) {
                setPreviousQuestions(prev => [...prev.slice(-9), data.question]);
                if (isPreload) {
                    nextQuizData.current = {
                        question: data.question,
                        options: data.options,
                        correctIndex: data.correct_option_index
                    };
                } else {
                    setCurrentQuestion(data.question);
                    setCurrentOptions(data.options);
                    setCurrentCorrectIndex(data.correct_option_index);
                    const currentScore = index > 0 ? (gameStateRef.current?.score ?? 1000) : 1000;
                    initGame(gameDiff, currentScore, forcePractice || practiceMode);
                    fetchAIQuiz(diff, gameDiff, index + 1, true, forcePractice || practiceMode);
                }
            } else {
                throw new Error("Empty Data");
            }
        } catch (e) {
            console.error("AI Backend Failed, Switching to MathGen Fallback", e);
            setOfflineMode(true);
            if (!isPreload) {
                toast.error("DATA LINK UNSTABLE. SWITCHING TO OFFLINE MODE.");
            }
            useLocalMath();
        } finally {
            setLoadingQuiz(false);
        }
    };

    // Initialize Game Logic




    // Difficulty Config
    const getDifficultyConfig = (diff: Difficulty) => {
        switch (diff) {
            case 'STANDARD': return { yellow: 800, greenMin: 2500, greenMax: 6000, redMin: 2000, redMax: 5000 };
            case 'ADVANCED': return { yellow: 400, greenMin: 1500, greenMax: 4000, redMin: 2500, redMax: 5000 };
            case 'EXPERT': return { yellow: 200, greenMin: 1000, greenMax: 3000, redMin: 3000, redMax: 6000 };
            case 'ELITE': return { yellow: 50, greenMin: 500, greenMax: 2000, redMin: 4000, redMax: 7000 };
        }
    };



    // Game Loop
    useEffect(() => {
        if (!started || !gameState || gameState.gameOver) return;

        const loop = setInterval(() => {
            const now = Date.now();
            const config = getDifficultyConfig(difficulty);

            // Traffic Logic
            if (now > trafficRef.current.nextSwitch) {
                const currentState = trafficRef.current.state;
                let nextState: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
                let duration = 3000;

                if (currentState === 'GREEN') {
                    nextState = 'YELLOW';
                    duration = config.yellow;
                    setMsg("CAUTION! SIGNAL UNSTABLE...");
                } else if (currentState === 'YELLOW') {
                    nextState = 'RED';
                    duration = Math.random() * (config.redMax - config.redMin) + config.redMin;
                    setMsg("STOP! SIGNAL LOST.");
                    toast.warning("RED LIGHT!");
                } else if (currentState === 'RED') {
                    nextState = 'GREEN';
                    duration = Math.random() * (config.greenMax - config.greenMin) + config.greenMin;
                    setMsg("GREEN LIGHT. SIGNAL STABLE.");
                    toast.success("GO!");
                }

                trafficRef.current.state = nextState;
                trafficRef.current.nextSwitch = now + duration;
                setGameState(prev => prev ? ({ ...prev, traffic: nextState }) : null);
            }

            // Idle Check
            const idleTime = now - lastInputRef.current;
            // Safety: Don't drain battery if on an ITEM, or if waiting for Traffic (Red/Yellow)
            const playerPos = gameStateRef.current?.player;
            const isSafeTile = playerPos && gameStateRef.current?.grid[playerPos.y][playerPos.x] === 'ITEM';
            const isTrafficWait = trafficRef.current.state !== 'GREEN';

            if (idleTime > 7000 && !isSafeTile && !isTrafficWait) {
                setShowIdleWarning(true);
                // Penalty Logic
                if (now - lastIdlePenaltyRef.current > 1000) {
                    setGameState(prev => prev ? ({ ...prev, score: Math.max(0, prev.score - 50) }) : null);
                    setMsg("WARNING: IDLE DETECTED. DRAINING RESOURCES.");
                    lastIdlePenaltyRef.current = now;
                }
            } else {
                setShowIdleWarning(false);
            }

            // --- HAZARD UPDATES ---
            setGameState(prev => {
                if (!prev) return null;
                const newHazards = prev.hazards.map(h => {
                    if (h.type === 'SPIKE' || h.type === 'LASER') {
                        // Polyrhythmic Timing
                        const period = h.interval ?? 2000;
                        const phase = (now + h.offset) % period;

                        // Spikes: Fast Pop (1000ms active)
                        // Lasers: Fixed 3000ms Active (Safety handled by interval length)
                        const activeDuration = h.type === 'SPIKE' ? 1000 : 3000;

                        return { ...h, active: phase < activeDuration };
                    }
                    if (h.type === 'HUNTER') {
                        // 1. Stun/Rest Logic
                        const isDisabled = h.state === 'STUNNED' || h.state === 'RESTING';
                        if (isDisabled) {
                            const duration = h.state === 'STUNNED' ? 3000 : 2000; // 3s Stun, 2s Rest
                            if (now - (h.stunStart || 0) > duration) {
                                // Wake up
                                return { ...h, state: 'PURSUIT' as 'PURSUIT', active: true, interval: now, movesCount: 0 };
                            }
                            return { ...h, active: false }; // Pass through
                        }

                        // 2. Hunter Logic (A* Beeline)
                        const speed = 800; // Slower than player (approx 200ms) but persistent
                        const lastMove = h.interval || 0;

                        if (now - lastMove > speed) {
                            // Fatigue Check
                            const count = h.movesCount || 0;
                            if (count > 10) { // Every 10 steps (~8s), rest
                                return { ...h, state: 'RESTING' as 'RESTING', active: false, stunStart: now };
                            }

                            const step = findNextStep({ x: h.x, y: h.y }, { x: Math.round(prev.player.x), y: Math.round(prev.player.y) }, prev.grid);
                            return { ...h, x: step.x, y: step.y, interval: now, active: true, movesCount: count + 1 };
                        }
                        return h;
                    }

                    return h;
                });

                // Check Collisions
                let gameOver = prev.gameOver;
                let deathMsg = "";
                let triggerCrash = false;
                let policeId = "";

                // Temporary storage for logic
                let nextGrid = prev.grid;
                let nextMap = prev.itemMap;
                let nextInv = prev.inventory;
                let nextPlayer = prev.player;

                for (const h of newHazards) {
                    // Collision Check
                    const px = Math.round(prev.player.x);
                    const py = Math.round(prev.player.y);

                    // Spikes
                    if (h.type === 'SPIKE' && h.active && h.x === px && h.y === py) {
                        triggerCrash = true;
                        deathMsg = "SPIKE DAMAGE: ARMOR COMPROMISED";
                    }
                    // Lasers (Line Segment)
                    if (h.type === 'LASER' && h.active) {
                        const lx = h.length || 1;
                        const dx = h.dir?.x || 0;
                        const dy = h.dir?.y || 0;

                        // Check overlap logic
                        if (dx !== 0) {
                            if (py === h.y && px >= h.x && px < h.x + lx) {
                                triggerCrash = true;
                                deathMsg = "OPTICAL BARRIER BREACH: SHIELDS DOWN";
                            }
                        } else {
                            if (px === h.x && py >= h.y && py < h.y + lx) {
                                triggerCrash = true;
                                deathMsg = "OPTICAL BARRIER BREACH: SHIELDS DOWN";
                            }
                        }
                    }

                    // Hunter
                    if (h.type === 'HUNTER' && h.active && h.x === px && h.y === py) {
                        triggerCrash = true;
                        deathMsg = "HUNTER AVOIDANCE SYSTEM CRITICAL";
                        policeId = h.id; // Reuse policeId to mark *which* hunter
                    }
                }

                if (triggerCrash && policeId) {
                    // Stun the Hunter that hit us
                    const hitIdx = newHazards.findIndex(hz => hz.id === policeId);
                    if (hitIdx !== -1) {
                        newHazards[hitIdx] = {
                            ...newHazards[hitIdx],
                            state: 'STUNNED',
                            active: false,
                            stunStart: now
                        };
                    }
                }

                if (gameOver && !prev.gameOver) {
                    toast.error(deathMsg || "SIGNAL LOST");
                    return { ...prev, hazards: newHazards, gameOver: true };
                }

                // HANDLE NON-LETHAL CRASH
                if (triggerCrash) {
                    // Check Immunity?
                    // We don't have immunity frame logic yet.
                    // But we should reset inventory.
                    // And maybe knockback.

                    // 1. Scatter
                    const { newGrid, newMap } = scatterItems(prev.grid, prev.itemMap, prev.inventory, prev.player);

                    // 2. Clear Inventory
                    return {
                        ...prev,
                        grid: newGrid,
                        itemMap: newMap,
                        inventory: [],
                        hazards: newHazards,
                        crashEvent: { time: Date.now(), x: prev.player.x, y: prev.player.y },
                        stats: { ...prev.stats, damage: prev.stats.damage + 1 }
                    };
                }

                return {
                    ...prev,
                    hazards: newHazards,
                    gameOver,
                    player: nextPlayer,
                    grid: nextGrid,
                    itemMap: nextMap,
                    inventory: nextInv
                };
            });





        }, 50); // Tick rate
        return () => clearInterval(loop);
    }, [started, gameState?.gameOver, difficulty]);

    useEffect(() => {
        if (!started || !gameState || gameState.gameOver) return;

        const timer = setInterval(() => {
            setGameState(prev => {
                if (!prev) return null;
                if (prev.timeLeft <= 1) {
                    // TIMEOUT -> NEXT QUESTION (Infinite Play)
                    toast.error("PROTOCOL TIMEOUT. SYSTEMS RESETTING...");
                    fetchAIQuiz(mathDifficulty, difficulty, 0, false, practiceMode);
                    return { ...prev, timeLeft: 120 }; // Brief reset
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
        return () => clearInterval(timer);

    }, [started, gameState?.gameOver, topic, difficulty, mathDifficulty, practiceMode]);

    // Effect: Handle Crash Visuals
    useEffect(() => {
        if (!gameState?.crashEvent) return;
        if (gameState.crashEvent.time > lastProcessedCrashRef.current) {
            lastProcessedCrashRef.current = gameState.crashEvent.time;

            // Trigger Visuals
            setAnimating(true);
            hitFlashRef.current = Date.now();
            toast.error("SYSTEM CRITICAL: DAMAGE SUSTAINED");

            // Particles
            const px = gameState.crashEvent.x * TILE_SIZE + 16;
            const py = gameState.crashEvent.y * TILE_SIZE + 16;

            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 2;
                particlesRef.current.push({
                    x: px, y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    color: i % 2 === 0 ? '#ef4444' : '#f59e0b' // Red/Orange
                });
            }

            // Short Lockout / Shake
            setTimeout(() => setAnimating(false), 500);
        }
    }, [gameState?.crashEvent]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!started || animating) return;
            if (!e.repeat) {
                setGameState(prev => prev ? ({ ...prev, stats: { ...prev.stats, keystrokes: prev.stats.keystrokes + 1 } }) : null);
            }
            lastInputRef.current = Date.now();

            // Prevent Scroll
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            const state = gameStateRef.current;
            if (!state || state.gameOver) return;

            // Helper: Crash Logic
            const triggerCrash = (impactDir: { x: number, y: number }, crashHazards: Hazard[]) => {
                setAnimating(true);
                hitFlashRef.current = Date.now();

                // Calculate Wall
                let cx = state.player.x;
                let cy = state.player.y;
                // Ensure direction is non-zero (default backward/forward)
                let dx = Math.sign(impactDir.x) || (Math.random() > 0.5 ? 1 : -1);
                let dy = Math.sign(impactDir.y) || (Math.random() > 0.5 ? 1 : -1);
                // If pure vertical/horizontal impact, keep it straight
                if (impactDir.x !== 0 && impactDir.y === 0) dy = 0;
                if (impactDir.y !== 0 && impactDir.x === 0) dx = 0;

                while (true) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (state.grid[ny]?.[nx] === 'WALL' || state.grid[ny]?.[nx] === undefined) break;
                    cx = nx; cy = ny;
                }

                knockbackAnimRef.current = {
                    active: true,
                    startX: state.player.x, startY: state.player.y,
                    targetX: cx, targetY: cy,
                    startTime: Date.now()
                };

                // --- PRE-CALCULATE SCATTER ---
                const nextGrid = state.grid.map(row => [...row]);
                const nextMap = { ...state.itemMap };
                const currentInv = [...state.inventory];
                const freeTiles: { x: number, y: number }[] = [];
                nextGrid.forEach((row, y) => row.forEach((t, x) => {
                    if (t === 'PATH' && !(x === cx && y === cy) && !(x === state.player.x && y === state.player.y)) {
                        freeTiles.push({ x, y });
                    }
                }));

                // Shuffle
                for (let i = freeTiles.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [freeTiles[i], freeTiles[j]] = [freeTiles[j], freeTiles[i]];
                }

                // Spawn Particles Targeting New Locations
                const DURATION_FRAMES = 25; // ~400ms
                currentInv.forEach((type, idx) => {
                    const pos = freeTiles.pop();
                    if (pos) {
                        nextGrid[pos.y][pos.x] = 'ITEM';
                        nextMap[`${pos.x},${pos.y}`] = type;

                        // Target Pixel
                        const tx = pos.x * TILE_SIZE + 16;
                        const ty = pos.y * TILE_SIZE + 16;
                        const sx = state.player.x * TILE_SIZE + 16;
                        const sy = state.player.y * TILE_SIZE + 16;

                        particlesRef.current.push({
                            x: sx,
                            y: sy,
                            vx: (tx - sx) / DURATION_FRAMES,
                            vy: (ty - sy) / DURATION_FRAMES,
                            life: 1.2,
                            color: type === 'A' ? '#3b82f6' : type === 'B' ? '#ef4444' : type === 'C' ? '#22c55e' : '#eab308'
                        });
                    }
                });

                // Generic Sparkles (Colorful Chaos)
                for (let i = 0; i < 30; i++) {
                    particlesRef.current.push({
                        x: state.player.x * TILE_SIZE + 16,
                        y: state.player.y * TILE_SIZE + 16,
                        vx: (Math.random() - 0.5) * 20,
                        vy: (Math.random() - 0.5) * 20,
                        life: 0.8,
                        color: ['#0ea5e9', '#f43f5e', '#22c55e', '#eab308'][Math.floor(Math.random() * 4)]
                    });
                }

                setTimeout(() => {
                    setGameState(prev => {
                        if (!prev) return null;

                        // Use PRE-CALCULATED state
                        toast.error("APPREHENDED! SHARDS CONFISCATED.");
                        return {
                            ...prev,
                            player: { x: cx, y: cy },
                            grid: nextGrid,
                            itemMap: nextMap,
                            inventory: [],
                            hazards: crashHazards
                        };
                    });
                    setAnimating(false);
                    knockbackAnimRef.current = null;
                }, 400);

                setMsg("CRITICAL FAILURE. SYSTEMS REBOOTING.");
            };


            // MOVEMENT
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                let currentHazards = [...state.hazards];
                let caughtByPolice = false;

                // 1. Check Police Pursuit (Red Light)
                if (trafficRef.current.state === 'RED') {
                    const policeBots = state.hazards.filter(h => h.type === 'POLICE');
                    if (policeBots.length > 0) {
                        let crashImpact = { x: 0, y: 0 };

                        currentHazards = state.hazards.map(h => {
                            if (h.type !== 'POLICE') return h;
                            // Move Logic
                            const step1 = findNextStep({ x: h.x, y: h.y }, state.player, state.grid);

                            // Facing
                            const dx = step1.x - h.x;
                            const dy = step1.y - h.y;
                            let facing = h.facing ?? 0;
                            if (dx !== 0 || dy !== 0) facing = Math.atan2(dy, dx); // Face movement

                            // Check Catch
                            if (step1.x === state.player.x && step1.y === state.player.y) {
                                caughtByPolice = true;
                                crashImpact = { x: dx, y: dy }; // Push in direction of movement
                                return { ...h, x: step1.x, y: step1.y, state: 'IDLE' as const, facing };
                            }
                            return { ...h, x: step1.x, y: step1.y, state: 'PURSUIT' as const, facing };
                        });

                        if (caughtByPolice) {
                            triggerCrash(crashImpact, currentHazards);
                            return; // Block Player Move
                        } else {
                            // Update Hazards for render (Pursuit step)
                            setGameState(prev => prev ? ({ ...prev, hazards: currentHazards }) : null);
                            setMsg("ALERT! EVADE PURSUIT!");
                        }
                    } else {
                        // Fallback Penalty if no police
                        setGameState(prev => prev ? ({ ...prev, score: Math.max(0, prev.score - 50) }) : null);
                        setMsg("VIOLATION! -50 PENALTY");
                    }
                } // End Red Light Check


                // 2. Compute Player Move
                let dx = 0, dy = 0;
                if (e.key === 'ArrowUp') dy = -1;
                if (e.key === 'ArrowDown') dy = 1;
                if (e.key === 'ArrowLeft') dx = -1;
                if (e.key === 'ArrowRight') dx = 1;

                const nx = state.player.x + dx;
                const ny = state.player.y + dy;

                if (state.grid[ny]?.[nx] !== 'WALL') {
                    // 3. Check Collision (Walk Into Hazard)
                    // Check against currentHazards (which reflects Police new positions)
                    const hitHaz = (trafficRef.current.state === 'RED') && currentHazards.find(h => h.x === nx && h.y === ny && h.type === 'POLICE');

                    if (hitHaz) {
                        // WALKED INTO POLICE
                        // Impact Direction: Player moved (dx, dy). Push BACK (-dx, -dy).
                        triggerCrash({ x: -dx, y: -dy }, currentHazards);
                        return; // Block Move
                    }

                    // Win Logic
                    if (state.grid[ny][nx] === 'END') {
                        const correctType = ['A', 'B', 'C', 'D'][currentCorrectIndex];
                        const win = state.inventory.length === 4 && state.inventory.every(t => t === correctType);

                        if (win) {
                            // SCORING
                            const optimal = calculateOptimalTSP({ x: 1, y: 1 }, state.collectedItems, { x: state.grid[0].length - 2, y: state.grid.length - 2 }, state.grid);
                            let result = calculateLeptaScore(state.stats, optimal, state.inventory.length);

                            if (practiceMode) {
                                result = { ...result, score: 0, multiplier: 0 };
                            }

                            // Add to Total Score
                            const newTotal = (state.score || 0) + result.score;

                            setGameState(prev => prev ? ({ ...prev, gameOver: true, player: { x: nx, y: ny }, score: newTotal }) : null);
                            const newCount = solvedCount + 1;
                            setSolvedCount(newCount);

                            // Format Message
                            if (practiceMode) {
                                toast("PRACTICE MODE: ZERO LEPTA EARNED", { icon: '🛡️' });
                            } else {
                                toast.success(`PROTOCOL COMPLETED. SCORE: ${result.score} (x${result.multiplier.toFixed(1)})`, { duration: 3000 });
                            }
                            toast(`Finesse Error: ${Math.round(result.finesse)}`, { icon: '📉' });

                            // Progression: Seamless Transition
                            setTimeout(() => {
                                setEndTileStatus('IDLE');
                                if (newCount >= 10) {
                                    // MISSION COMPLETE
                                    toast.success("MISSION ACCOMPLISHED. FINAL SCORE UPLOADED.");
                                    setEndTileStatus('SUCCESS');
                                    // Optionally show big modal here
                                    return;
                                }

                                if (nextQuizData.current) {
                                    // Use Preloaded Data
                                    setCurrentQuestion(nextQuizData.current.question);
                                    setCurrentOptions(nextQuizData.current.options);
                                    setCurrentCorrectIndex(nextQuizData.current.correctIndex);
                                    nextQuizData.current = null; // Clear

                                    initGame(difficulty, newTotal, practiceMode);
                                    fetchAIQuiz(mathDifficulty, difficulty, newCount + 1, true, practiceMode); // Preload Next
                                } else {
                                    fetchAIQuiz(mathDifficulty, difficulty, newCount, false, practiceMode);
                                }
                            }, 1500);
                        } else {
                            // Don't toast constantly, simplified msg
                            setEndTileStatus('DENY');
                            setTimeout(() => setEndTileStatus('IDLE'), 1000);
                            setMsg(`ACCESS DENIED. REQ: 4x TYPE '${correctType}'`);
                        }
                    }

                    // Apply Player Move
                    setGameState(prev => prev ? ({ ...prev, hazards: currentHazards, player: { x: nx, y: ny }, stats: { ...prev.stats, moves: prev.stats.moves + 1 } }) : null);
                }
            }


            // PICKUP (Space)
            if (e.code === 'Space') {
                const { x, y } = state.player;
                const key = `${x},${y}`;
                const cell = state.grid[y][x];

                if (cell === 'ITEM') {
                    if (state.inventory.length >= 4) { // Increased to 4
                        toast.error("BUFFER FULL. PRESS 'X' TO DROP.");
                        return;
                    }
                    const type = state.itemMap[key];
                    const newInventory = [...state.inventory, type];

                    const newGrid = state.grid.map(row => [...row]);
                    newGrid[y][x] = 'PATH';

                    const newMap = { ...state.itemMap };
                    delete newMap[key];

                    const newCollected = [...(state.collectedItems || []), { x, y }];

                    // Quiz Logic Feedback
                    const correctType = ['A', 'B', 'C', 'D'][currentCorrectIndex];
                    if (type === correctType) {
                        toast.success(`FRAGMENT ACQUIRED: ${type} (MATCH)`, { duration: 1000, position: 'top-center' });
                        setGameState(prev => prev ? ({ ...prev, grid: newGrid, itemMap: newMap, inventory: newInventory, collectedItems: newCollected }) : null);
                    } else {
                        toast.warning(`FRAGMENT ACQUIRED: ${type} (MISMATCH)`, { duration: 1000, position: 'top-center' });
                        setGameState(prev => prev ? ({
                            ...prev,
                            grid: newGrid,
                            itemMap: newMap,
                            inventory: newInventory,
                            collectedItems: newCollected,
                            stats: { ...prev.stats, mistakes: (prev.stats.mistakes || 0) + 1 }
                        }) : null);
                    }


                }
            }

            // DROP (X)
            if (e.key.toLowerCase() === 'x') {
                if (state.inventory.length === 0) return;

                const { x, y } = state.player;
                if (state.grid[y][x] === 'ITEM') {
                    toast.error("TILE OCCUPIED.");
                    return;
                }

                const newInventory = [...state.inventory];
                const droppedType = newInventory.pop()!;

                const newGrid = state.grid.map(row => [...row]);
                newGrid[y][x] = 'ITEM';

                const newMap = { ...state.itemMap };
                newMap[`${x},${y}`] = droppedType;

                setGameState(prev => prev ? ({ ...prev, grid: newGrid, itemMap: newMap, inventory: newInventory }) : null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [correctOptionIndex, started, difficulty, question, solvedCount]);

    // Render Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameState) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear - Asphalt Background
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        gameState.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;

                if (cell === 'WALL') {
                    // Building Tops (Concrete)
                    ctx.fillStyle = '#cbd5e1'; // Slate-300
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    // 3D Side (Shadow)
                    ctx.fillStyle = '#94a3b8'; // Slate-400
                    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 4, TILE_SIZE - 4);
                    // Roof Detail
                    ctx.fillStyle = '#e2e8f0'; // Slate-200
                    ctx.fillRect(px + 8, py + 8, TILE_SIZE - 12, TILE_SIZE - 12);
                } else if (cell === 'PATH' || cell === 'START') {
                    // Street
                    ctx.fillStyle = '#334155'; // Slate-700
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    // Lane Markings
                    if (x % 2 === 0 && y % 2 === 0) {
                        ctx.fillStyle = '#475569';
                        ctx.fillRect(px + TILE_SIZE / 2 - 1, py + TILE_SIZE / 2 - 4, 2, 8);
                    }
                } else if (cell === 'END') {
                    // Goal Zone
                    ctx.fillStyle = '#f59e0b'; // Amber-500
                    ctx.globalAlpha = 0.3;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.globalAlpha = 1;
                    // Checkered Flag Pattern
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(px, py, TILE_SIZE / 2, TILE_SIZE / 2);
                    ctx.fillRect(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
                } else if (cell === 'ITEM') {
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                    const type = gameState.itemMap[`${x},${y}`];
                    // Neon Data Cubes
                    const color = type === 'A' ? '#0ea5e9' : type === 'B' ? '#f43f5e' : type === 'C' ? '#22c55e' : '#eab308';

                    ctx.shadowBlur = 10;
                    ctx.shadowColor = color;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(px + 16, py + 8);
                    ctx.lineTo(px + 24, py + 16);
                    ctx.lineTo(px + 16, py + 24);
                    ctx.lineTo(px + 8, py + 16);
                    ctx.lineTo(px + 8, py + 16);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // End Tile Status Overlay
                    if (endTileStatus === 'DENY') {
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // Red Blink
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    } else if (endTileStatus === 'SUCCESS') {
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'; // Green Blink
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }

                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(type, px + 16, py + 16);
                }
            });
        });


        // --- HAZARD RENDERING ---
        gameState.hazards.forEach(h => {
            const px = h.x * TILE_SIZE;
            const py = h.y * TILE_SIZE;

            if (h.type === 'SPIKE') {
                if (h.active) {
                    // Draw 3x3 Micro-Triangles with Gradient
                    const subSize = TILE_SIZE / 3;
                    for (let r = 0; r < 3; r++) {
                        for (let c = 0; c < 3; c++) {
                            const sx = px + c * subSize + subSize / 2;
                            const sy = py + r * subSize + subSize / 2;

                            // 3D Gradient Pop
                            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5);
                            grad.addColorStop(0, '#ef4444');
                            grad.addColorStop(1, '#991b1b');
                            ctx.fillStyle = grad;

                            ctx.beginPath();
                            ctx.moveTo(sx, sy - 5);
                            ctx.lineTo(sx - 5, sy + 5);
                            ctx.lineTo(sx + 5, sy + 5);
                            ctx.fill();
                        }
                    }
                } else {
                    const subSize = TILE_SIZE / 3;
                    for (let r = 0; r < 3; r++) {
                        for (let c = 0; c < 3; c++) {
                            const sx = px + c * subSize + subSize / 2;
                            const sy = py + r * subSize + subSize / 2;
                            ctx.beginPath();
                            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                            ctx.fillStyle = '#1e293b'; // Darker Hole
                            ctx.fill();
                            // Light Grey Outline
                            ctx.strokeStyle = '#9ca3af';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }
                    }
                }
            } else if (h.type === 'LASER') {
                const lx = (h.length || 1) * TILE_SIZE;
                const dx = h.dir?.x || 0;
                const dy = h.dir?.y || 0;

                // Draw Aperture (On Back Wall)
                const startX = px - dx * TILE_SIZE;
                const startY = py - dy * TILE_SIZE;

                ctx.fillStyle = '#334155'; // Housing
                ctx.fillRect(startX + 4, startY + 4, 24, 24);
                ctx.fillStyle = '#0f172a'; // Inner Hole
                ctx.beginPath(); ctx.arc(startX + 16, startY + 16, 6, 0, Math.PI * 2); ctx.fill();

                // Draw Receptacle (On Target Wall)
                const endX = px + dx * lx;
                const endY = py + dy * lx;

                ctx.fillStyle = '#334155';
                ctx.fillRect(endX + 4, endY + 4, 24, 24);
                ctx.fillStyle = '#0f172a';
                ctx.beginPath(); ctx.arc(endX + 16, endY + 16, 6, 0, Math.PI * 2); ctx.fill();

                if (h.active) {
                    ctx.strokeStyle = '#ef4444'; // Red Glow
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ef4444';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(startX + 16, startY + 16);
                    ctx.lineTo(endX + 16, endY + 16);
                    ctx.stroke();

                    // Core
                    ctx.strokeStyle = '#ffffff';
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            } else if (h.type === 'POLICE') {
                let color = '#94a3b8'; // Default Lighter Gray (Slate-400) for Idle

                if (trafficRef.current.state === 'GREEN') {
                    color = '#94a3b8'; // Lighter Gray
                } else if (trafficRef.current.state === 'YELLOW') {
                    // Yellow Logic
                    const moving = Date.now() - lastInputRef.current < 500;
                    if (moving) {
                        // Warning Flash (Orange/Red)
                        const tick = Math.floor(Date.now() / 100);
                        color = tick % 2 === 0 ? '#ea580c' : '#fbbf24'; // Orange / Amber
                    } else {
                        // Slow Blink (Yellow/Gray)
                        const tick = Math.floor(Date.now() / 500);
                        color = tick % 2 === 0 ? '#fbbf24' : '#94a3b8';
                    }
                } else if (trafficRef.current.state === 'RED') {
                    // Fast Blink (Red/Blue Siren)
                    const tick = Math.floor(Date.now() / 100);
                    color = tick % 2 === 0 ? '#ef4444' : '#3b82f6';
                }

                ctx.fillStyle = color;

                // Narrow Isosceles Triangle
                ctx.shadowBlur = h.state === 'PURSUIT' ? 25 : 0;
                ctx.shadowColor = color;

                ctx.save();
                ctx.translate(px + 16, py + 16);

                // Use Stored Facing
                const angle = h.facing ?? 0;
                ctx.rotate(angle);

                // Proper Narrow Triangle (Driving Look)
                ctx.beginPath();
                ctx.moveTo(16, 0);   // Tip (Right)
                ctx.lineTo(-12, 5);  // Back Left
                ctx.lineTo(-12, -5); // Back Right
                ctx.closePath();
                ctx.fill();

                // Siren light (Center/Rear)
                if (trafficRef.current.state === 'RED' || h.state === 'PURSUIT') {
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 0.8;
                    ctx.beginPath();
                    ctx.arc(-4, 0, 3, 0, Math.PI * 2); // Slightly back from center
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }

                ctx.restore();
                ctx.shadowBlur = 0;

            } else if (h.type === 'HUNTER') {
                // Spiky Star (Naval Mine look)
                const isStunned = h.state === 'STUNNED' || h.state === 'RESTING';
                ctx.fillStyle = isStunned ? '#64748b' : '#991b1b'; // Grey vs Dark Red
                const spikes = 8;
                const outerRadius = 14;
                const innerRadius = 6;
                const cx = px + 16;
                const cy = py + 16;

                ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const rad = (Math.PI / spikes) * i + (isStunned ? 0 : (Date.now() / 200)); // Rotate if active
                    const r = (i % 2 === 0) ? outerRadius : innerRadius;
                    ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
                }
                ctx.closePath();
                ctx.shadowBlur = isStunned ? 0 : 10;
                ctx.shadowColor = '#ef4444';
                ctx.fill();
                ctx.shadowBlur = 0;

                // Eye
                ctx.fillStyle = isStunned ? '#000000' : '#fca5a5';
                ctx.beginPath();
                ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                ctx.fill();

                // Stun Sparks
                if (isStunned) {
                    ctx.strokeStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5);
                    ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5);
                    ctx.stroke();
                }
            }
        });
        // Player (Car/Drone Avatar)
        // Check Knockback Animation
        let px, py;
        if (knockbackAnimRef.current && knockbackAnimRef.current.active) {
            const kb = knockbackAnimRef.current;
            const elapsed = Date.now() - kb.startTime;
            const progress = Math.min(1, elapsed / 400); // 400ms duration
            // EaseOut
            const t = 1 - Math.pow(1 - progress, 3);

            px = (kb.startX + (kb.targetX - kb.startX) * t) * TILE_SIZE;
            py = (kb.startY + (kb.targetY - kb.startY) * t) * TILE_SIZE;
        } else {
            px = gameState.player.x * TILE_SIZE;
            py = gameState.player.y * TILE_SIZE;
        }

        let color = '#10b981'; // Emerald
        if (gameState.traffic === 'RED') color = '#ef4444';
        if (gameState.traffic === 'YELLOW') color = '#f59e0b'; // Keep yellow color logic for player

        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Player Body
        let coreColor = '#ffffff';
        if (knockbackAnimRef.current?.active) {
            const elapsed = Date.now() - knockbackAnimRef.current.startTime;
            if (elapsed < 200) coreColor = '#ef4444'; // Brief Red Flash
        }

        ctx.fillStyle = coreColor;

        // Core
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 6, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Particles
        const parts = particlesRef.current;
        if (parts.length > 0) {
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                if (p.life <= 0) {
                    parts.splice(i, 1);
                } else {
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, 4, 4);
                    ctx.globalAlpha = 1;
                }
            }
        }

        // Red Flash Overlay
        const flashElapsed = Date.now() - hitFlashRef.current;
        if (flashElapsed < 500) {
            ctx.fillStyle = `rgba(239, 68, 68, ${1 - flashElapsed / 500})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // Original stroke for player, adjusted to use px, py
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Overlay Traffic (Atmospheric Tint)
        if (gameState.traffic === 'RED') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (gameState.traffic === 'YELLOW') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (gameState.traffic === 'GREEN') {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Green Tint (Increased visibility)
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

    }, [gameState]);

    // Loading State (Priority 1) - ONLY IF GAME NOT STARTED (Initial)
    if (loadingQuiz && !gameState) return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-sky-400 font-mono p-10 space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full mb-4"></div>
            <div className="text-xl font-bold tracking-[0.2em] animate-pulse">ESTABLISHING DATA LINK</div>
            <div className="text-xs text-sky-600">DECRYPTING SECURE PROTOCOL...</div>
        </div>
    );

    // Start Screen - Urban Style (Priority 2)
    if (!started) {
        return (
            <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden text-slate-900">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_2px,transparent_2px),linear-gradient(90deg,rgba(0,0,0,0.02)_2px,transparent_2px)] bg-[length:40px_40px] pointer-events-none"></div>
                <Siren className="w-16 h-16 text-sky-500 mb-6 drop-shadow-md" />
                <h1 className="text-5xl font-black text-slate-800 mb-2 uppercase tracking-tighter">ROADS' SCHOLAR</h1>
                <p className="text-slate-500 font-bold tracking-widest mb-12 text-center max-w-md uppercase text-xs">
                    Automated Protocol • Sector 7 • Daytime Operations
                </p>

                <div className="w-full max-w-sm z-10 space-y-6">
                    {/* Math Complexity Slider */}
                    <div className="space-y-4 bg-white/50 p-4 rounded-xl border border-sky-100 shadow-sm backdrop-blur-sm">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-black text-slate-600 tracking-widest uppercase flex items-center gap-2">
                                Data Complexity <span className="text-sky-400">///</span>
                            </span>
                            <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-100 font-mono tracking-widest font-bold">
                                {mathDifficulty}
                            </Badge>
                        </div>
                        <Slider
                            defaultValue={[1]}
                            max={3}
                            step={1}
                            value={[{ 'STANDARD': 0, 'ADVANCED': 1, 'EXPERT': 2, 'ELITE': 3 }[mathDifficulty]]}
                            onValueChange={(vals) => {
                                const d = ['STANDARD', 'ADVANCED', 'EXPERT', 'ELITE'][vals[0]] as Difficulty;
                                setMathDifficulty(d);
                            }}
                            className="w-full [&>span]:bg-sky-200 [&>span>span]:bg-sky-600" // Attempt to style track/thumb via child selectors
                        />
                        <div className="flex justify-between px-1 text-[10px] text-slate-500 font-mono uppercase font-bold">
                            <span>Standard</span>
                            <span>Elite</span>
                        </div>
                    </div>

                    {/* Practice Toggle */}
                    <div className="flex items-center space-x-2">
                        <Button
                            variant={practiceMode ? "default" : "outline"}
                            onClick={() => {
                                const newVal = !practiceMode;
                                setPracticeMode(newVal);
                                if (!newVal) setOfflineMode(false);
                            }}
                            className={`w-full h-10 text-xs font-bold tracking-widest uppercase transition-all ${practiceMode
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-sky-400 hover:text-sky-500'
                                }`}
                        >
                            {practiceMode ? "PRACTICE MODE: ACTIVE (NO REWARD)" : "ENABLE PRACTICE MODE"}
                        </Button>
                    </div>

                    {/* Game Difficulty Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {['STANDARD', 'ADVANCED', 'EXPERT', 'ELITE'].map((diff) => (
                            <Button
                                key={diff}
                                onClick={() => startGame(diff as Difficulty, practiceMode)}
                                className="h-14 bg-white border-2 border-slate-200 hover:border-sky-500 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg shadow-sm flex flex-col items-center justify-center transition-all group"
                            >
                                <span className="font-black uppercase tracking-widest text-xs group-hover:scale-105 transition-transform">{diff}</span>
                                <span className="text-[10px] text-slate-400 font-mono group-hover:text-sky-500">
                                    {diff === 'STANDARD' ? '1.0s BASE' : diff === 'ADVANCED' ? '0.5s BASE' : diff === 'EXPERT' ? '0.2s BASE' : '0.1s'}
                                </span>
                            </Button>
                        ))}
                    </div>

                </div>
                <Button variant="ghost" className="mt-8 text-slate-400 hover:text-red-500" onClick={onExit}>EXIT SIMULATION</Button>
            </div>
        );
    }

    // Fallback Loading (Priority 3)
    if (!gameState) return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-sky-400 font-mono p-10 space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full mb-4"></div>
            <div className="text-xl font-bold tracking-[0.2em] animate-pulse">Wait...</div>
            <div className="text-xs text-sky-600">LOADING ASSETS...</div>
        </div>
    );

    const correctType = ['A', 'B', 'C', 'D'][correctOptionIndex];

    return (
        <div className="w-full h-full bg-slate-100 flex flex-col p-4 relative font-sans">
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Left: Game Grid Container (City Frame) */}
                <div className="relative flex-1 bg-slate-200 border-4 border-white rounded-xl overflow-hidden flex flex-col items-center group shadow-xl ring-1 ring-slate-900/5">

                    {/* TOP HUD (Integrated - Stacked for Readability) */}
                    <div className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 flex flex-col z-10 shrink-0 shadow-sm">
                        {/* Row 1: Status & Timer */}
                        <div className="w-full flex justify-between items-center p-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-bold text-xs bg-slate-100 text-slate-600 border border-slate-200 shadow-none">{difficulty}</Badge>
                                <div className="hidden sm:flex flex-col items-start leading-none">
                                    <span className="text-[10px] font-black text-slate-300 tracking-widest">PROTOCOL V.2.0</span>
                                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                                        SCORE: {(gameState.score || 0).toLocaleString()} <span className="text-slate-300">|</span> Q: {solvedCount}/10
                                    </span>
                                </div>
                            </div>

                            {/* Timer */}
                            <div className={`text-2xl font-black tabular-nums tracking-tighter ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-700'} drop-shadow-sm`}>
                                {gameState.timeLeft}<span className="text-xs font-bold text-slate-400 align-top ml-1">s</span>
                            </div>
                        </div>

                        {/* Row 2: Directive (Question) */}
                        <div className="w-full px-4 py-3 bg-slate-50/50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50"></div>
                            <div className="text-[10px] text-sky-600 uppercase tracking-widest font-black mb-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                                Current Directive
                            </div>
                            <div className="text-slate-800 font-bold text-sm leading-relaxed text-balance pr-2">
                                {loadingQuiz ? <span className="animate-pulse text-slate-400">ESTABLISHING DATA LINK...</span> : (
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                        {currentQuestion}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-300 pattern-grid-lg text-slate-300">
                        {/* IDLE WARNING OVERLAY */}
                        {showIdleWarning && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/40 backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in-95">
                                <div className="bg-red-600 text-white px-8 py-4 rounded-xl border-4 border-red-500 shadow-2xl flex flex-col items-center animate-pulse">
                                    <AlertTriangle className="w-12 h-12 mb-2" />
                                    <h2 className="text-2xl font-black uppercase tracking-widest">Inactivity Detected</h2>
                                    <p className="font-bold font-mono">DRAINING RESOURCES</p>
                                </div>
                            </div>
                        )}
                        <canvas
                            ref={canvasRef}
                            width={GRID_WIDTH * TILE_SIZE}
                            height={GRID_HEIGHT * TILE_SIZE}
                            className={`shadow-2xl rounded ${gameState.traffic === 'RED' ? 'ring-4 ring-red-500/20' : ''}`}
                        />

                        {/* Traffic Light Indicator (Proximity) */}
                        <div className={`absolute top-4 right-4 flex gap-1 p-2 bg-slate-900/90 rounded-full shadow-lg pointer-events-none transition-transform ${gameState.traffic !== 'GREEN' ? 'scale-110' : 'scale-100'}`}>
                            <div className={`w-3 h-3 rounded-full ${gameState.traffic === 'RED' ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-red-900'}`} />
                            <div className={`w-3 h-3 rounded-full ${gameState.traffic === 'YELLOW' ? 'bg-amber-500 shadow-[0_0_10px_orange]' : 'bg-amber-900'}`} />
                            <div className={`w-3 h-3 rounded-full ${gameState.traffic === 'GREEN' ? 'bg-emerald-500 shadow-[0_0_10px_emerald]' : 'bg-emerald-900'}`} />
                        </div>

                        {/* Controls Overlay (Bottom) */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex gap-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white/90 px-6 py-2 rounded-full border border-slate-200 shadow-lg backdrop-blur-sm">
                                <span>WASD: Drive</span>
                                <span>SPACE: Collect</span>
                                <span>X: Drop</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Data/Inventory (HUD Sidebar - Clean) */}
                <div className="w-64 flex flex-col gap-4">
                    {/* Options Legend */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Decryption Keys</div>
                        <div className="space-y-2">
                            {currentOptions.map((opt, i) => {
                                const type = ['A', 'B', 'C', 'D'][i];
                                const colorClass = type === 'A' ? 'text-sky-500 bg-sky-50 border-sky-100' : type === 'B' ? 'text-rose-500 bg-rose-50 border-rose-100' : type === 'C' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-amber-500 bg-amber-50 border-amber-100';
                                return (
                                    <div key={i} className={`text-xs flex flex-col p-2 rounded border ${colorClass} ${i === currentCorrectIndex ? 'ring-2 ring-offset-1 ring-slate-200' : ''} transition-all`}>
                                        <span className="font-black text-[10px] uppercase mb-1">Key {type}</span>
                                        <div className="text-slate-700 font-medium leading-tight">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {opt}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Inventory Stack using Real Fragments */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex-1 flex flex-col">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Fragment Stack</div>
                        <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col-reverse gap-2 justify-start overflow-hidden relative">
                            {gameState.inventory.map((item, i) => (
                                <div key={i} className="bg-white border shadow-sm p-3 rounded flex justify-between items-center animate-in slide-in-from-bottom-2">
                                    <span className="text-[10px] font-bold text-slate-400">DATA_BLOCK</span>
                                    <Badge className={`${item === 'A' ? 'bg-sky-500' : item === 'B' ? 'bg-rose-500' : item === 'C' ? 'bg-emerald-500' : 'bg-amber-500'} hover:bg-slate-700`}>{item}</Badge>
                                </div>
                            ))}
                            {gameState.inventory.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">Buffer Empty</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                            <span>Target: {['A', 'B', 'C', 'D'][currentCorrectIndex]}</span>
                            <span>Cap: {gameState.inventory.length}/4</span>
                        </div>
                    </div>

                    <div className={`text-xs font-bold text-center p-3 rounded-lg uppercase tracking-wider ${gameState.traffic === 'RED' ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {msg}
                    </div>
                </div>
            </div >
        </div >
    );
}
