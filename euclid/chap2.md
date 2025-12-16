# Euclid Proposition 2: Logical Proof Breakdown

This is the step-by-step application of the formal rules to prove the proposition: _"To place at a given point (A) a straight line equal to a given straight line (BC)."_

---

## Part 1: The Construction (Drawing the Figure)

### 1. Construct the Equilateral Triangle (DAB)

We first establish a rigid bridge between the starting point A and the reference point B using the logic from Proposition 1.

- **Rule Applied:** `postulate1`
  - **Action:** Connect Point A and Point B.
  - **Result:** `segment(A, B)`.
- **Rule Applied:** `postulate3`
  - **Action:** Create `circle(A, B)`.
- **Rule Applied:** `segmentSymmetry`
  - **Action:** Convert `segment(A, B)` to `segment(B, A)`.
- **Rule Applied:** `postulate3`
  - **Action:** Create `circle(B, A)`.
- **Rule Applied:** `circleIntersection`
  - **Action:** Intersect the two circles.
  - **Result:** A new point **D** is created.
- **Rule Applied:** `postulate1` (Twice)
  - **Action:** Connect D to A and D to B.
  - **Result:** We now have the "top" of the diagram, Triangle DAB.

### 2. Extend the Line DB

We need to project the length of the given segment BC onto the line extending from D through B.

- **Rule Applied:** `postulate3`
  - **Action:** Create a circle centered at B with radius BC (`circle(B, C)`).
- **Rule Applied:** `lineCircleIntersection`
  - **Action:** Extend `segment(D, B)` until it hits `circle(B, C)`.
  - **Result:**
    1.  A new point **G** is created.
    2.  A collinearity fact is produced: `collinear(D, B, G)`.
    3.  An on-circle fact is produced: `on_circle(G, B, C)`.
- **Manual Fix:** `postulate1`
  - **Action:** The intersection rule created point G, but didn't draw the line segment physically. We must manually connect B to G.
  - **Result:** `segment(B, G)`.

### 3. Extend the Line DA

We now project the total length from the previous step onto the other side of the triangle.

- **Manual Fix:** `postulate1`
  - **Action:** Connect D to G.
  - **Reason:** We need `segment(D, G)` to exist to use it as a radius.
- **Rule Applied:** `postulate3`
  - **Action:** Create a large circle centered at D with radius DG (`circle(D, G)`).
- **Rule Applied:** `lineCircleIntersection`
  - **Action:** Extend `segment(D, A)` until it hits `circle(D, G)`.
  - **Result:**
    1.  A new point **L** is created.
    2.  A collinearity fact is produced: `collinear(D, A, L)`.
    3.  An on-circle fact is produced: `on_circle(L, D, G)`.
- **Manual Fix:** `postulate1` (Twice)
  - **Action:** Connect A to L, and D to L.
  - **Result:** We now have `segment(A, L)` (the goal line) and `segment(D, L)` (the big radius).

---

## Part 2: The Proof (Logic & Algebra)

Now that the geometry exists, we use the logic rules to prove that $AL = BC$.

### 1. Establish Radii Equalities

- **Rule Applied:** `radiiEqual` on `circle(B, C)`
  - **Input:** `on_circle(G, B, C)`
  - **Result:** $BG = BC$.
- **Rule Applied:** `radiiEqual` on `circle(D, G)`
  - **Input:** `on_circle(L, D, G)`
  - **Result:** $DL = DG$.

### 2. Prepare for Subtraction (The Symmetry Step)

We need to calculate the remainder of the segments. The rule `linearSegmentSubtraction` works on the logic:

> _"The First Part = The Whole - The Last Part"_

However, our lines are defined as $D \to B \to G$ and $D \to A \to L$. If we apply subtraction directly, it calculates the top part ($DB$), not the bottom part ($BG$). We must flip the lines.

- **Rule Applied:** `collinearSymmetry`
  - **Input:** `collinear(D, B, G)`
  - **Result:** `collinear(G, B, D)`
  - **Meaning:** The line is now viewed as starting at G, going through B, ending at D.
- **Rule Applied:** `collinearSymmetry`
  - **Input:** `collinear(D, A, L)`
  - **Result:** `collinear(L, A, D)`

### 3. Execute Subtraction

- **Rule Applied:** `linearSegmentSubtraction`
  - **Input:** `collinear(G, B, D)`
  - **Logic:** $Start(G)Mid(B) = Start(G)End(D) - Mid(B)End(D)$
  - **Result:** $GB = GD - BD$.
- **Rule Applied:** `linearSegmentSubtraction`
  - **Input:** `collinear(L, A, D)`
  - **Logic:** $Start(L)Mid(A) = Start(L)End(D) - Mid(A)End(D)$
  - **Result:** $LA = LD - AD$.

### 4. Final Deduction

- **Rule Applied:** `commonNotion3` ("If equals be subtracted from equals, the remainders are equal")
  - **Premise 1:** $GD = LD$ (From Step 1, Radii of the big circle).
  - **Premise 2:** $BD = AD$ (Sides of the equilateral triangle DAB).
  - **Calculation:** $(GD - BD)$ must equal $(LD - AD)$.
  - **Conclusion:** Therefore, $GB = LA$.

Since we established in Step 1 that $GB$ (or $BG$) is equal to $BC$:
**The line segment $AL$ (or $LA$) is equal to $BC$.**
