/**
 * @file Provider component for managing port position calculations and context
 * @description
 * Supports two modes:
 * 1. Stateless mode: Pass `portPositions` prop for external management (useful for testing)
 * 2. Stateful mode: Omit `portPositions` prop to enable automatic state management with recomputation
 */
import * as React from "react";
import type { Port, Port as CorePort } from "../../types/core";
import { DEFAULT_PORT_POSITION_CONFIG } from "../../types/portPosition";
import type {
  EditorPortPositions,
  NodePortPositions,
  PortPositionBehavior,
  PortPositionConfig,
  PortPositionNode,
} from "../../types/portPosition";
import { computeAllPortPositions, computeNodePortPositions } from "../../core/port/spatiality/computePositions";
import { PortPositionContext } from "./context";
import type { PortPositionContextValue } from "./context";
import { PortPositionSettingsContext, type PortPositionSettingsValue } from "./context";
import { useNodeEditorApi } from "../composed/node-editor/context";
import { useNodeDefinitions } from "../node-definitions/context";

/**
 * Provider component for port positions
 *
 * When `portPositions` is provided, operates in stateless mode (external management).
 * When `portPositions` is omitted, operates in stateful mode with automatic recomputation.
 */
export type PortPositionProviderProps = {
  /** Pre-computed port positions (stateless mode). Omit for automatic state management. */
  portPositions?: EditorPortPositions;
  /** Optional behavior overrides for port position calculation */
  behavior?: PortPositionBehavior;
  /** Configuration for port position calculation */
  config?: PortPositionConfig;
  children: React.ReactNode;
};

/**
 * Internal component for stateless mode - just provides context value
 */
const StatelessPortPositionProvider: React.FC<{
  portPositions: EditorPortPositions;
  behavior?: PortPositionBehavior;
  config: PortPositionConfig;
  children: React.ReactNode;
}> = ({ portPositions, behavior, config, children }) => {
  const calculateNodePortPositions = React.useCallback(
    (node: PortPositionNode): NodePortPositions => {
      if (behavior?.computeNode) {
        return behavior.computeNode({
          node,
          config,
          defaultCompute: computeNodePortPositions,
        });
      }

      return computeNodePortPositions(node, config);
    },
    [behavior, config],
  );

  const value = React.useMemo<PortPositionContextValue>(() => {
    return {
      portPositions,
      config,
      behavior,
      getPortPosition: (nodeId: string, portId: string) => {
        return portPositions.get(nodeId)?.get(portId);
      },
      getNodePortPositions: (nodeId: string) => {
        return portPositions.get(nodeId);
      },
      computePortPosition: (node: PortPositionNode, port: Port) => {
        const stored = portPositions.get(node.id)?.get(port.id);
        if (stored) {
          return stored;
        }

        const calculated = calculateNodePortPositions(node).get(port.id);
        if (calculated) {
          return calculated;
        }

        // Simple fallback aligned to node position
        return {
          portId: port.id,
          renderPosition: { x: 0, y: 0 },
          connectionPoint: { x: node.position.x, y: node.position.y },
        };
      },
      calculateNodePortPositions,
    };
  }, [calculateNodePortPositions, portPositions, behavior, config]);

  const settingsValue = React.useMemo<PortPositionSettingsValue>(() => ({ config, behavior }), [config, behavior]);

  return (
    <PortPositionSettingsContext.Provider value={settingsValue}>
      <PortPositionContext.Provider value={value}>{children}</PortPositionContext.Provider>
    </PortPositionSettingsContext.Provider>
  );
};

/**
 * Internal component for stateful mode - manages port positions state with automatic recomputation
 */
