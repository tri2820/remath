import { describe, it, expect } from "bun:test";
import { World } from "../world";
import { atom, fact, rule, variable, introduction, type Rule, type Term } from "../rewriting";
import { euclideanAxioms } from ".";
import { apply, drawSegment, findSharedPointOnCircles, mustFind } from "./testUtils";

// Euclid's non-degeneracy gap is curriculum, not a defect. These tests pin it down from
// both sides: the unguarded axioms derive a point at distance zero and never decide
// whether it is A, and a geometric guard on circle intersection is what a correct axiom
// needs. See docs/curriculum.md, "The non-degeneracy gap".
//
// The rule of the lesson: a different NAME never means a different POINT.
// `introduce` hands out an unused symbol, which is a naming convention, not a claim of
// distinctness. Identity must be stated with a fact (coincides / equal), never read off
// the spelling of an atom.

const postulate1 = euclideanAxioms.text.postulate1;
const postulate3 = euclideanAxioms.text.postulate3;
const circleIntersection = euclideanAxioms.hidden_assumptions.circleIntersection;
const radiiEqual = euclideanAxioms.hidden_assumptions.radiiEqual;

describe("Euclid's non-degeneracy gap (kept on purpose)", () => {
    it("derives a point at distance zero and leaves its identity undecided", () => {
        const world = new World();
        world.addAll([postulate1, postulate3, circleIntersection, radiiEqual]);
        world.add(fact("point", [atom("A")]));
        world.add(fact("point", [atom("B")]));
        world.lock();

        // Postulate 1 with a = b = A. Euclid's wording is "from any point to any point",
        // and nothing forbids a point to itself, so we get a zero-length segment, and
        // from it a zero-radius circle.
        drawSegment(world, "A", "A", postulate1);
        drawSegment(world, "A", "B", postulate1);

        const segAA = mustFind(world, fact("segment", [atom("A"), atom("A")]), "segment(a,a)");
        const segAB = mustFind(world, fact("segment", [atom("A"), atom("B")]), "segment(a,b)");

        apply(world, postulate3, [{ pattern: postulate3.terms[0]!, with: segAA }]);
        apply(world, postulate3, [{ pattern: postulate3.terms[0]!, with: segAB }]);

        const circleAA = mustFind(world, fact("circle", [atom("A"), atom("A")]), "circle(a,a)");
        const circleAB = mustFind(world, fact("circle", [atom("A"), atom("B")]), "circle(a,b)");

        // Euclid I.1 assumes two circles meet, with no condition on the circles. Here the
        // zero-radius circle "meets" circle(A,B), and the rule introduces a witness.
        apply(world, circleIntersection, [
            { pattern: circleIntersection.terms[0]!, with: circleAA },
            { pattern: (circleIntersection.terms[1] as Rule).terms[0]!, with: circleAB },
        ]);

        const c = findSharedPointOnCircles(world, "A", "A", "A", "B", ["A", "B"]);

        // Different symbol, and that is ALL it is. This assertion is about spelling.
        expect(c).not.toBe("A");
        expect(world.has(fact("point", [atom(c)]))).toBe(true);

        // Radii of one circle are equal: |AA| = |AC|. In Euclidean geometry that forces
        // C to be A, because the only point on a zero-radius circle is its center.
        drawSegment(world, "A", c, postulate1);
        apply(world, radiiEqual, [
            {
                pattern: radiiEqual.terms[0]!,
                with: mustFind(world, fact("on_circle", [atom(c), atom("A"), atom("A")]), "on_circle(c,a,a)"),
            },
        ]);

        const zeroLength = fact("equal", [
            fact("segment", [atom("A"), atom("A")]),
            fact("segment", [atom("A"), atom(c)]),
        ]);
        expect(world.has(zeroLength)).toBe(true);

        // The system does not conclude that C is A, and it cannot conclude the opposite
        // either: there is no negation here. Identity would have to be stated, via
        // coincides (which commonNotion4 turns into equal), and no rule produces it.
        expect(world.has(fact("coincides", [atom("A"), atom(c)]))).toBe(false);
        expect(world.has(fact("equal", [fact("point", [atom("A")]), fact("point", [atom(c)])]))).toBe(false);
    });

    it("is blocked by a geometric guard on circle intersection, which is the fix we deliberately do not apply", () => {
        // Two concentric circles need not meet, so the missing premiss is a claim about
        // the circles, not about the spelling of the witness.
        const guardedIntersection = rule(
            fact("circle", [variable("o1"), variable("a")]),
            rule(
                fact("circle", [variable("o2"), variable("b")]),
                rule(
                    fact("distinct", [variable("o1"), variable("o2")]),
                    fact("point", [introduction("c")]),
                    fact("on_circle", [introduction("c"), variable("o1"), variable("a")]),
                    fact("on_circle", [introduction("c"), variable("o2"), variable("b")])
                )
            )
        );

        const world = new World();
        world.addAll([
            guardedIntersection,
            fact("point", [atom("A")]),
            fact("point", [atom("B")]),
            fact("circle", [atom("A"), atom("A")]),
            fact("circle", [atom("A"), atom("B")]),
            fact("circle", [atom("B"), atom("A")]),
            fact("distinct", [atom("A"), atom("B")]),
        ]);
        world.lock();

        const step = (clause: Rule, withFact: Term): Rule | undefined => {
            const out = apply(world, clause, [{ pattern: clause.terms[0]!, with: withFact }]);
            const next = out[1];
            return next && next.type === "fact" && next.op.symbol === "rule" ? (next as Rule) : undefined;
        };

        // Feed the two circles, and get back the residual rule that still wants the
        // distinctness premiss, instantiated with the centers it was given.
        const residual = (c1: Term, c2: Term): Rule => {
            const afterFirstCircle = step(guardedIntersection, c1)!;
            return step(afterFirstCircle, c2)!;
        };

        const concentric = residual(fact("circle", [atom("A"), atom("A")]), fact("circle", [atom("A"), atom("B")]));
        const blocked = world.substitute(concentric, [
            { pattern: concentric.terms[0]!, with: fact("distinct", [atom("A"), atom("A")]) },
        ]);
        expect(blocked.error?.code).toBe("FACT_NOT_FOUND_IN_WORLD_FACTS");

        // Distinct centers: the healthy case, which is what Proposition 1 actually uses.
        const proper = residual(fact("circle", [atom("A"), atom("B")]), fact("circle", [atom("B"), atom("A")]));
        const healthy = world.substitute(proper, [
            { pattern: proper.terms[0]!, with: fact("distinct", [atom("A"), atom("B")]) },
        ]);
        expect(healthy.error).toBeUndefined();
        if (healthy.error) throw new Error(JSON.stringify(healthy.error));
        expect(world.facts.filter(f => f.type === "fact" && f.op.symbol === "on_circle").length).toBeGreaterThan(0);
    });
});
