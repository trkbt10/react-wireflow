/**
 * @file Provider component for canvas viewport context
 */
import * as React from "react";
import { bindActionCreators } from "../../../../utils/typedActions";
import { useResizeObserver } from "../../../../hooks/useResizeObserver";
import {
  type NodeCanvasState,
  type NodeCanvasActionsValue,
  type NodeCanvasApiValue,
  nodeCanvasActions,
  NodeCanvasContext,
} from "./context";
import { createNodeCanvasStore } from "./store";
import { defaultNodeCanvasState, nodeCanvasReducer } from "./reducer";

export { nodeCanvasReducer, defaultNodeCanvasState };

// Provider
export type NodeCanvasProviderProps = {
  children: React.ReactNode;
  initialState?: Partial<NodeCanvasState>;
};

export const NodeCanvasProvider: React.FC<NodeCanvasProviderProps> = ({ children, initialState }) => {
  const initialStateRef = React.useRef<NodeCanvasState | null>(null);
  if (!initialStateRef.current) {
    initialStateRef.current = { ...defaultNodeCanvasState, ...initialState };
  }
  const store = React.useMemo(() => createNodeCanvasStore(initialStateRef.current!), []);

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dispatch = store.dispatch;

  const setContainerElement = React.useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (!element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      store.dispatch(nodeCanvasActions.setViewBox({ width: rect.width, height: rect.height }));
    },
    [store],
  );

  const boundActions = React.useMemo(() => bindActionCreators(nodeCanvasActions, dispatch), [dispatch]);

  const { rect } = useResizeObserver(containerRef, { box: "border-box" });

  React.useEffect(() => {
    if (!rect) {
      return;
    }
    store.dispatch(nodeCanvasActions.setViewBox({ width: rect.width, height: rect.height }));
  }, [rect?.width, rect?.height, store]);

  // Stable actions value - refs and dispatch are stable
  const actionsValue = React.useMemo<NodeCanvasActionsValue>(
    () => ({
      dispatch,
      actions: boundActions,
      actionCreators: nodeCanvasActions,
      canvasRef,
      containerRef,
      setContainerElement,
    }),
    [dispatch, boundActions, setContainerElement],
  );

  const utils = React.useMemo<NodeCanvasApiValue["utils"]>(() => {
    return {
      screenToCanvas: (screenX, screenY) => {
        const element = containerRef.current ?? canvasRef.current;
        if (!element) {
          return { x: screenX, y: screenY };
        }
        const viewport = store.getState().viewport;
        const rect = element.getBoundingClientRect();
        return {
          x: (screenX - rect.left - viewport.offset.x) / viewport.scale,
          y: (screenY - rect.top - viewport.offset.y) / viewport.scale,
        };
      },
      canvasToScreen: (canvasX, canvasY) => {
        const element = containerRef.current ?? canvasRef.current;
        if (!element) {
          return { x: canvasX, y: canvasY };
        }
        const viewport = store.getState().viewport;
        const rect = element.getBoundingClientRect();
        return {
          x: canvasX * viewport.scale + viewport.offset.x + rect.left,
          y: canvasY * viewport.scale + viewport.offset.y + rect.top,
        };
      },
    };
  }, [store]);

  const contextValue = React.useMemo<NodeCanvasApiValue>(
    () => ({
      ...actionsValue,
      store,
      utils,
    }),
    [actionsValue, store, utils],
  );

  return (
    <NodeCanvasContext.Provider value={contextValue}>{children}</NodeCanvasContext.Provider>
  );
};

/**
 * Debug notes:
 * - Reworked provider to use an external store so canvas panning doesn't force re-rendering the full editor subtree.
 */
