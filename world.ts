import { all_atoms, all_atoms_or_introductions, bind_introductions, bind_vars, match, equal_term, type Atom, type Introduction, type Result, type Rule, type Sub, type Fact, type Term, somewhere_equal } from "./rewriting";


type Substitution = {
    // This helps pin-pointing the location of where to match the fact
    // could replace by an "id" also
    // But I like hos this treats all locations (appearances) equally
    pattern: Term,
    with: Term
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

    find(pattern: Term): Term | undefined {
        return this.facts.find(f => equal_term(f, pattern));
    }

    private static deduplicate(terms: Term[]): Term[] {
        const unique_terms: Term[] = [];
        for (const term of terms) {
            if (!unique_terms.some(t => equal_term(t, term))) {
                unique_terms.push(term);
            }
        }
        return unique_terms;
    }

    private static decompose(maybe_rules: Term[]) {
        const new_facts: Term[] = [];
        while (true) {
            const current_rule = maybe_rules.pop();
            if (!current_rule) break;
            if (current_rule.type !== "fact" || current_rule.op.symbol !== 'rule') continue;

            const lhs = current_rule.terms[0];
            const rhs_terms = current_rule.terms.slice(1);

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

                // console.log('LHS OK', JSON.stringify(lhs, null, 2));
                for (const rhs of rhs_terms) {
                    new_facts.push(rhs);
                    // console.log('CHECK', JSON.stringify(rhs, null, 2));
                    maybe_rules.push(rhs);
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

        return {
            data: new_facts
        }
    }

    private substituteVar(rule: Rule, inputMap: Sub): Result<Term[]> {
        const new_facts: Term[] = [];
        // bind_vars
        const res = bind_vars(rule, inputMap);
        if (res.error) {
            return {
                error: res.error
            }
        }


        if (res.data.bound_vars.size == 0) {
            // return empty, there was nothing bound
            return {
                data: []
            };
        }

        // TODO: only upon new facts added to the World do we actually increase the counter
        // But for now, there is no harm in increasing it here also
        const bounded_rule = all_atoms_or_introductions(res.data.result) ? bind_introductions(res.data.result, this.introduce.bind(this)) : res.data.result;
        new_facts.push(bounded_rule);

        const decompose_res = World.decompose([bounded_rule]);
        if (decompose_res.error) {
            return decompose_res;
        }

        new_facts.push(...decompose_res.data);

        return {
            data: World.deduplicate(new_facts)
        };
    }

    substitute(rule: Rule, substitutions: Substitution[]) {
        if (!this.has(rule)) return {
            error: {
                code: "RULE_NOT_IN_WORLD",
                message: `The provided rule is not found in world facts.`
            }
        }


        const all_ok = substitutions.every(p => {
            return this.has(p.with);
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

        for (const p of substitutions) {

            // Need to make sure that p.template exists in rule
            // Aka, tying the shape of the template to that of the rule
            const contained = somewhere_equal(p.pattern, rule);
            if (!contained) {
                // console.warn("Template not found in rule:", JSON.stringify(p.template, null, 2), JSON.stringify(rule, null, 2));
                return {
                    error: {
                        code: "PATTERN_NOT_IN_RULE",
                        message: `The provided pattern is not found in the given rule.`
                    }
                };
            }

            const sub = match(p.pattern, p.with);
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

        return this.substituteVar(rule, inputMap);
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