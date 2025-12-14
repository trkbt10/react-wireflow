/**
 * @file Unit tests for resize queue helper.
 */
import { consumeResizeRequest, createResizeQueueState, requestResize } from "./resizeQueue";

describe("resizeQueue", () => {
  it("returns null when there is no request", () => {
    const state = createResizeQueueState();
    expect(consumeResizeRequest(state, { width: 100, height: 80 })).toBeNull();
  });

  it("coalesces to the latest request", () => {
    const state = createResizeQueueState();
    requestResize(state, { width: 100, height: 80 });
    requestResize(state, { width: 120, height: 90 });
    expect(consumeResizeRequest(state, { width: 100, height: 80 })).toEqual({ width: 120, height: 90 });
  });

  it("clears the request after consuming", () => {
    const state = createResizeQueueState();
    requestResize(state, { width: 120, height: 90 });
    expect(consumeResizeRequest(state, { width: 100, height: 80 })).toEqual({ width: 120, height: 90 });
    expect(consumeResizeRequest(state, { width: 120, height: 90 })).toBeNull();
  });

  it("does not emit when requested size equals applied size", () => {
    const state = createResizeQueueState();
    requestResize(state, { width: 120, height: 90 });
    expect(consumeResizeRequest(state, { width: 120, height: 90 })).toBeNull();
  });
});

