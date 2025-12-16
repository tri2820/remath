import { describe, it, expect, beforeAll } from "bun:test";
import { World } from "../world";
import { atom, fact, type Rule } from "../rewriting";
import { euclideanAxioms, lineCircleIntersection, collinearSymmetry } from ".";

describe("Euclid Prop 2: Place a line equal to a given line at a given point", () => {
    let world: World;

    beforeAll(() => {
        world = new World();
        // Load the standard library
        world.addAll(Object.values(euclideanAxioms.text));
        world.addAll(Object.values(euclideanAxioms.hidden_assumptions));

        // Load the specific rules for Prop 2
        world.add(lineCircleIntersection);
        world.add(collinearSymmetry);
    });

    // ==========================================
    // SETUP: The Given
    // ==========================================
    it("setup: given point A and segment BC", () => {
        const pA = fact("point", [atom("A")]);
        const pB = fact("point", [atom("B")]);
        const pC = fact("point", [atom("C")]);
        const segBC = fact("segment", [atom("B"), atom("C")]);

        world.add(pA);
        world.add(pB);
        world.add(pC);
        world.add(segBC);

        // Draw line AB (Postulate 1) to start the construction
        const res = world.substitute(euclideanAxioms.text.postulate1, [
            { pattern: euclideanAxioms.text.postulate1.terms[0]!, with: pA },
            { pattern: (euclideanAxioms.text.postulate1.terms[1] as Rule).terms[0]!, with: pB },
        ]);
        if (res.error) throw res.error;
        world.addAll(res.data);
    });

    // ==========================================
    // STEP 1: Construct Equilateral Triangle DAB
    // ==========================================
    it("construct equilateral triangle DAB on AB", () => {

    });

});