/**
 * @file Shared ResizeObserver hook with cached observers.
 */
import React from "react";

type Unobserve = () => void;
type Callback = (entry: ResizeObserverEntry, observer: ResizeObserver) => void;
type SharedObserver = {
  observe: (target: Element, callback: Callback) => Unobserve;
};
const observerCache = new Map<string, SharedObserver>();
const getSharedObserver = (options: ResizeObserverOptions) => {
  const observerKey = `ovs-${options.box ?? "content-box"}`;
  if (observerCache.has(observerKey)) {
    return observerCache.get(observerKey)!;
  }
  const observer = new (class {
    #callbackMap = new Map<Element, Callback>();
    #resizeObserver = new ResizeObserver((entries, observer) => {
      entries.forEach((entry) => {
        const callback = this.#callbackMap.get(entry.target);
        if (callback) {
          callback(entry, observer);
        }
      });
    });
    observe(target: Element, callback: Callback) {
      this.#callbackMap.set(target, callback);
      this.#resizeObserver.observe(target, options);
      return () => {
        this.#callbackMap.delete(target);
        this.#resizeObserver.unobserve(target);
      };
    }
  })();
  observerCache.set(observerKey, observer);

  return observer;
};
/**
 * Observe element size changes for a given ref.
 * Falls back to returning `undefined` when ResizeObserver is unavailable.
 */
export function useResizeObserver<T extends HTMLElement>(ref: React.RefObject<T | null>, { box }: ResizeObserverOptions) {
  const [entry, setEntry] = React.useState<ResizeObserverEntry | null>(null);
  const lastSizeRef = React.useRef<{ width: number; height: number } | null>(null);

  const getNormalizedSize = React.useCallback((entry: ResizeObserverEntry): { width: number; height: number } => {
    if (entry.borderBoxSize?.length > 0) {
      const size = entry.borderBoxSize[0];
      return { width: Math.floor(size.inlineSize), height: Math.floor(size.blockSize) };
    }
    return { width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) };
  }, []);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    if (!ref.current) {
      return;
    }
    const observer = getSharedObserver({ box });
    return observer.observe(ref.current, (entry) => {
      const nextSize = getNormalizedSize(entry);
      const prevSize = lastSizeRef.current;
      if (prevSize && prevSize.width === nextSize.width && prevSize.height === nextSize.height) {
        return;
      }
      lastSizeRef.current = nextSize;
      setEntry(entry);
    });
  }, [box, ref, getNormalizedSize]);
  const rect = React.useMemo(() => {
    if (!entry) {
      return;
    }

    if (entry.borderBoxSize?.length > 0) {
      const size = entry.borderBoxSize[0];
      const rect = new DOMRect(0, 0, Math.floor(size.inlineSize), Math.floor(size.blockSize));
      return rect;
    } else {
      return new DOMRect(0, 0, Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
    }
  }, [entry]);
  return { entry, rect };
}
