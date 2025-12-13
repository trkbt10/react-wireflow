/**
 * @file External store for NodeCanvas state (avoids provider re-renders on pan)
 */
import type { NodeCanvasAction, NodeCanvasState } from "./context";
import { nodeCanvasReducer } from "./reducer";

export type NodeCanvasStore = {
  getState: () => NodeCanvasState;
  dispatch: (action: NodeCanvasAction) => void;
  subscribe: (listener: () => void) => () => void;
};

export const createNodeCanvasStore = (initialState: NodeCanvasState): NodeCanvasStore => {
  const stateRef: { current: NodeCanvasState } = { current: initialState };
  const listeners = new Set<() => void>();

  const getState = () => stateRef.current;

  const setState = (nextState: NodeCanvasState) => {
    if (Object.is(stateRef.current, nextState)) {
      return;
    }
    stateRef.current = nextState;
    listeners.forEach((listener) => listener());
  };

  const dispatch = (action: NodeCanvasAction) => {
    setState(nodeCanvasReducer(stateRef.current, action));
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getState,
    dispatch,
    subscribe,
  };
};

