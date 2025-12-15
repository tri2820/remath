import { all_atoms_or_introductions, bind_introductions, bind_vars, match, terms_equal, type Atom, type Introduction, type Result, type Rule, type Sub, type Template, type Term } from "./rewriting";


type PatternMatch = {
    template: Term,
    fact: Term
}

export class World {
    facts: Term[] = [];

    // Initialize the index map
    private fresh_index: { [key: string]: number } = {};

    add(fact: Term) {
        if (!this.has(fact)) {
            this.facts.push(fact);
        }
    }

    addAll(facts: Term[]) {
        for (const fact of facts) {
            this.add(fact);
        }
    }

    has(pattern: Term): boolean {
        return this.facts.some(f => terms_equal(f, pattern));
    }

    // STRICT FIND: Returns a Result type
    find(facts: Term[], fact: Term): Result<{ term: Term }> {
        const found = facts.find(f => terms_equal(f, fact));
        if (!found) {
            const pretty = fact.type === 'template'
                ? `${fact.op.symbol}(${fact.terms.map(t => (t as any).symbol || '?').join(', ')})`
                : (fact as any).symbol;

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

    // APPLY: Returns the list of FULLY BOUND facts generated/asserted by this rule
    private apply(rule: Rule, inputMap: Sub): Result<{
        new_facts: Term[]
    }> {
        const new_facts: Term[] = [];
        // bind_vars
        const res = bind_vars(rule, inputMap);
        if (res.error) {
            return {
                error: res.error
            }
        }
        if (all_atoms_or_introductions(res.data.result)) {
            const instantiated_rule = bind_introductions(res.data.result, this.introduce.bind(this));


            // Add the instantiated rule itself (optional)
            // new_facts.push(instantiated_rule);

            // Special case for rule
            if (instantiated_rule.type == 'template' && instantiated_rule.op.symbol === 'rule') {
                // LHS and RHS
                // const lhs = instantiated_rule.terms[0];
                const rhs_terms = instantiated_rule.terms.slice(1);

                // Add each RHS term if not already present
                for (const rhs of rhs_terms) {
                    new_facts.push(rhs);
                }
            }
        } else if (res.data.bound_vars.size > 0) {
            // partial binding
            new_facts.push(res.data.result);
        } else {
            // return empty, inputMap does not affect the rule
            return {
                data: {
                    new_facts: []
                }
            };
        }

        return {
            data: {
                new_facts
            }
        };
    }

    findAndApply(rule: Rule, patterns: PatternMatch[]) {
        const all_ok = patterns.every(p => {
            return this.has(p.fact);
        })

        if (!all_ok) {
            return {
                error: {
                    code: "INPUT_NOT_FOUND",
                    message: `One or more input patterns could not be found in world facts.`
                }
            };
        }

        // check that he fact satisfies the term
        const inputMap: Sub = {};
        for (const p of patterns) {
            const sub = match(p.template, p.fact);
            if (sub.error) {
                return {
                    error: sub.error
                };
            }

            // Merge sub into inputMap
            for (const [key, val] of Object.entries(sub.data.sub)) {
                if (key in inputMap) {
                    if (!terms_equal(inputMap[key]!, val)) {
                        return {
                            error: {
                                code: "SUBSTITUTION_CONFLICT",
                                message: `Conflicting substitutions for variable "${key}".`
                            }
                        };
                    }
                } else {
                    inputMap[key] = val;
                }
            }
        }

        return this.apply(rule, inputMap);
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