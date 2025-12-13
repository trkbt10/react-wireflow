/**
 * @file Main node layer rendering and interaction handler for the node editor canvas.
 */
import * as React from "react";
import {
  useEditorActionState,
  useSelectedNodeIdsSet,
} from "../../../contexts/composed/EditorActionStateContext";
import {
  useCanvasInteractionState,
  useDragNodeIdsSets,
} from "../../../contexts/composed/canvas/interaction/context";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { useGroupManagement } from "../../../contexts/composed/node-editor/hooks/useGroupManagement";
import { useNodeResize } from "../../../contexts/composed/canvas/interaction/hooks/useNodeResize";
import { useVisibleNodes } from "../../../contexts/composed/canvas/viewport/hooks/useVisibleNodes";
import styles from "./NodeLayer.module.css";
import { useRenderers } from "../../../contexts/RendererContext";
import { useNodeLayerDrag } from "./useNodeLayerDrag";
import { useNodeLayerConnections } from "./useNodeLayerConnections";
import { useNodeLayerPorts } from "./useNodeLayerPorts";
import { useNodeSelectionInteractions } from "../hooks/useNodeSelectionInteractions";
import { useNodeCanvasGridSettings } from "../../../contexts/composed/canvas/viewport/context";

export type NodeLayerProps = {
  doubleClickToEdit?: boolean;
};

/**
 * NodeLayer - Renders all nodes with optimized performance
 */
export const NodeLayer: React.FC<NodeLayerProps> = ({ doubleClickToEdit }) => {
  void doubleClickToEdit;
  const { sortedNodes, connectedPorts } = useNodeEditor();
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const interactionState = useCanvasInteractionState();
  const gridSettings = useNodeCanvasGridSettings();
  const { node: NodeComponent } = useRenderers();

  // Initialize hooks
  useNodeResize({
    minWidth: 100,
    minHeight: 40,
    snapToGrid: gridSettings.snapToGrid,
    gridSize: gridSettings.size,
  });

  const groupManager = useGroupManagement({
    autoUpdateMembership: true,
    membershipUpdateDelay: 200,
  });

  // Get only visible nodes for virtualization
  const visibleNodes = useVisibleNodes(sortedNodes);

  // Update connected ports in action state only when changed
  React.useEffect(() => {
    actionActions.updateConnectedPorts(connectedPorts);
  }, [connectedPorts, actionActions]);

  const { handleNodePointerDown, handleNodeContextMenu } = useNodeSelectionInteractions({
    getGroupChildren: groupManager.getGroupChildren,
  });

  // Port event handlers
  const {
    handlePortPointerDown,
    handlePortPointerUp,
    handlePortPointerEnter,
    handlePortPointerMove,
    handlePortPointerLeave,
    handlePortPointerCancel,
  } = useNodeLayerPorts();

  useNodeLayerDrag(groupManager.moveGroupWithChildren);

  useNodeLayerConnections();

  const { hoveredPort, connectablePorts } = actionState;
  const { dragState, connectionDragState } = interactionState;

  // Use shared memoized Sets from context
  const selectedNodeIdsSet = useSelectedNodeIdsSet();
  const dragNodeIdsSets = useDragNodeIdsSets();

  return (
    <div className={styles.nodeLayer} data-node-layer>
      {visibleNodes.map((node) => {
        // O(1) lookup using shared Sets from context
        const isDirectlyDragging = dragNodeIdsSets?.directlyDraggedNodeIds.has(node.id) ?? false;
        const isInDragState = isDirectlyDragging || (dragNodeIdsSets?.affectedChildNodeIds.has(node.id) ?? false);
        const dragOffset = isInDragState && dragState ? dragState.offset : undefined;

        return (
          <NodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeIdsSet.has(node.id)}
            isDragging={isDirectlyDragging}
            dragOffset={dragOffset}
            onPointerDown={handleNodePointerDown}
            onContextMenu={handleNodeContextMenu}
            onPortPointerDown={handlePortPointerDown}
            onPortPointerUp={handlePortPointerUp}
            onPortPointerEnter={handlePortPointerEnter}
            onPortPointerMove={handlePortPointerMove}
            onPortPointerLeave={handlePortPointerLeave}
            onPortPointerCancel={handlePortPointerCancel}
            connectablePorts={connectablePorts}
            connectingPort={connectionDragState?.fromPort}
            hoveredPort={hoveredPort ?? undefined}
            connectedPorts={connectedPorts}
            candidatePortId={connectionDragState?.candidatePort?.id}
          />
        );
      })}
    </div>
  );
};

NodeLayer.displayName = "NodeLayer";
