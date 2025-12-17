// ==========================================
// TYPES
// ==========================================

export type Constructor = { type: "constructor", symbol: string };
export type Atom = { type: "atom", symbol: string };
export type Variable = { type: "var", symbol: string };
export type Introduction = { type: "introduction", symbol: string };

// Recursive Term Definition
export type Term = Atom | Variable | Introduction | Fact;

export interface Fact {
    type: "fact";
    op: Constructor;
    terms: Term[];
}

// A Rule is just a specialized Fact: fact("rule", [lhs, rhs1, rhs2...])
export type Rule = Fact;

// Substitution Map: Maps variable names to Terms
export type Sub = {
    [variable_name: string]: Term
};

// Generic Result Type for Error Handling
export type Result<T> =
    | { data: T; error?: undefined }
    | { error: { code: string; message?: string }; data?: undefined };

// ==========================================
// HELPERS (Constructors)
// ==========================================

export const atom = (symbol: string): Atom => ({ type: "atom", symbol });
export const variable = (symbol: string): Variable => ({ type: "var", symbol });
export const introduction = (symbol: string): Introduction => ({ type: "introduction", symbol });

// Generic Fact Constructor
export const fact = (opSymbol: string, terms: Term[]): Fact => {
    // TODO: should we enforce that there is at least one term?
    // Think about `absurd` and `unit` and such...
    return {
        type: "fact",
        op: { type: "constructor", symbol: opSymbol },
        terms
    }
}

export const make_rule = (lhs: Term, rhs0: Term, ...rhs: Term[]): Rule => {
    // TODO: enforce no free variables in RHS
    // TODO: enforce no conflict between introduction symbols and variable symbols (just to make it easier to see (better UX), not logically required since we have "type" to distinct between var and introduction)
    // Relevant: actually if no conflict, we only need the first appearance of intro symbol to be explicitly classify as introduction, later appearances can omitted, by there is no harm in being explicit everywhere
    // explicit: var x -> (intro y) (segment (intro y) x)
    // omit, implicit: var x -> (intro y) (segment (_ y) x)
    return {
        type: "fact",
        op: { type: "constructor", symbol: "rule" },
        terms: [lhs, rhs0, ...rhs]
    }
}

// Rule Constructor: 
// Accepts 1 LHS, and ANY number of RHS terms (implicit AND). These RHS are dependent (for example, there is a point AND this point is the midpoint AND ...)
// Usage: rule(LHS, RHS_1, RHS_2, RHS_3)
export const rule = (lhs: Term, ...rhs: Term[]): Rule => ({
    type: "fact",
    op: { type: "constructor", symbol: "rule" },
    terms: [lhs, ...rhs]
});

// ==========================================
// CORE LOGIC
// ==========================================

// 1. Deep Equality Check
export function equal_term(a: Term, b: Term): boolean {
    if (a.type !== b.type) return false;

    if (a.type === 'atom') return a.symbol === (b as Atom).symbol;
    if (a.type === 'var') return a.symbol === (b as Variable).symbol;
    if (a.type === 'introduction') return a.symbol === (b as Introduction).symbol;

    if (a.type === "fact") {
        const tB = b as Fact;
        if (a.op.symbol !== tB.op.symbol) return false;
        if (a.terms.length !== tB.terms.length) return false;
        for (let i = 0; i < a.terms.length; i++) {
            if (!equal_term(a.terms[i]!, tB.terms[i]!)) return false;
        }
        return true;
    }
    return false;
}

export function somewhere_equal(small: Term, big: Term): boolean {
    if (equal_term(small, big)) return true;

    if (big.type === "fact") {
        for (const t of big.terms) {
            if (somewhere_equal(small, t)) return true;
        }
    }

    return false;
}

// 2. Bounded Check
export function all_atoms(term: Term): boolean {
    if (term.type === 'atom') return true;
    if (term.type === 'var' || term.type === 'introduction') return false;
    if (term.type === "fact") {
        return term.terms.every(all_atoms);
    }
    return true;
}

export function all_atoms_or_introductions(term: Term): boolean {
    if (term.type === 'atom' || term.type === 'introduction') return true;
    if (term.type === 'var') return false;
    if (term.type === "fact") {
        return term.terms.every(all_atoms_or_introductions);
    }
    return true;
}

// 3. Bind Introductions (Skolemization)
export function bind_introductions(
    term: Term,
    introduce: (intro: Introduction) => Atom,
    sub: Sub = {}
): Term {
    if (term.type === 'introduction') {
        if (term.symbol in sub) {
            return sub[term.symbol]!;
        } else {
            const newAtom = introduce(term);
            sub[term.symbol] = newAtom;
            return newAtom;
        }
    }

    if (term.type === "fact") {
        return {
            ...term,
            terms: term.terms.map(t => bind_introductions(t, introduce, sub))
        };
    }

    return term;
}

