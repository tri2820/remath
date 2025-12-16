// =================================================================================================
// PROPOSITION 1: To construct an equilateral triangle on a given finite straight line.
// =================================================================================================
//
// Goal: Given a segment AB, construct a triangle ABC where AB = BC = CA.
//
// 1.  **GIVEN**: We start with two points, A and B.
//     - The world contains: `fact("point", [A])` and `fact("point", [B])`.
//
// 2.  **STEP 1: Draw the base segment.**
//     - Use Postulate 1 on points A and B.
//     - This creates `fact("segment", [A, B])`.
//
// 3.  **STEP 2: Construct the first circle.**
//     - Use Postulate 3 with center A and radius point B (using the segment from Step 1).
//     - This creates `fact("circle", [A, B])`.
//
// 4.  **STEP 3: Construct the second circle.**
//     - Use Postulate 3 with center B and radius point A.
//         - Note: We need a `fact("segment", [B, A])`. The system needs a rule like `segmentSymmetry`
//           that states if `segment(A,B)` exists, `segment(B,A)` also exists and they are equal.
//     - This creates `fact("circle", [B, A])`.
//
// 5.  **STEP 4: Find the intersection.**
//     - Now the world contains two circles. We need to find where they intersect.
//     - This is a major gap in Euclid's logic. We need a "Hidden Rule" like `circleIntersection`.
//     - This rule would take the two circles and introduce a new point, C, which lies on both.
//     - This adds `fact("on_circle", [C, A, B])` and `fact("on_circle", [C, B, A])`.
//
// 6.  **STEP 5: Prove the sides are equal.**
//     - **Side AC vs AB**:
//         - We have `fact("on_circle", [C, A, B])`.
//         - We need a rule that says "if a point is on a circle, its distance to the center is equal to the radius." This is the `radiiEqual` hidden rule.
//         - Applying this rule gives `fact("equal", [fact("segment", [A, C]), fact("segment", [A, B])])`.
//
//     - **Side BC vs BA**:
//         - We have `fact("on_circle", [C, B, A])`.
//         - Applying the `radiiEqual` rule again gives `fact("equal", [fact("segment", [B, C]), fact("segment", [B, A])])`.
//
//     - **All three sides**:
//         - We now have (AC = AB) and (BC = BA).
//         - We also know from `segmentSymmetry` that AB = BA.
//         - Using Common Notion 1 (Transitivity: if x=y and y=z, then x=z):
//             - From (AC = AB) and (AB = BA), we get (AC = BA).
//             - From (AC = BA) and (BA = BC) [using symmetry on the second equality], we get (AC = BC).
//             - Therefore, AB = BC = AC.
//
// 7.  **CONCLUSION**: We have constructed `fact("segment", [A, C])` and `fact("segment", [B, C])`,
//     and proven that all three segments (AB, BC, CA) are equal. The equilateral triangle is formed.
//
//

import { describe, it, expect, beforeAll } from "bun:test";
import { World } from "../world";
import { atom, fact, variable, type Rule } from "../rewriting";
import { euclideanAxioms } from ".";
describe("To construct an equilateral triangle on a given finite straight line", () => {
    // Shared state across all steps
    let world: World;

    beforeAll(() => {
        world = new World();
    });

    it("create a world with 2 points", () => {
        const pA = fact("point", [atom("A")]);
        const pB = fact("point", [atom("B")]);
        world.add(pA);
        world.add(pB);
        expect(world).toBeDefined();
        expect(world.facts.length).toBe(2);
        expect(world.has(pA)).toBe(true);
        expect(world.has(pB)).toBe(true)
    })

    it("construct the base segment AB", () => {
        const A = atom("A");
        const B = atom("B");
        const pA = world.find(fact("point", [A]))!;
        const pB = world.find(fact("point", [B]))!;
        const goal = fact("segment", [A, B]);

        const res = world.substitute(euclideanAxioms.text.postulate1, [
            { pattern: euclideanAxioms.text.postulate1.terms[0]!, with: pA },
            // Currying drill
            { pattern: (euclideanAxioms.text.postulate1.terms[1] as Rule).terms[0]!, with: pB },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);

        // console.log('euclideanAxioms.text.postulate1:', JSON.stringify(euclideanAxioms.text.postulate1, null, 2));
        // console.log("res:", JSON.stringify(res, null, 2));
        expect(world.has(goal)).toBe(true);
        // expect(world.facts.length).toBe(3);
    })

})
