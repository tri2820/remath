
export type Op = { type: "op", symbol: string } // e.g., "segment", "circle"
export type Atom = { type: "atom", symbol: string } // e.g., "A", "B", "C"
export type Variable = { type: "var", symbol: string } // e.g., "x", "y"
export type Introduction = { type: "introduction", symbol: string, hint: string }

// Introduction symbol is used to consistenly substitle the same introduction symbol with the same new atom (during each application)
// Idiotic example:
// point(x) => point(y) => segment(x, !z), segment(!z, y)

// Introduction hint is just a human-readable hint for what the new atom's symbol should be
// hint: "O" => new atom could be "O1", "O2", etc.


export type Template<T = unknown> = {
    type: 'template',
    op: Op,
    terms: T[]
}
export type LeftTemplate = Template<Variable | Atom>;
export type RightTemplate = Template<Variable | Introduction | Atom>;
export type BoundedTemplate = Template<Atom>;

export type LHS = LeftTemplate | Rule
export type RHS = RightTemplate | Rule
export type BoundedSide = BoundedTemplate | BoundedRule

export type Rule = {
    type: 'rule',
    lhs: LHS,
    rhs: RHS,
}

export type BoundedRule = {
    type: 'bounded_rule',
    lhs: BoundedSide,
    rhs: BoundedSide
}

// Grammar design:
// avoids: points(x,y) => line(x, y) NEW FUNC points NEEDED
// avoids: point(x), point(y) => line(x, y) TWO LHS
// good: point(x) => point(y) => line(x, y)

// sides can be templates or rules
// case rules example:
// (prop(x) => prop(y)) => (prop(y) => prop(z)) => (prop(x) => prop(z))

// template with introduction
// point(x) => line(x, introduce(z))

// =======================
// Useful types during rewriting
// =======================

export type Item = Atom | Template | Rule
export type Sub = {
    [variable_value: string]: string
}


// Check if a rule is fully bounded (only atoms, no variables or introductions)
export function is_bounded(rule: Rule): {
    data: {
        bounded: BoundedRule
    },
    error?: never
} | {
    error: {
        code: string,
    },
    data?: never
} {
    let lhs: BoundedSide;
    if (rule.lhs.type === 'rule') {
        const result = is_bounded(rule.lhs);
        if (result.error) {
            return {
                error: {
                    code: "LHS_BOUNDING_ERROR",
                },
            }
        }
        lhs = result.data.bounded;
    } else {
        const has_non_atom = rule.lhs.terms.some(term => term.type !== 'atom');
        if (has_non_atom) {
            return {
                error: {
                    code: "LHS_NOT_BOUNDED",
                },
            }
        }

        lhs = {
            type: 'template',
            op: rule.lhs.op,
            terms: rule.lhs.terms as Atom[]
        }
    }

    let rhs: BoundedSide
    if (rule.rhs.type === 'rule') {
        const result = is_bounded(rule.rhs);
        if (result.error) {
            return {
                error: {
                    code: "RHS_BOUNDING_ERROR",
                },
            }
        }
        rhs = result.data.bounded;
    } else {
        const has_non_atom = rule.rhs.terms.some(term => term.type !== 'atom');
        if (has_non_atom) {
            return {
                error: {
                    code: "RHS_NOT_BOUNDED",
                },
            }
        }

        rhs = {
            type: 'template',
            op: rule.rhs.op,
            terms: rule.rhs.terms as Atom[]
        }
    }

    return {
        data: {
            bounded: {
                type: 'bounded_rule',
                lhs,
                rhs
            }
        }
    }
}

