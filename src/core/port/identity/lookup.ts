/**
 * @file Port lookup utilities for creating fast access maps and cached port resolution
 */
import type { Node, Port, NodeId } from "../../../types/core";
import type { NodeDefinition } from "../../../types/NodeDefinition";
import type { PortKey } from "./key";
import { createPortKey } from "./key";
import { deriveNodePorts } from "../../node/portDerivation";

/**
 * Port resolver interface
 */
export type PortResolver = {
  /** Get all ports for a node */
  getNodePorts(node: Node, definition: NodeDefinition): Port[];
  /** Create a lookup map for all ports */
  createPortLookupMap(
    nodes: Record<NodeId, Node>,
    getDefinition: (type: string) => NodeDefinition | undefined,
  ): Map<PortKey, { node: Node; port: Port }>;
};

/**
 * Create a lookup map for quick port access
 * Key format: "nodeId:portId" (PortKey)
 */
export function createPortLookupMap(
  nodes: Record<NodeId, Node>,
  getDefinition: (type: string) => NodeDefinition | undefined,
): Map<PortKey, { node: Node; port: Port }> {
  const map = new Map<PortKey, { node: Node; port: Port }>();

  for (const node of Object.values(nodes)) {
    const definition = getDefinition(node.type);
    if (!definition) {
      continue;
    }

    const ports = deriveNodePorts(node, definition);
    for (const port of ports) {
      const key = createPortKey(node.id, port.id);
      map.set(key, { node, port });
    }
  }

  return map;
}

/**
 * Create port resolver with caching
 */
export function createCachedPortResolver(): PortResolver & {
  clearCache: () => void;
  clearNodeCache: (nodeId: NodeId) => void;
} {
  type PortCacheEntry = {
    nodeType: string;
    nodeData: Node["data"];
    definition: NodeDefinition;
    ports: Port[];
  };

  // Cache for resolved ports per node (keyed by nodeId, invalidated when node.type or node.data reference changes)
  const portCache = new Map<NodeId, PortCacheEntry>();

  return {
    getNodePorts(node: Node, definition: NodeDefinition): Port[] {
      const cacheKey = node.id;

      // Check cache first
      const cached = portCache.get(cacheKey);
      if (cached && cached.nodeType === node.type && cached.nodeData === node.data && cached.definition === definition) {
        return cached.ports;
      }

      // Resolve ports
      const ports = deriveNodePorts(node, definition);

      // Cache the result
      portCache.set(cacheKey, { nodeType: node.type, nodeData: node.data, definition, ports });

      return ports;
    },

    createPortLookupMap(
      nodes: Record<NodeId, Node>,
      getDefinition: (type: string) => NodeDefinition | undefined,
    ): Map<PortKey, { node: Node; port: Port }> {
      return createPortLookupMap(nodes, getDefinition);
    },

    clearCache() {
      portCache.clear();
    },

    clearNodeCache(nodeId: NodeId) {
      portCache.delete(nodeId);
    },
  };
}

/**
 * Default port resolver instance
 */
export const defaultPortResolver: PortResolver = {
  getNodePorts: deriveNodePorts,
  createPortLookupMap,
};