// 4. Bind Variables (Substitution)
export function bind_vars(term: Term, sub: Sub): Result<{
    result: Term,
}> {
    if (term.type === 'var') {
        if (term.symbol in sub) {
            return {
                data: {
                    // Becomes an atom
                    result: sub[term.symbol]!,

                }
            };
        }

        return {
            data: {
                // Still a variable
                result: term,
            }
        }
    }

    if (term.type === "fact") {
        const newTerms: Term[] = [];

        for (const t of term.terms) {
            const result = bind_vars(t, sub);
            if (result.error) {
                return result;
            }
            newTerms.push(result.data.result);

        }

        return {
            data: {
                result: {
                    ...term,
                    terms: newTerms
                },
            }
        };
    }

    return {
        data: {
            result: term,
        }
    }
}

// 5. Pattern Matching (Unification)
export function match(pattern: Term, bounded: Term): Result<{ sub: Sub }> {

    // A. Match Variable
    if (pattern.type === 'var') {
        // Var can match anything
        return { data: { sub: { [pattern.symbol]: bounded } } };
    }

    // B. Match Atom
    if (pattern.type === 'atom') {
        if (bounded.type !== 'atom' || pattern.symbol !== bounded.symbol) {
            return { error: { code: "ATOM_MISMATCH" } };
        }
        return { data: { sub: {} } };
    }

    // C. Match Fact
    if (pattern.type === "fact") {
        if (bounded.type !== "fact") return { error: { code: "TYPE_MISMATCH" } };
        if (pattern.op.symbol !== bounded.op.symbol) return { error: { code: "CONSTRUCTOR_MISMATCH" } };
        if (pattern.terms.length !== bounded.terms.length) return { error: { code: "ARITY_MISMATCH" } };

        let combinedSub: Sub = {};

        for (let i = 0; i < pattern.terms.length; i++) {
            const result = match(pattern.terms[i]!, bounded.terms[i]!);

            if (result.error) return result;

            // Merge substitutions
            for (const [key, val] of Object.entries(result.data.sub)) {
                if (key in combinedSub) {
                    if (!equal_term(combinedSub[key]!, val)) {
                        return { error: { code: "SUBSTITUTION_CONFLICT" } };
                    }
                } else {
                    combinedSub[key] = val;
                }
            }
        }
        return { data: { sub: combinedSub } };
    }

    // D. Match Introduction (rare in LHS, usually exact match required)
    if (pattern.type === 'introduction') {
        if (bounded.type !== 'introduction' || pattern.symbol !== bounded.symbol) {
            return { error: { code: "INTRO_MISMATCH" } };
        }
        return { data: { sub: {} } };
    }

    return { error: { code: "UNKNOWN_TYPE" } };
}

// 6. Validate Rule
// Ensures that a Rule template is well-formed:
// 1. Is actually a "rule" op
// 2. Has at least 2 terms (LHS, RHS...)
// 3. All variables in RHS terms appear in LHS
export function validate_rule(ruleTerm: Rule): Result<{ vars: Set<string> }> {
    if (ruleTerm.op.symbol !== "rule") {
        return { error: { code: "NOT_A_RULE", message: "Op must be 'rule'" } };
    }
    // Allow implicit AND via tail arguments: [LHS, RHS1, RHS2, RHS3...]
    if (ruleTerm.terms.length < 2) {
        return { error: { code: "INVALID_RULE_ARITY", message: "Rule must have at least LHS and one RHS term" } };
    }

    const lhs = ruleTerm.terms[0]!;
    const rhsList = ruleTerm.terms.slice(1); // Treat everything else as RHS consequences

    const lhsVars = new Set<string>();
    const rhsVars = new Set<string>();

    const collect = (t: Term, set: Set<string>) => {
        if (t.type === 'var') set.add(t.symbol);
        if (t.type === "fact") t.terms.forEach(child => collect(child, set));
    };

    collect(lhs, lhsVars);
    // Collect variables from ALL RHS terms
    rhsList.forEach(t => collect(t, rhsVars));

    for (const v of rhsVars) {
        if (!lhsVars.has(v)) {
            return {
                error: {
                    code: "NEW_VARIABLE_IN_RHS",
                    message: `Variable '${v}' appears in RHS but not LHS`
                }
            };
        }
    }

    return { data: { vars: new Set([...lhsVars, ...rhsVars]) } };
}