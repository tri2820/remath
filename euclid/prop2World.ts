import assert from "node:assert/strict";
import { World } from "../world";
import { atom, fact, type Rule, type Term } from "../rewriting";
import { collinearSymmetry, euclideanAxioms, lineCircleIntersectionAtEnd, lineCircleIntersectionAtStart } from ".";
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

type BuildProp2WorldParams = {
    givenPoint: string;
    segmentStart: string;
    segmentEnd: string;
    reservedPoints?: string[];
};

type BuildProp2WorldResult = {
    world: World;
    p1: string;
    p2: string;
    endpoint: string;
    equality: Term;
};

const assertSingle = (values: string[], label: string): string => {
    assert.equal(values.length, 1, `${label}: expected exactly one candidate, got ${values.length}`);
    return values[0]!;
};

export const buildProp2World = ({
    givenPoint,
    segmentStart,
    segmentEnd,
    reservedPoints = [],
}: BuildProp2WorldParams): BuildProp2WorldResult => {
    // Phase 0: initialize a fresh proof world with core axioms and continuity helpers.
    const world = new World();
    world.addAll(Object.values(euclideanAxioms.text));
    world.addAll(Object.values(euclideanAxioms.hidden_assumptions));
    world.add(lineCircleIntersectionAtEnd);
    world.add(lineCircleIntersectionAtStart);
    world.add(collinearSymmetry);

    // Seed the required points so postulate-driven constructions can start.
    const initialPoints = new Set([givenPoint, segmentStart, segmentEnd, ...reservedPoints]);
    for (const symbol of initialPoints) {
        world.add(fact("point", [atom(symbol)]));
    }

    // Phase 1: setup base segment from given point and the target source segment.
    drawSegment(world, givenPoint, segmentStart, euclideanAxioms.text.postulate1);
    drawSegment(world, segmentStart, segmentEnd, euclideanAxioms.text.postulate1);

    // Phase 2: construct equilateral triangle on segment (givenPoint, segmentStart).
    const segAB = mustFind(world, fact("segment", [atom(givenPoint), atom(segmentStart)]), "segment(givenPoint, segmentStart)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAB },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAB },
    ]);
    const segBA = mustFind(world, fact("segment", [atom(segmentStart), atom(givenPoint)]), "segment(segmentStart, givenPoint)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBA },
    ]);

    const circleAB = mustFind(world, fact("circle", [atom(givenPoint), atom(segmentStart)]), "circle(givenPoint, segmentStart)");
    const circleBA = mustFind(world, fact("circle", [atom(segmentStart), atom(givenPoint)]), "circle(segmentStart, givenPoint)");
    apply(world, euclideanAxioms.hidden_assumptions.circleIntersection, [
        { pattern: euclideanAxioms.hidden_assumptions.circleIntersection.terms[0]!, with: circleAB },
        { pattern: (euclideanAxioms.hidden_assumptions.circleIntersection.terms[1] as Rule).terms[0]!, with: circleBA },
    ]);

    const p1 = findSharedPointOnCircles(
        world,
        givenPoint,
        segmentStart,
        segmentStart,
        givenPoint,
        [givenPoint, segmentStart, segmentEnd, ...reservedPoints]
    );
    drawSegment(world, p1, givenPoint, euclideanAxioms.text.postulate1);
    drawSegment(world, p1, segmentStart, euclideanAxioms.text.postulate1);

    // Phase 3: extend p1->segmentStart to intersect circle(segmentStart, segmentEnd), producing p2.
    const segBC = mustFind(world, fact("segment", [atom(segmentStart), atom(segmentEnd)]), "segment(segmentStart, segmentEnd)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBC },
    ]);
    const circleBC = mustFind(world, fact("circle", [atom(segmentStart), atom(segmentEnd)]), "circle(segmentStart, segmentEnd)");
    const segP1B = mustFind(world, fact("segment", [atom(p1), atom(segmentStart)]), "segment(p1, segmentStart)");
    apply(world, lineCircleIntersectionAtEnd, [
        { pattern: lineCircleIntersectionAtEnd.terms[0]!, with: segP1B },
        { pattern: (lineCircleIntersectionAtEnd.terms[1] as Rule).terms[0]!, with: circleBC },
    ]);

    const onBC = new Set(pointsOnCircle(world, segmentStart, segmentEnd));
    const alongP1B = collinearThirds(world, p1, segmentStart);
    const p2 = assertSingle(
        alongP1B.filter(symbol =>
            onBC.has(symbol) &&
            ![p1, givenPoint, segmentStart, segmentEnd, ...reservedPoints].includes(symbol)
        ),
        "p2 candidates"
    );
    drawSegment(world, segmentStart, p2, euclideanAxioms.text.postulate1);
    drawSegment(world, p1, p2, euclideanAxioms.text.postulate1);

    // Phase 4: extend p1->givenPoint to intersect circle(p1, p2), producing p3 (final endpoint).
    const segP1P2 = mustFind(world, fact("segment", [atom(p1), atom(p2)]), "segment(p1, p2)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segP1P2 },
    ]);
    const circleP1P2 = mustFind(world, fact("circle", [atom(p1), atom(p2)]), "circle(p1, p2)");
    const segP1A = mustFind(world, fact("segment", [atom(p1), atom(givenPoint)]), "segment(p1, givenPoint)");
    apply(world, lineCircleIntersectionAtStart, [
        { pattern: lineCircleIntersectionAtStart.terms[0]!, with: segP1A },
        { pattern: (lineCircleIntersectionAtStart.terms[1] as Rule).terms[0]!, with: circleP1P2 },
    ]);

    const onP1P2 = new Set(pointsOnCircle(world, p1, p2));
    const alongP1A = collinearThirds(world, p1, givenPoint);
    const p3 = assertSingle(
        alongP1A.filter(symbol =>
            onP1P2.has(symbol) &&
            ![p1, p2, givenPoint, segmentStart, segmentEnd, ...reservedPoints].includes(symbol)
        ),
        "p3 candidates"
    );
    drawSegment(world, givenPoint, p3, euclideanAxioms.text.postulate1);
    drawSegment(world, p1, p3, euclideanAxioms.text.postulate1);

    // Phase 5: algebraic/equality proof core for Prop 2.
    // Goal shape: equal(segment(segmentStart, segmentEnd), segment(givenPoint, p3))
    const sAB = fact("segment", [atom(givenPoint), atom(segmentStart)]);
    const sBA = fact("segment", [atom(segmentStart), atom(givenPoint)]);
    const sAp1 = fact("segment", [atom(givenPoint), atom(p1)]);
    const sBp1 = fact("segment", [atom(segmentStart), atom(p1)]);
    const sBCFact = fact("segment", [atom(segmentStart), atom(segmentEnd)]);
    const sBp2 = fact("segment", [atom(segmentStart), atom(p2)]);
    const sP1P2 = fact("segment", [atom(p1), atom(p2)]);
    const sP1P3 = fact("segment", [atom(p1), atom(p3)]);
    const sP2P1 = fact("segment", [atom(p2), atom(p1)]);
    const sP3P1 = fact("segment", [atom(p3), atom(p1)]);
    const sP2B = fact("segment", [atom(p2), atom(segmentStart)]);
    const sP3A = fact("segment", [atom(p3), atom(givenPoint)]);
    const sAp3 = fact("segment", [atom(givenPoint), atom(p3)]);

    const onP2BC = mustFind(world, fact("on_circle", [atom(p2), atom(segmentStart), atom(segmentEnd)]), "on_circle(p2, segmentStart, segmentEnd)");
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP2BC },
    ]);
    const eqBC_Bp2 = mustFind(world, fact("equal", [sBCFact, sBp2]), "equal(segment(segmentStart,segmentEnd), segment(segmentStart,p2))");

    const onP3P1P2 = mustFind(world, fact("on_circle", [atom(p3), atom(p1), atom(p2)]), "on_circle(p3, p1, p2)");
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP3P1P2 },
    ]);
    const eqP1P2_P1P3 = mustFind(world, fact("equal", [sP1P2, sP1P3]), "equal(segment(p1,p2), segment(p1,p3))");

    const segP1AProof = mustFind(world, fact("segment", [atom(p1), atom(givenPoint)]), "segment(p1, givenPoint)");
    const segP1BProof = mustFind(world, fact("segment", [atom(p1), atom(segmentStart)]), "segment(p1, segmentStart)");
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1AProof },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1BProof },
    ]);

    const onP1AB = mustFind(world, fact("on_circle", [atom(p1), atom(givenPoint), atom(segmentStart)]), "on_circle(p1, givenPoint, segmentStart)");
    const onP1BA = mustFind(world, fact("on_circle", [atom(p1), atom(segmentStart), atom(givenPoint)]), "on_circle(p1, segmentStart, givenPoint)");
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP1AB },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onP1BA },
    ]);

    const eqAB_Ap1 = mustFind(world, fact("equal", [sAB, sAp1]), "equal(segment(givenPoint,segmentStart), segment(givenPoint,p1))");
    const eqBA_Bp1 = mustFind(world, fact("equal", [sBA, sBp1]), "equal(segment(segmentStart,givenPoint), segment(segmentStart,p1))");
    const segABProof = mustFind(world, sAB, "segment(givenPoint, segmentStart)");
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segABProof },
    ]);
    const eqAB_BA = mustFind(world, fact("equal", [sAB, sBA]), "equal(segment(givenPoint,segmentStart), segment(segmentStart,givenPoint))");

    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAB_Ap1);
    const eqAp1_AB = mustFind(world, fact("equal", [sAp1, sAB]), "equal(segment(givenPoint,p1), segment(givenPoint,segmentStart))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAp1_AB, eqAB_BA);
    const eqAp1_BA = mustFind(world, fact("equal", [sAp1, sBA]), "equal(segment(givenPoint,p1), segment(segmentStart,givenPoint))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAp1_BA, eqBA_Bp1);
    const eqAp1_Bp1 = mustFind(world, fact("equal", [sAp1, sBp1]), "equal(segment(givenPoint,p1), segment(segmentStart,p1))");
    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAp1_Bp1);
    const eqBp1_Ap1 = mustFind(world, fact("equal", [sBp1, sAp1]), "equal(segment(segmentStart,p1), segment(givenPoint,p1))");

    const segP1P2Proof = mustFind(world, sP1P2, "segment(p1,p2)");
    const segP1P3Proof = mustFind(world, sP1P3, "segment(p1,p3)");
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1P2Proof },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segP1P3Proof },
    ]);
    const eqP1P2_P2P1 = mustFind(world, fact("equal", [sP1P2, sP2P1]), "equal(segment(p1,p2), segment(p2,p1))");
    const eqP1P3_P3P1 = mustFind(world, fact("equal", [sP1P3, sP3P1]), "equal(segment(p1,p3), segment(p3,p1))");
    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqP1P2_P2P1);
    const eqP2P1_P1P2 = mustFind(world, fact("equal", [sP2P1, sP1P2]), "equal(segment(p2,p1), segment(p1,p2))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2P1_P1P2, eqP1P2_P1P3);
    const eqP2P1_P1P3 = mustFind(world, fact("equal", [sP2P1, sP1P3]), "equal(segment(p2,p1), segment(p1,p3))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2P1_P1P3, eqP1P3_P3P1);
    const eqP2P1_P3P1 = mustFind(world, fact("equal", [sP2P1, sP3P1]), "equal(segment(p2,p1), segment(p3,p1))");

    const colP1BP2 = mustFind(world, fact("collinear", [atom(p1), atom(segmentStart), atom(p2)]), "collinear(p1,segmentStart,p2)");
    const colP1AP3 = mustFind(world, fact("collinear", [atom(p1), atom(givenPoint), atom(p3)]), "collinear(p1,givenPoint,p3)");
    apply(world, collinearSymmetry, [{ pattern: collinearSymmetry.terms[0]!, with: colP1BP2 }]);
    apply(world, collinearSymmetry, [{ pattern: collinearSymmetry.terms[0]!, with: colP1AP3 }]);

    const colP2BP1 = mustFind(world, fact("collinear", [atom(p2), atom(segmentStart), atom(p1)]), "collinear(p2,segmentStart,p1)");
    const colP3AP1 = mustFind(world, fact("collinear", [atom(p3), atom(givenPoint), atom(p1)]), "collinear(p3,givenPoint,p1)");
    apply(world, euclideanAxioms.hidden_assumptions.linearSegmentSubtraction, [
        { pattern: euclideanAxioms.hidden_assumptions.linearSegmentSubtraction.terms[0]!, with: colP2BP1 },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.linearSegmentSubtraction, [
        { pattern: euclideanAxioms.hidden_assumptions.linearSegmentSubtraction.terms[0]!, with: colP3AP1 },
    ]);

    const diffLeft = fact("diff", [sP2P1, sBp1]);
    const diffRight = fact("diff", [sP3P1, sAp1]);
    const eqP2B_diffLeft = mustFind(world, fact("equal", [sP2B, diffLeft]), "equal(segment(p2,segmentStart), diffLeft)");
    const eqP3A_diffRight = mustFind(world, fact("equal", [sP3A, diffRight]), "equal(segment(p3,givenPoint), diffRight)");
    apply(world, euclideanAxioms.text.commonNotion3, [
        { pattern: euclideanAxioms.text.commonNotion3.terms[0]!, with: eqP2P1_P3P1 },
        { pattern: (euclideanAxioms.text.commonNotion3.terms[1] as Rule).terms[0]!, with: eqBp1_Ap1 },
    ]);
    const eqDiffLeftRight = mustFind(world, fact("equal", [diffLeft, diffRight]), "equal(diffLeft, diffRight)");

    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2B_diffLeft, eqDiffLeftRight);
    const eqP2B_diffRight = mustFind(world, fact("equal", [sP2B, diffRight]), "equal(segment(p2,segmentStart), diffRight)");
    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqP3A_diffRight);
    const eqDiffRight_P3A = mustFind(world, fact("equal", [diffRight, sP3A]), "equal(diffRight, segment(p3,givenPoint))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqP2B_diffRight, eqDiffRight_P3A);
    const eqP2B_P3A = mustFind(world, fact("equal", [sP2B, sP3A]), "equal(segment(p2,segmentStart), segment(p3,givenPoint))");

    const segBp2 = mustFind(world, sBp2, "segment(segmentStart,p2)");
    const segAp3 = mustFind(world, sAp3, "segment(givenPoint,p3)");
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segBp2 },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAp3 },
    ]);
    const eqBp2_P2B = mustFind(world, fact("equal", [sBp2, sP2B]), "equal(segment(segmentStart,p2), segment(p2,segmentStart))");
    const eqAp3_P3A = mustFind(world, fact("equal", [sAp3, sP3A]), "equal(segment(givenPoint,p3), segment(p3,givenPoint))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqBp2_P2B, eqP2B_P3A);
    const eqBp2_P3A = mustFind(world, fact("equal", [sBp2, sP3A]), "equal(segment(segmentStart,p2), segment(p3,givenPoint))");
    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAp3_P3A);
    const eqP3A_Ap3 = mustFind(world, fact("equal", [sP3A, sAp3]), "equal(segment(p3,givenPoint), segment(givenPoint,p3))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqBp2_P3A, eqP3A_Ap3);
    const eqBp2_Ap3 = mustFind(world, fact("equal", [sBp2, sAp3]), "equal(segment(segmentStart,p2), segment(givenPoint,p3))");

    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqBC_Bp2, eqBp2_Ap3);
    const finalEquality = mustFind(world, fact("equal", [sBCFact, sAp3]), "equal(segment(segmentStart,segmentEnd), segment(givenPoint,p3))");

    // Sanity check: builder must return a world that already contains the proved proposition.
    assert.equal(world.has(finalEquality), true, "buildProp2World: final equality should exist in world");

    return {
        world,
        p1,
        p2,
        endpoint: p3,
        equality: finalEquality,
    };
};
