import { describe, it, expect } from "bun:test";
import { atom, make_rule, fact, variable, rule, introduction } from "./rewriting";
import { World } from "./world";


describe("Rewriting Engine", () => {
    it("Should fail when try to substitute nonsense facts within world", () => {
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
        w.add(id);
        const res = w.substitute(id, [{ pattern: x_0, with: pA }])
        expect(res.error?.code).toEqual("FACT_NOT_FOUND_IN_WORLD_FACTS");
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
        w.add(id);
        w.add(pA);
        // This means: replacing variable x with pA
        const res = w.substitute(id, [{ pattern: x_0, with: pA }])

        // 2 facts:
        // A -> A
        // A
        expect(res.data?.length).toEqual(2);
        expect(res.data?.[0]).toEqual(make_rule(pA, pA));
        expect(res.data?.[1]).toEqual(pA);
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
        w.add(id);
        w.add(pA);
        const res = w.substitute(id, [{ pattern: x_0, with: pA }])

        // 2 facts:
        // A -> A
        // A
        expect(res.data?.length).toEqual(2);
        expect(res.data?.[0]).toEqual(make_rule(pA, pA));
        expect(res.data?.[1]).toEqual(pA);
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
        w.add(cid);
        w.add(pA);
        const res = w.substitute(cid, [{ pattern: x_0, with: pA }])

        // 3 facts:
        // A -> (A -> A)
        // A -> A
        // A
        expect(res.data?.length).toEqual(3);
        expect(res.data?.[0]).toEqual(make_rule(pA, make_rule(pA, pA)));
        expect(res.data?.[1]).toEqual(make_rule(pA, pA));
        expect(res.data?.[2]).toEqual(pA);
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
        w.add(cid);
        const AtoA = make_rule(pA, pA)
        w.add(AtoA);
        const res = w.substitute(cid, [{
            pattern: make_rule(x_0, x_0),
            with: AtoA
        }])

        // 2 facts:
        // (A -> A) -> (A -> A)
        // A -> A

        // Note here: We would not have A, because even though LHS is fully bound,
        // we dont have A in the world facts yet.

        expect(res.data?.length).toEqual(2);
        expect(res.data?.[0]).toEqual(make_rule(make_rule(pA, pA), make_rule(pA, pA)));
        expect(res.data?.[1]).toEqual(make_rule(pA, pA));
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
        w.add(trans)
        w.add(make_rule(pA, pB));
        // Intentionally add the wrong fact here
        w.add(make_rule(pC, pB));
        const res = w.substitute(trans, [
            { pattern: make_rule(x_0, y_0), with: make_rule(pA, pB) },
            // Obvious here pB -> pC, but we intentionnally mistype
            { pattern: make_rule(y_0, z_0), with: make_rule(pC, pB) }
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
        w.add(trans)
        w.add(make_rule(pA, pB));
        const res = w.substitute(trans, [
            { pattern: make_rule(x_0, y_0), with: make_rule(pA, pB) }
        ])

        // We expect that it's partial, and the behavior is returning only 1 partial there
        expect(res.data?.length).toEqual(2);
        // (A -> B) -> ((B -> z_0) -> (A -> z_0))
        // And also below because LHS is fully bound
        // (B -> z_0) -> (A -> z_0)
        expect(res.data?.[0]).toEqual(make_rule(make_rule(pA, pB), make_rule(make_rule(pB, z_0), make_rule(pA, z_0))));
        expect(res.data?.[1]).toEqual(make_rule(make_rule(pB, z_0), make_rule(pA, z_0)));
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
        w.add(trans)
        w.add(make_rule(pA, pB));

        // THIS IS WEIRD. THIS SHOULD BE COMMENTED OUT ABLE.
        // ONLY THE LHS IS NEEDED TO BE IN THE WORLD FACTS (part that matches x -> y)?
        // w.add(make_rule(pB, pC));

        // Oh,
        // We still have a way to do this: basically every apply only acts on a single rule level at a time.
        // So if we don't want to add pB -> pC, we can do it in 2 steps:


        const res = w.substitute(trans, [
            { pattern: make_rule(x_0, y_0), with: make_rule(pA, pB) },
            // { template: make_rule(y_0, z_0), fact: make_rule(pB, pC) }
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }


        // (A -> B) -> ((B -> z) -> (A -> z))
        // Also return below because LHS is fully bound
        // (B -> z) -> (A -> z)
        expect(res.data.length).toEqual(2);
        expect(res.data[0]).toEqual(make_rule(make_rule(pA, pB), make_rule(make_rule(pB, z_0), make_rule(pA, z_0))));
        expect(res.data[1]).toEqual(make_rule(make_rule(pB, z_0), make_rule(pA, z_0)));
        w.addAll(res.data!);

        // Supposed only later on that we have 
        w.add(make_rule(pB, pC));

        const BzAz = res.data![1]!

        if (BzAz.type !== "fact" || BzAz.op.symbol !== 'rule') {
            throw new Error("Unexpected rule structure");
        }

        const res2 = w.substitute(BzAz, [
            { pattern: make_rule(pB, z_0), with: make_rule(pB, pC) }
        ])

        if (res2.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res2.error)}`);
        }

        // Finally we get A -> C
        // 2 facts:
        // (B -> C) -> (A -> C)
        // A -> C
        // Note: we would not have C because we don't have A in the world facts yet.

        // Note: We could have also gotten (A -> B) -> ((B -> C) -> (A -> C)) by applying to ABBzAz instead.
        expect(res2.data.length).toEqual(2);
        expect(res2.data[0]).toEqual(make_rule(make_rule(pB, pC), make_rule(pA, pC)));
        expect(res2.data[1]).toEqual(make_rule(pA, pC));

        const ruleAtoC = res2.data[1]!;
        w.add(ruleAtoC);

        if (ruleAtoC.type !== "fact" || ruleAtoC.op.symbol !== 'rule') {
            throw new Error("Unexpected rule structure");
        }

        // Suppose now we add A also
        w.add(pA);

        const res3 = w.substitute(ruleAtoC, [
            { pattern: pA, with: pA }
        ])

        if (res3.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res3.error)}`);
        }

        // Finally we get
        // 2 facts:
        // A -> C
        // C

        expect(res3.data.length).toEqual(2);
        expect(res3.data[0]).toEqual(make_rule(pA, pC));
        expect(res3.data[1]).toEqual(pC);
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
        w.add(rule);


        // Try
        const res = w.substitute(rule, [
            { pattern: temp, with: instance }
        ])

        // Should fail because the input pattern does not exist in the rule
        expect(res.error?.code).toEqual("PATTERN_NOT_IN_RULE");
    })

    it("Try decomposing nested patterns", () => {
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

        w.add(pA);
        w.add(pB);

        // substitute both x and y, this should give us both(A B)
        // x -> y -> both(x y)
        const rule = make_rule(x_0, make_rule(y_0, fact("both", [x_0, y_0])))
        w.add(rule);

        const res = w.substitute(rule, [
            { pattern: x_0, with: pA },
            { pattern: y_0, with: pB }
        ])

        // console.log("res:", JSON.stringify(res, null, 2));

        // 3 facts:
        // A -> (B -> both(A B))
        // B -> both(A B)
        // both(A B)
        expect(res.data?.length).toEqual(3);
        expect(res.data?.[0]).toEqual(make_rule(pA, make_rule(pB, fact("both", [pA, pB]))));
        expect(res.data?.[1]).toEqual(make_rule(pB, fact("both", [pA, pB])));
        expect(res.data?.[2]).toEqual(fact("both", [pA, pB]));
    })



    it("should check for LHS of inner rule be in world ", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const b = atom("B");
        expect(b).toEqual({ type: "atom", symbol: "B" });

        const c = atom("C");
        expect(c).toEqual({ type: "atom", symbol: "C" });

        const friendsAB = fact("friends", [a, b]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });
        const y_0 = variable("y");
        expect(y_0).toEqual({ type: "var", symbol: "y" });

        const rule = make_rule(
            fact("friends", [x_0, y_0]),
            make_rule(
                fact("same_class", [x_0, y_0]),
                fact("classmates", [x_0, y_0])
            )
        )

        const w = new World();
        w.add(rule);
        w.add(friendsAB);

        const res = w.substitute(rule, [
            { pattern: fact("friends", [x_0, y_0]), with: friendsAB }
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        // 2 facts:
        // friends(A B) -> (same_class(A B) -> classmates(A B))
        // same_class(A B) -> classmates(A B)

        // There should be no third fact here because same_class(A B) is NOT in the world facts
        expect(res.data.length).toEqual(2);
        expect(res.data[0]).toEqual(
            make_rule(
                friendsAB,
                make_rule(
                    fact("same_class", [a, b]),
                    fact("classmates", [a, b])
                )
            )
        );
        expect(res.data[1]).toEqual(
            make_rule(
                fact("same_class", [a, b]),
                fact("classmates", [a, b])
            )
        );
    });


    it("Cannot add arbitrary facts after the world is locked", () => {
        const w = new World();
        w.add(fact("point", [atom("A")]));
        w.lock();

        expect(() => {
            w.add(fact("point", [atom("B")]));
        }).toThrowError("This world is locked. This fact is not created by this world. Where does it come from?");
    })

    it("Can add facts that are derived, after the world is locked", () => {
        const w = new World();
        w.add(fact("point", [atom("A")]));
        // x -> y
        const rule = make_rule(fact("point", [variable("x")]), fact("point", [introduction("y")]));
        w.add(rule);
        w.lock();

        const res = w.substitute(rule, [
            { pattern: fact("point", [variable("x")]), with: fact("point", [atom("A")]) }
        ])

        if (res.error) throw new Error('Unexpected error')
        expect(res.data.length).toEqual(2);
        expect(res.data[0]).toEqual(make_rule(fact("point", [atom("A")]), fact("point", [atom("B")])));
        // HACK: We know the world's introduce function is deterministic
        expect(res.data[1]).toEqual(fact("point", [atom("B")]));

        w.addAll(res.data);
        expect(w.has(fact("point", [atom("B")]))).toBe(true);
    })

})