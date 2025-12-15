/**
 * @file Connection control point rounding
 * Utilities for selecting the direction used to offset bezier control points.
 */
import type { ConnectionControlPointRoundingId } from "../../types/connectionBehavior";

type UnitVector = { x: number; y: number };

const signNonZero = (value: number): number => {
  if (value > 0) {
    return 1;
  }
  if (value < 0) {
    return -1;
  }
  return 1;
};

export const getControlPointUnitVector = (dx: number, dy: number, rounding: ConnectionControlPointRoundingId): UnitVector => {
  switch (rounding) {
    case "horizontal": {
      return { x: signNonZero(dx), y: 0 };
    }
    case "vertical": {
      return { x: 0, y: signNonZero(dy) };
    }
    case "vector": {
      const distance = Math.hypot(dx, dy);
      if (distance === 0) {
        return { x: 1, y: 0 };
      }
      return { x: dx / distance, y: dy / distance };
    }
    case "port-side": {
      // This mode requires port-side context; when unavailable, fall back to the legacy snap-90 behavior.
      if (Math.abs(dx) >= Math.abs(dy)) {
        return { x: signNonZero(dx), y: 0 };
      }
      return { x: 0, y: signNonZero(dy) };
    }
    case "snap-90": {
      if (Math.abs(dx) >= Math.abs(dy)) {
        return { x: signNonZero(dx), y: 0 };
      }
      return { x: 0, y: signNonZero(dy) };
    }
  }
};
