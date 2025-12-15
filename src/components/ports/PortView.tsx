/**
 * @file PortView component for rendering connection ports on nodes
 */
import * as React from "react";
import type { Port } from "../../types/core";
import { useDynamicPortPosition } from "../../contexts/node-ports/hooks/usePortPosition";
import { useNodeEditorApi } from "../../contexts/composed/node-editor/context";
import { useNodeDefinitions } from "../../contexts/node-definitions/context";
import { useCanvasInteractionSelector } from "../../contexts/composed/canvas/interaction/context";
import { hasPositionChanged, hasSizeChanged } from "../../core/geometry/comparators";
import type { PortRenderContext } from "../../types/NodeDefinition";
import styles from "./PortView.module.css";

export type PortViewProps = {
  port: Port;
  onPointerDown?: (e: React.PointerEvent, port: Port) => void;
  onPointerUp?: (e: React.PointerEvent, port: Port) => void;
  onPointerEnter?: (e: React.PointerEvent, port: Port) => void;
  onPointerMove?: (e: React.PointerEvent, port: Port) => void;
  onPointerLeave?: (e: React.PointerEvent, port: Port) => void;
  onPointerCancel?: (e: React.PointerEvent, port: Port) => void;
  /**
   * Set on the port that initiated the drag.
   * Visual: scale(1.5) + pulse animation (ripple effect)
   */
  isConnecting?: boolean;
  /**
   * Set on ports that can accept a connection from the dragging port.
   * Conditions: opposite input/output type, compatible data types, capacity check, etc.
   * Visual: accent border + scale(1.1) + pulse-connectable animation (ripple effect)
   */
  isConnectable?: boolean;
  /**
   * Set on the nearest connectable port during drag (snap candidate).
   * Visual: accent border + glow + scale(1.3)
   */
  isCandidate?: boolean;
  /**
   * Set on the port currently hovered by the pointer.
   * Visual: inner circle changes to accent color
   */
  isHovered?: boolean;
  /**
   * Set on ports that have an existing connection.
   * Visual: inner circle changes to success color (green)
   */
  isConnected?: boolean;
};

/**
 * PortView - Renders a connection port on a node
 * Handles port interactions for creating connections
 */
export const PortView: React.FC<PortViewProps> = ({
  port,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerCancel,
  isConnecting = false,
  isConnectable = false,
  isCandidate = false,
  isHovered = false,
  isConnected = false,
}) => {
  const resizeOverride = useCanvasInteractionSelector(
    (state) => {
      const current = state.resizeState;
      if (!current || current.nodeId !== port.nodeId) {
        return null;
      }
      return { size: current.currentSize, position: current.currentPosition };
    },
    {
      areEqual: (a, b) => {
        if (a === b) {
          return true;
        }
        if (!a || !b) {
          return false;
        }
        if (hasSizeChanged(a.size, b.size)) {
          return false;
        }
        if (hasPositionChanged(a.position, b.position)) {
          return false;
        }
        return true;
      },
    },
  );

  const portPositionOptions = React.useMemo(() => {
    if (!resizeOverride) {
      return undefined;
    }
    return {
      positionOverride: resizeOverride.position,
      sizeOverride: resizeOverride.size,
    };
  }, [resizeOverride]);

  // Get dynamic port position
  const portPosition = useDynamicPortPosition(port.nodeId, port.id, portPositionOptions);
  const renderPosition = portPosition?.renderPosition;
  const portPositionStyle: React.CSSProperties = React.useMemo(() => {
    if (!renderPosition) {
      // Fallback position if not found
      return {
        left: 0,
        top: 0,
        position: "absolute",
      };
    }
    return {
      left: renderPosition.x,
      top: renderPosition.y,
      transform: renderPosition.transform,
      position: "absolute",
    };
  }, [renderPosition]);

  const handlePointerDown = React.useEffectEvent((e: React.PointerEvent) => {
    e.stopPropagation();
    onPointerDown?.(e, port);
  });

  const handlePointerUp = React.useEffectEvent((e: React.PointerEvent) => {
    e.stopPropagation();
    onPointerUp?.(e, port);
  });

  const handlePointerEnter = React.useEffectEvent((e: React.PointerEvent) => {
    onPointerEnter?.(e, port);
  });

  const handlePointerMove = React.useEffectEvent((e: React.PointerEvent) => {
    onPointerMove?.(e, port);
  });

  const handlePointerLeave = React.useEffectEvent((e: React.PointerEvent) => {
    onPointerLeave?.(e, port);
  });

  const handlePointerCancel = React.useEffectEvent((e: React.PointerEvent) => {
    onPointerCancel?.(e, port);
  });

  // Get node editor state for custom renderer context
  const { getNodeById, getState } = useNodeEditorApi();
  const node = getNodeById(port.nodeId);

  // Get port definition to check for custom port renderer
  const { getPortDefinition } = useNodeDefinitions();
  const portDefinition = node ? getPortDefinition(port, node.type) : undefined;

  // Default render function
  const defaultRender = React.useCallback(
    () => (
      <div
        className={styles.port}
        style={portPositionStyle}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
        data-port-id={port.id}
        data-port-type={port.type}
        data-port-position={port.position}
        data-node-id={port.nodeId}
        data-port-connecting={isConnecting}
        data-port-connectable={isConnectable}
        data-port-candidate={isCandidate}
        data-port-hovered={isHovered}
        data-port-connected={isConnected}
        title={port.label}
      >
        <div className={styles.portInner} />
        {port.label && (
          <span className={styles.portLabel} data-port-label-position={port.position}>
            {port.label}
          </span>
        )}
      </div>
    ),
    [port, isConnecting, isConnectable, isCandidate, isHovered, isConnected, portPositionStyle],
  );

  // Check if there's a custom renderer
  if (portDefinition?.renderPort && node) {
    const state = getState();
    // Build context for custom renderer
    const context: PortRenderContext = {
      port,
      node,
      allNodes: state.nodes,
      allConnections: state.connections,
      isConnecting,
      isConnectable,
      isCandidate,
      isHovered,
      isConnected,
      position: portPosition
        ? {
            x: portPosition.renderPosition.x,
            y: portPosition.renderPosition.y,
            transform: portPosition.renderPosition.transform,
          }
        : undefined,
      handlers: {
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        onPointerEnter: handlePointerEnter,
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
        onPointerCancel: handlePointerCancel,
      },
    };

    return portDefinition.renderPort(context, defaultRender);
  }

  // Use default rendering
  return defaultRender();
};

PortView.displayName = "PortView";
