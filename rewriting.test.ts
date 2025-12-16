import { describe, it, expect } from "bun:test";
import {
    atom,
    variable,
    introduction,
    fact,
    rule,
    equal_term,
    all_atoms,
    bind_introductions,
    bind_vars,
    match,
    validate_rule,
    type Term,
    type Introduction
} from "./rewriting";

describe("Rewriting Engine", () => {

    // ==========================================
    // 1. HELPERS & STRUCTURE
    // ==========================================
    describe("Helpers", () => {
        it("should create correct structures", () => {
            const a = atom("A");
            expect(a).toEqual({ type: "atom", symbol: "A" });

            const v = variable("x");
            expect(v).toEqual({ type: "var", symbol: "x" });

            const t = fact("point", [a, v]);
            expect(t.type).toBe("fact");
            expect(t.op.symbol).toBe("point");
            expect(t.terms).toHaveLength(2);
        });

        it("should treat rules as templates", () => {
            const r = rule(atom("A"), atom("B"));
            expect(r.type).toBe("fact");
            expect(r.op.symbol).toBe("rule");
            expect(r.terms[0]).toEqual(atom("A")); // LHS
            expect(r.terms[1]).toEqual(atom("B")); // RHS 1
        });

        it("should support multiple RHS terms (Implicit AND)", () => {
            // rule(LHS, RHS1, RHS2)
            const r = rule(atom("A"), atom("B"), atom("C"));

            expect(r.op.symbol).toBe("rule");
            expect(r.terms).toHaveLength(3);
            expect(r.terms[0]).toEqual(atom("A")); // LHS
            expect(r.terms[1]).toEqual(atom("B")); // RHS 1
            expect(r.terms[2]).toEqual(atom("C")); // RHS 2
        });
    });

    // ==========================================
    // 2. EQUALITY
    // ==========================================
    describe("equal_term", () => {
        it("should match identical atoms", () => {
            expect(equal_term(atom("A"), atom("A"))).toBeTrue();
            expect(equal_term(atom("A"), atom("B"))).toBeFalse();
        });

        it("should match recursive templates", () => {
            const t1 = fact("sum", [atom("A"), atom("B")]);
            const t2 = fact("sum", [atom("A"), atom("B")]);
            const t3 = fact("sum", [atom("A"), atom("C")]);

            expect(equal_term(t1, t2)).toBeTrue();
            expect(equal_term(t1, t3)).toBeFalse();
        });

        it("should distinguish types", () => {
            expect(equal_term(atom("x"), variable("x"))).toBeFalse();
        });
    });

    // ==========================================
    // 3. BOUNDED CHECK
    // ==========================================
    describe("is_bounded", () => {
        it("should return true for atoms and nested atom templates", () => {
            const t = fact("segment", [atom("A"), atom("B")]);
            expect(all_atoms(t)).toBeTrue();
        });

        it("should return false if a variable exists deeply", () => {
            const t = fact("segment", [atom("A"), variable("x")]);
            expect(all_atoms(t)).toBeFalse();
        });

        it("should return false if an introduction exists", () => {
            const t = fact("line", [atom("A"), introduction("p")]);
            expect(all_atoms(t)).toBeFalse();
        });
    });

    // ==========================================
    // 4. BIND INTRODUCTIONS (Skolemization)
    // ==========================================
    describe("bind_introductions", () => {
        it("should replace introductions with new atoms", () => {
            let counter = 0;
            const generator = (i: Introduction) => atom(`${counter++}`);

            const term = fact("segment", [atom("A"), introduction("p")]);
            const result = bind_introductions(term, generator);

            // Structure check
            expect((result as any).terms[1].type).toBe("atom");
            console.log('result', JSON.stringify(result, null, 2));
            expect((result as any).terms[1].symbol).toBe("0");
        });

        it("should be consistent: same intro symbol = same atom", () => {
            let counter = 0;
            const generator = (i: Introduction) => atom(`Gen_${counter++}`);

            // A rule like: exists(P) -> pair(P, P)
            const term = fact("pair", [introduction("x"), introduction("x")]);

            const result = bind_introductions(term, generator);
            const terms = (result as any).terms;

            // Both should be Gen_0, NOT Gen_0 and Gen_1
            expect(terms[0].symbol).toBe("Gen_0");
            expect(terms[1].symbol).toBe("Gen_0");
            expect(counter).toBe(1); // Generator called once
        });
    });

    // ==========================================
    // 5. BIND VARIABLES (Substitution)
    // ==========================================
    describe("bind_vars", () => {
        it("should replace variables with sub map values", () => {
            const term = fact("point", [variable("x")]);
            const sub = { "x": atom("A") };

            const result = bind_vars(term, sub);
            if (!result.data) throw new Error("bind_vars failed");
            expect(equal_term(result.data.result, fact("point", [atom("A")]))).toBeTrue();
        });

        it("should ignore missing variables", () => {
            const term = variable("y");
            const sub = { "x": atom("A") };
            const result = bind_vars(term, sub);
            if (!result.data) throw new Error("bind_vars failed");
            expect(equal_term(result.data.result, variable("y"))).toBeTrue();
        });

        it("should handle recursive substitution", () => {
            // equal(sum(x, y), z)
            const term = fact("equal", [
                fact("sum", [variable("x"), variable("y")]),
                variable("z")
            ]);

            const sub = {
                "x": atom("1"),
                "y": atom("2"),
                "z": fact("sum", [atom("1"), atom("2")])
            };

            const result = bind_vars(term, sub);

            // Expected: equal(sum(1, 2), sum(1, 2))
            const expected = fact("equal", [
                fact("sum", [atom("1"), atom("2")]),
                fact("sum", [atom("1"), atom("2")])
            ]);

            if (!result.data) throw new Error("bind_vars failed");
            expect(equal_term(result.data.result, expected)).toBeTrue();
        });
    });

    // ==========================================
    // 6. MATCHING (Unification)
    // ==========================================
    describe("match", () => {
        it("should match a variable to an atom", () => {
            const pattern = variable("x");
            const bounded = atom("A");

            const res = match(pattern, bounded);
            expect(res.error).toBeUndefined();
            expect(res.data!.sub["x"]).toEqual(atom("A"));
        });

        it("should match a variable to a template (structural binding)", () => {
            const pattern = fact("foo", [variable("x")]);
            const bounded = fact("foo", [fact("bar", [atom("A")])]);

            const res = match(pattern, bounded);
            expect(res.error).toBeUndefined();
            if (!res.data) throw new Error("match failed");
            if (!res.data.sub["x"]) throw new Error("match missing substitution for x");
            expect(equal_term(res.data.sub["x"], fact("bar", [atom("A")]))).toBeTrue();
        });

        it("should fail on atom mismatch", () => {
            const pattern = fact("point", [atom("A")]);
            const bounded = fact("point", [atom("B")]);

            const res = match(pattern, bounded);
            expect(res.error).toBeDefined();
            expect(res.error!.code).toBe("ATOM_MISMATCH");
        });

        it("should fail on arity mismatch", () => {
            const pattern = fact("point", [variable("x")]);
            const bounded = fact("point", [atom("A"), atom("B")]);

            const res = match(pattern, bounded);
            expect(res.error!.code).toBe("ARITY_MISMATCH");
        });

        it("should fail on substitution conflict", () => {
            // Pattern: equal(x, x)
            // Bounded: equal(A, B) -> conflict, x cannot be A and B
            const pattern = fact("equal", [variable("x"), variable("x")]);
            const bounded = fact("equal", [atom("A"), atom("B")]);

            const res = match(pattern, bounded);
            expect(res.error).toBeDefined();
            expect(res.error!.code).toBe("SUBSTITUTION_CONFLICT");
        });

        it("should succeed on consistent substitution", () => {
            // Pattern: equal(x, x)
            // Bounded: equal(A, A)
            const pattern = fact("equal", [variable("x"), variable("x")]);
            const bounded = fact("equal", [atom("A"), atom("A")]);

            const res = match(pattern, bounded);
            expect(res.error).toBeUndefined();
            expect(res.data!.sub["x"]).toEqual(atom("A"));
        });
    });

    // ==========================================
    // 7. RULE VALIDATION
    // ==========================================
    describe("validate_rule", () => {
        it("should validate a correct simple rule", () => {
            // A => A
            const r = rule(variable("A"), variable("A"));
            const res = validate_rule(r);
            expect(res.data).toBeDefined();
        });

        it("should validate a rule with multiple RHS terms (Implicit AND)", () => {
            // segment(A, B) => point(A), point(B)
            // All variables in RHS (A, B) exist in LHS
            const r = rule(
                fact("segment", [variable("A"), variable("B")]),
                fact("point", [variable("A")]),
                fact("point", [variable("B")])
            );
            const res = validate_rule(r);
            expect(res.data).toBeDefined();
            expect(res.data!.vars.has("A")).toBeTrue();
            expect(res.data!.vars.has("B")).toBeTrue();
        });

        it("should validate a rule with intros", () => {
            // segment(A, B) => segment(B, !C)
            const r = rule(
                fact("segment", [variable("A"), variable("B")]),
                fact("segment", [variable("B"), introduction("c")])
            );
            const res = validate_rule(r);
            expect(res.data).toBeDefined();
        });

        it("should fail if *any* RHS term has a variable not in LHS", () => {
            // point(A) => point(A), line(A, B)  <-- B is unknown in the second RHS term
            const r = rule(
                fact("point", [variable("A")]),
                fact("point", [variable("A")]),
                fact("line", [variable("A"), variable("B")])
            );

            const res = validate_rule(r);
            expect(res.error).toBeDefined();
            expect(res.error!.code).toBe("NEW_VARIABLE_IN_RHS");
        });

        it("should fail if op is not rule", () => {
            const notRule = fact("not_rule", []);
            // Force cast to Rule to test runtime check
            const res = validate_rule(notRule as any);
            expect(res.error!.code).toBe("NOT_A_RULE");
        });

        it("should fail if rule has no RHS", () => {
            // rule(LHS) - invalid arity
            const r = fact("rule", [atom("A")]);
            const res = validate_rule(r as any);
            expect(res.error!.code).toBe("INVALID_RULE_ARITY");
        });
    });

});