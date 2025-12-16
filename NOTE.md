# Note

If you want RHS "or", for example to express it could be this or that, use fact "or".

Example:

```
// PASCH'S AXIOM
// If Line L intersects segment AB (Side 1),
// Then L intersects segment AC (Side 2) OR L intersects segment BC (Side 3).
export const paschAxiom = rule(
    // LHS: Triangle ABC exists, and Line L crosses AB
    fact("triangle", [variable("A"), variable("B"), variable("C")]),
    fact("intersects", [variable("L"), fact("segment", [variable("A"), variable("B")])]),
    fact("or", [
        fact("intersects", [variable("L"), fact("segment", [variable("A"), variable("C")])]),
        fact("intersects", [variable("L"), fact("segment", [variable("B"), variable("C")])])
    ])
);
```

# What would be useful

- Automate apply some rules
- tracking substitutions (rule usage) (example: Use 1.1 etc)

#

- When doing prop 2, I feel myself lazy rewriting the equilateral triangle construction
- How do I store the transition from the world with only 2 facts (point A, point B) to that world with equilateral triangle fact as proof?
- In terms of programming classes, the World class sees me add facts to it
- It does not know if these facts are arbitrary (facts I created), or can built from within (from the facts it owns).
- I need to show it that.
- `.lock()` -> now add and addAll only accept facts spitted out by `.substitute`
- `.substitute()` -> Now it remembers all facts it has ever spitted out
