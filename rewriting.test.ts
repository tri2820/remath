import { describe, it, expect } from "bun:test";
import {
    atom,
    variable,
    introduction,
    template,
    rule,
    terms_equal,
    is_bounded,
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

            const t = template("point", [a, v]);
            expect(t.type).toBe("template");
            expect(t.op.symbol).toBe("point");
            expect(t.terms).toHaveLength(2);
        });

        it("should treat rules as templates", () => {
            const r = rule(atom("A"), atom("B"));
            expect(r.type).toBe("template");
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
    describe("terms_equal", () => {
        it("should match identical atoms", () => {
            expect(terms_equal(atom("A"), atom("A"))).toBeTrue();
            expect(terms_equal(atom("A"), atom("B"))).toBeFalse();
        });

        it("should match recursive templates", () => {
            const t1 = template("sum", [atom("A"), atom("B")]);
            const t2 = template("sum", [atom("A"), atom("B")]);
            const t3 = template("sum", [atom("A"), atom("C")]);

            expect(terms_equal(t1, t2)).toBeTrue();
            expect(terms_equal(t1, t3)).toBeFalse();
        });

        it("should distinguish types", () => {
            expect(terms_equal(atom("x"), variable("x"))).toBeFalse();
        });
    });

    // ==========================================
    // 3. BOUNDED CHECK
    // ==========================================
    describe("is_bounded", () => {
        it("should return true for atoms and nested atom templates", () => {
            const t = template("segment", [atom("A"), atom("B")]);
            expect(is_bounded(t)).toBeTrue();
        });

        it("should return false if a variable exists deeply", () => {
            const t = template("segment", [atom("A"), variable("x")]);
            expect(is_bounded(t)).toBeFalse();
        });

        it("should return false if an introduction exists", () => {
            const t = template("line", [atom("A"), introduction("P", "P")]);
            expect(is_bounded(t)).toBeFalse();
        });
    });

    // ==========================================
    // 4. BIND INTRODUCTIONS (Skolemization)
    // ==========================================
    describe("bind_introductions", () => {
        it("should replace introductions with new atoms", () => {
            let counter = 0;
            const generator = (i: Introduction) => atom(`${i.hint}_${counter++}`);

            const term = template("segment", [atom("A"), introduction("P", "NewPoint")]);
            const result = bind_introductions(term, generator);

            // Structure check
            expect((result as any).terms[1].type).toBe("atom");
            expect((result as any).terms[1].symbol).toBe("NewPoint_0");
        });

        it("should be consistent: same intro symbol = same atom", () => {
            let counter = 0;
            const generator = (i: Introduction) => atom(`Gen_${counter++}`);

            // A rule like: exists(P) -> pair(P, P)
            const term = template("pair", [introduction("X", "H"), introduction("X", "H")]);

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
            const term = template("point", [variable("x")]);
            const sub = { "x": atom("A") };

            const result = bind_vars(term, sub);
            expect(terms_equal(result, template("point", [atom("A")]))).toBeTrue();
        });

        it("should ignore missing variables", () => {
            const term = variable("y");
            const sub = { "x": atom("A") };
            const result = bind_vars(term, sub);
            expect(result).toEqual(variable("y"));
        });

        it("should handle recursive substitution", () => {
            // equal(sum(x, y), z)
            const term = template("equal", [
                template("sum", [variable("x"), variable("y")]),
                variable("z")
            ]);

            const sub = {
                "x": atom("1"),
                "y": atom("2"),
                "z": template("sum", [atom("1"), atom("2")])
            };

            const result = bind_vars(term, sub);

            // Expected: equal(sum(1, 2), sum(1, 2))
            const expected = template("equal", [
                template("sum", [atom("1"), atom("2")]),
                template("sum", [atom("1"), atom("2")])
            ]);

            expect(terms_equal(result, expected)).toBeTrue();
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
            const pattern = template("foo", [variable("x")]);
            const bounded = template("foo", [template("bar", [atom("A")])]);

            const res = match(pattern, bounded);
            expect(res.error).toBeUndefined();
            expect(terms_equal(res.data!.sub["x"], template("bar", [atom("A")]))).toBeTrue();
        });

        it("should fail on atom mismatch", () => {
            const pattern = template("point", [atom("A")]);
            const bounded = template("point", [atom("B")]);

            const res = match(pattern, bounded);
            expect(res.error).toBeDefined();
            expect(res.error!.code).toBe("ATOM_MISMATCH");
        });

        it("should fail on arity mismatch", () => {
            const pattern = template("point", [variable("x")]);
            const bounded = template("point", [atom("A"), atom("B")]);

            const res = match(pattern, bounded);
            expect(res.error!.code).toBe("ARITY_MISMATCH");
        });

        it("should fail on substitution conflict", () => {
            // Pattern: equal(x, x)
            // Bounded: equal(A, B) -> conflict, x cannot be A and B
            const pattern = template("equal", [variable("x"), variable("x")]);
            const bounded = template("equal", [atom("A"), atom("B")]);

            const res = match(pattern, bounded);
            expect(res.error).toBeDefined();
            expect(res.error!.code).toBe("SUBSTITUTION_CONFLICT");
        });

        it("should succeed on consistent substitution", () => {
            // Pattern: equal(x, x)
            // Bounded: equal(A, A)
            const pattern = template("equal", [variable("x"), variable("x")]);
            const bounded = template("equal", [atom("A"), atom("A")]);

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
                template("segment", [variable("A"), variable("B")]),
                template("point", [variable("A")]),
                template("point", [variable("B")])
            );
            const res = validate_rule(r);
            expect(res.data).toBeDefined();
            expect(res.data!.vars.has("A")).toBeTrue();
            expect(res.data!.vars.has("B")).toBeTrue();
        });

        it("should validate a rule with intros", () => {
            // segment(A, B) => segment(B, !C)
            const r = rule(
                template("segment", [variable("A"), variable("B")]),
                template("segment", [variable("B"), introduction("C", "C")])
            );
            const res = validate_rule(r);
            expect(res.data).toBeDefined();
        });

        it("should fail if *any* RHS term has a variable not in LHS", () => {
            // point(A) => point(A), line(A, B)  <-- B is unknown in the second RHS term
            const r = rule(
                template("point", [variable("A")]),
                template("point", [variable("A")]),
                template("line", [variable("A"), variable("B")])
            );

            const res = validate_rule(r);
            expect(res.error).toBeDefined();
            expect(res.error!.code).toBe("NEW_VARIABLE_IN_RHS");
        });

        it("should fail if op is not rule", () => {
            const notRule = template("not_rule", []);
            // Force cast to Rule to test runtime check
            const res = validate_rule(notRule as any);
            expect(res.error!.code).toBe("NOT_A_RULE");
        });

        it("should fail if rule has no RHS", () => {
            // rule(LHS) - invalid arity
            const r = template("rule", [atom("A")]);
            const res = validate_rule(r as any);
            expect(res.error!.code).toBe("INVALID_RULE_ARITY");
        });
    });

});