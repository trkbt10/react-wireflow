/**
 * @file Shared helper for selector-style subscriptions using useSyncExternalStore.
 *
 * Many contexts in this repo expose a "subscribe + getState" API.
 * This hook centralizes the boilerplate needed to select a derived value without
 * re-rendering consumers on unrelated changes.
 */
import * as React from "react";

export type ExternalStoreSubscribe = (listener: () => void) => () => void;

export type ExternalStoreSelectorOptions<T> = {
  /**
   * Equality function to keep returning the previous snapshot when semantically unchanged.
   * This prevents unnecessary re-renders when the selector creates new objects.
   */
  areEqual?: (a: T, b: T) => boolean;
};

/**
 * Select a derived value from an external store, optionally reusing the previous snapshot
 * when `areEqual(previous, next)` holds.
 */
export function useExternalStoreSelector<S, T>(
  subscribe: ExternalStoreSubscribe,
  getState: () => S,
  selector: (state: S) => T,
  options?: ExternalStoreSelectorOptions<T>,
): T {
  const previousRef = React.useRef<T | null>(null);

  const getSnapshot = React.useCallback((): T => {
    const next = selector(getState());
    const previous = previousRef.current;
    const areEqual = options?.areEqual;
    if (previous !== null && areEqual && areEqual(previous, next)) {
      return previous;
    }
    previousRef.current = next;
    return next;
  }, [getState, selector, options?.areEqual]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

