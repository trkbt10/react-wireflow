/**
 * @file Stable callback wrapper that always invokes the latest function.
 */
import * as React from "react";
import { useLatestRef } from "./useLatestRef";

/**
 * Returns a stable function identity that always calls the latest provided callback.
 * Useful when you must keep prop references stable (e.g., to preserve memoization)
 * but the callback implementation depends on changing state/props.
 */
export function useStableCallback<TArgs extends unknown[], TResult>(
  callback: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const callbackRef = useLatestRef(callback);
  return React.useCallback((...args: TArgs) => callbackRef.current(...args), []);
}
