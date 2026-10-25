import { describe, it, expect } from "bun:test";
import { validate_rule, type Rule } from "../rewriting";
import { euclideanAxioms, collinearSymmetry, lineCircleIntersectionAtEnd, lineCircleIntersectionAtStart } from ".";

// The engine now refuses to store malformed rules, so every axiom must be well formed:
// each conclusion variable has to be bound by some LHS along its currying chain.
describe("Euclid axioms are well formed", () => {
    const axioms: Record<string, Rule> = {
        ...euclideanAxioms.text,
        ...euclideanAxioms.hidden_assumptions,
        collinearSymmetry,
        lineCircleIntersectionAtEnd,
        lineCircleIntersectionAtStart,
    };

    for (const [name, axiom] of Object.entries(axioms)) {
        it(`${name} passes validate_rule`, () => {
            const res = validate_rule(axiom);
            if (res.error) {
                throw new Error(`${name}: ${res.error.code} (${res.error.message ?? ""})`);
            }
            expect(res.data).toBeDefined();
        });
    }
});
