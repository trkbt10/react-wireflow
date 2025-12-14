/**
 * @file Node tree list panel main component
 */
import * as React from "react";
import { useNodeEditor } from "../../../contexts/composed/node-editor/context";
import { useEditorActionState } from "../../../contexts/composed/EditorActionStateContext";
import { useNodeDefinitionList } from "../../../contexts/node-definitions/hooks/useNodeDefinitionList";
import { hasGroupBehavior } from "../../../types/behaviors";
import { PropertySection } from "../parts/PropertySection";
import { useI18n } from "../../../i18n/context";
import { ConnectedNodeTreeItem } from "../../controls/nodeTree/ConnectedNodeTreeItem";
import { useNodeDrop } from "../../controls/nodeTree/hooks/useNodeDrop";
import { NodeTreeDragStateContext, createNodeTreeDragStateStore } from "../../controls/nodeTree/dragStateStore";
import styles from "./NodeTreeListPanel.module.css";

export type NodeTreeListPanelProps = Record<string, never>;

export const NodeTreeListPanel: React.FC<NodeTreeListPanelProps> = () => {
  const { state: editorState, actions: editorActions } = useNodeEditor();
  const { actions: actionActions } = useEditorActionState();
  const nodeDefinitions = useNodeDefinitionList();
  const { t } = useI18n();
  const dragStateStore = React.useMemo(() => createNodeTreeDragStateStore(), []);

  // Get root level nodes (nodes without parent)
  const rootNodes = React.useMemo(() => {
    return Object.values(editorState.nodes).filter((node) => !node.parentId);
  }, [editorState.nodes]);

  // Sort root nodes: groups first, then by explicit order, then title
  const sortedRootNodes = React.useMemo(() => {
    return [...rootNodes].sort((a, b) => {
      const aIsGroup = hasGroupBehavior(nodeDefinitions.find((d) => d.type === a.type));
      const bIsGroup = hasGroupBehavior(nodeDefinitions.find((d) => d.type === b.type));
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
      const titleA = a.data?.title && a.data.title.trim().length > 0 ? a.data.title : t("untitled");
      const titleB = b.data?.title && b.data.title.trim().length > 0 ? b.data.title : t("untitled");
      return titleA.localeCompare(titleB);
    });
  }, [rootNodes, t, nodeDefinitions]);

  const handleDeselectAll = React.useCallback(() => {
    actionActions.clearSelection();
  }, [actionActions]);

  const handleNodeDrop = useNodeDrop({
    nodes: editorState.nodes,
    nodeDefinitions,
    updateNode: editorActions.updateNode,
  });

  const totalNodes = Object.keys(editorState.nodes).length;
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
          {sortedRootNodes.length === 0 ? (
            <div className={styles.emptyState}>No nodes yet</div>
          ) : (
            sortedRootNodes.map((node) => (
              <ConnectedNodeTreeItem key={node.id} nodeId={node.id} level={0} onNodeDrop={handleNodeDrop} />
            ))
          )}
        </div>
      </NodeTreeDragStateContext.Provider>
    </PropertySection>
  );
};
