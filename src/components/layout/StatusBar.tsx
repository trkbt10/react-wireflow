/**
 * @file Status bar component
 */
import * as React from "react";
import { useNodeEditor, useNodeEditorSelector } from "../../contexts/composed/node-editor/context";
import { useEditorActionSelectionCounts } from "../../contexts/composed/EditorActionStateContext";
import { useCanvasInteractionSelector } from "../../contexts/composed/canvas/interaction/context";
import {
  useNodeCanvasGridSettings,
  useNodeCanvasPanActive,
  useNodeCanvasViewportOffset,
  useNodeCanvasViewportScale,
} from "../../contexts/composed/canvas/viewport/context";
import type { SettingsManager as _SettingsManager } from "../../settings/SettingsManager";
import { StatusSection } from "./StatusSection";
import { hasPositionChanged } from "../../core/geometry/comparators";
import type { Position } from "../../types/core";
import styles from "./StatusBar.module.css";

export type StatusBarProps = {
  autoSave?: boolean;
  isSaving?: boolean;
  settingsManager?: _SettingsManager;
};

const PositionStatusSection: React.FC = React.memo(() => {
  const viewportOffset = useNodeCanvasViewportOffset();
  const dragOffset = useCanvasInteractionSelector(
    (state): Position | null => state.dragState?.offset ?? null,
    { areEqual: (a, b) => !hasPositionChanged(a, b) },
  );

  const cursorPosition = React.useMemo(() => {
    if (dragOffset) {
      return `Offset: (${Math.round(dragOffset.x)}, ${Math.round(dragOffset.y)})`;
    }
    return `Canvas: (${Math.round(viewportOffset.x)}, ${Math.round(viewportOffset.y)})`;
  }, [dragOffset, viewportOffset.x, viewportOffset.y]);

  return <StatusSection label="Position" value={cursorPosition} />;
});

PositionStatusSection.displayName = "PositionStatusSection";

/**
 * StatusBar - Displays current editor state information
 * Settings are retrieved from NodeEditorContext if not provided via props.
 */
export const StatusBar: React.FC<StatusBarProps> = React.memo(({
  autoSave: autoSaveProp,
  isSaving: isSavingProp,
  settingsManager: settingsManagerProp,
}) => {
  const { settings, isSaving: editorIsSaving, settingsManager: editorSettingsManager } = useNodeEditor();

  const autoSave = autoSaveProp ?? settings.autoSave;
  const isSaving = isSavingProp ?? editorIsSaving;
  const settingsManager = settingsManagerProp ?? editorSettingsManager;

  const selectedCounts = useEditorActionSelectionCounts();
  const selectedNodeCount = selectedCounts.selectedNodeCount;
  const selectedConnectionCount = selectedCounts.selectedConnectionCount;

  const totals = useNodeEditorSelector(
    (state) => ({
      totalNodes: Object.keys(state.nodes).length,
      totalConnections: Object.keys(state.connections).length,
    }),
    {
      areEqual: (a, b) => a.totalNodes === b.totalNodes && a.totalConnections === b.totalConnections,
    },
  );

  const totalNodes = totals.totalNodes;
  const totalConnections = totals.totalConnections;

  const viewportScale = useNodeCanvasViewportScale();
  const zoomPercentage = Math.round(viewportScale * 100);

  const selectionValue = React.useMemo(() => {
    if (selectedNodeCount === 0 && selectedConnectionCount === 0) {
      return "None";
    }
    const parts: string[] = [];
    if (selectedNodeCount > 0) {
      parts.push(`${selectedNodeCount} node${selectedNodeCount !== 1 ? "s" : ""}`);
    }
    if (selectedConnectionCount > 0) {
      parts.push(`${selectedConnectionCount} connection${selectedConnectionCount !== 1 ? "s" : ""}`);
    }
    return parts.join(", ");
  }, [selectedNodeCount, selectedConnectionCount]);

  const gridSettings = useNodeCanvasGridSettings();

  const gridValue = React.useMemo(() => {
    if (!gridSettings.showGrid) {
      return null;
    }
    const snapText = gridSettings.snapToGrid ? " (Snap ON)" : "";
    return `${gridSettings.size}px${snapText}`;
  }, [gridSettings.showGrid, gridSettings.size, gridSettings.snapToGrid]);

  const interactionFlags = useCanvasInteractionSelector(
    (state) => ({
      isDragging: Boolean(state.dragState),
      isSelecting: Boolean(state.selectionBox),
      isConnecting: Boolean(state.connectionDragState),
    }),
    {
      areEqual: (a, b) => a.isDragging === b.isDragging && a.isSelecting === b.isSelecting && a.isConnecting === b.isConnecting,
    },
  );
  const isPanning = useNodeCanvasPanActive();

  const operationMode = React.useMemo((): string => {
    if (interactionFlags.isDragging) {
      return "Moving";
    }
    if (interactionFlags.isSelecting) {
      return "Selecting";
    }
    if (interactionFlags.isConnecting) {
      return "Connecting";
    }
    if (isPanning) {
      return "Panning";
    }
    return "Ready";
  }, [interactionFlags.isDragging, interactionFlags.isSelecting, interactionFlags.isConnecting, isPanning]);

  return (
    <div className={styles.statusBar} data-testid="status-bar">
      {/* Selection info */}
      <StatusSection
        label="Selection"
        value={selectionValue}
      />

      {/* Total counts */}
      <StatusSection label="Total" value={`${totalNodes} nodes, ${totalConnections} connections`} />

      {/* Operation mode */}
      <StatusSection label="Mode" value={operationMode} variant="mode" />

      {/* Zoom level */}
      <StatusSection label="Zoom" value={`${zoomPercentage}%`} />

      {/* Position */}
      <PositionStatusSection />

      {/* Grid info */}
      {gridValue && <StatusSection label="Grid" value={gridValue} />}

      {/* Auto-save status */}
      {autoSave && (
        <StatusSection
          label="Auto-save"
          value={isSaving ? "Saving..." : "ON"}
          variant={isSaving ? "saving" : undefined}
        />
      )}

      {/* Theme info */}
      {settingsManager && (
        <StatusSection label="Theme" value={settingsManager.getValue("appearance.theme") || "light"} />
      )}
    </div>
  );
});

StatusBar.displayName = "StatusBar";
