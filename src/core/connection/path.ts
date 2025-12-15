/**
 * @file Connection path utilities
 * Functions for calculating bezier curves between two points.
 */
import type { Position } from "../../types/core";
import type { PortPosition as PortSide } from "../../types/core";
import { getDistance } from "../geometry/position";
import { cubicBezierPoint, cubicBezierTangent } from "../geometry/curve";
import type { ConnectionPathOptions } from "../../types/connectionBehavior";
import { getControlPointUnitVector } from "./controlPointRounding";

const OFFSET_MIN = 40;
const OFFSET_MAX = 120;

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
  const distance = getDistance(from, to);
  const offsetMin = options?.offsetMin ?? OFFSET_MIN;
  const offsetMax = options?.offsetMax ?? OFFSET_MAX;
  const offset = Math.max(offsetMin, Math.min(offsetMax, distance * 0.5));

  const rounding = options?.controlPointRounding ?? "snap-90";
  const unit = getControlPointUnitVector(dx, dy, rounding);
  return {
    cp1: { x: from.x + unit.x * offset, y: from.y + unit.y * offset },
    cp2: { x: to.x - unit.x * offset, y: to.y - unit.y * offset },
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
  const distance = getDistance(from, to);
  const offsetMin = options?.offsetMin ?? OFFSET_MIN;
  const offsetMax = options?.offsetMax ?? OFFSET_MAX;
  const offset = Math.max(offsetMin, Math.min(offsetMax, distance * 0.5));

  const out = getPortSideUnitVector(outputSide);
  const into = getPortSideUnitVector(inputSide);

  // cp1 uses the output port's outward direction.
  // cp2 uses the input port's outward direction so that the tangent at the end points inward to the port.
  return {
    cp1: { x: from.x + out.x * offset, y: from.y + out.y * offset },
    cp2: { x: to.x + into.x * offset, y: to.y + into.y * offset },
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
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
};

/**
 * Calculate SVG bezier path string for a connection
 */
export const calculateConnectionPath = (from: Position, to: Position, options?: ConnectionPathOptions): string => {
  const { cp1, cp2 } = calculateConnectionControlPoints(from, to, options);
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
};

/**
 * Midpoint and angle along a connection path
 */
export type ConnectionMidpointInfo = {
  x: number;
  y: number;
  angle: number;
};

/**
 * Calculate the midpoint position and tangent angle at t=0.5 along the connection bezier.
 */
export const calculateConnectionMidpoint = (from: Position, to: Position): ConnectionMidpointInfo => {
  const { cp1, cp2 } = calculateConnectionControlPoints(from, to);
  const pt = cubicBezierPoint(from, cp1, cp2, to, 0.5);
  const tan = cubicBezierTangent(from, cp1, cp2, to, 0.5);
  return { x: pt.x, y: pt.y, angle: (Math.atan2(tan.y, tan.x) * 180) / Math.PI };
};

export type { ConnectionPathOptions } from "../../types/connectionBehavior";
