Here’s a clear, structured list of **Euclid’s axioms/postulates** as commonly cited (from _Elements_ Book I). I’ll separate **Postulates** (constructive) and **Common Notions** (logical rules).

---

## 1️⃣ Euclid’s Postulates (Construction Rules)

1. **Straight line postulate**

   - A straight line can be drawn from any point to any other point.
   - _Interpretation:_ you can construct a line segment connecting any two points.

2. **Extension of a line**

   - A finite straight line can be extended continuously in a straight line.
   - _Interpretation:_ given a segment, you can pick a new point beyond the endpoints to extend it.

3. **Circle postulate**

   - Given any center and any radius, a circle can be drawn.
   - _Interpretation:_ you can construct all points at a fixed distance from a center.

4. **Right angle postulate**

   - All right angles are equal to one another.
   - _Interpretation:_ basic equality of angles; allows comparing angles.

5. **Parallel postulate (famous)**

   - If a straight line intersects two straight lines and the sum of interior angles on the same side is less than 180°, the two lines meet on that side if extended far enough.
   - _Interpretation:_ ensures uniqueness of parallel lines.

---

## 2️⃣ Euclid’s Common Notions (Logical Principles)

These are **general reasoning rules** that apply to numbers, lengths, magnitudes, and geometry:

1. Things equal to the same thing are equal to each other.
2. If equals are added to equals, the sums are equal.
3. If equals are subtracted from equals, the remainders are equal.
4. Things that coincide with one another are equal to one another.
5. The whole is greater than the part.

---

### 3️⃣ How they relate to rewriting rules

- **Postulates** → can be encoded as **construction rules** in your system, e.g.:

  - `line(A,B)` → can generate points A and B on a new line
  - `segment(A,B)` → can generate new midpoint or extended segment
  - `circle(C,R)` → can generate new points on the circle

- **Common notions** → can be encoded as **logical rewrite rules**, e.g.:

  - `equal(X,Y) ∧ equal(Y,Z)` → `equal(X,Z)`

---

### 4️⃣ TL;DR

Euclid’s axioms are **mostly constructive** (you can create points, lines, circles), plus **basic equality/ordering rules**. They are what you can encode directly as rewrite rules in your system.

---

If you want, I can **write them all as a minimal set of rewrite rules** in TypeScript for your engine, so you can see the “raw Euclid” in action.

Do you want me to do that?
