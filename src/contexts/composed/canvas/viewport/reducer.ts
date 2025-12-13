/**
 * @file Reducer + default state for canvas viewport context
 */
import { createActionHandlerMap } from "../../../../utils/typedActions";
import { clampZoomScale } from "./utils/zoomScale";
import { nodeCanvasActions, type NodeCanvasAction, type NodeCanvasState } from "./context";

const nodeCanvasHandlers = createActionHandlerMap<NodeCanvasState, typeof nodeCanvasActions>(nodeCanvasActions, {
  setViewport: (state, action) => ({
    ...state,
    viewport: action.payload.viewport,
  }),
  panViewport: (state, action) => {
    const { delta } = action.payload;
    return {
      ...state,
      viewport: {
        ...state.viewport,
        offset: {
          x: state.viewport.offset.x + delta.x,
          y: state.viewport.offset.y + delta.y,
        },
      },
    };
  },
  zoomViewport: (state, action) => {
    const { scale, center } = action.payload;
    const newScale = clampZoomScale(scale);
    if (center) {
      const scaleRatio = newScale / state.viewport.scale;
      const newOffset = {
        x: center.x - (center.x - state.viewport.offset.x) * scaleRatio,
        y: center.y - (center.y - state.viewport.offset.y) * scaleRatio,
      };
      return {
        ...state,
        viewport: {
          offset: newOffset,
          scale: newScale,
        },
      };
    }
    return {
      ...state,
      viewport: {
        ...state.viewport,
        scale: newScale,
      },
    };
  },
  resetViewport: (state) => ({
    ...state,
    viewport: {
      offset: { x: 0, y: 0 },
      scale: 1,
    },
  }),
  updateGridSettings: (state, action) => ({
    ...state,
    gridSettings: {
      ...state.gridSettings,
      ...action.payload.settings,
    },
  }),
  setSpacePanning: (state, action) => ({
    ...state,
    isSpacePanning: action.payload.isSpacePanning,
  }),
  startPan: (state, action) => ({
    ...state,
    panState: {
      isPanning: true,
      startPosition: action.payload.position,
    },
  }),
  updatePan: (state, action) => {
    if (!state.panState.isPanning || !state.panState.startPosition) {
      return state;
    }
    const deltaX = action.payload.position.x - state.panState.startPosition.x;
    const deltaY = action.payload.position.y - state.panState.startPosition.y;
    return {
      ...state,
      viewport: {
        ...state.viewport,
        offset: {
          x: state.viewport.offset.x + deltaX,
          y: state.viewport.offset.y + deltaY,
        },
      },
      panState: {
        ...state.panState,
        startPosition: action.payload.position,
      },
    };
  },
  endPan: (state) => ({
    ...state,
    panState: {
      isPanning: false,
      startPosition: null,
    },
  }),
  setViewBox: (state, action) => ({
    ...state,
    viewBox: action.payload.viewBox,
  }),
});

export const nodeCanvasReducer = (state: NodeCanvasState, action: NodeCanvasAction): NodeCanvasState => {
  const handler = nodeCanvasHandlers[action.type];
  if (!handler) {
    return state;
  }
  return handler(state, action, undefined);
};

export const defaultNodeCanvasState: NodeCanvasState = {
  viewport: {
    offset: { x: 0, y: 0 },
    scale: 1,
  },
  gridSettings: {
    enabled: false,
    size: 20,
    showGrid: true,
    snapToGrid: false,
    snapThreshold: 8,
  },
  isSpacePanning: false,
  panState: {
    isPanning: false,
    startPosition: null,
  },
  viewBox: {
    width: 0,
    height: 0,
  },
};

