import { all_atoms, all_atoms_or_introductions, bind_introductions, bind_vars, match, terms_equal, type Atom, type Introduction, type Result, type Rule, type Sub, type Template, type Term } from "./rewriting";


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

        const var_bounded_rule = res.data.result
        if (all_atoms_or_introductions(var_bounded_rule)) {
            const instantiated_rule = bind_introductions(var_bounded_rule, this.introduce.bind(this));


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
            // partial binding, always the first one
            new_facts.push(var_bounded_rule);

            if (var_bounded_rule.type == 'template' && var_bounded_rule.op.symbol === 'rule') {
                // If LHS is fully bound, we can also add RHS

                const lhs = var_bounded_rule.terms[0];
                const rhs_terms = var_bounded_rule.terms.slice(1);

                // We know the rule should contain lhs, but just to be safe, we check again
                if (!lhs) {
                    return {
                        error: {
                            code: "RULE_MALFORMED_NO_LHS",
                        }
                    };
                }

                // We know cannot contain introductions, but just to be safe, we check again
                if (all_atoms(lhs)) {
                    for (const rhs of rhs_terms) {
                        new_facts.push(rhs);
                    }
                } else {
                    // no-op
                    // Case LHS is not fully satisfied (aka bounded), we have yet to return each RHS, because we want to maintain their dependencies
                    // Example: RHS1: !P is midpoint of AB
                    //          RHS2: !P is center of circle with center !P and radius AB
                    // Supposed P is to be introduced, it's hard to return partial clauses separately. Since later they could be initialized and results in 2 Ps
                    // Users might be able to prove they are the same, But it's better to keep them together for now.
                }
            }



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

        console.log("inputMap:", JSON.stringify(inputMap, null, 2));

        // Do we need to check p.template actually exists in rule?
        // I mean, if p.template does not exists in the rule
        // There would be no matching
        // Thus there would be no substitution generated
        // so inputMap is empty
        // so no new_facts would be generated
        // So I think it's safe to skip that check

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