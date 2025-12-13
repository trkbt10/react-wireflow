/**
 * @file Provider component for canvas interaction state context
 */
import * as React from "react";
import { bindActionCreators, createActionHandlerMap } from "../../../../utils/typedActions";
import {
  type CanvasInteractionState,
  type CanvasInteractionAction,
  type CanvasInteractionActionsValue,
  type CanvasInteractionContextValue,
  canvasInteractionActions,
  CanvasInteractionStateContext,
  CanvasInteractionDragStateContext,
  CanvasInteractionConnectionDragMetaContext,
  CanvasInteractionResizeStateContext,
  CanvasInteractionConnectionDisconnectActiveContext,
  CanvasInteractionActionsContext,
  CanvasInteractionContext,
} from "./context";

const canvasInteractionHandlers = createActionHandlerMap<CanvasInteractionState, typeof canvasInteractionActions>(
  canvasInteractionActions,
  {
    setSelectionBox: (state, action) => ({
      ...state,
      selectionBox: action.payload.box,
    }),
    startNodeDrag: (state, action) => {
      const { nodeIds, startPosition, initialPositions, affectedChildNodes } = action.payload;
      return {
        ...state,
        dragState: {
          nodeIds,
          startPosition,
          offset: { x: 0, y: 0 },
          initialPositions,
          affectedChildNodes,
        },
      };
    },
    updateNodeDrag: (state, action) => {
      if (!state.dragState) {
        return state;
      }
      return {
        ...state,
        dragState: {
          ...state.dragState,
          offset: action.payload.offset,
        },
      };
    },
    endNodeDrag: (state) => ({
      ...state,
      dragState: null,
    }),
    startConnectionDrag: (state, action) => ({
      ...state,
      connectionDragState: {
        fromPort: action.payload.fromPort,
        toPosition: { x: 0, y: 0 },
        validTarget: null,
        candidatePort: null,
      },
    }),
    updateConnectionDrag: (state, action) => {
      if (!state.connectionDragState) {
        return state;
      }
      return {
        ...state,
        connectionDragState: {
          ...state.connectionDragState,
          toPosition: action.payload.toPosition,
          candidatePort: action.payload.candidatePort,
        },
      };
    },
    endConnectionDrag: (state) => ({
      ...state,
      connectionDragState: null,
    }),
    startConnectionDisconnect: (state, action) => ({
      ...state,
      connectionDisconnectState: {
        connectionId: action.payload.originalConnection.id,
        fixedPort: action.payload.fixedPort,
        draggingEnd: action.payload.disconnectedEnd,
        draggingPosition: action.payload.draggingPosition,
        originalConnection: action.payload.originalConnection,
        disconnectedEnd: action.payload.disconnectedEnd,
        candidatePort: null,
      },
    }),
    updateConnectionDisconnect: (state, action) => {
      if (!state.connectionDisconnectState) {
        return state;
      }
      return {
        ...state,
        connectionDisconnectState: {
          ...state.connectionDisconnectState,
          draggingPosition: action.payload.draggingPosition,
          candidatePort: action.payload.candidatePort,
        },
      };
    },
    endConnectionDisconnect: (state) => ({
      ...state,
      connectionDisconnectState: null,
    }),
    startNodeResize: (state, action) => {
      const { nodeId, startPosition, startSize, handle, startNodePosition } = action.payload;
      return {
        ...state,
        resizeState: {
          nodeId,
          startPosition,
          startSize,
          startNodePosition,
          currentSize: startSize,
          currentPosition: startNodePosition,
          handle,
        },
      };
    },
    updateNodeResize: (state, action) => {
      if (!state.resizeState) {
        return state;
      }
      return {
        ...state,
        resizeState: {
          ...state.resizeState,
          currentSize: action.payload.currentSize,
          currentPosition: action.payload.currentPosition,
        },
      };
    },
    endNodeResize: (state) => ({
      ...state,
      resizeState: null,
    }),
  },
);

// Canvas interaction state reducer
export const canvasInteractionReducer = (
  state: CanvasInteractionState,
  action: CanvasInteractionAction,
): CanvasInteractionState => {
  const handler = canvasInteractionHandlers[action.type];
  if (!handler) {
    return state;
  }
  return handler(state, action, undefined);
};

// Default state
export const defaultCanvasInteractionState: CanvasInteractionState = {
  selectionBox: null,
  dragState: null,
  resizeState: null,
  connectionDragState: null,
  connectionDisconnectState: null,
};

// Provider
export type CanvasInteractionProviderProps = {
  children: React.ReactNode;
  initialState?: Partial<CanvasInteractionState>;
};

export const CanvasInteractionProvider: React.FC<CanvasInteractionProviderProps> = ({ children, initialState }) => {
  const [state, dispatch] = React.useReducer(canvasInteractionReducer, {
    ...defaultCanvasInteractionState,
    ...initialState,
  });
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const boundActions = React.useMemo(() => bindActionCreators(canvasInteractionActions, dispatch), [dispatch]);

  const connectionDragMeta = React.useMemo(() => {
    if (!state.connectionDragState) {
      return null;
    }
    return {
      fromPort: state.connectionDragState.fromPort,
      candidatePortId: state.connectionDragState.candidatePort?.id ?? null,
      candidatePortNodeId: state.connectionDragState.candidatePort?.nodeId ?? null,
    };
  }, [
    state.connectionDragState?.fromPort.nodeId,
    state.connectionDragState?.fromPort.id,
    state.connectionDragState?.candidatePort?.nodeId,
    state.connectionDragState?.candidatePort?.id,
  ]);

  const getState = React.useCallback(() => stateRef.current, []);

  // Stable actions value - only depends on dispatch which is stable
  const actionsValue = React.useMemo<CanvasInteractionActionsValue>(
    () => ({
      dispatch,
      actions: boundActions,
      actionCreators: canvasInteractionActions,
      getState,
    }),
    [dispatch, boundActions, getState],
  );

  // Combined context value
  const contextValue = React.useMemo<CanvasInteractionContextValue>(
    () => ({
      state,
      ...actionsValue,
    }),
    [state, actionsValue],
  );

  return (
    <CanvasInteractionStateContext.Provider value={state}>
      <CanvasInteractionDragStateContext.Provider value={state.dragState}>
        <CanvasInteractionConnectionDragMetaContext.Provider value={connectionDragMeta}>
          <CanvasInteractionResizeStateContext.Provider value={state.resizeState}>
            <CanvasInteractionConnectionDisconnectActiveContext.Provider value={Boolean(state.connectionDisconnectState)}>
              <CanvasInteractionActionsContext.Provider value={actionsValue}>
                <CanvasInteractionContext.Provider value={contextValue}>{children}</CanvasInteractionContext.Provider>
              </CanvasInteractionActionsContext.Provider>
            </CanvasInteractionConnectionDisconnectActiveContext.Provider>
          </CanvasInteractionResizeStateContext.Provider>
        </CanvasInteractionConnectionDragMetaContext.Provider>
      </CanvasInteractionDragStateContext.Provider>
    </CanvasInteractionStateContext.Provider>
  );
};
