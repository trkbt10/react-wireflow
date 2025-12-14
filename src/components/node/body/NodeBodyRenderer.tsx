/**
 * @file Node body renderer component
 */
import * as React from "react";
import type { Node } from "../../../types/core";
import type { NodeDefinition } from "../../../types/NodeDefinition";
import type { NodeRendererProps } from "../../../types/NodeDefinition";
import { GroupNodeRenderer as GroupContent } from "../../../node-definitions/group/node";
import { LockIcon } from "../../elements/icons";
import { useI18n } from "../../../i18n/context";
import styles from "./NodeBodyRenderer.module.css";
import { hasNodeStateChanged } from "../../../core/node/comparators";

export type NodeBodyRendererProps = {
  node: Node;
  isSelected: boolean;
  nodeDefinition?: NodeDefinition;
  /** Whether this node's type is not registered in the definition registry */
  isUnknownType?: boolean;
  nodeRenderer?: (props: NodeRendererProps) => React.ReactNode;
  customRenderProps: NodeRendererProps;
  isEditing: boolean;
  editingValue: string;
  isGroup: boolean;
  groupChildrenCount: number;
  groupTextColor?: string;
  onTitleDoubleClick: (e: React.MouseEvent) => void;
  onEditingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditingKeyDown: (e: React.KeyboardEvent) => void;
  onEditingBlur: () => void;
};

/**
 * Renders the main body of a node (header and content)
 */
const NodeBodyRendererComponent: React.FC<NodeBodyRendererProps> = ({
  node,
  isSelected,
  nodeDefinition,
  isUnknownType,
  nodeRenderer,
  customRenderProps,
  isEditing,
  editingValue,
  isGroup,
  groupChildrenCount,
  groupTextColor,
  onTitleDoubleClick,
  onEditingChange,
  onEditingKeyDown,
  onEditingBlur,
}) => {
  const { t } = useI18n();
  const isComponentLikeRenderer = React.useCallback((renderFn: NonNullable<NodeDefinition["renderNode"]>): boolean => {
    const named = renderFn as unknown as { displayName?: string; name?: string };
    const name = named.displayName ?? named.name;
    const first = typeof name === "string" ? name.slice(0, 1) : "";
    return first.length > 0 && first === first.toUpperCase();
  }, []);

  // Render broken/corrupted node for unknown types
  if (isUnknownType) {
    return (
      <div className={styles.brokenNode}>
        <div className={styles.brokenHeader}>
          <span className={styles.brokenIcon}>&#x26A0;</span>
          <span className={styles.brokenTitle}>CORRUPTED NODE</span>
        </div>
        <div className={styles.brokenContent}>
          <div className={styles.brokenGlitch} data-text={node.type}>
            {node.type}
          </div>
          <div className={styles.brokenMeta}>
            <span className={styles.brokenLabel}>ID:</span>
            <code className={styles.brokenCode}>{node.id}</code>
          </div>
          {node.data.title && (
            <div className={styles.brokenMeta}>
              <span className={styles.brokenLabel}>Title:</span>
              <span className={styles.brokenValue}>{node.data.title}</span>
            </div>
          )}
          <div className={styles.brokenError}>
            Definition not found
          </div>
        </div>
        <div className={styles.brokenNoise} />
      </div>
    );
  }

  const renderCustom = (
    renderFn: ((props: NodeRendererProps) => React.ReactNode) | undefined,
  ): React.ReactElement | null => {
    if (!renderFn) {
      return null;
    }

    if (isComponentLikeRenderer(renderFn as NonNullable<NodeDefinition["renderNode"]>)) {
      const CustomNodeRenderer = renderFn as unknown as React.ComponentType<NodeRendererProps>;
      return (
        <div className={styles.customNodeContent}>
          <CustomNodeRenderer {...customRenderProps} />
        </div>
      );
    }

    return <div className={styles.customNodeContent}>{renderFn(customRenderProps)}</div>;
  };

  const renderedFromProp = renderCustom(nodeRenderer);
  if (renderedFromProp) {
    return renderedFromProp;
  }

  if (nodeDefinition?.renderNode) {
    return renderCustom(nodeDefinition.renderNode);
  }

  return (
    <>
      <div
        className={styles.nodeHeader}
        data-drag-handle={nodeDefinition?.interactive ? "true" : "false"}
        data-interactive={nodeDefinition?.interactive ? "true" : "false"}
        data-selected={isSelected ? "true" : "false"}
        data-is-group={isGroup ? "true" : "false"}
      >
        {node.locked && (
          <span className={styles.lockIcon}>
            <LockIcon size={12} />
          </span>
        )}
        {isEditing ? (
          <input
            id={`node-title-${node.id}`}
            name="nodeTitle"
            className={styles.nodeTitleInput}
            type="text"
            value={editingValue}
            onChange={onEditingChange}
            onKeyDown={onEditingKeyDown}
            onBlur={onEditingBlur}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="Node title"
          />
        ) : (
          <span
            className={styles.nodeTitle}
            onDoubleClick={onTitleDoubleClick}
            style={groupTextColor ? { color: groupTextColor } : undefined}
            data-is-group={isGroup ? "true" : "false"}
          >
            {node.data.title && node.data.title.trim().length > 0 ? node.data.title : t("untitled")}
          </span>
        )}
      </div>

      <div className={styles.nodeContent}>
        {isGroup ? <GroupContent node={node} childCount={groupChildrenCount} /> : node.data.content || "Empty node"}
      </div>
    </>
  );
};

