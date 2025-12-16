import { describe, it, expect, beforeAll } from "bun:test";
import { World } from "../world";
import { atom, fact, variable, type Rule } from "../rewriting";
import { euclideanAxioms } from ".";

describe("Euclid prop 1: Construct equilateral triangle", () => {
    // Shared state across all steps
    let world: World;

    // Axiom
    beforeAll(() => {
        world = new World();
        world.addAll(Object.values(euclideanAxioms.text));
        world.addAll(Object.values(euclideanAxioms.hidden_assumptions));
    });

    // Assumptions
    it("create a world with 2 points", () => {
        const pA = fact("point", [atom("A")]);
        const pB = fact("point", [atom("B")]);
        world.add(pA);
        world.add(pB);
        expect(world).toBeDefined();
        expect(world.has(pA)).toBe(true);
        expect(world.has(pB)).toBe(true)
    })

    it("construct the base segment AB", () => {
        const pA = world.find(fact("point", [atom("A")]))!;
        const pB = world.find(fact("point", [atom("B")]))!;
        const goal = fact("segment", [atom("A"), atom("B")]);

        const res = world.substitute(euclideanAxioms.text.postulate1, [
            { pattern: euclideanAxioms.text.postulate1.terms[0]!, with: pA },
            // Currying drill
            { pattern: (euclideanAxioms.text.postulate1.terms[1] as Rule).terms[0]!, with: pB },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);
        expect(world.has(goal)).toBe(true);
    })

    it("construct circle (A, B)", () => {
        const segAB = world.find(fact("segment", [atom("A"), atom("B")]))!;
        const goal = fact("circle", [atom("A"), atom("B")]);
        const res = world.substitute(euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segAB },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);
        expect(world.has(goal)).toBe(true);
    })


    it("construct segment BA and obtain AB = BA", () => {
        const segAB = world.find(fact("segment", [atom("A"), atom("B")]))!;
        const segBA = world.find(fact("segment", [atom("B"), atom("A")]));

        const goal = fact("segment", [atom("B"), atom("A")]);
        const goal_eq = fact("equal", [segAB, goal]);

        // We have segAB but not segBA yet, because we have not applied segmentSymmetry
        expect(segAB).toBeDefined();
        expect(segBA).toBeUndefined();

        // 1.1 This creates
        // segment(B, A)
        // equal(segment(A, B), segment(B, A))
        const res = world.substitute(euclideanAxioms.hidden_assumptions.segmentSymmetry, [
            { pattern: euclideanAxioms.hidden_assumptions.segmentSymmetry.terms[0]!, with: segAB },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);
        expect(world.has(goal)).toBe(true);
        expect(world.has(goal_eq)).toBe(true);
    })

    it("construct circle (B, A)", () => {
        const segBA = world.find(fact("segment", [atom("B"), atom("A")]))!;
        const goal = fact("circle", [atom("B"), atom("A")]);

        const res = world.substitute(euclideanAxioms.text.postulate3, [
            { pattern: euclideanAxioms.text.postulate3.terms[0]!, with: segBA },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);
        expect(world.has(goal)).toBe(true);
    })

    it("find intersection point C of circles (A, B) and (B, A)", () => {
        const circleAB = world.find(fact("circle", [atom("A"), atom("B")]))!;
        const circleBA = world.find(fact("circle", [atom("B"), atom("A")]))!;

        // HACK: We know that the introduce function of the World class will deterministically going through the alphabet
        // So the first introduction will be "C"
        const goal_on_circle_A = fact("on_circle", [atom("C"), atom("A"), atom("B")]);
        const goal_on_circle_B = fact("on_circle", [atom("C"), atom("B"), atom("A")]);

        const res = world.substitute(euclideanAxioms.hidden_assumptions.circleIntersection, [
            { pattern: euclideanAxioms.hidden_assumptions.circleIntersection.terms[0]!, with: circleAB },
            { pattern: (euclideanAxioms.hidden_assumptions.circleIntersection.terms[1] as Rule).terms[0]!, with: circleBA },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);
        expect(world.has(goal_on_circle_A)).toBe(true);
        expect(world.has(goal_on_circle_B)).toBe(true);
    })

    it("construct AC and BC", () => {
        const pA = world.find(fact("point", [atom("A")]))!;
        const pB = world.find(fact("point", [atom("B")]))!;
        const pC = world.find(fact("point", [atom("C")]))!;

        const goal1 = fact("segment", [atom("A"), atom("C")]);
        const goal2 = fact("segment", [atom("B"), atom("C")]);

        const res = world.substitute(euclideanAxioms.text.postulate1, [
            { pattern: euclideanAxioms.text.postulate1.terms[0]!, with: pA },
            // Currying drill
            { pattern: (euclideanAxioms.text.postulate1.terms[1] as Rule).terms[0]!, with: pC },
        ])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }

        world.addAll(res.data);

        const res2 = world.substitute(euclideanAxioms.text.postulate1, [
            { pattern: euclideanAxioms.text.postulate1.terms[0]!, with: pB },
            // Currying drill
            { pattern: (euclideanAxioms.text.postulate1.terms[1] as Rule).terms[0]!, with: pC },
        ])

        if (res2.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res2.error)}`);
        }

        world.addAll(res2.data);

        expect(world.has(goal1)).toBe(true);
        expect(world.has(goal2)).toBe(true);
    })


    it("prove that AB = AC", () => {
        const on_circle_A = world.find(fact("on_circle", [atom("C"), atom("A"), atom("B")]))!;
        const segAC = world.find(fact("segment", [atom("A"), atom("C")]))!;
        const segAB = world.find(fact("segment", [atom("A"), atom("B")]))!;

        expect(segAC).toBeDefined();
        expect(segAB).toBeDefined();

        const goal = fact("equal", [segAB, segAC]);
        const res = world.substitute(euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: on_circle_A },
        ])

        // A bit of magic here:
        // on_circle(b,o,a) -> (segment(o,b) -> (equal(segment(o,a), segment(o,b))))
        // After substitution:
        // on_circle(C,A,B) -> (segment(A,C) -> (equal(segment(A,B), segment(A,C))))
        // We had on_circle(C,A,B) in the world of facts
        // This means we automatically have segment(A,C) -> (equal(segment(A,B), segment(A,C))
        // And we also have segment(A,C) in the world of facts
        // So the system automatically return equal(segment(A,B), segment(A,C)) in res.data

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }
        world.addAll(res.data);
        expect(world.has(goal)).toBe(true);
    });

    it("prove that BA = BC", () => {
        const on_circle_B = world.find(fact("on_circle", [atom("C"), atom("B"), atom("A")]))!;
        const segBC = world.find(fact("segment", [atom("B"), atom("C")]))!;
        const segBA = world.find(fact("segment", [atom("B"), atom("A")]))!;

        expect(segBC).toBeDefined();
        expect(segBA).toBeDefined();

        const goal = fact("equal", [segBA, segBC]);
        const res = world.substitute(euclideanAxioms.hidden_assumptions.radiiEqual, [
            { pattern: euclideanAxioms.hidden_assumptions.radiiEqual.terms[0]!, with: on_circle_B },])

        if (res.error) {
            throw new Error(`Substitution failed: ${JSON.stringify(res.error)}`);
        }
        world.addAll(res.data);

        expect(world.has(goal)).toBe(true);
    });

    it("prove AC = BC. All 3 sides are now equal.", () => {
        const segBC = world.find(fact("segment", [atom("B"), atom("C")]))!;
        const segBA = world.find(fact("segment", [atom("B"), atom("A")]))!;
        const segAC = world.find(fact("segment", [atom("A"), atom("C")]))!;
        const segAB = world.find(fact("segment", [atom("A"), atom("B")]))!;

        expect(segBC).toBeDefined();
        expect(segBA).toBeDefined();
        expect(segAC).toBeDefined();
        expect(segAB).toBeDefined();

        // AB = AC
        const eq1 = world.find(fact("equal", [segAB, segAC]))!;
        // BC = BA
        const eq2 = world.find(fact("equal", [segBA, segBC]))!;
        const goal = fact("equal", [segAC, segBC]);

        expect(eq1).toBeDefined();
        expect(eq2).toBeDefined();

        const subgoal1 = fact("equal", [segAC, segAB]);
        const subgoal2 = fact("equal", [segAC, segBA]);

        // We need equal(segAB, segBA) from 1.1
        const eqAB_BA = world.find(fact("equal", [segAB, segBA]))!;
        expect(eqAB_BA).toBeDefined();

        // Step 1: Apply symmetry to eq1 to get equal(segAC, segAB)
        // AC = AB
        const res1 = world.substitute(euclideanAxioms.hidden_assumptions.equalitySymmetric, [
            { pattern: euclideanAxioms.hidden_assumptions.equalitySymmetric.terms[0]!, with: eq1 },
        ]);
        if (res1.error) throw new Error(`Substitution failed: ${JSON.stringify(res1.error)}`);
        world.addAll(res1.data);


        const eqAC_AB = world.find(subgoal1)!;
        expect(eqAC_AB).toBeDefined();

        // Step 2: Transitivity: equal(segAC, segAB) + equal(segAB, segBA) → equal(segAC, segBA)
        const res2 = world.substitute(euclideanAxioms.text.commonNotion1, [
            { pattern: euclideanAxioms.text.commonNotion1.terms[0]!, with: eqAC_AB },
            { pattern: (euclideanAxioms.text.commonNotion1.terms[1] as Rule).terms[0]!, with: eqAB_BA },
        ]);
        if (res2.error) throw new Error(`Substitution failed: ${JSON.stringify(res2.error)}`);
        world.addAll(res2.data);


        const eqAC_BA = world.find(subgoal2)!;
        expect(eqAC_BA).toBeDefined();

        // Step 3: Transitivity: equal(segAC, segBA) + equal(segBA, segBC) → equal(segAC, segBC)
        const res3 = world.substitute(euclideanAxioms.text.commonNotion1, [
            { pattern: euclideanAxioms.text.commonNotion1.terms[0]!, with: eqAC_BA },
            { pattern: (euclideanAxioms.text.commonNotion1.terms[1] as Rule).terms[0]!, with: eq2 },
        ]);
        if (res3.error) throw new Error(`Substitution failed: ${JSON.stringify(res3.error)}`);
        world.addAll(res3.data);
        expect(world.has(goal)).toBe(true);
    });
})
