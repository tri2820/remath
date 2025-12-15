# Note

If you want RHS "or", for example to express it could be this or that, use template "or".

Example:

```
// PASCH'S AXIOM
// If Line L intersects segment AB (Side 1),
// Then L intersects segment AC (Side 2) OR L intersects segment BC (Side 3).
export const paschAxiom = rule(
    // LHS: Triangle ABC exists, and Line L crosses AB
    template("triangle", [variable("A"), variable("B"), variable("C")]),
    template("intersects", [variable("L"), template("segment", [variable("A"), variable("B")])]),
    template("or", [
        template("intersects", [variable("L"), template("segment", [variable("A"), variable("C")])]),
        template("intersects", [variable("L"), template("segment", [variable("B"), variable("C")])])
    ])
);
```
