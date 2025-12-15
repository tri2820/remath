import { bind_introductions, bind_vars, terms_equal, type Atom, type Introduction, type Result, type Rule, type Term } from "./rewriting";

export class World {
    facts: Term[] = [];

    // Initialize the index map
    private fresh_index: { [key: string]: number } = {};

    add(fact: Term) {
        if (!this.has(fact)) {
            this.facts.push(fact);
        }
    }

    has(pattern: Term): boolean {
        return this.facts.some(f => terms_equal(f, pattern));
    }

    // STRICT FIND: Returns a Result type
    find(pattern: Term): Result<{ term: Term }> {
        const found = this.facts.find(f => terms_equal(f, pattern));
        if (!found) {
            const pretty = pattern.type === 'template'
                ? `${pattern.op.symbol}(${pattern.terms.map(t => (t as any).symbol || '?').join(', ')})`
                : (pattern as any).symbol;

            return {
                error: {
                    code: "NOT_FOUND",
                    message: `Could not find term matching pattern: ${pretty}`
                }
            };
        }
        return {
            data: {
                term: found
            }
        };
    }

    // APPLY: Returns the list of facts generated/asserted by this rule
    apply(ruleTemplate: Rule, inputMap: { [varName: string]: Term }): Term[] {
        let currentRule = ruleTemplate;

        // Recursive Unwrapping (Uncurrying)
        while (
            currentRule.terms.length >= 2 &&
            currentRule.terms[1].type === 'template' &&
            currentRule.terms[1].op.symbol === 'rule'
        ) {
            currentRule = currentRule.terms[1] as Rule;
        }

        const consequences = currentRule.terms.slice(1);
        const results: Term[] = [];

        for (const consequence of consequences) {
            const bound = bind_vars(consequence, inputMap);
            // Pass this.introduce (which is now bound via arrow func)
            const concrete = bind_introductions(bound, this.introduce);

            this.add(concrete);
            results.push(concrete);
        }

        return results;
    }

    // Arrow function to capture 'this' context automatically
    introduce = (intro: Introduction): Atom => {
        const current_index = this.fresh_index[intro.hint] || 1;

        // Consume current index for this hint
        this.fresh_index[intro.hint] = current_index + 1;

        return {
            type: "atom",
            symbol: `${intro.hint}_${current_index}` // e.g. "P_1"
        };
    }
}