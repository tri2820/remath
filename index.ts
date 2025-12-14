// ======================================================
// Declarative Term Rewriting System (Single File)
// ======================================================

// ----------------------
// Types
// ----------------------

// Base types
export type Constant = string  // e.g., "circle", "O", "A"
export type Variable = string  // e.g., "?O", "?R", "?C"
export type Fresh = string     // e.g., "!C", "!P"

export type FunctionTerm = {
    head: Constant
    args: Term[]
}

export type Term =
    | Constant
    | Variable
    | Fresh
    | FunctionTerm

export type PatternFunctionTerm = {
    head: Constant
    args: Pattern[]
}

export type Pattern =
    | Constant
    | Variable
    | PatternFunctionTerm

export type Substitution = Map<Variable, Term>

// ----------------------
// Program state
// ----------------------

export type ProgramState = {
    __fresh__: Record<string, number>
    terms: Term[]
    rules: Rule[]
}

// ----------------------
// Rewrite rule (data only)
// ----------------------

export type Rule = {
    name: string
    lhs: Pattern
    rhs: Term
}

// ----------------------
// Fresh name generator
// ----------------------

export function fresh(state: ProgramState, freshGen: Fresh): Constant {
    const prefix = freshGen.slice(1) // Remove the "!" prefix
    const current = state.__fresh__[prefix] || 0
    state.__fresh__[prefix] = current + 1
    return `${prefix}${current + 1}`
}

// ----------------------
// Utilities
// ----------------------


// ----------------------
// Deep equality
// ----------------------

export function deepEqual(a: Term, b: Term): boolean {
    if (typeof a === "string" && typeof b === "string") return a === b
    if (typeof a === "string" || typeof b === "string") return false
    if (a.head !== b.head) return false
    if (a.args.length !== b.args.length) return false
    for (let i = 0; i < a.args.length; i++) {
        if (!deepEqual(a.args[i]!, b.args[i]!)) return false
    }
    return true
}

// ----------------------
// Unification
// ----------------------

export function unify(pattern: Pattern, target: Term, subst: Substitution): boolean {
    // Check if pattern is a variable
    if (typeof pattern === "string" && pattern.startsWith("?")) {
        const bound = subst.get(pattern as Variable)
        if (!bound) {
            subst.set(pattern as Variable, target)
            return true
        }
        return deepEqual(bound, target)
    }

    // Fresh generators don't match anything - they're for RHS only
    if (typeof pattern === "string" && pattern.startsWith("!")) return false

    // Constants match exactly
    if (typeof pattern === "string") {
        return pattern === target
    }

    // Pattern is a compound term
    if (typeof target === "string") return false
    if (pattern.head !== target.head) return false
    if (pattern.args.length !== target.args.length) return false

    for (let i = 0; i < pattern.args.length; i++) {
        if (!unify(pattern.args[i]!, target.args[i]!, subst)) return false
    }

    return true
}

// ----------------------
// Substitution & fresh expansion
// ----------------------
export function expandTerm(t: Term, state: ProgramState, subst: Substitution): Term {
    if (typeof t === "string") {
        // --- fresh generator ---
        if (t.startsWith("!")) {
            return fresh(state, t as Fresh) // t is the fresh generator like "!C"
        }

        // --- pattern variable ---
        if (t.startsWith("?")) {
            const val = subst.get(t)
            if (!val) return t // Return as-is if not bound
            return val
        }

        // --- constant ---
        return t
    }

    // compound term
    return {
        head: t.head,
        args: t.args.map(arg => expandTerm(arg, state, subst))
    }
}



// ----------------------
// Apply a single rule
// ----------------------

export function applyRule(state: ProgramState, rule: Rule): boolean {
    for (let i = 0; i < state.terms.length; i++) {
        const subst: Substitution = new Map()
        if (unify(rule.lhs, state.terms[i]!, subst)) {
            const newTerm = expandTerm(rule.rhs, state, subst)
            state.terms.splice(i, 1, newTerm)
            console.log(`rule fired: ${rule.name}`)
            return true
        }
    }
    return false
}

// ----------------------
// Engine
// ----------------------

export function step(state: ProgramState): boolean {
    for (const rule of state.rules) {
        if (applyRule(state, rule)) return true
    }
    return false
}

export function run(state: ProgramState, maxSteps = 100) {
    for (let i = 0; i < maxSteps; i++) {
        if (!step(state)) break
    }
}

// ----------------------
// Pretty printing
// ----------------------

export function printTerm(t: Term): string {
    if (typeof t === "string") return t
    const values = t.args.map(printTerm).join(", ")
    return `${t.head}(${values})`
}

function printState(state: ProgramState) {
    console.log("=== TERMS ===")
    for (const t of state.terms) {
        console.log(printTerm(t))
    }
}

// ----------------------
// Example usage
// ----------------------

const state: ProgramState = {
    __fresh__: {},
    terms: [
        {
            head: "request",
            args: ["circle", "O", { head: "segment", args: ["O", "A"] }]
        }
    ],
    rules: [
        {
            name: "request_to_circle",
            lhs: { head: "request", args: ["circle", "?O", "?R"] },
            rhs: { head: "circle", args: ["!C", "?O", "?R"] } // declarative only
        }
    ]
}

console.log("Before:")
printState(state)

run(state)

console.log("\nAfter:")
printState(state)
