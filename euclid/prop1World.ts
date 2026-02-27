import { World } from "../world";
import { atom, fact, type Rule } from "../rewriting";
import { euclideanAxioms } from ".";
import {
    apply,
    applyEqualitySymmetry,
    applyTransitivity,
    drawSegment,
    findSharedPointOnCircles,
    mustFind,
} from "./testUtils";

export const buildProp1TheoremWorld = (
    a = "A",
    b = "B"
): World => {
    const world = new World();
    world.addAll(Object.values(euclideanAxioms.text));
    world.addAll(Object.values(euclideanAxioms.hidden_assumptions));

    const initialPoints = new Set([a, b]);
    for (const symbol of initialPoints) {
        world.add(fact("point", [atom(symbol)]));
    }

    world.lock();

    // Build AB and the two circles centered at A and B.
    drawSegment(world, a, b, euclideanAxioms.text.postulate1);
    const segAB = mustFind(world, fact("segment", [atom(a), atom(b)]), "segment(a,b)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAB },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
        { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAB },
    ]);
    const segBA = mustFind(world, fact("segment", [atom(b), atom(a)]), "segment(b,a)");
    apply(world, euclideanAxioms.text.postulate3, [
        { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBA },
    ]);

    const circleAB = mustFind(world, fact("circle", [atom(a), atom(b)]), "circle(a,b)");
    const circleBA = mustFind(world, fact("circle", [atom(b), atom(a)]), "circle(b,a)");
    apply(world, euclideanAxioms.hidden_assumptions.circleIntersection, [
        { pattern: euclideanAxioms.hidden_assumptions.circleIntersection.terms[0]!, with: circleAB },
        { pattern: (euclideanAxioms.hidden_assumptions.circleIntersection.terms[1] as Rule).terms[0]!, with: circleBA },
    ]);

    const apex = findSharedPointOnCircles(world, a, b, b, a, [a, b]);

    // Draw both radii from each center to apex so radiiEqual can fire.
    drawSegment(world, a, apex, euclideanAxioms.text.postulate1);
    drawSegment(world, b, apex, euclideanAxioms.text.postulate1);

    const onA = mustFind(world, fact("on_circle", [atom(apex), atom(a), atom(b)]), "on_circle(apex,a,b)");
    const onB = mustFind(world, fact("on_circle", [atom(apex), atom(b), atom(a)]), "on_circle(apex,b,a)");
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onA },
    ]);
    apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
        { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onB },
    ]);

    const sAB = fact("segment", [atom(a), atom(b)]);
    const sBA = fact("segment", [atom(b), atom(a)]);
    const sAApex = fact("segment", [atom(a), atom(apex)]);
    const sBApex = fact("segment", [atom(b), atom(apex)]);

    const eqAB_AApex = mustFind(world, fact("equal", [sAB, sAApex]), "equal(segment(a,b), segment(a,apex))");
    const eqBA_BApex = mustFind(world, fact("equal", [sBA, sBApex]), "equal(segment(b,a), segment(b,apex))");
    const eqAB_BA = mustFind(world, fact("equal", [sAB, sBA]), "equal(segment(a,b), segment(b,a))");

    // Derive equal(segment(b,apex), segment(a,apex)).
    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAB_AApex);
    const eqAApex_AB = mustFind(world, fact("equal", [sAApex, sAB]), "equal(segment(a,apex), segment(a,b))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAApex_AB, eqAB_BA);
    const eqAApex_BA = mustFind(world, fact("equal", [sAApex, sBA]), "equal(segment(a,apex), segment(b,a))");
    applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAApex_BA, eqBA_BApex);
    const eqAApex_BApex = mustFind(world, fact("equal", [sAApex, sBApex]), "equal(segment(a,apex), segment(b,apex))");
    applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eqAApex_BApex);
    mustFind(world, fact("equal", [sBApex, sAApex]), "equal(segment(b,apex), segment(a,apex))");

    return world;
};
