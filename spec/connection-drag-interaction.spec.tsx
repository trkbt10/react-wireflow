/**
 * @file Integration test for connection drag interaction.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import type { NodeDefinition } from "../src/types/NodeDefinition";
import type { NodeEditorData } from "../src/types/core";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { useCanvasInteractionState } from "../src/contexts/composed/canvas/interaction/context";

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

describe("connection drag interaction", () => {
  beforeAll(() => {
    ensurePointerCaptureApis();
  });

  const DisconnectProbe: React.FC = () => {
    const { connectionDisconnectState, connectionDragState } = useCanvasInteractionState();
    return (
      <div>
        <div data-testid="disconnect-state">{connectionDisconnectState ? "active" : "none"}</div>
        <div data-testid="drag-from-port">{connectionDragState ? `${connectionDragState.fromPort.type}:${connectionDragState.fromPort.id}` : "none"}</div>
      </div>
    );
  };

  it("creates a connection by dragging from output to input", async () => {
    const nodeDefinition: NodeDefinition = {
      type: "io",
      displayName: "IO",
      description: "IO test node",
      category: "Test",
      defaultData: { title: "IO" },
      defaultSize: { width: 100, height: 50 },
      behaviors: ["node"],
      ports: [
        { id: "in", type: "input", label: "in", position: "left" },
        { id: "out", type: "output", label: "out", position: "right" },
      ],
    };

    const initialData: NodeEditorData = {
      nodes: {
        a: {
          id: "a",
          type: "io",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "A" },
        },
        b: {
          id: "b",
          type: "io",
          position: { x: 200, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "B" },
        },
      },
      connections: {},
    };

    let lastData: NodeEditorData | null = null;
    const handleDataChange = (data: NodeEditorData) => {
      lastData = data;
    };

    const { container } = render(
      <NodeEditorCore
        initialData={initialData}
        onDataChange={handleDataChange}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
      >
        <NodeCanvas />
        <DisconnectProbe />
      </NodeEditorCore>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const fromPortEl = container.querySelector('[data-node-id="a"][data-port-id="out"]') as HTMLElement | null;
    const toPortEl = container.querySelector('[data-node-id="b"][data-port-id="in"]') as HTMLElement | null;
    expect(fromPortEl).not.toBeNull();
    expect(toPortEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(fromPortEl!, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 25,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 2,
        pointerType: "mouse",
        buttons: 1,
        clientX: 200,
        clientY: 25,
      });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 200,
        clientY: 25,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(lastData).not.toBeNull();
    expect(Object.keys(lastData!.connections).length).toBe(1);
  });

  it("creates a connection even when releasing quickly after move", async () => {
    const nodeDefinition: NodeDefinition = {
      type: "io",
      displayName: "IO",
      description: "IO test node",
      category: "Test",
      defaultData: { title: "IO" },
      defaultSize: { width: 100, height: 50 },
      behaviors: ["node"],
      ports: [
        { id: "in", type: "input", label: "in", position: "left" },
        { id: "out", type: "output", label: "out", position: "right" },
      ],
    };

    const initialData: NodeEditorData = {
      nodes: {
        a: {
          id: "a",
          type: "io",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "A" },
        },
        b: {
          id: "b",
          type: "io",
          position: { x: 200, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "B" },
        },
      },
      connections: {},
    };

    let lastData: NodeEditorData | null = null;
    const handleDataChange = (data: NodeEditorData) => {
      lastData = data;
    };

    const { container } = render(
      <NodeEditorCore
        initialData={initialData}
        onDataChange={handleDataChange}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
      >
        <NodeCanvas />
        <DisconnectProbe />
      </NodeEditorCore>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const fromPortEl = container.querySelector('[data-node-id="a"][data-port-id="out"]') as HTMLElement | null;
    expect(fromPortEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(fromPortEl!, {
        pointerId: 3,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 25,
      });
    });

    await act(async () => {
      // No rAF between move and up: simulate quick release.
      fireEvent.pointerMove(window, {
        pointerId: 3,
        pointerType: "mouse",
        buttons: 1,
        clientX: 200,
        clientY: 25,
      });
      fireEvent.pointerUp(window, {
        pointerId: 3,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 200,
        clientY: 25,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(lastData).not.toBeNull();
    expect(Object.keys(lastData!.connections).length).toBe(1);
  });

  it("creates a connection when dragging from input to output", async () => {
    const nodeDefinition: NodeDefinition = {
      type: "io",
      displayName: "IO",
      description: "IO test node",
      category: "Test",
      defaultData: { title: "IO" },
      defaultSize: { width: 100, height: 50 },
      behaviors: ["node"],
      ports: [
        { id: "in", type: "input", label: "in", position: "left" },
        { id: "out", type: "output", label: "out", position: "right" },
      ],
    };

    const initialData: NodeEditorData = {
      nodes: {
        a: {
          id: "a",
          type: "io",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "A" },
        },
        b: {
          id: "b",
          type: "io",
          position: { x: 200, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "B" },
        },
      },
      connections: {},
    };

    let lastData: NodeEditorData | null = null;
    const handleDataChange = (data: NodeEditorData) => {
      lastData = data;
    };

    const { container } = render(
      <NodeEditorCore
        initialData={initialData}
        onDataChange={handleDataChange}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
      >
        <NodeCanvas />
        <DisconnectProbe />
      </NodeEditorCore>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const fromPortEl = container.querySelector('[data-node-id="b"][data-port-id="in"]') as HTMLElement | null;
    expect(fromPortEl).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(fromPortEl!, {
        pointerId: 4,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 25,
      });
    });

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 4,
        pointerType: "mouse",
        buttons: 1,
        clientX: 100,
        clientY: 25,
      });
      fireEvent.pointerUp(window, {
        pointerId: 4,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 100,
        clientY: 25,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(lastData).not.toBeNull();
    expect(Object.keys(lastData!.connections).length).toBe(1);
  });

  it("can disconnect and then reconnect from input side", async () => {
    const nodeDefinition: NodeDefinition = {
      type: "io",
      displayName: "IO",
      description: "IO test node",
      category: "Test",
      defaultData: { title: "IO" },
      defaultSize: { width: 100, height: 50 },
      behaviors: ["node"],
      ports: [
        { id: "in", type: "input", label: "in", position: "left" },
        { id: "out", type: "output", label: "out", position: "right" },
      ],
    };

    const initialData: NodeEditorData = {
      nodes: {
        a: {
          id: "a",
          type: "io",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "A" },
        },
        b: {
          id: "b",
          type: "io",
          position: { x: 200, y: 0 },
          size: { width: 100, height: 50 },
          data: { title: "B" },
        },
      },
      connections: {
        c1: { id: "c1", fromNodeId: "a", fromPortId: "out", toNodeId: "b", toPortId: "in" },
      },
    };

    let lastData: NodeEditorData | null = null;
    const handleDataChange = (data: NodeEditorData) => {
      lastData = data;
    };

    const { container, getByTestId } = render(
      <NodeEditorCore
        initialData={initialData}
        onDataChange={handleDataChange}
        nodeDefinitions={[nodeDefinition]}
        includeDefaultDefinitions={true}
      >
        <NodeCanvas />
        <DisconnectProbe />
      </NodeEditorCore>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const inputEl = container.querySelector('[data-node-id="b"][data-port-id="in"]') as HTMLElement | null;
    expect(inputEl).not.toBeNull();

    // Trigger disconnect by moving beyond the threshold.
    await act(async () => {
      fireEvent.pointerDown(inputEl!, {
        pointerId: 5,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 25,
      });
    });

    await act(async () => {
      fireEvent.pointerMove(document, {
        pointerId: 5,
        pointerType: "mouse",
        buttons: 1,
        clientX: 200 + 50,
        clientY: 25,
      });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(lastData).not.toBeNull();
    expect(Object.keys(lastData!.connections).length).toBe(0);

    await act(async () => {
      fireEvent.pointerUp(window, {
        pointerId: 5,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 1000,
        clientY: 1000,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(getByTestId("disconnect-state").textContent).toBe("none");
    expect(lastData).not.toBeNull();
    expect(Object.keys(lastData!.connections).length).toBe(0);

    // Re-query the port element after state updates (it may be replaced on re-render).
    const inputElAfter = container.querySelector('[data-node-id="b"][data-port-id="in"]') as HTMLElement | null;
    expect(inputElAfter).not.toBeNull();

    // Now reconnect from input side to output.
    await act(async () => {
      fireEvent.pointerDown(inputElAfter!, {
        pointerId: 6,
        pointerType: "mouse",
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 25,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(getByTestId("drag-from-port").textContent).toBe("input:in");

    await act(async () => {
      fireEvent.pointerMove(window, {
        pointerId: 6,
        pointerType: "mouse",
        buttons: 1,
        clientX: 100,
        clientY: 25,
      });
      fireEvent.pointerUp(window, {
        pointerId: 6,
        pointerType: "mouse",
        button: 0,
        buttons: 0,
        clientX: 100,
        clientY: 25,
      });
    });

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(lastData).not.toBeNull();
    expect(Object.keys(lastData!.connections).length).toBe(1);
  });
});
