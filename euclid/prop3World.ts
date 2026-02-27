import assert from "node:assert/strict";
import { atom, fact, type Rule } from "../rewriting";
import { euclideanAxioms, lineCircleIntersectionAtStart } from ".";
import {
    apply,
    applyTransitivity,
    collinearThirds,
    drawSegment,
    findProp2Result,
    mustFind,
    pointsOnCircle,
} from "./testUtils";
import { buildProp2TheoremWorld } from "./prop2World";
import type { World } from "../world";

export const buildProp3TheoremWorld = (
    greaterStart = "A",
    greaterEnd = "B",
    lessStart = "C",
    lessEnd = "D"
): World => {
    const world = buildProp2TheoremWorld(greaterStart, lessStart, lessEnd);
    const { endpoint: pE, equality: eqCD_AE } = findProp2Result(world, greaterStart, lessStart, lessEnd);

    mustFind(world, fact("point", [atom(greaterEnd)]), `point(${greaterEnd})`);
    drawSegment(world, greaterStart, greaterEnd, euclideanAxioms.text.postulate1);

    const segAE = mustFind(world, fact("segment", [atom(greaterStart), atom(pE)]), `segment(${greaterStart}, ${pE})`);
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAE },
    ]);

    const segAB = mustFind(world, fact("segment", [atom(greaterStart), atom(greaterEnd)]), `segment(${greaterStart}, ${greaterEnd})`);
    const circleAE = mustFind(world, fact("circle", [atom(greaterStart), atom(pE)]), `circle(${greaterStart}, ${pE})`);
    apply(world, lineCircleIntersectionAtStart, [
        { pattern: lineCircleIntersectionAtStart.terms[0]!, with: segAB },
        { pattern: (lineCircleIntersectionAtStart.terms[1] as Rule).terms[0]!, with: circleAE },
    ]);

    const onAE = new Set(pointsOnCircle(world, greaterStart, pE));
    const onAB = collinearThirds(world, greaterStart, greaterEnd);
    const candidates = onAB.filter(symbol => onAE.has(symbol) && ![greaterStart, greaterEnd, pE].includes(symbol));
    assert.equal(candidates.length, 1, `prop3 endpoint candidates: expected 1, got ${candidates.length}`);
    const pF = candidates[0]!;

    drawSegment(world, greaterStart, pF, euclideanAxioms.text.postulate1);
    const onCircleF = mustFind(world, fact("on_circle", [atom(pF), atom(greaterStart), atom(pE)]), `on_circle(${pF}, ${greaterStart}, ${pE})`);
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onCircleF },
    ]);

    const eqAE_AF = mustFind(world, fact("equal", [
        fact("segment", [atom(greaterStart), atom(pE)]),
        fact("segment", [atom(greaterStart), atom(pF)]),
    ]), `equal(segment(${greaterStart},${pE}), segment(${greaterStart},${pF}))`);

    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqCD_AE, eqAE_AF);

    const goal = fact("equal", [
        fact("segment", [atom(lessStart), atom(lessEnd)]),
        fact("segment", [atom(greaterStart), atom(pF)]),
    ]);
    assert.equal(world.has(goal), true, "buildProp3TheoremWorld: final equality should exist in world");
    return world;
};
