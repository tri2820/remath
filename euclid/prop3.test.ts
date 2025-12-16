
// =================================================================================================
// PROPOSITION 3: Given two unequal straight lines, to cut off from the greater a straight line equal to the less.
// =================================================================================================
//
// Goal: Given segment AB (the greater) and C (the less), create a point F on AB such that AF = C.
// Note: Euclid treats C as a segment, let's call it segment CD for clarity.
//
// 1.  **GIVEN**: A segment `AB` and another, smaller segment `CD`.
//     - World: `fact("segment", [A, B])`, `fact("segment", [C, D])`.
//
// 2.  **STEP 1: Place the smaller segment at the start of the larger one.**
//     - Use Proposition 2 to place a line starting at point A that is equal to segment CD.
//     - This is a high-level step that involves the entire procedure of Prop 2.
//     - The result is the creation of a new segment, `AE`, such that `fact("equal", [fact("segment", [A, E]), fact("segment", [C, D])])`.
//
// 3.  **STEP 2: Construct a circle to "cut" the segment.**
//     - Use Postulate 3 with center A and radius point E.
//     - This creates `fact("circle", [A, E])`.
//
// 4.  **STEP 3: Identify the intersection point.**
//     - The segment AB and the circle (A,E) intersect.
//     - This is another hidden assumption: a line from the center of a circle outwards must cross the circle's circumference at exactly one point.
//     - Let's call the intersection point F. So, F is a point on the segment AB.
//     - Because F is on the circle, we have `fact("on_circle", [F, A, E])`.
//
// 5.  **STEP 4: Prove the cut segment is equal.**
//     - From `on_circle(F, A, E)`, we can use the `radiiEqual` rule.
//     - This gives us `fact("equal", [fact("segment", [A, F]), fact("segment", [A, E])])`.
//     - From Step 1, we know `fact("equal", [fact("segment", [A, E]), fact("segment", [C, D])])`.
//     - Using Common Notion 1 (Transitivity), we can conclude:
//       `fact("equal", [fact("segment", [A, F]), fact("segment", [C, D])])`.
//
// 6.  **CONCLUSION**: We have found a point F on the segment AB, such that the segment AF is equal to the given smaller segment CD.
//
//
//