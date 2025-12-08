import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Shield, Zap, Skull, Crosshair, Info, RefreshCw, Key, HelpCircle, EyeOff } from 'lucide-react'

// --- Types ---
interface SpaceInvadersProps {
    topic: string;
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

const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ topic, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // --- State ---
    const [gameState, setGameState] = useState<GameState>('menu')
    const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM')
    const [score, setScore] = useState(0)
    const scoreRef = useRef(0)
    const [health, setHealth] = useState(100)
    const [questionsCorrect, setQuestionsCorrect] = useState(0)
    const [questionCount, setQuestionCount] = useState(0)
    const [autoRestart, setAutoRestart] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const [shotsRemaining, setShotsRemaining] = useState(3)
    const [reducedMotion, setReducedMotion] = useState(false) // Accessibility

    const [currentQuestion, setCurrentQuestion] = useState<string>("")
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

    // --- Refs (Mutable Game Engine State) ---
    const playerX = useRef(300)
    const bullets = useRef<Bullet[]>([])
    const bombs = useRef<Bomb[]>([])
    const enemies = useRef<Enemy[]>([])
    const particles = useRef<Particle[]>([])
    const menuParticles = useRef<Particle[]>([]) // Distinct particles for menu
    const keys = useRef<{ [key: string]: boolean }>({})
    const lastShotTime = useRef(0)
    const requestId = useRef<number | undefined>(undefined)
    const shakeIntensity = useRef(0)
    const isTransitioning = useRef(false)

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
        const targetIndex = nextIndex !== undefined ? nextIndex : questionCount

