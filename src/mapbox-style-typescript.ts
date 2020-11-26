import type { Expression } from "mapbox-gl";

export const literal = <T>(val: T): Expression => ["literal", val];
export const has = (key: string): Expression => ["has", key];
export const get = (key: string): Expression => ["get", key];
export const getVar = (key: string): Expression => ["var", key];
export const toBoolean = (expression: Expression): Expression => [
  "to-boolean",
  expression,
];
export const not = (expression: Expression): Expression => ["!", expression];
export const length = (expression: Expression): Expression => [
  "length",
  expression,
];
export const gt = (
  expression1: Expression,
  expression2: Expression | number
): Expression => [">", expression1, expression2];
export const any = (...expressions: Array<Expression>): Expression => [
  "any",
  ...expressions,
];
export const all = (...expressions: Array<Expression>): Expression => [
  "all",
  ...expressions,
];
export const concat = (...expressions: Array<Expression>): Expression => [
  "concat",
  ...expressions,
];
export const coalesce = <T>(
  ...expressions: Array<Expression | T>
): Expression => ["coalesce", ...expressions];
export const format = (
  ...parts: Array<[Expression | string, Record<string, unknown>]>
): Expression => [
  "format",
  ...parts.flatMap(([...textAndStyle]) => textAndStyle),
];
// Scheme-style conditional: cond([condition, value]..., [defaultValue])
export const cond = <T>(
  ...cases: Array<[Expression, Expression | T] | [Expression | T]>
): Expression => {
  return ["case", ...cases.flatMap(([...testAndBody]) => testAndBody)];
};
