# Euclid Proposition 3: Rule-Accurate Strategy

Goal: given a greater segment `AB` and a lesser segment `CD`, construct a point `F` on line `AB` such that:

`equal(segment(C, D), segment(A, F))`

## Part 1: Setup

1. Given points `A, B, C, D`.
2. Draw `segment(A, B)` and `segment(C, D)` using `postulate1`.

## Part 2: Build an Equal Segment from A (Prop 2 as Subproof)

Use Proposition 2 logic with:
- given point = `A`
- given segment = `CD`
- helper anchor = `C`

This yields a new point `E` such that:

`equal(segment(C, D), segment(A, E))`

Mechanically this uses:
1. Equilateral construction on `AC`.
2. `lineCircleIntersectionAtEnd` to transfer `CD` along one arm.
3. `lineCircleIntersectionAtStart` to transfer onto the arm from `A`.
4. Equality chaining (`radiiEqual`, `segmentSymmetry`, `equalitySymmetric`, `commonNotion1`, `commonNotion3`).

## Part 3: Cut Off on AB

1. Build circle with center `A` and radius `AE`:
   - apply `postulate3` on `segment(A, E)` -> `circle(A, E)`.
2. Intersect extension of `AB` with `circle(A, E)`:
   - apply `lineCircleIntersectionAtStart` with `segment(A, B)` and `circle(A, E)`.
   - get a new point `F` such that:
     - `collinear(A, B, F)`
     - `on_circle(F, A, E)`
3. Draw `segment(A, F)` (needed for `radiiEqual` precondition).

## Part 4: Prove AF = CD

1. From `on_circle(F, A, E)` and `segment(A, F)`, apply `radiiEqual`:
   - `equal(segment(A, E), segment(A, F))`
2. From Part 2:
   - `equal(segment(C, D), segment(A, E))`
3. Apply `commonNotion1` (transitivity):
   - `equal(segment(C, D), segment(A, F))`

Conclusion: a segment equal to the lesser (`CD`) has been cut off from the greater line through `AB`, starting at `A`.
