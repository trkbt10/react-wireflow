/**
 * @file Main node layer rendering and interaction handler for the node editor canvas.
 */
import * as React from "react";
import {
  useEditorActionStateActions,
  useEditorActionStateState,
  useSelectedNodeIdsSet,
} from "../../../contexts/composed/EditorActionStateContext";
import {
  useCanvasInteractionConnectionDragMeta,
  useCanvasInteractionDragState,
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
import { EMPTY_CONNECTABLE_PORTS, isConnectablePortsEmpty } from "../../../core/port/connectivity/connectableTypes";
import { parsePortKey } from "../../../core/port/identity/key";
import { useStableCallback } from "../../../hooks/useStableCallback";

export type NodeLayerProps = {
  doubleClickToEdit?: boolean;
};

/**
 * NodeLayer - Renders all nodes with optimized performance
 */
const NodeLayerComponent: React.FC<NodeLayerProps> = ({ doubleClickToEdit }) => {
  void doubleClickToEdit;
  const { sortedNodes, connectedPorts, connectedPortIdsByNode } = useNodeEditor();
  const actionState = useEditorActionStateState();
  const { actions: actionActions } = useEditorActionStateActions();
  const dragState = useCanvasInteractionDragState();
  const connectionDragMeta = useCanvasInteractionConnectionDragMeta();
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
  const onNodePointerDown = useStableCallback(handleNodePointerDown);
  const onNodeContextMenu = useStableCallback(handleNodeContextMenu);

  // Port event handlers
  const {
    handlePortPointerDown,
    handlePortPointerUp,
    handlePortPointerEnter,
    handlePortPointerMove,
    handlePortPointerLeave,
    handlePortPointerCancel,
  } = useNodeLayerPorts();
  const onPortPointerDown = useStableCallback(handlePortPointerDown);
  const onPortPointerUp = useStableCallback(handlePortPointerUp);
  const onPortPointerEnter = useStableCallback(handlePortPointerEnter);
  const onPortPointerMove = useStableCallback(handlePortPointerMove);
  const onPortPointerLeave = useStableCallback(handlePortPointerLeave);
  const onPortPointerCancel = useStableCallback(handlePortPointerCancel);

  useNodeLayerDrag(groupManager.moveGroupWithChildren);

  useNodeLayerConnections();

  const { hoveredPort, connectablePorts } = actionState;
  const connectableNodeIds = React.useMemo(() => {
    if (isConnectablePortsEmpty(connectablePorts)) {
      return new Set<string>();
    }
    const nodeIds = new Set<string>();
    if (connectablePorts.descriptors.size > 0) {
      for (const descriptor of connectablePorts.descriptors.values()) {
        nodeIds.add(descriptor.nodeId);
      }
      return nodeIds;
    }
    for (const portKey of connectablePorts.ids) {
      const parsed = parsePortKey(portKey);
      if (parsed) {
        nodeIds.add(parsed.nodeId);
      }
    }
    return nodeIds;
  }, [connectablePorts]);

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

        const hoveredPortForNode = hoveredPort?.nodeId === node.id ? hoveredPort : undefined;

        const connectingPortForNode =
          connectionDragMeta?.fromPort.nodeId === node.id ? connectionDragMeta.fromPort : undefined;

        const candidatePortIdForNode =
          connectionDragMeta?.candidatePortNodeId === node.id ? connectionDragMeta.candidatePortId ?? undefined : undefined;

        const connectablePortsForNode = connectableNodeIds.has(node.id) ? connectablePorts : EMPTY_CONNECTABLE_PORTS;

        return (
          <NodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeIdsSet.has(node.id)}
            isDragging={isDirectlyDragging}
            dragOffset={dragOffset}
            onPointerDown={onNodePointerDown}
            onContextMenu={onNodeContextMenu}
            onPortPointerDown={onPortPointerDown}
            onPortPointerUp={onPortPointerUp}
            onPortPointerEnter={onPortPointerEnter}
            onPortPointerMove={onPortPointerMove}
            onPortPointerLeave={onPortPointerLeave}
            onPortPointerCancel={onPortPointerCancel}
            connectablePorts={connectablePortsForNode}
            connectingPort={connectingPortForNode}
            hoveredPort={hoveredPortForNode}
            connectedPortIds={connectedPortIdsByNode.get(node.id)}
            candidatePortId={candidatePortIdForNode}
          />
        );
      })}
    </div>
  );
};

export const NodeLayer = React.memo(NodeLayerComponent);

NodeLayer.displayName = "NodeLayer";
