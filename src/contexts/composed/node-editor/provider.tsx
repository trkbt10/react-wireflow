/**
 * @file Node editor provider
 * Provides the node editor context with state management, actions, and utility functions
 * Supports both controlled and uncontrolled modes with auto-save capabilities
 */
import * as React from "react";
import type { NodeEditorData, NodeId, Port } from "../../../types/core";
import { useSettings } from "../../../hooks/useSettings";
import type { SettingsManager } from "../../../settings/SettingsManager";
import type { SettingValue } from "../../../settings/types";
import { createCachedPortResolver } from "../../../core/port/identity/lookup";
import { NodeDefinitionContext } from "../../node-definitions/context";
import { bindActionCreators } from "../../../utils/typedActions";
import { nodeEditorActions, type NodeEditorAction } from "./actions";
import { nodeEditorReducer, defaultNodeEditorData } from "./reducer";
import { NodeEditorContext } from "./context";
import { snapToGrid } from "./utils/gridSnap";
import { findContainingGroup, getGroupChildren, isNodeInsideGroup } from "./utils/groupOperations";
import { useStabilizedControlledData, areNodeEditorDataEqual } from "./utils/controlledData";
import { hasGroupBehavior, nodeHasGroupBehavior } from "../../../types/behaviors";
import { createPortKey } from "../../../core/port/identity/key";
import type { NodeEditorApiValue } from "./context";
import { NodeEditorApiContext } from "./context";
import type { Node } from "../../../types/core";
import type { NodeEditorStateChange } from "./context";
import { useListenerCollection } from "../../../hooks/useListenerCollection";

const areNodeIdListsEqual = (a: readonly string[], b: readonly string[]): boolean => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const computeSortedNodeIds = (nodes: Record<string, Node>, groupTypes: ReadonlySet<string>): string[] => {
  return Object.values(nodes)
    .sort((a, b) => {
      const aGroup = groupTypes.has(a.type);
      const bGroup = groupTypes.has(b.type);
      if (aGroup && !bGroup) {
        return -1;
      }
      if (!aGroup && bGroup) {
        return 1;
      }
      return a.id.localeCompare(b.id);
    })
    .map((n) => n.id);
};

const computeConnectedPorts = (connections: NodeEditorData["connections"]): Set<string> => {
  const connectedPorts = new Set<string>();
  Object.values(connections).forEach((connection) => {
    connectedPorts.add(createPortKey(connection.fromNodeId, connection.fromPortId));
    connectedPorts.add(createPortKey(connection.toNodeId, connection.toPortId));
  });
  return connectedPorts;
};

const arePortIdSetsEqual = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const id of a) {
    if (!b.has(id)) {
      return false;
    }
  }
  return true;
};

const computeConnectedPortIdsByNode = (
  connections: NodeEditorData["connections"],
  previous: ReadonlyMap<string, ReadonlySet<string>>,
): ReadonlyMap<string, ReadonlySet<string>> => {
  const nextByNode = new Map<string, Set<string>>();
  Object.values(connections).forEach((connection) => {
    const fromSet = nextByNode.get(connection.fromNodeId) ?? new Set<string>();
    fromSet.add(connection.fromPortId);
    nextByNode.set(connection.fromNodeId, fromSet);

    const toSet = nextByNode.get(connection.toNodeId) ?? new Set<string>();
    toSet.add(connection.toPortId);
    nextByNode.set(connection.toNodeId, toSet);
  });

  const stableNext = new Map<string, ReadonlySet<string>>();
  for (const [nodeId, nextSet] of nextByNode.entries()) {
    const prevSet = previous.get(nodeId);
    if (prevSet && arePortIdSetsEqual(prevSet, nextSet)) {
      stableNext.set(nodeId, prevSet);
    } else {
      stableNext.set(nodeId, nextSet);
    }
  }

  return stableNext;
};

export type NodeEditorProviderProps = {
  children: React.ReactNode;
  initialState?: Partial<NodeEditorData>;
  controlledData?: NodeEditorData;
  onDataChange?: (data: NodeEditorData) => void;
  onSave?: (data: NodeEditorData) => void | Promise<void>;
  onLoad?: () => NodeEditorData | Promise<NodeEditorData>;
  settingsManager?: SettingsManager;
  /** Enable/disable auto-save (overrides settings) */
  autoSaveEnabled?: boolean;
  /** Auto-save interval in seconds (overrides settings) */
  autoSaveInterval?: number;
};

