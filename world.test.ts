import { describe, it, expect } from "bun:test";
import { atom, make_rule, template, variable } from "./rewriting";
import { World } from "./world";


describe("Rewriting Engine", () => {
    it("Should fail when input mapping is missing", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = template("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const x_1 = variable("x");
        expect(x_1).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> x
        const id = make_rule(x_0, x_1)
        const res = w.findAndApply(id, [{ template: x_0, fact: pA }])
        expect(res.error?.code).toEqual("INPUT_NOT_FOUND");
    });

    it("Should apply rule correctly when input mapping is complete", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = template("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const x_1 = variable("x");
        expect(x_1).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> x
        const id = make_rule(x_0, x_1)
        w.add(pA);
        // This means: replacing variable x with pA
        const res = w.findAndApply(id, [{ template: x_0, fact: pA }])
        expect(res.data?.new_facts.length).toEqual(1);
        expect(res.data?.new_facts[0]).toEqual(pA);
    });

    it("Should replace based on symbol", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = template("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> x
        const id = make_rule(x_0, x_0)
        w.add(pA);
        const res = w.findAndApply(id, [{ template: x_0, fact: pA }])
        expect(res.data?.new_facts.length).toEqual(1);
        expect(res.data?.new_facts[0]).toEqual(pA);
    });


    it("Should work with nested currying rules", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = template("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: x -> (x -> x)
        const id = make_rule(x_0, make_rule(x_0, x_0))
        w.add(pA);
        const res = w.findAndApply(id, [{ template: x_0, fact: pA }])
        expect(res.data?.new_facts.length).toEqual(1);
        // A -> A
        expect(res.data?.new_facts[0]).toEqual(make_rule(pA, pA));
    });

    it("Should work with nested currying rules, complex", () => {
        const a = atom("A");
        expect(a).toEqual({ type: "atom", symbol: "A" });

        const pA = template("point", [a]);

        const x_0 = variable("x");
        expect(x_0).toEqual({ type: "var", symbol: "x" });

        const w = new World();
        // This rule means: (x -> x) -> (x -> x)
        const id = make_rule(make_rule(x_0, x_0), make_rule(x_0, x_0))

        const AtoA = make_rule(pA, pA)
        w.add(AtoA);
        const res = w.findAndApply(id, [{
            template: make_rule(x_0, x_0),
            fact: AtoA
        }])

        expect(res.data?.new_facts.length).toEqual(1);
        // A -> A
        expect(res.data?.new_facts[0]).toEqual(make_rule(pA, pA));
    });


})