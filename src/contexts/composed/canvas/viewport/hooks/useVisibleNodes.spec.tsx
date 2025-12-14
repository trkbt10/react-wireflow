/**
 * @file Tests for useVisibleNodes - validates viewBox-based visibility filtering.
 */
import { act, render } from "@testing-library/react";
import { useEffect, type FC } from "react";
import type { Node } from "../../../../../types/core";
import { useVisibleNodes } from "./useVisibleNodes";
import { useNodeCanvas } from "../context";
import { NodeCanvasProvider } from "../provider";
import { NodeEditorProvider } from "../../../node-editor/provider";
import { NodeDefinitionProvider } from "../../../../node-definitions/provider";

const nodes: readonly Node[] = [
  {
    id: "a",
    type: "node",
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    data: {},
  },
  {
    id: "b",
    type: "node",
    position: { x: 150, y: 0 },
    size: { width: 10, height: 10 },
    data: {},
  },
];

const Harness: FC = () => {
  const { actions } = useNodeCanvas();
  const visibleNodeIds = useVisibleNodes(
    nodes.map((n) => n.id),
    1,
  );

  useEffect(() => {
    actions.setViewBox({ width: 100, height: 100 });
    actions.setViewport({ offset: { x: 0, y: 0 }, scale: 1 });
  }, [actions]);

  return <div data-testid="ids">{visibleNodeIds.join(",")}</div>;
};

describe("useVisibleNodes", () => {
  it("uses canvas viewBox (not window) for visibility", async () => {
    const { getByTestId } = render(
      <NodeDefinitionProvider nodeDefinitions={[]}>
        <NodeEditorProvider
          initialState={{
            nodes: {
              a: nodes[0],
              b: nodes[1],
            },
            connections: {},
          }}
        >
          <NodeCanvasProvider>
            <Harness />
          </NodeCanvasProvider>
        </NodeEditorProvider>
      </NodeDefinitionProvider>,
    );
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });
    expect(getByTestId("ids").textContent).toBe("a");
  });
});
