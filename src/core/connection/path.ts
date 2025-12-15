/**
 * @file Connection path utilities
 * Functions for calculating bezier curves between two points.
 */
import type { Position } from "../../types/core";
import type { PortPosition as PortSide } from "../../types/core";
import { getDistance } from "../geometry/position";
import { cubicBezierPoint, cubicBezierTangent } from "../geometry/curve";
import type { ConnectionPathModel, ConnectionPathOptions, ConnectionPathPoint } from "../../types/connectionBehavior";
import { getControlPointUnitVector } from "./controlPointRounding";

const OFFSET_MIN = 40;
const OFFSET_MAX = 120;

const calculateHandleOffset = (from: Position, to: Position, options?: { offsetMin?: number; offsetMax?: number }): number => {
  const distance = getDistance(from, to);
  const offsetMin = options?.offsetMin ?? OFFSET_MIN;
  const offsetMax = options?.offsetMax ?? OFFSET_MAX;
  return Math.max(offsetMin, Math.min(offsetMax, distance * 0.5));
};

/**
 * Calculate control points for a bezier curve connecting two points.
 * Control points are offset along the dominant axis to create smooth curves.
 */
export const calculateConnectionControlPoints = (
  from: Position,
  to: Position,
  options?: ConnectionPathOptions,
): { cp1: Position; cp2: Position } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const rounding = options?.controlPointRounding ?? "snap-90";
  const unit = getControlPointUnitVector(dx, dy, rounding);
  const offset = calculateHandleOffset(from, to, options);
  return {
    cp1: { x: from.x + unit.x * offset, y: from.y + unit.y * offset },
    cp2: { x: to.x - unit.x * offset, y: to.y - unit.y * offset },
  };
};

/**
 * Calculates the cubic bezier handle vectors for a connection.
 * - `outputHandle` is the vector from the output port position to `cp1`
 * - `inputHandle` is the vector from the input port position to `cp2`
 */
export const calculateConnectionHandles = (
  from: Position,
  to: Position,
  options?: ConnectionPathOptions,
): { outputHandle: Position; inputHandle: Position } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const rounding = options?.controlPointRounding ?? "snap-90";
  const unit = getControlPointUnitVector(dx, dy, rounding);
  const offset = calculateHandleOffset(from, to, options);
  return {
    outputHandle: { x: unit.x * offset, y: unit.y * offset },
    inputHandle: { x: -unit.x * offset, y: -unit.y * offset },
  };
};

const getPortSideUnitVector = (side: PortSide): { x: number; y: number } => {
  switch (side) {
    case "left": {
      return { x: -1, y: 0 };
    }
    case "right": {
      return { x: 1, y: 0 };
    }
    case "top": {
      return { x: 0, y: -1 };
    }
    case "bottom": {
      return { x: 0, y: 1 };
    }
  }
};

export const calculateConnectionControlPointsByPortSide = (
  from: Position,
  to: Position,
  outputSide: PortSide,
  inputSide: PortSide,
  options?: Omit<ConnectionPathOptions, "controlPointRounding">,
): { cp1: Position; cp2: Position } => {
  const offset = calculateHandleOffset(from, to, options);

  const out = getPortSideUnitVector(outputSide);
  const into = getPortSideUnitVector(inputSide);

  // cp1 uses the output port's outward direction.
  // cp2 uses the input port's outward direction so that the tangent at the end points inward to the port.
  return {
    cp1: { x: from.x + out.x * offset, y: from.y + out.y * offset },
    cp2: { x: to.x + into.x * offset, y: to.y + into.y * offset },
  };
};

export const calculateConnectionHandlesByPortSide = (
  from: Position,
  to: Position,
  outputSide: PortSide,
  inputSide: PortSide,
  options?: Omit<ConnectionPathOptions, "controlPointRounding">,
): { outputHandle: Position; inputHandle: Position } => {
  const offset = calculateHandleOffset(from, to, options);
  const out = getPortSideUnitVector(outputSide);
  const into = getPortSideUnitVector(inputSide);
  return {
    outputHandle: { x: out.x * offset, y: out.y * offset },
    inputHandle: { x: into.x * offset, y: into.y * offset },
  };
};

export const calculateConnectionPathByPortSide = (
  from: Position,
  to: Position,
  outputSide: PortSide,
  inputSide: PortSide,
  options?: Omit<ConnectionPathOptions, "controlPointRounding">,
): string => {
  const { cp1, cp2 } = calculateConnectionControlPointsByPortSide(from, to, outputSide, inputSide, options);
  return serializeCubicBezierPath(from, cp1, cp2, to);
};

