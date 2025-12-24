
// LEPTA SCORING UTILS

// 1. A* Distance (Grid based)
const getDist = (p1: { x: number, y: number }, p2: { x: number, y: number }, grid: string[][]) => {
    // BFS for exact distance
    const q = [{ x: p1.x, y: p1.y, d: 0 }];
    const visited = new Set<string>();
    visited.add(`${p1.x},${p1.y}`);

    while (q.length > 0) {
        const curr = q.shift()!;
        if (curr.x === p2.x && curr.y === p2.y) return curr.d;

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = curr.x + dx;
            const ny = curr.y + dy;
            if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length && grid[ny][nx] !== 'WALL') {
                const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    q.push({ x: nx, y: ny, d: curr.d + 1 });
                }
            }
        }
    }
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) * 2; // Fallback
};

// 2. TSP Greedy (Estimated Optimal)
export const calculateOptimalTSP = (start: { x: number, y: number }, items: { x: number, y: number }[], end: { x: number, y: number }, grid: string[][]) => {
    let curr = start;
    let remaining = [...items];
    let totalDist = 0;
    let totalTurns = 0;

    // Greedy: Always go to nearest
    while (remaining.length > 0) {
        let minDist = Infinity;
        let bestIdx = -1;

        for (let i = 0; i < remaining.length; i++) {
            const d = getDist(curr, remaining[i], grid);
            if (d < minDist) {
                minDist = d;
                bestIdx = i;
            }
        }

        if (bestIdx !== -1) {
            totalDist += minDist;
            // Estimate Turns: Approx Dist/5 ? Or just Assume 1 turn per segment
            totalTurns += 1;
            curr = remaining[bestIdx];
            remaining.splice(bestIdx, 1);
        } else {
            break; // Unreachable
        }
    }

    // To Exit
    totalDist += getDist(curr, end, grid);
    totalTurns += 1;

    return { dist: totalDist, turns: totalTurns };
};

// 3. Score Formula
export const calculateLeptaScore = (stats: { moves: number, keystrokes: number, damage: number, mistakes?: number }, optimal: { dist: number, turns: number }, shards: number) => {
    const pathFinesse = Math.max(0, stats.moves - optimal.dist);
    const inputFinesse = Math.max(0, stats.keystrokes - optimal.turns); // Assuming Optimal Turns = Segments
    const damagePenalty = stats.damage * 50;
    const mistakePenalty = (stats.mistakes || 0) * 20;

    const totalFinesse = pathFinesse + inputFinesse + damagePenalty + mistakePenalty;

    // Multiplier: 1 + 4 * exp(-F/20) (Max 5x)
    // Goal: 50,000 Max Score (10 rounds -> 5,000 per round).
    // 5,000 / 5x = 1,000 Base.
    const multiplier = 1 + 4 * Math.exp(-totalFinesse / 20);

    const base = shards === 4 ? 1000 : 750;
    const finalScore = Math.floor(base * multiplier);

    return { score: finalScore, multiplier, finesse: totalFinesse };
};
