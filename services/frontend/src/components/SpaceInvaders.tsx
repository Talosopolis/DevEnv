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
    mode?: 'training' | 'assessment';
    onPass?: (score: number) => void;
    onFail?: () => void;
    questionCount?: number;
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
const MAX_AMMO = 20
const PLAYER_SPEED = 5
const BULLET_SPEED = 10
const BOMB_SPEED = 3
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

const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ topic, courseId, onExit, mode = 'training', onPass, onFail, questionCount: propQuestionCount = 10 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // --- State ---
    const [gameState, setGameState] = useState<GameState>('menu')
    const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM')
    const [score, setScore] = useState(0)
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

    const [displayScore, setDisplayScore] = useState(0)
    const scoreRef = useRef(0)
    const seenQuestions = useRef<string[]>([])
    const [health, setHealth] = useState(100)
    const [questionsCorrect, setQuestionsCorrect] = useState(0)
    const [questionCount, setQuestionCount] = useState(0)
    const [autoRestart, setAutoRestart] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const [shotsRemaining, setShotsRemaining] = useState(MAX_AMMO)
    const [reducedMotion, setReducedMotion] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState<string>("")
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

    // Override TOTAL_QUESTIONS based on mode
    const TOTAL_QUESTIONS = mode === 'assessment' ? 3 : propQuestionCount;
    const PASS_THRESHOLD = Math.ceil(TOTAL_QUESTIONS * 0.7)
    const isMathTopic = /math|calc|algebra|geom|trig/i.test(topic || "");

    // --- Refs (Mutable Game Engine State) ---
    const playerX = useRef(300)
    const bullets = useRef<Bullet[]>([])
    const bombs = useRef<Bomb[]>([])
    const enemies = useRef<Enemy[]>([])
    const particles = useRef<Particle[]>([])
    const bgParticles = useRef<{ x: number, y: number, vy: number, color: string }[]>([])
    const menuParticles = useRef<Particle[]>([])
    const keys = useRef<{ [key: string]: boolean }>({})
    const lastShotTime = useRef(0)
    const requestId = useRef<number | undefined>(undefined)
    const shakeIntensity = useRef(0)
    const isTransitioning = useRef(false)
    const bgWarp = useRef({
        val: 0, target: 0,
        color: '#1e293b', bloom: 0,
        flood: { color: '', opacity: 0 },
        type: 'NORMAL' as 'NORMAL' | 'PULSE' | 'GLITCH' | 'WARP',
        direction: 1
    })
    const shieldFizzle = useRef(0)
    const shieldEnergy = useRef(100)
    const isShielding = useRef(false)
    const SHIELD_DRAIN = 100 / (5 * 60)
    const SHIELD_RECHARGE = 100 / (15 * 60)
    const [isCountingDown, setIsCountingDown] = useState(false)
    const countdown = useRef<number | null>(null)
    const inputHistory = useRef<number[]>([])
    const corruptionMode = useRef(false)

    // --- Load Question ---
    const loadNextQuestion = useCallback(async (overrideDiff?: Difficulty, nextIndex?: number) => {
        const currentDiff = overrideDiff || difficulty
        const targetIndex = nextIndex !== undefined ? nextIndex : questionCount

        if (targetIndex >= TOTAL_QUESTIONS && !overrideDiff) {
            const passed = questionsCorrect >= PASS_THRESHOLD;
            const finalState = passed ? 'victory' : 'gameover';
            setGameState(finalState);

            if (mode === 'assessment') {
                if (passed && onPass) setTimeout(() => onPass(score), 2000);
                if (!passed && onFail) setTimeout(() => onFail(), 2000);
            }
            return
        }

        if (overrideDiff) {
            setGameState('loading')
            bullets.current = []
            bombs.current = []
        }

        setFeedbackMessage(null)
        setShotsRemaining(MAX_AMMO)
        isTransitioning.current = false

        let qText = ""
        let optionsList: string[] = []
        let correctIdx = 0

        try {
            if (practiceMode || (isMathTopic && mode === 'assessment')) throw new Error("Force Math Gen")

            const res = await fetch('http://localhost:8000/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    dataset: 'default',
                    course_id: courseId,
                    difficulty: ['easy', 'medium', 'hard', 'spartan'][qDiffIndex] || 'medium',
                    question_index: targetIndex,
                    previous_questions: seenQuestions.current
                })
            })

            if (res.status === 402) {
                setGameState('gameover');
                setFeedbackMessage("MISSION FAILED // INSUFFICIENT OBOLS");
                return;
            }
            if (!res.ok) throw new Error("API Error")

            const data = await res.json()
            qText = data.question
            optionsList = data.options
            correctIdx = data.correct_option_index

        } catch (err) {
            console.warn("Using fallback question due to error:", err)
            if (!practiceMode && courseId && !isMathTopic) {
                setFeedbackMessage("⚠ CONNECTION UNSTABLE // ENGAGING EMERGENCY PROTOCOLS");
            }

            const complexity = qDiffIndex
            let answer = 0
            let distractors: number[] = []

            if (complexity === 0) { // Arithmetic
                const type = Math.floor(Math.random() * 4);
                const limit = 90;
                let a = Math.floor(Math.random() * limit) + 10;
                let b = Math.floor(Math.random() * limit) + 10;
                if (type === 0) { answer = a + b; qText = `$${a} + ${b} = ?$`; distractors = [a + b + 10, a + b - 10, a + b + 1, a + b + 2]; }
                else if (type === 1) { if (a < b) [a, b] = [b, a]; answer = a - b; qText = `$${a} - ${b} = ?$`; distractors = [a - b + 10, a - b - 1, a + b, b - a]; }
                else if (type === 2) { a = Math.floor(Math.random() * 8) + 12; b = Math.floor(Math.random() * 8) + 3; answer = a * b; qText = `$${a} \\times ${b} = ?$`; distractors = [a * b + a, a * b - b, a * b + 10, (a + 1) * b]; }
                else { b = Math.floor(Math.random() * 8) + 4; answer = Math.floor(Math.random() * 15) + 5; a = answer * b; qText = `$${a} \\div ${b} = ?$`; distractors = [answer + 1, answer - 1, answer + 2, Math.floor(answer / 2)]; }
            }
            else if (complexity === 1) { // Algebra
                const type = Math.floor(Math.random() * 5);
                if (type === 0) { const p = Math.floor(Math.random() * 5) + 1; answer = p; qText = `Focus of $x^2=${4 * p}y$. find y-coord`; distractors = [-p, 4 * p, p * 2, p + 1]; }
                else if (type === 1) { const a = Math.floor(Math.random() * 5) + 1; const c = Math.floor(Math.random() * 5) + 1; const b = Math.floor(Math.random() * 8) + 3; answer = b * b - 4 * a * c; qText = `Discriminant of $${a}x^2+${b}x+${c}=0$`; distractors = [b * b + 4 * a * c, b * b, 2 * b, Math.abs(b * b - 2 * a * c)]; }
                else if (type === 2) { const u1 = Math.floor(Math.random() * 5), u2 = Math.floor(Math.random() * 5), v1 = Math.floor(Math.random() * 5), v2 = Math.floor(Math.random() * 5); answer = u1 * v1 + u2 * v2; qText = `$\\langle ${u1},${u2} \\rangle \\cdot \\langle ${v1},${v2} \\rangle = ?$`; distractors = [u1 * v2 - u2 * v1, u1 + v1 + u2 + v2, u1 * v1, u1 * v1 - u2 * v2]; }
                else if (type === 3) { const k = Math.floor(Math.random() * 3) + 3; const c = Math.floor(Math.random() * 3) + 1; let sum = 0; for (let i = 1; i <= k; i++) sum += c * i; answer = sum; qText = `$\\sum_{n=1}^{${k}} ${c}n = ?$`; distractors = [sum - c * k, sum + c * (k + 1), c * k * k, Math.floor(sum / 2)]; }
                else { const m = Math.floor(Math.random() * 5) + 2; answer = m; qText = `Slope of $${m}x - y = 5$`; distractors = [-m, 1 / m, -1 / m, m + 1]; }
            }
            else if (complexity === 2) { // Geometry
                const type = Math.floor(Math.random() * 3);
                if (type === 0) { const angle = (Math.floor(Math.random() * 12) + 3) * 10; answer = angle; qText = `Alt. Int. Angle to ${angle}$^\\circ$`; distractors = [180 - angle, 90 - angle, angle + 10, angle / 2]; }
                else if (type === 1) { const n = 6; answer = 60; qText = `Hexagon Ext. Angle`; distractors = [120, 360, 30, 90]; }
                else { const r = Math.floor(Math.random() * 6) + 2; answer = r * r; qText = `Circle $r=${r}$. Area=$X\\pi$. $X=?$`; distractors = [2 * r, r, r * r * r, r + 2]; }
            }
            else { // Calculus
                const type = Math.floor(Math.random() * 2);
                if (type === 0) { const a = Math.floor(Math.random() * 5) + 2; answer = a; qText = `$\\frac{d}{dx} e^{${a}x}$ at $x=0$`; distractors = [1, 0, Math.exp(a), a + 1]; }
                else { const upper = Math.floor(Math.random() * 3) + 2; answer = upper * upper * upper / 3; qText = `$\\int_0^{${upper}} x^2 dx$`; distractors = [upper * upper, upper * upper * upper, 2 * upper, answer + 1]; }
            }

            const opts = new Set<number>();
            opts.add(answer);
            distractors.forEach(d => { if (d !== answer) opts.add(d); });
            while (opts.size < 4) opts.add(answer + Math.floor(Math.random() * 10) - 5);

            const shuffled = Array.from(opts).slice(0, 4).sort(() => Math.random() - 0.5);
            correctIdx = shuffled.indexOf(answer);
            optionsList = shuffled.map(String);
        }

        setCurrentQuestion(qText || "Error")
        if (qText) seenQuestions.current.push(qText)

        const config = (CONFIG as any)[currentDiff]
        let baseInitSpeed = config.enemySpeed * (currentDiff === 'STREAMER' ? 1.0 : 1.0)
        if (currentDiff === 'STREAMER') baseInitSpeed += questionsCorrect * 0.8
        if (currentDiff === 'HARD') baseInitSpeed += questionsCorrect * 0.4

        const newEnemies = optionsList.map((opt, i) => {
            const speedMult = currentDiff === 'STREAMER' ? 1.2 : 1.0
            const vx = (Math.random() > 0.5 ? 1 : -1) * (baseInitSpeed * (0.8 + Math.random() * 0.4)) * speedMult
            const vy = (Math.random() > 0.5 ? 1 : -1) * (baseInitSpeed * (0.8 + Math.random() * 0.4)) * speedMult
            const xSlot = (i % 2) * 350 + 50
            const ySlot = Math.floor(i / 2) * 100 + 50

            return {
                x: xSlot + Math.random() * 50,
                y: ySlot + Math.random() * 20,
                width: 250, height: 80,
                text: opt, isCorrect: i === correctIdx,
                active: true, index: i, vx, vy
            }
        })
        enemies.current = newEnemies
        if (overrideDiff) setGameState('playing')

    }, [questionCount, questionsCorrect, topic, difficulty, qDiffIndex, practiceMode, mode, isMathTopic, PASS_THRESHOLD, TOTAL_QUESTIONS, courseId, onPass, onFail, score])

    const startGame = async (diff: Difficulty) => {
        setDifficulty(diff)
        setScore(0)
        scoreRef.current = 0
        setHealth(100)
        shieldEnergy.current = 100
        setQuestionsCorrect(0)
        setQuestionCount(0)
        isTransitioning.current = false
        particles.current = []
        seenQuestions.current = []
        await loadNextQuestion(diff, 0)
        setGameState('playing')
        setIsCountingDown(true)
        countdown.current = 3
        const countInt = setInterval(() => {
            if (countdown.current !== null) {
                countdown.current -= 1
                if (countdown.current <= 0) {
                    countdown.current = null
                    setIsCountingDown(false)
                    clearInterval(countInt)
                }
            }
        }, 1000)
    }

    // --- Input Handling ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
            const now = Date.now()
            inputHistory.current.push(now)
            if (inputHistory.current.length > 50) inputHistory.current.shift()

            if (e.code === 'KeyR') startGame(difficulty)
            if (e.code === 'KeyX' && mode !== 'assessment') setAutoRestart(prev => !prev)
            if (e.code === 'KeyM' || e.code === 'KeyP') {
                if (gameState !== 'menu') {
                    bgWarp.current = { val: 0, target: 0, color: '#1e293b', bloom: 0, flood: { color: '', opacity: 0 }, type: 'NORMAL', direction: 1 }
                    setGameState('menu')
                }
            }
            if (e.code === 'Escape') onExit()
            keys.current[e.code] = true
        }
        const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [difficulty, mode, gameState, onExit])

    // --- Auto Restart ---
    useEffect(() => {
        if (mode === 'assessment') return;
        let timeout: ReturnType<typeof setTimeout>
        if (gameState === 'gameover' && autoRestart) {
            timeout = setTimeout(() => startGame(difficulty), 3000)
        }
        return () => clearTimeout(timeout)
    }, [gameState, autoRestart, difficulty, mode])

    // --- Helpers ---
    const createExplosion = (x: number, y: number, color: string, type: Particle['type'] = 'SPARK') => {
        for (let i = 0; i < 20; i++) {
            particles.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0, color, type
            })
        }
    }

    function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        const startY = y - (lines.length * lineHeight) / 2;
        for (let k = 0; k < lines.length; k++) {
            context.fillText(lines[k], x, startY + (k * lineHeight));
        }
    }

    // --- Game Loop (Render) ---
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        const diffConfig = (CONFIG as any)[difficulty]
        const diffIndex = difficulty === 'EASY' ? 0 : difficulty === 'MEDIUM' ? 1 : difficulty === 'HARD' ? 2 : 3
        const gravityStrength = 40 + (diffIndex * 15)
        const repulsionStrength = 20000
        const entropyLevel = 0.1 + (diffIndex * 0.1)
        const CANVAS_WIDTH = 800
        const CANVAS_HEIGHT = 600

        const render = () => {
            // Global Reset
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = 'source-over'
            ctx.shadowBlur = 0
            ctx.shadowColor = 'transparent'
            ctx.globalAlpha = 1

            // Background
            ctx.fillStyle = '#0f172a'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

            // Calculate Shake
            let offsetX = 0
            let offsetY = 0
            if (shakeIntensity.current > 0) {
                offsetX = (Math.random() - 0.5) * shakeIntensity.current
                offsetY = (Math.random() - 0.5) * shakeIntensity.current
                shakeIntensity.current *= 0.9
                if (shakeIntensity.current < 0.5) shakeIntensity.current = 0
            }

            // Apply Warp & Shake
            const centerW = CANVAS_WIDTH / 2
            const centerH = CANVAS_HEIGHT / 2
            ctx.translate(centerW + offsetX, centerH + offsetY)

            if (!reducedMotion) {
                if (bgWarp.current.val > 0) {
                    const scale = 1 + bgWarp.current.val * 0.1
                    const rotation = bgWarp.current.val * 0.05 * bgWarp.current.direction
                    ctx.scale(scale, scale)
                    ctx.rotate(rotation)
                    bgWarp.current.val += (bgWarp.current.target - bgWarp.current.val) * 0.1
                }
            }
            ctx.translate(-centerW, -centerH)

            // Grid
            ctx.strokeStyle = bgWarp.current.color
            ctx.lineWidth = 1
            ctx.shadowBlur = bgWarp.current.bloom
            ctx.shadowColor = bgWarp.current.color

            // Render basic grid
            const gridSize = 40
            ctx.beginPath()
            for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT) }
            for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y) }
            ctx.stroke()

            // Game Over / Victory
            if (gameState === 'gameover' || gameState === 'victory') {
                ctx.fillStyle = gameState === 'victory' ? '#4ade80' : '#ef4444'
                ctx.font = 'bold 40px "Courier New", monospace'
                ctx.textAlign = 'center'
                ctx.fillText(gameState === 'victory' ? "VICTORY" : "GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
                if (mode === 'assessment') {
                    ctx.font = '20px "Courier New", monospace'
                    ctx.fillText(gameState === 'victory' ? "MODULE UNLOCKED" : "RETRY TO PROCEED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40)
                }
                requestId.current = requestAnimationFrame(render)
                return
            }

            // Countdown
            if (isCountingDown && countdown.current) {
                ctx.fillStyle = '#fbbf24'
                ctx.font = 'bold 120px "Courier New", monospace'
                ctx.textAlign = 'center'
                ctx.fillText(countdown.current.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
                ctx.font = '30px "Courier New", monospace'
                ctx.fillText("PREPARE FOR BATTLE", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80)
                requestId.current = requestAnimationFrame(render)
                return
            }

            if (gameState !== 'playing') {
                requestId.current = requestAnimationFrame(render)
                return
            }

            // Input & Logic
            if ((keys.current['ShiftLeft'] || keys.current['ShiftRight']) && shieldEnergy.current > 0) {
                isShielding.current = true; shieldEnergy.current = Math.max(0, shieldEnergy.current - SHIELD_DRAIN)
                if (!reducedMotion && Math.random() > 0.5) {
                    particles.current.push({ x: playerX.current + (Math.random() - 0.5) * 120, y: CANVAS_HEIGHT, vx: 0, vy: -5 - Math.random() * 5, life: 1.0, color: '#22d3ee', type: 'SPARK' })
                }
            } else {
                isShielding.current = false; shieldEnergy.current = Math.min(100, shieldEnergy.current + SHIELD_RECHARGE)
            }

            if (keys.current['ArrowLeft'] || keys.current['KeyA']) playerX.current -= PLAYER_SPEED
            if (keys.current['ArrowRight'] || keys.current['KeyD']) playerX.current += PLAYER_SPEED
            if (playerX.current < 0) playerX.current = CANVAS_WIDTH
            if (playerX.current > CANVAS_WIDTH) playerX.current = 0

            // Fire
            if (keys.current['Space'] && !isShielding.current && Date.now() - lastShotTime.current > 350) {
                if (shotsRemaining > 0 && !isTransitioning.current) {
                    bullets.current.push({ x: playerX.current, y: CANVAS_HEIGHT - 50, active: true });
                    lastShotTime.current = Date.now()
                    setShotsRemaining(s => s - 1)
                }
            }

            const currentMult = diffConfig.scoreMult * QUESTION_DIFF_LEVELS[qDiffIndex] * (practiceMode ? 0 : 1)

            // Ammo Depleted Logic
            if (shotsRemaining <= 0 && bullets.current.filter(b => b.active).length === 0 && !isTransitioning.current) {
                isTransitioning.current = true
                setHealth(h => Math.max(0, h - 25));
                const penalty = 200 * currentMult
                scoreRef.current = Math.max(0, scoreRef.current - penalty)
                setScore(scoreRef.current)
                setFeedbackMessage(`AMMO DEPLETED! -${penalty.toFixed(0)} pts`)
                shakeIntensity.current = 10
                const nextQ = questionCount + 1
                setQuestionCount(nextQ)
                setTimeout(() => { loadNextQuestion(undefined, nextQ) }, 1200)
            }

            // Physics Enemies
            enemies.current.forEach(enemy => {
                if (!enemy.active) return
                enemy.x += enemy.vx; enemy.y += enemy.vy; enemy.vx *= 0.99; enemy.vy *= 0.99
                if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) enemy.vx *= -1
                if (enemy.y <= 40 || enemy.y >= CANVAS_HEIGHT * 0.75) enemy.vy *= -1

                // Fire Bombs
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
                    bombs.current.push({ x: centerX, y: centerY, vx: (dx / dist) * baseSpeed, vy: (dy / dist) * baseSpeed, active: true, type, initialX: centerX })
                }
            })

            // Check Collisions
            bullets.current.filter(b => b.active).forEach(bullet => {
                // Move
                bullet.y -= BULLET_SPEED; if (bullet.y < 0) bullet.active = false;
                // Hit
                enemies.current.forEach(enemy => {
                    if (!enemy.active) return
                    if (bullet.x > enemy.x && bullet.x < enemy.x + enemy.width && bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
                        bullet.active = false; createExplosion(bullet.x, bullet.y, enemy.isCorrect ? '#22d3ee' : '#ef4444'); shakeIntensity.current = 5
                        if (enemy.isCorrect) {
                            enemy.active = false
                            const points = 250 * currentMult
                            scoreRef.current += points; setScore(scoreRef.current); setQuestionsCorrect(q => q + 1); setFeedbackMessage(`TARGET NEUTRALIZED +${points.toFixed(0)}`)
                            enemies.current.forEach(e => e.active = false)
                            isTransitioning.current = true
                            const nextQ = questionCount + 1
                            setQuestionCount(nextQ)
                            loadNextQuestion(undefined, nextQ)
                        } else {
                            setHealth(h => Math.max(0, h - 20)); shakeIntensity.current = 15; setFeedbackMessage(`INCORRECT TARGET! -${(50 * currentMult).toFixed(0)}`)
                        }
                    }
                })
            })

            bombs.current.filter(b => b.active).forEach(bomb => {
                // Move
                bomb.y += bomb.vy; bomb.x += bomb.vx;
                if (bomb.y > CANVAS_HEIGHT) bomb.active = false;
                // Hit Player
                const dist = Math.sqrt((bomb.x - playerX.current) ** 2 + (bomb.y - (CANVAS_HEIGHT - 35)) ** 2)
                if (dist < 45 && isShielding.current && bomb.type !== 'PIERCING') {
                    bomb.active = false; createExplosion(bomb.x, bomb.y, '#06b6d4', 'SPARK'); return
                }
                if (dist < 25) {
                    bomb.active = false;
                    setHealth(h => { const next = Math.max(0, h - 15); if (next <= 0) setGameState('gameover'); return next })
                    setFeedbackMessage("CRITICAL HIT!"); shakeIntensity.current = 20; createExplosion(playerX.current, CANVAS_HEIGHT - 35, '#ef4444')
                }
            })

            // DRAWING
            enemies.current.forEach(enemy => {
                if (!enemy.active) return
                ctx.strokeStyle = '#22d3ee'; ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height)
                ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'; ctx.font = '14px monospace'
                wrapText(ctx, enemy.text, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width - 20, 16)
            })

            // Player
            if (isShielding.current) {
                ctx.strokeStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(playerX.current, CANVAS_HEIGHT - 20, 50, Math.PI, 0); ctx.stroke()
            }
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(playerX.current - 20, CANVAS_HEIGHT - 40, 40, 20)

            // Projectiles
            bullets.current.filter(b => b.active).forEach(b => { ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 2, b.y - 10, 4, 10) });
            bombs.current.filter(b => b.active).forEach(b => { ctx.fillStyle = '#f00'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill() });

            // Particles
            particles.current.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fillRect(p.x, p.y, 3, 3); p.x += p.vx; p.y += p.vy; p.life -= 0.05 });
            particles.current = particles.current.filter(p => p.life > 0); ctx.globalAlpha = 1

            // HUD
            for (let k = 0; k < MAX_AMMO; k++) { ctx.fillStyle = k < shotsRemaining ? '#22d3ee' : '#334155'; ctx.fillRect(CANVAS_WIDTH - 300 + (k * 20), CANVAS_HEIGHT - 25, 10, 15) }
            if (feedbackMessage) { ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px "Courier New", monospace'; ctx.fillText(feedbackMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 120) }

            requestId.current = requestAnimationFrame(render)
        }
        render()
        return () => { if (requestId.current) cancelAnimationFrame(requestId.current) }
    }, [gameState, difficulty, questionCount, questionsCorrect, currentQuestion, feedbackMessage, reducedMotion])

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-transparent font-mono text-cyan-400">
            <div className='flex gap-6 items-center mb-2'>
                <span className="text-amber-400 flex items-center gap-2"><Zap size={16} /> {score}</span>
                <span className='flex items-center gap-2'><Crosshair size={16} /> {questionCount}/{TOTAL_QUESTIONS}</span>
                <span className='flex items-center gap-2 text-xs text-slate-400'>[ESC] EXIT</span>
            </div>
            {topic && (
                <div className="w-full max-w-[800px] mx-auto mb-4 text-center">
                    <h1 className="text-3xl font-bold text-cyan-500 tracking-widest uppercase">{topic}</h1>
                </div>
            )}
            <div className="relative w-[800px] h-[600px] border-2 border-slate-700 bg-black rounded-xl overflow-hidden shadow-2xl">
                {gameState === 'menu' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                        <h1 className="text-5xl font-black text-cyan-400 mb-8">TALOS DEFENSE</h1>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(CONFIG).map(([key, conf]) => (
                                <button key={key} onClick={() => startGame(key as Difficulty)} className="p-4 border border-slate-600 hover:border-cyan-400 hover:bg-slate-800 rounded">
                                    <div className={`text-xl font-bold ${conf.color}`}>{conf.label}</div>
                                    <div className="text-xs text-slate-400">{conf.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <canvas ref={canvasRef} width={800} height={600} className="block w-full h-full" />
            </div>
        </div>
    )
}

export default SpaceInvaders