// Instantiate a rule, introduce new atoms for introductions
export function bind_introductions(rule: Rule, introduce: (intro: Introduction) => Atom): {
    data: {
        rule: Rule,
        sub: Sub
    },
    error?: never
} | {
    error: {
        code: string,
    },
    data?: never

} {
    // introduction.symbol -> new atom.symbol
    let sub: Sub = {}
    let lhs: LHS;
    if (rule.lhs.type === 'rule') {
        const result = bind_introductions(rule.lhs, introduce);
        if (result.error) {
            return {
                error: {
                    code: "LHS_INSTANTIATION_ERROR",
                },
            }
        }
        lhs = result.data.rule;
    } else {
        lhs = rule.lhs;
    }

    let rhs: RHS
    if (rule.rhs.type === 'rule') {
        const result = bind_introductions(rule.rhs, introduce);
        if (result.error) {
            return {
                error: {
                    code: "RHS_INSTANTIATION_ERROR",
                },
            }
        }
        rhs = result.data.rule;
    } else {
        const new_terms = rule.rhs.terms.map(term => {
            if (term.type === 'introduction') {
                if (term.symbol in sub) {
                    const existing_atom_symbol = sub[term.symbol];
                    return {
                        type: 'atom',
                        symbol: existing_atom_symbol
                    } as Atom
                } else {
                    const new_atom = introduce(term);
                    sub[term.symbol] = new_atom.symbol;
                    return new_atom;
                }

            } else {
                return term;
            }
        });

        rhs = {
            type: 'template',
            op: rule.rhs.op,
            terms: new_terms
        }
    }

    return {
        data: {
            sub,
            rule: {
                type: 'rule',
                lhs,
                rhs
            }
        }
    }
}

// Create a half-bound rule by applying a substitution to a rule
export function bind_vars(rule: Rule, sub: Sub): {
    data: {
        rule: Rule
    },
    error?: never
} | {
    error: {
        code: string,
    },
    data?: never
} {
    let lhs: LHS;
    if (rule.lhs.type === 'rule') {
        const result = bind_vars(rule.lhs, sub);
        if (result.error) {
            return {
                error: {
                    code: "LHS_BINDING_ERROR",
                },
            }
        }
        lhs = result.data.rule;
    } else {
        const new_terms = rule.lhs.terms.map(term => {
            if (term.type === 'var') {
                if (term.symbol in sub) {
                    return {
                        type: 'atom',
                        symbol: sub[term.symbol]
                    } as Atom
                } else {
                    // Variable not in substitution map, keep as is
                    return term;
                }
            } else {
                return term;
            }
        });

        lhs = {
            type: 'template',
            op: rule.lhs.op,
            terms: new_terms
        }
    }

    let rhs: RHS
    if (rule.rhs.type === 'rule') {
        const result = bind_vars(rule.rhs, sub);
        if (result.error) {
            return {
                error: {
                    code: "RHS_BINDING_ERROR",
                },
            }
        }
        rhs = result.data.rule;
    } else {
        const new_terms = rule.rhs.terms.map(term => {
            if (term.type === 'var' && term.symbol in sub) {
                if (term.symbol in sub) {
                    return {
                        type: 'atom',
                        symbol: sub[term.symbol]
                    } as Atom
                } else {
                    // Variable not in substitution map, keep as is
                    return term;
                }
            } else if (term.type === 'introduction') {
                // Introductions are kept as is
                return term
            } else {
                return term;
            }
        });

        rhs = {
            type: 'template',
            op: rule.rhs.op,
            terms: new_terms
        }
    }

    return {
        data: {
            rule: {
                type: 'rule',
                lhs,
                rhs
            }
        }
    }
}

