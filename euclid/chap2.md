# Euclid Proposition 2: Rule-Accurate Strategy

Goal: from given `point(A)`, `point(B)`, `point(C)`, construct a segment starting at `A` that is equal to `segment(B, C)`.

This plan is written for the current engine and rule set in `euclid/index.ts`.

## Naming Convention (Important)

Do not hard-code names like `D/G/L` in implementation.

Use symbolic placeholders:
1. `p1` = first introduced point (triangle apex on AB)
2. `p2` = second introduced point (extension from `p1 -> B`)
3. `p3` = third introduced point (extension from `p1 -> A`)

In a world that starts with atoms `A, B, C`, these usually become `D, E, F` respectively.

## Part 1: Construction

### 1. Setup Required Segments

1. Given `point(A)`, `point(B)`, `point(C)`.
2. Apply `postulate1` on `(A, B)` to get `segment(A, B)`.
3. Apply `postulate1` on `(B, C)` to get `segment(B, C)`.  
   This step is required before `postulate3` can create `circle(B, C)`.

### 2. Build Equilateral Triangle on AB

1. Apply `postulate3` on `segment(A, B)` -> `circle(A, B)`.
2. Apply `segmentSymmetry` on `segment(A, B)` -> `segment(B, A)`.
3. Apply `postulate3` on `segment(B, A)` -> `circle(B, A)`.
4. Apply `circleIntersection` on `circle(A, B)` and `circle(B, A)` -> introduce `p1`, plus:
   - `point(p1)`
   - `on_circle(p1, A, B)`
   - `on_circle(p1, B, A)`
5. Apply `postulate1` on `(p1, A)` and `(p1, B)` to get `segment(p1, A)` and `segment(p1, B)`.

### 3. Extend p1B Using Given Length BC

1. Apply `postulate3` on `segment(B, C)` -> `circle(B, C)`.
2. Apply `lineCircleIntersection` with `segment(p1, B)` and `circle(B, C)` -> introduce `p2`, plus:
   - `collinear(p1, B, p2)`
   - `on_circle(p2, B, C)`
3. Apply `postulate1` on `(B, p2)` so `radiiEqual` can be used on `on_circle(p2, B, C)`.
4. Apply `postulate1` on `(p1, p2)` to prepare the larger radius used next.

### 4. Extend p1A to Create Target Endpoint

1. Apply `postulate3` on `segment(p1, p2)` -> `circle(p1, p2)`.
2. Apply `lineCircleIntersection` with `segment(p1, A)` and `circle(p1, p2)` -> introduce `p3`, plus:
   - `collinear(p1, A, p3)`
   - `on_circle(p3, p1, p2)`
3. Apply `postulate1` on `(A, p3)` and `(p1, p3)`.
   Target segment is now `segment(A, p3)`.

## Part 2: Proof of Equality

### 1. Radius Equalities

1. From `on_circle(p2, B, C)` and `segment(B, p2)`, apply `radiiEqual`:
   - `equal(segment(B, C), segment(B, p2))`
2. From `on_circle(p3, p1, p2)` and `segment(p1, p3)`, apply `radiiEqual`:
   - `equal(segment(p1, p2), segment(p1, p3))`

### 2. Express Lower Parts as Differences

`linearSegmentSubtraction` expects `collinear(a, c, b)` and returns:
`equal(segment(a, c), diff(segment(a, b), segment(c, b)))`.

1. Apply `collinearSymmetry`:
   - `collinear(p1, B, p2)` -> `collinear(p2, B, p1)`
   - `collinear(p1, A, p3)` -> `collinear(p3, A, p1)`
2. Apply `linearSegmentSubtraction`:
   - `collinear(p2, B, p1)` -> `equal(segment(p2, B), diff(segment(p2, p1), segment(B, p1)))`
   - `collinear(p3, A, p1)` -> `equal(segment(p3, A), diff(segment(p3, p1), segment(A, p1)))`

### 3. Equal Whole Minus Equal Part

1. Obtain `equal(segment(B, p1), segment(A, p1))` from the equilateral-triangle construction facts:
   - derive `AB = Ap1` and `BA = Bp1` via `radiiEqual`
   - bridge orientations with `segmentSymmetry`
   - combine with `commonNotion1` and `equalitySymmetric`
2. From Step 1 above: `equal(segment(p1, p2), segment(p1, p3))`.
   Use `segmentSymmetry` as needed to align orientations to `segment(p2, p1)` and `segment(p3, p1)`.
3. Apply `commonNotion3` to conclude:
   - `equal(diff(segment(p2, p1), segment(B, p1)), diff(segment(p3, p1), segment(A, p1)))`

### 4. Replace Diffs by Segments and Reach the Goal

1. Use `commonNotion1` + `equalitySymmetric` to combine:
   - subtraction equalities from Part 2.2
   - diff equality from Part 2.3
   This yields `equal(segment(p2, B), segment(p3, A))`.
2. Reorient with `segmentSymmetry` to get `equal(segment(B, p2), segment(A, p3))`.
3. Combine with radius equality `equal(segment(B, C), segment(B, p2))` and transitivity (`commonNotion1`) to get:
   - `equal(segment(B, C), segment(A, p3))`

Therefore, the segment from the given point `A` to the constructed point `p3` is equal to the given segment `BC`.