// Temporary debug flag - set to true to enable detailed re-render logging
const DEBUG_NODEBODYRENDERER_RERENDERS = false;

// Memoized version with custom comparison
export const NodeBodyRenderer = React.memo(NodeBodyRendererComponent, (prevProps, nextProps) => {
  const nodeId = prevProps.node.id;
  const debugLog = (reason: string, details?: Record<string, unknown>) => {
    if (DEBUG_NODEBODYRENDERER_RERENDERS) {
      console.log(`[NodeBodyRenderer:${nodeId}] Re-rendering because:`, reason, details || "");
    }
  };

  // Check if basic props changed
  if (prevProps.node.id !== nextProps.node.id) {
    debugLog("node.id changed", { prev: prevProps.node.id, next: nextProps.node.id });
    return false;
  }
  if (prevProps.isSelected !== nextProps.isSelected) {
    debugLog("isSelected changed", { prev: prevProps.isSelected, next: nextProps.isSelected });
    return false;
  }
  if (prevProps.isEditing !== nextProps.isEditing) {
    debugLog("isEditing changed", { prev: prevProps.isEditing, next: nextProps.isEditing });
    return false;
  }
  if (prevProps.editingValue !== nextProps.editingValue) {
    debugLog("editingValue changed", { prev: prevProps.editingValue, next: nextProps.editingValue });
    return false;
  }
  if (prevProps.isGroup !== nextProps.isGroup) {
    debugLog("isGroup changed", { prev: prevProps.isGroup, next: nextProps.isGroup });
    return false;
  }
  if (prevProps.groupChildrenCount !== nextProps.groupChildrenCount) {
    debugLog("groupChildrenCount changed", { prev: prevProps.groupChildrenCount, next: nextProps.groupChildrenCount });
    return false;
  }
  if (prevProps.groupTextColor !== nextProps.groupTextColor) {
    debugLog("groupTextColor changed", { prev: prevProps.groupTextColor, next: nextProps.groupTextColor });
    return false;
  }

  // Check node state changes
  if (hasNodeStateChanged(prevProps.node, nextProps.node)) {
    debugLog("node.locked changed", { prev: prevProps.node.locked, next: nextProps.node.locked });
    return false;
  }
  if (prevProps.node.data.title !== nextProps.node.data.title) {
    debugLog("node.data.title changed", { prev: prevProps.node.data.title, next: nextProps.node.data.title });
    return false;
  }
  if (prevProps.node.data.content !== nextProps.node.data.content) {
    debugLog("node.data.content changed", { prev: prevProps.node.data.content, next: nextProps.node.data.content });
    return false;
  }

  // Check nodeDefinition changes
  if (prevProps.nodeDefinition?.interactive !== nextProps.nodeDefinition?.interactive) {
    debugLog("nodeDefinition.interactive changed", {
      prev: prevProps.nodeDefinition?.interactive,
      next: nextProps.nodeDefinition?.interactive,
    });
    return false;
  }
  if (prevProps.nodeDefinition?.renderNode !== nextProps.nodeDefinition?.renderNode) {
    debugLog("nodeDefinition.renderNode changed", {
      prev: prevProps.nodeDefinition?.renderNode,
      next: nextProps.nodeDefinition?.renderNode,
    });
    return false;
  }
  if (prevProps.nodeRenderer !== nextProps.nodeRenderer) {
    debugLog("nodeRenderer changed");
    return false;
  }

  // Check customRenderProps (deep comparison of relevant fields)
  if (prevProps.customRenderProps !== nextProps.customRenderProps) {
    const prevCustom = prevProps.customRenderProps;
    const nextCustom = nextProps.customRenderProps;

    if (prevCustom.node !== nextCustom.node) {
      debugLog("customRenderProps.node changed");
      return false;
    }

    if (prevCustom.isDragging !== nextCustom.isDragging) {
      debugLog("customRenderProps.isDragging changed", {
        prev: prevCustom.isDragging,
        next: nextCustom.isDragging,
      });
      return false;
    }
    if (prevCustom.isResizing !== nextCustom.isResizing) {
      debugLog("customRenderProps.isResizing changed", {
        prev: prevCustom.isResizing,
        next: nextCustom.isResizing,
      });
      return false;
    }

    if (prevCustom.externalData !== nextCustom.externalData) {
      debugLog("customRenderProps.externalData changed");
      return false;
    }
    if (prevCustom.isLoadingExternalData !== nextCustom.isLoadingExternalData) {
      debugLog("customRenderProps.isLoadingExternalData changed");
      return false;
    }
    if (prevCustom.externalDataError !== nextCustom.externalDataError) {
      debugLog("customRenderProps.externalDataError changed");
      return false;
    }
  }

  // Event handlers are assumed to be stable (useCallback)
  if (DEBUG_NODEBODYRENDERER_RERENDERS) {
    console.log(`[NodeBodyRenderer:${nodeId}] Skipped re-render (props are equal)`);
  }
  return true;
});