// Pattern match a rule against a bounded rule to produce a substitution map
// Used to check if the bounded rule is an instance of the rule
export function match(rule: Rule, bounded: BoundedRule): {
    data: {
        subMap: Sub
    },
    error?: never
} | {
    error: {
        code: string,
    },
    data?: never
} {


    let lhs_subMap: Sub;
    if (rule.lhs.type === 'rule') {
        if (bounded.lhs.type !== 'bounded_rule') {
            return {
                error: {
                    code: "LHS_TYPE_MISMATCH",
                },
            }
        }


        const result = match(rule.lhs, bounded.lhs);
        if (result.error) {
            return {
                error: {
                    code: "LHS_SUBSTITUTION_ERROR",
                },
            }
        }


        // Merge substitution maps
        lhs_subMap = result.data.subMap
    } else {
        if (bounded.lhs.type !== 'template') {
            return {
                error: {
                    code: "LHS_TYPE_MISMATCH",
                },
            }
        }


        if (rule.lhs.op.symbol !== bounded.lhs.op.symbol) {
            return {
                error: {
                    code: "LHS_OP_MISMATCH",
                },
            }
        }

        // Create substitution map from LHS template to bounded LHS template
        // If there is a variable in rule.ls, and there is a corresponding atom in bounded.lhs, map variable to atom
        // If there is already a mapping for the variable, check if it matches the current atom

        lhs_subMap = {}
        for (let i = 0; i < rule.lhs.terms.length; i++) {
            const term = rule.lhs.terms[i];
            const boundedTerm = bounded.lhs.terms[i];

            if (term.type === 'var' && boundedTerm.type === 'atom') {
                if (term.symbol in lhs_subMap) {
                    if (lhs_subMap[term.symbol] !== boundedTerm.symbol) {
                        return {
                            error: {
                                code: "LHS_SUBSTITUTION_CONFLICT",
                            },
                        }
                    }
                } else {
                    lhs_subMap[term.symbol] = boundedTerm.symbol;
                }
            }
        }
    }

    let rhs_subMap: Sub;
    if (rule.rhs.type === 'rule') {
        if (bounded.rhs.type !== 'bounded_rule') {
            return {
                error: {
                    code: "RHS_TYPE_MISMATCH",
                },
            }
        }
        const result = match(rule.rhs, bounded.rhs);
        if (result.error) {
            return {
                error: {
                    code: "RHS_SUBSTITUTION_ERROR",
                },
            }
        }
    } else {
        if (bounded.rhs.type !== 'template') {
            return {
                error: {
                    code: "RHS_TYPE_MISMATCH",
                },
            }
        }

        if (rule.rhs.op.symbol !== bounded.rhs.op.symbol) {
            return {
                error: {
                    code: "RHS_OP_MISMATCH",
                },
            }
        }

        // Create substitution map from RHS template to bounded RHS template
        rhs_subMap = {}
        for (let i = 0; i < rule.rhs.terms.length; i++) {
            const term = rule.rhs.terms[i];
            const boundedTerm = bounded.rhs.terms[i];

            if (term.type === 'var' && boundedTerm.type === 'atom') {
                if (term.symbol in rhs_subMap) {
                    if (rhs_subMap[term.symbol] !== boundedTerm.symbol) {
                        return {
                            error: {
                                code: "RHS_SUBSTITUTION_CONFLICT",
                            },
                        }
                    }
                } else {
                    rhs_subMap[term.symbol] = boundedTerm.symbol;
                }
            }
        }
    }

    // Merge lhs_subMap and rhs_subMap
    // If there is a conflict, return error
    const subMap: Sub = { ...lhs_subMap };
    for (const [key, value] of Object.entries(rhs_subMap)) {
        if (key in subMap) {
            if (subMap[key] !== value) {
                return {
                    error: {
                        code: "SUBSTITUTION_CONFLICT",
                    },
                }
            }
        } else {
            subMap[key] = value;
        }
    }

    return {
        data: {
            subMap
        }
    }
}




export function validate_rule(rule: Rule): {
    data: {
        vars: Set<string>
    },
    error?: never
} | {
    error: {
        code: string,
    },
    data?: never
} {

    let lhs_vars: Set<string>;
    if (rule.lhs.type === 'rule') {
        const result = validate_rule(rule.lhs);
        if (result.error) {
            return {
                error: {
                    code: "LHS_VALIDATION_ERROR",
                },
            }
        }

        lhs_vars = result.data.vars;
    } else {
        // Record seen variables
        const lhs_vars_list = rule.lhs.terms.filter(term => term.type === 'var').map(term => term.symbol);
        lhs_vars = new Set(lhs_vars_list);
    }


    let rhs_vars: Set<string>;
    if (rule.rhs.type === 'rule') {
        const result = validate_rule(rule.rhs);

        if (result.error) {
            return {
                error: {
                    code: "RHS_VALIDATION_ERROR",
                },
            }
        }

        rhs_vars = result.data.vars;
    } else {
        const rhs_vars_list = rule.rhs.terms.filter(term => term.type === 'var').map(term => term.symbol);
        rhs_vars = new Set(rhs_vars_list);
    }


    // All variables in RHS must appear in LHS
    for (const varName of rhs_vars) {
        if (!lhs_vars.has(varName)) {
            return {
                error: {
                    code: "NEW_VARIABLE_IN_RHS",
                },
            }
        }
    }


    const vars = new Set([...lhs_vars, ...rhs_vars])

    return {
        data: {
            vars
        }
    }
}



