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
- Once locked, cannot be unlock (for simplicity)

- The word as proof:
- The world started with some rules with vars, and some structured, bounded facts.
- point A, point B, some point(x) -> ...
- We might notice that A and B here are just placeholder names, and that the transition itself can be run regardless if the world started out with point C and point D instead of point A and B, as long as the locked rules are the same.
- We can definitely improve the claim "locked rules are the same" to being "used locked rules are the same". But keep it so for simplicity. After all, user could have remove the initial rules themselves.
- In a way, A and B are only there to provide distinctions (to single out a particular rule application thatt is meaninful to be part of the proof we care about, from the large web of applications), and themselves are a sort of meta-variables.

# Names are not identity

2026-10-25: applying a rule twice hands out fresh names (A, B, C, D) for the witnesses.
That is right, not a bug. The kid has to recognise that these are the same conceptual
point spelled differently. Never trust a name for distinction, and never let the engine
infer distinctness from a fresh name: `introduce` picks an unused symbol, which is a
naming convention, not a claim that the point is new.

Identity is stated or it is not stated: `coincides`, which commonNotion4 turns into
`equal`. No rule may manufacture it from spelling.

Consequence for checking: `has` and `equal_term` compare spellings, so nothing may depend
on which name a step happened to allocate. A step should be checked up to renaming of its
introductions, not against a fixed spelling. Our own test carries a HACK line that trusts
`introduce` to return `B`, and that is the smell.

# Kept on purpose: the non-degeneracy gap

2026-10-25: `segment(A,A)` is drawable, so `circle(A,A)` has radius zero, and circle
intersection then gives a witness `C` with `|AA| = |AC|`. Whether `C` is `A` is left
undecided, and it must be: in Euclidean geometry the only point on a zero-radius circle
is its center, so the honest reading is "C is A", and the system has no way to say it.

Do not guard this away. Teaching where Euclid's postulates go silent is the point of the
project: I.1 assumes two circles meet with no condition at all, and two concentric
circles refute that. A proof leaning on the gap should be seen leaning on it.

The missing premiss is geometric, not syntactic: `distinct(o1, o2)`, different centers.
`euclid/degeneracy.test.ts` pins both sides, the derivation from the unguarded axioms and
the guarded intersection that blocks the concentric case while leaving the healthy case
(which Proposition 1 uses) intact. If a strict mode is ever wanted, it is a separate
axiom set, not a change here.

# No history: fact is fact

2026-10-25: the world is a set of facts, not a proof object. It does not remember which
fact came from which rule, and it should not. The proof is the ordered script of
`substitute` calls, and that script belongs to whoever is driving the world (the UI
session, a test). Replaying the script from the same axioms reproduces the same world,
which is how a proof gets checked: rerun the recipe, look for the goal.

What this means for the lock (done 2026-10-25): it is a seal, not a claim about origin.
After `lock()`, `add` throws and `substitute` is the only way facts enter, writing them
in itself. That deleted `derived_facts` entirely, and with it the whole "was it ever
derivable" question. `facts_at_lock` stays, because the pre-lock set is the LHS of the
exported theorem: a boundary, not a log.

What this means for `asRule`: it keeps using the pre-lock snapshot, and it still
over-approximates by exporting every pre-lock fact rather than the ones the proof used.
Without history that is the best it can do, and it is the safe direction (more
hypotheses, never fewer).

What this means for the "why" panel: the engine can answer "is this fact here", never
"why". The lesson layer holds the script, so the step list and the hidden-assumption
flags live there, next to the UI, and the engine stays a set.
