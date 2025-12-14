/**
 * @file Cached node-tree index helpers (parent → children).
 *
 * These helpers are optimized for repeated lookups during external-store
 * notifications: the index rebuilds once per `nodes` reference change.
 */
import type { Node, NodeId } from "../../../../types/core";

const ROOT_KEY = "__ROOT__" as const;
type ParentKey = NodeId | typeof ROOT_KEY;

type NodeTreeIndexCache = {
  lastNodes: Record<NodeId, Node> | null;
  childIdsByParent: Map<ParentKey, readonly NodeId[]>;
};

const cache: NodeTreeIndexCache = {
  lastNodes: null,
  childIdsByParent: new Map<ParentKey, readonly NodeId[]>(),
};

function compareNodesForTree(a: Node, b: Node): number {
  const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
  const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
  if (ao !== bo) {
    return ao - bo;
  }
  const ta = a.data?.title || "";
  const tb = b.data?.title || "";
  return ta.localeCompare(tb);
}

function rebuildIndex(nodes: Record<NodeId, Node>): Map<ParentKey, readonly NodeId[]> {
  const childIdsByParent = new Map<ParentKey, NodeId[]>();
  Object.values(nodes).forEach((node) => {
    const parentKey: ParentKey = node.parentId ?? ROOT_KEY;
    const list = childIdsByParent.get(parentKey);
    if (list) {
      list.push(node.id);
      return;
    }
    childIdsByParent.set(parentKey, [node.id]);
  });

  childIdsByParent.forEach((ids, parentKey) => {
    const sorted = [...ids].sort((aId, bId) => {
      const a = nodes[aId];
      const b = nodes[bId];
      if (!a || !b) {
        return 0;
      }
      return compareNodesForTree(a, b);
    });
    childIdsByParent.set(parentKey, sorted);
  });

  return childIdsByParent;
}

function ensureIndex(nodes: Record<NodeId, Node>): void {
  if (cache.lastNodes === nodes) {
    return;
  }
  cache.lastNodes = nodes;
  cache.childIdsByParent = rebuildIndex(nodes);
}

/**
 * Get sorted child node ids for a given parent id.
 *
 * Returned list is sorted by each node's `order`, then title.
 */
export function getSortedChildNodeIds(nodes: Record<NodeId, Node>, parentId: NodeId): readonly NodeId[] {
  ensureIndex(nodes);
  return cache.childIdsByParent.get(parentId) ?? [];
}

/**
 * Root nodes are those without a parent id.
 * Returned list is sorted by each node's `order`, then title.
 */
export function getSortedRootNodeIds(nodes: Record<NodeId, Node>): readonly NodeId[] {
  ensureIndex(nodes);
  return cache.childIdsByParent.get(ROOT_KEY) ?? [];
}
