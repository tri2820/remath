import { describe, it, expect, beforeAll } from "bun:test";
import { World } from "../world";
import { atom, fact, type Rule } from "../rewriting";
import { euclideanAxioms, lineCircleIntersectionAtEnd, lineCircleIntersectionAtStart, collinearSymmetry } from ".";
import {
    apply,
    applyEqualitySymmetry,
    applyTransitivity,
    collinearThirds,
    drawSegment,
    findSharedPointOnCircles,
    mustFind,
    pointsOnCircle,
} from "./testUtils";

describe("Euclid Prop 2: Place a line equal to a given line at a given point", () => {
    let world: World;
    let p1!: string;
    let p2!: string;
    let p3!: string;

    beforeAll(() => {
        world = new World();
        // Load the standard library
        world.addAll(Object.values(euclideanAxioms.text));
        world.addAll(Object.values(euclideanAxioms.hidden_assumptions));

        // Load the specific rules for Prop 2
        world.add(lineCircleIntersectionAtEnd);
        world.add(collinearSymmetry);
        world.add(lineCircleIntersectionAtStart);
    });

    // ==========================================
    // SETUP: The Given
    // ==========================================
    it("setup: given point A, B, C", () => {
        const pA = fact("point", [atom("A")]);
        const pB = fact("point", [atom("B")]);
        const pC = fact("point", [atom("C")]);

        world.add(pA);
        world.add(pB);
        world.add(pC);
    });


    it("construct AB and BC", () => {
        drawSegment(world, "A", "B", euclideanAxioms.text.postulate1);
        drawSegment(world, "B", "C", euclideanAxioms.text.postulate1);
        expect(world.has(fact("segment", [atom("A"), atom("B")]))).toBe(true);
        expect(world.has(fact("segment", [atom("B"), atom("C")]))).toBe(true);
    });

    it("construct equilateral triangle on AB and find p1", () => {
        const segAB = mustFind(world, fact("segment", [atom("A"), atom("B")]), "segment(A, B)");
        apply(world, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAB },
        ]);

        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAB },
        ]);
        const segBA = mustFind(world, fact("segment", [atom("B"), atom("A")]), "segment(B, A)");

        apply(world, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBA },
        ]);

        const circleAB = mustFind(world, fact("circle", [atom("A"), atom("B")]), "circle(A, B)");
        const circleBA = mustFind(world, fact("circle", [atom("B"), atom("A")]), "circle(B, A)");
        apply(world, euclideanAxioms.hidden_assumptions.circleIntersection, [
            { pattern: euclideanAxioms.hidden_assumptions.circleIntersection.terms[0]!, with: circleAB },
            { pattern: (euclideanAxioms.hidden_assumptions.circleIntersection.terms[1] as Rule).terms[0]!, with: circleBA },
        ]);

        p1 = findSharedPointOnCircles(world, "A", "B", "B", "A", ["A", "B", "C"]);

        drawSegment(world, p1, "A", euclideanAxioms.text.postulate1);
        drawSegment(world, p1, "B", euclideanAxioms.text.postulate1);
        expect(world.has(fact("segment", [atom(p1), atom("A")]))).toBe(true);
        expect(world.has(fact("segment", [atom(p1), atom("B")]))).toBe(true);
    });

    it("extend p1B to find p2", () => {
        const segBC = mustFind(world, fact("segment", [atom("B"), atom("C")]), "segment(B, C)");
        apply(world, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBC },
        ]);

        const segP1B = mustFind(world, fact("segment", [atom(p1), atom("B")]), `segment(${p1}, B)`);
        const circleBC = mustFind(world, fact("circle", [atom("B"), atom("C")]), "circle(B, C)");
        apply(world, lineCircleIntersectionAtEnd, [
            { pattern: lineCircleIntersectionAtEnd.terms[0]!, with: segP1B },
            { pattern: (lineCircleIntersectionAtEnd.terms[1] as Rule).terms[0]!, with: circleBC },
        ]);

        const onBC = new Set(pointsOnCircle(world, "B", "C"));
        const alongP1B = collinearThirds(world, p1, "B");
        const candidates = alongP1B.filter(symbol =>
            onBC.has(symbol) && ![p1, "B", "C"].includes(symbol)
        );
        expect(candidates).toHaveLength(1);
        p2 = candidates[0]!;

        drawSegment(world, "B", p2, euclideanAxioms.text.postulate1);
        drawSegment(world, p1, p2, euclideanAxioms.text.postulate1);
        expect(world.has(fact("segment", [atom("B"), atom(p2)]))).toBe(true);
        expect(world.has(fact("segment", [atom(p1), atom(p2)]))).toBe(true);
    });

    it("extend p1A to find p3", () => {
        const segP1P2 = mustFind(world, fact("segment", [atom(p1), atom(p2)]), `segment(${p1}, ${p2})`);
        apply(world, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segP1P2 },
        ]);

        const segP1A = mustFind(world, fact("segment", [atom(p1), atom("A")]), `segment(${p1}, A)`);
        const circleP1P2 = mustFind(world, fact("circle", [atom(p1), atom(p2)]), `circle(${p1}, ${p2})`);
        apply(world, lineCircleIntersectionAtStart, [
            { pattern: lineCircleIntersectionAtStart.terms[0]!, with: segP1A },
            { pattern: (lineCircleIntersectionAtStart.terms[1] as Rule).terms[0]!, with: circleP1P2 },
        ]);

        const onP1P2 = new Set(pointsOnCircle(world, p1, p2));
        const alongP1A = collinearThirds(world, p1, "A");
        const candidates = alongP1A.filter(symbol =>
            onP1P2.has(symbol) && ![p1, p2, "A"].includes(symbol)
        );
        expect(candidates).toHaveLength(1);
        p3 = candidates[0]!;

        drawSegment(world, "A", p3, euclideanAxioms.text.postulate1);
        drawSegment(world, p1, p3, euclideanAxioms.text.postulate1);
        expect(world.has(fact("segment", [atom("A"), atom(p3)]))).toBe(true);
        expect(world.has(fact("segment", [atom(p1), atom(p3)]))).toBe(true);
    });

    it("prove segment(B, C) = segment(A, p3)", () => {
        const sAB = fact("segment", [atom("A"), atom("B")]);
        const sBA = fact("segment", [atom("B"), atom("A")]);
        const sAp1 = fact("segment", [atom("A"), atom(p1)]);
        const sBp1 = fact("segment", [atom("B"), atom(p1)]);
        const sBC = fact("segment", [atom("B"), atom("C")]);
        const sBp2 = fact("segment", [atom("B"), atom(p2)]);
        const sP1P2 = fact("segment", [atom(p1), atom(p2)]);
        const sP1P3 = fact("segment", [atom(p1), atom(p3)]);
        const sP2P1 = fact("segment", [atom(p2), atom(p1)]);
        const sP3P1 = fact("segment", [atom(p3), atom(p1)]);
        const sP2B = fact("segment", [atom(p2), atom("B")]);
        const sP3A = fact("segment", [atom(p3), atom("A")]);
        const sAp3 = fact("segment", [atom("A"), atom(p3)]);

        const onP2BC = mustFind(world, fact("on_circle", [atom(p2), atom("B"), atom("C")]), `on_circle(${p2}, B, C)`);
        apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP2BC },
        ]);
        const eqBC_Bp2 = mustFind(world, fact("equal", [sBC, sBp2]), `equal(segment(B,C), segment(B,${p2}))`);

        const onP3P1P2 = mustFind(world, fact("on_circle", [atom(p3), atom(p1), atom(p2)]), `on_circle(${p3}, ${p1}, ${p2})`);
        apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP3P1P2 },
        ]);
        const eqP1P2_P1P3 = mustFind(world, fact("equal", [sP1P2, sP1P3]), `equal(segment(${p1},${p2}), segment(${p1},${p3}))`);

        const segP1A = mustFind(world, fact("segment", [atom(p1), atom("A")]), `segment(${p1}, A)`);
        const segP1B = mustFind(world, fact("segment", [atom(p1), atom("B")]), `segment(${p1}, B)`);
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1A },
        ]);
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1B },
        ]);

        const onP1AB = mustFind(world, fact("on_circle", [atom(p1), atom("A"), atom("B")]), `on_circle(${p1}, A, B)`);
        const onP1BA = mustFind(world, fact("on_circle", [atom(p1), atom("B"), atom("A")]), `on_circle(${p1}, B, A)`);
        apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP1AB },
        ]);
        apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP1BA },
        ]);

        const eqAB_Ap1 = mustFind(world, fact("equal", [sAB, sAp1]), `equal(segment(A,B), segment(A,${p1}))`);
        const eqBA_Bp1 = mustFind(world, fact("equal", [sBA, sBp1]), `equal(segment(B,A), segment(B,${p1}))`);

        const segAB = mustFind(world, sAB, "segment(A, B)");
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAB },
        ]);
        const eqAB_BA = mustFind(world, fact("equal", [sAB, sBA]), "equal(segment(A,B), segment(B,A))");

        applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAB_Ap1);
        const eqAp1_AB = mustFind(world, fact("equal", [sAp1, sAB]), `equal(segment(A,${p1}), segment(A,B))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAp1_AB, eqAB_BA);
        const eqAp1_BA = mustFind(world, fact("equal", [sAp1, sBA]), `equal(segment(A,${p1}), segment(B,A))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAp1_BA, eqBA_Bp1);
        const eqAp1_Bp1 = mustFind(world, fact("equal", [sAp1, sBp1]), `equal(segment(A,${p1}), segment(B,${p1}))`);
        applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAp1_Bp1);
        const eqBp1_Ap1 = mustFind(world, fact("equal", [sBp1, sAp1]), `equal(segment(B,${p1}), segment(A,${p1}))`);

        const segP1P2 = mustFind(world, sP1P2, `segment(${p1}, ${p2})`);
        const segP1P3 = mustFind(world, sP1P3, `segment(${p1}, ${p3})`);
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1P2 },
        ]);
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1P3 },
        ]);
        const eqP1P2_P2P1 = mustFind(world, fact("equal", [sP1P2, sP2P1]), `equal(segment(${p1},${p2}), segment(${p2},${p1}))`);
        const eqP1P3_P3P1 = mustFind(world, fact("equal", [sP1P3, sP3P1]), `equal(segment(${p1},${p3}), segment(${p3},${p1}))`);
        applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqP1P2_P2P1);
        const eqP2P1_P1P2 = mustFind(world, fact("equal", [sP2P1, sP1P2]), `equal(segment(${p2},${p1}), segment(${p1},${p2}))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2P1_P1P2, eqP1P2_P1P3);
        const eqP2P1_P1P3 = mustFind(world, fact("equal", [sP2P1, sP1P3]), `equal(segment(${p2},${p1}), segment(${p1},${p3}))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2P1_P1P3, eqP1P3_P3P1);
        const eqP2P1_P3P1 = mustFind(world, fact("equal", [sP2P1, sP3P1]), `equal(segment(${p2},${p1}), segment(${p3},${p1}))`);

        const colP1BP2 = mustFind(world, fact("collinear", [atom(p1), atom("B"), atom(p2)]), `collinear(${p1}, B, ${p2})`);
        const colP1AP3 = mustFind(world, fact("collinear", [atom(p1), atom("A"), atom(p3)]), `collinear(${p1}, A, ${p3})`);
        apply(world, collinearSymmetry, [{ pattern: collinearSymmetry.terms[0]!, with: colP1BP2 }]);
        apply(world, collinearSymmetry, [{ pattern: collinearSymmetry.terms[0]!, with: colP1AP3 }]);

        const colP2BP1 = mustFind(world, fact("collinear", [atom(p2), atom("B"), atom(p1)]), `collinear(${p2}, B, ${p1})`);
        const colP3AP1 = mustFind(world, fact("collinear", [atom(p3), atom("A"), atom(p1)]), `collinear(${p3}, A, ${p1})`);
        apply(world, euclideanAxioms.hidden_assumptions.linearSegmentSubtraction, [
            { pattern: euclideanAxioms.hidden_assumptions.linearSegmentSubtraction.terms[0]!, with: colP2BP1 },
        ]);
        apply(world, euclideanAxioms.hidden_assumptions.linearSegmentSubtraction, [
            { pattern: euclideanAxioms.hidden_assumptions.linearSegmentSubtraction.terms[0]!, with: colP3AP1 },
        ]);

        const diffLeft = fact("diff", [sP2P1, sBp1]);
        const diffRight = fact("diff", [sP3P1, sAp1]);
        const eqP2B_diffLeft = mustFind(world, fact("equal", [sP2B, diffLeft]), `equal(segment(${p2},B), diff(segment(${p2},${p1}), segment(B,${p1})))`);
        const eqP3A_diffRight = mustFind(world, fact("equal", [sP3A, diffRight]), `equal(segment(${p3},A), diff(segment(${p3},${p1}), segment(A,${p1})))`);

        apply(world, euclideanAxioms.text.commonNotion3, [
            { pattern: euclideanAxioms.text.commonNotion3.terms[0]!, with: eqP2P1_P3P1 },
            { pattern: (euclideanAxioms.text.commonNotion3.terms[1] as Rule).terms[0]!, with: eqBp1_Ap1 },
        ]);
        const eqDiffLeftRight = mustFind(world, fact("equal", [diffLeft, diffRight]), "equal(diffLeft, diffRight)");

        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2B_diffLeft, eqDiffLeftRight);
        const eqP2B_diffRight = mustFind(world, fact("equal", [sP2B, diffRight]), `equal(segment(${p2},B), diff(segment(${p3},${p1}), segment(A,${p1})))`);
        applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqP3A_diffRight);
        const eqDiffRight_P3A = mustFind(world, fact("equal", [diffRight, sP3A]), `equal(diff(segment(${p3},${p1}), segment(A,${p1})), segment(${p3},A))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2B_diffRight, eqDiffRight_P3A);
        const eqP2B_P3A = mustFind(world, fact("equal", [sP2B, sP3A]), `equal(segment(${p2},B), segment(${p3},A))`);

        const segBp2 = mustFind(world, sBp2, `segment(B, ${p2})`);
        const segAp3 = mustFind(world, sAp3, `segment(A, ${p3})`);
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segBp2 },
        ]);
        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAp3 },
        ]);
        const eqBp2_P2B = mustFind(world, fact("equal", [sBp2, sP2B]), `equal(segment(B,${p2}), segment(${p2},B))`);
        const eqAp3_P3A = mustFind(world, fact("equal", [sAp3, sP3A]), `equal(segment(A,${p3}), segment(${p3},A))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqBp2_P2B, eqP2B_P3A);
        const eqBp2_P3A = mustFind(world, fact("equal", [sBp2, sP3A]), `equal(segment(B,${p2}), segment(${p3},A))`);
        applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAp3_P3A);
        const eqP3A_Ap3 = mustFind(world, fact("equal", [sP3A, sAp3]), `equal(segment(${p3},A), segment(A,${p3}))`);
        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqBp2_P3A, eqP3A_Ap3);
        const eqBp2_Ap3 = mustFind(world, fact("equal", [sBp2, sAp3]), `equal(segment(B,${p2}), segment(A,${p3}))`);

        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqBC_Bp2, eqBp2_Ap3);
        const goal = fact("equal", [sBC, sAp3]);
        expect(world.has(goal)).toBe(true);
    });

});
