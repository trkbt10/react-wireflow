/**
 * @file Render optimization utilities using memoization for the node editor
 * Provides custom equality functions and hooks for optimizing React component re-renders
 * during node and connection rendering, especially for performance-critical drag operations
 */
import * as React from "react";
import { Node, Connection, NodeId, ConnectionId } from "../../../../types/core";
import type { NodeDefinition } from "../../../../types/NodeDefinition";
import { nodeHasGroupBehavior } from "../../../../types/behaviors";
import { hasPositionChanged, hasSizeChanged } from "../../../../core/geometry/comparators";
import { hasNodeIdentityChanged, hasNodeStateChanged } from "../../../../core/node/comparators";
import { createPortKey } from "../../../../core/port/identity/key";

/**
 * Custom equality function for nodes that ignores position changes during drag
 */
export function areNodesEqual(prevNode: Node, nextNode: Node, isDragging: boolean): boolean {
  if (!isDragging) {
    return prevNode === nextNode;
  }

  // During drag, ignore position changes but check identity, size, and state
  if (hasNodeIdentityChanged(prevNode, nextNode)) {return false;}
  if (hasSizeChanged(prevNode.size, nextNode.size)) {return false;}
  if (hasNodeStateChanged(prevNode, nextNode)) {return false;}

  // Additional state checks not covered by core utilities
  return (
    prevNode.data === nextNode.data &&
    prevNode.visible === nextNode.visible &&
    prevNode.expanded === nextNode.expanded
  );
}

/**
 * Custom equality function for connections that considers endpoint positions
 */
export function areConnectionsEqual(
  prevConnection: Connection,
  nextConnection: Connection,
  prevNodes: Record<NodeId, Node>,
  nextNodes: Record<NodeId, Node>,
): boolean {
  // Basic connection equality
  if (prevConnection !== nextConnection) {
    return false;
  }

  // Check if endpoint nodes have moved
  const prevFromNode = prevNodes[prevConnection.fromNodeId];
  const nextFromNode = nextNodes[nextConnection.fromNodeId];
  const prevToNode = prevNodes[prevConnection.toNodeId];
  const nextToNode = nextNodes[nextConnection.toNodeId];

  if (!prevFromNode || !nextFromNode || !prevToNode || !nextToNode) {
    return false;
  }

  // Check if positions or sizes have changed
  if (hasPositionChanged(prevFromNode.position, nextFromNode.position)) {return false;}
  if (hasPositionChanged(prevToNode.position, nextToNode.position)) {return false;}
  if (hasSizeChanged(prevFromNode.size, nextFromNode.size)) {return false;}
  if (hasSizeChanged(prevToNode.size, nextToNode.size)) {return false;}

  return true;
}

/**
 * Memoized sorted nodes calculation
 */
export function useSortedNodes(nodes: Record<NodeId, Node>, nodeDefinitions: NodeDefinition[]): Node[] {
  return React.useMemo(() => {
    return Object.values(nodes).sort((a, b) => {
      // Groups go to back
      const aIsGroup = nodeHasGroupBehavior(a, nodeDefinitions);
      const bIsGroup = nodeHasGroupBehavior(b, nodeDefinitions);
      if (aIsGroup && !bIsGroup) {
        return -1;
      }
      if (!aIsGroup && bIsGroup) {
        return 1;
      }

      // Within same type, sort by ID for stable ordering
      return a.id.localeCompare(b.id);
    });
  }, [nodes, nodeDefinitions]);
}

/**
 * Memoized connected ports calculation
 */
export function useConnectedPorts(connections: Record<ConnectionId, Connection>): Set<string> {
  return React.useMemo(() => {
    const connectedPorts = new Set<string>();
    Object.values(connections).forEach((connection) => {
      connectedPorts.add(createPortKey(connection.fromNodeId, connection.fromPortId));
      connectedPorts.add(createPortKey(connection.toNodeId, connection.toPortId));
    });
    return connectedPorts;
  }, [connections]);
}

/**
 * Create a memoized component with custom comparison
 */
export function createMemoizedComponent<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean,
): React.ComponentType<P> {
  return React.memo(Component, propsAreEqual);
}
