/**
 * @file Connection behavior types
 * Defines configurable connection routing and control point rounding behavior.
 */
import type { Connection, Node, Port, Position } from "./core";

/**
 * How to round/control the direction a connection "exits" a port when computing bezier control points.
 */
export type ConnectionControlPointRoundingId = "snap-90" | "horizontal" | "vertical" | "vector" | "port-side";

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
  | { type: "custom"; calculatePath: (ctx: ConnectionPathCalculationContext) => string };

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
};

export const defaultConnectionBehavior: ConnectionBehavior = {
  path: { type: "fixed", value: { type: "bezier" } },
  controlPointRounding: { type: "fixed", value: "snap-90" },
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
