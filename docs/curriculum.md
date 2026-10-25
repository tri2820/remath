# Curriculum

The point of the project is to show a kid where Euclid's reasoning goes silent,
so the gaps in `euclid/index.ts` are the syllabus, not the bugs. This file records
what is kept on purpose and the habits the interface should teach.

## Hidden assumptions

`euclid/index.ts` separates `text` axioms from `hidden_assumptions`. The hidden
ones are Euclid's, not ours:

| Assumption | What Euclid never states |
| --- | --- |
| circle intersection | Two circles meet. False for concentric circles, and I.1 depends on it. |
| radii equal | A point on a circle is at radius distance from the center, provided the radius segment exists. |
| collinear implies straight angle | A straight angle equals two right angles. This is I.13, assumed instead of proved. |
| linear segment addition and subtraction | Lengths add along a line, and only when collinearity is known. |
| equality symmetry, segment symmetry | Unstated, benign, but still unstated. |

Do not quietly guard these away. A proposition that leans on one should be seen
leaning on it, which is why they live in their own group rather than being folded
into the postulates.

## The non-degeneracy gap

Derived from the axioms as they stand, using `euclid/degeneracy.test.ts`:

```
segment(A,A)                     postulate 1 with a = b = A
circle(A,A)                      postulate 3, zero radius
circleIntersection(circle(A,A), circle(A,B))    introduces a witness C
|AA| = |AC|                      radiiEqual, once segment(A,C) is drawn
```

In Euclidean geometry the only point on a zero-radius circle is its center, so the
honest reading is that `C` is `A`. The system does not conclude that, and it
cannot conclude the opposite either, having no negation. So the witness is a
point at distance zero whose identity stays undecided.

That is the lesson: I.1 assumes two circles meet with no condition at all, and two
concentric circles refute it. The missing premiss is geometric, `distinct(o1,
o2)`, different centers, and that guard is documented in the same test rather than
applied. Freshness of a name would be the wrong guard, because it would assume
what the lesson denies.

## Names are not identity

Applying a rule twice hands out fresh names: `A`, `B`, `C`, `D` for what may be
the same conceptual point. That is correct and it is the second lesson. `introduce`
allocates an unused symbol, which is a display convention, never evidence that the
point is new.

So:

- the engine must never infer distinctness from a fresh name;
- identity is stated, with `coincides` and then `equal`;
- a proof that needs `C` and `D` to be the same point has to prove it, and a proof
  that needs them different cannot say so in this language yet.

## What the interface should say

Copy that follows from all of the above:

- on a new witness: "a new name for a point. This does not mean it differs from A,
  so prove it if the proof needs that."
- on a step that uses a hidden assumption: "Euclid assumed this. It is not among
  the postulates."
- on the degenerate construction: "the only point on a circle of radius zero is
  its own center, so this point is A, which the system cannot say."

Which axiom carried a step is a property of the script, not of the world, since
the world keeps no history. See [metatheory](metatheory.md).
