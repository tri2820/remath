import { rule, fact, variable, introduction, atom, make_rule } from '../rewriting';

// About Rules
// rule = [lhs, rhs0, rhs1, ...]
// lhs is the condition to match
// rhs are the facts to produce if lhs matches
// Complex rules are defined using currying
// E.g., rule(A, rule(B, C)) means "If A and B, then C"


// ==========================================
// 1. THE EXPLICIT POSTULATES (Construction Rules)
// ==========================================

// Postulate 1: "To draw a straight line from any point to any point."
// This creates the FINITE Segment.
export const postulate1 = rule(
    fact("point", [variable("a")]),
    rule(
        fact("point", [variable("b")]),
        fact("segment", [variable("a"), variable("b")]),
    )
);

// Postulate 2: "To produce a finite straight line continuously in a straight line."
export const postulate2 = rule(
    fact("segment", [variable("a"), variable("b")]),
    fact("segment", [variable("b"), introduction("c")]),
    fact("point", [introduction("c")]),
    fact("collinear", [variable("a"), variable("b"), introduction("c")]),
);

// Postulate 3: "To describe a circle with any center and distance."
export const postulate3 = rule(
    fact("segment", [variable("o"), variable("a")]),
    fact("circle", [variable("o"), variable("a")]),
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

// Postulate 5: (Playfair's Version)
// Requires an infinite "line" as input.
export const playfairExistence = rule(
    fact("line", [variable("a"), variable("b")]),
    rule(
        fact("point", [variable("p")]),
        fact("point", [introduction("q")]),
        fact("parallel", [
            fact("line", [variable("p"), introduction("q")]),
            fact("line", [variable("a"), variable("b")])
        ]),
        fact("collinear", [variable("p"), introduction("q")])
    )
);

// ==========================================
// 1.5 DEFINITIONS (Defining the Terms)
// ==========================================

// Definition 4: The Straight Line
// "A straight line is a line which lies evenly with the points on itself."
// Logic: If a Segment AB exists, the Infinite Line AB exists.
// This allows Postulate 5 (which needs Lines) to talk to Postulate 1 (which makes Segments).
export const definition_Line = rule(
    fact("segment", [variable("a"), variable("b")]),
    fact("line", [variable("a"), variable("b")])
);

// Definition 8: Plane Angle
// "A plane angle is the inclination to one another of two lines..."
// Logic: An angle exists only if the two segments forming it exist.
export const definition_Angle = rule(
    fact("line", [variable("b"), variable("a")]),
    fact("line", [variable("b"), variable("c")]),
    fact("angle", [variable("a"), variable("b"), variable("c")])
    // Are we talking about small angles only?
);

// Definition 10: Right Angle (Perpendicularity)
// "When a straight line set up on a straight line makes the adjacent angles equal..."
// This is how Euclid constructs "90 degrees" without numbers.
export const definition_RightAngle = rule(
    // 1. The Base: A straight line A-D-B
    fact("collinear", [variable("a"), variable("d"), variable("b")]),
    // 2. The Standing Line: DC
    fact("segment", [variable("d"), variable("c")]),
    // 3. The Condition: The neighbors are equal
    fact("equal", [
        fact("angle", [variable("a"), variable("d"), variable("c")]),
        fact("angle", [variable("b"), variable("d"), variable("c")])
    ]),
    // Result: It is a right angle
    fact("right", [
        fact("angle", [variable("a"), variable("d"), variable("c")])
    ])
);

// =======================
// UNIQUENESS AXIOMS
// =======================

export const playfairUniqueness = rule(
    fact("parallel", [
        fact("line", [variable("p"), variable("q1")]),
        fact("line", [variable("a"), variable("b")])
    ]),
    rule(
        fact("parallel", [
            fact("line", [variable("p"), variable("q2")]),
            fact("line", [variable("a"), variable("b")])
        ]),
        fact("equal", [
            fact("line", [variable("p"), variable("q1")]),
            fact("line", [variable("p"), variable("q2")])
        ]),
        fact("collinear", [variable("p"), variable("q1"), variable("q2")])
    )
);

// ==========================================
// 2. THE COMMON NOTIONS
// ==========================================

export const commonNotion1 = rule(
    fact("equal", [variable("a"), variable("b")]),
    rule(
        fact("equal", [variable("b"), variable("c")]),
        fact("equal", [variable("a"), variable("c")])
    )
);

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

export const commonNotion4 = rule(
    fact("coincides", [variable("a"), variable("b")]),
    fact("equal", [variable("a"), variable("b")])
);

export const commonNotion3 = rule(
    fact("equal", [variable("a"), variable("b")]),
    rule(
        fact("equal", [variable("c"), variable("d")]),
        fact("equal", [
            fact("diff", [variable("a"), variable("c")]),
            fact("diff", [variable("b"), variable("d")])
        ])
    )
);

// ==========================================
// 3. THE HIDDEN ASSUMPTIONS (The Flaws)
// ==========================================

// HIDDEN RULE: Circle Intersection
// Euclid assumes if two circles exist, they intersect at some point.
export const circleIntersection = rule(
    fact("circle", [variable("o1"), variable("a")]),
    rule(
        fact("circle", [variable("o2"), variable("b")]),
        fact("point", [introduction("c")]),
        fact("on_circle", [introduction("c"), variable("o1"), variable("a")]),
        fact("on_circle", [introduction("c"), variable("o2"), variable("b")])
    )
);


// HIDDEN RULE: Point on Circle implies Equal Radius (Definition 15)
// Corrected logic:
// 1. If B is on the circle...
// 2. THEN check if the segment O-B actually exists (Nested Rule)...
// 3. ONLY THEN produce the equality fact.
export const radiiEqual = rule(
    fact("on_circle", [variable("b"), variable("o"), variable("a")]),
    rule(
        // This is now a Condition (LHS of the inner rule)
        fact("segment", [variable("o"), variable("b")]),

        // This is the Product (RHS of the inner rule)
        fact("equal", [
            fact("segment", [variable("o"), variable("a")]),
            fact("segment", [variable("o"), variable("b")])
        ])
    )
);

// HIDDEN RULE: Collinear implies Straight Angle
// Euclid Prop 13 proves this, but it relies on an unstated axiom that 
// straight lines measure as "two right angles".
export const collinearImpliesStraightAngle = rule(
    fact("collinear", [variable("a"), variable("b"), variable("c")]),
    make_rule(
        fact("angle", [variable("a"), variable("b"), variable("c")]),
        make_rule(
            fact("right", [
                fact("angle", [variable("a"), variable("b"), variable("c")])
            ]),
            make_rule(
                fact("right", [
                    fact("angle", [variable("g"), variable("h"), variable("i")])
                ]),
                fact("equal", [
                    fact("angle", [variable("a"), variable("b"), variable("c")]),
                    fact("sum", [
                        fact("angle", [variable("d"), variable("e"), variable("f")]),
                        fact("angle", [variable("g"), variable("h"), variable("i")])
                    ])
                ])
            )
        )
    )
);

// HIDDEN RULE: Linear Segment Addition (The Fix)
// We only assume AC = AB + BC if we KNOW they are collinear.
export const linearSegmentAddition = rule(
    // We insist on the collinear fact (produced by Postulate 2)
    fact("collinear", [variable("a"), variable("b"), variable("c")]),
    fact("equal", [
        fact("segment", [variable("a"), variable("c")]),
        fact("sum", [
            fact("segment", [variable("a"), variable("b")]),
            fact("segment", [variable("b"), variable("c")])
        ])
    ])
);

// HIDDEN RULE: Linear Segment Subtraction (The Fix)
export const linearSegmentSubtraction = rule(
    // GUARD: A -> C -> B
    fact("collinear", [variable("a"), variable("c"), variable("b")]),
    fact("equal", [
        fact("segment", [variable("a"), variable("c")]),
        fact("diff", [
            fact("segment", [variable("a"), variable("b")]),
            fact("segment", [variable("c"), variable("b")])
        ])
    ])
);

// HIDDEN RULE: Equality is Symmetric
export const equalitySymmetric = rule(
    fact("equal", [variable("a"), variable("b")]),
    fact("equal", [variable("b"), variable("a")])
);

// HIDDEN RULE: Segment Symmetry (AB is the same segment as BA)
export const segmentSymmetry = rule(
    fact("segment", [variable("a"), variable("b")]),
    fact("segment", [variable("b"), variable("a")]),
    fact("equal", [
        fact("segment", [variable("a"), variable("b")]),
        fact("segment", [variable("b"), variable("a")])
    ])
);

// 1. Line-Circle Intersection (Construction)
// "To produce a straight line (segment AB) until it meets a circle (Center B)."
export const lineCircleIntersection = rule(
    // The Input: A directional segment A -> B
    fact("segment", [variable("a"), variable("b")]),
    rule(
        // The Boundary: A circle centered at the endpoint B
        fact("circle", [variable("b"), variable("r")]),

        // The Output: A new point X created by the intersection
        fact("point", [introduction("x")]),

        // 1. It preserves the line (A -> B -> X)
        fact("collinear", [variable("a"), variable("b"), introduction("x")]),

        // 2. It lies on the boundary
        fact("on_circle", [introduction("x"), variable("b"), variable("r")])
    )
);

export const collinearSymmetry = rule(
    // Input: A-B-C
    fact("collinear", [variable("a"), variable("b"), variable("c")]),
    // Output: C-B-A
    fact("collinear", [variable("c"), variable("b"), variable("a")])
);

export const euclideanAxioms = {
    text: {
        postulate1,
        postulate2,
        postulate3,
        postulate4,
        playfairExistence,
        playfairUniqueness,
        definition_Line,
        definition_Angle,
        definition_RightAngle,
        commonNotion1,
        commonNotion2,
        commonNotion3,
        commonNotion4
    },
    hidden_assumptions: {
        circleIntersection,
        radiiEqual,
        collinearImpliesStraightAngle,
        linearSegmentAddition,
        linearSegmentSubtraction,
        equalitySymmetric,
        segmentSymmetry
    }
};