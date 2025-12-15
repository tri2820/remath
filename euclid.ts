import { rule, template, variable, introduction, atom } from './rewriting';

// ==========================================
// 1. THE EXPLICIT POSTULATES (The Text)
// ==========================================

// Postulate 1: "To draw a straight line from any point to any point."
// Interaction: User clicks Point A -> User clicks Point B -> Result.
export const postulate1 = rule(
    template("point", [variable("A")]),
    rule(
        template("point", [variable("B")]),
        // RHS:
        template("segment", [variable("A"), variable("B")]),
        // Implicit knowledge Euclid assumes: A and B are now connected
        template("connected", [variable("A"), variable("B")])
    )
);

// Postulate 2: "To produce a finite straight line continuously in a straight line."
// FLAW: Euclid assumes "straight" means "collinear" without defining it.
export const postulate2 = rule(
    template("segment", [variable("A"), variable("B")]),
    // RHS: We create a new point C
    // We explicitly assert 'collinear' here, which Euclid assumes implicitly
    template("segment", [variable("B"), introduction("C", "C")]),
    template("collinear", [variable("A"), variable("B"), introduction("C", "C")])
);

// Postulate 3: "To describe a circle with any center and distance."
export const postulate3 = rule(
    template("segment", [variable("O"), variable("A")]),
    // RHS:
    template("circle", [variable("O"), variable("A")]),
    // Implicit: The point A is definitely on this circle
    template("on_circle", [variable("A"), variable("O"), variable("A")])
);

// Postulate 4: "That all right angles are equal to one another."
export const postulate4 = rule(
    template("right_angle", [variable("A"), variable("B"), variable("C")]),
    rule(
        template("right_angle", [variable("D"), variable("E"), variable("F")]),
        template("equal", [
            template("angle", [variable("A"), variable("B"), variable("C")]),
            template("angle", [variable("D"), variable("E"), variable("F")])
        ])
    )
);

// Postulate 5: (Playfair's Version for simplicity)
export const postulate5 = rule(
    template("line", [variable("A"), variable("B")]),
    rule(
        template("point", [variable("P")]),
        template("parallel_line", [variable("P"), variable("A"), variable("B"), introduction("Q", "Q")])
    )
);

// ==========================================
// 2. THE COMMON NOTIONS (Generic Logic)
// ==========================================

// Common Notion 1: Transitivity
export const commonNotion1 = rule(
    template("equal", [variable("A"), variable("B")]),
    rule(
        template("equal", [variable("B"), variable("C")]),
        template("equal", [variable("A"), variable("C")])
    )
);

// Common Notion 2: Addition
// Uses generic "sum" template
export const commonNotion2 = rule(
    template("equal", [variable("A"), variable("B")]),
    rule(
        template("equal", [variable("C"), variable("D")]),
        template("equal", [
            template("sum", [variable("A"), variable("C")]),
            template("sum", [variable("B"), variable("D")])
        ])
    )
);

// Common Notion 4: Superposition (The Big Flaw)
// "Things which coincide with one another equal one another."
// Teachable Moment: This implies we can move shapes around to check equality.
export const commonNotion4 = rule(
    template("coincides", [variable("A"), variable("B")]),
    template("equal", [variable("A"), variable("B")])
);

// Common Notion 3: Subtraction
// "If equals be subtracted from equals, the remainders are equal."
// Formula: If A = B and C = D, then (A - C) = (B - D)
export const commonNotion3 = rule(
    template("equal", [variable("A"), variable("B")]), // The Wholes (Minuends)
    rule(
        template("equal", [variable("C"), variable("D")]), // The Parts (Subtrahends)

        // RHS: The difference between A and C is equal to the difference between B and D
        template("equal", [
            template("diff", [variable("A"), variable("C")]),
            template("diff", [variable("B"), variable("D")])
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
    template("circle", [variable("O1"), variable("R1")]),
    rule(
        template("circle", [variable("O2"), variable("R2")]),
        // RHS: We introduce a SET of points to handle the "OR" logic safely
        template("intersection_set", [
            variable("O1"), variable("R1"),
            variable("O2"), variable("R2"),
            introduction("S", "Intersections")
        ]),
        // We assert there are points in this set
        template("in_set", [introduction("P_Left", "P"), introduction("S", "Intersections")]),
        template("in_set", [introduction("P_Right", "P"), introduction("S", "Intersections")])
    )
);

// HIDDEN RULE 2: Point on Circle implies Equal Radius (Definition 15)
// This technically isn't a flaw, but a Definition used as a Rule.
export const radiiEqual = rule(
    template("circle", [variable("O"), variable("A")]),
    rule(
        template("on_circle", [variable("B"), variable("O"), variable("A")]),
        // RHS: The distance to the new point B is equal to the radius OA
        template("equal", [
            template("segment", [variable("O"), variable("A")]),
            template("segment", [variable("O"), variable("B")])
        ])
    )
);

// HIDDEN RULE 3: "Looking at the diagram" (Betweenness)
// Euclid often assumes points are between others just by looking.
// This rule formalizes the flaw: "If we have A-B and B-C, we assume A-B-C is a line"
export const visualSegmentAddition = rule(
    template("segment", [variable("A"), variable("B")]),
    rule(
        template("segment", [variable("B"), variable("C")]),
        // RHS: We assert the whole exists and is the sum of parts
        template("segment", [variable("A"), variable("C")]),
        template("equal", [
            template("segment", [variable("A"), variable("C")]),
            template("sum", [
                template("segment", [variable("A"), variable("B")]),
                template("segment", [variable("B"), variable("C")])
            ])
        ])
    )
);

// HIDDEN RULE: Visual Segment Subtraction
// Euclid assumes if C is between A and B, then AC = AB - CB
export const visualSegmentSubtraction = rule(
    template("segment", [variable("A"), variable("B")]), // Whole
    rule(
        template("segment", [variable("C"), variable("B")]), // Part (at one end)

        // RHS: The remainder (AC) exists and equals Whole - Part
        template("segment", [variable("A"), variable("C")]),
        template("equal", [
            template("segment", [variable("A"), variable("C")]),
            template("diff", [
                template("segment", [variable("A"), variable("B")]),
                template("segment", [variable("C"), variable("B")])
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
        commonNotion1,
        commonNotion2,
        commonNotion4
    },
    hidden_assumptions: {
        circleIntersection,
        radiiEqual,
        visualSegmentAddition,
        visualSegmentSubtraction,
    }
};