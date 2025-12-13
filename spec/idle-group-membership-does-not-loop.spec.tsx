/**
 * @file Regression test ensuring group membership auto-update does not cause an idle render loop.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { NodeLayer } from "../src/components/node/layer/NodeLayer";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";
import type { NodeViewProps } from "../src/components/node/NodeView";
import { NodeViewContainer } from "../src/components/node/NodeViewContainer";

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

const wait = async (ms: number) => {
  await act(async () => {
    await new Promise<void>((resolve) => window.setTimeout(() => resolve(), ms));
  });
};

describe("idle group membership render loop regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not keep committing nodes from group membership auto-update when no grouping is active", async () => {
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

    const initialData = {
      nodes: {
        a: {
          id: "a",
          type: "label",
          position: { x: 0, y: 0 },
          size: { width: 220, height: 72 },
          data: { title: "A", labelTitle: "A" },
        },
        b: {
          id: "b",
          type: "label",
          position: { x: 320, y: 0 },
          size: { width: 220, height: 72 },
          data: { title: "B", labelTitle: "B" },
        },
      },
      connections: {},
    };

    render(
      <NodeEditorCore initialData={initialData} renderers={{ node: CountingNode }}>
        <CanvasPointerActionProvider>
          <CanvasBase>
            <NodeLayer />
          </CanvasBase>
        </CanvasPointerActionProvider>
      </NodeEditorCore>,
    );

    await wait(0);

    const baseline = nodeCommits;

    // useGroupManagement in NodeLayer uses a debounced update (default 200ms).
    await wait(260);

    expect(nodeCommits).toBe(baseline);
  });
});
