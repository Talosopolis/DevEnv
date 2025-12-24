export type MathDifficulty = 'STANDARD' | 'ADVANCED' | 'EXPERT' | 'ELITE';

interface MathQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation?: string;
}

export const generateMathQuestion = (difficulty: MathDifficulty): MathQuestion => {
    let complexity = 0;
    if (difficulty === 'ADVANCED') complexity = 1;
    if (difficulty === 'EXPERT') complexity = 2;
    if (difficulty === 'ELITE') complexity = 3;

    let questionText = "";
    let answer = 0;
    let distractors: number[] = [];

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

    // Process Options
    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    distractors.forEach(d => {
        if (Math.abs(d - answer) > 0.001) {
            optionsSet.add(d);
        }
    });

    while (optionsSet.size < 4) {
        const offset = Math.floor(Math.random() * 10) - 5;
        if (offset !== 0) optionsSet.add(answer + offset);
    }

    const shuffledOptions = Array.from(optionsSet).slice(0, 4).sort(() => Math.random() - 0.5);
    const correctIndex = shuffledOptions.indexOf(answer);

    return {
        question: questionText,
        options: shuffledOptions.map(o => o.toString()),
        correct_option_index: correctIndex,
        explanation: `Answer is ${answer}`
    };
};
