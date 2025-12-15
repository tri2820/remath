// ======================================================
// Declarative Term Rewriting System (Single File)
// ======================================================

import type { Atom, Introduction, Rule } from "./rewriting"

type Item = Atom | Rule

// ----------------------
// Program state
// ----------------------
class ProgramState {
    private fresh_index: {
        [key: string]: number
    }

    private axioms: Item[]
    private assumptions: Item[]

    constructor(axioms: Item[], assumptions: Item[]) {
        this.axioms = axioms
        this.assumptions = assumptions
        this.fresh_index = {}
    }

    // TODO: making this fully deterministic using hash
    // So that midpoint of a segment always yields the same point
    // Would help with automated proofs
    // For now, since the proof system is interactive, we let the user handle it (if you want something, be consistent and picking the correct one)
    introduce(intro: Introduction): Atom {
        const current_index = this.fresh_index[intro.hint] || 1

        // Consume current index for this hint
        this.fresh_index[intro.hint] = current_index + 1

        return {
            type: "atom",
            symbol: `${intro.hint}${current_index}`
        }
    }

    get world() {
        return [...this.axioms, ...this.assumptions]
    }
}