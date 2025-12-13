/**
 * @file Context for accessing pre-computed port positions and position calculation utilities
 */
import * as React from "react";
import type { Port } from "../../types/core";
import type {
  EditorPortPositions,
  NodePortPositions,
  PortPosition,
  PortPositionBehavior,
  PortPositionConfig,
  PortPositionNode,
} from "../../types/portPosition";

/**
 * Context value for port positions
 */
export type PortPositionContextValue = {
  /** All computed port positions */
  portPositions: EditorPortPositions;
  /** Effective configuration used for position calculations */
  config: PortPositionConfig;
  /** Optional behavior overrides supplied via props */
  behavior?: PortPositionBehavior;
  /** Get port position for a specific port */
  getPortPosition: (nodeId: string, portId: string) => PortPosition | undefined;
  /** Get all port positions for a node */
  getNodePortPositions: (nodeId: string) => NodePortPositions | undefined;
  /** Compute port position dynamically */
  computePortPosition: (node: PortPositionNode, port: Port) => PortPosition;
  /** Calculate port positions for a node on demand */
  calculateNodePortPositions: (node: PortPositionNode) => NodePortPositions;
};

export type PortPositionSettingsValue = {
  config: PortPositionConfig;
  behavior?: PortPositionBehavior;
};

/**
 * Context for accessing pre-computed port positions
 */
export const PortPositionContext = React.createContext<PortPositionContextValue | null>(null);
PortPositionContext.displayName = "PortPositionContext";

export const PortPositionSettingsContext = React.createContext<PortPositionSettingsValue | null>(null);
PortPositionSettingsContext.displayName = "PortPositionSettingsContext";

/**
 * Hook to access port positions
 */
export function usePortPositions(): PortPositionContextValue {
  const context = React.useContext(PortPositionContext);
  if (!context) {
    throw new Error("usePortPositions must be used within a PortPositionProvider");
  }
  return context;
}

/**
 * Returns only the stable settings used for port position calculation (config/behavior).
 * Use this when you don't need to subscribe to computed `portPositions`.
 */
export function usePortPositionSettings(): PortPositionSettingsValue {
  const context = React.useContext(PortPositionSettingsContext);
  if (!context) {
    throw new Error("usePortPositionSettings must be used within a PortPositionProvider");
  }
  return context;
}

/**
 * Hook to get a specific port position
 */
export function usePortPosition(nodeId: string, portId: string): PortPosition | undefined {
  const { getPortPosition } = usePortPositions();
  return React.useMemo(() => getPortPosition(nodeId, portId), [getPortPosition, nodeId, portId]);
}

/**
 * Hook to get all port positions for a node
 */
export function useNodePortPositions(nodeId: string): NodePortPositions | undefined {
  const { getNodePortPositions } = usePortPositions();
  return React.useMemo(() => getNodePortPositions(nodeId), [getNodePortPositions, nodeId]);
}
