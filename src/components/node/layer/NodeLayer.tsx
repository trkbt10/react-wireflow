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

  const handleNodePointerDownRef = React.useRef(handleNodePointerDown);
  handleNodePointerDownRef.current = handleNodePointerDown;
  const onNodePointerDown = React.useCallback((...args: Parameters<typeof handleNodePointerDown>) => {
    return handleNodePointerDownRef.current(...args);
  }, []);

  const handleNodeContextMenuRef = React.useRef(handleNodeContextMenu);
  handleNodeContextMenuRef.current = handleNodeContextMenu;
  const onNodeContextMenu = React.useCallback((...args: Parameters<typeof handleNodeContextMenu>) => {
    return handleNodeContextMenuRef.current(...args);
  }, []);

  // Port event handlers
  const {
    handlePortPointerDown,
    handlePortPointerUp,
    handlePortPointerEnter,
    handlePortPointerMove,
    handlePortPointerLeave,
    handlePortPointerCancel,
  } = useNodeLayerPorts();

  const handlePortPointerDownRef = React.useRef(handlePortPointerDown);
  handlePortPointerDownRef.current = handlePortPointerDown;
  const onPortPointerDown = React.useCallback((...args: Parameters<typeof handlePortPointerDown>) => {
    return handlePortPointerDownRef.current(...args);
  }, []);

  const handlePortPointerUpRef = React.useRef(handlePortPointerUp);
  handlePortPointerUpRef.current = handlePortPointerUp;
  const onPortPointerUp = React.useCallback((...args: Parameters<typeof handlePortPointerUp>) => {
    return handlePortPointerUpRef.current(...args);
  }, []);

  const handlePortPointerEnterRef = React.useRef(handlePortPointerEnter);
  handlePortPointerEnterRef.current = handlePortPointerEnter;
  const onPortPointerEnter = React.useCallback((...args: Parameters<typeof handlePortPointerEnter>) => {
    return handlePortPointerEnterRef.current(...args);
  }, []);

  const handlePortPointerMoveRef = React.useRef(handlePortPointerMove);
  handlePortPointerMoveRef.current = handlePortPointerMove;
  const onPortPointerMove = React.useCallback((...args: Parameters<typeof handlePortPointerMove>) => {
    return handlePortPointerMoveRef.current(...args);
  }, []);

  const handlePortPointerLeaveRef = React.useRef(handlePortPointerLeave);
  handlePortPointerLeaveRef.current = handlePortPointerLeave;
  const onPortPointerLeave = React.useCallback((...args: Parameters<typeof handlePortPointerLeave>) => {
    return handlePortPointerLeaveRef.current(...args);
  }, []);

  const handlePortPointerCancelRef = React.useRef(handlePortPointerCancel);
  handlePortPointerCancelRef.current = handlePortPointerCancel;
  const onPortPointerCancel = React.useCallback((...args: Parameters<typeof handlePortPointerCancel>) => {
    return handlePortPointerCancelRef.current(...args);
  }, []);

  useNodeLayerDrag(groupManager.moveGroupWithChildren);

  useNodeLayerConnections();

  const { hoveredPort, connectablePorts } = actionState;

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
            connectablePorts={connectablePorts}
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
