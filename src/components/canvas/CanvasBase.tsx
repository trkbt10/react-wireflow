/**
 * @file CanvasBase component
 */
import * as React from "react";
import { useNodeCanvas } from "../../contexts/composed/canvas/viewport/context";
import { useEditorActionState } from "../../contexts/composed/EditorActionStateContext";
import { useNodeEditor } from "../../contexts/composed/node-editor/context";
import { applyZoomDelta } from "../../utils/zoomUtils";
import { SelectionBox } from "./SelectionBox";
import styles from "./CanvasBase.module.css";
import { useInteractionSettings } from "../../contexts/interaction-settings/context";
import type { PointerType } from "../../types/interaction";
import type { Position } from "../../types/core";
import { NODE_DRAG_MIME } from "../../constants/dnd";
import { usePointerShortcutMatcher } from "../../contexts/interaction-settings/hooks/usePointerShortcutMatcher";
import { useCanvasPointerActions } from "../../contexts/composed/canvas/interaction/useCanvasPointerActions";

export type CanvasNodeDropEvent = {
  nodeType: string;
  canvasPosition: Position;
  screenPosition: Position;
};

export type CanvasBaseProps = {
  children: React.ReactNode;
  className?: string;
  showGrid?: boolean;
  onNodeDrop?: (event: CanvasNodeDropEvent) => void;
};

const hasNodePayload = (event: React.DragEvent): boolean => {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes(NODE_DRAG_MIME) || types.includes("text/plain");
};

/**
 * CanvasBase - The lowest layer component that handles pan, zoom, and drag operations
 * This component receives events and provides visual support with grid display
 * Does not trap events unless necessary for its own operations
 */
