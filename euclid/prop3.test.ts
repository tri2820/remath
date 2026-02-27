import { describe, it, expect, beforeAll } from "bun:test";
import { World } from "../world";
import { atom, fact, type Term } from "../rewriting";
import { findProp2Result, findProp3Result } from "./testUtils";
import { buildProp3TheoremWorld } from "./prop3World";

describe("Euclid Prop 3: Cut off from the greater a segment equal to the less", () => {
    let world3: World;
    let pE!: string;
    let pF!: string;
    let eqCD_AE!: Term;
    let eqCD_AF!: Term;

    beforeAll(() => {
        world3 = buildProp3TheoremWorld("A", "B", "C", "D");
        const prop3 = findProp3Result(world3, "A", "C", "D", { onRayTo: "B" });
        pF = prop3.endpoint;
        eqCD_AF = prop3.equality;
        const prop2 = findProp2Result(world3, "A", "C", "D", { excludeEndpoints: [pF] });
        pE = prop2.endpoint;
        eqCD_AE = prop2.equality;
    });

    it("reuses proposition 2 as an imported theorem rule", () => {
        const targetEq = fact("equal", [
            fact("segment", [atom("C"), atom("D")]),
            fact("segment", [atom("A"), atom(pE)]),
        ]);
        expect(world3.has(targetEq)).toBe(true);
        expect(world3.has(eqCD_AE)).toBe(true);
    });

    it("proves AF = CD", () => {
        const goal = fact("equal", [
            fact("segment", [atom("C"), atom("D")]),
            fact("segment", [atom("A"), atom(pF)]),
        ]);
        expect(world3.has(goal)).toBe(true);
        expect(world3.has(eqCD_AF)).toBe(true);
    });
});