export const NodeEditorProvider: React.FC<NodeEditorProviderProps> = ({
  children,
  initialState,
  controlledData,
  onDataChange,
  onLoad,
  onSave,
  settingsManager,
  autoSaveEnabled,
  autoSaveInterval,
}) => {
  const { registry } = React.useContext(NodeDefinitionContext);
  const portResolver = React.useMemo(() => createCachedPortResolver(), []);
  const portResolverRef = React.useRef(portResolver);
  portResolverRef.current = portResolver;
  const storeListeners = useListenerCollection();
  const changeListeners = useListenerCollection<[NodeEditorStateChange]>();
  const sortedNodeIdsListeners = useListenerCollection();
  const connectionDerivedListeners = useListenerCollection();

  const subscribe = storeListeners.subscribe;
  const notifySubscribers = storeListeners.notify;
  const subscribeToChanges = changeListeners.subscribe;
  const notifyChangeSubscribers = changeListeners.notify;
  const subscribeToSortedNodeIds = sortedNodeIdsListeners.subscribe;
  const notifySortedNodeIdsSubscribers = sortedNodeIdsListeners.notify;
  const subscribeToConnectionDerived = connectionDerivedListeners.subscribe;
  const notifyConnectionDerivedSubscribers = connectionDerivedListeners.notify;

  const pendingControlledStateRef = React.useRef<NodeEditorData | null>(null);
  const [controlledRenderTick, setControlledRenderTick] = React.useState(0);

  const initialData: NodeEditorData = React.useMemo(() => {
    return {
      nodes: initialState?.nodes || defaultNodeEditorData.nodes,
      connections: initialState?.connections || defaultNodeEditorData.connections,
    };
  }, [initialState]);

  const stabilizedControlledData = useStabilizedControlledData(controlledData);

  const nodeDefinitions = React.useMemo(() => registry.getAll(), [registry]);

  const groupNodeTypes = React.useMemo(() => {
    const groupTypes = new Set<string>();
    nodeDefinitions.forEach((definition) => {
      if (hasGroupBehavior(definition)) {
        groupTypes.add(definition.type);
      }
    });
    return groupTypes;
  }, [nodeDefinitions]);
  const groupNodeTypesRef = React.useRef(groupNodeTypes);
  groupNodeTypesRef.current = groupNodeTypes;

  const reducerWithDefinitions = React.useCallback(
    (state: NodeEditorData, action: NodeEditorAction) => nodeEditorReducer(state, action, nodeDefinitions),
    [nodeDefinitions],
  );

  const [internalState, internalDispatch] = React.useReducer(reducerWithDefinitions, initialData);
  const baseState = stabilizedControlledData || internalState;
  const isControlled = Boolean(stabilizedControlledData);
  const state = isControlled ? pendingControlledStateRef.current || baseState : internalState;
  // Keep latest state and IO handlers in refs to avoid unstable callbacks/effects
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const onDataChangeRef = React.useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;
  const onLoadRef = React.useRef(onLoad);
  onLoadRef.current = onLoad;
  const nodeDefinitionsRef = React.useRef(nodeDefinitions);
  nodeDefinitionsRef.current = nodeDefinitions;

  const sortedNodeIdsRef = React.useRef<string[]>(computeSortedNodeIds(state.nodes, groupNodeTypesRef.current));

  const connectedPortsRef = React.useRef<Set<string>>(computeConnectedPorts(state.connections));
  const connectedPortIdsByNodeRef = React.useRef<ReadonlyMap<string, ReadonlySet<string>>>(
    computeConnectedPortIdsByNode(state.connections, new Map()),
  );

  React.useEffect(() => {
    const next = computeSortedNodeIds(stateRef.current.nodes, groupNodeTypesRef.current);
    if (areNodeIdListsEqual(sortedNodeIdsRef.current, next)) {
      return;
    }
    sortedNodeIdsRef.current = next;
    notifySortedNodeIdsSubscribers();
  }, [groupNodeTypes, notifySortedNodeIdsSubscribers]);

  const getSortedNodeIds = React.useCallback(() => sortedNodeIdsRef.current, []);
  const getConnectedPorts = React.useCallback(() => connectedPortsRef.current, []);
  const getConnectedPortIdsByNode = React.useCallback(() => connectedPortIdsByNodeRef.current, []);

  const doesActionAffectNodeOrder = React.useCallback((action: NodeEditorAction): boolean => {
    if (action.type === "ADD_NODE") {
      return true;
    }
    if (action.type === "ADD_NODE_WITH_ID") {
      return true;
    }
    if (action.type === "DELETE_NODE") {
      return true;
    }
    if (action.type === "DUPLICATE_NODES") {
      return true;
    }
    if (action.type === "PASTE_NODES") {
      return true;
    }
    if (action.type === "GROUP_NODES") {
      return true;
    }
    if (action.type === "UNGROUP_NODE") {
      return true;
    }
    if (action.type === "SET_NODE_DATA") {
      return true;
    }
    if (action.type === "RESTORE_STATE") {
      return true;
    }
    if (action.type === "UPDATE_NODE") {
      const { updates } = action.payload;
      return Object.prototype.hasOwnProperty.call(updates, "type");
    }
    return false;
  }, []);

  const buildChangeSummary = React.useCallback(
    (previous: NodeEditorData, next: NodeEditorData, action: NodeEditorAction): NodeEditorStateChange => {
      const affectsConnections = previous.connections !== next.connections;
      const affectsNodeOrder = doesActionAffectNodeOrder(action);

      const fullResync = action.type === "SET_NODE_DATA" || action.type === "RESTORE_STATE";
      const affectsGeometry = (() => {
        if (fullResync) {
          return true;
        }
        if (action.type === "ADD_NODE" || action.type === "ADD_NODE_WITH_ID" || action.type === "DELETE_NODE") {
          return true;
        }
        if (action.type === "MOVE_NODE" || action.type === "MOVE_NODES" || action.type === "MOVE_GROUP_WITH_CHILDREN") {
          return true;
        }
        if (action.type === "UPDATE_NODE") {
          const { updates } = action.payload;
          return (
            Object.prototype.hasOwnProperty.call(updates, "position") ||
            Object.prototype.hasOwnProperty.call(updates, "size") ||
            Object.prototype.hasOwnProperty.call(updates, "visible")
          );
        }
        if (action.type === "GROUP_NODES" || action.type === "UNGROUP_NODE") {
          return true;
        }
        if (action.type === "DUPLICATE_NODES" || action.type === "PASTE_NODES") {
          return true;
        }
        return false;
      })();

      const affectsPorts = (() => {
        if (fullResync) {
          return true;
        }
        if (action.type === "ADD_NODE" || action.type === "ADD_NODE_WITH_ID" || action.type === "DELETE_NODE") {
          return true;
        }
        if (action.type === "GROUP_NODES" || action.type === "UNGROUP_NODE") {
          return true;
        }
        if (action.type === "DUPLICATE_NODES" || action.type === "PASTE_NODES") {
          return true;
        }
        if (action.type === "UPDATE_NODE") {
          // Port resolution may depend on node data, type, or explicit port overrides.
          return true;
        }
        return false;
      })();

      const removedNodeIds = (() => {
        if (action.type === "DELETE_NODE") {
          return [action.payload.nodeId] as const;
        }
        if (action.type === "UNGROUP_NODE") {
          return [action.payload.groupId] as const;
        }
        return [] as const;
      })();

      const changedNodeIds = (() => {
        if (fullResync) {
          return [] as const;
        }
        if (action.type === "ADD_NODE_WITH_ID") {
          return [action.payload.node.id] as const;
        }
        if (action.type === "DELETE_NODE") {
          return [action.payload.nodeId] as const;
        }
        if (action.type === "MOVE_NODE") {
          return [action.payload.nodeId] as const;
        }
        if (action.type === "MOVE_NODES") {
          return Object.keys(action.payload.updates);
        }
        if (action.type === "MOVE_GROUP_WITH_CHILDREN") {
          return action.payload.affectedNodeIds;
        }
        if (action.type === "UPDATE_GROUP_MEMBERSHIP") {
          return Object.keys(action.payload.updates);
        }
        if (action.type === "DUPLICATE_NODES") {
          // Duplicated nodes are added inside reducer with new ids; treat as full resync for downstream caches.
          return [] as const;
        }
        if (action.type === "PASTE_NODES") {
          return [] as const;
        }
        if (action.type === "GROUP_NODES") {
          return [] as const;
        }
        if (action.type === "UNGROUP_NODE") {
          return [action.payload.groupId] as const;
        }
        if (action.type === "UPDATE_NODE") {
          const { nodeId, updates } = action.payload;
          const prevNode = previous.nodes[nodeId];
          if (
            prevNode &&
            (Object.prototype.hasOwnProperty.call(updates, "visible") || Object.prototype.hasOwnProperty.call(updates, "locked")) &&
            nodeHasGroupBehavior(prevNode, nodeDefinitionsRef.current)
          ) {
            const changed: string[] = [];
            for (const id in next.nodes) {
              if (previous.nodes[id] !== next.nodes[id]) {
                changed.push(id);
              }
            }
            return changed;
          }
          return [nodeId] as const;
        }
        if (action.type === "ADD_NODE") {
          // Reducer generates id; detect the added id via diff (non-hot path).
          for (const id in next.nodes) {
            if (!Object.prototype.hasOwnProperty.call(previous.nodes, id)) {
              return [id] as const;
            }
          }
          return [] as const;
        }
        return [] as const;
      })();

      return {
        action,
        changedNodeIds,
        removedNodeIds,
        fullResync,
        affectsGeometry,
        affectsPorts,
        affectsNodeOrder,
        affectsConnections,
      };
    },
    [doesActionAffectNodeOrder],
  );

  // Stable dispatch that doesn't recreate per state change to reduce re-renders
  const dispatch: React.Dispatch<NodeEditorAction> = React.useCallback(
    (action: NodeEditorAction) => {
      const previousState = stateRef.current;
      if (isControlled) {
        const newState = nodeEditorReducer(stateRef.current, action, nodeDefinitionsRef.current);
        pendingControlledStateRef.current = newState;
        stateRef.current = newState;
        setControlledRenderTick((tick) => tick + 1);
        onDataChangeRef.current?.(newState);

        const change = buildChangeSummary(previousState, newState, action);
        if (change.affectsPorts) {
          if (change.fullResync) {
            portResolverRef.current.clearCache();
          } else {
            change.changedNodeIds.forEach((nodeId) => portResolverRef.current.clearNodeCache(nodeId));
            change.removedNodeIds.forEach((nodeId) => portResolverRef.current.clearNodeCache(nodeId));
          }
        }

        if (change.affectsConnections) {
          connectedPortsRef.current = computeConnectedPorts(newState.connections);
          connectedPortIdsByNodeRef.current = computeConnectedPortIdsByNode(
            newState.connections,
            connectedPortIdsByNodeRef.current,
          );
          notifyConnectionDerivedSubscribers();
        }

        if (change.affectsNodeOrder) {
          const nextSorted = computeSortedNodeIds(newState.nodes, groupNodeTypesRef.current);
          if (!areNodeIdListsEqual(sortedNodeIdsRef.current, nextSorted)) {
            sortedNodeIdsRef.current = nextSorted;
            notifySortedNodeIdsSubscribers();
          }
        }

        notifySubscribers();
        notifyChangeSubscribers(change);
        return;
      }
      // Uncontrolled: dispatch internally and notify external listener with computed next state
      const nextState = nodeEditorReducer(stateRef.current, action, nodeDefinitionsRef.current);
      stateRef.current = nextState;
      internalDispatch(action);
      onDataChangeRef.current?.(nextState);

      const change = buildChangeSummary(previousState, nextState, action);
      if (change.affectsPorts) {
        if (change.fullResync) {
          portResolverRef.current.clearCache();
        } else {
          change.changedNodeIds.forEach((nodeId) => portResolverRef.current.clearNodeCache(nodeId));
          change.removedNodeIds.forEach((nodeId) => portResolverRef.current.clearNodeCache(nodeId));
        }
      }

      if (change.affectsConnections) {
        connectedPortsRef.current = computeConnectedPorts(nextState.connections);
        connectedPortIdsByNodeRef.current = computeConnectedPortIdsByNode(
          nextState.connections,
          connectedPortIdsByNodeRef.current,
        );
        notifyConnectionDerivedSubscribers();
      }

      if (change.affectsNodeOrder) {
        const nextSorted = computeSortedNodeIds(nextState.nodes, groupNodeTypesRef.current);
        if (!areNodeIdListsEqual(sortedNodeIdsRef.current, nextSorted)) {
          sortedNodeIdsRef.current = nextSorted;
          notifySortedNodeIdsSubscribers();
        }
      }

      notifySubscribers();
      notifyChangeSubscribers(change);
    },
    [
      buildChangeSummary,
      isControlled,
      notifyChangeSubscribers,
      notifyConnectionDerivedSubscribers,
      notifySortedNodeIdsSubscribers,
      notifySubscribers,
    ],
  );

  React.useEffect(() => {
    if (!isControlled) {
      pendingControlledStateRef.current = null;
      return;
    }
    if (pendingControlledStateRef.current && stabilizedControlledData) {
      if (areNodeEditorDataEqual(pendingControlledStateRef.current, stabilizedControlledData)) {
        pendingControlledStateRef.current = null;
      }
    }
  }, [isControlled, stabilizedControlledData, controlledRenderTick]);

  React.useEffect(() => {
    if (!isControlled) {
      return;
    }
    if (pendingControlledStateRef.current) {
      return;
    }
    notifySubscribers();
  }, [isControlled, stabilizedControlledData, notifySubscribers]);

  const boundActions = React.useMemo(() => bindActionCreators(nodeEditorActions, dispatch), [dispatch]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const isSavingRef = React.useRef(false);
  React.useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const settings = useSettings(settingsManager);
  const { autoSave: settingsAutoSave, autoSaveInterval: settingsAutoSaveInterval } = settings;
  const effectiveAutoSave = autoSaveEnabled ?? settingsAutoSave;
  const effectiveAutoSaveInterval = autoSaveInterval ?? settingsAutoSaveInterval ?? 30;

  // Load once when registry is available; avoid effect-driven loops
  const hasLoadedRef = React.useRef(false);
  React.useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    if (!onLoadRef.current) {
      return;
    }
    // Wait until registry is available when we need it for migration/ports
    if (!registry) {
      return;
    }
    hasLoadedRef.current = true;
    setIsLoading(true);
    Promise.resolve(onLoadRef.current())
      .then((data) => {
        boundActions.setNodeData(data);
      })
      .catch((error) => {
        console.error("Failed to load node editor data:", error);
      })
      .finally(() => setIsLoading(false));
  }, [registry, boundActions]);

  // Notification for onDataChange is handled inside dispatch (both modes)
  // Additionally, fire a single initial notification in uncontrolled mode
  React.useEffect(() => {
    if (isControlled) {
      return;
    }
    onDataChangeRef.current?.(stateRef.current);
  }, []);
  // Stable save handler using refs to avoid re-creating on state changes
  const handleSave = React.useCallback(async () => {
    const save = onSaveRef.current;
    if (!save) {
      return;
    }
    if (isSavingRef.current) {
      return;
    }
    try {
      setIsSaving(true);
      isSavingRef.current = true;
      const dataToSave = stateRef.current;
      await Promise.resolve(save(dataToSave));
    } catch (error) {
      console.error("Failed to save node editor data:", error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  React.useEffect(() => {
    if (!effectiveAutoSave || !onSaveRef.current) {
      return;
    }
    const intervalId = setInterval(() => {
      // handleSave already checks saving state via ref
      handleSave();
    }, effectiveAutoSaveInterval * 1000);
    return () => clearInterval(intervalId);
  }, [effectiveAutoSave, effectiveAutoSaveInterval, handleSave]);

  const getNodePorts = React.useCallback(
    (nodeId: NodeId): Port[] => {
      const node = state.nodes[nodeId];
      if (!node) {
        return [];
      }
      const definition = registry.get(node.type);
      if (!definition) {
        throw new Error(`No node definition registered for type "${node.type}"`);
      }
      return portResolver.getNodePorts(node, definition);
    },
    [state.nodes, registry, portResolver],
  );

  const getState = React.useCallback(() => stateRef.current, []);

  const getNodeById = React.useCallback(
    (nodeId: NodeId) => {
      return stateRef.current.nodes[nodeId];
    },
    [],
  );

  const registryRef = React.useRef(registry);
  registryRef.current = registry;

  const lastControlledDerivedStateRef = React.useRef<{
    nodes: NodeEditorData["nodes"] | null;
    connections: NodeEditorData["connections"] | null;
  }>({ nodes: null, connections: null });

  React.useEffect(() => {
    if (!isControlled) {
      lastControlledDerivedStateRef.current = { nodes: null, connections: null };
      return;
    }

    const last = lastControlledDerivedStateRef.current;
    const nextNodes = state.nodes;
    const nextConnections = state.connections;

    const didConnectionsChange = last.connections !== nextConnections;
    if (didConnectionsChange) {
      connectedPortsRef.current = computeConnectedPorts(nextConnections);
      connectedPortIdsByNodeRef.current = computeConnectedPortIdsByNode(
        nextConnections,
        connectedPortIdsByNodeRef.current,
      );
      notifyConnectionDerivedSubscribers();
    }

    const didNodesChange = last.nodes !== nextNodes;
    if (didNodesChange) {
      // In controlled mode we don't have actions; validate existing order cheaply and only re-sort if needed.
      const existing = sortedNodeIdsRef.current;
      const isOrderStillValid = (() => {
        let hasSeenNonGroup = false;
        for (let i = 0; i < existing.length; i++) {
          const id = existing[i];
          const node = nextNodes[id];
          if (!node) {
            return false;
          }
          const isGroup = groupNodeTypesRef.current.has(node.type);
          if (!isGroup) {
            hasSeenNonGroup = true;
            continue;
          }
          if (hasSeenNonGroup) {
            return false;
          }
        }
        return existing.length === Object.keys(nextNodes).length;
      })();

      if (!isOrderStillValid) {
        const next = computeSortedNodeIds(nextNodes, groupNodeTypesRef.current);
        if (!areNodeIdListsEqual(existing, next)) {
          sortedNodeIdsRef.current = next;
          notifySortedNodeIdsSubscribers();
        }
      }
    }

    lastControlledDerivedStateRef.current = { nodes: nextNodes, connections: nextConnections };
  }, [
    isControlled,
    notifyConnectionDerivedSubscribers,
    notifySortedNodeIdsSubscribers,
    state.connections,
    state.nodes,
  ]);

  const updateSetting = React.useCallback(
    (key: string, value: unknown) => {
      if (!settingsManager) {
        return;
      }
      try {
        settingsManager.setValue(key, value as SettingValue);
      } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
      }
    },
    [settingsManager],
  );

  const utils = React.useMemo(
    () => ({
      snapToGrid,
      findContainingGroup,
      getGroupChildren,
      isNodeInsideGroup,
    }),
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      state,
      getState,
      dispatch,
      actions: boundActions,
      actionCreators: nodeEditorActions,
      connectedPorts: connectedPortsRef.current,
      connectedPortIdsByNode: connectedPortIdsByNodeRef.current,
      isLoading,
      isSaving,
      handleSave,
      getNodePorts,
      getNodeById,
      settings,
      settingsManager,
      updateSetting,
      utils,
    }),
    [
      state,
      getState,
      dispatch,
      boundActions,
      isLoading,
      isSaving,
      handleSave,
      getNodePorts,
      getNodeById,
      settings,
      settingsManager,
      updateSetting,
      utils,
    ],
  );

  const getNodePortsFromState = React.useCallback(
    (nodeId: NodeId): Port[] => {
      const node = stateRef.current.nodes[nodeId];
      if (!node) {
        return [];
      }
      const definition = registryRef.current.get(node.type);
      if (!definition) {
        throw new Error(`No node definition registered for type "${node.type}"`);
      }
      return portResolver.getNodePorts(node, definition);
    },
    [portResolver],
  );

  const apiValue = React.useMemo<NodeEditorApiValue>(
    () => ({
      dispatch,
      actions: boundActions,
      getState,
      subscribe,
      subscribeToChanges,
      getSortedNodeIds,
      subscribeToSortedNodeIds,
      getConnectedPorts,
      getConnectedPortIdsByNode,
      subscribeToConnectionDerived,
      getNodePorts: getNodePortsFromState,
      getNodeById,
    }),
    [
      dispatch,
      boundActions,
      getState,
      subscribe,
      subscribeToChanges,
      getSortedNodeIds,
      subscribeToSortedNodeIds,
      getConnectedPorts,
      getConnectedPortIdsByNode,
      subscribeToConnectionDerived,
      getNodePortsFromState,
      getNodeById,
    ],
  );

  return (
    <NodeEditorApiContext.Provider value={apiValue}>
      <NodeEditorContext.Provider value={contextValue}>{children}</NodeEditorContext.Provider>
    </NodeEditorApiContext.Provider>
  );
};

export type { NodeEditorData };
