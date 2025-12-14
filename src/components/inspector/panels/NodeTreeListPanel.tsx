/**
 * @file Node tree list panel main component
 */
import * as React from "react";
import { useNodeEditorApi, useNodeEditorSelector } from "../../../contexts/composed/node-editor/context";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { hasGroupBehavior } from "../../../types/behaviors";
import { PropertySection } from "../parts/PropertySection";
import { useI18n } from "../../../i18n/context";
import { ConnectedNodeTreeItem } from "../../controls/nodeTree/ConnectedNodeTreeItem";
import { useNodeDrop } from "../../controls/nodeTree/hooks/useNodeDrop";
import { NodeTreeDragStateContext, createNodeTreeDragStateStore } from "../../controls/nodeTree/dragStateStore";
import { areNodeIdArraysEqual } from "../../controls/nodeTree/utils/areNodeIdArraysEqual";
import type { NodeId } from "../../../types/core";
import styles from "./NodeTreeListPanel.module.css";

export type NodeTreeListPanelProps = Record<string, never>;

export const NodeTreeListPanel: React.FC<NodeTreeListPanelProps> = () => {
  const { actions: editorActions, getState } = useNodeEditorApi();
  const { actions: actionActions } = useEditorActionState();
  const nodeDefinitions = useNodeDefinitionList();
  const { t } = useI18n();
  const dragStateStore = React.useMemo(() => createNodeTreeDragStateStore(), []);

  const sortedRootNodeIds = useNodeEditorSelector<readonly NodeId[]>(
    (state) => {
      const isGroupByType = new Map(nodeDefinitions.map((d) => [d.type, hasGroupBehavior(d)]));
      const untitled = t("untitled");
      const rootNodes = Object.values(state.nodes).filter((node) => !node.parentId);
      const sorted = [...rootNodes].sort((a, b) => {
        const aIsGroup = isGroupByType.get(a.type) === true;
        const bIsGroup = isGroupByType.get(b.type) === true;
        if (aIsGroup && !bIsGroup) {
          return -1;
        }
        if (!aIsGroup && bIsGroup) {
          return 1;
        }
        const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
        const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
        if (ao !== bo) {
          return ao - bo;
        }
        const titleA = a.data?.title && a.data.title.trim().length > 0 ? a.data.title : untitled;
        const titleB = b.data?.title && b.data.title.trim().length > 0 ? b.data.title : untitled;
        return titleA.localeCompare(titleB);
      });
      return sorted.map((n) => n.id);
    },
    { areEqual: areNodeIdArraysEqual },
  );

  const handleDeselectAll = React.useCallback(() => {
    actionActions.clearSelection();
  }, [actionActions]);

  const handleNodeDrop = useNodeDrop({
    nodeDefinitions,
    getState,
    updateNode: editorActions.updateNode,
  });

  const totalNodes = useNodeEditorSelector<number>((state) => Object.keys(state.nodes).length, {
    areEqual: (a, b) => a === b,
  });
  const layerTitleKey = t("inspectorTabLayers");
  const layerTitle = layerTitleKey === "inspectorTabLayers" ? "Layers" : layerTitleKey;
  const nodeCountKey = t("inspectorLayersNodeCount", { count: totalNodes });
  const nodeCountLabel = nodeCountKey === "inspectorLayersNodeCount" ? `${totalNodes} nodes` : nodeCountKey;

  return (
    <PropertySection
      title={layerTitle}
      headerRight={<span className={styles.nodeCount}>{nodeCountLabel}</span>}
      className={styles.nodeTreeList}
      bodyClassName={styles.nodeTreeListBody}
    >
      <NodeTreeDragStateContext.Provider value={dragStateStore}>
        <div className={styles.treeContainer} onClick={handleDeselectAll}>
          {sortedRootNodeIds.length === 0 ? (
            <div className={styles.emptyState}>No nodes yet</div>
          ) : (
            sortedRootNodeIds.map((nodeId) => (
              <ConnectedNodeTreeItem key={nodeId} nodeId={nodeId} level={0} onNodeDrop={handleNodeDrop} />
            ))
          )}
        </div>
      </NodeTreeDragStateContext.Provider>
    </PropertySection>
  );
};
