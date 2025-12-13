/**
 * @file Unit tests for useResizeObserver.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { useResizeObserver } from "./useResizeObserver";

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
  const entry = {
    target,
    contentRect: new DOMRectReadOnly(0, 0, width, height),
    borderBoxSize: [
      {
        inlineSize: width,
        blockSize: height,
      },
    ],
  } as unknown as ResizeObserverEntry;
  return entry;
};

describe("useResizeObserver", () => {
  it("does not update when the normalized size is unchanged", async () => {
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    try {
      let renders = 0;
      const Component: React.FC = () => {
        renders++;
        const ref = React.useRef<HTMLDivElement | null>(null);
        useResizeObserver(ref, { box: "border-box" });
        return <div ref={ref} />;
      };

      const { container } = render(<Component />);
      const target = container.firstElementChild;
      if (!target) {
        throw new Error("expected element to be rendered");
      }

      const instance = FakeResizeObserver.lastInstance;
      if (!instance) {
        throw new Error("expected ResizeObserver to be constructed");
      }

      const baseline = renders;

      await act(async () => {
        instance.trigger(createEntry(target, 100.4, 50.4)); // rounds to 100x50
      });
      expect(renders).toBe(baseline + 1);

      await act(async () => {
        instance.trigger(createEntry(target, 100.49, 50.49)); // still rounds to 100x50
      });
      expect(renders).toBe(baseline + 1);
    } finally {
      globalThis.ResizeObserver = previous as typeof ResizeObserver;
    }
  });
});
