import { test, expect } from "bun:test";
import {
  fresh,
  deepEqual,
  unify,
  expandTerm,
  applyRule,
  step,
  run,
  printTerm,
  type Constant,
  type Variable,
  type Fresh,
  type Term,
  type Pattern,
  type Substitution,
  type ProgramState,
  type Rule,
  type FunctionTerm,
} from "./index";

// Helper function to create a program state
function createState(terms: Term[], rules: Rule[] = []): ProgramState {
  return {
    __fresh__: {},
    terms,
    rules,
  };
}

// Helper function to create a rule
function createRule(name: string, lhs: Pattern, rhs: Term): Rule {
  return { name, lhs, rhs };
}

// Helper to create function terms
function func(head: Constant, args: Term[]): FunctionTerm {
  return { head, args };
}

// ====================
// Tests for fresh()
// ====================

test("fresh generates sequential names", () => {
  const state = createState([]);
  expect(fresh(state, "!X")).toBe("X1");
  expect(fresh(state, "!X")).toBe("X2");
  expect(fresh(state, "!Y")).toBe("Y1");
  expect(fresh(state, "!Y")).toBe("Y2");
  expect(fresh(state, "!N")).toBe("N1");
});

test("fresh with !N prefix", () => {
  const state = createState([]);
  expect(fresh(state, "!N")).toBe("N1");
});

// ====================
// Tests for deepEqual()
// ====================

test("deepEqual with constants", () => {
  expect(deepEqual("a", "a")).toBe(true);
  expect(deepEqual("a", "b")).toBe(false);
});

test("deepEqual with variables", () => {
  expect(deepEqual("?x", "?x")).toBe(true);
  expect(deepEqual("?x", "?y")).toBe(false);
});

test("deepEqual with fresh generators", () => {
  expect(deepEqual("!C", "!C")).toBe(true);
  expect(deepEqual("!C", "!P")).toBe(false);
});

test("deepEqual with function terms", () => {
  const t1 = func("f", ["a", "b"]);
  const t2 = func("f", ["a", "b"]);
  const t3 = func("f", ["a", "c"]);
  const t4 = func("g", ["a", "b"]);

  expect(deepEqual(t1, t2)).toBe(true);
  expect(deepEqual(t1, t3)).toBe(false);
  expect(deepEqual(t1, t4)).toBe(false);
});

test("deepEqual with nested function terms", () => {
  const t1 = func("f", [func("g", ["a"]), "b"]);
  const t2 = func("f", [func("g", ["a"]), "b"]);
  const t3 = func("f", [func("g", ["c"]), "b"]);

  expect(deepEqual(t1, t2)).toBe(true);
  expect(deepEqual(t1, t3)).toBe(false);
});

test("deepEqual with mixed types", () => {
  expect(deepEqual("a", func("f", []))).toBe(false);
  expect(deepEqual(func("f", []), "a")).toBe(false);
});

// ====================
// Tests for unify()
// ====================

test("unify with constants", () => {
  const subst: Substitution = new Map();
  expect(unify("a", "a", subst)).toBe(true);
  expect(subst.size).toBe(0);

  expect(unify("a", "b", subst)).toBe(false);
  expect(subst.size).toBe(0);
});

test("unify variable with constant", () => {
  const subst: Substitution = new Map();
  expect(unify("?x", "a", subst)).toBe(true);
  expect(subst.get("?x")).toBe("a");
});

test("unify variable with function term", () => {
  const subst: Substitution = new Map();
  const term = func("f", ["a", "b"]);
  expect(unify("?x", term, subst)).toBe(true);
  expect(subst.get("?x")).toBe(term);
});

test("unify variable with already bound variable", () => {
  const subst: Substitution = new Map();
  subst.set("?x", "a");
  expect(unify("?x", "a", subst)).toBe(true);
  expect(unify("?x", "b", subst)).toBe(false);
});

test("unify function terms with same head", () => {
  const subst: Substitution = new Map();
  const pattern = func("f", ["a", "?x"]);
  const target = func("f", ["a", "b"]);

  expect(unify(pattern, target, subst)).toBe(true);
  expect(subst.get("?x")).toBe("b");
});

