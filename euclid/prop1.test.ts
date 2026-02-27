import { describe, it, expect } from "bun:test";
import { atom, fact } from "../rewriting";
import { buildProp1TheoremWorld } from "./prop1World";
import { findSharedPointOnCircles } from "./testUtils";

describe("Euclid Prop 1: Construct equilateral triangle", () => {
    it("builds world and proves all triangle sides are equal", () => {
        const world = buildProp1TheoremWorld("A", "B");
        const apex = findSharedPointOnCircles(world, "A", "B", "B", "A", ["A", "B"]);

        const sAB = fact("segment", [atom("A"), atom("B")]);
        const sBA = fact("segment", [atom("B"), atom("A")]);
        const sAApex = fact("segment", [atom("A"), atom(apex)]);
        const sBApex = fact("segment", [atom("B"), atom(apex)]);

        expect(world.has(fact("point", [atom(apex)]))).toBe(true);
        expect(world.has(sAB)).toBe(true);
        expect(world.has(sAApex)).toBe(true);
        expect(world.has(sBApex)).toBe(true);

        const eqAB_AApex = fact("equal", [sAB, sAApex]);
        const eqBA_BApex = fact("equal", [sBA, sBApex]);
        const eqBApex_AApex = fact("equal", [sBApex, sAApex]);

        expect(world.has(eqAB_AApex)).toBe(true);
        expect(world.has(eqBA_BApex)).toBe(true);
        expect(world.has(eqBApex_AApex)).toBe(true);

        const goal = fact("equal", [sBApex, sAApex]);
        expect(world.has(goal)).toBe(true);
    });
});
