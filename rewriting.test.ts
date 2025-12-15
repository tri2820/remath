import { test, expect, describe } from "bun:test";
import type {
    Op,
    Atom,
    Variable,
    Introduction,
    Template,
    Rule,
    BoundedRule,
    LeftTemplate,
    RightTemplate,
    BoundedTemplate
} from './rewriting';
import {
    is_bounded,
    bind_introductions,
    bind_vars,
    match,
    validate_rule
} from './rewriting';

describe('rewriting system', () => {
    // Helper functions to create test data
    const op = (symbol: string): Op => ({ type: "op", symbol });
    const atom = (symbol: string): Atom => ({ type: "atom", symbol });
    const variable = (symbol: string): Variable => ({ type: "var", symbol });
    const introduction = (symbol: string, hint: string): Introduction => ({
        type: "introduction",
        symbol,
        hint
    });

    const template = <T = unknown>(opSymbol: string, terms: T[]): Template<T> => ({
        type: 'template',
        op: op(opSymbol),
        terms
    });

    const rule = (lhs: LeftTemplate | Rule, rhs: RightTemplate | Rule): Rule => ({
        type: 'rule',
        lhs,
        rhs
    });

    const boundedTemplate = (opSymbol: string, terms: Atom[]): BoundedTemplate => ({
        type: 'template',
        op: op(opSymbol),
        terms
    });

    const boundedRule = (lhs: BoundedTemplate | BoundedRule, rhs: BoundedTemplate | BoundedRule): BoundedRule => ({
        type: 'bounded_rule',
        lhs,
        rhs
    });

    describe('is_bounded', () => {
        test('returns success for fully bounded rule', () => {
            const lhs = boundedTemplate('point', [atom('A')]);
            const rhs = boundedTemplate('point', [atom('B')]);
            const testRule = rule(lhs, rhs);

            const result = is_bounded(testRule);

            expect(result.error).toBeUndefined();
            expect(result.data.bounded).toEqual(boundedRule(lhs, rhs));
        });

        test('returns error for rule with variables in LHS', () => {
            const lhs = template('point', [variable('x')]);
            const rhs = boundedTemplate('point', [atom('A')]);
            const testRule = rule(lhs, rhs);

            const result = is_bounded(testRule);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('LHS_NOT_BOUNDED');
        });

        test('returns error for rule with variables in RHS', () => {
            const lhs = boundedTemplate('point', [atom('A')]);
            const rhs = template('point', [variable('x')]);
            const testRule = rule(lhs, rhs);

            const result = is_bounded(testRule);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('RHS_NOT_BOUNDED');
        });

        test('returns error for rule with introductions in RHS', () => {
            const lhs = boundedTemplate('point', [atom('A')]);
            const rhs = template('point', [introduction('z', 'O')]);
            const testRule = rule(lhs, rhs);

            const result = is_bounded(testRule);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('RHS_NOT_BOUNDED');
        });

        test('handles nested rules correctly', () => {
            const innerLhs = template('point', [atom('A')]);
            const innerRhs = template('point', [atom('B')]);
            const innerRule = rule(innerLhs, innerRhs);

            const outerLhs = boundedTemplate('line', [atom('C')]);
            const outerRhs = boundedTemplate('line', [atom('D')]);
            const testRule = rule(outerLhs, outerRhs);

            const result = is_bounded(testRule);

            expect(result.error).toBeUndefined();
        });
    });

    describe('bind_introductions', () => {
        test('binds single introduction', () => {
            const lhs = template('point', [atom('A')]);
            const rhs = template('line', [atom('A'), introduction('z', 'O')]);
            const testRule = rule(lhs, rhs);

            const result = bind_introductions(testRule, (intro) => atom(`${intro.hint}1`));

            expect(result.error).toBeUndefined();
            expect(result.data.sub).toEqual({ z: 'O1' });

            if (result.data.rule.rhs.type === 'template') {
                expect(result.data.rule.rhs.terms[1]).toEqual(atom('O1'));
            }
        });

        test('reuses same introduction symbol', () => {
            const lhs = template('point', [atom('A')]);
            const rhs = template('triangle', [
                atom('A'),
                introduction('z', 'O'),
                introduction('z', 'O')
            ]);
            const testRule = rule(lhs, rhs);

            const result = bind_introductions(testRule, (intro) => atom(`${intro.hint}1`));

            expect(result.error).toBeUndefined();
            expect(result.data.sub).toEqual({ z: 'O1' });

            if (result.data.rule.rhs.type === 'template') {
                expect(result.data.rule.rhs.terms[1]).toEqual(atom('O1'));
                expect(result.data.rule.rhs.terms[2]).toEqual(atom('O1'));
            }
        });

        test('binds multiple different introductions', () => {
            const lhs = template('point', [atom('A')]);
            const rhs = template('line', [
                introduction('z', 'O'),
                introduction('w', 'P')
            ]);
            const testRule = rule(lhs, rhs);

            let counter = 1;
            const result = bind_introductions(testRule, (intro) => atom(`${intro.hint}${counter++}`));

            expect(result.error).toBeUndefined();
            expect(result.data.sub).toEqual({ z: 'O1', w: 'P2' });
        });

        test('handles nested rules with introductions', () => {
            const innerLhs = template('point', [atom('A')]);
            const innerRhs = template('point', [introduction('z', 'O')]);
            const innerRule = rule(innerLhs, innerRhs);

            const outerLhs = template('line', [atom('B')]);
            const outerRhs = template('line', [introduction('w', 'P')]);
            const testRule = rule(outerLhs, innerRule);

            const result = bind_introductions(testRule, (intro) => atom(`${intro.hint}1`));

            expect(result.error).toBeUndefined();
        });
    });

    describe('bind_vars', () => {
        test('binds variables in LHS and RHS', () => {
            const lhs = template('point', [variable('x')]);
            const rhs = template('point', [variable('x')]);
            const testRule = rule(lhs, rhs);
            const sub = { x: 'A' };

            const result = bind_vars(testRule, sub);

            expect(result.error).toBeUndefined();

            if (result.data.rule.lhs.type === 'template') {
                expect(result.data.rule.lhs.terms[0]).toEqual(atom('A'));
            }
            if (result.data.rule.rhs.type === 'template') {
                expect(result.data.rule.rhs.terms[0]).toEqual(atom('A'));
            }
        });

        test('keeps unbound variables as is', () => {
            const lhs = template('point', [variable('x')]);
            const rhs = template('point', [variable('y')]);
            const testRule = rule(lhs, rhs);
            const sub = { x: 'A' };

            const result = bind_vars(testRule, sub);

            expect(result.error).toBeUndefined();

            if (result.data.rule.lhs.type === 'template') {
                expect(result.data.rule.lhs.terms[0]).toEqual(atom('A'));
            }
            if (result.data.rule.rhs.type === 'template') {
                expect(result.data.rule.rhs.terms[0]).toEqual(variable('y'));
            }
        });

        test('keeps introductions unchanged', () => {
            const lhs = template('point', [variable('x')]);
            const rhs = template('line', [variable('x'), introduction('z', 'O')]);
            const testRule = rule(lhs, rhs);
            const sub = { x: 'A' };

            const result = bind_vars(testRule, sub);

            expect(result.error).toBeUndefined();

            if (result.data.rule.rhs.type === 'template') {
                expect(result.data.rule.rhs.terms[0]).toEqual(atom('A'));
                expect(result.data.rule.rhs.terms[1]).toEqual(introduction('z', 'O'));
            }
        });

        test('detects variable conflicts', () => {
            const lhs = template('point', [variable('x')]);
            const rhs = template('point', [variable('x')]);
            const testRule = rule(lhs, rhs);
            const sub = { x: 'A' };

            const result = bind_vars(testRule, sub);

            expect(result.error).toBeUndefined();
            // Same variable should map to same atom
            if (result.data.rule.lhs.type === 'template' && result.data.rule.rhs.type === 'template') {
                const lhsTerm = result.data.rule.lhs.terms[0] as Atom | Variable;
                const rhsTerm = result.data.rule.rhs.terms[0] as Atom | Variable;
                expect(lhsTerm).toEqual(rhsTerm);
            }
        });
    });

    describe('match', () => {
        test('matches simple rule with bounded rule', () => {
            const ruleLhs = template('point', [variable('x')]);
            const ruleRhs = template('point', [atom('B')]);
            const testRule = rule(ruleLhs, ruleRhs);

            const boundedLhs = boundedTemplate('point', [atom('A')]);
            const boundedRhs = boundedTemplate('point', [atom('B')]);
            const testBounded = boundedRule(boundedLhs, boundedRhs);

            const result = match(testRule, testBounded);

            expect(result.error).toBeUndefined();
            expect(result.data.subMap).toEqual({ x: 'A' });
        });

        test('detects operator mismatch', () => {
            const ruleLhs = template('point', [variable('x')]);
            const ruleRhs = template('point', [atom('B')]);
            const testRule = rule(ruleLhs, ruleRhs);

            const boundedLhs = boundedTemplate('line', [atom('A')]);  // Different operator
            const boundedRhs = boundedTemplate('point', [atom('B')]);
            const testBounded = boundedRule(boundedLhs, boundedRhs);

            const result = match(testRule, testBounded);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('LHS_OP_MISMATCH');
        });

        test('detects substitution conflict', () => {
            const ruleLhs = template('line', [variable('x'), variable('x')]);
            const ruleRhs = template('point', [atom('C')]);
            const testRule = rule(ruleLhs, ruleRhs);

            const boundedLhs = boundedTemplate('line', [atom('A'), atom('B')]);  // x maps to both A and B
            const boundedRhs = boundedTemplate('point', [atom('C')]);
            const testBounded = boundedRule(boundedLhs, boundedRhs);

            const result = match(testRule, testBounded);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('LHS_SUBSTITUTION_CONFLICT');
        });

        test('merges substitutions from both sides', () => {
            const ruleLhs = template('point', [variable('x')]);
            const ruleRhs = template('line', [variable('y')]);
            const testRule = rule(ruleLhs, ruleRhs);

            const boundedLhs = boundedTemplate('point', [atom('A')]);
            const boundedRhs = boundedTemplate('line', [atom('B')]);
            const testBounded = boundedRule(boundedLhs, boundedRhs);

            const result = match(testRule, testBounded);

            expect(result.error).toBeUndefined();
            expect(result.data.subMap).toEqual({ x: 'A', y: 'B' });
        });

        test('detects cross-side substitution conflict', () => {
            const ruleLhs = template('point', [variable('x')]);
            const ruleRhs = template('point', [variable('x')]);
            const testRule = rule(ruleLhs, ruleRhs);

            const boundedLhs = boundedTemplate('point', [atom('A')]);
            const boundedRhs = boundedTemplate('point', [atom('B')]);  // x maps to different atoms
            const testBounded = boundedRule(boundedLhs, boundedRhs);

            const result = match(testRule, testBounded);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('SUBSTITUTION_CONFLICT');
        });
    });

    describe('validate_rule', () => {
        test('validates rule with proper variables', () => {
            const lhs = template('point', [variable('x'), variable('y')]);
            const rhs = template('line', [variable('x'), variable('y')]);
            const testRule = rule(lhs, rhs);

            const result = validate_rule(testRule);

            expect(result.error).toBeUndefined();
            expect(result.data.vars).toEqual(new Set(['x', 'y']));
        });

        test('detects new variable in RHS', () => {
            const lhs = template('point', [variable('x')]);
            const rhs = template('line', [variable('x'), variable('y')]);  // y not in LHS
            const testRule = rule(lhs, rhs);

            const result = validate_rule(testRule);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('NEW_VARIABLE_IN_RHS');
        });

        test('allows no variables', () => {
            const lhs = template('point', [atom('A')]);
            const rhs = template('point', [atom('B')]);
            const testRule = rule(lhs, rhs);

            const result = validate_rule(testRule);

            expect(result.error).toBeUndefined();
            expect(result.data.vars).toEqual(new Set());
        });

        test('handles nested rules', () => {
            const innerLhs = template('point', [variable('x')]);
            const innerRhs = template('point', [variable('y')]);
            const innerRule = rule(innerLhs, innerRhs);

            const outerLhs = template('line', [variable('z')]);
            const outerRhs = innerRule;
            const testRule = rule(outerLhs, outerRhs);

            const result = validate_rule(testRule);

            expect(result.data).toBeUndefined();
            expect(result.error?.code).toBe('RHS_VALIDATION_ERROR');
        });

        test('collects all variables from both sides', () => {
            const lhs = template('triangle', [variable('x'), variable('y'), variable('z')]);
            const rhs = template('triangle', [variable('x'), variable('y')]);
            const testRule = rule(lhs, rhs);

            const result = validate_rule(testRule);

            expect(result.error).toBeUndefined();
            expect(result.data.vars).toEqual(new Set(['x', 'y', 'z']));
        });
    });
});