test("unify function terms with different heads", () => {
  const subst: Substitution = new Map();
  const pattern = func("f", ["?x"]);
  const target = func("g", ["a"]);

  expect(unify(pattern, target, subst)).toBe(false);
});

test("unify function terms with different arities", () => {
  const subst: Substitution = new Map();
  const pattern = func("f", ["a"]);
  const target = func("f", ["a", "b"]);

  expect(unify(pattern, target, subst)).toBe(false);
});

test("unify nested function terms", () => {
  const subst: Substitution = new Map();
  const pattern = func("f", [func("g", ["?x"])]);
  const target = func("f", [func("g", ["a"])]);

  expect(unify(pattern, target, subst)).toBe(true);
  expect(subst.get("?x")).toBe("a");
});

test("unify rejects fresh generators in patterns", () => {
  const subst: Substitution = new Map();
  expect(unify("!C", "C1", subst)).toBe(false);

  const pattern = func("f", ["!C"]);
  const target = func("f", ["C1"]);
  expect(unify(pattern, target, subst)).toBe(false);
});

// ====================
// Tests for expandTerm()
// ====================

test("expandTerm returns constants unchanged", () => {
  const state = createState([]);
  const subst: Substitution = new Map();
  expect(expandTerm("a", state, subst)).toBe("a");
});

test("expandTerm generates fresh names", () => {
  const state = createState([]);
  const subst: Substitution = new Map();
  expect(expandTerm("!C", state, subst)).toBe("C1");
  expect(expandTerm("!C", state, subst)).toBe("C2");
});

test("expandTerm substitutes variables", () => {
  const state = createState([]);
  const subst: Substitution = new Map([["?x", "a"]]);
  expect(expandTerm("?x", state, subst)).toBe("a");
});

test("expandTerm returns unbound variables unchanged", () => {
  const state = createState([]);
  const subst: Substitution = new Map();
  expect(expandTerm("?x", state, subst)).toBe("?x");
});

test("expandTerm expands function terms", () => {
  const state = createState([]);
  const subst: Substitution = new Map([["?x", "a"], ["?y", "b"]]);
  const term = func("f", ["!C", "?x", "?y"]);

  const result = expandTerm(term, state, subst);
  expect(result).toEqual(func("f", ["C1", "a", "b"]));
});

test("expandTerm with nested function terms", () => {
  const state = createState([]);
  const subst: Substitution = new Map([["?x", "a"]]);
  const term = func("f", [func("g", ["!P", "?x"])]);

  const result = expandTerm(term, state, subst);
  expect(result).toEqual(func("f", [func("g", ["P1", "a"])]));
});

// ====================
// Tests for applyRule()
// ====================

test("applyRule successfully applies matching rule", () => {
  const state = createState([func("request", ["circle", "O", "A"])]);
  const rule = createRule(
    "req_to_circle",
    func("request", ["circle", "?O", "?R"]),
    func("circle", ["!C", "?O", "?R"])
  );

  expect(applyRule(state, rule)).toBe(true);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("circle(C1, O, A)");
});

test("applyRule fails when no term matches", () => {
  const state = createState([func("request", ["square", "O"])]);
  const rule = createRule(
    "req_to_circle",
    func("request", ["circle", "?O"]),
    func("circle", ["!C", "?O"])
  );

  expect(applyRule(state, rule)).toBe(false);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("request(square, O)");
});

test("applyRule applies first matching term", () => {
  const state = createState([
    func("request", ["square", "O"]),
    func("request", ["circle", "P"])
  ]);
  const rule = createRule(
    "req_to_circle",
    func("request", ["circle", "?O"]),
    func("circle", ["!C", "?O"])
  );

  expect(applyRule(state, rule)).toBe(true);
  expect(state.terms).toHaveLength(2);
  expect(printTerm(state.terms[0])).toBe("request(square, O)");
  expect(printTerm(state.terms[1])).toBe("circle(C1, P)");
});

test("applyRule with multiple substitutions", () => {
  const state = createState([func("add", ["a", "b"])]);
  const rule = createRule(
    "add_consts",
    func("add", ["?x", "?y"]),
    func("sum", ["!S", "?x", "?y"])
  );

  expect(applyRule(state, rule)).toBe(true);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("sum(S1, a, b)");
});

// ====================
// Tests for step()
// ====================

