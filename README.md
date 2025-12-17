# remath

- [Intro blog](https://bulletplayer.substack.com/p/why-im-building-a-graphical-simple)

This project aims to build an easy-to-use, graphical proof assistant that even kids can understand. The core language is simple, defined in [this file](/rewriting.ts).

For a feel of how the underlying machinery works, see [Euclid axioms](/euclid/index.ts) and [Proof for Euclid's 1st proposition](/euclid/prop1.test.ts).

My hope is to help kids study a variety of math domains, while enforcing no complex theory beyond a basic logical framework—giving ideas shape.

To install dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```

---

## Key Concepts

These concepts are relevant for developers of this language. For users, they should be abstracted so they become transparent, letting users focus solely on proofs. Currently, the syntax is explicit to help with debugging.

- **Atom**
  An atom is a name used to differentiate between objects.
  Example: `atom(A)` and `atom(B)`.

- **Constructor**
  A constructor represents a type. Examples: `point`, `segment`, etc.

  Constructors can be used to construct facts from any number of arguments. Think of it as a container.

  For instance, to express that there are points A and B and a segment connecting them:

  ```
  point(atom(A))
  point(atom(B))
  segment(point(atom(A)), point(atom(B)))
  ```

- **Variable**
  A variable is a placeholder for anything. All appearances of the same variable must match the same thing.

  Example: `same(point(variable(x)), point(variable(x)))`

  - Matches: `same(point(atom(A)), point(atom(A)))`
  - Does not match: `same(point(atom(A)), point(atom(B)))`

- **Introduction**
  Signals the system to introduce new atoms—used to construct new objects.

  Example: "Given a point, you can always draw a new point and connect to it":

  ```
  rule(
    point(variable(a))
    point(introduction(b))
    segment(point(variable(a)), point(introduction(b)))
  )
  ```

  If you have `point(A)`, substituting `variable(a)` in this rule yields a new point and a segment:

  ```
  # 1. trivially bound fact

  point(atom(A)) ->
    point(introduction(B))
    segment(point(atom(A)), point(introduction(B)))

  # 2. new point
  point(introduction(B))

  # 3. new segment
  segment(point(atom(A)), point(introduction(B)))
  ```

  Like variables, all appearances of an introduction must match the same thing.

- **Rule**
  A rule is just a fact, but with constructor `rule`. Some notable thing about its syntax:

  1. It uses [currying](https://en.wikipedia.org/wiki/Currying) to express AND. For example, "given point A and B, we can construct segment A B":

  ```
  rule(
    point(variable(a))
    rule(
        point(variable(b))
        segment(point(variable(a)) point(variable(b)))
        )
    )
  ```

  2. It follows the convention `LHS RHS0 RHS1 ...` meaning: if the LHS is satisfied, all RHSs are returned. Example:

  ```
  rule(
    point(variable(a))
    point(introduction(b))
    segment(point(variable(a)), point(introduction(b)))
  )
  ```

  Substituting `point(A)` for `variable(a)` yields three new facts (1 trivial LHS + 2 RHSs).

- **World**

  - A world contains many facts.
  - Before `.locked()`, arbitrary facts can be added.
  - After `.locked()`, only facts derived from facts already existing in the world can be added.
  - Facts from one world are not directly portable to another—they must be generalized first (this can be done automatically).
    For example: In world 1, `eq(point(A), point(B))` may hold, but it doesn’t automatically hold in world 2.
