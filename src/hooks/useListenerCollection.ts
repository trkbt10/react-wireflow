/**
 * @file Shared helper for managing "subscribe/notify" listener Sets.
 *
 * This pattern is used by multiple providers to implement:
 * - useSyncExternalStore-compatible subscriptions (listener: () => void)
 * - typed event subscriptions (listener: (event) => void)
 */
import * as React from "react";

export type ListenerCollection<TArgs extends unknown[]> = {
  subscribe: (listener: (...args: TArgs) => void) => () => void;
  notify: (...args: TArgs) => void;
};

/**
 * Create a stable listener Set with subscribe/unsubscribe + notify utilities.
 */
export function useListenerCollection<TArgs extends unknown[] = []>(): ListenerCollection<TArgs> {
  const listenersRef = React.useRef(new Set<(...args: TArgs) => void>());

  const subscribe = React.useCallback((listener: (...args: TArgs) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const notify = React.useCallback((...args: TArgs) => {
    // Snapshot the listeners so unsubscribe/subscribe during notify is safe.
    const listeners = Array.from(listenersRef.current);
    listeners.forEach((listener) => listener(...args));
  }, []);

  return { subscribe, notify };
}

