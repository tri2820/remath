import { describe, it, expect, beforeAll } from "bun:test";
import { World } from "../world";
import { atom, fact, type Rule, type Term } from "../rewriting";
import { euclideanAxioms, lineCircleIntersectionAtStart } from ".";
import { apply, applyTransitivity, collinearThirds, drawSegment, mustFind, pointsOnCircle } from "./testUtils";
import { buildProp2World } from "./prop2World";

describe("Euclid Prop 3: Cut off from the greater a segment equal to the less", () => {
    let world2: World;
    let pE!: string;
    let pF!: string;
    let eqCD_AE!: Term;

    beforeAll(() => {
        const built = buildProp2World({
            givenPoint: "A",
            segmentStart: "C",
            segmentEnd: "D",
            reservedPoints: ["B"],
        });
        world2 = built.world;
        pE = built.endpoint;
        eqCD_AE = built.equality;
    });

    it("reuses proposition 2 world as a lemma state", () => {
        const targetEq = fact("equal", [
            fact("segment", [atom("C"), atom("D")]),
            fact("segment", [atom("A"), atom(pE)]),
        ]);
        expect(world2.has(targetEq)).toBe(true);
        expect(world2.has(eqCD_AE)).toBe(true);
    });

    it("cuts off AF on AB and proves AF = CD", () => {
        drawSegment(world2, "A", "B", euclideanAxioms.text.postulate1);

        const segAE = mustFind(world2, fact("segment", [atom("A"), atom(pE)]), `segment(A, ${pE})`);
        apply(world2, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAE },
        ]);

        const segAB = mustFind(world2, fact("segment", [atom("A"), atom("B")]), "segment(A, B)");
        const circleAE = mustFind(world2, fact("circle", [atom("A"), atom(pE)]), `circle(A, ${pE})`);
        apply(world2, lineCircleIntersectionAtStart, [
            { pattern: lineCircleIntersectionAtStart.terms[0]!, with: segAB },
            { pattern: (lineCircleIntersectionAtStart.terms[1] as Rule).terms[0]!, with: circleAE },
        ]);

        const onAE = new Set(pointsOnCircle(world2, "A", pE));
        const onAB = collinearThirds(world2, "A", "B");
        const candidates = onAB.filter(symbol => onAE.has(symbol) && !["A", "B", pE].includes(symbol));
        expect(candidates).toHaveLength(1);
        pF = candidates[0]!;

        drawSegment(world2, "A", pF, euclideanAxioms.text.postulate1);
        const onCircleF = mustFind(world2, fact("on_circle", [atom(pF), atom("A"), atom(pE)]), `on_circle(${pF}, A, ${pE})`);
        apply(world2, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onCircleF },
        ]);

        const eqAE_AF = mustFind(world2, fact("equal", [
            fact("segment", [atom("A"), atom(pE)]),
            fact("segment", [atom("A"), atom(pF)]),
        ]), `equal(segment(A,${pE}), segment(A,${pF}))`);

        applyTransitivity(world2, euclideanAxioms.text.commonNotion1, eqCD_AE, eqAE_AF);

        const goal = fact("equal", [
            fact("segment", [atom("C"), atom("D")]),
            fact("segment", [atom("A"), atom(pF)]),
        ]);
        expect(world2.has(goal)).toBe(true);
    });
});
