/**
 * @file Shared overlay container for context menus rendered via <dialog>
 */
import * as React from "react";
import { createPortal } from "react-dom";
import type { Position } from "../../types/core";
import { calculateContextMenuPosition, getViewportInfo } from "../elements/dialogUtils";
import { ensureDialogPolyfill } from "../../utils/polyfills/createDialogPolyfill";
import styles from "./ContextMenuOverlay.module.css";

type DataAttributes = Record<string, string | number | boolean>;

export type ContextMenuOverlayProps = {
  anchor: Position;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dataAttributes?: Record<string, string | number | boolean | null | undefined>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onPositionChange?: (position: Position) => void;
};

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

ensureDialogPolyfill();

export const ContextMenuOverlay: React.FC<ContextMenuOverlayProps> = React.memo(({
  anchor,
  visible,
  onClose,
  children,
  dataAttributes,
  onKeyDown,
  onPositionChange,
}) => {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const internalContentRef = React.useRef<HTMLDivElement>(null);
  const [computedPosition, setComputedPosition] = React.useState<Position>(anchor);
  // Track whether position has been computed (to avoid showing menu at wrong position initially)
  const [isPositionReady, setIsPositionReady] = React.useState(false);
  // Track current anchor to detect changes
  const anchorRef = React.useRef<Position>(anchor);

  // Use useEffectEvent to avoid re-registering listeners when callbacks change
  const handleClose = React.useEffectEvent(() => {
    onClose();
  });

  const handlePositionChange = React.useEffectEvent((position: Position) => {
    onPositionChange?.(position);
  });

  const updatePosition = React.useCallback(() => {
    if (!isBrowser || !internalContentRef.current) {
      return;
    }

    const rect = internalContentRef.current.getBoundingClientRect();
    const viewport = getViewportInfo();
    const nextPosition = calculateContextMenuPosition(anchor.x, anchor.y, rect.width, rect.height, viewport);
    setComputedPosition(nextPosition);
    setIsPositionReady(true);
    handlePositionChange(nextPosition);
  }, [anchor.x, anchor.y]);

  React.useLayoutEffect(() => {
    if (!visible || !isBrowser || !dialogRef.current) {
      return;
    }

    const dialog = dialogRef.current;
    dialog.showModal();

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [visible]);

  // Reset position when anchor changes, then immediately recalculate
  React.useLayoutEffect(() => {
    if (!visible) {
      // Reset ready state when menu is hidden
      setIsPositionReady(false);
      return;
    }
    // Only reset if anchor actually changed
    if (anchorRef.current.x !== anchor.x || anchorRef.current.y !== anchor.y) {
      anchorRef.current = anchor;
      // Reset ready state when anchor changes
      setIsPositionReady(false);
    }
    // Always recalculate position after content renders
    updatePosition();
  }, [visible, anchor.x, anchor.y, updatePosition]);

  // Use ResizeObserver to recalculate position when content size changes
  React.useLayoutEffect(() => {
    if (!visible || !isBrowser || !internalContentRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    resizeObserver.observe(internalContentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [visible, updatePosition]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (internalContentRef.current && !internalContentRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [visible]);

  React.useEffect(() => {
    if (!visible || !dialogRef.current) {
      return;
    }

    const dialog = dialogRef.current;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      handleClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [visible]);

  const positionStyle = React.useMemo((): React.CSSProperties => ({
    left: computedPosition.x,
    top: computedPosition.y,
    // Hide content until position is computed to prevent flicker at wrong position
    visibility: isPositionReady ? "visible" : "hidden",
  }), [computedPosition.x, computedPosition.y, isPositionReady]);

  const dataProps = React.useMemo<DataAttributes>(() => {
    if (!dataAttributes) {
      return {};
    }
    return Object.entries(dataAttributes).reduce<DataAttributes>((acc, [key, value]) => {
      if (value === null || value === undefined) {
        return acc;
      }
      acc[`data-${key}`] = value;
      return acc;
    }, {});
  }, [dataAttributes]);

  if (!isBrowser || !visible) {
    return null;
  }

  return createPortal(
    <dialog ref={dialogRef} className={styles.contextDialog}>
      <div
        ref={internalContentRef}
        className={styles.contextContent}
        style={positionStyle}
        onKeyDown={onKeyDown}
        {...dataProps}
      >
        {children}
      </div>
    </dialog>,
    document.body,
  );
});

ContextMenuOverlay.displayName = "ContextMenuOverlay";
