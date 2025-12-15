/**
 * @file Unit tests for connection/path utilities.
 */
import {
  calculateConnectionControlPoints,
  calculateConnectionControlPointsByPortSide,
  calculateConnectionMidpointFromControlPoints,
  calculateConnectionPath,
  createPolylinePathModel,
} from "./path";

describe("connection/path", () => {
  it("uses snap-90 dominant-axis rounding by default (backward compatible)", () => {
    const from = { x: 10, y: 20 };
    const to = { x: 210, y: 60 };

    const { cp1, cp2 } = calculateConnectionControlPoints(from, to);
    const path = calculateConnectionPath(from, to);

    // dx=200, dy=40 → dominant axis is x (horizontal)
    const distance = Math.hypot(200, 40);
    const offset = Math.max(40, Math.min(120, distance * 0.5));

    expect(cp1.x).toBeCloseTo(from.x + offset);
    expect(cp1.y).toBeCloseTo(from.y);
    expect(cp2.x).toBeCloseTo(to.x - offset);
    expect(cp2.y).toBeCloseTo(to.y);
    expect(path).toContain(`M ${from.x} ${from.y} C`);
  });

  it("switches control point rounding when provided", () => {
    const from = { x: 100, y: 25 };
    const to = { x: 200, y: 65 };

    const { cp1: verticalCp1, cp2: verticalCp2 } = calculateConnectionControlPoints(from, to, {
      controlPointRounding: "vertical",
    });
    const { cp1: snapCp1, cp2: snapCp2 } = calculateConnectionControlPoints(from, to, {
      controlPointRounding: "snap-90",
    });

    expect(verticalCp1.x).toBeCloseTo(from.x);
    expect(verticalCp2.x).toBeCloseTo(to.x);
    expect(snapCp1.y).toBeCloseTo(from.y);
    expect(snapCp2.y).toBeCloseTo(to.y);
  });

  it("supports port-side control points via separate helper", () => {
    const from = { x: 100, y: 25 };
    const to = { x: 200, y: 65 };

    const { cp1, cp2 } = calculateConnectionControlPointsByPortSide(from, to, "right", "left");

    // Output on right: cp1 should move to +x. Input on left: cp2 should move to -x.
    expect(cp1.x).toBeGreaterThan(from.x);
    expect(cp1.y).toBeCloseTo(from.y);
    expect(cp2.x).toBeLessThan(to.x);
    expect(cp2.y).toBeCloseTo(to.y);
  });

  it("calculates midpoint based on explicit control points", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const { cp1, cp2 } = calculateConnectionControlPointsByPortSide(from, to, "right", "left");
    const mid = calculateConnectionMidpointFromControlPoints(from, cp1, cp2, to);
    expect(mid.x).toBeCloseTo(50);
    expect(mid.y).toBeCloseTo(0);
  });

  it("derives midpoint from a polyline model", () => {
    const model = createPolylinePathModel([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
    const mid = model.pointAt(0.5);
    // Total length is 200; midpoint at length 100 is at (100,0).
    expect(mid.x).toBeCloseTo(100);
    expect(mid.y).toBeCloseTo(0);
  });
});