        if (targetIndex >= TOTAL_QUESTIONS && !overrideDiff) {
            setGameState(questionsCorrect >= PASS_THRESHOLD ? 'victory' : 'gameover')
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

        try {
            const res = await fetch('http://localhost:8000/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    difficulty: currentDiff === 'STREAMER' ? 'spartan' : currentDiff.toLowerCase(),
                    question_index: targetIndex
                })
            })
            const data = await res.json()
            setCurrentQuestion(data.question || "Error loading question.")

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
            if (overrideDiff) setGameState('playing')

        } catch (err) {
            console.warn("Using fallback question due to error:", err)
            setCurrentQuestion("Error loading. Check connection.")
            const config = (CONFIG as any)[currentDiff]
            const s = config.enemySpeed * 2
            enemies.current = [
                { x: 100, y: 80, width: 250, height: 60, text: "Athens", isCorrect: false, active: true, index: 0, vx: s, vy: s },
                { x: 450, y: 80, width: 250, height: 60, text: "Sparta", isCorrect: true, active: true, index: 1, vx: -s, vy: s },
                { x: 100, y: 200, width: 250, height: 60, text: "Thebes", isCorrect: false, active: true, index: 2, vx: s, vy: -s },
                { x: 450, y: 200, width: 250, height: 60, text: "Corinth", isCorrect: false, active: true, index: 3, vx: -s, vy: -s },
            ]
            if (overrideDiff) setGameState('playing')
        }
    }, [questionCount, questionsCorrect, topic, difficulty])

    const startGame = async (diff: Difficulty) => {
        setDifficulty(diff)
        setScore(0)
        scoreRef.current = 0
        setHealth(100)
        shieldEnergy.current = 100
        setQuestionsCorrect(0)
        setQuestionCount(0)
        isTransitioning.current = false
        particles.current = [] // Clear FX

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

    // --- Input ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()

            if (e.code === 'KeyR') startGame(difficulty)
            if (e.code === 'KeyX') setAutoRestart(prev => !prev)

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
        let timeout: NodeJS.Timeout
        if ((gameState === 'victory' || gameState === 'gameover') && autoRestart) {
            timeout = setTimeout(() => startGame(difficulty), 3000)
        }
        return () => clearTimeout(timeout)
    }, [gameState, autoRestart, difficulty])

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

            // 2. Clear Screen
            ctx.fillStyle = '#020617'
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)'; ctx.lineWidth = 1
            for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
            for (let i = 0; i < CANVAS_HEIGHT; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

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
                } else {
                    isShielding.current = false; shieldEnergy.current = Math.min(100, shieldEnergy.current + SHIELD_RECHARGE)
                }
                if (keys.current['ArrowLeft'] || keys.current['KeyA']) playerX.current -= PLAYER_SPEED
                if (keys.current['ArrowRight'] || keys.current['KeyD']) playerX.current += PLAYER_SPEED
                if (playerX.current < 0) playerX.current = CANVAS_WIDTH; if (playerX.current > CANVAS_WIDTH) playerX.current = 0

                // Fire
                if (keys.current['Space'] && !isShielding.current && Date.now() - lastShotTime.current > 350) {
                    if (shotsRemaining > 0 && !isTransitioning.current) {
                        bullets.current.push({ x: playerX.current, y: CANVAS_HEIGHT - 50, active: true });
                        lastShotTime.current = Date.now()
                        setShotsRemaining(s => s - 1)
                    }
                }

                // Ammo
                if (shotsRemaining <= 0 && bullets.current.filter(b => b.active).length === 0 && !isTransitioning.current) {
                    isTransitioning.current = true
                    setHealth(h => Math.max(0, h - 25)); // Penalty
                    const penalty = 500
                    scoreRef.current = Math.max(0, scoreRef.current - penalty)
                    setScore(scoreRef.current)
                    setFeedbackMessage(`AMMO DEPLETED! -${penalty} pts`)
                    shakeIntensity.current = 10
                    const nextQ = questionCount + 1
                    setQuestionCount(nextQ)
                    setTimeout(() => { loadNextQuestion(undefined, nextQ) }, 1200)
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
                        let dx = playerX.current - b.x; if (Math.abs(dx) > CANVAS_WIDTH / 2) { if (dx > 0) dx -= CANVAS_WIDTH; else dx += CANVAS_WIDTH }
                        const angle = Math.atan2((CANVAS_HEIGHT - 50) - b.y, dx); b.vx += Math.cos(angle) * 0.1; b.vy += Math.sin(angle) * 0.1
                        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (speed > 3) { b.vx *= 0.95; b.vy *= 0.95 }; b.x += b.vx; b.y += b.vy
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
                                enemy.active = false; const points = 100 * diffConfig.scoreMult; scoreRef.current += points; setScore(scoreRef.current)
                                const nextQ = questionCount + 1
                                setQuestionsCorrect(q => q + 1);
                                setQuestionCount(nextQ);
                                setFeedbackMessage(`TARGET NEUTRALIZED +${points}`)
                                enemies.current.forEach(e => e.active = false);
                                isTransitioning.current = true;
                                loadNextQuestion(undefined, nextQ)
                            } else {
                                setHealth(h => Math.max(0, h - 20)); setFeedbackMessage("INCORRECT TARGET! HULL DAMAGED"); shakeIntensity.current = 15
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
                        bomb.active = false; setHealth(h => { let dmg = difficulty === 'STREAMER' ? 40 : 15; if (bomb.type === 'PIERCING') dmg = 50; const next = Math.max(0, h - dmg); if (next <= 0) setGameState('gameover'); return next })
                        const hitColor = bomb.type === 'PIERCING' ? '#facc15' : bomb.type === 'TRACKING' ? '#f87171' : '#ef4444'
                        createExplosion(playerX.current, CANVAS_HEIGHT - 35, hitColor, 'GLITCH')
                        shakeIntensity.current = 20
                    }
                })

                // RENDER ENEMIES
                enemies.current.forEach(enemy => {
                    if (!enemy.active) return
                    ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee'; ctx.strokeStyle = '#22d3ee'; ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height)
                    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(34, 211, 238, 0.05)'; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)
                    ctx.fillStyle = '#e2e8f0'; ctx.font = '14px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
                    wrapText(ctx, enemy.text, enemy.x + enemy.width / 2, enemy.y + 25, enemy.width - 20, 16)
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
                ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 18px "Courier New", monospace'; wrapText(ctx, currentQuestion, CANVAS_WIDTH / 2, 40, CANVAS_WIDTH - 100, 24)
                if (feedbackMessage) { ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px "Courier New", monospace'; ctx.fillText(feedbackMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 120) }
            }

            // LOOP
            if (gameState === 'playing') {
                requestId.current = requestAnimationFrame(render)
            }
        }
        render()
        return () => { if (requestId.current) cancelAnimationFrame(requestId.current) }
    }, [gameState, currentQuestion, feedbackMessage, difficulty, autoRestart, shotsRemaining, reducedMotion])


    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-slate-950 font-mono text-cyan-400">
            {/* Header */}
            <div className="w-[800px] flex justify-between mb-2 text-sm border-b border-white/10 pb-2 uppercase tracking-widest">
                <div className='flex gap-6 items-center'>
                    <span className="text-amber-400 flex items-center gap-2"><Zap size={16} /> {score.toString().padStart(6, '0')}</span>
                    <span className='flex items-center gap-2'><Crosshair size={16} /> {questionCount}/{TOTAL_QUESTIONS}</span>
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
                <button onClick={onExit} className="hover:text-red-400">[ABORT MISSION]</button>
            </div>

            {/* Game Windows */}
            <div className="relative w-[800px] h-[600px] border-2 border-slate-700 bg-black rounded-xl overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)]">

                {/* MENU STATE */}
                {gameState === 'menu' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-20 backdrop-blur-none">

                        {/* Manual & Accessibility Buttons */}
                        {!showInstructions && (
                            <div className="absolute bottom-8 right-8 flex flex-col items-end gap-3 z-30">
                                <button
                                    onClick={() => setReducedMotion(!reducedMotion)}
                                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-md transition-all text-[10px] tracking-widest uppercase ${reducedMotion ? 'bg-cyan-900/50 text-cyan-200 border-cyan-400' : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:text-cyan-400 hover:border-cyan-500/30'}`}
                                >
                                    <EyeOff size={12} /> {reducedMotion ? 'GREEBLES: OFF' : 'GREEBLES: ON'}
                                </button>

                                <button
                                    onClick={() => setShowInstructions(true)}
                                    className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-400 px-4 py-2 border border-cyan-500/30 rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                                >
                                    <HelpCircle size={16} /> <span className="text-xs font-bold tracking-widest">MANUAL</span>
                                </button>
                            </div>
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
                                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                                    TALOS DEFENSE
                                </h1>
                                <p className="text-slate-400 tracking-[0.5em] text-sm mb-8">TACTICAL KNOWLEDGE SYSTEM</p>

                                {/* VERTICAL MENU STACK */}
                                <div className="flex flex-col gap-4 w-full max-w-xl px-8 mb-8 z-20">
                                    {Object.entries(CONFIG).map(([key, conf]) => (
                                        <button
                                            key={key}
                                            onClick={() => startGame(key as Difficulty)}
                                            className={`group relative p-4 border border-slate-700 hover:border-cyan-400 transition-all rounded-lg bg-slate-900/80 hover:bg-slate-800 flex items-center justify-between gap-4 overflow-hidden shadow-lg`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                                            <div className="flex flex-col items-start">
                                                <div className="flex items-baseline gap-3">
                                                    <span className={`text-2xl font-bold ${conf.color}`}>{conf.label}</span>
                                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest">{conf.subtitle}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">{conf.desc}</div>
                                            </div>

                                            <div className="flex flex-col items-end">
                                                <span className="text-lg font-bold text-slate-200">x{conf.scoreMult}</span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">LEPTA</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
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

                {/* GAME OVER / VICTORY */}
                {
                    (gameState === 'victory' || gameState === 'gameover') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 backdrop-blur-md">
                            {gameState === 'victory' ? (
                                <div className="text-center animate-in fade-in zoom-in duration-500">
                                    <h1 className="text-6xl font-black text-green-500 mb-2 tracking-tighter">MISSION CLEAR</h1>
                                    <p className="text-green-900 tracking-widest mb-8 text-xl">SECTOR SECURED</p>
                                </div>
                            ) : (
                                <div className="text-center animate-in fade-in zoom-in duration-500">
                                    <h1 className="text-6xl font-black text-red-500 mb-2 tracking-tighter">CRITICAL FAILURE</h1>
                                    <p className="text-red-900 tracking-widest mb-8 text-xl">HULL DESTROYED</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 mb-8 text-center">
                                <div>
                                    <p className="text-slate-500 text-xs tracking-widest mb-1">FINAL SCORE (Λ)</p>
                                    <p className="text-4xl text-white font-bold">{score}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs tracking-widest mb-1">ACCURACY</p>
                                    <p className="text-4xl text-white font-bold">{Math.round((questionsCorrect / TOTAL_QUESTIONS) * 100)}%</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 items-center">
                                <div className="flex gap-4">
                                    <button onClick={() => setGameState('menu')} className="px-8 py-3 bg-white text-black font-bold hover:bg-slate-200 transition-colors">
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

                <canvas ref={canvasRef} width={800} height={600} className="block" />

                {/* CRT Overlay Effects */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-cyan-500/5 to-transparent z-0" />
            </div >
        </div >
    )
}

export default SpaceInvaders
