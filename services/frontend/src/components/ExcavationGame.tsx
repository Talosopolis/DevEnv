import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "./ui/button";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Trophy, ShieldAlert } from "lucide-react";

type ExcavationGameProps = {
    courseId: string;
    topic: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    contextContent?: string;
    onPass: (score: number) => void;
    onFail: () => void;
    onExit: () => void;
};

// --- GAME CONSTANTS ---
const GRID_WIDTH = 25; // Wider for better layout
const GRID_HEIGHT = 16;
const TILE_SIZE = 32;

type EntityType = 'EMPTY' | 'DIRT' | 'ROCK' | 'WALL' | 'PLAYER' | 'ENEMY' | 'ARTIFACT';

interface Entity {
    id: string;
    type: EntityType;
    x: number;
    y: number;
    value?: string;
    optionIndex?: number;
    falling?: boolean;
    fallStart?: number;
}

export default function ExcavationGame({ question: initialQuestion, options: initialOptions, correctOptionIndex: initialCorrectIndex, contextContent, onPass, onFail, onExit }: ExcavationGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Game State
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'WON' | 'LOST'>('START');
    const [score, setScore] = useState(0);
    const [gremlinActive, setGremlinActive] = useState(false);
    const [gremlinTimer, setGremlinTimer] = useState(10);

    // Quiz State
    const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
    const [currentOptions] = useState(initialOptions);

    // Refs
    const gridRef = useRef<EntityType[][]>([]);
    const entitiesRef = useRef<Entity[]>([]);
    const playerRef = useRef<{ x: number, y: number, dir: 'left' | 'right' | 'up' | 'down' | 'idle' }>({ x: 10, y: 1, dir: 'idle' });
    const gremlinRef = useRef<{ x: number, y: number, state: 'WAIT' | 'CHASE', lastMove: number, dropStart: number }>({ x: 10, y: 0, state: 'WAIT', lastMove: 0, dropStart: 0 });
    const lastTickRef = useRef<number>(0);
    const frameIdRef = useRef<number>(0);

    // --- INITIALIZATION ---
    const initGame = useCallback(() => {
        // Init logic for question extraction if needed...
        if (contextContent && contextContent.length > 50) {
            const sentences = contextContent.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
            if (sentences.length > 0) {
                const targetSentence = sentences[Math.floor(Math.random() * sentences.length)].trim();
                setCurrentQuestion(`Analyze: ${targetSentence.substring(0, 60)}...`);
            }
        }

        const newGrid: EntityType[][] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            const row: EntityType[] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (y === 0 || y === GRID_HEIGHT - 1 || x === 0 || x === GRID_WIDTH - 1) {
                    row.push('WALL');
                } else if (y < 3) {
                    row.push('EMPTY');
                } else {
                    const rand = Math.random();
                    if (rand < 0.1) row.push('ROCK');
                    else if (rand < 0.85) row.push('DIRT');
                    else row.push('EMPTY');
                }
            }
            newGrid.push(row);
        }
        gridRef.current = newGrid;

        const artifacts: Entity[] = [];
        const usedLocs = new Set<string>();
        initialOptions.forEach((opt, idx) => {
            let placed = false;
            while (!placed) {
                const ax = 2 + Math.floor(Math.random() * (GRID_WIDTH - 4));
                const ay = 8 + Math.floor(Math.random() * (GRID_HEIGHT - 9));
                const key = `${ax},${ay}`;
                if (gridRef.current[ay][ax] !== 'WALL' && !usedLocs.has(key)) {
                    gridRef.current[ay][ax] = 'DIRT';
                    artifacts.push({
                        id: `art-${idx}`,
                        type: 'ARTIFACT',
                        x: ax,
                        y: ay,
                        value: opt,
                        optionIndex: idx
                    });
                    usedLocs.add(key);
                    placed = true;
                }
            }
        });

        playerRef.current = { x: Math.floor(GRID_WIDTH / 2), y: 1, dir: 'idle' };
        gremlinRef.current = { x: Math.floor(GRID_WIDTH / 2), y: 0, state: 'WAIT', lastMove: Date.now(), dropStart: Date.now() };

        entitiesRef.current = [...artifacts];
        setGameState('PLAYING');
        setScore(0);
        setGremlinActive(false);
        setGremlinTimer(10);
    }, [initialOptions, contextContent]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'PLAYING') return;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowUp') dy = -1;
            if (e.key === 'ArrowDown') dy = 1;
            if (e.key === 'ArrowLeft') dx = -1;
            if (e.key === 'ArrowRight') dx = 1;
            if (dx !== 0 || dy !== 0) movePlayer(dx, dy);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    const movePlayer = (dx: number, dy: number) => {
        const px = playerRef.current.x;
        const py = playerRef.current.y;
        const nx = px + dx;
        const ny = py + dy;

        if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) return;
        const tile = gridRef.current[ny][nx];

        if (tile === 'WALL') return;
        if (tile === 'ROCK') {
            if (dx !== 0 && gridRef.current[ny][nx + dx] === 'EMPTY') {
                gridRef.current[ny][nx] = 'EMPTY';
                gridRef.current[ny][nx + dx] = 'ROCK';
            } else {
                return;
            }
        }
        if (tile === 'DIRT') {
            gridRef.current[ny][nx] = 'EMPTY';
            setScore(prev => prev + 10);
        }
        const artifact = entitiesRef.current.find(e => e.type === 'ARTIFACT' && e.x === nx && e.y === ny);
        if (artifact) {
            if (artifact.optionIndex === initialCorrectIndex) {
                setGameState('WON');
                onPass(100);
                toast.success("Correct Answer!");
            } else {
                setGameState('LOST');
                onFail();
                toast.error("Incorrect Artifact!");
            }
            return;
        }
        playerRef.current.x = nx;
        playerRef.current.y = ny;
        playerRef.current.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    };

    // Timer logic
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setGremlinTimer(prev => {
                if (prev <= 1) {
                    setGremlinActive(true);
                    gremlinRef.current.state = 'CHASE';
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    // Pathfinding
    const findPathToPlayer = (gx: number, gy: number, px: number, py: number) => {
        const queue = [{ x: gx, y: gy, path: [] as { x: number, y: number }[] }];
        const visited = new Set<string>();
        visited.add(`${gx},${gy}`);
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.x === px && current.y === py) return current.path[0] || null;
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of dirs) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) continue;
                if (visited.has(`${nx},${ny}`)) continue;
                const tile = gridRef.current[ny][nx];
                if (tile !== 'DIRT' && tile !== 'ROCK' && tile !== 'WALL') {
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, path: [...current.path, { x: nx, y: ny }] });
                }
            }
        }
        return null;
    };

    // BG Cache
    const bgCacheRef = useRef<{ h: number }[]>([]);
    useEffect(() => {
        const buildings = [];
        for (let i = 0; i < GRID_WIDTH * TILE_SIZE; i += 20) {
            buildings.push({ h: Math.random() * 60 + 20 });
        }
        bgCacheRef.current = buildings;
    }, []);

    // Draw Loop
    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const time = Date.now();
        const surfaceY = 3 * TILE_SIZE;

        // Background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, surfaceY, GRID_WIDTH * TILE_SIZE, (GRID_HEIGHT - 3) * TILE_SIZE);
        const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceY);
        skyGrad.addColorStop(0, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GRID_WIDTH * TILE_SIZE, surfaceY);

        ctx.fillStyle = '#1e3a8a';
        bgCacheRef.current.forEach((b, i) => {
            ctx.fillRect(i * 20, surfaceY - b.h, 22, b.h);
        });

        // Crane
        const craneBaseX = GRID_WIDTH * TILE_SIZE - 50;
        const pivotY = 40;
        const sway = Math.sin(time / 2000) * 0.02;

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Mast
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        const mastW = 20;
        const mastL = craneBaseX - mastW / 2;
        const mastR = craneBaseX + mastW / 2;

        ctx.beginPath();
        ctx.moveTo(mastL, surfaceY); ctx.lineTo(mastL, pivotY + 10);
        ctx.moveTo(mastR, surfaceY); ctx.lineTo(mastR, pivotY + 10);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        const mastSegH = 24;
        ctx.beginPath();
        let mastCnt = 0;
        for (let y = surfaceY; y > pivotY + 10; y -= mastSegH) {
            ctx.moveTo(mastL, y); ctx.lineTo(mastR, y);
            if (y - mastSegH > pivotY + 10) {
                if (mastCnt % 2 === 0) { ctx.moveTo(mastL, y); ctx.lineTo(mastR, y - mastSegH); }
                else { ctx.moveTo(mastR, y); ctx.lineTo(mastL, y - mastSegH); }
            }
            mastCnt++;
        }
        ctx.stroke();

        // Slewing
        ctx.save();
        ctx.translate(craneBaseX, pivotY);
        ctx.rotate(sway);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(-12, 0, 24, 15);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-25, -10, 20, 25);
        ctx.fillStyle = '#bae6fd'; ctx.fillRect(-22, -5, 12, 12);

        // Apex (Triangle)
        const apexH = 50;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(0, -apexH); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.stroke();

        // Jib
        const jibLen = 240;
        const jibH = 18;
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -jibH); ctx.lineTo(-jibLen, -jibH);
        ctx.moveTo(0, 0); ctx.lineTo(-jibLen, 0);
        ctx.stroke();

        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const jibSegW = 20;
        const segs = Math.floor(jibLen / jibSegW);
        for (let i = 0; i < segs; i++) {
            const xCurr = -(i * jibSegW);
            const xNext = -((i + 1) * jibSegW);
            ctx.moveTo(xCurr, 0); ctx.lineTo(xCurr, -jibH);
            if (i % 2 === 0) { ctx.moveTo(xCurr, 0); ctx.lineTo(xNext, -jibH); }
            else { ctx.moveTo(xCurr, -jibH); ctx.lineTo(xNext, 0); }
        }
        ctx.moveTo(-jibLen, 0); ctx.lineTo(-jibLen, -jibH);
        ctx.stroke();

        // Jib Tip Feature (Right Triangle)
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-jibLen, -jibH);
        ctx.lineTo(-jibLen - 30, -jibH);
        ctx.lineTo(-jibLen, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-jibLen - 30, -jibH, 3, 0, Math.PI * 2); ctx.fill();

        // Counter Jib
        const cJibLen = 80;
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -jibH); ctx.lineTo(cJibLen, -jibH);
        ctx.moveTo(0, 0); ctx.lineTo(cJibLen, 0);
        ctx.stroke();

        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const cSegs = Math.floor(cJibLen / jibSegW);
        for (let i = 0; i < cSegs; i++) {
            const xCurr = (i * jibSegW);
            const xNext = ((i + 1) * jibSegW);
            ctx.moveTo(xCurr, 0); ctx.lineTo(xCurr, -jibH);
            if (i % 2 === 0) { ctx.moveTo(xCurr, -jibH); ctx.lineTo(xNext, 0); }
            else { ctx.moveTo(xCurr, 0); ctx.lineTo(xNext, -jibH); }
        }
        ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.fillRect(cJibLen - 25, -jibH + 2, 30, jibH + 10);

        // Pendants
        ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -apexH); ctx.lineTo(-jibLen * 0.5, -jibH);
        ctx.moveTo(0, -apexH); ctx.lineTo(-jibLen * 0.9, -jibH);
        ctx.moveTo(0, -apexH); ctx.lineTo(cJibLen * 0.9, -jibH);
        ctx.stroke();

        // Trolley
        const tipLocalX = -jibLen;
        const tipLocalY = 0;
        ctx.fillStyle = '#334155'; ctx.fillRect(tipLocalX - 8, -6, 16, 10);

        ctx.restore();
        ctx.restore();

        // Gremlin Drop Logic
        const cosS = Math.cos(sway);
        const sinS = Math.sin(sway);
        const tipWorldX = craneBaseX + (tipLocalX * cosS - tipLocalY * sinS);
        const tipWorldY = pivotY + (tipLocalX * sinS + tipLocalY * cosS);

        let gx: number, gy: number;
        let hookY = tipWorldY;
        let hookX = tipWorldX;

        // Force Visual Wait if Timer > 0 (Self-repairing)
        const isWaiting = gremlinTimer > 0;

        if (isWaiting) {
            if (gremlinRef.current.dropStart === 0) gremlinRef.current.dropStart = Date.now();
            const maxDropY = surfaceY - TILE_SIZE;
            const totalDropDist = maxDropY - tipWorldY;
            const elapsed = Date.now() - gremlinRef.current.dropStart;
            const progress = Math.max(0, Math.min(1, elapsed / 10000));
            const currentLen = progress * totalDropDist;

            hookX = tipWorldX;
            hookY = tipWorldY + currentLen;
            gy = hookY - TILE_SIZE / 2 + 10;
            gx = tipWorldX - TILE_SIZE / 2;

            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(tipWorldX, tipWorldY); ctx.lineTo(hookX, hookY); ctx.stroke();

            ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(hookX, hookY - 12, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(hookX, hookY - 12); ctx.lineTo(hookX, hookY); ctx.stroke();
            ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hookX, hookY, 5, 0, Math.PI, false); ctx.stroke();
        } else {
            gx = gremlinRef.current.x * TILE_SIZE;
            gy = gremlinRef.current.y * TILE_SIZE;
            ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(tipWorldX, tipWorldY + 12, 6, 0, Math.PI * 2); ctx.fill();
        }

        // Draw Grid & Tiles
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= GRID_WIDTH; i++) { ctx.moveTo(i * TILE_SIZE, surfaceY); ctx.lineTo(i * TILE_SIZE, GRID_HEIGHT * TILE_SIZE); }
        for (let i = 3; i <= GRID_HEIGHT; i++) { ctx.moveTo(0, i * TILE_SIZE); ctx.lineTo(GRID_WIDTH * TILE_SIZE, i * TILE_SIZE); }
        ctx.stroke();

        gridRef.current.forEach((row, y) => {
            if (y < 3) return;
            row.forEach((tile, x) => {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                if (tile === 'DIRT') {
                    ctx.fillStyle = '#7c2d12'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(px + 8, py + 8, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px, py, TILE_SIZE, 2);
                } else if (tile === 'ROCK') {
                    ctx.fillStyle = '#57534e'; ctx.beginPath();
                    ctx.moveTo(px + 8, py); ctx.lineTo(px + 24, py); ctx.lineTo(px + 32, py + 8);
                    ctx.lineTo(px + 32, py + 24); ctx.lineTo(px + 24, py + 32); ctx.lineTo(px + 8, py + 32);
                    ctx.lineTo(px, py + 24); ctx.lineTo(px, py + 8); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(px + 12, py + 12, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(px + 22, py + 20, 2, 0, Math.PI * 2); ctx.fill();
                } else if (tile === 'WALL') {
                    ctx.fillStyle = '#262626'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#eab308'; ctx.beginPath();
                    ctx.moveTo(px, py); ctx.lineTo(px + 16, py); ctx.lineTo(px, py + 16); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(px + 16, py + 32); ctx.lineTo(px + 32, py + 16); ctx.lineTo(px + 32, py + 32); ctx.fill();
                }
            });
        });

        // Entities
        entitiesRef.current.forEach(e => {
            if (e.type === 'ARTIFACT') {
                const px = e.x * TILE_SIZE;
                const py = e.y * TILE_SIZE;
                const isBuried = gridRef.current[e.y][e.x] === 'DIRT';
                ctx.fillStyle = '#0d9488'; ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.fillStyle = '#2dd4bf'; ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
                const label = ['A', 'B', 'C', 'D'][e.optionIndex || 0];
                ctx.fillText(label, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 4);
                if (isBuried) { ctx.fillStyle = 'rgba(60, 20, 0, 0.6)'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
            }
        });

        // Player
        const { x, y } = playerRef.current;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2 - 4, 9, Math.PI, 0);
        ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE / 2 - 4); ctx.lineTo(px + 4, py + TILE_SIZE / 2 - 4); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(px + 12, py + 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 20, py + 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(px + 13 + (playerRef.current.dir === 'right' ? 1 : -1), py + 10, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 21 + (playerRef.current.dir === 'right' ? 1 : -1), py + 10, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f97316'; ctx.fillRect(px + 9, py + TILE_SIZE / 2 - 2, 14, 14);

        // Gremlin Draw (On Top of Hook)
        ctx.save();
        ctx.translate(gx + TILE_SIZE / 2, gy + TILE_SIZE / 2);
        const wobble = Math.sin(time / 150) * 0.1; ctx.rotate(wobble);
        ctx.fillStyle = isWaiting ? '#a855f7' : '#ef4444';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-3, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(-3, -2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#581c87'; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-8, -13); ctx.lineTo(-2, -9); ctx.fill();
        ctx.beginPath(); ctx.moveTo(5, -7); ctx.lineTo(8, -13); ctx.lineTo(2, -9); ctx.fill();
        ctx.restore();
    };

    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const loop = (time: number) => {
            const dt = time - lastTickRef.current;
            if (dt > 100) {
                lastTickRef.current = time;
                if (!gremlinTimer && gremlinRef.current.state === 'WAIT') gremlinRef.current.state = 'CHASE';
                if (gremlinRef.current.state === 'CHASE') {
                    if (time - gremlinRef.current.lastMove > 500) {
                        const nextStep = findPathToPlayer(
                            gremlinRef.current.x, gremlinRef.current.y,
                            playerRef.current.x, playerRef.current.y
                        );
                        if (nextStep) {
                            gremlinRef.current.x = nextStep.x;
                            gremlinRef.current.y = nextStep.y;
                        }
                        gremlinRef.current.lastMove = time;
                        if (gremlinRef.current.x === playerRef.current.x && gremlinRef.current.y === playerRef.current.y) {
                            setGameState('LOST');
                            onFail();
                            toast.error("Caught by the Anti-Idle Gremlin!");
                        }
                    }
                }
            }
            draw();
            frameIdRef.current = requestAnimationFrame(loop);
        };
        frameIdRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameIdRef.current);
    }, [gameState, gremlinTimer]); // Added gremlinTimer dependence to catch state switch? No, timer updates every sec.

    // Actually, draw() uses state from closure if not refuted. But we used ref for current.
    // We added `isWaiting` inside draw that depends on `gremlinTimer`.
    // The `draw` function is defined inside component, captures current strict `gremlinTimer`.
    // So if `gremlinTimer` changes, `draw` needs to be recreated?
    // The loop calls `draw` from closure. 
    // If we use `useCallback` for draw, or if we use a ref for timer?
    // Ah! `draw` is defined in render scope. `useEffect` closes over INITIAL `draw` if not in deps.
    // The `useEffect` has `gameState` dep.
    // `draw` depends on `gremlinTimer`.
    // We need `useEffect` to update when `draw` updates?
    // Or better: use a Ref for `gremlinTimer` inside the loop? 
    // Or just let `draw` read `gremlinTimer`.
    // BUT `useEffect` closure captures `draw` at start. `draw` captures `gremlinTimer` at start.
    // So `draw` sees STALE `gremlinTimer`.
    // FIX: Use a Ref for `gremlinTimer` or include it in dependency.
    // If I include `gremlinTimer` in dependency, the loop restarts every second. That's fine.

    useEffect(() => {
        if (gameState === 'START') initGame();
    }, [gameState, initGame]);

    return (
        <div className="flex flex-col h-full bg-stone-950">
            <div className="flex justify-between items-center px-4 py-2 border-b border-stone-800 bg-stone-900 shrink-0">
                <div className="flex flex-col">
                    <span className="text-stone-500 uppercase tracking-widest text-[10px]">Depth</span>
                    <span className="text-amber-500 font-bold text-lg">{score}m</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors ${gremlinActive ? 'bg-red-950/50 border-red-900/50 text-red-500 animate-pulse' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                    <ShieldAlert className="w-4 h-4" />
                    <span className="uppercase tracking-widest text-[10px] font-bold">
                        {gremlinActive ? "THREAT DETECTED" : `INCOMING: ${gremlinTimer}s`}
                    </span>
                </div>
                <Button onClick={() => initGame()} size="icon" variant="ghost" className="text-stone-500 hover:text-amber-500">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>
            <div className="bg-stone-950 px-4 py-2 border-b border-amber-900/20 text-center shrink-0">
                <p className="text-stone-300 font-serif text-sm leading-tight">{currentQuestion}</p>
            </div>
            <div className="flex-1 overflow-hidden relative bg-stone-950 flex items-center justify-center p-2">
                <canvas ref={canvasRef} width={GRID_WIDTH * TILE_SIZE} height={GRID_HEIGHT * TILE_SIZE} className="border-4 border-stone-800 bg-stone-900 shadow-2xl max-h-full max-w-full object-contain" />
                {(gameState === 'WON' || gameState === 'LOST') && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-50">
                        {gameState === 'WON' ? (
                            <>
                                <Trophy className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
                                <h2 className="text-2xl font-black text-amber-500 uppercase tracking-widest mb-2">Artifact Recovered</h2>
                                <Button onClick={onExit} className="bg-amber-600 hover:bg-amber-700 text-stone-900 font-bold">Process Data</Button>
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                                <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest mb-2">Excavation Failed</h2>
                                <div className="flex gap-4">
                                    <Button onClick={initGame} variant="outline" className="border-stone-700">Retry</Button>
                                    <Button onClick={onExit} variant="ghost" className="text-red-500">Abort</Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div className="p-3 bg-stone-900 border-t border-stone-800 shrink-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {currentOptions.map((opt, idx) => (
                        <div key={idx} className={`p-2 border rounded flex items-center gap-2 ${gameState === 'WON' && idx === currentCorrectIndex ? 'bg-green-950/30 border-green-900 text-green-400' : 'bg-stone-950 border-stone-800 text-stone-400'}`}>
                            <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${gameState === 'WON' && idx === currentCorrectIndex ? 'bg-green-500 text-stone-900' : 'bg-stone-800 text-stone-500'}`}>{['A', 'B', 'C', 'D'][idx]}</span>
                            <span className="truncate">{opt}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
