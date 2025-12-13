/**
 * @file Regression test ensuring the editor does not re-render nodes repeatedly while idle.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import type { NodeViewProps } from "../src/components/node/NodeView";
import { NodeViewContainer } from "../src/components/node/NodeViewContainer";
import type { NodeEditorData } from "../src/types/core";

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly #callback: ResizeObserverCallback;
  #target: Element | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element, _options?: ResizeObserverOptions) {
    this.#target = target;
  }

  unobserve(_target: Element) {}

  disconnect() {
    this.#target = null;
  }

  trigger(width: number, height: number) {
    if (!this.#target) {
      return;
    }
    const entry = {
      target: this.#target,
      contentRect: new DOMRectReadOnly(0, 0, width, height),
    } as unknown as ResizeObserverEntry;
    this.#callback([entry], this as unknown as ResizeObserver);
  }
}

const ensurePointerCaptureApis = () => {
  if (typeof HTMLElement === "undefined") {
    return;
  }
  const proto = HTMLElement.prototype as unknown as {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
  };
  if (!proto.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!proto.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      value: () => undefined,
      configurable: true,
    });
  }
};

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const createInitialData = (nodeCount: number): Partial<NodeEditorData> => {
  const nodes: NodeEditorData["nodes"] = {};
  Array.from({ length: nodeCount }).forEach((_, index) => {
    const id = `n${index}`;
    nodes[id] = {
      id,
      type: "label",
      position: { x: index * 240, y: 0 },
      size: { width: 220, height: 72 },
      data: { title: id, labelTitle: id },
    };
  });
  return { nodes, connections: {} };
};

describe("idle render loop regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not keep committing nodes when ResizeObserver reports the same size", async () => {
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    try {
      let nodeCommits = 0;
      const CountingNodeInner: React.FC<NodeViewProps> = (props) => {
        return (
          <React.Profiler
            id={`node-${props.node.id}`}
            onRender={() => {
              nodeCommits += 1;
            }}
          >
            <NodeViewContainer {...props} />
          </React.Profiler>
        );
      };
      const CountingNode = React.memo(CountingNodeInner);

      render(
        <NodeEditorCore initialData={createInitialData(40)} renderers={{ node: CountingNode }}>
          <NodeCanvas />
        </NodeEditorCore>,
      );

      await nextFrame();
      await nextFrame();

      await act(async () => {
        // Establish a stable viewBox once (jsdom returns 0-sized rects by default).
        for (const instance of FakeResizeObserver.instances) {
          instance.trigger(800, 600);
        }
      });

      await nextFrame();

      const baseline = nodeCommits;

      await act(async () => {
        // Simulate a noisy observer reporting an identical size repeatedly.
        for (const _step of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
          for (const instance of FakeResizeObserver.instances) {
            instance.trigger(800, 600);
          }
        }
      });

      await nextFrame();

      expect(nodeCommits).toBe(baseline);
    } finally {
      globalThis.ResizeObserver = previous as typeof ResizeObserver;
      FakeResizeObserver.instances = [];
    }
  });
});
