import React, { useEffect, useRef, useState } from 'react'

const SpaceInvaders = () => {
    const canvasRef = useRef(null)
    const [score, setScore] = useState(0)
    const [gameState, setGameState] = useState('start') // start, playing, gameover

    useEffect(() => {
        if (gameState !== 'playing') return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        let animationFrameId

        // Game loop logic placeholder
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw Player
            ctx.fillStyle = '#00f0ff'
            ctx.fillRect(canvas.width / 2 - 20, canvas.height - 40, 40, 20)

            // Draw Invaders (Answers)
            ctx.fillStyle = '#ff0099'
            ctx.font = '16px monospace'
            ctx.fillText("Option A: 42", 50, 50)
            ctx.fillText("Option B: 21", 200, 50)

            animationFrameId = window.requestAnimationFrame(render)
        }

        render()

        return () => {
            window.cancelAnimationFrame(animationFrameId)
        }
    }, [gameState])

    return (
        <div className="arcade-container">
            <h3>Subject: Universal Truths</h3>
            <p>Question: What is the answer to life, the universe, and everything?</p>

            <div style={{ position: 'relative', width: '600px', height: '400px', margin: '0 auto', background: 'black', border: '1px solid #333' }}>
                {gameState === 'start' && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <button onClick={() => setGameState('playing')}>INSERT COIN (Start)</button>
                    </div>
                )}

                <canvas ref={canvasRef} width={600} height={400} />
            </div>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span>Score: {score}</span>
            </div>
        </div>
    )
}

export default SpaceInvaders
