import { describe, it, expect } from "bun:test";
import { atom, fact } from "../rewriting";
import { buildProp2World } from "./prop2World";

describe("Euclid Prop 2: Place a line equal to a given line at a given point", () => {
    it("builds world and proves equal(segment(B,C), segment(A,E))", () => {
        const { world, endpoint, equality } = buildProp2World({
            givenPoint: "A",
            segmentStart: "B",
            segmentEnd: "C",
        });

        const goal = fact("equal", [
            fact("segment", [atom("B"), atom("C")]),
            fact("segment", [atom("A"), atom(endpoint)]),
        ]);

        expect(world.has(goal)).toBe(true);
        expect(world.has(equality)).toBe(true);
        expect(world.has(fact("segment", [atom("A"), atom(endpoint)]))).toBe(true);
    });
});
