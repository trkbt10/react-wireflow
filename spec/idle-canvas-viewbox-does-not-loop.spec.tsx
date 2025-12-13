/**
 * @file Regression test ensuring canvas viewBox updates do not trigger a render loop while idle.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeCanvasProvider } from "../src/contexts/composed/canvas/viewport/provider";
import { useNodeCanvasActions, useNodeCanvasState } from "../src/contexts/composed/canvas/viewport/context";

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

class FakeResizeObserver {
  static lastInstance: FakeResizeObserver | null = null;
  readonly #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    FakeResizeObserver.lastInstance = this;
  }

  observe(_target: Element, _options?: ResizeObserverOptions) {}

  unobserve(_target: Element) {}

  disconnect() {}

  trigger(entry: ResizeObserverEntry) {
    this.#callback([entry], this as unknown as ResizeObserver);
  }
}

const createEntry = (target: Element, width: number, height: number): ResizeObserverEntry => {
  return {
    target,
    contentRect: new DOMRectReadOnly(0, 0, width, height),
    borderBoxSize: [
      {
        inlineSize: width,
        blockSize: height,
      },
    ],
  } as unknown as ResizeObserverEntry;
};

const Setup: React.FC<{ onContainer: (el: HTMLDivElement) => void; onRender: () => void }> = ({
  onContainer,
  onRender,
}) => {
  const { setContainerElement } = useNodeCanvasActions();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  useNodeCanvasState(); // subscribe to store updates

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    setContainerElement(containerRef.current);
    onContainer(containerRef.current);
    return () => {
      setContainerElement(null);
    };
  }, [setContainerElement, onContainer]);

  onRender();

  return <div ref={containerRef} style={{ width: 100, height: 100 }} />;
};

describe("idle canvas viewBox regression", () => {
  it("does not re-render repeatedly when ResizeObserver reports the same size", async () => {
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    try {
      let renders = 0;
      let container: HTMLDivElement | null = null;
      const onContainer = (el: HTMLDivElement) => {
        container = el;
      };

      render(
        <NodeCanvasProvider>
          <Setup
            onContainer={onContainer}
            onRender={() => {
              renders++;
            }}
          />
        </NodeCanvasProvider>,
      );

      await act(async () => {});

      const instance = FakeResizeObserver.lastInstance;
      if (!instance) {
        throw new Error("expected ResizeObserver to be constructed");
      }
      if (!container) {
        throw new Error("expected container to be set");
      }
      const target = container;

      const baseline = renders;

      await act(async () => {
        // First report establishes the initial measured size.
        instance.trigger(createEntry(target, 100, 100));
      });

      const afterFirst = renders;
      expect(afterFirst).toBeGreaterThanOrEqual(baseline);

      await act(async () => {
        // Subsequent identical reports should not trigger further re-renders.
        for (const _step of [1, 2, 3, 4, 5, 6, 7, 8]) {
          instance.trigger(createEntry(target, 100, 100));
        }
      });

      expect(renders).toBe(afterFirst);
    } finally {
      globalThis.ResizeObserver = previous as typeof ResizeObserver;
    }
  });
});
