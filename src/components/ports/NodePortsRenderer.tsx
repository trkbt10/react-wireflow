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
import { NodeCanvasContext } from "../../contexts/composed/canvas/viewport/context";
import { NodeEditorContext } from "../../contexts/composed/node-editor/context";
import { useExternalStoreSelector } from "../../hooks/useExternalStoreSelector";
import styles from "./NodePortsRenderer.module.css";

// Stable fallback functions for when context is not available
const noopUnsubscribe = () => {};
const noopSubscribe = () => noopUnsubscribe;
const defaultGetState = () => ({ viewport: { scale: 1 } });
const selectScale = (state: { viewport: { scale: number } }) => state.viewport.scale;

/**
 * Hook to determine if port labels should be visible based on zoom level.
 * Returns true (show labels) if context is not available, for backwards compatibility.
 */
const useShowPortLabels = (): boolean => {
  const canvasContext = React.useContext(NodeCanvasContext);
  const editorContext = React.useContext(NodeEditorContext);

  const scale = useExternalStoreSelector(
    canvasContext?.store.subscribe ?? noopSubscribe,
    canvasContext?.store.getState ?? defaultGetState,
    selectScale,
  );

  if (!canvasContext || !editorContext) {
    return true;
  }

  return scale >= editorContext.settings.portLabelVisibilityThreshold;
};

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
 * Pure component that renders ports for a node.
 * Does not subscribe to any context - relies on parent to provide showLabels.
 */
const NodePortsRendererPure: React.FC<NodePortsRendererProps & { showLabels: boolean }> = ({
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
  showLabels,
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
            showLabel={showLabels}
          />
        );
      })}
    </div>
  );
};

/**
 * Wrapper component that derives showLabels from context.
 * Use this when you need automatic zoom-based label visibility.
 */
const NodePortsRendererWithAutoLabels: React.FC<NodePortsRendererProps> = (props) => {
  const showLabels = useShowPortLabels();
  return <NodePortsRendererPure {...props} showLabels={showLabels} />;
};

// Temporary debug flag - set to true to enable detailed re-render logging
const DEBUG_NODEPORTSRENDERER_RERENDERS = false;

// Props type with optional showLabels for backwards compatibility
export type NodePortsRendererPropsWithLabels = NodePortsRendererProps & { showLabels?: boolean };

// Memoized version with custom comparison
export const NodePortsRenderer = React.memo(
  (props: NodePortsRendererPropsWithLabels) => {
    // Use showLabels from props if provided, otherwise derive from context
    if (props.showLabels !== undefined) {
      return <NodePortsRendererPure {...props} showLabels={props.showLabels} />;
    }
    return <NodePortsRendererWithAutoLabels {...props} />;
  },
  (prevProps: NodePortsRendererPropsWithLabels, nextProps: NodePortsRendererPropsWithLabels) => {
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
  if (prevProps.showLabels !== nextProps.showLabels) {
    debugLog("showLabels changed", { prev: prevProps.showLabels, next: nextProps.showLabels });
    return false;
  }

  // Event handlers are assumed to be stable (useCallback)
  if (DEBUG_NODEPORTSRENDERER_RERENDERS) {
    console.log(`[NodePortsRenderer:${nodeId}] Skipped re-render (props are equal)`);
  }
  return true;
},
);
