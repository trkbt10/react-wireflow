/**
 * @file Node ports renderer component
 */
import * as React from "react";
import type { Port } from "../../types/core";
import type { ConnectablePortsResult } from "../../core/port/connectivity/connectableTypes";
import { isPortConnectable } from "../../core/port/connectivity/connectableTypes";
import { PortView } from "./PortView";
import { useOptionalRenderers } from "../../contexts/RendererContext";
import { hasPortIdChanged } from "../../core/port/identity/comparators";
import styles from "./NodePortsRenderer.module.css";

export type NodePortsRendererProps = {
  ports: Port[];
  onPortPointerDown?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerUp?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerEnter?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerMove?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerLeave?: (e: React.PointerEvent, port: Port) => void;
  onPortPointerCancel?: (e: React.PointerEvent, port: Port) => void;
  hoveredPort?: Port;
  connectedPortIds?: ReadonlySet<string>;
  connectablePorts?: ConnectablePortsResult;
  connectingPortId?: string;
  candidatePortId?: string;
};

/**
 * Renders ports for a node
 */
const NodePortsRendererComponent: React.FC<NodePortsRendererProps> = ({
  ports,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerMove,
  onPortPointerLeave,
  onPortPointerCancel,
  hoveredPort,
  connectedPortIds,
  connectablePorts,
  connectingPortId,
  candidatePortId,
}) => {
  const renderers = useOptionalRenderers();
  const PortComponent = renderers?.port ?? PortView;

  if (!ports || ports.length === 0) {
    return null;
  }

  return (
    <div className={styles.nodePorts}>
      {ports.map((port: Port) => {
        const connectable = isPortConnectable(port, connectablePorts);
        return (
          <PortComponent
            key={port.id}
            port={port}
            onPointerDown={onPortPointerDown}
            onPointerUp={onPortPointerUp}
            onPointerEnter={onPortPointerEnter}
            onPointerMove={onPortPointerMove}
            onPointerLeave={onPortPointerLeave}
            onPointerCancel={onPortPointerCancel}
            isConnecting={connectingPortId === port.id}
            isConnectable={connectable}
            isCandidate={candidatePortId === port.id}
            isHovered={hoveredPort?.id === port.id}
            isConnected={connectedPortIds?.has(port.id)}
          />
        );
      })}
    </div>
  );
};

// Temporary debug flag - set to true to enable detailed re-render logging
const DEBUG_NODEPORTSRENDERER_RERENDERS = false;

// Memoized version with custom comparison
export const NodePortsRenderer = React.memo(NodePortsRendererComponent, (prevProps, nextProps) => {
  // Get nodeId for debugging (from first port if available)
  const nodeId = prevProps.ports?.[0]?.nodeId || nextProps.ports?.[0]?.nodeId || "unknown";
  const debugLog = (reason: string, details?: Record<string, unknown>) => {
    if (DEBUG_NODEPORTSRENDERER_RERENDERS) {
      console.log(`[NodePortsRenderer:${nodeId}] Re-rendering because:`, reason, details || "");
    }
  };

  // Check if ports array changed (by reference or length)
  if (prevProps.ports !== nextProps.ports) {
    debugLog("ports reference changed", {
      prevLength: prevProps.ports.length,
      nextLength: nextProps.ports.length,
    });
    return false;
  }
  if (prevProps.ports.length !== nextProps.ports.length) {
    debugLog("ports.length changed", { prev: prevProps.ports.length, next: nextProps.ports.length });
    return false;
  }

  // Check if port-related state changed
  if (hasPortIdChanged(prevProps.hoveredPort, nextProps.hoveredPort)) {
    debugLog("hoveredPort.id changed", { prev: prevProps.hoveredPort?.id, next: nextProps.hoveredPort?.id });
    return false;
  }
  if (prevProps.connectingPortId !== nextProps.connectingPortId) {
    debugLog("connectingPortId changed", { prev: prevProps.connectingPortId, next: nextProps.connectingPortId });
    return false;
  }
  if (prevProps.candidatePortId !== nextProps.candidatePortId) {
    debugLog("candidatePortId changed", { prev: prevProps.candidatePortId, next: nextProps.candidatePortId });
    return false;
  }
  if (prevProps.connectedPortIds !== nextProps.connectedPortIds) {
    debugLog("connectedPortIds reference changed", {
      prevSize: prevProps.connectedPortIds?.size,
      nextSize: nextProps.connectedPortIds?.size,
    });
    return false;
  }
  if (prevProps.connectablePorts !== nextProps.connectablePorts) {
    debugLog("connectablePorts reference changed", {
      prev: prevProps.connectablePorts,
      next: nextProps.connectablePorts,
    });
    return false;
  }

  // Event handlers are assumed to be stable (useCallback)
  if (DEBUG_NODEPORTSRENDERER_RERENDERS) {
    console.log(`[NodePortsRenderer:${nodeId}] Skipped re-render (props are equal)`);
  }
  return true;
});
