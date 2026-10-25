# Metatheory

What the engine guarantees, what it deliberately does not, and why it is shaped
this way. The short version: soundness rests on exactly two invariants, both are
enforced in code, and everything else is a design decision rather than an accident.

## The model

A world is a **set of ground facts**. A rule is a Horn clause with existential
consequents:

```
rule(LHS, RHS...)             flat: one condition, many conclusions
rule(LHS, rule(LHS2, C))      curried: a chain of conditions, one conclusion
```

`substitute(rule, substitutions)` is one resolution step:

1. every `with` must already be a fact in the world;
2. variables bind by one-way matching (no unification, no occurs check, so no
   need for one);
3. `introduction` nodes become fresh atoms, consistently within the application;
4. the instantiated rule is written into the world, plus any consequent whose
   ground LHS is already present.

The world stores no record of which application produced which fact. See
"No history" below.

## The two invariants

1. **Every conclusion variable is bound by some LHS along its currying chain.**
   `validate_rule` walks the chain with a scope set and `World.insert` calls it
   for every rule that enters. Without it a rule can bind a conclusion variable
   from nowhere and inject open formulas into a set of ground facts. Note that
   checking only the outermost LHS is wrong: it rejects every curried axiom in
   `euclid/index.ts`, which is why the original check was never wired in.
2. **Skolem witnesses are fresh and pairwise distinct per application.** Fresh,
   because `introduce` allocates a symbol that is not in the world. Pairwise
   distinct, because each application owns its own allocator: two introductions
   in one rule must not collapse into one atom.

Given those two, a derived set is a subset of the least fixed point of the
one-step operator, and every fact in a sealed world is either an initial given or
the conclusion of an instance whose premises were already present.

## What is deliberately not here

- **No history.** No provenance, no proof object, no per-fact justification. The
  proof is the ordered script of `substitute` calls, which belongs to the caller
  (a UI session, a test). `lock()` is therefore a *seal*, not a claim about
  origin: after it, `add` throws and `substitute` is the only mutator. The engine
  can answer "is this fact here", never "why". A lesson UI that wants "which
  axiom made this possible" keeps the script beside the world.
- **No negation.** No `absurd`, no distinctness inference. So the system cannot
  state its own consistency, and identity has to be *stated* (`coincides`, turned
  into `equal` by `commonNotion4`), never read off the spelling of a name. See
  [curriculum](curriculum.md).
- **No types.** `equal` is one relation over every term, so axioms can in
  principle be chained across sorts. Harmless while rules stay disciplined.
- **No generic congruence.** Equality does not license rewriting inside another
  fact. Congruence is per-predicate and has to be written as a curried axiom,
  which is what blocks a cheap Proposition 4.
- **No disjunction.** Consequents are a conjunction. A disjunctive fact can be written (`fact("or", [A, B])`, as `paschAxiom` was drafted for Pasch's axiom), but nothing consumes it: there is no case split, so it is a comment rather than a rule.
- **No spontaneous firing.** A rule fires only when `substitute` is called with
  it. A world never saturates itself, so "nothing happened" usually means "no one
  applied the rule".

## asRule and importRule

`asRule()` turns a sealed world's transition into a reusable rule: pre-lock facts
become conditions, post-lock facts conclusions, pre-lock atoms variables, new
atoms introductions. Without history it must over-approximate, exporting *all*
pre-lock facts rather than the ones the proof used. That is the safe direction:
more hypotheses, never fewer. `importRule` then discharges the leading conditions
that already exist in the target world.

The pre-lock atoms are placeholders in a stronger sense than they look. `A` and
`B` in a sealed world exist to single out *which* rule applications matter, out of
the large web of applications the same facts allow; the transition itself runs on
any pair of names, which is what generalisation exploits. That makes them closer
to meta-variables than to objects. The sharper claim would be "the same *used*
rules", and it needs history, which this engine rejects, so an exported theorem
always carries all of its givens and the caller discharges the ones it already has.

## Known gaps

- Witness names are allocation-ordered (`A`, `B`, `C`, ...). A script replayed
  from the start reproduces them, so a goal checks literally. Editing an earlier
  step shifts them, so a partial replay has to match up to renaming.
- A substitution may bind a variable through an occurrence in the RHS rather than
  in the condition. Sound, because a consequent still requires its ground LHS,
  but confusing when debugging.
- `has(undefined)` throws a `TypeError` instead of returning an error result.

## Formal verification

Not started; there is no Lean toolchain on the development machine. The shape it
would take: `Term`, `World` and `Rule` as inductive types, derivability as an
inductive relation, the two invariants as hypotheses of a soundness theorem, and
the degeneracy derivation in [curriculum](curriculum.md) as a worked example. The
encouraging part is that the invariants are the whole proof; the engine's core is
small enough to formalise without a library.

## Open questions

- **Automatic application.** Every step is an explicit `substitute`. Saturating a
  world, or offering tactics, would need a stopping condition to stay usable.
- **Rule usage tracking** ("use 1.1 here"). Belongs to the session script, not the
  world, since the world keeps no history. See the "why" note in
  [curriculum](curriculum.md).
- **Disjunction.** Pasch's axiom needs a case split, which the fact language does
  not have.
- **Reaching for a construction instead of rewriting it.** The complaint that made
  `asRule`/`importRule` worth building: redoing the equilateral triangle by hand in
  Proposition 2. A stronger form would export only the used rules, which needs
  history.
- **A strict mode.** The `distinct` guards from [curriculum](curriculum.md) as a
  separate axiom set, never a change to the existing one.

