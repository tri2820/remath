For RHS "or", use constructive determinism

Don't write: intersect(Line, Circle) => point(P1) OR point(P2) // We don't provide template "or"
Write:
// Rule: Intersecting a Line and Circle creates a Set S containing points P1 and P2
export const lineCircleIntersect = rule(
// LHS
template("intersect", [variable("L"), variable("C")]),

    // RHS: We introduce the SET (S) and the POINTS (P1, P2)
    template("intersection_set", [variable("L"), variable("C"), introduction("S", "Set")]),
    template("in_set", [introduction("P1", "P"), introduction("S", "Set")]),
    template("in_set", [introduction("P2", "P"), introduction("S", "Set")])

);
