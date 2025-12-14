/**
 * @file Equality helpers for selector-based subscriptions.
 */
import type { NodeId } from "../../../../types/core";

/**
 * Shallow equality for `NodeId[]` with stable order.
 */
export function areNodeIdArraysEqual(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((id, idx) => id === b[idx]);
}
