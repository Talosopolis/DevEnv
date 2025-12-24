import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Shield, Zap, Skull, Crosshair, Info, RefreshCw, Key, HelpCircle, EyeOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// --- Types ---
interface SpaceInvadersProps {
    topic: string;
    courseId?: string;
    onExit: () => void;
}

interface Bullet { x: number; y: number; active: boolean; }
interface Bomb { x: number; y: number; vx: number; vy: number; active: boolean; type: 'STRAIGHT' | 'SINE' | 'TRACKING' | 'PIERCING' | 'CLUSTER' | 'CLUSTER_FRAG'; initialX: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; type?: 'GLITCH' | 'SPARK' }
interface Enemy {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    isCorrect: boolean;
    active: boolean;
    index: number;
    vx: number;
    vy: number;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'STREAMER'
type GameState = 'menu' | 'loading' | 'playing' | 'victory' | 'gameover'

// --- Config ---
// Renamed Keys but mapped purely for logic. The Labels are what the user sees.
const CONFIG = {
    EASY: {
        enemySpeed: 0.7,
        fireRate: 0.002, scoreMult: 1,
        color: 'text-purple-400', label: 'CADET', subtitle: 'EASY',
        desc: 'Standard Ballistics'
    },
    MEDIUM: {
        enemySpeed: 2.5, fireRate: 0.008, scoreMult: 1.5,
        color: 'text-green-400', label: 'CAPTAIN', subtitle: 'MEDIUM',
        desc: '+ Sine Wave (Green)'
    },
    HARD: {
        enemySpeed: 4.5, fireRate: 0.02, scoreMult: 3,
        color: 'text-yellow-400', label: 'VETERAN', subtitle: 'HARD',
        desc: '+ Tracking (Red) & Piercing (Yel)'
    },
    STREAMER: {
        enemySpeed: 6, fireRate: 0.05, scoreMult: 5,
        color: 'text-blue-500', label: 'STREAMER', subtitle: 'GIT GUD',
        desc: '+ Cluster (Blue) & Maximum Chaos'
    }
}

// --- Props ---
interface SpaceInvadersProps {
    topic: string;
    courseId?: string;
    onExit: () => void;
    mode?: 'arcade' | 'assessment';
    questionCount?: number;
    onPass?: (score: number) => void;
    onFail?: () => void;
    contextNotes?: string[];
    contextContent?: string;
}

const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ topic, courseId, onExit, mode = 'arcade', questionCount = 10, onPass, onFail, contextNotes = [], contextContent = "" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // --- State ---
    const [gameState, setGameState] = useState<GameState>('menu')
    const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM')
    const [score, setScore] = useState(0)

    // --- New Features (Restored from Iteration) ---
    // --- New Features (Restored from Iteration) ---
    const [practiceMode, setPracticeMode] = useState(false)
    const [qDiffIndex, setQDiffIndex] = useState(0)
    const QUESTION_DIFF_LEVELS = [1, 1.5, 3, 5]
    const [highScores, setHighScores] = useState<{ name: string, score: number, difficulty: string }[]>([
        { name: "SoloMan", score: 62500, difficulty: "STREAMER" },
        { name: "HaramABeef", score: 58000, difficulty: "STREAMER" },
        { name: "Thaumiel", score: 45000, difficulty: "HARD" },
        { name: "Keter", score: 32000, difficulty: "HARD" },
        { name: "Euclid", score: 12000, difficulty: "MEDIUM" }
    ])
    const [showLeaderboard, setShowLeaderboard] = useState(false)

    const [displayScore, setDisplayScore] = useState(0)
    const scoreRef = useRef(0)
    const seenQuestions = useRef<string[]>([])
    const [health, setHealth] = useState(100)

    const [questionsCorrect, setQuestionsCorrect] = useState(0)
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
    const [autoRestart, setAutoRestart] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const [shotsRemaining, setShotsRemaining] = useState(3)
    const [reducedMotion, setReducedMotion] = useState(false) // Accessibility

    const [currentQuestion, setCurrentQuestion] = useState<string>("")
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

    // --- Refs (Mutable Game Engine State) ---
    // Question Queue Ref
    const nextQuestionRef = useRef<{ question: string; options: string[]; correct_option_index: number } | null>(null)

    // ... (References)
    const playerX = useRef(300)
    const bullets = useRef<Bullet[]>([])
    const bombs = useRef<Bomb[]>([])
    const enemies = useRef<Enemy[]>([])
    const [enemyList, setEnemyList] = useState<{ index: number, text: string }[]>([]) // React State for DOM overlay
    const particles = useRef<Particle[]>([])

    const bgParticles = useRef<{ x: number, y: number, vy: number, color: string }[]>([]) // Background greebles
    const menuParticles = useRef<Particle[]>([]) // Distinct particles for menu
    const keys = useRef<{ [key: string]: boolean }>({})
    const lastShotTime = useRef(0)
    const requestId = useRef<number | undefined>(undefined)
    const shakeIntensity = useRef(0)
    const isTransitioning = useRef(false)

    const bgWarp = useRef({
        val: 0, target: 0,
        color: '#1e293b', // Base Grid Color
        bloom: 0,
        flood: { color: '', opacity: 0 }, // Background Flood
        type: 'NORMAL' as 'NORMAL' | 'PULSE' | 'GLITCH' | 'WARP',
        direction: 1 // 1 or -1 for Twist Direction
    })
    const shieldFizzle = useRef(0)

    // Shield State
    const shieldEnergy = useRef(100)
    const isShielding = useRef(false)
    const SHIELD_DRAIN = 100 / (5 * 60)
    const SHIELD_RECHARGE = 100 / (15 * 60)

    // Countdown State
    const countdown = useRef<number | null>(null)

    // Constants
    const TOTAL_QUESTIONS = 10
    const PASS_THRESHOLD = Math.ceil(TOTAL_QUESTIONS * 0.7)
    const CANVAS_WIDTH = 800
    const CANVAS_HEIGHT = 600
    const PLAYER_SPEED = 6
    const BULLET_SPEED = 10
    const BOMB_SPEED = 4
    const MAX_AMMO = 3

    // Logic Refs
    const ammoRef = useRef(MAX_AMMO)