export const CanvasBase: React.FC<CanvasBaseProps> = ({ children, className, showGrid, onNodeDrop }) => {
  const { state: canvasState, actions: canvasActions, canvasRef, utils, setContainerElement } = useNodeCanvas();
  const { actions: actionActions } = useEditorActionState();
  const { settings } = useNodeEditor();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rawGridPatternId = React.useId();
  const gridPatternId = React.useMemo(() => rawGridPatternId.replace(/[^a-zA-Z0-9_-]/g, "_"), [rawGridPatternId]);
  const interactionSettings = useInteractionSettings();
  const matchesPointerAction = usePointerShortcutMatcher();
  const { handlers: pointerHandlers, isBoxSelecting } = useCanvasPointerActions({ containerRef });

  React.useEffect(() => {
    setContainerElement(containerRef.current);
    return () => setContainerElement(null);
  }, [setContainerElement]);

  const currentScale = canvasState.viewport.scale;
  const shouldShowGrid =
    (showGrid ?? canvasState.gridSettings.showGrid) && currentScale >= settings.gridVisibilityThreshold;

  // Canvas transform based on viewport - optimized string creation
  const canvasTransform = React.useMemo(() => {
    const { offset, scale } = canvasState.viewport;
    return `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
  }, [canvasState.viewport]);

  // Grid pattern with offset - optimized dependencies
  const gridPatternDefs = React.useMemo(() => {
    if (!shouldShowGrid) {
      return null;
    }

    const { size } = canvasState.gridSettings;
    const { scale, offset } = canvasState.viewport;
    const scaledSize = size * scale;
    const offsetX = offset.x % scaledSize;
    const offsetY = offset.y % scaledSize;

    return (
      <defs>
        <pattern
          id={gridPatternId}
          width={scaledSize}
          height={scaledSize}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path d={`M ${scaledSize} 0 L 0 0 0 ${scaledSize}`} fill="none" strokeWidth="1" className={styles.gridLine} />
        </pattern>
      </defs>
    );
  }, [canvasState.gridSettings, canvasState.viewport, gridPatternId, shouldShowGrid]);

  const gridPatternFill = React.useMemo(() => `url(#${gridPatternId})`, [gridPatternId]);

  const handleNodeDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onNodeDrop) {
        return;
      }
      if (!hasNodePayload(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [onNodeDrop],
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onNodeDrop) {
        return;
      }
      if (!hasNodePayload(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nodeType = event.dataTransfer.getData(NODE_DRAG_MIME) || event.dataTransfer.getData("text/plain");
      if (!nodeType) {
        return;
      }

      const screenPosition = { x: event.clientX, y: event.clientY };
      const canvasPosition = utils.screenToCanvas(event.clientX, event.clientY);
      onNodeDrop({
        nodeType,
        canvasPosition,
        screenPosition,
      });
    },
    [onNodeDrop, utils],
  );

  // Handle mouse wheel for zoom (Figma style)
  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      // Figma style: Ctrl/Cmd + wheel for zoom, otherwise pan
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const center = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        // More responsive zoom with larger delta
        const rawDelta = e.deltaY * -0.01;
        const newScale = applyZoomDelta(canvasState.viewport.scale, rawDelta);

        canvasActions.zoomViewport(newScale, center);
      } else {
        // Normal scroll for panning
        e.preventDefault();

        // Invert deltaX for horizontal scrolling (Figma behavior)
        const deltaX = -e.deltaX;
        const deltaY = -e.deltaY;

        canvasActions.panViewport({ x: deltaX, y: deltaY });
      }
    },
    [canvasState.viewport.scale, canvasActions],
  );

  // Handle context menu
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      const nativeEvent = e.nativeEvent as MouseEvent & { pointerType?: string };
      if (!matchesPointerAction("canvas-open-context-menu", nativeEvent)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const pointerType: PointerType | "unknown" =
        nativeEvent.pointerType === "mouse" || nativeEvent.pointerType === "touch" || nativeEvent.pointerType === "pen"
          ? (nativeEvent.pointerType as PointerType)
          : "unknown";

      const screenPosition = { x: e.clientX, y: e.clientY };
      const canvasPosition = utils.screenToCanvas(e.clientX, e.clientY);

      const defaultShow = () => actionActions.showContextMenu({ position: screenPosition, canvasPosition });

      const handler = interactionSettings.contextMenu.handleRequest;
      if (handler) {
        handler({
          target: { kind: "canvas" },
          screenPosition,
          canvasPosition,
          pointerType,
          event: nativeEvent,
          defaultShow,
        });
        return;
      }

      defaultShow();
    },
    [actionActions, utils, interactionSettings.contextMenu.handleRequest, matchesPointerAction],
  );

  // Handle double click to open Node Search
  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Exclude double clicks on nodes
      const target = e.target as Element;
      const isOnNode = target?.closest?.("[data-node-id]");

      if (isOnNode) {
        return;
      }

      // Convert screen coordinates to canvas coordinates using utils
      const canvasPosition = utils.screenToCanvas(e.clientX, e.clientY);
      const position = { x: e.clientX, y: e.clientY };
      actionActions.showContextMenu({ position, canvasPosition, mode: "search" });
    },
    [actionActions, utils],
  );

  // Handle keyboard shortcuts (Figma style)
  React.useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const editable = target.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"], [role="combobox"]',
      );
      return Boolean(editable);
    };

    const didActivateSpacePanningRef = { current: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Space for panning mode
      if (e.code === "Space" && !e.repeat && !e.ctrlKey && !e.metaKey) {
        if (isEditableTarget(e.target)) {
          return;
        }
        e.preventDefault();
        didActivateSpacePanningRef.current = true;
        canvasActions.setSpacePanning(true);
      }

      // Figma style zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.repeat) {
        switch (e.key) {
          case "0": // Reset zoom to 100%
            e.preventDefault();
            canvasActions.resetViewport();
            break;
          case "1": // Zoom to fit
            e.preventDefault();
            // TODO: Implement zoom to fit
            break;
          case "=":
          case "+": // Zoom in
            e.preventDefault();
            canvasActions.zoomViewport(applyZoomDelta(canvasState.viewport.scale, 1));
            break;
          case "-": // Zoom out
            e.preventDefault();
            canvasActions.zoomViewport(applyZoomDelta(canvasState.viewport.scale, -1));
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (!didActivateSpacePanningRef.current) {
          return;
        }
        e.preventDefault();
        didActivateSpacePanningRef.current = false;
        canvasActions.setSpacePanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [canvasActions, canvasState.viewport.scale]);

  // Set up wheel event listener
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const containerClassName = className ? `${styles.canvasContainer} ${className}` : styles.canvasContainer;

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      onPointerDown={pointerHandlers.onPointerDown}
      onPointerMove={pointerHandlers.onPointerMove}
      onPointerUp={pointerHandlers.onPointerUp}
      onPointerCancel={pointerHandlers.onPointerCancel}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onDragEnter={handleNodeDragOver}
      onDragOver={handleNodeDragOver}
      onDrop={handleDrop}
      role="application"
      aria-label="Node Editor Canvas"
      data-is-panning={canvasState.panState.isPanning}
      data-is-space-panning={canvasState.isSpacePanning}
      data-is-box-selecting={isBoxSelecting}
    >
      {/* Grid background */}
      {shouldShowGrid && (
        <svg className={styles.gridSvg}>
          {gridPatternDefs}
          <rect width="100%" height="100%" fill={gridPatternFill} />
        </svg>
      )}

      {/* Canvas layer with transform */}
      <div ref={canvasRef} className={styles.canvas} style={{ transform: canvasTransform }}>
        {children}
      </div>

      {/* Selection overlay (in screen coordinates, passes through events) */}
      <div className={styles.selectionOverlay}>
        <SelectionBox />
      </div>
    </div>
  );
};

CanvasBase.displayName = "CanvasBase";

/**
 * Debug notes:
 * - Reviewed src/contexts/NodeCanvasContext.tsx to validate clamping behavior while reworking zoom logic.
 * - Reviewed src/components/layers/GridToolbox.tsx to keep toolbar zoom controls in sync with wheel and keyboard handling.
 * - Reviewed src/contexts/InteractionSettingsContext.tsx and src/utils/pointerShortcuts.ts to confirm pan activator modifiers while addressing pan/range selection conflicts.
 */
