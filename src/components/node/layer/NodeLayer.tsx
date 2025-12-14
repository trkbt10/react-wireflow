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
import {
  useNodeEditorConnectedPortIdsByNode,
  useNodeEditorConnectedPorts,
  useNodeEditorSelector,
  useNodeEditorSortedNodeIds,
} from "../../../contexts/composed/node-editor/context";
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
import type { Port, Position } from "../../../types/core";
import type { ConnectablePortsResult } from "../../../core/port/connectivity/connectableTypes";
import type { NodeViewProps } from "../NodeView";

export type NodeLayerProps = {
  doubleClickToEdit?: boolean;
};

type NodeItemProps = {
  nodeId: string;
  isSelected: boolean;
  isDragging: boolean;
  dragOffset?: Position;
  onNodePointerDown: (e: React.PointerEvent, nodeId: string, isDragAllowed?: boolean) => void;
  onNodeContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onPortPointerDown: (e: React.PointerEvent, port: Port) => void;
  onPortPointerUp: (e: React.PointerEvent, port: Port) => void;
  onPortPointerEnter: (e: React.PointerEvent, port: Port) => void;
  onPortPointerMove: (e: React.PointerEvent, port: Port) => void;
  onPortPointerLeave: (e: React.PointerEvent, port: Port) => void;
  onPortPointerCancel: (e: React.PointerEvent, port: Port) => void;
  connectablePortsForNode: ConnectablePortsResult;
  connectingPortForNode?: Port;
  hoveredPortForNode?: Port;
  candidatePortIdForNode?: string;
  connectedPortIdsByNode: ReadonlyMap<string, ReadonlySet<string>>;
  NodeComponent: React.ComponentType<NodeViewProps>;
};

const NodeItemComponent: React.FC<NodeItemProps> = ({
  nodeId,
  isSelected,
  isDragging,
  dragOffset,
  onNodePointerDown,
  onNodeContextMenu,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerMove,
  onPortPointerLeave,
  onPortPointerCancel,
  connectablePortsForNode,
  connectingPortForNode,
  hoveredPortForNode,
  candidatePortIdForNode,
  connectedPortIdsByNode,
  NodeComponent,
}) => {
  const node = useNodeEditorSelector((state) => state.nodes[nodeId], { areEqual: (a, b) => a === b });
  if (!node) {
    return null;
  }

  return (
    <NodeComponent
      node={node}
      isSelected={isSelected}
      isDragging={isDragging}
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
};

const NodeItem = React.memo(NodeItemComponent);
NodeItem.displayName = "NodeItem";

/**
 * NodeLayer - Renders all nodes with optimized performance
 */
const NodeLayerComponent: React.FC<NodeLayerProps> = ({ doubleClickToEdit }) => {
  void doubleClickToEdit;
  const sortedNodeIds = useNodeEditorSortedNodeIds();
  const connectedPorts = useNodeEditorConnectedPorts();
  const connectedPortIdsByNode = useNodeEditorConnectedPortIdsByNode();
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
  const visibleNodeIds = useVisibleNodes(sortedNodeIds);

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
      {visibleNodeIds.map((nodeId) => {
        // O(1) lookup using shared Sets from context
        const isDirectlyDragging = dragNodeIdsSets?.directlyDraggedNodeIds.has(nodeId) ?? false;
        const isInDragState = isDirectlyDragging || (dragNodeIdsSets?.affectedChildNodeIds.has(nodeId) ?? false);
        const dragOffset = isInDragState && dragState ? dragState.offset : undefined;

        const hoveredPortForNode = hoveredPort?.nodeId === nodeId ? hoveredPort : undefined;

        const connectingPortForNode =
          connectionDragMeta?.fromPort.nodeId === nodeId ? connectionDragMeta.fromPort : undefined;

        const candidatePortIdForNode =
          connectionDragMeta?.candidatePortNodeId === nodeId ? connectionDragMeta.candidatePortId ?? undefined : undefined;

        const connectablePortsForNode = connectableNodeIds.has(nodeId) ? connectablePorts : EMPTY_CONNECTABLE_PORTS;

        return (
          <NodeItem
            key={nodeId}
            nodeId={nodeId}
            isSelected={selectedNodeIdsSet.has(nodeId)}
            isDragging={isDirectlyDragging}
            dragOffset={dragOffset}
            onNodePointerDown={onNodePointerDown}
            onNodeContextMenu={onNodeContextMenu}
            onPortPointerDown={onPortPointerDown}
            onPortPointerUp={onPortPointerUp}
            onPortPointerEnter={onPortPointerEnter}
            onPortPointerMove={onPortPointerMove}
            onPortPointerLeave={onPortPointerLeave}
            onPortPointerCancel={onPortPointerCancel}
            connectablePortsForNode={connectablePortsForNode}
            connectingPortForNode={connectingPortForNode}
            hoveredPortForNode={hoveredPortForNode}
            candidatePortIdForNode={candidatePortIdForNode}
            connectedPortIdsByNode={connectedPortIdsByNode}
            NodeComponent={NodeComponent}
          />
        );
      })}
    </div>
  );
};

export const NodeLayer = React.memo(NodeLayerComponent);

NodeLayer.displayName = "NodeLayer";