const StatefulPortPositionProvider: React.FC<{
  behavior?: PortPositionBehavior;
  config: PortPositionConfig;
  children: React.ReactNode;
}> = ({ behavior, config, children }) => {
  const { getState, getNodePorts, subscribeToChanges } = useNodeEditorApi();
  const { registry } = useNodeDefinitions();

  const computePositionsForNodes = React.useCallback(
    (nodes: PortPositionNode[], previousPositions: EditorPortPositions): EditorPortPositions => {
      const defaultComputeAll = (nodesArg: PortPositionNode[], configArg: PortPositionConfig) =>
        computeAllPortPositions(nodesArg, configArg);

      if (behavior?.computeAll) {
        return behavior.computeAll({
          nodes,
          previous: previousPositions,
          config,
          defaultCompute: defaultComputeAll,
        });
      }

      if (behavior?.computeNode) {
        const defaultComputeNode = (nodeArg: PortPositionNode, configArg: PortPositionConfig) =>
          computeNodePortPositions(nodeArg, configArg);

        const result: EditorPortPositions = new Map();
        nodes.forEach((node) => {
          const positions = behavior.computeNode!({
            node,
            config,
            defaultCompute: defaultComputeNode,
          });

          if (positions.size > 0) {
            result.set(node.id, positions);
          }
        });
        return result;
      }

      return defaultComputeAll(nodes, config);
    },
    [behavior, config],
  );

  const computeAllPositions = React.useCallback(
    (previousPositions: EditorPortPositions): EditorPortPositions => {
      const { nodes } = getState();
      const portNodes = Object.values(nodes).map((node) => {
        const definition = registry.get(node.type);
        const ports: CorePort[] = definition ? getNodePorts(node.id) : [];
        return { ...node, ports };
      }) as PortPositionNode[];
      return computePositionsForNodes(portNodes, previousPositions);
    },
    [computePositionsForNodes, getNodePorts, getState, registry],
  );

  // Compute initial port positions once.
  const [portPositions, setPortPositions] = React.useState<EditorPortPositions>(() => computeAllPositions(new Map()));
  const prevPortPositionsRef = React.useRef<EditorPortPositions>(portPositions);

  React.useEffect(() => {
    // Config/behavior changes require a full recompute.
    const next = computeAllPositions(prevPortPositionsRef.current);
    prevPortPositionsRef.current = next;
    setPortPositions(next);
  }, [behavior, config, computeAllPositions]);

  React.useEffect(() => {
    return subscribeToChanges((change) => {
      if (!change.affectsGeometry && !change.affectsPorts && change.removedNodeIds.length === 0) {
        return;
      }

      if (change.fullResync || behavior?.computeAll) {
        const next = computeAllPositions(prevPortPositionsRef.current);
        prevPortPositionsRef.current = next;
        setPortPositions(next);
        return;
      }

      const current = getState();
      const updated = new Map(prevPortPositionsRef.current);

      change.removedNodeIds.forEach((nodeId) => {
        updated.delete(nodeId);
      });

      const nodesToRecompute = change.changedNodeIds
        .filter((nodeId) => Boolean(current.nodes[nodeId]))
        .map((nodeId) => {
          const node = current.nodes[nodeId]!;
          const definition = registry.get(node.type);
          const ports: CorePort[] = definition ? getNodePorts(node.id) : [];
          return { ...node, ports };
        }) as PortPositionNode[];

      // Ensure stale entries are removed before applying new values.
      change.changedNodeIds.forEach((nodeId) => {
        updated.delete(nodeId);
      });

      if (nodesToRecompute.length > 0) {
        const recomputed = computePositionsForNodes(nodesToRecompute, prevPortPositionsRef.current);
        for (const [nodeId, positions] of recomputed.entries()) {
          updated.set(nodeId, positions);
        }
      }

      prevPortPositionsRef.current = updated;
      setPortPositions(updated);
    });
  }, [behavior?.computeAll, computeAllPositions, computePositionsForNodes, getNodePorts, getState, registry, subscribeToChanges]);

  return (
    <StatelessPortPositionProvider portPositions={portPositions} behavior={behavior} config={config}>
      {children}
    </StatelessPortPositionProvider>
  );
};

export const PortPositionProvider: React.FC<PortPositionProviderProps> = ({
  portPositions,
  behavior,
  config,
  children,
}) => {
  const effectiveConfig = config ?? DEFAULT_PORT_POSITION_CONFIG;

  // If portPositions is provided, use stateless mode (external management)
  // Otherwise, use stateful mode with automatic recomputation
  if (portPositions) {
    return (
      <StatelessPortPositionProvider portPositions={portPositions} behavior={behavior} config={effectiveConfig}>
        {children}
      </StatelessPortPositionProvider>
    );
  }

  return (
    <StatefulPortPositionProvider behavior={behavior} config={effectiveConfig}>
      {children}
    </StatefulPortPositionProvider>
  );
};
