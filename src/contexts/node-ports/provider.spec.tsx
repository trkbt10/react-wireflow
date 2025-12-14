/**
 * @file Tests for PortPositionProvider - validates incremental recomputation behavior.
 */
import { act, render } from "@testing-library/react";
import { useEffect, type FC, type MutableRefObject } from "react";
import { NodeDefinitionProvider } from "../node-definitions/provider";
import { asNodeDefinition, type NodeDefinition } from "../../types/NodeDefinition";
import { StandardNodeDefinition } from "../../node-definitions/standard";
import { NodeEditorProvider } from "../composed/node-editor/provider";
import { useNodeEditorApi } from "../composed/node-editor/context";
import { PortPositionProvider } from "./provider";
import type { NodeEditorData } from "../../types/core";
import type { NodePortPositions, PortPositionBehavior, PortPositionConfig, PortPositionNode } from "../../types/portPosition";

const testNodeDefinitions: NodeDefinition[] = [asNodeDefinition(StandardNodeDefinition)];

const makeData = (): NodeEditorData => ({
  nodes: {
    a: { id: "a", type: "standard", position: { x: 0, y: 0 }, data: { title: "A" } },
    b: { id: "b", type: "standard", position: { x: 200, y: 0 }, data: { title: "B" } },
  },
  connections: {},
});

type ActionsRef = MutableRefObject<ReturnType<typeof useNodeEditorApi>["actions"] | null>;

const ActionsCapture: FC<{ actionsRef: ActionsRef }> = ({ actionsRef }) => {
  const { actions } = useNodeEditorApi();
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions, actionsRef]);
  return null;
};

describe("PortPositionProvider", () => {
  it("recomputes only changed nodes on node data updates", async () => {
    const calledNodeIds: string[] = [];
    const actionsRef: ActionsRef = { current: null };

    const behavior: PortPositionBehavior = {
      computeNode: ({
        node,
        config,
        defaultCompute,
      }: {
        node: PortPositionNode;
        config: PortPositionConfig;
        defaultCompute: (nodeArg: PortPositionNode, configArg: PortPositionConfig) => NodePortPositions;
      }) => {
        calledNodeIds.push(node.id);
        return defaultCompute(node, config);
      },
    };

    render(
      <NodeDefinitionProvider nodeDefinitions={testNodeDefinitions}>
        <NodeEditorProvider initialState={makeData()}>
          <PortPositionProvider behavior={behavior}>
            <ActionsCapture actionsRef={actionsRef} />
          </PortPositionProvider>
        </NodeEditorProvider>
      </NodeDefinitionProvider>,
    );

    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const initialCalls = calledNodeIds.length;
    expect(actionsRef.current).not.toBeNull();

    await act(async () => {
      actionsRef.current!.updateNode("a", { data: { title: "A2" } });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    const newCalls = calledNodeIds.slice(initialCalls);
    expect(newCalls).toEqual(["a"]);
  });
});
