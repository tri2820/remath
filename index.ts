// ======================================================
// Declarative Term Rewriting System (Single File)
// ======================================================

import type { Atom, Introduction, Item } from "./rewriting"



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