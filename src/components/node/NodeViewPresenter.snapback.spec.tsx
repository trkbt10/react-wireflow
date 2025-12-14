/**
 * @file Regression test for node drag commit snapback.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import type { Node } from "../../types/core";
import { NodeViewPresenter, type NodeViewPresenterProps } from "./NodeViewPresenter";

const nextFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const getTranslateX = (el: HTMLElement): number | null => {
  const raw = el.style.transform;
  const match = raw.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) {
    return null;
  }
  const x = Number.parseFloat(match[1] ?? "");
  return Number.isFinite(x) ? x : null;
};

describe("NodeViewPresenter snapback regression", () => {
  it("does not snap back to base position when drag offset clears before node position commit", async () => {
    const node: Node = {
      id: "a",
      type: "label",
      position: { x: 0, y: 0 },
      size: { width: 200, height: 80 },
      data: { title: "A", labelTitle: "A" },
    };

    const baseProps: Omit<NodeViewPresenterProps, "node" | "dragOffset" | "isDragging" | "isVisuallyDragging"> = {
      isSelected: false,
      nodeRenderer: undefined,
      behaviorState: { isGroup: false, isAppearance: false },
      appearance: {
        groupBackground: undefined,
        groupOpacity: undefined,
        groupTextColor: undefined,
        backgroundWithOpacity: undefined,
      },
      resizeState: { isResizing: false, currentHandle: null, currentSize: null, currentPosition: null },
      displaySize: { width: 200, height: 80 },
      hasChildren: false,
      groupChildrenCount: 0,
      nodeDefinition: undefined,
      isUnknownType: false,
      externalDataState: {
        data: undefined,
        isLoading: false,
        error: null,
        refresh: () => undefined,
        update: async () => undefined,
      },
      ports: [],
      isEditingTitle: false,
      editingValue: "",
      onPointerDown: () => undefined,
      onContextMenu: () => undefined,
      onTitleDoubleClick: () => undefined,
      onEditingChange: () => undefined,
      onEditingKeyDown: () => undefined,
      onEditingBlur: () => undefined,
      onResizeStart: () => undefined,
      onUpdateNode: () => undefined,
      onStartEdit: () => undefined,
    };

    const { container, rerender } = render(
      <NodeViewPresenter
        {...baseProps}
        node={node}
        isDragging={true}
        isVisuallyDragging={true}
        dragOffset={{ x: 50, y: 0 }}
      />,
    );

    await nextFrame();

    const nodeEl = container.querySelector(`[data-node-id="a"]`) as HTMLElement | null;
    expect(nodeEl).not.toBeNull();
    expect(getTranslateX(nodeEl!)).toBe(50);

    // Simulate an intermediate render where drag offset cleared but node position is still old.
    rerender(
      <NodeViewPresenter
        {...baseProps}
        node={node}
        isDragging={false}
        isVisuallyDragging={false}
        dragOffset={undefined}
      />,
    );
    await nextFrame();

    // Should not snap back to 0 in this intermediate frame.
    expect(getTranslateX(nodeEl!)).toBe(50);

    // Finally, commit the node position update.
    rerender(
      <NodeViewPresenter
        {...baseProps}
        node={{ ...node, position: { x: 50, y: 0 } }}
        isDragging={false}
        isVisuallyDragging={false}
        dragOffset={undefined}
      />,
    );
    await nextFrame();

    expect(getTranslateX(nodeEl!)).toBe(50);
  });
});
