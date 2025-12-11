import React, { useEffect, useRef } from 'react';

export function LivingBackground({ faint = false, originY = 0.4, originX, backgroundRef }: { faint?: boolean; originY?: number; originX?: number, backgroundRef?: React.MutableRefObject<{ x: number, y: number } | null> }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Store static props in ref to access inside closure
    const propsRef = useRef({ originY, originX, faint, backgroundRef });
    useEffect(() => {
        propsRef.current = { originY, originX, faint, backgroundRef };
    }, [originY, originX, faint, backgroundRef]);

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
            // THROTTLE: 20 FPS (approx 50ms per frame)
            const now = Date.now();
            const elapsed = now - lastFrameTime;

            // If less than 50ms has passed, skip drawing but keep the loop alive
            if (elapsed < 50) {
                requestAnimationFrame(draw);
                return;
            }
            // Update timestamp for next frame
            lastFrameTime = now - (elapsed % 50);

            // Read latest props
            const { originY, originX, faint, backgroundRef } = propsRef.current;

            // Clear
            ctx.fillStyle = "#0c0a09"; // Stone-950
            ctx.fillRect(0, 0, w, h);

            // --- SCENE SETUP ---
            // 1. Grid Origin (Static Fixed Position)
            // User requested "hex fixed pos". We center it on the screen.
            const gridCx = w / 2;
            const gridCy = h / 2;

            // 2. Spiral Origin (Dynamic Fixed WRT Eye)
            // Use ref if available (high perf), else props, else center
            let spiralCx = w / 2;
            let spiralCy = originY !== undefined && originY <= 1 ? h * originY : (originY ?? h * 0.4);

            if (backgroundRef && backgroundRef.current) {
                spiralCx = backgroundRef.current.x;
                spiralCy = backgroundRef.current.y;
            } else if (originX !== undefined) {
                spiralCx = originX;
                // If using originX, adhere to originY logic
                if (originY !== undefined && originY > 1) spiralCy = originY;
            }

            // Base opacity
            const baseOpacity = faint ? 0.03 : 0.08;
            const pulseOpacity = faint ? 0.1 : 0.3;

            // ... Animation State ...
            const breath = Math.sin(time * 0.02);
            const scale = 1 + breath * 0.02;

            if (time > nextPulseTime && !pulseActive) {
                pulseActive = true;
                pulseRadius = 0;
                nextPulseTime = time + Math.random() * 300 + 200;
            }

            if (pulseActive) {
                pulseRadius += 10;
                const maxRadius = Math.max(w, h);
                if (pulseRadius > maxRadius) pulseActive = false;
            }

            // --- DRAW: HEX GRID (Static) ---
            ctx.lineWidth = 1;
            const gridSize = 60;

            ctx.save();
            ctx.translate(gridCx, gridCy); // Center Grid on Screen
            // Note: We do NOT shift by -gridSize here because we want standard wallpaper centering, 
            // unless we want a specific alignment at (0,0) of the viewport. 
            // The user didn't specify grid alignment relative to viewport, just that it should be "fixed pos".
            // But previous alignment was "intersection at eye".
            // Since Eye moves and Grid is static, they will only align occasionally.
            // Let's keep the -gridSize shift just to keep the pattern origin consistent with previous logic if they happen to align.
            ctx.translate(-gridSize, 0);

            const xLimit = Math.ceil(w / 2 / (gridSize * 1.5)) + 2;
            const yLimit = Math.ceil(h / 2 / (gridSize * 0.866)) + 2;

            for (let iy = -yLimit; iy <= yLimit; iy++) {
                const y = iy * gridSize * 0.866;
                const xOffset = (Math.abs(iy) % 2) * (gridSize * 1.5);

                for (let ix = -xLimit; ix <= xLimit; ix++) {
                    const x = ix * gridSize * 3 + xOffset;

                    // Pulse distance based on SPIRAL center or GRID center? 
                    // Usually effects track the "active" element (Eye).
                    // Calculating distance from spiral origin for pulse interaction makes sense.
                    // But we are in Grid coordinate space (translated to gridCx, gridCy).
                    // Spiral is at (spiralCx - gridCx, spiralCy - gridCy).
                    // Spiral pos in Grid Space: (spiralCx - gridCx, spiralCy - gridCy)

                    const dx = x - (spiralCx - gridCx);
                    const dy = y - (spiralCy - gridCy);
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    let alpha = baseOpacity;
                    if (pulseActive && Math.abs(dist - pulseRadius) < 150) {
                        alpha = pulseOpacity;
                    }

                    ctx.strokeStyle = `rgba(217, 119, 6, ${alpha})`;
                    drawHexagon(x, y, gridSize);
                }
            }
            ctx.restore();

            // --- DRAW: SPIRAL (Dynamic/Tracking) ---
            ctx.save();
            ctx.translate(spiralCx, spiralCy);
            ctx.scale(scale, scale);

            // El Wire Effect: Brighter, Thicker, Glow
            // Use a radial gradient to fade in the start of the spiral (center)
            const spiralGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
            const targetAlpha = faint ? 0.15 : 0.4;
            const rVal = 255; const gVal = 140; const bVal = 0;
            spiralGradient.addColorStop(0, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`); // Transparent at center
            spiralGradient.addColorStop(0.08, `rgba(${rVal}, ${gVal}, ${bVal}, 0)`); // Stay transparent for a bit shorter
            spiralGradient.addColorStop(0.2, `rgba(${rVal}, ${gVal}, ${bVal}, ${targetAlpha})`); // Fade to target by 60px (vs 120px)
            spiralGradient.addColorStop(1, `rgba(${rVal}, ${gVal}, ${bVal}, ${targetAlpha})`); // Stay at target

            ctx.strokeStyle = spiralGradient;
            ctx.lineWidth = faint ? 1 : 2.5; // Thicker wire
            ctx.shadowBlur = faint ? 5 : 15; // Glow effect
            ctx.shadowColor = "rgba(255, 165, 0, 0.8)";

            ctx.beginPath();
            // Increased loops to cover screen (mobile scrolling)
            const loops = 400;
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

            // 5. Pulse Shockwave Visual (Ring) - Centered on Spiral/Eye
            if (pulseActive && !faint) {
                ctx.beginPath();
                ctx.arc(spiralCx, spiralCy, pulseRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(251, 191, 36, ${0.2 * (1 - pulseRadius / Math.max(w, h))})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            time++;
            requestAnimationFrame(draw);
        };

        let lastFrameTime = Date.now();
        draw();

        return () => window.removeEventListener("resize", resize);
    }, []); // Empty dependency array: Setup loop ONCE. Props are read via Ref.

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 bg-stone-950"
            style={{ pointerEvents: 'none' }}
        />
    );
}
