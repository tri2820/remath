import { describe, it, expect } from "bun:test";
import { atom, make_rule, fact, variable } from "./rewriting";
import { World } from "./world";


describe("Rewriting Engine", () => {
    it("Should fail when input mapping is missing", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = fact("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const x_1 = variable("x");
        expect(x_1).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> x
        const id = make_rule(x_0, x_1)
        const res = w.apply(id, [{ template: x_0, fact: pA }])
        expect(res.error?.code).toEqual("INPUT_NOT_FOUND");
    });

    it("Should apply rule correctly when input mapping is complete", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = fact("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const x_1 = variable("x");
        expect(x_1).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> x
        const id = make_rule(x_0, x_1)
        w.add(pA);
        // This means: replacing variable x with pA
        const res = w.apply(id, [{ template: x_0, fact: pA }])
        expect(res.data?.new_facts.length).toEqual(1);
        expect(res.data?.new_facts[0]).toEqual(pA);
    });

    it("Should replace based on symbol", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = fact("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> x
        const id = make_rule(x_0, x_0)
        w.add(pA);
        const res = w.apply(id, [{ template: x_0, fact: pA }])
        expect(res.data?.new_facts.length).toEqual(1);
        expect(res.data?.new_facts[0]).toEqual(pA);
    });


    it("Should work with nested currying rules", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = fact("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> (x -> x)
        const cid = make_rule(x_0, make_rule(x_0, x_0))
        w.add(pA);
        const res = w.apply(cid, [{ template: x_0, fact: pA }])
        expect(res.data?.new_facts.length).toEqual(1);
        // A -> A
        expect(res.data?.new_facts[0]).toEqual(make_rule(pA, pA));
    });

    it("Should work with nested currying rules, complex", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = fact("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: (x -> x) -> (x -> x)
        const cid = make_rule(make_rule(x_0, x_0), make_rule(x_0, x_0))

        const AtoA = make_rule(pA, pA)
        w.add(AtoA);
        const res = w.apply(cid, [{
            template: make_rule(x_0, x_0),
            fact: AtoA
        }])

        expect(res.data?.new_facts.length).toEqual(1);
        // A -> A
        expect(res.data?.new_facts[0]).toEqual(make_rule(pA, pA));
    });

    it("Should error on conflicting substitutions", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const b = atom("B");
        expect(b).toEqual({ type: "atom", symbol: "B" });

        const c = atom("C");
        expect(c).toEqual({ type: "atom", symbol: "C" });

        const pA = fact("point", [a]);
        const pB = fact("point", [b]);
        const pC = fact("point", [c]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });
        const y_0 = variable("y");
        expect(y_0).toEqual({ type: "var", symbol: "y" });
        const z_0 = variable("z");
        expect(z_0).toEqual({ type: "var", symbol: "z" });

        const w = new World();
        // This rule means: (x -> y) -> ((y -> z) -> (x -> z))
        const trans = make_rule(make_rule(x_0, y_0), make_rule(make_rule(y_0, z_0), make_rule(x_0, z_0)))
        w.add(make_rule(pA, pB));
        // Intentionally add the wrong fact here
        w.add(make_rule(pC, pB));
        const res = w.apply(trans, [
            { template: make_rule(x_0, y_0), fact: make_rule(pA, pB) },
            // Obvious here pB -> pC, but we intentionnally mistype
            { template: make_rule(y_0, z_0), fact: make_rule(pC, pB) }
        ])
        expect(res.error?.code).toEqual("SUBSTITUTION_CONFLICT");
    });


    it("Should create partial on incomplete bindings", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const b = atom("B");
        expect(b).toEqual({ type: "atom", symbol: "B" });

        const pA = fact("point", [a]);
        const pB = fact("point", [b]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });
        const y_0 = variable("y");
        expect(y_0).toEqual({ type: "var", symbol: "y" });

        const z_0 = variable("z");
        expect(z_0).toEqual({ type: "var", symbol: "z" });

        const w = new World();
        // This rule means: (x -> y) -> ((y -> z) -> (x -> z))
        const trans = make_rule(make_rule(x_0, y_0), make_rule(make_rule(y_0, z_0), make_rule(x_0, z_0)))
        w.add(make_rule(pA, pB));
        const res = w.apply(trans, [
            { template: make_rule(x_0, y_0), fact: make_rule(pA, pB) }
        ])

        // We expect that it's partial, and the behavior is returning only 1 partial there
        expect(res.data?.new_facts.length).toEqual(2);
        // (A -> B) -> ((B -> z_0) -> (A -> z_0))
        // And also below because LHS is fully bound
        // (B -> z_0) -> (A -> z_0)
        expect(res.data?.new_facts[0]).toEqual(make_rule(make_rule(pA, pB), make_rule(make_rule(pB, z_0), make_rule(pA, z_0))));
        expect(res.data?.new_facts[1]).toEqual(make_rule(make_rule(pB, z_0), make_rule(pA, z_0)));
    });

    it("Fully bind tests", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const b = atom("B");
        expect(b).toEqual({ type: "atom", symbol: "B" });

        const c = atom("C");
        expect(c).toEqual({ type: "atom", symbol: "C" });

        const pA = fact("point", [a]);
        const pB = fact("point", [b]);
        const pC = fact("point", [c]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });
        const y_0 = variable("y");
        expect(y_0).toEqual({ type: "var", symbol: "y" });
        const z_0 = variable("z");
        expect(z_0).toEqual({ type: "var", symbol: "z" });

        const w = new World();
        // This rule means: (x -> y) -> ((y -> z) -> (x -> z))
        const trans = make_rule(make_rule(x_0, y_0), make_rule(make_rule(y_0, z_0), make_rule(x_0, z_0)))
        w.add(make_rule(pA, pB));

        // THIS IS WEIRD. THIS SHOULD BE COMMENTED OUT ABLE.
        // ONLY THE LHS IS NEEDED TO BE IN THE WORLD FACTS (part that matches x -> y)?
        // w.add(make_rule(pB, pC));

        // Oh,
        // We still have a way to do this: basically every apply only acts on a single rule level at a time.
        // So if we don't want to add pB -> pC, we can do it in 2 steps:


        const res = w.apply(trans, [
            { template: make_rule(x_0, y_0), fact: make_rule(pA, pB) },
            // { template: make_rule(y_0, z_0), fact: make_rule(pB, pC) }
        ])


        // (A -> B) -> ((B -> z) -> (A -> z))
        // Also return below because LHS is fully bound
        // (B -> z) -> (A -> z)
        expect(res.data?.new_facts.length).toEqual(2);
        expect(res.data?.new_facts[0]).toEqual(make_rule(make_rule(pA, pB), make_rule(make_rule(pB, z_0), make_rule(pA, z_0))));
        expect(res.data?.new_facts[1]).toEqual(make_rule(make_rule(pB, z_0), make_rule(pA, z_0)));


        // Supposed only later on that we have 
        w.add(make_rule(pB, pC));

        const rest = res.data!.new_facts[1]!

        if (rest.type !== "fact" || rest.op.symbol !== 'rule') {
            throw new Error("Unexpected rule structure");
        }

        const res2 = w.apply(rest, [
            { template: make_rule(pB, z_0), fact: make_rule(pB, pC) }
        ])

        // Finally we get A -> C
        expect(res2.data?.new_facts.length).toEqual(1);
        expect(res2.data?.new_facts[0]).toEqual(make_rule(pA, pC));
    });

    it("Try a pattern that does not exist in rule", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const b = atom("B");
        expect(b).toEqual({ type: "atom", symbol: "B" });

        const c = atom("C");
        expect(c).toEqual({ type: "atom", symbol: "C" });

        const pA = fact("point", [a]);
        const pB = fact("point", [b]);
        const pC = fact("point", [c]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });
        const y_0 = variable("y");
        expect(y_0).toEqual({ type: "var", symbol: "y" });
        const z_0 = variable("z");
        expect(z_0).toEqual({ type: "var", symbol: "z" });

        const w = new World();
        // This template means: x -> (y -> z)
        const temp = make_rule(x_0, make_rule(y_0, z_0))

        // Suppose we have a fact satisfying that template
        const instance = make_rule(pA, make_rule(pB, pC))
        w.add(instance);

        // However, we want to satisfy this rule
        // x -> y
        const rule = make_rule(x_0, y_0)

        // Try
        const res = w.apply(rule, [
            { template: temp, fact: instance }
        ])

        // Should fail because the input pattern does not exist in the rule
        expect(res.error?.code).toEqual("TEMPLATE_NOT_IN_RULE");
    })
})