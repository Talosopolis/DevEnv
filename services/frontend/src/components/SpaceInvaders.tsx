import React, { useEffect, useRef, useState } from 'react'

interface SpaceInvadersProps {
    topic: string;
    onExit: () => void;
}

const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ topic, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [questionData, setQuestionData] = useState<{
        question: string;
        options: string[];
        correctIndex: number;
    } | null>(null)
    const [score, setScore] = useState(0)
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start') // start, playing, gameover

    useEffect(() => {
        // Fetch question from AI backend
        const fetchQuestion = async () => {
            try {
                // In production, this URL would come from env vars
                const res = await fetch('http://localhost:8000/generate-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: topic, difficulty: 'medium', user_context: 'arcade-mode' })
                })
                const data = await res.json()
                setQuestionData({
                    question: data.question,
                    options: data.options,
                    correctIndex: data.correct_option_index
                })
            } catch (err) {
                console.error("Failed to fetch AI question", err)
                // Fallback for demo if backend is offline
                setQuestionData({
                    question: "What is the answer to life, the universe, and everything?",
                    options: ["42", "21", "Infinity", "Love"],
                    correctIndex: 0
                })
            }
        }
        fetchQuestion()
    }, [])

    useEffect(() => {
        if (gameState !== 'playing' || !questionData) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number

        // Game loop logic placeholder
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw Background
            ctx.fillStyle = '#0f172a'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Player
            ctx.fillStyle = '#22d3ee'
            ctx.fillRect(canvas.width / 2 - 20, canvas.height - 40, 40, 20)

            // Draw Invaders (Options)
            ctx.font = '16px monospace'
            questionData.options.forEach((opt, i) => {
                const x = 50 + (i % 2) * 300
                const y = 50 + Math.floor(i / 2) * 50
                ctx.fillStyle = i === questionData.correctIndex ? '#f472b6' : '#f472b6' // Hide answer in real game
                ctx.fillText(`[${i + 1}] ${opt}`, x, y)
            })

            // Draw Question Text
            ctx.fillStyle = '#fbbf24' // amber-400
            ctx.textAlign = 'center'
            ctx.fillText(questionData.question, canvas.width / 2, canvas.height - 80)
            ctx.textAlign = 'left' // Reset

            animationFrameId = window.requestAnimationFrame(render)
        }

        render()

        return () => {
            window.cancelAnimationFrame(animationFrameId)
        }
    }, [gameState, questionData])

    const [aiFeedback, setAiFeedback] = useState<{ message: string, next_step: string } | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Submit score when game over
    useEffect(() => {
        if (gameState !== 'gameover') return

        const submitScore = async () => {
            setIsSubmitting(true)
            try {
                const res = await fetch('http://localhost:8000/submit-assessment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: topic,
                        score: score,
                        max_score: 100, // Assuming 100 is max for now
                        user_id: "demo-user"
                    })
                })
                const data = await res.json()
                setAiFeedback(data)
            } catch (err) {
                console.error("Failed to submit score", err)
            } finally {
                setIsSubmitting(false)
            }
        }
        submitScore()
    }, [gameState, score, topic])

    return (
        <div className="p-4 border-2 border-amber-400 rounded-lg bg-slate-900 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-slate-950 text-amber-400 px-2 py-1 text-xs font-mono flex justify-between w-full items-center">
                <span>TALOS SYSTEM // ONLINE</span>
                <button onClick={onExit} className="hover:text-red-400 cursor-pointer pointer-events-auto z-50">[EXIT SIMULATION]</button>
            </div>

            <h3 className="text-xl font-bold text-center text-cyan-400 mt-6 mb-2 uppercase tracking-widest text-shadow-glow">
                Subject: {topic}
            </h3>
            <p className="text-center text-slate-300 mb-4 h-6">
                Score: {score}
            </p>

            <div className="relative w-[600px] h-[400px] mx-auto bg-black border border-slate-700 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                {gameState === 'start' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-4 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                            READY PLAYER ONE
                        </h1>
                        <button
                            onClick={() => setGameState('playing')}
                            className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-none border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            INSERT COIN
                        </button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-8 text-center">
                        <h2 className="text-3xl font-bold text-red-500 mb-2">SIMULATION ENDED</h2>
                        <p className="text-xl text-white mb-6">Final Score: {score}</p>

                        {isSubmitting ? (
                            <div className="text-cyan-400 font-mono animate-pulse">
                                UPLOADING RESULTS TO TALOS CLOUD...
                            </div>
                        ) : aiFeedback ? (
                            <div className="bg-slate-800 p-6 border border-cyan-500 rounded-lg max-w-md">
                                <h3 className="text-cyan-400 font-bold mb-2">AI ASSESSMENT COMPLETE</h3>
                                <p className="text-slate-300 mb-4">{aiFeedback.message}</p>
                                <div className="text-sm font-mono text-amber-400 border-t border-slate-700 pt-3">
                                    RECOMMENDED NEXT MISSION:<br />
                                    <span className="text-white text-lg">{aiFeedback.next_step}</span>
                                </div>
                                <div className="mt-6 flex justify-center gap-4">
                                    <button
                                        onClick={onExit}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-bold"
                                    >
                                        ACCEPT MISSION
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-400">Connection Lost.</p>
                        )}
                    </div>
                )}

                <canvas ref={canvasRef} width={600} height={400} className="block w-full h-full" />
            </div>
        </div>
    )
}

export default SpaceInvaders
