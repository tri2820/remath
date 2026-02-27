import assert from "node:assert/strict";
import { World } from "../world";
import { atom, fact, type Rule } from "../rewriting";
import { collinearSymmetry, euclideanAxioms, lineCircleIntersectionAtEnd, lineCircleIntersectionAtStart } from ".";
import {
    apply,
    applyEqualitySymmetry,
    applyTransitivity,
    collinearThirds,
    drawSegment,
    findPointRule,
    findSharedPointOnCircles,
    importRule,
    intersect,
    mustFind,
    pointsOnCircle,
} from "./testUtils";
import { buildProp1TheoremWorld } from "./prop1World";

const assertSingle = (values: string[], label: string): string => {
    assert.equal(values.length, 1, `${label}: expected exactly one candidate, got ${values.length}`);
    return values[0]!;
};

export const buildProp2TheoremWorld = (
    givenPoint = "A",
    segmentStart = "B",
    segmentEnd = "C"
): World => {
    const world = new World();
    world.addAll(Object.values(euclideanAxioms.text));
    world.addAll(Object.values(euclideanAxioms.hidden_assumptions));
    world.add(lineCircleIntersectionAtEnd);
    world.add(lineCircleIntersectionAtStart);
    world.add(collinearSymmetry);

    const world1 = buildProp1TheoremWorld();
    const prop1Rule = world1.asRule();
    const overlap = intersect(world1.facts, world.facts);
    const importedProp1Rule = importRule(prop1Rule, overlap);
    world.add(importedProp1Rule);

    const initialPoints = new Set([givenPoint, segmentStart, segmentEnd]);
    for (const symbol of initialPoints) {
        world.add(fact("point", [atom(symbol)]));
    }

    world.lock();

    // Phase 1: setup the target source segment to be copied.
    drawSegment(world, segmentStart, segmentEnd, euclideanAxioms.text.postulate1);

    // Phase 2: instantiate the imported Prop 1 theorem with the concrete givens.
    const pointAtGiven = mustFind(world, fact("point", [atom(givenPoint)]), `point(${givenPoint})`);
    const importedAfterGiven = apply(world, importedProp1Rule, [
        { pattern: importedProp1Rule.terms[0]!, with: pointAtGiven },
    ]);
    const prop1AtStartRule = findPointRule(importedAfterGiven);
    const pointAtStart = mustFind(world, fact("point", [atom(segmentStart)]), `point(${segmentStart})`);
    apply(world, prop1AtStartRule, [
        { pattern: prop1AtStartRule.terms[0]!, with: pointAtStart },
    ]);
    const p1 = findSharedPointOnCircles(
        world,
        givenPoint,
        segmentStart,
        segmentStart,
        givenPoint,
        [givenPoint, segmentStart, segmentEnd]
    );
    const sAp1 = fact("segment", [atom(givenPoint), atom(p1)]);
    const sBp1 = fact("segment", [atom(segmentStart), atom(p1)]);
    const eqBp1_Ap1 = mustFind(world, fact("equal", [sBp1, sAp1]), "equal(segment(segmentStart,p1), segment(givenPoint,p1))");

    // Phase 3: extend p1->segmentStart to intersect circle(segmentStart, segmentEnd), producing p2.
    const segBC = mustFind(world, fact("segment", [atom(segmentStart), atom(segmentEnd)]), "segment(segmentStart, segmentEnd)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBC },
    ]);
    const circleBC = mustFind(world, fact("circle", [atom(segmentStart), atom(segmentEnd)]), "circle(segmentStart, segmentEnd)");
    const segBP1 = mustFind(world, fact("segment", [atom(segmentStart), atom(p1)]), "segment(segmentStart, p1)");
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segBP1 },
    ]);
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
            ![p1, givenPoint, segmentStart, segmentEnd].includes(symbol)
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
    const segAP1 = mustFind(world, fact("segment", [atom(givenPoint), atom(p1)]), "segment(givenPoint, p1)");
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAP1 },
    ]);
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
            ![p1, p2, givenPoint, segmentStart, segmentEnd].includes(symbol)
        ),
        "p3 candidates"
    );
    drawSegment(world, givenPoint, p3, euclideanAxioms.text.postulate1);
    drawSegment(world, p1, p3, euclideanAxioms.text.postulate1);

    // Phase 5: algebraic/equality proof core for Prop 2.
    // Goal shape: equal(segment(segmentStart, segmentEnd), segment(givenPoint, p3))
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
    assert.equal(world.has(finalEquality), true, "buildProp2TheoremWorld: final equality should exist in world");

    return world;
};
