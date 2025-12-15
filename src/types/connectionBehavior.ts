/**
 * @file Connection behavior types
 * Defines configurable connection routing and control point rounding behavior.
 */
import type { Connection, Node, Port, Position } from "./core";

/**
 * How to round/control the direction a connection "exits" a port when computing bezier control points.
 */
export type ConnectionControlPointRoundingId = "snap-90" | "horizontal" | "vertical" | "vector" | "port-side";

export type ConnectionHandleOffsetRange = {
  min: number;
  max: number;
};

/**
 * Point on a connection path at a parametric step `t` (0..1) plus tangent angle (degrees).
 * This is intentionally parametric (not arc-length) to keep evaluation exact and deterministic
 * across different path implementations.
 */
export type ConnectionPathPoint = {
  x: number;
  y: number;
  angle: number;
};

/**
 * A computed connection path that can both render (`toPathData`) and be sampled (`pointAt`).
 * This ensures marker/midpoint positioning uses the same source of truth as the rendered path.
 */
export type ConnectionPathModel = {
  toPathData: () => string;
  pointAt: (t: number) => ConnectionPathPoint;
};

/**
 * Context available when calculating a connection path.
 * Optional fields allow callers (e.g. previews) to omit unresolved entities.
 */
export type ConnectionPathCalculationContext = {
  outputPosition: Position;
  inputPosition: Position;
  connection?: Connection | null;
  outputNode?: Node;
  inputNode?: Node;
  outputPort?: Port;
  inputPort?: Port;
};

export type ConnectionPathOptions = {
  controlPointRounding?: ConnectionControlPointRoundingId;
  offsetMin?: number;
  offsetMax?: number;
};

export type ConnectionPathAlgorithm =
  | { type: "bezier" }
  | { type: "straight" }
  | { type: "custom"; createPath: (ctx: ConnectionPathCalculationContext) => ConnectionPathModel };

/**
 * Object-based resolver to allow selecting behavior based on the surrounding context
 * (e.g. depending on the previous/next nodes).
 */
export type ConnectionValueResolver<T> =
  | { type: "fixed"; value: T }
  | { type: "byContext"; resolve: (ctx: ConnectionPathCalculationContext) => T };

export type ConnectionBehavior = {
  path: ConnectionValueResolver<ConnectionPathAlgorithm>;
  controlPointRounding: ConnectionValueResolver<ConnectionControlPointRoundingId>;
  handleOffset: ConnectionValueResolver<ConnectionHandleOffsetRange>;
};

export const defaultConnectionBehavior: ConnectionBehavior = {
  path: { type: "fixed", value: { type: "bezier" } },
  controlPointRounding: { type: "fixed", value: "port-side" },
  handleOffset: { type: "fixed", value: { min: 40, max: 120 } },
};

/**
 * Resolves a value from a resolver object, optionally based on the provided context.
 */
export function resolveConnectionValue<T>(resolver: ConnectionValueResolver<T>, ctx: ConnectionPathCalculationContext): T {
  if (resolver.type === "fixed") {
    return resolver.value;
  }
  return resolver.resolve(ctx);
}
