/**
 * @file NodeCanvas component
 */
import * as React from "react";
import { CanvasBase, type CanvasNodeDropEvent } from "./CanvasBase";
import { ConnectionLayer } from "../connection/ConnectionLayer";
import { NodeLayer } from "../node/layer/NodeLayer";
import { useNodeEditor } from "../../contexts/composed/node-editor/context";
import { CanvasPointerActionProvider } from "../../contexts/composed/canvas/pointer-action-provider";
import { useEditorActionState } from "../../contexts/composed/EditorActionStateContext";

export type NodeCanvasProps = {
  showGrid?: boolean;
  doubleClickToEdit?: boolean;
};

/**
 * NodeCanvas component that renders the canvas base, connection layer, and node layer.
 * Port positions and configuration should be provided via PortPositionProvider context.
 * Settings like showGrid and doubleClickToEdit are retrieved from NodeEditorContext if not provided.
 */
export const NodeCanvas: React.FC<NodeCanvasProps> = ({
  showGrid: showGridProp,
  doubleClickToEdit: doubleClickToEditProp,
}) => {
  const { settings } = useNodeEditor();
  const { nodeOperations } = useEditorActionState();

  const showGrid = showGridProp ?? settings.showGrid;
  const doubleClickToEdit = doubleClickToEditProp ?? settings.doubleClickToEdit;

  const handleNodeDrop = React.useCallback(
    (event: CanvasNodeDropEvent) => {
      nodeOperations.createNodeFromCanvasDrop(event.nodeType, event.canvasPosition);
    },
    [nodeOperations],
  );

  return (
    <CanvasPointerActionProvider>
      <CanvasBase showGrid={showGrid} onNodeDrop={handleNodeDrop}>
        <ConnectionLayer />
        <NodeLayer doubleClickToEdit={doubleClickToEdit} />
      </CanvasBase>
    </CanvasPointerActionProvider>
  );
};

/**
 * Debug notes:
 * - Reviewed src/NodeEditorContent.tsx to reuse node creation defaults and enforce per-flow limits when handling canvas drops.
 * - Reviewed src/components/shared/NodeSearchMenu.tsx after refactoring to keep inspector palette grouping consistent with context menu results.
 */
