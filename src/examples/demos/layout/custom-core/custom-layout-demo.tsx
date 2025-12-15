/**
 * @file Custom Layout Demo
 * @description
 * Demonstrates how to use NodeEditorCore and NodeEditorCanvas
 * to build a custom layout without depending on the built-in GridLayout system.
 */
import * as React from "react";
import {
  NodeEditorCore,
  NodeEditorCanvas,
  createNodeDefinition,
  SettingsManager,
  type NodeEditorData,
} from "../../../../core";
import { NodeCanvas } from "../../../../components/canvas/NodeCanvas";
import {
  InspectorDefinitionItem,
  InspectorDefinitionList,
  InspectorSection,
  InspectorSectionTitle,
  ReadOnlyField,
} from "../../../../inspector";
import { ExampleLayout } from "../../shared/parts/ExampleLayout";
import { ExampleWrapper } from "../../shared/parts/ExampleWrapper";
import {
  ThreePaneLayout,
  ThreePaneLayoutCanvasFrame,
  ThreePaneLayoutCenter,
  ThreePaneLayoutLeft,
  ThreePaneLayoutRight,
  ThreePaneLayoutStack,
} from "../../../layouts/ThreePaneLayout";

// Define some sample node types
const sampleNodeDefinitions = [
  createNodeDefinition({
    type: "input",
    displayName: "Input Node",
    defaultSize: { width: 200, height: 100 },
    ports: [
      {
        id: "out",
        type: "output",
        label: "Output",
        position: "right",
      },
    ],
  }),
  createNodeDefinition({
    type: "process",
    displayName: "Process Node",
    defaultSize: { width: 220, height: 120 },
    ports: [
      {
        id: "in",
        type: "input",
        label: "Input",
        position: "left",
      },
      {
        id: "out",
        type: "output",
        label: "Output",
        position: "right",
      },
    ],
  }),
  createNodeDefinition({
    type: "output",
    displayName: "Output Node",
    defaultSize: { width: 200, height: 100 },
    ports: [
      {
        id: "in",
        type: "input",
        label: "Input",
        position: "left",
      },
    ],
  }),
];

// Initial editor data
const initialData: Partial<NodeEditorData> = {
  nodes: {
    "node-1": {
      id: "node-1",
      type: "input",
      position: { x: 100, y: 100 },
      data: {},
    },
    "node-2": {
      id: "node-2",
      type: "process",
      position: { x: 400, y: 100 },
      data: {},
    },
    "node-3": {
      id: "node-3",
      type: "output",
      position: { x: 700, y: 100 },
      data: {},
    },
  },
  connections: {
    "conn-1": {
      id: "conn-1",
      fromNodeId: "node-1",
      fromPortId: "out",
      toNodeId: "node-2",
      toPortId: "in",
    },
    "conn-2": {
      id: "conn-2",
      fromNodeId: "node-2",
      fromPortId: "out",
      toNodeId: "node-3",
      toPortId: "in",
    },
  },
};

/**
 * CustomLayoutDemo - Example of using NodeEditorCore and NodeEditorCanvas
 * with a custom layout system (flexbox in this case)
 */
export const CustomLayoutDemo: React.FC = () => {
  const [data, setData] = React.useState<NodeEditorData | undefined>();

  // Create SettingsManager with split view mode for node search menu
  const settingsManager = React.useMemo(() => {
    const settings = new SettingsManager();
    settings.setValue("behavior.nodeSearchViewMode", "split");
    return settings;
  }, []);

  const nodeCount = React.useMemo(() => (data ? Object.keys(data.nodes).length : 0), [data]);
  const connectionCount = React.useMemo(() => (data ? Object.keys(data.connections).length : 0), [data]);

  const nodeListItems = React.useMemo(
    () =>
      sampleNodeDefinitions.map((def) => (
        <ReadOnlyField key={def.type}>{def.displayName}</ReadOnlyField>
      )),
    [],
  );

  return (
    <ExampleLayout>
      <ExampleWrapper>
        <NodeEditorCore
          initialData={initialData}
          onDataChange={setData}
          nodeDefinitions={sampleNodeDefinitions}
          includeDefaultDefinitions={false}
          autoSaveEnabled={false}
          settingsManager={settingsManager}
        >
          <ThreePaneLayout>
            <ThreePaneLayoutLeft>
              <ThreePaneLayoutStack>
                <InspectorSection>
                  <InspectorSectionTitle>Layout</InspectorSectionTitle>
                  <ReadOnlyField>
                    This example composes <code>NodeEditorCore</code> + <code>NodeEditorCanvas</code> without GridLayout.
                  </ReadOnlyField>
                  <ReadOnlyField>Right-click on the canvas to open the node search menu.</ReadOnlyField>
                </InspectorSection>
                <InspectorSection>
                  <InspectorSectionTitle>Node Palette</InspectorSectionTitle>
                  {nodeListItems}
                </InspectorSection>
              </ThreePaneLayoutStack>
            </ThreePaneLayoutLeft>

            <ThreePaneLayoutCenter>
              <ThreePaneLayoutCanvasFrame>
                <NodeEditorCanvas>
                  <NodeCanvas />
                </NodeEditorCanvas>
              </ThreePaneLayoutCanvasFrame>
            </ThreePaneLayoutCenter>

            <ThreePaneLayoutRight>
              <ThreePaneLayoutStack>
                <InspectorSection>
                  <InspectorSectionTitle>Stats</InspectorSectionTitle>
                  <InspectorDefinitionList>
                    <InspectorDefinitionItem label="Nodes">{nodeCount}</InspectorDefinitionItem>
                    <InspectorDefinitionItem label="Connections">{connectionCount}</InspectorDefinitionItem>
                  </InspectorDefinitionList>
                </InspectorSection>
              </ThreePaneLayoutStack>
            </ThreePaneLayoutRight>
          </ThreePaneLayout>
        </NodeEditorCore>
      </ExampleWrapper>
    </ExampleLayout>
  );
};
