import random
import math

def generate_math_question(difficulty: str) -> dict:
    """
    Generates a math problem based on complexity level.
    Levels: easy, medium, hard, spartan
    Returns: { "question": str, "options": List[str], "correct_option_index": int, "explanation": str }
    """
    difficulty = difficulty.lower()
    
    question = ""
    answer = 0
    explanation = ""
    
    # helper for clean integer display
    def fmt(n): return str(int(n)) if n == int(n) else f"{n:.2f}"

    if difficulty == "easy":
        # ARITHMETIC (Add/Sub/Mul)
        ops = ['+', '-', '*']
        op = random.choice(ops)
        a = random.randint(2, 20)
        b = random.randint(2, 20)
        
        if op == '+': answer = a + b
        elif op == '-': answer = a - b
        elif op == '*': answer = a * b
        
        question = f"What is {a} {op} {b}?"
        explanation = f"{a} {op} {b} = {answer}"

    elif difficulty == "medium":
        # ALGEBRA 1 (Linear Equations: ax + b = c)
        a = random.choice([x for x in range(-10, 11) if x != 0])
        x = random.randint(-10, 10) # The secret answer
        b = random.randint(-20, 20)
        c = a * x + b
        
        # Format: ax + b = c
        op_sign = "+" if b >= 0 else "-"
        question = f"Solve for x: {a}x {op_sign} {abs(b)} = {c}"
        answer = x
        explanation = f"{a}x = {c} - {b} => {a}x = {c-b} => x = {x}"

    elif difficulty == "hard":
        # ALGEBRA 2 (Quadratics: x^2 + bx + c = 0, Simple Roots)
        # (x - r1)(x - r2) = x^2 - (r1+r2)x + r1*r2
        r1 = random.randint(-9, 9)
        r2 = random.randint(-9, 9)
        
        # ensure distinct roots for unique answer choice often
        # But we'll just ask for "one of the roots" or sum/product to simplify multiple choice
        # Let's ask for the sum of roots: -b/a
        # actually let's just ask to evaluate a function f(x)
        
        # Let's do Factorization expansion or value at point
        # "Expand (ax + b)(cx + d)"
        a = random.randint(1, 5)
        b = random.randint(1, 10)
        c = random.randint(1, 5)
        d = random.randint(1, 10)
        
        # Answer is "acx^2 + (ad+bc)x + bd"
        # Wait, multiple choice text options are hard to read in game.
        # Let's do: Evaluate f(x) = ax^2 + bx + c at x = k
        a = random.randint(-5, 5)
        b = random.randint(-10, 10)
        c = random.randint(-100, 100)
        x_val = random.randint(-5, 5)
        
        question = f"Evaluate f(x) = {a}x² + {b}x + {c} at x = {x_val}"
        answer = a*(x_val**2) + b*x_val + c
        explanation = f"f({x_val}) = {a}({x_val})² + {b}({x_val}) + {c} = {answer}"

    elif difficulty == "spartan" or difficulty == "expert":
        # PRE-CALCULUS (Logarithms, Trig, Derivatives power rule)
        topic = random.choice(["log", "deriv", "trig", "integral"])
        
        if topic == "log":
            # Log base b of x = y  => b^y = x
            base = random.randint(2, 5)
            ans_exp = random.randint(2, 4)
            val = base ** ans_exp
            question = f"Evaluate: log_{base}({val})"
            answer = ans_exp
            explanation = f"{base}^{ans_exp} = {val}"
            
        elif topic == "deriv":
            # Power Rule: d/dx [ax^n] = anx^{n-1} evaluated at x=1 usually, or just finding the coeff
            # Let's evaluate f'(x) at a point
            n = random.randint(2, 4)
            a = random.randint(2, 6)
            x_val = random.randint(1, 3)
            # f(x) = ax^n
            # f'(x) = anx^{n-1}
            ans_deriv = a * n * (x_val ** (n-1))
            question = f"If f(x) = {a}x^{n}, find f'({x_val})"
            answer = ans_deriv
            explanation = f"Power rule: f'(x) = {a}*{n}x^({n}-1). f'({x_val}) = {a*n}({x_val})^{n-1} = {answer}"

        elif topic == "trig":
            # Exact Values Lookup Table to avoid Floating Point nonsense
            # Tuples of (Angle, Rad, Sin, Cos, Tan, Csc, Sec, Cot)
            # using "U" for Undefined
            trig_table = [
                ("0", 0, 0, 1, 0, "Undefined", 1, "Undefined"),
                ("30°", math.pi/6, 0.5, 0.87, 0.58, 2, 1.15, 1.73), # Rounded for game
                ("45°", math.pi/4, 0.71, 0.71, 1, 1.41, 1.41, 1),
                ("60°", math.pi/3, 0.87, 0.5, 1.73, 1.15, 2, 0.58),
                ("90°", math.pi/2, 1, 0, "Undefined", 1, "Undefined", 0),
                ("180°", math.pi, 0, -1, 0, "Undefined", -1, "Undefined"),
                ("270°", 3*math.pi/2, -1, 0, "Undefined", -1, "Undefined", 0),
                ("360°", 2*math.pi, 0, 1, 0, "Undefined", 1, "Undefined"),
            ]
            
            row = random.choice(trig_table)
            angle_name = row[0]
            
            funcs = ["sin", "cos", "tan", "csc", "sec", "cot"]
            func_idx = random.randint(0, 5)
            func_name = funcs[func_idx]
            
            # Value is at index 2 + func_idx
            val = row[2 + func_idx]
            
            question = f"{func_name}({angle_name})"
            answer = val
            explanation = f"Unit Circle definition: {func_name}({angle_name}) = {answer}"

        elif topic == "integral":
            # Indefinite Integral Power Rule: ∫ ax^n dx = (a/(n+1))x^(n+1) + C
            n = random.randint(1, 3)
            a = random.randint(1, 5) * (n+1) # Ensure Clean Division
            
            coeff = int(a / (n+1))
            new_pow = n + 1
            
            question = f"∫ {a}x^{n} dx"
            answer = f"{coeff}x^{new_pow} + C"
            explanation = f"Power Rule: {a}/({n}+1) * x^({n}+1) = {answer}"
    
    # Generate Options (Answer + 3 Distractors)
    correct_val = answer
    
    options_set = {str(correct_val)}
    range_limit = max(10, abs(int(correct_val)) if isinstance(correct_val, (int, float)) else 10)
    
    while len(options_set) < 4:
        # Special handling for "Undefined" or strings
        if correct_val == "Undefined":
            distractors = ["0", "1", "-1", "Infinity", "NaN"]
            options_set.add(random.choice(distractors))
        elif isinstance(correct_val, str) and "x^" in correct_val: # Integral
            # Generate fake integral strings
            # e.g. wrong power or wrong coeff
            fake_coeff = coeff + random.randint(-2, 2)
            fake_pow = new_pow + random.randint(-1, 1)
            options_set.add(f"{fake_coeff}x^{fake_pow} + C")
        else:
            # Numeric
            if isinstance(correct_val, float):
                offset = random.choice([-0.5, 0.5, -1.0, 1.0])
                distractor = round(correct_val + offset, 2)
            else:
                offset = random.randint(-5, 5)
                distractor = correct_val + int(offset)
            
            if distractor != correct_val:
                options_set.add(str(distractor))
            
    options_list = list(options_set)
    # Ensure options are strings
    options_str = [str(o) for o in options_list]
    random.shuffle(options_str)
    
    correct_index = options_str.index(str(correct_val))
    
    return {
        "question": question,
        "options": options_str,
        "correct_option_index": correct_index,
        "explanation": explanation
    }
