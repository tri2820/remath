import { rule, fact, variable, introduction, atom } from '../rewriting';

// ==========================================
// 1. THE EXPLICIT POSTULATES (The Text)
// ==========================================

// Postulate 1: "To draw a straight line from any point to any point."
// Interaction: User clicks Point A -> User clicks Point B -> Result.
export const postulate1 = rule(
    fact("point", [variable("a")]),
    rule(
        fact("point", [variable("b")]),
        // RHS:
        fact("segment", [variable("a"), variable("b")]),
    )
);

// Postulate 2: "To produce a finite straight line continuously in a straight line."
// FLAW: Euclid assumes "straight" means "collinear" without defining it.
export const postulate2 = rule(
    fact("segment", [variable("a"), variable("b")]),
    // RHS: We create a new point c
    // We explicitly assert 'collinear' here, which Euclid assumes implicitly
    fact("segment", [variable("b"), introduction("c")]),
    fact("point", [introduction("c")]),
    fact("collinear", [variable("a"), variable("b"), introduction("c")]),
);

// Postulate 3: "To describe a circle with any center and distance."
export const postulate3 = rule(
    fact("segment", [variable("o"), variable("a")]),
    // RHS:
    fact("circle", [variable("o"), variable("a")]),
    // Implicit: The point a is definitely on this circle
    fact("on_circle", [variable("a"), variable("o"), variable("a")])
);

// Postulate 4: "That all right angles are equal to one another."
export const postulate4 = rule(
    fact("right_angle", [variable("a"), variable("b"), variable("c")]),
    rule(
        fact("right_angle", [variable("d"), variable("e"), variable("f")]),
        fact("equal", [
            fact("angle", [variable("a"), variable("b"), variable("c")]),
            fact("angle", [variable("d"), variable("e"), variable("f")])
        ])
    )
);

// Postulate 5: (Playfair's Version for simplicity)
export const postulate5 = rule(
    fact("line", [variable("a"), variable("b")]),
    rule(
        fact("point", [variable("p")]),
        fact("point", [introduction("q")]),
        fact("parallel_line", [variable("p"), variable("a"), variable("b"), introduction("q")])
    )
);

// =======================
// UNIQUENESS AXIOMS (The "Exactly One" part)
// =======================

// Playfair's Uniqueness: 
// "Through a point not on a line, there is AT MOST one parallel."
// Logic: If Line(P, Q1) is parallel to AB, and Line(P, Q2) is parallel to AB,
// Then Line(P, Q1) and Line(P, Q2) are the same line (and points P, Q1, Q2 are collinear).

export const playfairUniqueness = rule(
    // PREMISE: Two parallel constructions exist from the same point p relative to ab
    fact("parallel_line", [variable("p"), variable("a"), variable("b"), variable("q1")]),
    rule(
        fact("parallel_line", [variable("p"), variable("a"), variable("b"), variable("q2")]),

        // CONSEQUENCE: They are equal (The lines coincide)
        fact("equal", [
            fact("line", [variable("p"), variable("q1")]),
            fact("line", [variable("p"), variable("q2")])
        ]),

        // CONSEQUENCE: The defining points are collinear
        fact("collinear", [variable("p"), variable("q1"), variable("q2")])
    )
);

// ==========================================
// 2. THE COMMON NOTIONS (Generic Logic)
// ==========================================

// Common Notion 1: Transitivity
export const commonNotion1 = rule(
    fact("equal", [variable("a"), variable("b")]),
    rule(
        fact("equal", [variable("b"), variable("c")]),
        fact("equal", [variable("a"), variable("c")])
    )
);

// Common Notion 2: Addition
// Uses generic "sum" constructor
export const commonNotion2 = rule(
    fact("equal", [variable("a"), variable("b")]),
    rule(
        fact("equal", [variable("c"), variable("d")]),
        fact("equal", [
            fact("sum", [variable("a"), variable("c")]),
            fact("sum", [variable("b"), variable("d")])
        ])
    )
);

// Common Notion 4: Superposition (The Big Flaw)
// "Things which coincide with one another equal one another."
// Teachable Moment: This implies we can move shapes around to check equality.
export const commonNotion4 = rule(
    fact("coincides", [variable("a"), variable("b")]),
    fact("equal", [variable("a"), variable("b")])
);

