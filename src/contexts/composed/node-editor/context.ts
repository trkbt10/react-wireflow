/**
 * @file Node editor context type definitions and hook for accessing editor state and utilities
 */
import * as React from "react";
import type { Node, NodeEditorData, NodeId, Port, Position, GridSettings } from "../../../types/core";
import { nodeEditorActions } from "./actions";
import type { NodeEditorAction } from "./actions";
import type { BoundActionCreators } from "../../../utils/typedActions";
import type { Settings } from "../../../hooks/useSettings";
import type { SettingsManager } from "../../../settings/SettingsManager";
import type { NodeDefinition } from "../../../types/NodeDefinition";
import { useExternalStoreSelector } from "../../../hooks/useExternalStoreSelector";

export type NodeEditorUtils = {
  /**
   * Snap a position to grid based on grid settings
   */
  snapToGrid: (position: Position, gridSettings: GridSettings) => Position;
  /**
   * Find which group (if any) a node should belong to
   */
  findContainingGroup: (node: Node, allNodes: Record<NodeId, Node>, nodeDefinitions: NodeDefinition[]) => NodeId | null;
  /**
   * Get all child nodes of a group
   */
  getGroupChildren: (groupId: NodeId, allNodes: Record<NodeId, Node>) => Node[];
  /**
   * Check if a node is inside a group's bounds
   */
  isNodeInsideGroup: (node: Node, groupNode: Node, nodeDefinitions: NodeDefinition[]) => boolean;
};

export type NodeEditorContextValue = {
  state: NodeEditorData;
  /**
   * Returns the latest state reference synchronously, even before React commits a render.
   * Useful for pointer handlers that must reflect immediate results (e.g. disconnect → reconnect).
   */
  getState: () => NodeEditorData;
  dispatch: React.Dispatch<NodeEditorAction>;
  actions: BoundActionCreators<typeof nodeEditorActions>;
  actionCreators: typeof nodeEditorActions;
  /**
   * Set of port keys ("nodeId:portId") that are part of any connection.
   * Do not mutate.
   */
  connectedPorts: Set<string>;
  /**
   * Per-node connected port ids (portId only; nodeId already known).
   * Values are stable references when contents are unchanged.
   * Do not mutate.
   */
  connectedPortIdsByNode: ReadonlyMap<NodeId, ReadonlySet<string>>;
  isLoading: boolean;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  /**
   * Returns ordered ports for a node, suitable for UI rendering.
   * Preserves definition order and applies node-specific overrides.
   */
  getNodePorts: (nodeId: NodeId) => Port[];
  /**
   * Returns the latest node reference from the current state (not memoized to render).
   * Useful for event handlers that need fresh data before React commits a render.
   */
  getNodeById: (nodeId: NodeId) => Node | undefined;
  settings: Settings;
  settingsManager?: SettingsManager;
  updateSetting: (key: string, value: unknown) => void;
  /**
   * Utility functions for common node editor operations
   * These should be used instead of directly importing from utils
   */
  utils: NodeEditorUtils;
};

export const NodeEditorContext = React.createContext<NodeEditorContextValue | null>(null);
NodeEditorContext.displayName = "NodeEditorContext";

export type NodeEditorStateChange = {
  action: NodeEditorAction;
  /** Node ids whose data/geometry/type may have changed */
  changedNodeIds: readonly NodeId[];
  /** Node ids removed from the graph */
  removedNodeIds: readonly NodeId[];
  /** True when consumers should recompute from scratch */
  fullResync: boolean;
  /** True when viewport visibility / geometry-dependent consumers should update */
  affectsGeometry: boolean;
  /** True when port structure/positions for changed nodes may have changed */
  affectsPorts: boolean;
  /** True when node ordering for rendering may have changed */
  affectsNodeOrder: boolean;
  /** True when connection-derived caches should update */
  affectsConnections: boolean;
};

export type NodeEditorApiValue = {
  dispatch: React.Dispatch<NodeEditorAction>;
  actions: BoundActionCreators<typeof nodeEditorActions>;
  getState: () => NodeEditorData;
  subscribe: (listener: () => void) => () => void;
  subscribeToChanges: (listener: (change: NodeEditorStateChange) => void) => () => void;
  getSortedNodeIds: () => NodeId[];
  subscribeToSortedNodeIds: (listener: () => void) => () => void;
  getConnectedPorts: () => Set<string>;
  getConnectedPortIdsByNode: () => ReadonlyMap<NodeId, ReadonlySet<string>>;
  subscribeToConnectionDerived: (listener: () => void) => () => void;
  getNodePorts: (nodeId: NodeId) => Port[];
  getNodeById: (nodeId: NodeId) => Node | undefined;
};

export const NodeEditorApiContext = React.createContext<NodeEditorApiValue | null>(null);
NodeEditorApiContext.displayName = "NodeEditorApiContext";

export const useNodeEditor = (): NodeEditorContextValue => {
  const context = React.useContext(NodeEditorContext);
  if (!context) {
    throw new Error("useNodeEditor must be used within a NodeEditorProvider");
  }
  return context;
};

export const useNodeEditorApi = (): NodeEditorApiValue => {
  const context = React.useContext(NodeEditorApiContext);
  if (!context) {
    throw new Error("useNodeEditorApi must be used within a NodeEditorProvider");
  }
  return context;
};

/**
 * Selects a derived value from the node editor state without forcing consumers
 * to re-render for unrelated state changes.
 */
export function useNodeEditorSelector<T>(
  selector: (state: NodeEditorData) => T,
  options?: { areEqual?: (a: T, b: T) => boolean },
): T {
  const { subscribe, getState } = useNodeEditorApi();
  return useExternalStoreSelector(subscribe, getState, selector, options);
}

/**
 * Subscribe to the stable, rendering-order node id list.
 * This list only updates when node ordering changes (e.g. add/remove/type change).
 */
export function useNodeEditorSortedNodeIds(): NodeId[] {
  const { subscribeToSortedNodeIds, getSortedNodeIds } = useNodeEditorApi();
  return useExternalStoreSelector(subscribeToSortedNodeIds, getSortedNodeIds, (ids) => ids);
}

/**
 * Subscribe to the derived connected port-key Set ("nodeId:portId").
 * Updates only when connections change.
 */
export function useNodeEditorConnectedPorts(): Set<string> {
  const { subscribeToConnectionDerived, getConnectedPorts } = useNodeEditorApi();
  return useExternalStoreSelector(subscribeToConnectionDerived, getConnectedPorts, (ports) => ports);
}

/**
 * Subscribe to per-node connected port id Sets (portId-only, keyed by nodeId).
 * Updates only when connections change.
 */
export function useNodeEditorConnectedPortIdsByNode(): ReadonlyMap<NodeId, ReadonlySet<string>> {
  const { subscribeToConnectionDerived, getConnectedPortIdsByNode } = useNodeEditorApi();
  return useExternalStoreSelector(subscribeToConnectionDerived, getConnectedPortIdsByNode, (map) => map);
}

export const useNodeEditorActions = () => {
  const { actions } = useNodeEditor();
  return actions;
};

export const useNodeEditorState = () => {
  const { state, actions } = useNodeEditor();
  return { state, actions };
};

export type { NodeEditorData };
