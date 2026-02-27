import { describe, it, expect, beforeAll } from "bun:test";
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

describe("Euclid prop 1: Construct equilateral triangle", () => {
    let world: World;
    let pC!: string;

    beforeAll(() => {
        world = new World();
        world.addAll(Object.values(euclideanAxioms.text));
        world.addAll(Object.values(euclideanAxioms.hidden_assumptions));
    });

    it("create a world with 2 points", () => {
        const pA = fact("point", [atom("A")]);
        const pB = fact("point", [atom("B")]);
        world.add(pA);
        world.add(pB);
        expect(world.has(pA)).toBe(true);
        expect(world.has(pB)).toBe(true);

        world.lock();
    });

    it("construct the base segment AB", () => {
        drawSegment(world, "A", "B", euclideanAxioms.text.postulate1);
        expect(world.has(fact("segment", [atom("A"), atom("B")]))).toBe(true);
    });

    it("construct circle (A, B)", () => {
        const segAB = mustFind(world, fact("segment", [atom("A"), atom("B")]), "segment(A, B)");
        apply(world, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAB },
        ]);
        expect(world.has(fact("circle", [atom("A"), atom("B")]))).toBe(true);
    });

    it("construct segment BA and obtain AB = BA", () => {
        const segAB = mustFind(world, fact("segment", [atom("A"), atom("B")]), "segment(A, B)");
        const segBA = world.find(fact("segment", [atom("B"), atom("A")]));
        expect(segBA).toBeUndefined();

        apply(world, euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAB },
        ]);

        const goal = fact("segment", [atom("B"), atom("A")]);
        const goalEq = fact("equal", [fact("segment", [atom("A"), atom("B")]), goal]);
        expect(world.has(goal)).toBe(true);
        expect(world.has(goalEq)).toBe(true);
    });

    it("construct circle (B, A)", () => {
        const segBA = mustFind(world, fact("segment", [atom("B"), atom("A")]), "segment(B, A)");
        apply(world, euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBA },
        ]);
        expect(world.has(fact("circle", [atom("B"), atom("A")]))).toBe(true);
    });

    it("find intersection point C of circles (A, B) and (B, A)", () => {
        const circleAB = mustFind(world, fact("circle", [atom("A"), atom("B")]), "circle(A, B)");
        const circleBA = mustFind(world, fact("circle", [atom("B"), atom("A")]), "circle(B, A)");

        apply(world, euclideanAxioms.hidden_assumptions.circleIntersection, [
            { pattern: euclideanAxioms.hidden_assumptions.circleIntersection.terms[0]!, with: circleAB },
            { pattern: (euclideanAxioms.hidden_assumptions.circleIntersection.terms[1] as Rule).terms[0]!, with: circleBA },
        ]);

        pC = findSharedPointOnCircles(world, "A", "B", "B", "A", ["A", "B"]);
        expect(world.has(fact("point", [atom(pC)]))).toBe(true);
        expect(world.has(fact("on_circle", [atom(pC), atom("A"), atom("B")]))).toBe(true);
        expect(world.has(fact("on_circle", [atom(pC), atom("B"), atom("A")]))).toBe(true);
    });

    it("construct AC and BC", () => {
        drawSegment(world, "A", pC, euclideanAxioms.text.postulate1);
        drawSegment(world, "B", pC, euclideanAxioms.text.postulate1);

        expect(world.has(fact("segment", [atom("A"), atom(pC)]))).toBe(true);
        expect(world.has(fact("segment", [atom("B"), atom(pC)]))).toBe(true);
    });

    it("prove that AB = AC", () => {
        const onCircleA = mustFind(world, fact("on_circle", [atom(pC), atom("A"), atom("B")]), `on_circle(${pC}, A, B)`);
        const sAB = fact("segment", [atom("A"), atom("B")]);
        const sAC = fact("segment", [atom("A"), atom(pC)]);
        const goal = fact("equal", [sAB, sAC]);

        apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onCircleA },
        ]);
        expect(world.has(goal)).toBe(true);
    });

    it("prove that BA = BC", () => {
        const onCircleB = mustFind(world, fact("on_circle", [atom(pC), atom("B"), atom("A")]), `on_circle(${pC}, B, A)`);
        const sBA = fact("segment", [atom("B"), atom("A")]);
        const sBC = fact("segment", [atom("B"), atom(pC)]);
        const goal = fact("equal", [sBA, sBC]);

        apply(world, euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: onCircleB },
        ]);
        expect(world.has(goal)).toBe(true);
    });

    it("prove AC = BC. All 3 sides are now equal.", () => {
        const sAB = fact("segment", [atom("A"), atom("B")]);
        const sBA = fact("segment", [atom("B"), atom("A")]);
        const sAC = fact("segment", [atom("A"), atom(pC)]);
        const sBC = fact("segment", [atom("B"), atom(pC)]);

        const eq1 = mustFind(world, fact("equal", [sAB, sAC]), "equal(segment(A,B), segment(A,C))");
        const eq2 = mustFind(world, fact("equal", [sBA, sBC]), "equal(segment(B,A), segment(B,C))");
        const eqAB_BA = mustFind(world, fact("equal", [sAB, sBA]), "equal(segment(A,B), segment(B,A))");

        applyEqualitySymmetry(world, euclideanAxioms.hidden_assumptions.equalitySymmetric, eq1);
        const eqAC_AB = mustFind(world, fact("equal", [sAC, sAB]), "equal(segment(A,C), segment(A,B))");

        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAC_AB, eqAB_BA);
        const eqAC_BA = mustFind(world, fact("equal", [sAC, sBA]), "equal(segment(A,C), segment(B,A))");

        applyTransitivity(world, euclideanAxioms.text.commonNotion1, eqAC_BA, eq2);
        const goal = fact("equal", [sAC, sBC]);
        expect(world.has(goal)).toBe(true);
    });
});
