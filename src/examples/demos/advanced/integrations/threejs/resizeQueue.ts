/**
 * @file Minimal resize queue helper.
 * Ensures multiple resize requests coalesce and are applied at a controlled point (e.g., pre-render).
 */

export type RequestedSize = { width: number; height: number };

export type ResizeQueueState = {
  requested: RequestedSize | null;
};

export const createResizeQueueState = (): ResizeQueueState => ({ requested: null });

export const requestResize = (state: ResizeQueueState, size: RequestedSize): void => {
  state.requested = size;
};

export const consumeResizeRequest = (
  state: ResizeQueueState,
  applied: RequestedSize,
): RequestedSize | null => {
  const next = state.requested;
  state.requested = null;
  if (!next) {
    return null;
  }
  if (next.width === applied.width && next.height === applied.height) {
    return null;
  }
  return next;
};

