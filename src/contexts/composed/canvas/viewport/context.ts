/**
 * @file Context for managing canvas viewport, panning, zooming, and grid settings
 */
import * as React from "react";
import { createAction, type ActionUnion, type BoundActionCreators } from "../../../../utils/typedActions";
import type { Position, Viewport, GridSettings } from "../../../../types/core";
import type { createCanvasUtils } from "./utils/coordinateConversion";
import type { NodeCanvasStore } from "./store";

export type PanState = {
  isPanning: boolean;
  startPosition: Position | null;
};

export type CanvasViewBox = {
  width: number;
  height: number;
};

export type NodeCanvasState = {
  viewport: Viewport;
  gridSettings: GridSettings;
  isSpacePanning: boolean;
  panState: PanState;
  /**
   * Canvas container dimensions in CSS pixels.
   * Used as the viewbox for viewport-dependent calculations (visibility, minimap, etc).
   */
  viewBox: CanvasViewBox;
};

export const nodeCanvasActions = {
  setViewport: createAction("SET_VIEWPORT", (viewport: Viewport) => ({ viewport })),
  panViewport: createAction("PAN_VIEWPORT", (delta: Position) => ({ delta })),
  zoomViewport: createAction("ZOOM_VIEWPORT", (scale: number, center?: Position) => ({ scale, center })),
  resetViewport: createAction("RESET_VIEWPORT"),
  updateGridSettings: createAction("UPDATE_GRID_SETTINGS", (settings: Partial<GridSettings>) => ({ settings })),
  setSpacePanning: createAction("SET_SPACE_PANNING", (isSpacePanning: boolean) => ({ isSpacePanning })),
  startPan: createAction("START_PAN", (position: Position) => ({ position })),
  updatePan: createAction("UPDATE_PAN", (position: Position) => ({ position })),
  endPan: createAction("END_PAN"),
  setViewBox: createAction("SET_VIEWBOX", (viewBox: CanvasViewBox) => ({ viewBox })),
} as const;

export type NodeCanvasAction = ActionUnion<typeof nodeCanvasActions>;

// Context types
export type NodeCanvasActionsValue = {
  dispatch: (action: NodeCanvasAction) => void;
  actions: BoundActionCreators<typeof nodeCanvasActions>;
  actionCreators: typeof nodeCanvasActions;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setContainerElement: (element: HTMLDivElement | null) => void;
};

export type NodeCanvasUtils = ReturnType<typeof createCanvasUtils>;

export type NodeCanvasApiValue = NodeCanvasActionsValue & {
  store: NodeCanvasStore;
  utils: NodeCanvasUtils;
};

export type NodeCanvasContextValue = NodeCanvasActionsValue & {
  state: NodeCanvasState;
  utils: NodeCanvasUtils;
};

export const NodeCanvasContext = React.createContext<NodeCanvasApiValue | null>(null);
NodeCanvasContext.displayName = "NodeCanvasContext";

// Hooks

/**
 * Hook to access only the canvas state
 * Use this when you only need to read state and don't need actions
 */
export const useNodeCanvasState = (): NodeCanvasState => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasState must be used within a NodeCanvasProvider");
  }
  return React.useSyncExternalStore(context.store.subscribe, context.store.getState, context.store.getState);
};

export const useNodeCanvasViewportOffset = (): Position => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasViewportOffset must be used within a NodeCanvasProvider");
  }
  return React.useSyncExternalStore(
    context.store.subscribe,
    () => context.store.getState().viewport.offset,
    () => context.store.getState().viewport.offset,
  );
};

export const useNodeCanvasViewportScale = (): number => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasViewportScale must be used within a NodeCanvasProvider");
  }
  return React.useSyncExternalStore(
    context.store.subscribe,
    () => context.store.getState().viewport.scale,
    () => context.store.getState().viewport.scale,
  );
};

export const useNodeCanvasGridSettings = (): GridSettings => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasGridSettings must be used within a NodeCanvasProvider");
  }
  return React.useSyncExternalStore(
    context.store.subscribe,
    () => context.store.getState().gridSettings,
    () => context.store.getState().gridSettings,
  );
};

/**
 * Hook to access only the canvas actions
 * Use this when you only need to dispatch actions and don't need to re-render on state changes
 * The returned actions have stable references and won't cause re-renders
 */
export const useNodeCanvasActions = (): NodeCanvasActionsValue => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasActions must be used within a NodeCanvasProvider");
  }
  return context;
};

export const useNodeCanvasUtils = (): NodeCanvasUtils => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasUtils must be used within a NodeCanvasProvider");
  }
  return context.utils;
};

/**
 * Hook to access both state and actions (backward compatible)
 * Prefer useNodeCanvasState or useNodeCanvasActions for better performance
 */
export const useNodeCanvas = (): NodeCanvasContextValue => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvas must be used within a NodeCanvasProvider");
  }
  const state = React.useSyncExternalStore(context.store.subscribe, context.store.getState, context.store.getState);
  return {
    ...context,
    state,
  };
};

export const useNodeCanvasApi = (): NodeCanvasApiValue => {
  const context = React.useContext(NodeCanvasContext);
  if (!context) {
    throw new Error("useNodeCanvasApi must be used within a NodeCanvasProvider");
  }
  return context;
};
