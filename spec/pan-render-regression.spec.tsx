/**
 * @file Render-regression test ensuring canvas panning does not cascade React commits into nodes/connections/inspector.
 */
import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { CanvasBase } from "../src/components/canvas/CanvasBase";
import { NodeViewContainer } from "../src/components/node/NodeViewContainer";
import { ConnectionRenderer } from "../src/components/connection/ConnectionRenderer";
import { NodeTreeListPanel } from "../src/components/inspector/panels/NodeTreeListPanel";
import { useNodeEditor } from "../src/contexts/composed/node-editor/context";
import { useNodeSelectionInteractions } from "../src/components/node/hooks/useNodeSelectionInteractions";
import { CanvasPointerActionProvider } from "../src/contexts/composed/canvas/pointer-action-provider";

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

type CommitCounters = {
  nodes: number;
  connections: number;
  inspector: number;
};

const createCommitCounters = (): CommitCounters => ({ nodes: 0, connections: 0, inspector: 0 });

const TestNodeLayer: React.FC<{ counters: CommitCounters }> = ({ counters }) => {
  const { sortedNodes } = useNodeEditor();
  const { handleNodePointerDown, handleNodeContextMenu } = useNodeSelectionInteractions();

  return (
    <div>
      {sortedNodes.map((node) => (
        <React.Profiler
          key={node.id}
          id={`node-${node.id}`}
          onRender={() => {
            counters.nodes++;
          }}
        >
          <NodeViewContainer
            node={node}
            isSelected={false}
            isDragging={false}
            onPointerDown={handleNodePointerDown}
            onContextMenu={handleNodeContextMenu}
          />
        </React.Profiler>
      ))}
    </div>
  );
};

const TestConnectionLayer: React.FC<{ counters: CommitCounters }> = ({ counters }) => {
  const { state: nodeEditorState } = useNodeEditor();
  const connections = Object.values(nodeEditorState.connections);

  return (
    <svg>
      {connections.map((connection) => (
        <React.Profiler
          key={connection.id}
          id={`connection-${connection.id}`}
          onRender={() => {
            counters.connections++;
          }}
        >
          <ConnectionRenderer connection={connection} />
        </React.Profiler>
      ))}
    </svg>
  );
};

describe("canvas pan render regression", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  it("does not commit NodeViewContainer / ConnectionRenderer / inspector layer items when panning", () => {
    const counters = createCommitCounters();

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
      connections: {
        c: {
          id: "c",
          fromNodeId: "a",
          fromPortId: "out",
          toNodeId: "b",
          toPortId: "in",
        },
      },
    };

    const { getByRole } = render(
      <NodeEditorCore initialData={initialData}>
        <CanvasPointerActionProvider>
          <CanvasBase>
            <TestConnectionLayer counters={counters} />
            <TestNodeLayer counters={counters} />
          </CanvasBase>
        </CanvasPointerActionProvider>
        <React.Profiler
          id="inspector-layers"
          onRender={() => {
            counters.inspector++;
          }}
        >
          <NodeTreeListPanel />
        </React.Profiler>
      </NodeEditorCore>,
    );

    const baseline = { ...counters };

    const canvas = getByRole("application", { name: "Node Editor Canvas" });
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      pointerType: "mouse",
      button: 1,
      buttons: 4,
      clientX: 10,
      clientY: 10,
    });
    for (const step of [1, 2, 3, 4, 5, 6]) {
      fireEvent.pointerMove(canvas, {
        pointerId: 1,
        pointerType: "mouse",
        buttons: 4,
        clientX: 10 + step * 5,
        clientY: 10 + step * 5,
      });
    }
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      pointerType: "mouse",
      button: 1,
      buttons: 0,
      clientX: 50,
      clientY: 50,
    });

    expect(counters.nodes).toBe(baseline.nodes);
    expect(counters.connections).toBe(baseline.connections);
    expect(counters.inspector).toBe(baseline.inspector);
  });
});
