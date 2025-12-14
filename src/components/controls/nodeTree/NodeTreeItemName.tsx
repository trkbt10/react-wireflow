/**
 * @file NodeTreeItem inline title editor
 */
import * as React from "react";
import styles from "./NodeTreeItem.module.css";
import type { NodeId } from "../../../types/core";

export type NodeTreeItemNameProps = {
  nodeId: NodeId;
  title: string | undefined;
  untitledLabel: string;
  onUpdateTitle: ((nodeId: NodeId, title: string) => void) | undefined;
  isDraggingTextRef: React.MutableRefObject<boolean>;
};

export const NodeTreeItemName: React.FC<NodeTreeItemNameProps> = React.memo(
  ({ nodeId, title, untitledLabel, onUpdateTitle, isDraggingTextRef }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editingTitle, setEditingTitle] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const pointerUpTimeoutId = React.useRef<number | null>(null);

    const handleDoubleClick = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onUpdateTitle) {
          return;
        }
        const currentTitle = title && title.trim().length > 0 ? title : "";
        setEditingTitle(currentTitle);
        setIsEditing(true);
      },
      [onUpdateTitle, title],
    );

    const handleNamePointerDown = React.useCallback(() => {
      isDraggingTextRef.current = true;
      if (pointerUpTimeoutId.current !== null) {
        window.clearTimeout(pointerUpTimeoutId.current);
        pointerUpTimeoutId.current = null;
      }
    }, [isDraggingTextRef]);

    const handleNamePointerUp = React.useCallback(() => {
      pointerUpTimeoutId.current = window.setTimeout(() => {
        isDraggingTextRef.current = false;
        pointerUpTimeoutId.current = null;
      }, 100);
    }, [isDraggingTextRef]);

    const handleTitleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setEditingTitle(e.target.value);
    }, []);

    const handleTitleBlur = React.useCallback(() => {
      const currentTitle = title || "";
      if (onUpdateTitle && editingTitle !== currentTitle) {
        onUpdateTitle(nodeId, editingTitle);
      }
      setIsEditing(false);
    }, [editingTitle, nodeId, onUpdateTitle, title]);

    const handleTitleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    }, []);

    React.useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    React.useEffect(() => {
      return () => {
        if (pointerUpTimeoutId.current !== null) {
          window.clearTimeout(pointerUpTimeoutId.current);
          pointerUpTimeoutId.current = null;
        }
      };
    }, []);

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          className={styles.nodeNameInput}
          value={editingTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <span
        className={styles.nodeName}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handleNamePointerDown}
        onPointerUp={handleNamePointerUp}
      >
        {title && title.trim().length > 0 ? title : untitledLabel}
      </span>
    );
  },
);

NodeTreeItemName.displayName = "NodeTreeItemName";