    // --- Helpers ---
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ')
        let line = ''
        let currentY = y

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' '
            const metrics = ctx.measureText(testLine)
            const testWidth = metrics.width
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY)
                line = words[n] + ' '
                currentY += lineHeight
            } else {
                line = testLine
            }
        }
        ctx.fillText(line, x, currentY)
        return currentY + lineHeight
    }

    const createExplosion = (x: number, y: number, color: string, type: 'SPARK' | 'GLITCH' = 'SPARK') => {
        if (reducedMotion) return; // Accessibility Check

        for (let i = 0; i < 20; i++) {
            const speed = type === 'GLITCH' ? 15 : 10
            particles.current.push({
                x, y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                life: 1.0,
                color,
                type
            })
        }
    }

    const loadNextQuestion = useCallback(async (overrideDiff?: Difficulty, nextIndex?: number) => {
        const currentDiff = overrideDiff || difficulty
        const targetIndex = nextIndex !== undefined ? nextIndex : activeQuestionIdx

        if (targetIndex >= TOTAL_QUESTIONS && !overrideDiff) {
            const finalPercent = (questionsCorrect / TOTAL_QUESTIONS) * 100
            if (questionsCorrect >= PASS_THRESHOLD) { // 70%
                setGameState('victory')
                onPass?.(Math.round(finalPercent))
            } else {
                setGameState('gameover')
                onFail?.()
            }
            return
        }

        // HANGOVER FIX: Aggressive Cleanup
        bullets.current = []
        bombs.current = []
        particles.current = [] // Clear explosions
        // Keep bgParticles for continuity? Or clear to be safe? Let's keep bgParticles (stars).

        if (overrideDiff) {
            setGameState('loading')
            // Reset Queue on new game
            nextQuestionRef.current = null
        }

        setFeedbackMessage(null)
        setShotsRemaining(MAX_AMMO)
        ammoRef.current = MAX_AMMO
        isTransitioning.current = false

        // QUEUE LOGIC
        let data;
        let usedQueue = false

        try {

            if (practiceMode) throw new Error("Practice Mode Enabled")

            // 1. Check Queue
            if (nextQuestionRef.current && !overrideDiff) {
                console.log("Using Queued Question")
                data = nextQuestionRef.current
                nextQuestionRef.current = null // Consume
                usedQueue = true
            } else {
                // 2. Fetch Immediately (Initial Load or Queue Empty)
                const payload = {
                    topic,
                    dataset: 'default',
                    course_id: courseId,
                    difficulty: ['easy', 'medium', 'hard', 'spartan'][qDiffIndex] || 'medium',
                    question_index: targetIndex,

                    previous_questions: seenQuestions.current,
                    context_notes: contextNotes,
                    context_content: contextContent
                }
                console.log("DEBUG: Sending Quiz Payload:", payload)
                const res = await fetch('http://localhost:8000/generate-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                console.log("Context sent:", { notes: contextNotes?.length, content: contextContent?.slice(0, 50) })
                if (!res.ok) throw new Error("API Error")
                data = await res.json()
            }

            // 3. Process Data
            const qText = data.question || "Error loading question."
            setCurrentQuestion(qText)
            seenQuestions.current.push(qText)

            const config = (CONFIG as any)[currentDiff]
            let baseInitSpeed = config.enemySpeed
            if (currentDiff === 'STREAMER') baseInitSpeed += questionsCorrect * 0.8
            if (currentDiff === 'HARD') baseInitSpeed += questionsCorrect * 0.4

            const newEnemies: Enemy[] = (data.options || []).map((opt: string, i: number) => {
                const speedMult = currentDiff === 'STREAMER' ? 1.2 : 1.0
                const vx = (Math.random() > 0.5 ? 1 : -1) * (baseInitSpeed * (0.8 + Math.random() * 0.4)) * speedMult
                const vy = (Math.random() > 0.5 ? 1 : -1) * (baseInitSpeed * (0.8 + Math.random() * 0.4)) * speedMult
                const safeW = 250
                const safeH = 80
                const xSlot = (i % 2) * 350 + 50
                const ySlot = Math.floor(i / 2) * 100 + 50

                return {
                    x: xSlot + Math.random() * 50,
                    y: ySlot + Math.random() * 20,
                    width: safeW, height: safeH, text: opt, isCorrect: i === data.correct_option_index,
                    active: true, index: i, vx, vy
                }
            })
            enemies.current = newEnemies
            setEnemyList(newEnemies.map(e => ({ index: e.index, text: e.text }))) // Sync React State
            if (overrideDiff) setGameState('playing')

            // 4. PRE-FETCH NEXT (Background)

            // Only if not at end
            if (targetIndex + 1 < TOTAL_QUESTIONS) {
                // Determine next complexity? Assume same for now or track logic.
                fetch('http://localhost:8000/generate-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic,
                        dataset: 'default',
                        course_id: courseId,
                        difficulty: ['easy', 'medium', 'hard', 'spartan'][qDiffIndex] || 'medium',
                        question_index: targetIndex + 1,
                        previous_questions: seenQuestions.current,
                        context_notes: contextNotes,
                        context_content: contextContent
                    })
                }).then(r => r.json()).then(d => {
                    console.log("Next Question Prefetched")
                    nextQuestionRef.current = d
                }).catch(e => console.warn("Prefetch failed", e))
            }

        } catch (err) {
            console.warn("Using fallback question due to error:", err)
            // ... (Fallback Logic - Optimized to standard)
            // (Keeping existing fallback logic but ensuring it sets enemies correctly)

            // Generate Random Math Problem for Fallback
            // SCALED BY QUESTION COMPLEXITY
            const complexity = qDiffIndex // 0, 1, 2, 3
            let questionText = ""
            let answer = 0
            let distractors: number[] = []

            // NOTE: Outputting valid LaTeX for ReactMarkdown rendering.

            // STANDARD: Arith (Mental Math: +, -, *, /) - 2 DIGIT (10-99)
            if (complexity === 0) {
                const type = Math.floor(Math.random() * 4);
                const limit = 90; // 10 to 99
                let a = Math.floor(Math.random() * limit) + 10;
                let b = Math.floor(Math.random() * limit) + 10;

                if (type === 0) { // Add
                    answer = a + b;
                    questionText = `$${a} + ${b} = ?$`;
                    distractors = [a + b + 10, a + b - 10, a + b + 1, a + b + 2];
                } else if (type === 1) { // Sub
                    if (a < b) [a, b] = [b, a];
                    answer = a - b;
                    questionText = `$${a} - ${b} = ?$`;
                    distractors = [a - b + 10, a - b - 1, a + b, b - a];
                } else if (type === 2) { // Mult (Smaller range for mental 10s think)
                    a = Math.floor(Math.random() * 8) + 12; // 12-19
                    b = Math.floor(Math.random() * 8) + 3; // 3-10
                    answer = a * b;
                    questionText = `$${a} \\times ${b} = ?$`;
                    distractors = [a * b + a, a * b - b, a * b + 10, (a + 1) * b];
                } else { // Div
                    b = Math.floor(Math.random() * 8) + 4;
                    answer = Math.floor(Math.random() * 15) + 5;
                    a = answer * b;
                    questionText = `$${a} \\div ${b} = ?$`;
                    distractors = [answer + 1, answer - 1, answer + 2, Math.floor(answer / 2)];
                }
            }

            // ADVANCED: Algebra 2 (Conics, Matrices, Vectors, Sums) w/ Tricky Distractors
            else if (complexity === 1) {
                const type = Math.floor(Math.random() * 6);

                if (type === 0) { // Parabola Focus
                    const p = Math.floor(Math.random() * 5) + 1;
                    answer = p;
                    questionText = `Focus of $x^2 = ${4 * p}y$. find coordinate $(0, ?)$`;
                    distractors = [-p, 4 * p, p * 2, p + 1];
                } else if (type === 1) { // Discriminant: b^2 - 4ac
                    const a = Math.floor(Math.random() * 5) + 1;
                    const c = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 8) + 3;
                    answer = b * b - 4 * a * c;
                    questionText = `Discriminant $\\Delta$ of $${a}x^2 + ${b}x + ${c} = 0$`;
                    distractors = [b * b + 4 * a * c, b * b, 2 * b, Math.abs(b * b - 2 * a * c)];
                } else if (type === 2) { // Dot Product
                    const u1 = Math.floor(Math.random() * 5); const u2 = Math.floor(Math.random() * 5);
                    const v1 = Math.floor(Math.random() * 5); const v2 = Math.floor(Math.random() * 5);
                    answer = u1 * v1 + u2 * v2;
                    questionText = `$\\langle ${u1},${u2} \\rangle \\cdot \\langle ${v1},${v2} \\rangle = ?$`;
                    distractors = [u1 * v2 - u2 * v1, u1 + v1 + u2 + v2, u1 * v1, u1 * v1 - u2 * v2];
                } else if (type === 3) { // Determinant
                    const a = Math.floor(Math.random() * 5); const b = Math.floor(Math.random() * 5);
                    const c = Math.floor(Math.random() * 5); const d = Math.floor(Math.random() * 5);
                    answer = a * d - b * c;
                    questionText = `$\\det \\begin{vmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{vmatrix} = ?$`;
                    distractors = [a * d + b * c, b * c - a * d, a * c - b * d, a * d];
                } else if (type === 4) { // Summation
                    const k = Math.floor(Math.random() * 3) + 3;
                    const c = Math.floor(Math.random() * 3) + 1;
                    let sum = 0; for (let i = 1; i <= k; i++) sum += c * i;
                    answer = sum;
                    questionText = `$\\sum_{n=1}^{${k}} ${c}n = ?$`;
                    distractors = [sum - c * k, sum + c * (k + 1), c * k * k, Math.floor(sum / 2)];
                } else { // Slope
                    const m = Math.floor(Math.random() * 5) + 2;
                    const A = m; const C = Math.floor(Math.random() * 10);
                    answer = m;
                    questionText = `Slope of $${A}x - y = ${C}$`;
                    distractors = [-A, Math.floor(10 / A) / 10, -Math.floor(10 / A) / 10, A + 1];
                }
            }

            // EXPERT: Geometry Honors (Full Course)
            else if (complexity === 2) {
                const type = Math.floor(Math.random() * 7); // Increased type count

                if (type === 0) { // Parallel Lines (Alternate Interior)
                    // Distractor: Same Side Interior (Supplementary)
                    const angle = (Math.floor(Math.random() * 12) + 3) * 10;
                    answer = angle;
                    questionText = `$L_1 \\parallel L_2$. $\\angle A=${angle}^\\circ$. Find Alt. Int. $\\angle B$.`;
                    distractors = [180 - angle, 90 - angle, angle + 10, angle / 2];
                } else if (type === 1) { // Same-Side Interior
                    const angle = (Math.floor(Math.random() * 12) + 3) * 10;
                    answer = 180 - angle;
                    questionText = `$L_1 \\parallel L_2$. $\\angle A=${angle}^\\circ$. Find Same-Side Int $\\angle B$.`;
                    distractors = [angle, 90 + angle, Math.abs(90 - angle), 180 + angle];
                } else if (type === 2) { // Centroids (Median segments)
                    // Centroid divides median in 2:1 ratio.
                    // Given whole median M = 3x. Find longer seg (2x).
                    const x = Math.floor(Math.random() * 5) + 2;
                    const total = 3 * x;
                    answer = 2 * x;
                    questionText = `Centroid $G$. Median $AM = ${total}$. Find $AG$ (Vertex to Centroid).`;
                    // Distractors: x (Short seg), total/2, total
                    distractors = [x, total / 2, total - x - 1, x * 3];
                } else if (type === 3) { // Isosceles (Trickier Distractors)
                    const vertex = (Math.floor(Math.random() * 8) + 2) * 10; // e.g. 30
                    answer = (180 - vertex) / 2; // e.g. 75
                    questionText = `Isosceles: Vertex=${vertex}$^\\circ$. Base $\\angle = ?$`;
                    // Distractors: 
                    // 1. "30-60-90" fallacy -> 60
                    // 2. Arithmetic error -> 65
                    // 3. Forget to divide -> 150 (180-30)
                    distractors = [60, answer - 10, 180 - vertex, 90 - (vertex / 2)];
                } else if (type === 4) { // Polygon Ext Angle
                    const n = 6;
                    answer = 60;
                    questionText = `Regular Hexagon. Each Ext $\\angle = ?$`;
                    distractors = [120, 360, 30, 90];
                } else if (type === 5) { // SAS/SSS Logic (Conceptual)
                    // Given AB=DE, BC=EF... what missing for SAS?
                    // Angle B = Angle E.
                    // Hard to format textually. Let's do a logic check.
                    // "Triangle Inequality: Sides 3, 7, x. Min Integer x?"
                    // x + 3 > 7 -> x > 4. Min int = 5.
                    const s1 = Math.floor(Math.random() * 5) + 3;
                    const s2 = s1 + Math.floor(Math.random() * 5) + 2;
                    // s1 + x > s2 -> x > s2 - s1
                    const limit_lower = s2 - s1;
                    answer = limit_lower + 1;
                    questionText = `Triangle Sides: $${s1}, ${s2}, x$. Min Integer $x$?`;
                    distractors = [limit_lower, limit_lower - 1, s1 + s2, s2];
                } else { // Circle Area (in terms of pi)
                    const r = Math.floor(Math.random() * 6) + 2;
                    answer = r * r;
                    questionText = `Circle $r=${r}$. Area = $X\\pi$. $X=?$`;
                    distractors = [2 * r, r, r * r * r, r + 2];
                }
            }

            // ELITE: AP Calculus BC / Undergrad (Harder & Tricky)
            else {
                const type = Math.floor(Math.random() * 7);

                if (type === 0) { // Chain Rule: d/dx e^(ax).
                    const a = Math.floor(Math.random() * 5) + 2;
                    answer = a;
                    questionText = `$\\frac{d}{dx} (e^{${a}x} + \\cos(x))$ at $x=0$`;
                    distractors = [1, 0, Math.exp(a), a + 1];
                } else if (type === 1) { // Product Rule: x * e^x at x=1.
                    const c = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
                    const x_val = 2;
                    answer = 3 * c * x_val * x_val;
                    questionText = `$\\frac{d}{dx} (x^2 \\cdot ${c}x)$ at $x=${x_val}$`;
                    const wrong1 = c * Math.pow(x_val, 3); // Integral-ish
                    const wrong2 = 2 * x_val * c; // Bad prod rule
                    distractors = [wrong1, wrong2, answer / x_val, answer + c];
                } else if (type === 2) { // Definite Integral
                    const upper = Math.floor(Math.random() * 3) + 2;
                    const k = Math.floor(Math.random() * 3) + 1;
                    answer = k * Math.pow(upper, 3);
                    questionText = `$\\int_{0}^{${upper}} ${3 * k}x^2 \\, dx$`;
                    distractors = [6 * k * upper, k * Math.pow(upper, 2), k * Math.pow(upper, 4) / 4, answer + upper];
                } else if (type === 3) { // Log Derivatives
                    const k = Math.floor(Math.random() * 6) + 2;
                    const x_val = k;
                    answer = 1;
                    questionText = `$\\frac{d}{dx} \\ln(x^{${k}})$ at $x=${k}$`;
                    distractors = [k, 0, k * k, 1 / k];
                } else if (type === 4) { // Limits L'Hopital
                    const k = (Math.floor(Math.random() * 4) + 1) * 2; // 2, 4, 6, 8
                    answer = k / 2;
                    questionText = `$\\lim_{x \\to 0} \\frac{\\sin(${k}x)}{2x}$`;
                    distractors = [k, 0, 1, k * 2];
                } else if (type === 5) { // Quotient Concept
                    answer = 1;
                    questionText = `$\\frac{d}{dx} \\left(\\frac{x}{x+1}\\right)$ at $x=0$`;
                    distractors = [0, -1, 2, 0.5];
                } else { // Trig (Unit Circle)
                    const queries = [
                        { fn: '\\sin', ang: 30, ans: 0.5, d: [0.866, -0.5, 0] }, // sin30=1/2. Wrong: cos30, -sin30
                        { fn: '\\cos', ang: 60, ans: 0.5, d: [0.866, -0.5, 1] },
                        { fn: '\\sin', ang: 210, ans: -0.5, d: [0.5, -0.866, -1] }, // 3rd quad
                        { fn: '\\cos', ang: 120, ans: -0.5, d: [0.5, -0.866, -1] }, // 2nd quad
                        { fn: '\\tan', ang: 135, ans: -1, d: [1, 0, -0.5] },
                        { fn: '\\csc', ang: 30, ans: 2, d: [0.5, -2, 1] }, // 1/sin(30) = 1/(0.5) = 2. Wrong: 0.5 (sin)
                        { fn: '\\sec', ang: 120, ans: -2, d: [-0.5, 2, -1] },
                        { fn: '\\cot', ang: 45, ans: 1, d: [-1, 0, 0.5] }
                    ];
                    const q = queries[Math.floor(Math.random() * queries.length)];
                    answer = q.ans;
                    questionText = `$${q.fn}(${q.ang}^\\circ) = ?$`;
                    distractors = q.d;
                }
            }

            setCurrentQuestion(questionText)
            const options = new Set<number>();
            options.add(answer);

            // Add Smart Distractors first
            distractors.forEach(d => {
                // Ensure distinct and not equal to answer
                if (Math.abs(d - answer) > 0.001) {
                    // Check if float, round to 2 decimals if needed, but we mostly use ints/halves
                    options.add(d);
                }
            });

            // Fill remaining with Random Offsets
            while (options.size < 4) {
                const offset = Math.floor(Math.random() * 10) - 5;
                if (offset !== 0) options.add(answer + offset);
            }
            const shuffledOptions = Array.from(options).slice(0, 4).sort(() => Math.random() - 0.5);
            const correctIndex = shuffledOptions.indexOf(answer);

            setCurrentQuestion(questionText)
            const config = (CONFIG as any)[currentDiff]
            const s = config.enemySpeed * 1.2

            const newEnemies = shuffledOptions.map((opt, i) => {
                const vx = (Math.random() > 0.5 ? 1 : -1) * (s * (0.8 + Math.random() * 0.4))
                const vy = (Math.random() > 0.5 ? 1 : -1) * (s * (0.8 + Math.random() * 0.4))
                const xSlot = (i % 2) * 350 + 50
                const ySlot = Math.floor(i / 2) * 100 + 50

                return {
                    x: xSlot + Math.random() * 50,
                    y: ySlot + Math.random() * 20,
                    width: 250, height: 80,
                    text: opt.toString(),
                    isCorrect: i === correctIndex,
                    active: true, index: i, vx, vy
                }
            })
            enemies.current = newEnemies
            setEnemyList(newEnemies.map(e => ({ index: e.index, text: e.text })))
            if (overrideDiff) setGameState('playing')
        }
    }, [activeQuestionIdx, questionsCorrect, topic, difficulty, qDiffIndex, practiceMode, contextNotes, contextContent])



    const startGame = async (diff: Difficulty) => {
        setDifficulty(diff)
        setScore(0)
        scoreRef.current = 0
        setHealth(100)
        shieldEnergy.current = 100
        setQuestionsCorrect(0)
        setActiveQuestionIdx(0)
        ammoRef.current = MAX_AMMO
        isTransitioning.current = false
        particles.current = [] // Clear FX
        seenQuestions.current = [] // Clear History

        await loadNextQuestion(diff, 0)

        setGameState('playing')
        countdown.current = 3
        const countInt = setInterval(() => {
            if (countdown.current !== null) {
                countdown.current -= 1
                if (countdown.current <= 0) {
                    countdown.current = null
                    clearInterval(countInt)
                }
            }
        }, 1000)
    }

    // --- Anti-Cheat State ---
    const inputHistory = useRef<number[]>([])
    const corruptionMode = useRef(false)

    // --- Input ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // IGNORE INPUTS: Don't hijack keys if user is typing in a form
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()

            // ANTI-CHEAT MONITOR (Telemetry V2)
            const now = Date.now()
            inputHistory.current.push(now)
            if (inputHistory.current.length > 50) {
                inputHistory.current.shift()

                // Periodically check with backend (every 10th input after buffer full)
                // DISABLED BY USER REQUEST
                /*
                if (Math.random() > 0.9 && !corruptionMode.current) {
                    fetch('http://localhost:8000/analyze-telemetry', {
                        // ...
                    })
                    // ...
                }
                */
            }


            if (e.code === 'KeyR') startGame(difficulty)
            if (e.code === 'KeyX') setAutoRestart(prev => !prev)
            if (e.code === 'KeyM' || e.code === 'KeyP') {
                if (gameState !== 'menu') {
                    bgWarp.current = { val: 0, target: 0, color: '#1e293b', bloom: 0, flood: { color: '', opacity: 0 }, type: 'NORMAL', direction: 1 }
                    setGameState('menu')
                }
            }
            if (e.code === 'Escape') {
                onExit()
            }

            keys.current[e.code] = true
        }
        const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [difficulty])

    // Auto Restart Loop
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>
        if (gameState === 'gameover' && autoRestart) {
            timeout = setTimeout(() => startGame(difficulty), 3000)
        }
        return () => clearTimeout(timeout)
    }, [gameState, autoRestart, difficulty])

    // Load High Scores from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('SPACE_INVADERS_SCORES');
        if (saved) {
            try {
                setHighScores(JSON.parse(saved));
            } catch (e) { console.error("Failed to load scores", e) }
        }
    }, [])

    const updateHighScores = (finalScore: number) => {
        setHighScores(prev => {
            const newScores = [...prev, { name: "OPERATIVE", score: finalScore, difficulty: difficulty }];
            newScores.sort((a, b) => b.score - a.score);
            const top5 = newScores.slice(0, 5);
            localStorage.setItem('SPACE_INVADERS_SCORES', JSON.stringify(top5));
            return top5;
        });
    }

    // Update High Score on Game End
    useEffect(() => {
        if (gameState === 'victory' || gameState === 'gameover') {
            if (score > 0) updateHighScores(score);
        }
    }, [gameState])

    // Victory Counter Animation
    useEffect(() => {
        if (gameState === 'victory') {
            let start = 0
            const end = score
            if (start === end) { setDisplayScore(end); return }
            const duration = 2000
            const startTime = Date.now()

            const animate = () => {
                const now = Date.now()
                const progress = Math.min((now - startTime) / duration, 1)
                const ease = 1 - Math.pow(1 - progress, 3) // Cubic ease out
                setDisplayScore(Math.floor(start + (end - start) * ease))
                if (progress < 1) requestAnimationFrame(animate)
            }
            requestAnimationFrame(animate)
        } else {
            setDisplayScore(0)
        }
    }, [gameState, score])

    // --- Game Loop ---
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return

        const diffConfig = (CONFIG as any)[difficulty]
        const diffIndex = difficulty === 'EASY' ? 0 : difficulty === 'MEDIUM' ? 1 : difficulty === 'HARD' ? 2 : 3
        const gravityStrength = 40 + (diffIndex * 15)
        const repulsionStrength = 20000
        const entropyLevel = 0.1 + (diffIndex * 0.1)

        const render = () => {
            // 1. GLOBAL SAFETY RESET
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = 'source-over'
            ctx.shadowBlur = 0
            ctx.shadowColor = 'transparent'
            ctx.globalAlpha = 1

            if (gameState === 'menu') {
                // Hard Reset Visuals in Menu to prevent leaks
                bgWarp.current = { val: 0, target: 0, color: '#1e293b', bloom: 0, flood: { color: '', opacity: 0 }, type: 'NORMAL', direction: 1 }
            }

            // 2. Clear Screen & Dynamic Background
            ctx.fillStyle = '#020617'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

            // Background Greebles (Particle Fire)
            if (!reducedMotion) {
                if (bgParticles.current.length < 80) {
                    const size = Math.random() * 20 + 2 // 2px to 22px
                    bgParticles.current.push({
                        x: Math.random() * CANVAS_WIDTH,
                        y: CANVAS_HEIGHT + 20,
                        vy: -2 - Math.random() * 4, // Fast rise
                        color: Math.random() > 0.5 ? 'rgba(6, 182, 212, 0.15)' : 'rgba(148, 163, 184, 0.1)'
                    })
                }
                for (let i = bgParticles.current.length - 1; i >= 0; i--) {
                    const p = bgParticles.current[i]
                    p.y += p.vy
                    if (p.y < -30) { bgParticles.current.splice(i, 1); continue }
                    ctx.fillStyle = p.color
                    ctx.fillRect(p.x, p.y, (p as any).size || 4, (p as any).size || 4) // Fallback size logic
                }
            }

            // Background Logic
            if (!reducedMotion) {
                // Decay & Transitions
                // Slower Fade In/Out (0.02)
                bgWarp.current.val += (bgWarp.current.target - bgWarp.current.val) * 0.02
                if (Math.abs(bgWarp.current.target - bgWarp.current.val) < 0.01) bgWarp.current.target = 0
                bgWarp.current.flood.opacity *= 0.92
                bgWarp.current.bloom = Math.max(0, bgWarp.current.bloom * 0.9)
                if (bgWarp.current.color !== '#1e293b' && bgWarp.current.bloom < 5) bgWarp.current.color = '#1e293b'

                ctx.save()
                const val = bgWarp.current.val

                // 1. Flood Layer (Answers)
                if (bgWarp.current.flood.opacity > 0.01) {
                    ctx.fillStyle = bgWarp.current.flood.color
                    ctx.globalAlpha = bgWarp.current.flood.opacity
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
                    ctx.globalAlpha = 1
                }

                // 2. Grid Layer (Bloom & Flash)
                const time = Date.now()
                const restPulse = Math.sin(time * 0.002) * 0.5 + 0.5 // 0 to 1

                // Enhanced Breathing
                const breathWidth = restPulse * 3
                const breathBloom = restPulse * 30

                ctx.strokeStyle = bgWarp.current.color
                ctx.lineWidth = 1 + val * 2 + (bgWarp.current.type === 'NORMAL' ? breathWidth : 0)
                ctx.shadowBlur = 30 + bgWarp.current.bloom + (bgWarp.current.type === 'NORMAL' ? breathBloom : 0)
                ctx.shadowColor = bgWarp.current.color

                // Vertical Lines
                for (let i = 0; i < CANVAS_WIDTH; i += 50) {
                    ctx.beginPath()
                    const startX = i
                    ctx.moveTo(startX, 0)
                    for (let j = 0; j < CANVAS_HEIGHT; j += 20) {
                        let dx = 0
                        // Jitter (Constant)
                        dx += (Math.random() - 0.5) * 2

                        // DNA / Twist Effect (Toned Down)
                        if (isShielding.current) dx += Math.sin((j * 0.02) + (time * 0.005)) * 25

                        if (bgWarp.current.type === 'PULSE') dx += Math.sin(j * 0.05 + time * 0.005) * val * 20
                        if (bgWarp.current.type === 'GLITCH') dx += (Math.random() - 0.5) * val * 50
                        if (bgWarp.current.type === 'WARP') dx += Math.sin(j * 0.02) * val * 100 * bgWarp.current.direction
                        ctx.lineTo(startX + dx, j)
                    }
                    ctx.stroke()
                }

                // Horizontal Lines
                for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
                    ctx.beginPath()
                    ctx.moveTo(0, i)
                    for (let j = 0; j < CANVAS_WIDTH; j += 20) {
                        let dy = 0
                        // Jitter (Constant)
                        dy += (Math.random() - 0.5) * 2

                        // DNA / Twist Effect (Toned Down)
                        if (isShielding.current) dy += Math.cos((j * 0.02) + (time * 0.005)) * 15

                        if (bgWarp.current.type === 'PULSE') dy += Math.cos(j * 0.05 + time * 0.005) * val * 20
                        if (bgWarp.current.type === 'GLITCH') dy += (Math.random() - 0.5) * val * 50
                        if (bgWarp.current.type === 'WARP') dy += Math.cos(j * 0.02) * val * 40 // Horizontal warp unaffected by direction for stability
                        ctx.lineTo(j, i + dy)
                    }
                    ctx.stroke()
                }
                ctx.restore()
            } else {
                // Static Grid (Reduced Motion)
                ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)'; ctx.lineWidth = 1
                ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
                for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
                for (let i = 0; i < CANVAS_HEIGHT; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }
            }

            // 3. MENU RENDER
            if (gameState === 'menu') {
                if (!reducedMotion) {
                    if (menuParticles.current.length < 40) {
                        menuParticles.current.push({
                            x: Math.random() * CANVAS_WIDTH,
                            y: Math.random() * CANVAS_HEIGHT,
                            vx: (Math.random() - 0.5) * 1,
                            vy: (Math.random() - 0.5) * 1,
                            life: 1.0,
                            color: Math.random() > 0.5 ? '#22d3ee' : '#eabc4e'
                        })
                    }
                    menuParticles.current.forEach(p => {
                        p.x += p.vx; p.y += p.vy
                        if (p.x < 0 || p.x > CANVAS_WIDTH) p.vx *= -1
                        if (p.y < 0 || p.y > CANVAS_HEIGHT) p.vy *= -1
                        ctx.fillStyle = p.color
                        ctx.fillRect(p.x, p.y, 2, 2)
                    })
                }
                requestId.current = requestAnimationFrame(render)
                return
            }

            // 4. GAMEPLAY RENDER
            if (gameState === 'playing') {
                if (!reducedMotion && shakeIntensity.current > 0) {
                    shakeIntensity.current *= 0.9
                    if (shakeIntensity.current < 0.5) shakeIntensity.current = 0
                    const shakeX = (Math.random() - 0.5) * shakeIntensity.current
                    const shakeY = (Math.random() - 0.5) * shakeIntensity.current
                    ctx.setTransform(1, 0, 0, 1, shakeX, shakeY)
                }

                setHealth(h => Math.min(100, h + 0.05))

                // Question Text is now handled by the React Overlay above the canvas
                // ctx.shadowColor = '#22d3ee'
                // ctx.shadowBlur = 10
                // ctx.fillStyle = '#22d3ee'
                // ctx.font = '24px "Share Tech Mono", monospace'
                // ctx.textAlign = 'center'
                // ctx.fillText(currentQuestion, canvas.width / 2, 80)

                // Countdown
                if (countdown.current !== null) {
                    ctx.fillStyle = '#fbbf24'
                    ctx.font = 'bold 120px "Courier New", monospace'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText(countdown.current.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
                    ctx.font = '30px "Courier New", monospace'
                    ctx.fillText("PREPARE FOR BATTLE", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80)
                    ctx.font = '20px "Courier New", monospace'
                    ctx.fillStyle = autoRestart ? '#4ade80' : '#94a3b8'
                    ctx.fillText(`AUTO-RESTART: ${autoRestart ? 'ON' : 'OFF'} (PRESS X)`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 130)
                    requestId.current = requestAnimationFrame(render)
                    return
                }

                // Input
                if ((keys.current['ShiftLeft'] || keys.current['ShiftRight']) && shieldEnergy.current > 0) {
                    isShielding.current = true; shieldEnergy.current = Math.max(0, shieldEnergy.current - SHIELD_DRAIN)
                    if (!reducedMotion) {
                        bgWarp.current = { ...bgWarp.current, val: 0.5, target: 1.0, type: 'WARP', color: '#22d3ee', bloom: 20 }
                        // Rising Particles
                        if (Math.random() > 0.5) {
                            particles.current.push({
                                x: playerX.current + (Math.random() - 0.5) * 120, y: CANVAS_HEIGHT,
                                vx: 0, vy: -5 - Math.random() * 5, life: 1.0, color: '#22d3ee', type: 'SPARK'
                            })
                        }
                    }
                } else {
                    isShielding.current = false; shieldEnergy.current = Math.min(100, shieldEnergy.current + SHIELD_RECHARGE)
                    if (!reducedMotion && bgWarp.current.type === 'WARP') { bgWarp.current.target = 0; bgWarp.current.bloom = 0; bgWarp.current.color = '#1e293b' }
                }
                if (shieldEnergy.current <= 0 && isShielding.current && !reducedMotion) {
                    shieldFizzle.current = 20 // Trigger fizzle
                }
                if (shieldFizzle.current > 0) {
                    shieldFizzle.current--
                    if (Math.random() > 0.5) ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT) // Flicker
                }

                if (keys.current['ArrowLeft'] || keys.current['KeyA']) playerX.current -= PLAYER_SPEED
                if (keys.current['ArrowRight'] || keys.current['KeyD']) playerX.current += PLAYER_SPEED

                // Wraparound Adjustment
                if (playerX.current < -50) {
                    playerX.current = CANVAS_WIDTH + 50
                    if (!reducedMotion) bgWarp.current = { ...bgWarp.current, target: 1.5, type: 'WARP', color: '#a855f7', bloom: 30, direction: 1 }
                } else if (playerX.current > CANVAS_WIDTH + 50) {
                    playerX.current = -50
                    if (!reducedMotion) bgWarp.current = { ...bgWarp.current, target: 1.5, type: 'WARP', color: '#a855f7', bloom: 30, direction: -1 }
                }

                // Shooting Logic (Consolidated)
                // PLAYER_FIRE_RATE = 300ms
                if (keys.current['Space'] && !isShielding.current && gameState === 'playing' && !isTransitioning.current) {
                    const now = Date.now()
                    if (now - lastShotTime.current > 300) { // 300ms Cooldown
                        if (ammoRef.current > 0) {
                            bullets.current.push({ x: playerX.current + 20, y: CANVAS_HEIGHT - 60, active: true })
                            lastShotTime.current = now

                            // SYNC Logic Ref and UI State
                            ammoRef.current -= 1
                            setShotsRemaining(ammoRef.current)

                            if (!reducedMotion) {
                                bgWarp.current = { ...bgWarp.current, val: 0.2, target: 0, type: 'PULSE', color: '#22d3ee', bloom: 40 }
                            }
                        }
                    }
                }

                // Ammo Penalty Check (IMMEDIATE FAIL-OVER)
                if (ammoRef.current <= 0 && bullets.current.filter(b => b.active).length === 0 && !isTransitioning.current) {
                    isTransitioning.current = true
                    setHealth(h => Math.max(0, h - 25)); // Penalty
                    const penalty = 200
                    scoreRef.current = Math.max(0, scoreRef.current - penalty)
                    setScore(scoreRef.current)
                    setFeedbackMessage(`AMMO DEPLETED! -${penalty} pts`)
                    shakeIntensity.current = 10

                    if (!reducedMotion) {
                        bgWarp.current = { ...bgWarp.current, val: 1.0, target: 0, type: 'GLITCH', flood: { color: '#ef4444', opacity: 0.6 }, color: '#ef4444', bloom: 60 }
                    }

                    const nextQ = activeQuestionIdx + 1
                    setActiveQuestionIdx(nextQ)
                    // IMMEDIATE FAILOVER
                    loadNextQuestion(undefined, nextQ)
                }

                // Physics
                for (let i = 0; i < enemies.current.length; i++) {
                    const enemy = enemies.current[i]
                    if (!enemy.active) continue
                    enemy.vx += (Math.random() - 0.5) * entropyLevel; enemy.vy += (Math.random() - 0.5) * entropyLevel
                    for (let j = 0; j < enemies.current.length; j++) {
                        if (i === j) continue; const other = enemies.current[j]; if (!other.active) continue
                        const cx = enemy.x + enemy.width / 2; const cy = enemy.y + enemy.height / 2
                        const ocx = other.x + other.width / 2; const ocy = other.y + other.height / 2
                        const dx = cx - ocx; const dy = cy - ocy; const distSq = dx * dx + dy * dy; const dist = Math.sqrt(distSq)
                        if (dist > 0) {
                            const attForce = gravityStrength / dist; enemy.vx -= (dx / dist) * attForce; enemy.vy -= (dy / dist) * attForce
                            if (dist < 160) { const repForce = repulsionStrength / distSq; enemy.vx += (dx / dist) * repForce; enemy.vy += (dy / dist) * repForce }
                        }
                    }
                    enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.vx *= 0.99; enemy.vy *= 0.99
                    if (enemy.x <= 0) { enemy.x = 0; enemy.vx = Math.abs(enemy.vx) }
                    else if (enemy.x >= CANVAS_WIDTH - enemy.width) { enemy.x = CANVAS_WIDTH - enemy.width; enemy.vx = -Math.abs(enemy.vx) }
                    if (enemy.y <= 40) { enemy.y = 40; enemy.vy = Math.abs(enemy.vy) }
                    else if (enemy.y >= CANVAS_HEIGHT * 0.75) { enemy.y = CANVAS_HEIGHT * 0.75; enemy.vy = -Math.abs(enemy.vy) }
                    const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy); if (speed < 1.0) { enemy.vx += (Math.random() - 0.5) * 2; enemy.vy += (Math.random() - 0.5) * 2 }
                    const MAX_SPEED = 7 + diffIndex; if (speed > MAX_SPEED) { enemy.vx = (enemy.vx / speed) * MAX_SPEED; enemy.vy = (enemy.vy / speed) * MAX_SPEED }

                    let fireRate = diffConfig.fireRate; if (difficulty === 'STREAMER') fireRate += (questionsCorrect * 0.005)
                    if (Math.random() < fireRate) {
                        const centerX = enemy.x + enemy.width / 2; const centerY = enemy.y + enemy.height
                        let type: Bomb['type'] = 'STRAIGHT'
                        const rand = Math.random();
                        if (difficulty === 'STREAMER') {
                            if (rand > 0.85) type = 'PIERCING'; else if (rand > 0.75) type = 'CLUSTER'; else if (rand > 0.60) type = 'TRACKING'; else if (rand > 0.40) type = 'SINE'
                        } else if (difficulty === 'HARD') {
                            if (rand > 0.90) type = 'PIERCING'; else if (rand > 0.75) type = 'TRACKING'; else if (rand > 0.55) type = 'SINE'
                        } else if (difficulty === 'MEDIUM') { if (rand > 0.80) type = 'SINE' }

                        const dx = playerX.current - centerX; const dy = (CANVAS_HEIGHT - 50) - centerY; const dist = Math.sqrt(dx * dx + dy * dy)
                        const baseSpeed = BOMB_SPEED * (difficulty === 'HARD' ? 1.5 : difficulty === 'STREAMER' ? 2 : 1)
                        let vx = (dx / dist) * baseSpeed; let vy = (dy / dist) * baseSpeed
                        if (type === 'PIERCING') { vx = (dx / dist) * BOMB_SPEED * 0.8; vy = (dy / dist) * BOMB_SPEED * 0.8 }
                        bombs.current.push({ x: centerX, y: centerY, vx, vy, active: true, type, initialX: centerX })
                    }
                }

                bullets.current.forEach(b => { b.y -= BULLET_SPEED; if (b.y < 0) b.active = false; if (b.x < 0) b.x = CANVAS_WIDTH; if (b.x > CANVAS_WIDTH) b.x = 0 })
                for (let i = bombs.current.length - 1; i >= 0; i--) {
                    const b = bombs.current[i]; if (!b.active) continue
                    if (b.x < 0) b.x = CANVAS_WIDTH; if (b.x > CANVAS_WIDTH) b.x = 0
                    if (b.type === 'STRAIGHT') { b.x += b.vx; b.y += b.vy }
                    else if (b.type === 'SINE') { b.y += Math.abs(b.vy) * 0.8; b.x = b.initialX + Math.sin(b.y * 0.03) * 60 }
                    else if (b.type === 'TRACKING') { b.y += Math.abs(b.vy) * 0.7; if (b.x < playerX.current) b.x += 1.5; else b.x -= 1.5 }
                    else if (b.type === 'PIERCING') {
                        // Piercing moves straight but maintains velocity logic (no homing)
                        b.x += b.vx; b.y += b.vy
                    }
                    else if (b.type === 'CLUSTER') {
                        b.x += b.vx; b.y += b.vy; if (b.y > CANVAS_HEIGHT * 0.45) {
                            b.active = false; createExplosion(b.x, b.y, '#3b82f6')
                            for (let k = 0; k < 8; k++) { const angle = (Math.PI * 2 / 8) * k; bombs.current.push({ x: b.x, y: b.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, active: true, type: 'CLUSTER_FRAG', initialX: b.x }) }
                        }
                    }
                    else if (b.type === 'CLUSTER_FRAG') { b.x += b.vx; b.y += b.vy; b.vy += 0.1 }
                    if (b.y > CANVAS_HEIGHT) b.active = false
                }

                bullets.current.filter(b => b.active).forEach(bullet => {
                    enemies.current.forEach(enemy => {
                        if (!enemy.active) return
                        if (bullet.x > enemy.x && bullet.x < enemy.x + enemy.width && bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
                            bullet.active = false; createExplosion(bullet.x, bullet.y, enemy.isCorrect ? '#22d3ee' : '#ef4444'); shakeIntensity.current = 5
                            if (enemy.isCorrect) {
                                enemy.active = false
                                // Score Calculation
                                const diffConfig = (CONFIG as any)[difficulty]
                                const points = 250 * diffConfig.scoreMult * QUESTION_DIFF_LEVELS[qDiffIndex] * (practiceMode ? 0 : 1)
                                scoreRef.current += points
                                setScore(scoreRef.current)
                                const nextQ = activeQuestionIdx + 1
                                setQuestionsCorrect(q => q + 1)
                                setActiveQuestionIdx(nextQ)
                                setFeedbackMessage(`TARGET NEUTRALIZED +${points}`)
                                enemies.current.forEach(e => e.active = false)
                                isTransitioning.current = true
                                // Green Flood
                                if (!reducedMotion) {
                                    bgWarp.current = {
                                        ...bgWarp.current,
                                        val: 1.0,
                                        target: 0,
                                        type: 'PULSE',
                                        flood: { color: '#22c55e', opacity: 0.4 },
                                        color: '#22c55e',
                                        bloom: 50
                                    }
                                }
                                loadNextQuestion(undefined, nextQ)
                            } else {
                                setHealth(h => Math.max(0, h - 20)); setFeedbackMessage("INCORRECT TARGET! HULL DAMAGED"); shakeIntensity.current = 15
                                scoreRef.current = Math.max(0, scoreRef.current - 50); setScore(scoreRef.current)
                                if (!reducedMotion) { bgWarp.current = { ...bgWarp.current, val: 1.0, target: 0, type: 'GLITCH', flood: { color: '#ef4444', opacity: 0.5 }, color: '#ef4444', bloom: 50 } }
                            }
                        }
                    })
                })
                bombs.current.filter(b => b.active).forEach(bomb => {
                    const dist = Math.sqrt((bomb.x - playerX.current) ** 2 + (bomb.y - (CANVAS_HEIGHT - 35)) ** 2)
                    if (dist < 45 && isShielding.current && bomb.type !== 'PIERCING') {
                        bomb.active = false; createExplosion(bomb.x, bomb.y, '#06b6d4', 'SPARK'); return
                    }
                    if (dist < 25) {
                        bomb.active = false;
                        setHealth(h => {
                            let dmg = difficulty === 'STREAMER' ? 40 : 15;
                            if (bomb.type === 'PIERCING') dmg = 50;
                            const next = Math.max(0, h - dmg);
                            if (next <= 0) setGameState('gameover');
                            return next
                        })

                        // SCORE PENALTY (SCALED)
                        const diffConfig = (CONFIG as any)[difficulty]
                        const penalty = 50 * diffConfig.scoreMult
                        scoreRef.current = Math.max(0, scoreRef.current - penalty)
                        setScore(scoreRef.current)
                        setFeedbackMessage(`HULL BREACH! -${penalty}`)

                        const hitColor = bomb.type === 'PIERCING' ? '#facc15' : bomb.type === 'TRACKING' ? '#f87171' : '#ef4444'
                        createExplosion(playerX.current, CANVAS_HEIGHT - 35, hitColor, 'GLITCH')
                        shakeIntensity.current = 20
                        if (!reducedMotion) { bgWarp.current = { ...bgWarp.current, val: 1.5, target: 0, type: 'GLITCH', color: hitColor, bloom: 60 } }
                    }
                })

                // RENDER ENEMIES
                enemies.current.forEach(enemy => {
                    if (!enemy.active) return
                    ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee'; ctx.strokeStyle = '#22d3ee'; ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height)
                    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(34, 211, 238, 0.05)'; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)
                    // TEXT RENDERING HANDLED BY DOM OVERLAY (Below)
                })

                // DOM SYNC (Loop for Performance)
                enemyList.forEach(e => {
                    const el = document.getElementById(`enemy-label-${e.index}`)
                    const enemy = enemies.current.find(en => en.index === e.index)
                    if (el && enemy) {
                        if (enemy.active) {
                            el.style.transform = `translate(${enemy.x}px, ${enemy.y}px)`
                            el.style.opacity = '1'
                        } else {
                            el.style.opacity = '0'
                        }
                    }
                })

                // RENDER PLAYER
                if (isShielding.current) {
                    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(playerX.current, CANVAS_HEIGHT - 20, 50, Math.PI, 0)
                    ctx.strokeStyle = `rgba(6, 182, 212, ${Math.random() * 0.5 + 0.5})`; ctx.lineWidth = 4; ctx.shadowBlur = 20; ctx.shadowColor = '#06b6d4'; ctx.stroke(); ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'; ctx.fill(); ctx.restore()
                }
                ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(playerX.current, CANVAS_HEIGHT - 60); ctx.lineTo(playerX.current - 20, CANVAS_HEIGHT - 20); ctx.lineTo(playerX.current + 20, CANVAS_HEIGHT - 20); ctx.fill()
                ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(playerX.current - 10, CANVAS_HEIGHT - 20); ctx.lineTo(playerX.current + 10, CANVAS_HEIGHT - 20); ctx.lineTo(playerX.current, CANVAS_HEIGHT - 10 + Math.random() * 15); ctx.fill()

                // RENDER PROJECTILES
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; bullets.current.filter(b => b.active).forEach(b => { ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x - 2, b.y - 15, 4, 20); ctx.shadowBlur = 20; ctx.shadowColor = '#f43f5e'; ctx.fillStyle = '#f43f5e'; ctx.fillRect(b.x - 3, b.y - 15, 6, 20) }); ctx.restore()
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; bombs.current.filter(b => b.active).forEach(b => {
                    ctx.beginPath(); if (b.type === 'SINE') { ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 15; ctx.fillStyle = '#4ade80'; ctx.arc(b.x, b.y, 8, 0, Math.PI * 2) }
                    else if (b.type === 'TRACKING') { ctx.shadowColor = '#f87171'; ctx.shadowBlur = 20; ctx.fillStyle = '#f87171'; ctx.moveTo(b.x, b.y - 8); ctx.lineTo(b.x + 8, b.y); ctx.lineTo(b.x, b.y + 8); ctx.lineTo(b.x - 8, b.y) }
                    else if (b.type === 'PIERCING') { ctx.shadowColor = '#facc15'; ctx.shadowBlur = 25; ctx.fillStyle = '#facc15'; ctx.arc(b.x, b.y, 12, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.arc(b.x, b.y, 6, 0, Math.PI * 2) }
                    else if (b.type === 'CLUSTER') { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 30; ctx.fillStyle = '#3b82f6'; ctx.arc(b.x, b.y, 10, 0, Math.PI * 2) }
                    else if (b.type === 'CLUSTER_FRAG') { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 10; ctx.fillStyle = '#60a5fa'; ctx.arc(b.x, b.y, 4, 0, Math.PI * 2) }
                    else { ctx.shadowColor = '#d946ef'; ctx.shadowBlur = 10; ctx.fillStyle = '#d946ef'; ctx.arc(b.x, b.y, 6, 0, Math.PI * 2) }; ctx.fill()
                }); ctx.restore()

                // PARTICLES
                particles.current.forEach(p => {
                    ctx.fillStyle = p.color; ctx.globalAlpha = p.life
                    if (p.type === 'GLITCH') { ctx.fillRect(p.x, p.y, Math.random() * 3, Math.random() * 3) }
                    else { ctx.fillRect(p.x, p.y, 3, 3) }
                    p.x += p.vx; p.y += p.vy; p.life -= 0.05
                })
                particles.current = particles.current.filter(p => p.life > 0); ctx.globalAlpha = 1

                // HUD Elements
                ctx.fillStyle = '#334155'; ctx.fillRect(CANVAS_WIDTH - 220, CANVAS_HEIGHT - 30, 200, 10); ctx.fillStyle = shieldEnergy.current > 20 ? '#06b6d4' : '#ef4444'; ctx.fillRect(CANVAS_WIDTH - 220, CANVAS_HEIGHT - 30, (shieldEnergy.current / 100) * 200, 10); ctx.font = '10px monospace'; ctx.fillStyle = '#94a3b8'; ctx.fillText("SHIELD", CANVAS_WIDTH - 230, CANVAS_HEIGHT - 21)
                for (let k = 0; k < MAX_AMMO; k++) { ctx.fillStyle = k < shotsRemaining ? '#22d3ee' : '#334155'; ctx.fillRect(CANVAS_WIDTH - 300 + (k * 20), CANVAS_HEIGHT - 25, 10, 15) }
                ctx.fillStyle = '#22d3ee'; ctx.font = '10px monospace'; ctx.fillText("AMMO", CANVAS_WIDTH - 310, CANVAS_HEIGHT - 21)
                if (feedbackMessage) { ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px "Courier New", monospace'; ctx.fillText(feedbackMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 120) }
            }

            // LOOP
            if (gameState === 'playing') {
                if (corruptionMode.current) {
                    // ZALGO / CORRUPTION FX
                    ctx.save()
                    ctx.globalCompositeOperation = 'difference'
                    if (Math.random() > 0.8) {
                        ctx.fillStyle = '#ff0000'
                        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
                    }
                    if (Math.random() > 0.9) {
                        ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5)
                    }
                    ctx.restore()

                    // Corrupt Enemy Text
                    enemies.current.forEach(e => {
                        if (Math.random() > 0.9) {
                            e.text = e.text.split('').map(c => String.fromCharCode(c.charCodeAt(0) + Math.random() * 50)).join('')
                        }
                    })
                }
                requestId.current = requestAnimationFrame(render)
            }
        }
        render()
        return () => { if (requestId.current) cancelAnimationFrame(requestId.current) }
    }, [gameState, currentQuestion, feedbackMessage, difficulty, autoRestart, shotsRemaining, reducedMotion])


    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-transparent font-mono text-cyan-400 p-4">
            {/* Header */}
            <div className="w-[800px] flex justify-between mb-2 text-sm border-b border-white/10 pb-2 uppercase tracking-widest">
                <div className='flex gap-6 items-center'>
                    <span className="text-amber-400 flex items-center gap-2"><Zap size={16} /> {score.toString().padStart(6, '0')}</span>
                    <span className='flex items-center gap-2'><Crosshair size={16} /> {activeQuestionIdx}/{TOTAL_QUESTIONS}</span>
                </div>
                <div className='flex items-center gap-6'>
                    <span className='text-xs flex items-center gap-2 text-slate-400'><RefreshCw size={12} />PRESS R TO RESTART</span>
                    <div className='flex items-center gap-2'>
                        <Shield size={16} className={health < 40 ? 'text-red-500 animate-pulse' : 'text-green-400'} />
                        <div className="w-32 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                            <div className={`h-full transition-all duration-300 ${health > 60 ? 'bg-green-500' : health > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${health}%` }} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => {
                        bgWarp.current = { val: 0, target: 0, color: '#1e293b', bloom: 0, flood: { color: '', opacity: 0 }, type: 'NORMAL', direction: 1 }
                        setGameState('menu')
                    }} className="hover:text-cyan-400">[M] MENU</button>
                    <button onClick={onExit} className="hover:text-red-400">[ESC] EXIT</button>
                </div>
            </div>

            {/* Game Windows */}
            <div className="relative w-full max-w-[800px] aspect-[4/3] border-2 border-slate-700 bg-black rounded-xl overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)] box-border mx-auto">

                {/* MENU STATE */}
                {gameState === 'menu' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-20 backdrop-blur-none">

                        {/* Manual & Accessibility Buttons - SPLIT */}
                        {!showInstructions && (
                            <>
                                {/* Top Left: Manual */}
                                <div className="absolute top-4 left-4 z-30">
                                    <button
                                        onClick={() => setShowInstructions(true)}
                                        className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 px-4 py-2 border border-cyan-500/30 rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                                    >
                                        <HelpCircle size={16} /> <span className="text-xs font-bold tracking-widest">MANUAL</span>
                                    </button>
                                </div>

                                {/* Top Right: Greebles */}
                                <div className="absolute top-4 right-4 z-30">
                                    <button
                                        onClick={() => setReducedMotion(!reducedMotion)}
                                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-md transition-all text-[10px] tracking-widest uppercase ${reducedMotion ? 'bg-cyan-900/50 text-cyan-200 border-cyan-400' : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:text-cyan-400 hover:border-cyan-500/30'}`}
                                    >
                                        <EyeOff size={12} /> {reducedMotion ? 'GREEBLES: OFF' : 'GREEBLES: ON'}
                                    </button>
                                </div>
                            </>
                        )}

                        {showInstructions ? (
                            <div className="w-full h-full p-12 flex flex-col items-center overflow-auto animate-in fade-in slide-in-from-bottom-4 bg-slate-950/95">
                                <h2 className="text-3xl font-bold mb-8 text-cyan-400 tracking-widest">TACTICAL MANUAL</h2>
                                <div className="grid grid-cols-2 gap-12 w-full text-sm mb-8">
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold border-b border-white/20 pb-2 mb-4 tracking-widest">CONTROLS</h3>
                                        <div className="flex justify-between text-slate-400"><span>MOVE</span> <span className="text-white">ARROWS / WASD</span></div>
                                        <div className="flex justify-between text-slate-400"><span>FIRE</span> <span className="text-white">SPACE (3 SHOTS/Q)</span></div>
                                        <div className="flex justify-between text-slate-400"><span>SHIELD</span> <span className="text-white">SHIFT</span></div>
                                        <div className="flex justify-between text-slate-400"><span>WARP</span> <span className="text-white">FLY OFF EDGE</span></div>
                                        <div className="flex justify-between text-slate-400"><span>ABORT</span> <span className="text-white">M / ESC</span></div>
                                        <div className="flex justify-between text-slate-400"><span>RESTART</span> <span className="text-white">R</span></div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold border-b border-white/20 pb-2 mb-4 tracking-widest">THREATS</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_magenta]" /></div>
                                            <span className="text-slate-400">STRAIGHT <span className="text-xs text-slate-600">(STANDARD)</span></span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_lime]" /></div>
                                            <span className="text-slate-400">SINE WAVE <span className="text-xs text-slate-600">(WEAVING)</span></span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <svg width="16" height="16" viewBox="0 0 16 16" className="drop-shadow-[0_0_5px_red]">
                                                    <polygon points="8,0 16,8 8,16 0,8" fill="#ef4444" />
                                                </svg>
                                            </div>
                                            <span className="text-slate-400">TRACKING <span className="text-xs text-slate-600">(HOMING)</span></span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_0_5px_yellow]">
                                                    <circle cx="12" cy="12" r="10" fill="#facc15" />
                                                    <circle cx="12" cy="12" r="5" fill="white" />
                                                </svg>
                                            </div>
                                            <span className="text-slate-400">PIERCING <span className="text-xs text-slate-600">(SHIELD BREAKER)</span></span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_blue]" /></div>
                                            <span className="text-slate-400">CLUSTER <span className="text-xs text-slate-600">(AIRBURST)</span></span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowInstructions(false)} className="px-8 py-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/30 rounded transition-colors tracking-widest">
                                    RETURN TO MENU
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                                    TALOS DEFENSE
                                </h1>
                                <p className="text-slate-400 tracking-[0.5em] text-sm mb-4">TACTICAL KNOWLEDGE SYSTEM</p>

                                {/* QUESTION DIFFICULTY & PRACTICE CONTROL */}
                                <div className="flex flex-col items-center w-full max-w-md mb-4 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                                    <div className="flex justify-between w-full text-xs text-cyan-400 font-bold tracking-widest mb-2">
                                        <span>QUESTION COMPLEXITY</span>
                                        <span>x{QUESTION_DIFF_LEVELS[qDiffIndex]} MULTIPLIER</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="3" step="1"
                                        value={qDiffIndex}
                                        onChange={(e) => setQDiffIndex(parseInt(e.target.value))}
                                        className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-4"
                                    />
                                    <div className="flex justify-between w-full text-[10px] text-slate-500 uppercase tracking-widest px-1">
                                        <span>STD</span><span>ADV</span><span>EXP</span><span>ELITE</span>
                                    </div>

                                    {/* PRACTICE MODE GLOWING SIGN */}
                                    <div className="mt-4 w-full flex flex-col items-center gap-1">
                                        <button
                                            onClick={() => setPracticeMode(!practiceMode)}
                                            className={`w-full py-1.5 border rounded transition-all tracking-[0.2em] font-bold text-[10px] ${practiceMode ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-slate-800 border-slate-600 text-slate-500 hover:border-slate-400'}`}
                                        >
                                            {practiceMode ? 'SIMULATION ACTIVE' : 'ENABLE SIMULATION'}
                                        </button>
                                        {practiceMode && (
                                            <div className="text-[10px] text-indigo-400 animate-pulse tracking-widest">
                                                ⚠ 0x REWARDS // TRAINING
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* GRID MENU STACK */}
                                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl px-4 mb-4 z-20">
                                    {Object.entries(CONFIG).map(([key, conf]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                console.log("Button Clicked:", key)
                                                startGame(key as Difficulty)
                                            }}
                                            className={`group relative p-3 border border-slate-700 hover:border-cyan-400 transition-all rounded-lg bg-slate-900/80 hover:bg-slate-800 flex flex-col items-start justify-between h-32 overflow-hidden shadow-lg`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                                            <div className="flex flex-col items-start w-full">
                                                <div className="flex justify-between w-full items-baseline mb-1">
                                                    <span className={`text-2xl font-bold ${conf.color}`}>{conf.label}</span>
                                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest">{conf.subtitle}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 leading-tight text-left">{conf.desc}</div>
                                            </div>

                                            <div className="flex w-full justify-between items-end mt-2 border-t border-slate-700/50 pt-2">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">TOTAL MULTIPLIER</span>
                                                <span className="text-xl font-black text-yellow-400 animate-pulse px-2 py-0.5 bg-yellow-900/20 border border-yellow-500/50 rounded shadow-[0_0_10px_rgba(250,204,21,0.2)]">x{(conf.scoreMult * QUESTION_DIFF_LEVELS[qDiffIndex] * (practiceMode ? 0 : 1)).toFixed(1)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowLeaderboard(true)}
                                    className="mb-8 text-amber-500 hover:text-amber-400 text-sm tracking-widest uppercase flex items-center gap-2 transition-colors"
                                >
                                    <Shield size={16} /> View Leaderboard
                                </button>
                                {/* Leaderboard Modal */}
                                {showLeaderboard && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30 animate-in fade-in duration-300">
                                        <h2 className="text-3xl font-bold text-amber-500 mb-6 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">High Scores</h2>
                                        <div className="w-3/4 max-w-md border border-slate-800 rounded-lg p-6 bg-slate-900/80 backdrop-blur-sm shadow-2xl">
                                            <div className="grid grid-cols-3 gap-4 mb-4 text-xs text-slate-500 uppercase font-bold border-b border-slate-700 pb-2">
                                                <span>Operative</span>
                                                <span className="text-right">Score</span>
                                                <span className="text-right">Rank</span>
                                            </div>
                                            <div className="space-y-3">
                                                {highScores.map((entry, i) => (
                                                    <div key={i} className="grid grid-cols-3 gap-4 text-sm font-mono text-cyan-400 items-center">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-xs font-bold ${i === 0 ? 'text-amber-400' : 'text-slate-600'}`}>{i + 1}.</span>
                                                            <span className={i === 0 ? 'text-amber-200' : ''}>{entry.name}</span>
                                                        </div>
                                                        <div className="text-right text-amber-400 font-bold">{entry.score.toLocaleString()}</div>
                                                        <div className="text-right text-slate-500 text-[10px] uppercase tracking-wider">{entry.difficulty}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowLeaderboard(false)}
                                            className="mt-8 px-6 py-2 border border-slate-700 hover:border-amber-500 text-slate-400 hover:text-amber-400 uppercase text-xs tracking-[0.2em] rounded transition-all"
                                        >
                                            [ Close Database ]
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        {/* HIGH SCORES */}
                        {highScores.length > 0 && (
                            <div className="absolute top-1/2 -right-[280px] -translate-y-1/2 w-64 bg-slate-900/90 border-l-2 border-cyan-500/50 p-6 backdrop-blur-md">
                                <h3 className="text-cyan-400 font-bold tracking-widest border-b border-cyan-500/30 pb-2 mb-4 text-sm">TOP OPERATIVES</h3>
                                <div className="space-y-4">
                                    {highScores.map((h, i) => (
                                        <div key={i} className="flex flex-col text-xs">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className={`font-bold ${i === 0 ? 'text-yellow-400' : 'text-slate-300'}`}>{h.name}</span>
                                                <span className="text-cyan-500">{h.score.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span className="uppercase">{h.difficulty}</span>
                                                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LOADING */}
                {
                    gameState === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20">
                            <div className="w-20 h-20 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-6" />
                            <p className="animate-pulse text-cyan-500 tracking-widest text-sm">INITIALIZING SECTOR...</p>
                        </div>
                    )
                }





                {/* ENEMY DOM OVERLAY LAYER */}
                {gameState === 'playing' && (
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                        {enemyList.map((e) => (
                            <div
                                key={e.index}
                                id={`enemy-label-${e.index}`}
                                className="absolute top-0 left-0 flex items-center justify-center p-2 text-center will-change-transform transition-opacity duration-200"
                                style={{
                                    width: '250px',
                                    height: '80px',
                                    opacity: 0 // Hidden initially until loop syncs
                                }}
                            >
                                <div className="text-slate-200 font-mono text-sm drop-shadow-[0_0_5px_black]">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{ p: ({ children }) => <span className="latex-math">{children}</span> }} // Inline for labels
                                    >
                                        {e.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                )}


                {currentQuestion && (gameState === 'playing' || gameState === 'loading') && (
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 
                                  bg-slate-900/10 border border-cyan-500/20 px-6 py-4 rounded-xl
                                  shadow-[0_0_30px_rgba(34,211,238,0.05)] backdrop-blur-[2px] z-10
                                  w-[90%] max-w-5xl text-center pointer-events-none">
                        <div className="text-cyan-400 text-sm font-mono tracking-wider">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: (props) => <p className="latex-math" {...props} />
                                }}
                            >
                                {currentQuestion}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* GAME OVER / VICTORY */}
                {
                    (gameState === 'victory' || gameState === 'gameover') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 backdrop-blur-md">
                            {gameState === 'victory' ? (
                                <div className="text-center animate-in fade-in zoom-in duration-500">
                                    <h1 className="text-6xl font-black text-green-500 mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(34,197,94,0.5)]">CONTRACT COMPLETE</h1>
                                    <p className="text-green-900 tracking-widest mb-8 text-xl">PAYMENT SECURED</p>

                                    <div className="flex flex-col items-center gap-2 mb-8">
                                        <div className="text-xs text-green-400 tracking-[0.5em] uppercase">Transferring Lepta...</div>
                                        <div className="text-5xl font-mono font-bold text-white tracking-widest tabular-nums">
                                            {displayScore.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center animate-in fade-in zoom-in duration-500">
                                    <h1 className="text-6xl font-black text-red-500 mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]">CONTRACT TERMINATED</h1>
                                    <p className="text-red-900 tracking-widest mb-8 text-xl">SIGNAL LOST</p>

                                    <div className="flex flex-col items-center gap-2 mb-8 opacity-50">
                                        <div className="text-xs text-red-900 tracking-[0.5em] uppercase line-through">Potential Earnings</div>
                                        <div className="text-4xl font-mono font-bold text-red-900/50 tracking-widest tabular-nums line-through">
                                            {score.toLocaleString()}
                                        </div>
                                        <div className="text-lg text-red-500 font-bold mt-2">0 LEPTA SECURED</div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 mb-8 text-center">
                                <div>
                                    <p className="text-slate-500 text-xs tracking-widest mb-1">FINAL SCORE (Λ)</p>
                                    <p className="text-4xl text-white font-bold">{displayScore}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs tracking-widest mb-1">ACCURACY</p>
                                    <p className="text-4xl text-white font-bold">{Math.round((questionsCorrect / TOTAL_QUESTIONS) * 100)}%</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 items-center">
                                <div className="flex gap-4">
                                    <button onClick={() => {
                                        bgWarp.current = { val: 0, target: 0, color: '#1e293b', bloom: 0, flood: { color: '', opacity: 0 }, type: 'NORMAL', direction: 1 }
                                        setGameState('menu')
                                    }} className="px-8 py-3 bg-white text-black font-bold hover:bg-slate-200 transition-colors">
                                        MAIN MENU
                                    </button>
                                    <button onClick={onExit} className="px-8 py-3 border border-white/20 text-slate-400 hover:text-white hover:border-white transition-all">
                                        EXIT SYSTEM
                                    </button>
                                </div>
                                <div className='flex items-center gap-2 text-sm text-slate-400'>
                                    <div className={`w-3 h-3 rounded-full ${autoRestart ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-700'}`} />
                                    AUTO-RESTART {autoRestart ? 'ENABLED' : 'DISABLED'} (PRESS X)
                                </div>
                            </div>
                        </div>
                    )
                }

                <canvas ref={canvasRef} width={800} height={600} className="block w-full h-full" />

                {/* CRT Overlay Effects */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-cyan-500/5 to-transparent z-0" />
            </div >
        </div >
    )
}

export default SpaceInvaders
