/**
 * @file Type definitions for connectable port computation results
 * Pure data types with no React dependencies
 */
import type { NodeId, PortId, PortType } from "../../../types/core";
import type { ConnectionSwitchBehavior } from "./connectionPlanning";
import { createPortKey, type PortKey } from "../identity/key";

/**
 * Information about the source port initiating a connection
 */
export type ConnectablePortSourceInfo = {
  nodeId: NodeId;
  portId: PortId;
  portType: PortType;
  portIndex: number;
};

/**
 * Detailed descriptor for a single connectable port candidate
 */
export type ConnectablePortDescriptor = {
  key: PortKey;
  nodeId: NodeId;
  portId: PortId;
  portType: PortType;
  portIndex: number;
  source: ConnectablePortSourceInfo;
  behavior: ConnectionSwitchBehavior;
};

/**
 * Result of computing which ports can accept connections
 */
export type ConnectablePortsResult = {
  /** Set of composite port keys (nodeId:portId) */
  ids: Set<PortKey>;
  /** Detailed descriptors keyed by composite port key */
  descriptors: Map<PortKey, ConnectablePortDescriptor>;
  /** Information about the source port, null if none */
  source: ConnectablePortSourceInfo | null;
};

/**
 * Create an empty ConnectablePortsResult
 */
export const createEmptyConnectablePorts = (): ConnectablePortsResult => ({
  ids: new Set<PortKey>(),
  descriptors: new Map<PortKey, ConnectablePortDescriptor>(),
  source: null,
});

/**
 * Shared empty ConnectablePortsResult instance.
 * Do not mutate its internal Set/Map.
 */
export const EMPTY_CONNECTABLE_PORTS: ConnectablePortsResult = createEmptyConnectablePorts();

export const isConnectablePortsEmpty = (connectablePorts: ConnectablePortsResult): boolean => {
  return (
    connectablePorts.ids.size === 0 &&
    connectablePorts.descriptors.size === 0 &&
    connectablePorts.source === null
  );
};

/**
 * Minimal interface for checking port connectability
 * Accepts either full ConnectablePortsResult or just the ids Set
 */
export type ConnectablePortsLike = ConnectablePortsResult | { ids: Set<PortKey> };

/**
 * Check if a given port is connectable based on precomputed connectable port descriptors.
 * Only considers ports whose descriptor indicates they are valid destinations.
 *
 * @param port - The port to check
 * @param connectablePorts - Precomputed connectable ports result
 * @returns true if the port is a valid connection target
 */
export function isPortConnectable(
  port: { nodeId: string; id: string; type: string },
  connectablePorts?: ConnectablePortsLike,
): boolean {
  if (!connectablePorts) {
    return false;
  }

  const compositeId = createPortKey(port.nodeId, port.id);

  if ("descriptors" in connectablePorts) {
    const descriptor = connectablePorts.descriptors.get(compositeId);
    if (!descriptor) {
      return false;
    }
    // Only treat opposite IO as connectable safety net
    return descriptor.portType !== descriptor.source.portType;
  }

  const ids = connectablePorts.ids;
  if (!ids || ids.size === 0) {
    return false;
  }
  return ids.has(compositeId);
}