test("step applies first applicable rule", () => {
  const state = createState(
    [func("request", ["circle", "O"])],
    [
      createRule("rule1", func("request", ["square", "?O"]), func("square", ["!S", "?O"])),
      createRule("rule2", func("request", ["circle", "?O"]), func("circle", ["!C", "?O"])),
    ]
  );

  expect(step(state)).toBe(true);
  expect(printTerm(state.terms[0])).toBe("circle(C1, O)");
});

test("step returns false when no rules apply", () => {
  const state = createState(
    [func("request", ["triangle"])],
    [createRule("rule", func("request", ["circle"]), func("circle", []))]
  );

  expect(step(state)).toBe(false);
  expect(printTerm(state.terms[0])).toBe("request(triangle)");
});

// ====================
// Tests for run()
// ====================

test("run applies rules until fixed point", () => {
  const state = createState(
    [func("request", ["circle", "O"])],
    [
      createRule("req_to_circle", func("request", ["circle", "?O"]), func("circle", ["!C", "?O"])),
      createRule("circle_to_point", func("circle", ["?C", "?O"]), func("point", ["!P", "?O"])),
    ]
  );

  run(state, 10);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("point(P1, O)");
});

test("run respects maxSteps", () => {
  const state = createState(
    [func("a", [])],
    [createRule("a_to_b", func("a", []), func("b", []))]
  );

  run(state, 0);
  expect(printTerm(state.terms[0])).toBe("a()");

  run(state, 1);
  expect(printTerm(state.terms[0])).toBe("b()");
});

// ====================
// Tests for printTerm()
// ====================

test("printTerm with constants", () => {
  expect(printTerm("a")).toBe("a");
});

test("printTerm with variables", () => {
  expect(printTerm("?x")).toBe("?x");
});

test("printTerm with fresh generators", () => {
  expect(printTerm("!C")).toBe("!C");
});

test("printTerm with function terms", () => {
  expect(printTerm(func("f", []))).toBe("f()");
  expect(printTerm(func("f", ["a"]))).toBe("f(a)");
  expect(printTerm(func("f", ["a", "b", "c"]))).toBe("f(a, b, c)");
});

test("printTerm with nested function terms", () => {
  const term = func("f", [func("g", ["a", "b"]), "c"]);
  expect(printTerm(term)).toBe("f(g(a, b), c)");
});

// ====================
// Integration Tests
// ====================

test("Example from main file", () => {
  const state = createState(
    [func("request", ["circle", "O", func("segment", ["O", "A"])])],
    [
      createRule(
        "request_to_circle",
        func("request", ["circle", "?O", "?R"]),
        func("circle", ["!C", "?O", "?R"])
      ),
    ]
  );

  run(state);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("circle(C1, O, segment(O, A))");
});

test("Multiple rewrite steps", () => {
  const state = createState(
    [func("not", [func("not", ["a"])])],
    [
      createRule("double_neg", func("not", [func("not", ["?x"])]), "?x"),
    ]
  );

  run(state);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("a");
});

test("Fresh name collision avoidance", () => {
  const state = createState(
    [func("f", []), func("f", [])],
    [
      createRule("f_to_g", func("f", []), func("g", ["!X"])),
    ]
  );

  run(state);
  expect(state.terms).toHaveLength(2);
  expect(printTerm(state.terms[0])).toBe("g(X1)");
  expect(printTerm(state.terms[1])).toBe("g(X2)");
});

test("Complex nested rewriting", () => {
  // Test with a top-level term that matches
  const state = createState(
    [func("mul", ["2", "3"])],
    [
      createRule("mul_to_prod", func("mul", ["?x", "?y"]), func("prod", ["!P", "?x", "?y"])),
    ]
  );

  // Check that unification works for nested terms
  const subst: Substitution = new Map();
  const pattern = func("mul", ["?x", "?y"]);
  const target = func("mul", ["2", "3"]);
  expect(unify(pattern, target, subst)).toBe(true);
  expect(subst.get("?x")).toBe("2");
  expect(subst.get("?y")).toBe("3");

  // Now run step
  step(state);
  expect(state.terms).toHaveLength(1);
  expect(printTerm(state.terms[0])).toBe("prod(P1, 2, 3)");
});