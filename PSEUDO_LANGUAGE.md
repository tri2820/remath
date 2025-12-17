```
// world is a constructor that accepts a list of facts
world (rule (point x) (point (intro y)) (segment (point x) (point (intro y)))) (point (atom A))
// above rule means x -> y and segment x y
// sub accepts the world, the locator, and value
// for simplicity, we enforce one locator and one value, instead of multiple like the actual underlying machinary
sub world (rule (point x) (point (intro y)) (segment (point x) (point (intro y)))) (point (atom A))
// print out the world facts
:facts world
// expect to see
// - rule (point A) (point (atom B)) (segment (point A) (point (atom B)))
// - point (atom B)
// - segment (point A) (point (atom B))
```
