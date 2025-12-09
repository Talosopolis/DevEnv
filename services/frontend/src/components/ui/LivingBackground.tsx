import React, { useEffect, useRef } from 'react';

export function LivingBackground({ faint = false }: { faint?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        let time = 0;

        // Pulse State
        let pulseActive = false;
        let pulseRadius = 0;
        let nextPulseTime = Math.random() * 200 + 100; // Random start

        const resize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", resize);

        const drawHexagon = (x: number, y: number, r: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(x + r * Math.cos(i * Math.PI / 3), y + r * Math.sin(i * Math.PI / 3));
            }
            ctx.closePath();
            ctx.stroke();
        };

        const draw = () => {
            // Clear with slight fade for trails (optional, but clean clear is better for this style)
            ctx.fillStyle = "#0c0a09"; // Stone-950
            ctx.fillRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h * 0.4; // Align with eye/center

            // Base opacity regulator
            // If faint (learning mode), use very low opacity (0.1/0.05). 
            // Normal mode: 0.2/0.1
            const baseOpacity = faint ? 0.03 : 0.08;
            const pulseOpacity = faint ? 0.1 : 0.3;

            // 1. "Breathing" State
            const breath = Math.sin(time * 0.02); // -1 to 1
            const scale = 1 + breath * 0.02; // Reduced breathe magnitude

            // 2. Power Pulse Logic
            if (time > nextPulseTime && !pulseActive) {
                pulseActive = true;
                pulseRadius = 0;
                nextPulseTime = time + Math.random() * 300 + 200; // Schedule next
            }

            if (pulseActive) {
                pulseRadius += 10; // Slower shockwave
                const maxRadius = Math.max(w, h);
                if (pulseRadius > maxRadius) {
                    pulseActive = false;
                }
            }

            // 3. Draw Isometric Hex Grid (Background)
            ctx.lineWidth = 1;

            // Pulse Effect on Grid
            // If pulse passes through, brighten the grid

            const gridSize = 60;
            // Isometric offset loop
            for (let y = 0; y < h + gridSize; y += gridSize * 0.866) { // 0.866 = sin(60)
                for (let x = 0; x < w + gridSize; x += gridSize * 3) {
                    const xOffset = (Math.floor(y / (gridSize * 0.866)) % 2) * (gridSize * 1.5);
                    const hx = x + xOffset;
                    const hy = y;

                    // Distance from Pulse Center (Screen Center)
                    const dist = Math.sqrt((hx - cx) ** 2 + (hy - cy) ** 2);

                    // Pulse Interaction
                    let alpha = baseOpacity;
                    if (pulseActive && Math.abs(dist - pulseRadius) < 150) {
                        alpha = pulseOpacity; // Brighten near pulse
                    }

                    ctx.strokeStyle = `rgba(217, 119, 6, ${alpha})`;
                    drawHexagon(hx, hy, gridSize);
                    drawHexagon(hx + gridSize * 1.5, hy + gridSize * 0.866, gridSize);
                }
            }


            // 4. Draw Spiral (Foreground)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale); // Breathe

            // El Wire Effect: Brighter, Thicker, Glow
            ctx.strokeStyle = `rgba(255, 140, 0, ${faint ? 0.15 : 0.4})`; // Reduced brightness (halved)
            ctx.lineWidth = faint ? 1 : 2.5; // Thicker wire
            ctx.shadowBlur = faint ? 5 : 15; // Glow effect
            ctx.shadowColor = "rgba(255, 165, 0, 0.8)";

            ctx.beginPath();
            // Increased loops to cover screen
            const loops = 200;
            for (let i = 0; i < loops; i++) {
                const angle = i * 0.15 + time * 0.002; // Slower rotation
                const r = i * 6; // Tighter winding but more loops = larger total radius
                const x = r * Math.cos(angle);
                const y = r * Math.sin(angle);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Impossible Geometry / Decoration
            if (!faint) {
                ctx.strokeStyle = `rgba(255, 251, 235, 0.05)`; // Very faint
                for (let i = 0; i < 3; i++) {
                    ctx.rotate(time * 0.0005 * (i % 2 === 0 ? 1 : -1));
                    const s = 300 + i * 200;
                    ctx.strokeRect(-s / 2, -s / 2, s, s);
                }
            }

            ctx.restore();

            // Reset shadow for other elements if any (though we clear next frame)
            ctx.shadowBlur = 0;

            // 5. Pulse Shockwave Visual (Ring)
            if (pulseActive && !faint) { // Hide pulse ring in faint mode to minimize distraction
                ctx.beginPath();
                ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(251, 191, 36, ${0.2 * (1 - pulseRadius / Math.max(w, h))})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            time++;
            requestAnimationFrame(draw);
        };
        draw();

        return () => window.removeEventListener("resize", resize);
    }, [faint]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 bg-stone-950"
            style={{ pointerEvents: 'none' }}
        />
    );
}
