/**
 * @file Minimap component
 */
import * as React from "react";
import { useNodeEditor } from "../../contexts/composed/node-editor/context";
import { useNodeCanvas } from "../../contexts/composed/canvas/viewport/context";
import { useNodeDefinitionList } from "../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import {
  FloatingPanelFrame,
  FloatingPanelHeader,
  FloatingPanelTitle,
  FloatingPanelMeta,
  FloatingPanelControls,
  FloatingPanelContent,
} from "../layout/FloatingPanelFrame";
import styles from "./Minimap.module.css";
import { NodeMapRenderer } from "./NodeMapRenderer";

export type MinimapProps = {
  /** Scale factor for minimap rendering */
  scale?: number;
  /** Width of the minimap (in pixels) */
  width?: number;
  /** Height of the minimap (in pixels) */
  height?: number;
};

const HEADER_HEIGHT = 30;
const CANVAS_PADDING = { top: 10, right: 10, bottom: 10, left: 10 };

export const Minimap: React.FC<MinimapProps> = ({ scale = 0.1, width = 200, height = 150 }) => {
  const { state } = useNodeEditor();
  const { state: canvasState, actions: canvasActions, canvasRef: editorCanvasRef } = useNodeCanvas();
  const nodeDefinitions = useNodeDefinitionList();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const { rect: canvasRect } = useResizeObserver(canvasRef, { box: "border-box" });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{
    x: number;
    y: number;
    viewportOffset: { x: number; y: number };
  } | null>(null);
  const [hasDragged, setHasDragged] = React.useState(false);
  const [canvasSize, setCanvasSize] = React.useState<{ width: number; height: number }>(() => ({
    width,
    height: Math.max(0, height - HEADER_HEIGHT),
  }));

  React.useEffect(() => {
    setCanvasSize((prev) => ({
      width: prev.width || width,
      height: prev.height || Math.max(0, height - HEADER_HEIGHT),
    }));
  }, [width, height]);

  React.useEffect(() => {
    if (!canvasRect) {
      return;
    }
    setCanvasSize((prev) => {
      if (prev.width === canvasRect.width && prev.height === canvasRect.height) {
        return prev;
      }
      return { width: canvasRect.width, height: canvasRect.height };
    });
  }, [canvasRect?.width, canvasRect?.height]);

  // Calculate bounds of all nodes
  const nodeBounds = React.useMemo(() => {
    const nodes = Object.values(state.nodes).filter((n) => n.visible !== false);
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const x = node.position.x;
      const y = node.position.y;
      const width = node.size?.width || 150;
      const height = node.size?.height || 100;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // Add padding
    const padding = 100;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [state.nodes]);

  const mapWidth = React.useMemo(() => {
    const measured = canvasSize.width;
    return Math.max(1, measured || width);
  }, [canvasSize.width, width]);

  const mapHeight = React.useMemo(() => {
    const measured = canvasSize.height;
    const fallbackHeight = Math.max(0, height - HEADER_HEIGHT);
    return Math.max(1, measured || fallbackHeight);
  }, [canvasSize.height, height]);

  // Calculate scale to fit all nodes in minimap
  const minimapScale = React.useMemo(() => {
    const boundsWidth = nodeBounds.maxX - nodeBounds.minX;
    const boundsHeight = nodeBounds.maxY - nodeBounds.minY;

    const scaleX = (mapWidth - (CANVAS_PADDING.left + CANVAS_PADDING.right)) / boundsWidth;
    const scaleY = (mapHeight - (CANVAS_PADDING.top + CANVAS_PADDING.bottom)) / boundsHeight;

    return Math.min(scaleX, scaleY, scale);
  }, [nodeBounds, mapWidth, mapHeight, scale]);

  // Transform world coordinates to minimap coordinates
  const worldToMinimap = React.useCallback(
    (x: number, y: number) => {
      return {
        x: (x - nodeBounds.minX) * minimapScale + CANVAS_PADDING.left,
        y: (y - nodeBounds.minY) * minimapScale + CANVAS_PADDING.top,
      };
    },
    [nodeBounds, minimapScale],
  );

  // Transform minimap coordinates to world coordinates
  const minimapToWorld = React.useCallback(
    (x: number, y: number) => {
      return {
        x: (x - CANVAS_PADDING.left) / minimapScale + nodeBounds.minX,
        y: (y - CANVAS_PADDING.top) / minimapScale + nodeBounds.minY,
      };
    },
    [nodeBounds, minimapScale],
  );

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = React.useMemo(() => {
    const viewport = canvasState.viewport;
    const rect = editorCanvasRef.current?.getBoundingClientRect();
    const containerWidth = rect?.width ?? window.innerWidth;
    const containerHeight = rect?.height ?? window.innerHeight;

    // Calculate visible area in world coordinates relative to the actual canvas container
    const visibleWidth = containerWidth / viewport.scale;
    const visibleHeight = containerHeight / viewport.scale;

    const worldTopLeft = {
      x: -viewport.offset.x / viewport.scale,
      y: -viewport.offset.y / viewport.scale,
    };

    const worldBottomRight = {
      x: worldTopLeft.x + visibleWidth,
      y: worldTopLeft.y + visibleHeight,
    };

    const minimapTopLeft = worldToMinimap(worldTopLeft.x, worldTopLeft.y);
    const minimapBottomRight = worldToMinimap(worldBottomRight.x, worldBottomRight.y);

    return {
      x: minimapTopLeft.x,
      y: minimapTopLeft.y,
      width: Math.max(1, minimapBottomRight.x - minimapTopLeft.x),
      height: Math.max(1, minimapBottomRight.y - minimapTopLeft.y),
    };
  }, [canvasState.viewport, worldToMinimap]);

  // Navigate to position based on minimap coordinates
  const navigateToPosition = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      // Convert minimap click coordinates to world coordinates
      const worldPos = minimapToWorld(clickX, clickY);

      // Get current viewport state
      const viewport = canvasState.viewport;

      // Calculate where this world position should appear on screen
      // We want the clicked world position to appear at the same screen position where we clicked on the minimap
      const rectCanvas = editorCanvasRef.current?.getBoundingClientRect();
      const containerWidth = rectCanvas?.width ?? window.innerWidth;
      const containerHeight = rectCanvas?.height ?? window.innerHeight;
      const screenX = (clickX / rect.width) * containerWidth + (rectCanvas?.left ?? 0);
      const screenY = (clickY / rect.height) * containerHeight + (rectCanvas?.top ?? 0);

      // Calculate new viewport offset so that worldPos appears at screenX, screenY
      const newOffsetX = screenX - worldPos.x * viewport.scale;
      const newOffsetY = screenY - worldPos.y * viewport.scale;

      // Dispatch the action to update the viewport
      canvasActions.setViewport({
        ...viewport,
        offset: { x: newOffsetX, y: newOffsetY },
      });
    },
    [canvasState.viewport, canvasActions, minimapToWorld],
  );

  // Handle minimap interactions
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setHasDragged(false); // Reset drag flag

      // Store drag start position and current viewport offset
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        viewportOffset: { ...canvasState.viewport.offset },
      });

      // Capture pointer for smooth dragging
      if (canvasRef.current) {
        canvasRef.current.setPointerCapture(e.pointerId);
      }
    },
    [canvasState.viewport.offset],
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStart) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      // Calculate mouse movement in screen pixels
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Check if this is significant movement to constitute a drag
      const dragThreshold = 3; // pixels
      if (!hasDragged && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
        setHasDragged(true);
      }

      // Convert screen pixel movement to world coordinate movement
      // The scale factor for minimap to world coordinate conversion
      const worldWidth = nodeBounds.maxX - nodeBounds.minX;
      const worldHeight = nodeBounds.maxY - nodeBounds.minY;
      const minimapWidth = Math.max(1, mapWidth - (CANVAS_PADDING.left + CANVAS_PADDING.right));
      const minimapHeight = Math.max(1, mapHeight - (CANVAS_PADDING.top + CANVAS_PADDING.bottom));

      const worldDeltaX = (deltaX / minimapWidth) * worldWidth;
      const worldDeltaY = (deltaY / minimapHeight) * worldHeight;

      // Apply the movement to viewport offset (inverted because moving minimap right should move viewport left)
      const viewport = canvasState.viewport;
      const newOffsetX = dragStart.viewportOffset.x - worldDeltaX * viewport.scale;
      const newOffsetY = dragStart.viewportOffset.y - worldDeltaY * viewport.scale;

      // Dispatch the action to update the viewport
      canvasActions.setViewport({
        ...viewport,
        offset: { x: newOffsetX, y: newOffsetY },
      });
    },
    [isDragging, dragStart, hasDragged, canvasState.viewport, canvasActions, nodeBounds, mapWidth, mapHeight],
  );

  const handlePointerUp = React.useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setDragStart(null);

    // Release pointer capture
    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }

    // Reset hasDragged flag after a short delay to prevent click events
    setTimeout(() => {
      setHasDragged(false);
    }, 0);
  }, []);

  // Handle click for navigation (when not dragging)
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Only handle click if we haven't dragged - this prevents navigation after drag operations
      if (!hasDragged && !isDragging && !dragStart) {
        navigateToPosition(e.clientX, e.clientY);
      }
    },
    [hasDragged, isDragging, dragStart, navigateToPosition],
  );

  return (
    <FloatingPanelFrame>
      <FloatingPanelHeader>
        <div className={styles.minimapHeaderInfo}>
          <FloatingPanelTitle>Minimap</FloatingPanelTitle>
          <FloatingPanelMeta>{Object.keys(state.nodes).length} nodes</FloatingPanelMeta>
        </div>
        <FloatingPanelControls>
          <span className={styles.minimapZoom}>{Math.round(canvasState.viewport.scale * 100)}%</span>
        </FloatingPanelControls>
      </FloatingPanelHeader>
      <FloatingPanelContent
        ref={canvasRef}
        className={styles.minimapCanvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        data-is-dragging={isDragging}
      >
        <NodeMapRenderer
          nodes={state.nodes}
          connections={state.connections}
          width={mapWidth}
          height={mapHeight}
          padding={CANVAS_PADDING}
          filterHidden
          nodeDefinitions={nodeDefinitions}
        />

        {/* Render viewport indicator */}
        <div
          className={styles.minimapViewport}
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
          }}
          data-is-dragging={isDragging}
        />
      </FloatingPanelContent>
    </FloatingPanelFrame>
  );
};

Minimap.displayName = "Minimap";

/*
debug-notes:
- Reviewed src/components/layers/NodeMapRenderer.tsx to keep viewport calculations aligned with padding offsets.
- Reviewed src/components/layout/GridLayout.tsx to rely on layer width/height instead of inline styles.
- Reviewed src/components/layers/Minimap.module.css while migrating frame styles into FloatingPanelFrame.
*/
