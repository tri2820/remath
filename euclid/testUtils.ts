import type { World } from "../world";
import { type Rule, type Term, fact, atom } from "../rewriting";

type Substitution = {
    pattern: Term;
    with: Term;
};

export const mustFind = (world: World, pattern: Term, label: string): Term => {
    const found = world.find(pattern);
    if (!found) {
        throw new Error(`Missing fact: ${label}`);
    }
    return found;
};

export const apply = (
    world: World,
    rule: Rule,
    substitutions: Substitution[]
): Term[] => {
    const res = world.substitute(rule, substitutions);
    if (res.error) {
        throw new Error(`Substitution failed (${res.error.code}): ${JSON.stringify(res.error)}`);
    }
    world.addAll(res.data);
    return res.data;
};

export const drawSegment = (
    world: World,
    a: string,
    b: string,
    postulate1: Rule
) => {
    const pA = mustFind(world, fact("point", [atom(a)]), `point(${a})`);
    const pB = mustFind(world, fact("point", [atom(b)]), `point(${b})`);
    apply(world, postulate1, [
        { pattern: postulate1.terms[0]!, with: pA },
        { pattern: (postulate1.terms[1] as Rule).terms[0]!, with: pB },
    ]);
};

export const applyTransitivity = (
    world: World,
    commonNotion1: Rule,
    eqAB: Term,
    eqBC: Term
) => {
    apply(world, commonNotion1, [
        { pattern: commonNotion1.terms[0]!, with: eqAB },
        { pattern: (commonNotion1.terms[1] as Rule).terms[0]!, with: eqBC },
    ]);
};

export const applyEqualitySymmetry = (
    world: World,
    equalitySymmetric: Rule,
    eqAB: Term
) => {
    apply(world, equalitySymmetric, [
        { pattern: equalitySymmetric.terms[0]!, with: eqAB },
    ]);
};

export const atomSymbol = (term: Term): string | undefined => {
    if (term.type !== "atom") return undefined;
    return term.symbol;
};

export const pointsOnCircle = (world: World, center: string, radius: string): string[] => {
    const out = new Set<string>();
    for (const f of world.facts) {
        if (f.type !== "fact" || f.op.symbol !== "on_circle" || f.terms.length !== 3) continue;
        const p = atomSymbol(f.terms[0]!);
        const o = atomSymbol(f.terms[1]!);
        const a = atomSymbol(f.terms[2]!);
        if (p && o === center && a === radius) {
            out.add(p);
        }
    }
    return [...out];
};

export const collinearThirds = (world: World, a: string, b: string): string[] => {
    const out = new Set<string>();
    for (const f of world.facts) {
        if (f.type !== "fact" || f.op.symbol !== "collinear" || f.terms.length !== 3) continue;
        const t0 = atomSymbol(f.terms[0]!);
        const t1 = atomSymbol(f.terms[1]!);
        const t2 = atomSymbol(f.terms[2]!);
        if (t0 === a && t1 === b && t2) {
            out.add(t2);
        }
    }
    return [...out];
};

export const findSharedPointOnCircles = (
    world: World,
    center0: string,
    radius0: string,
    center1: string,
    radius1: string,
    excluded: string[] = []
): string => {
    const on0 = new Set(pointsOnCircle(world, center0, radius0));
    const on1 = new Set(pointsOnCircle(world, center1, radius1));
    const banned = new Set(excluded);
    const candidates = [...on0].filter(symbol => on1.has(symbol) && !banned.has(symbol));

    if (candidates.length !== 1) {
        throw new Error(
            `Expected 1 shared point on circles (${center0},${radius0}) and (${center1},${radius1}), got ${candidates.length}`
        );
    }

    return candidates[0]!;
};

const segmentEndpoints = (term: Term): [string, string] | undefined => {
    if (term.type !== "fact" || term.op.symbol !== "segment" || term.terms.length !== 2) return undefined;
    const p0 = atomSymbol(term.terms[0]!);
    const p1 = atomSymbol(term.terms[1]!);
    if (!p0 || !p1) return undefined;
    return [p0, p1];
};

export const findProp2Result = (
    world: World,
    givenPoint: string,
    segmentStart: string,
    segmentEnd: string,
    options: { excludeEndpoints?: string[] } = {}
): { endpoint: string; equality: Term } => {
    const { excludeEndpoints = [] } = options;
    const excluded = new Set(excludeEndpoints);
    const matches: { endpoint: string; equality: Term }[] = [];

    const inspect = (lhs: Term, rhs: Term, equality: Term): void => {
        const lSeg = segmentEndpoints(lhs);
        const rSeg = segmentEndpoints(rhs);
        if (!lSeg || !rSeg) return;
        if (lSeg[0] !== segmentStart || lSeg[1] !== segmentEnd) return;
        if (rSeg[0] !== givenPoint) return;
        if (excluded.has(rSeg[1])) return;
        matches.push({ endpoint: rSeg[1], equality });
    };

    for (const f of world.facts) {
        if (f.type !== "fact" || f.op.symbol !== "equal" || f.terms.length !== 2) continue;
        const lhs = f.terms[0]!;
        const rhs = f.terms[1]!;
        inspect(lhs, rhs, f);
        inspect(rhs, lhs, f);
    }

    if (matches.length !== 1) {
        throw new Error(`Expected exactly one Prop 2 equality witness, got ${matches.length}`);
    }
    return matches[0]!;
};

export const findProp3Result = (
    world: World,
    greaterStart: string,
    lessStart: string,
    lessEnd: string,
    options: { onRayTo?: string } = {}
): { endpoint: string; equality: Term } => {
    const { onRayTo } = options;
    const matches: { endpoint: string; equality: Term }[] = [];

    const inspect = (lhs: Term, rhs: Term, equality: Term): void => {
        const lSeg = segmentEndpoints(lhs);
        const rSeg = segmentEndpoints(rhs);
        if (!lSeg || !rSeg) return;
        if (lSeg[0] !== lessStart || lSeg[1] !== lessEnd) return;
        if (rSeg[0] !== greaterStart) return;
        if (onRayTo) {
            const forward = fact("collinear", [atom(greaterStart), atom(onRayTo), atom(rSeg[1])]);
            const reverse = fact("collinear", [atom(rSeg[1]), atom(onRayTo), atom(greaterStart)]);
            if (!world.has(forward) && !world.has(reverse)) return;
        }
        matches.push({ endpoint: rSeg[1], equality });
    };

    for (const f of world.facts) {
        if (f.type !== "fact" || f.op.symbol !== "equal" || f.terms.length !== 2) continue;
        const lhs = f.terms[0]!;
        const rhs = f.terms[1]!;
        inspect(lhs, rhs, f);
        inspect(rhs, lhs, f);
    }

    if (matches.length !== 1) {
        throw new Error(`Expected exactly one Prop 3 equality witness, got ${matches.length}`);
    }
    return matches[0]!;
};