/**
 * Calculate SVG bezier path string for a connection
 */
export const calculateConnectionPath = (from: Position, to: Position, options?: ConnectionPathOptions): string => {
  const { cp1, cp2 } = calculateConnectionControlPoints(from, to, options);
  return serializeCubicBezierPath(from, cp1, cp2, to);
};

/**
 * Serialize an SVG cubic bezier path string for a connection.
 */
export const serializeCubicBezierPath = (from: Position, cp1: Position, cp2: Position, to: Position): string => {
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
};

const clamp01 = (t: number): number => {
  if (t < 0) {
    return 0;
  }
  if (t > 1) {
    return 1;
  }
  return t;
};

export const createCubicBezierPathModel = (from: Position, cp1: Position, cp2: Position, to: Position): ConnectionPathModel => {
  return {
    toPathData: () => serializeCubicBezierPath(from, cp1, cp2, to),
    pointAt: (t: number): ConnectionPathPoint => {
      const tt = clamp01(t);
      const pt = cubicBezierPoint(from, cp1, cp2, to, tt);
      const tan = cubicBezierTangent(from, cp1, cp2, to, tt);
      return { x: pt.x, y: pt.y, angle: (Math.atan2(tan.y, tan.x) * 180) / Math.PI };
    },
  };
};

export const createStraightPathModel = (from: Position, to: Position): ConnectionPathModel => {
  return {
    toPathData: () => `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
    pointAt: (t: number): ConnectionPathPoint => {
      const tt = clamp01(t);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      return {
        x: from.x + dx * tt,
        y: from.y + dy * tt,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    },
  };
};

export const createPolylinePathModel = (points: readonly Position[]): ConnectionPathModel => {
  return {
    toPathData: () => {
      const first = points[0];
      if (!first) {
        return "M 0 0";
      }
      const parts: string[] = [`M ${first.x} ${first.y}`];
      for (const point of points.slice(1)) {
        parts.push(`L ${point.x} ${point.y}`);
      }
      return parts.join(" ");
    },
    pointAt: (t: number): ConnectionPathPoint => {
      const tt = clamp01(t);
      if (points.length < 2) {
        const p = points[0] ?? { x: 0, y: 0 };
        return { x: p.x, y: p.y, angle: 0 };
      }

      const segments: { from: Position; to: Position; length: number }[] = [];
      let total = 0;
      for (let i = 0; i < points.length - 1; i += 1) {
        const from = points[i]!;
        const to = points[i + 1]!;
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        segments.push({ from, to, length });
        total += length;
      }

      if (total === 0) {
        const first = points[0]!;
        const last = points[points.length - 1]!;
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        return { x: first.x, y: first.y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
      }

      const target = total * tt;
      let walked = 0;
      for (const segment of segments) {
        const nextWalked = walked + segment.length;
        if (nextWalked >= target) {
          const remaining = target - walked;
          const localT = segment.length === 0 ? 0 : remaining / segment.length;
          const dx = segment.to.x - segment.from.x;
          const dy = segment.to.y - segment.from.y;
          return {
            x: segment.from.x + dx * localT,
            y: segment.from.y + dy * localT,
            angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          };
        }
        walked = nextWalked;
      }

      const last = segments[segments.length - 1]!;
      const dx = last.to.x - last.from.x;
      const dy = last.to.y - last.from.y;
      return { x: last.to.x, y: last.to.y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
    },
  };
};

export const createBezierConnectionPathModel = (
  from: Position,
  to: Position,
  options?: ConnectionPathOptions,
): ConnectionPathModel => {
  const { cp1, cp2 } = calculateConnectionControlPoints(from, to, options);
  return createCubicBezierPathModel(from, cp1, cp2, to);
};

/**
 * Calculate the midpoint position and tangent angle at t=0.5 along the connection bezier.
 */
export const calculateConnectionMidpointFromControlPoints = (
  from: Position,
  cp1: Position,
  cp2: Position,
  to: Position,
): ConnectionPathPoint => {
  return createCubicBezierPathModel(from, cp1, cp2, to).pointAt(0.5);
};

export const calculateConnectionMidpoint = (from: Position, to: Position): ConnectionPathPoint => {
  return createBezierConnectionPathModel(from, to).pointAt(0.5);
};

export type { ConnectionPathOptions } from "../../types/connectionBehavior";
