/**
 * @file NodeTreeItem action buttons (lock, visibility, delete)
 */
import * as React from "react";
import { CloseIcon, LockIcon, UnlockIcon } from "../../elements/icons";
import styles from "./NodeTreeItem.module.css";
import type { NodeId } from "../../../types/core";

export type NodeTreeItemActionButtonsProps = {
  nodeId: NodeId;
  locked: boolean;
  visible: boolean;
  onToggleVisibility: ((nodeId: NodeId) => void) | undefined;
  onToggleLock: ((nodeId: NodeId) => void) | undefined;
  onDeleteNode: ((nodeId: NodeId) => void) | undefined;
};

export const NodeTreeItemActionButtons: React.FC<NodeTreeItemActionButtonsProps> = React.memo(
  ({ nodeId, locked, visible, onToggleVisibility, onToggleLock, onDeleteNode }) => {
    const handleToggleVisibility = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onToggleVisibility) {
          return;
        }
        onToggleVisibility(nodeId);
      },
      [nodeId, onToggleVisibility],
    );

    const handleToggleLock = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onToggleLock) {
          return;
        }
        onToggleLock(nodeId);
      },
      [nodeId, onToggleLock],
    );

    const handleDeleteNode = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDeleteNode) {
          return;
        }
        onDeleteNode(nodeId);
      },
      [nodeId, onDeleteNode],
    );

    return (
      <>
        <button
          className={styles.lockButton}
          onClick={handleToggleLock}
          aria-label={locked ? "Unlock" : "Lock"}
          title={locked ? "Unlock" : "Lock"}
        >
          {locked ? <LockIcon size={16} /> : <UnlockIcon size={16} />}
        </button>

        <button
          className={styles.visibilityButton}
          onClick={handleToggleVisibility}
          aria-label={visible ? "Hide" : "Show"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            {visible ? (
              <path d="M8 3C4.5 3 1.73 5.11 1 8c.73 2.89 3.5 5 7 5s6.27-2.11 7-5c-.73-2.89-3.5-5-7-5zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            ) : (
              <>
                <path
                  d="M8 3C4.5 3 1.73 5.11 1 8c.73 2.89 3.5 5 7 5s6.27-2.11 7-5c-.73-2.89-3.5-5-7-5zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
                  opacity="0.3"
                />
                <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>

        <button className={styles.deleteButton} onClick={handleDeleteNode} aria-label="Delete node">
          <CloseIcon size={12} />
        </button>
      </>
    );
  },
);

NodeTreeItemActionButtons.displayName = "NodeTreeItemActionButtons";

