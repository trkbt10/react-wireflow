/**
 * @file Core Only Example
 * @description
 * Demonstrates how to use NodeEditorCore alone without NodeEditorCanvas or GridLayout.
 * This is the most minimal setup, showing only the canvas with nodes and connections.
 */
import * as React from "react";
import {
  NodeEditorCore,
  createNodeDefinition,
  type NodeEditorData,
} from "../../../../core";
import { NodeCanvas } from "../../../../components/canvas/NodeCanvas";
import { InspectorSection, InspectorSectionTitle, ReadOnlyField } from "../../../../inspector";
import { ExampleLayout } from "../../shared/parts/ExampleLayout";
import { ExampleWrapper } from "../../shared/parts/ExampleWrapper";
import { TwoSideLayout, TwoSideLayoutCanvasFrame, TwoSideLayoutMain, TwoSideLayoutSidebar, TwoSideLayoutStack } from "../../../layouts/TwoSideLayout";

// Simple node definitions
const nodeDefinitions = [
  createNodeDefinition({
    type: "source",
    displayName: "Source",
    defaultSize: { width: 180, height: 80 },
    ports: [
      { id: "out", type: "output", label: "Out", position: "right" },
    ],
  }),
  createNodeDefinition({
    type: "transform",
    displayName: "Transform",
    defaultSize: { width: 200, height: 100 },
    ports: [
      { id: "in", type: "input", label: "In", position: "left" },
      { id: "out", type: "output", label: "Out", position: "right" },
    ],
  }),
  createNodeDefinition({
    type: "destination",
    displayName: "Destination",
    defaultSize: { width: 180, height: 80 },
    ports: [
      { id: "in", type: "input", label: "In", position: "left" },
    ],
  }),
];

// Initial data
const initialData: Partial<NodeEditorData> = {
  nodes: {
    "node-1": {
      id: "node-1",
      type: "source",
      position: { x: 100, y: 150 },
      data: {},
    },
    "node-2": {
      id: "node-2",
      type: "transform",
      position: { x: 400, y: 150 },
      data: {},
    },
    "node-3": {
      id: "node-3",
      type: "destination",
      position: { x: 720, y: 150 },
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
 * CoreOnlyExample - Minimal NodeEditorCore setup
 *
 * This example shows:
 * - NodeEditorCore provides all necessary contexts
 * - NodeCanvas renders the canvas directly
 * - No GridLayout, no NodeEditorCanvas, no panels
 * - Just the raw canvas with drag, pan, zoom, and connections
 */
export const CoreOnlyExample: React.FC = () => {
  return (
    <ExampleLayout>
      <ExampleWrapper>
        <TwoSideLayout>
          <TwoSideLayoutSidebar>
            <TwoSideLayoutStack>
              <InspectorSection>
                <InspectorSectionTitle>Core Only</InspectorSectionTitle>
                <ReadOnlyField>
                  Minimal setup using only <code>NodeEditorCore</code> + <code>NodeCanvas</code>.
                </ReadOnlyField>
              </InspectorSection>
              <InspectorSection>
                <InspectorSectionTitle>Controls</InspectorSectionTitle>
                <ReadOnlyField>Pan: drag canvas or Space + drag</ReadOnlyField>
                <ReadOnlyField>Zoom: scroll wheel</ReadOnlyField>
                <ReadOnlyField>Move node: drag node</ReadOnlyField>
                <ReadOnlyField>Connect: drag from port</ReadOnlyField>
              </InspectorSection>
            </TwoSideLayoutStack>
          </TwoSideLayoutSidebar>
          <TwoSideLayoutMain>
            <TwoSideLayoutCanvasFrame>
              <NodeEditorCore
                initialData={initialData}
                nodeDefinitions={nodeDefinitions}
                includeDefaultDefinitions={false}
                autoSaveEnabled={false}
              >
                <NodeCanvas />
              </NodeEditorCore>
            </TwoSideLayoutCanvasFrame>
          </TwoSideLayoutMain>
        </TwoSideLayout>
      </ExampleWrapper>
    </ExampleLayout>
  );
};
