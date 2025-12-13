/**
 * @file Regression test ensuring node drag does not re-render unrelated connections.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { NodeLayer } from "../src/components/node/layer/NodeLayer";
import { ConnectionRenderer } from "../src/components/connection/ConnectionRenderer";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";
import { useNodeEditorSelector } from "../src/contexts/composed/node-editor/context";

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

type ConnectionCommitCounts = Record<string, number>;

const createConnectionCounter = () => {
  const counts: ConnectionCommitCounts = {};
  return {
    counts,
    inc: (connectionId: string) => {
      counts[connectionId] = (counts[connectionId] ?? 0) + 1;
    },
    snapshot: () => ({ ...counts }),
  };
};

const TestConnectionLayerInner: React.FC<{ counter: ReturnType<typeof createConnectionCounter> }> = ({ counter }) => {
  const connections = useNodeEditorSelector((state) => state.connections);
  return (
    <svg>
      {Object.values(connections).map((connection) => (
        <React.Profiler
          key={connection.id}
          id={`connection-${connection.id}`}
          onRender={() => {
            counter.inc(connection.id);
          }}
        >
          <ConnectionRenderer connection={connection} />
        </React.Profiler>
      ))}
    </svg>
  );
};
const TestConnectionLayer = React.memo(TestConnectionLayerInner);

describe("node drag connection render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit unrelated connections while dragging a node", async () => {
    const counter = createConnectionCounter();

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
        c: {
          id: "c",
          type: "label",
          position: { x: 0, y: 200 },
          size: { width: 220, height: 72 },
          data: { title: "C", labelTitle: "C" },
        },
        d: {
          id: "d",
          type: "label",
          position: { x: 320, y: 200 },
          size: { width: 220, height: 72 },
          data: { title: "D", labelTitle: "D" },
        },
      },
      connections: {
        ab: { id: "ab", fromNodeId: "a", fromPortId: "out", toNodeId: "b", toPortId: "in" },
        cd: { id: "cd", fromNodeId: "c", fromPortId: "out", toNodeId: "d", toPortId: "in" },
      },
    };

    const { container } = render(
      <NodeEditorCore initialData={initialData}>
        <CanvasPointerActionProvider>
          <CanvasBase>
            <TestConnectionLayer counter={counter} />
            <NodeLayer />
          </CanvasBase>
        </CanvasPointerActionProvider>
      </NodeEditorCore>,
    );

    await nextFrame();

    const nodeEl = container.querySelector(`[data-node-id="a"]`) as HTMLElement | null;
    expect(nodeEl).not.toBeNull();

    const baseline = counter.snapshot();

    await act(async () => {
      fireEvent.pointerDown(nodeEl!, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 10,
      });
    });
    await nextFrame();

    const afterDown = counter.snapshot();

    await act(async () => {
      for (const step of [1, 2, 3, 4, 5]) {
        fireEvent.pointerMove(window, {
          pointerId: 1,
          pointerType: "mouse",
          buttons: 1,
          clientX: 10 + step * 12,
          clientY: 10,
        });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    });

    const afterMoves = counter.snapshot();

    const abMoveDelta = (afterMoves.ab ?? 0) - (afterDown.ab ?? baseline.ab ?? 0);
    const cdMoveDelta = (afterMoves.cd ?? 0) - (afterDown.cd ?? baseline.cd ?? 0);

    expect(abMoveDelta).toBeGreaterThan(0);
    // Unrelated connection must not re-render per pointer move.
    expect(cdMoveDelta).toBeLessThanOrEqual(1);

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 80,
        clientY: 10,
      });
    });
    await nextFrame();

    const afterUp = counter.snapshot();
    const abUpDelta = (afterUp.ab ?? 0) - (afterMoves.ab ?? 0);
    const cdUpDelta = (afterUp.cd ?? 0) - (afterMoves.cd ?? 0);

    // Dragged-node connection may update on commit.
    expect(abUpDelta).toBeGreaterThanOrEqual(0);
    // Unrelated connection must not update on node position commit.
    expect(cdUpDelta).toBeLessThanOrEqual(0);
  });
});
