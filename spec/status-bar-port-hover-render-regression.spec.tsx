/**
 * @file Render-regression test ensuring StatusBar does not commit on port hover/leave.
 */
import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { NodeEditorCore } from "../src/NodeEditorCore";
import { NodeCanvas } from "../src/components/canvas/NodeCanvas";
import { StatusBar } from "../src/components/layout/StatusBar";
import { StandardNodeDefinition } from "../src/node-definitions/standard";
import { asNodeDefinition } from "../src/types/NodeDefinition";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

describe("StatusBar port hover render regression", () => {
  it("does not commit StatusBar on port hover/leave", async () => {
    let commits = 0;

    const initialData = {
      nodes: {
        a: {
          id: "a",
          type: "standard",
          position: { x: 0, y: 0 },
          size: { width: 220, height: 72 },
          data: { title: "A", content: "" },
        },
      },
      connections: {},
    };

    const { container } = render(
      <NodeEditorCore initialData={initialData} nodeDefinitions={[asNodeDefinition(StandardNodeDefinition)]}>
        <NodeCanvas />
        <React.Profiler
          id="status-bar"
          onRender={() => {
            commits++;
          }}
        >
          <StatusBar />
        </React.Profiler>
      </NodeEditorCore>,
    );

    await nextFrame();

    const port = container.querySelector('[data-node-id="a"][data-port-id="output"]') as HTMLElement | null;
    expect(port).not.toBeNull();

    const baseline = commits;

    fireEvent.pointerEnter(port!, {
      pointerId: 1,
      pointerType: "mouse",
      buttons: 0,
      clientX: 10,
      clientY: 10,
    });

    await nextFrame();

    fireEvent.pointerLeave(port!, {
      pointerId: 1,
      pointerType: "mouse",
      buttons: 0,
      clientX: 10,
      clientY: 10,
    });

    await nextFrame();

    expect(commits).toBe(baseline);
  });
});