// Common Notion 3: Subtraction
// "If equals be subtracted from equals, the remainders are equal."
// Formula: If A = B and C = D, then (A - C) = (B - D)
export const commonNotion3 = rule(
    fact("equal", [variable("a"), variable("b")]), // The Wholes (Minuends)
    rule(
        fact("equal", [variable("c"), variable("d")]), // The Parts (Subtrahends)

        // RHS: The difference between a and c is equal to the difference between b and d
        fact("equal", [
            fact("diff", [variable("a"), variable("c")]),
            fact("diff", [variable("b"), variable("d")])
        ])
    )
);

// ==========================================
// 3. THE HIDDEN ASSUMPTIONS (The Flaws)
// ==========================================
// These are rules Euclid requires to prove Proposition 1, 
// but he never wrote them down. In your game, the player 
// should get stuck until they unlock these "Hidden Rules".

// HIDDEN RULE: Circle Intersection
// Euclid assumes if two circles exist, they intersect at some point.
// He never proves intersection points exist, just asserts "let C be where they meet"
export const circleIntersection = rule(
    fact("circle", [variable("o1"), variable("a")]),
    rule(
        fact("circle", [variable("o2"), variable("b")]),
        // RHS 1: First, assert the point exists
        fact("point", [introduction("c")]),
        // RHS 2: Assert the point is on the first circle
        fact("on_circle", [introduction("c"), variable("o1"), variable("a")]),
        // RHS 3: Assert the point is on the second circle
        fact("on_circle", [introduction("c"), variable("o2"), variable("b")])
    )
);
// HIDDEN RULE: Point on Circle implies Equal Radius (Definition 15)
// This technically isn't a flaw, but a Definition used as a Rule.
export const radiiEqual = rule(
    fact("circle", [variable("o"), variable("a")]),
    rule(
        fact("on_circle", [variable("b"), variable("o"), variable("a")]),
        // RHS: The distance to the new point b is equal to the radius oa
        fact("equal", [
            fact("segment", [variable("o"), variable("a")]),
            fact("segment", [variable("o"), variable("b")])
        ])
    )
);

// HIDDEN RULE: "Looking at the diagram" (Betweenness)
// Euclid often assumes points are between others just by looking.
// This rule formalizes the flaw: "If we have A-B and B-C, we assume A-B-C is a line"
export const visualSegmentAddition = rule(
    fact("segment", [variable("a"), variable("b")]),
    rule(
        fact("segment", [variable("b"), variable("c")]),
        // RHS: We assert the whole exists and is the sum of parts
        fact("segment", [variable("a"), variable("c")]),
        fact("equal", [
            fact("segment", [variable("a"), variable("c")]),
            fact("sum", [
                fact("segment", [variable("a"), variable("b")]),
                fact("segment", [variable("b"), variable("c")])
            ])
        ])
    )
);

// HIDDEN RULE: Visual Segment Subtraction
// Euclid assumes if C is between A and B, then AC = AB - CB
export const visualSegmentSubtraction = rule(
    fact("segment", [variable("a"), variable("b")]), // Whole
    rule(
        fact("segment", [variable("c"), variable("b")]), // Part (at one end)

        // RHS: The remainder (ac) exists and equals Whole - Part
        fact("segment", [variable("a"), variable("c")]),
        fact("equal", [
            fact("segment", [variable("a"), variable("c")]),
            fact("diff", [
                fact("segment", [variable("a"), variable("b")]),
                fact("segment", [variable("c"), variable("b")])
            ])
        ])
    )
);

// HIDDEN RULE: Equality is Symmetric
// If we know A = B, then we also know B = A.
export const equalitySymmetric = rule(
    fact("equal", [variable("a"), variable("b")]),
    fact("equal", [variable("b"), variable("a")])
);

// HIDDEN RULE: Segment Symmetry
// "The distance from A to B is the same as B to A"
// Necessary because the computer sees segment(a,b) and segment(b,a) as different data.
export const segmentSymmetry = rule(
    // LHS: Condition
    fact("segment", [variable("a"), variable("b")]),

    // RHS 1: Implicitly create the reverse segment in the database
    fact("segment", [variable("b"), variable("a")]),

    // RHS 2: Declare them equal
    fact("equal", [
        fact("segment", [variable("a"), variable("b")]),
        fact("segment", [variable("b"), variable("a")])
    ])
);

export const euclideanAxioms = {
    text: {
        postulate1,
        postulate2,
        postulate3,
        postulate4,
        postulate5,
        playfairUniqueness,
        commonNotion1,
        commonNotion2,
        commonNotion3,
        commonNotion4
    },
    hidden_assumptions: {
        circleIntersection,
        radiiEqual,
        visualSegmentAddition,
        visualSegmentSubtraction,
        equalitySymmetric,
        segmentSymmetry
    }
};