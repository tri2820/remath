import { describe, expect, it } from "bun:test";
import { World } from "./world";
import { euclideanAxioms } from "./euclid";
import { atom, template, type Template } from "./rewriting";

// ==========================================
// CHAPTER 1: PROPOSITION 1
// ==========================================

describe("Euclid Chapter 1", () => {

    it("Proposition 1: Construct an Equilateral Triangle", () => {
        const world = new World();

        // 1. SETUP
        const A = atom("A");
        const B = atom("B");
        world.add(template("point", [A]));
        world.add(template("point", [B]));


        // 2. DRAW SEGMENT AB
        // Postulate 1 returns [segment(a,b), connected(a,b)]
        const [segAB] = world.apply(euclideanAxioms.text.postulate1, { "a": A, "b": B });

        // IMMEDIATE SYMMETRY
        // SegmentSymmetry returns [segment(b,a), equal(segAB, segBA)]
        const [segBA, eq_AB_BA] = world.apply(euclideanAxioms.hidden_assumptions.segmentSymmetry, { "a": A, "b": B });


        // 3. DRAW CIRCLES
        world.apply(euclideanAxioms.text.postulate3, { "o": A, "a": B });
        world.apply(euclideanAxioms.text.postulate3, { "o": B, "a": A });


        // 4. FIND INTERSECTION
        // Rule returns: [ intersection_set(S), in_set(P_Left, S), in_set(P_Right, S) ]
        const intersectionResults = world.apply(euclideanAxioms.hidden_assumptions.circleIntersection, {
            "o1": A, "r1": B,
            "o2": B, "r2": A
        });

        // Extract Point C from the 2nd result: in_set(C, S)
        const C = (intersectionResults[1] as Template).terms[0];

        if (C.type !== 'atom') throw new Error("Generated point C is not an atom");


        // 5. DRAW LEGS
        const [segCA] = world.apply(euclideanAxioms.text.postulate1, { "a": C, "b": A });
        const [segCB] = world.apply(euclideanAxioms.text.postulate1, { "a": C, "b": B });

        // Define segAC for lookup (Logic implies existence if C->A exists)
        const segAC = template("segment", [A, C]);


        // 6. PROVE RADII EQUAL

        // Circle A: AB = AC
        // radiiEqual output: equal(segment(o, a), segment(o, b)) -> equal(segAB, segAC)
        const [eq_AB_AC] = world.apply(euclideanAxioms.hidden_assumptions.radiiEqual, {
            "o": A, "a": B, "b": C
        });

        // Circle B: BA = BC
        const segBC = template("segment", [B, C]);
        const [eq_BA_BC] = world.apply(euclideanAxioms.hidden_assumptions.radiiEqual, {
            "o": B, "a": A, "b": C
        });


        // 7. THE LOGIC BRIDGE (Strict Proof)
        // Goal: AC = BC.

        // A. Flip Fact 1: (AB = AC) -> (AC = AB)
        const [eq_AC_AB] = world.apply(euclideanAxioms.hidden_assumptions.equalitySymmetric, {
            "a": segAB, "b": segAC
        });

        // B. Flip Fact 2: (BA = BC) -> (BC = BA)
        const [eq_BC_BA] = world.apply(euclideanAxioms.hidden_assumptions.equalitySymmetric, {
            "a": segBA, "b": segBC
        });

        // C. Chain: AC = AB + AB = BA -> AC = BA
        const [eq_AC_BA] = world.apply(euclideanAxioms.text.commonNotion1, {
            "a": segAC, "b": segAB, "c": segBA
        });

        // D. Chain: AC = BA + BA = BC -> AC = BC
        world.apply(euclideanAxioms.text.commonNotion1, {
            "a": segAC, "b": segBA, "c": segBC
        });

        // 8. FINAL VERIFICATION
        const result = world.find(template("equal", [segAC, segBC]));

        if (result.error) {
            throw new Error(result.error.message);
        }

        expect(result.data.term).toBeDefined();

        console.log(`\nProposition 1 Proven! \nTriangle {${A.symbol}, ${B.symbol}, ${C.symbol}} is equilateral.`);
    });
});