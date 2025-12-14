/**
 * @file Hook for keeping a ref in sync with the latest value.
 */
import * as React from "react";

/**
 * Returns a ref object that always points to the latest provided value.
 * Useful for stable callbacks that need the newest implementation/state without re-subscribing.
 */
export function useLatestRef<T>(value: T): React.MutableRefObject<T> {
  const ref = React.useRef<T>(value);
  ref.current = value;
  return ref;
}
