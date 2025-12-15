import { rule, template, variable, introduction, atom } from './rewriting';

// ==========================================
// 1. THE EXPLICIT POSTULATES (The Text)
// ==========================================

// Postulate 1: "To draw a straight line from any point to any point."
// Interaction: User clicks Point A -> User clicks Point B -> Result.
export const postulate1 = rule(
    template("point", [variable("a")]),
    rule(
        template("point", [variable("b")]),
        // RHS:
        template("segment", [variable("a"), variable("b")]),
        // Implicit knowledge Euclid assumes: a and b are now connected
        template("connected", [variable("a"), variable("b")])
    )
);

// Postulate 2: "To produce a finite straight line continuously in a straight line."
// FLAW: Euclid assumes "straight" means "collinear" without defining it.
export const postulate2 = rule(
    template("segment", [variable("a"), variable("b")]),
    // RHS: We create a new point c
    // We explicitly assert 'collinear' here, which Euclid assumes implicitly
    template("segment", [variable("b"), introduction("c", "c")]),
    template("collinear", [variable("a"), variable("b"), introduction("c", "c")])
);

// Postulate 3: "To describe a circle with any center and distance."
export const postulate3 = rule(
    template("segment", [variable("o"), variable("a")]),
    // RHS:
    template("circle", [variable("o"), variable("a")]),
    // Implicit: The point a is definitely on this circle
    template("on_circle", [variable("a"), variable("o"), variable("a")])
);

// Postulate 4: "That all right angles are equal to one another."
export const postulate4 = rule(
    template("right_angle", [variable("a"), variable("b"), variable("c")]),
    rule(
        template("right_angle", [variable("d"), variable("e"), variable("f")]),
        template("equal", [
            template("angle", [variable("a"), variable("b"), variable("c")]),
            template("angle", [variable("d"), variable("e"), variable("f")])
        ])
    )
);

// Postulate 5: (Playfair's Version for simplicity)
export const postulate5 = rule(
    template("line", [variable("a"), variable("b")]),
    rule(
        template("point", [variable("p")]),
        template("parallel_line", [variable("p"), variable("a"), variable("b"), introduction("q", "Q")])
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
    template("parallel_line", [variable("p"), variable("a"), variable("b"), variable("q1")]),
    rule(
        template("parallel_line", [variable("p"), variable("a"), variable("b"), variable("q2")]),

        // CONSEQUENCE: They are equal (The lines coincide)
        template("equal", [
            template("line", [variable("p"), variable("q1")]),
            template("line", [variable("p"), variable("q2")])
        ]),

        // CONSEQUENCE: The defining points are collinear
        template("collinear", [variable("p"), variable("q1"), variable("q2")])
    )
);

// ==========================================
// 2. THE COMMON NOTIONS (Generic Logic)
// ==========================================

// Common Notion 1: Transitivity
export const commonNotion1 = rule(
    template("equal", [variable("a"), variable("b")]),
    rule(
        template("equal", [variable("b"), variable("c")]),
        template("equal", [variable("a"), variable("c")])
    )
);

// Common Notion 2: Addition
// Uses generic "sum" template
export const commonNotion2 = rule(
    template("equal", [variable("a"), variable("b")]),
    rule(
        template("equal", [variable("c"), variable("d")]),
        template("equal", [
            template("sum", [variable("a"), variable("c")]),
            template("sum", [variable("b"), variable("d")])
        ])
    )
);

// Common Notion 4: Superposition (The Big Flaw)
// "Things which coincide with one another equal one another."
// Teachable Moment: This implies we can move shapes around to check equality.
export const commonNotion4 = rule(
    template("coincides", [variable("a"), variable("b")]),
    template("equal", [variable("a"), variable("b")])
);

// Common Notion 3: Subtraction
// "If equals be subtracted from equals, the remainders are equal."
// Formula: If A = B and C = D, then (A - C) = (B - D)
export const commonNotion3 = rule(
    template("equal", [variable("a"), variable("b")]), // The Wholes (Minuends)
    rule(
        template("equal", [variable("c"), variable("d")]), // The Parts (Subtrahends)

        // RHS: The difference between a and c is equal to the difference between b and d
        template("equal", [
            template("diff", [variable("a"), variable("c")]),
            template("diff", [variable("b"), variable("d")])
        ])
    )
);

// ==========================================
// 3. THE HIDDEN ASSUMPTIONS (The Flaws)
// ==========================================
// These are rules Euclid requires to prove Proposition 1, 
// but he never wrote them down. In your game, the player 
// should get stuck until they unlock these "Hidden Rules".

// HIDDEN RULE 1: Circle Intersection
// Euclid assumes if circles look like they cross, they do.
// He never proves they actually meet. 
export const circleIntersection = rule(
    template("circle", [variable("o1"), variable("r1")]),
    rule(
        template("circle", [variable("o2"), variable("r2")]),
        // RHS: We introduce a SET of points to handle the "OR" logic safely
        template("intersection_set", [
            variable("o1"), variable("r1"),
            variable("o2"), variable("r2"),
            introduction("s", "Intersections")
        ]),
        // We assert there are points in this set
        template("in_set", [introduction("p_left", "P"), introduction("s", "Intersections")]),
        template("in_set", [introduction("p_right", "P"), introduction("s", "Intersections")])
    )
);

// HIDDEN RULE 2: Point on Circle implies Equal Radius (Definition 15)
// This technically isn't a flaw, but a Definition used as a Rule.
export const radiiEqual = rule(
    template("circle", [variable("o"), variable("a")]),
    rule(
        template("on_circle", [variable("b"), variable("o"), variable("a")]),
        // RHS: The distance to the new point b is equal to the radius oa
        template("equal", [
            template("segment", [variable("o"), variable("a")]),
            template("segment", [variable("o"), variable("b")])
        ])
    )
);

// HIDDEN RULE 3: "Looking at the diagram" (Betweenness)
// Euclid often assumes points are between others just by looking.
// This rule formalizes the flaw: "If we have A-B and B-C, we assume A-B-C is a line"
export const visualSegmentAddition = rule(
    template("segment", [variable("a"), variable("b")]),
    rule(
        template("segment", [variable("b"), variable("c")]),
        // RHS: We assert the whole exists and is the sum of parts
        template("segment", [variable("a"), variable("c")]),
        template("equal", [
            template("segment", [variable("a"), variable("c")]),
            template("sum", [
                template("segment", [variable("a"), variable("b")]),
                template("segment", [variable("b"), variable("c")])
            ])
        ])
    )
);

// HIDDEN RULE: Visual Segment Subtraction
// Euclid assumes if C is between A and B, then AC = AB - CB
export const visualSegmentSubtraction = rule(
    template("segment", [variable("a"), variable("b")]), // Whole
    rule(
        template("segment", [variable("c"), variable("b")]), // Part (at one end)

        // RHS: The remainder (ac) exists and equals Whole - Part
        template("segment", [variable("a"), variable("c")]),
        template("equal", [
            template("segment", [variable("a"), variable("c")]),
            template("diff", [
                template("segment", [variable("a"), variable("b")]),
                template("segment", [variable("c"), variable("b")])
            ])
        ])
    )
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
    }
};