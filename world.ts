import { all_atoms, all_atoms_or_introductions, bind_introductions, bind_vars, match, equal_term, type Atom, type Introduction, type Result, type Rule, type Sub, type Fact, type Term, somewhere_equal } from "./rewriting";


type PatternMatch = {
    // This helps pin-pointing the location of where to match the fact
    // could replace by an "id" also
    // But I like hos this treats all locations (appearances) equally
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
        return this.facts.some(f => equal_term(f, pattern));
    }

    private _apply(rule: Rule, inputMap: Sub): Result<{
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
            if (instantiated_rule.type == "fact" && instantiated_rule.op.symbol === 'rule') {
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

            if (var_bounded_rule.type == "fact" && var_bounded_rule.op.symbol === 'rule') {
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

                // If LHS is fully satisfied (aka bounded), we can return each RHS
                if (all_atoms(lhs)) {
                    for (const rhs of rhs_terms) {
                        new_facts.push(rhs);
                    }
                } else {
                    // no-op
                    // Case LHS is not fully satisfied (aka bounded), we refrain to return each RHS, because we want to maintain their dependencies
                    // Example: RHS1: !P is midpoint of AB
                    //          RHS2: !P is center of circle with center !P and radius AB
                    // Supposed P is to be introduced, it's hard to judge the consequences of returning partial clauses separately, since later they could be initialized and results in 2 separate Ps - each
                    // has a property of the one true P. Or we might maintain a dependency graph to link them, but that would be complicated.
                    // Users might be able to prove they are the same also, but it's nevertheless simpler to keep them together.
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

    apply(rule: Rule, patterns: PatternMatch[]) {
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

            // Need to make sure that p.template exists in rule
            // Aka, tying the shape of the template to that of the rule
            const contained = somewhere_equal(p.template, rule);
            if (!contained) {
                // console.warn("Template not found in rule:", JSON.stringify(p.template, null, 2), JSON.stringify(rule, null, 2));
                return {
                    error: {
                        code: "TEMPLATE_NOT_IN_RULE",
                        message: `The provided template is not found in the given rule.`
                    }
                };
            }

            const sub = match(p.template, p.fact);
            if (sub.error) {
                return {
                    error: sub.error
                };
            }

            // Merge sub into inputMap
            for (const [key, val] of Object.entries(sub.data.sub)) {
                if (key in inputMap) {
                    if (!equal_term(inputMap[key]!, val)) {
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

        // console.log("inputMap:", JSON.stringify(inputMap, null, 2));

        return this._apply(rule, inputMap);
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