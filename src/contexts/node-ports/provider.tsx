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
import { useNodeEditor } from "../composed/node-editor/context";
import { useNodeDefinitions } from "../node-definitions/context";
import { hasNodeGeometryChanged } from "../../core/node/comparators";

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
  const { state: editorState, getNodePorts } = useNodeEditor();
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

  // Compute port positions whenever nodes change
  const [portPositions, setPortPositions] = React.useState<EditorPortPositions>(() => new Map());

  // Track previous state for change detection
  const prevNodesRef = React.useRef<typeof editorState.nodes>(editorState.nodes);
  const prevBehaviorRef = React.useRef<PortPositionBehavior | undefined>(behavior);
  const prevConfigRef = React.useRef<PortPositionConfig>(config);
  const prevPortPositionsRef = React.useRef<EditorPortPositions>(portPositions);

  React.useEffect(() => {
    if (!editorState.nodes) {
      return;
    }

    const prevNodes = prevNodesRef.current;
    let shouldRecompute = false;

    if (!prevNodes || Object.keys(prevNodes).length !== Object.keys(editorState.nodes).length) {
      shouldRecompute = true;
    } else {
      for (const nodeId in editorState.nodes) {
        const node = editorState.nodes[nodeId];
        const prevNode = prevNodes[nodeId];

        if (!prevNode || hasNodeGeometryChanged(prevNode, node)) {
          shouldRecompute = true;
          break;
        }
      }
    }

    if (!shouldRecompute) {
      if (prevBehaviorRef.current !== behavior) {
        shouldRecompute = true;
      } else if (prevConfigRef.current !== config) {
        shouldRecompute = true;
      }
    }

    if (shouldRecompute) {
      const nodes = Object.values(editorState.nodes).map((node) => {
        // Skip port resolution for unknown node types
        const definition = registry.get(node.type);
        const ports: CorePort[] = definition ? getNodePorts(node.id) : [];
        return { ...node, ports };
      }) as PortPositionNode[];

      const newPortPositions = computePositionsForNodes(nodes, prevPortPositionsRef.current);
      setPortPositions(newPortPositions);
      prevPortPositionsRef.current = newPortPositions;

      prevNodesRef.current = editorState.nodes;
      prevBehaviorRef.current = behavior;
      prevConfigRef.current = config;
    } else {
      prevBehaviorRef.current = behavior;
      prevConfigRef.current = config;
    }
  }, [editorState.nodes, behavior, config, getNodePorts, computePositionsForNodes, registry]);

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
