/**
 * @file Grouped node list pane - shows nodes grouped by category (for "All Nodes" in split view)
 */
import * as React from "react";
import type { NodeDefinitionCategory } from "../../../../category/types";
import { useI18n } from "../../../../i18n/context";
import { CategoryListView } from "../../../../category/components/CategoryListView";
import { PaneHeader } from "./PaneHeader";
import styles from "./GroupedNodeListPane.module.css";

export type GroupedNodeListPaneProps = {
  categories: NodeDefinitionCategory[];
  selectedNodeIndex: number;
  onNodeSelect: (nodeType: string) => void;
  onNodeHover: (index: number) => void;
  disabledNodeTypes: Set<string>;
  nodeIndexByType: Map<string, number>;
  /** When provided, nodes NOT in this set are shown as non-matching (dimmed) */
  matchingNodeTypes?: Set<string>;
};

export const GroupedNodeListPane: React.FC<GroupedNodeListPaneProps> = ({
  categories,
  selectedNodeIndex,
  onNodeSelect,
  onNodeHover,
  disabledNodeTypes,
  nodeIndexByType,
  matchingNodeTypes,
}) => {
  const { t } = useI18n();

  const totalNodeCount = React.useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.nodes.length, 0);
  }, [categories]);

  // Dummy handler - in split view, categories are selected via the tree, not the list
  const handleCategoryClickNoop = React.useCallback(
    (_categoryName: string, _multiSelect: boolean) => {
      // no-op
    },
    [],
  );

  // Empty set = no categories selected (show all)
  const emptySelectedCategories = React.useMemo(() => new Set<string>(), []);

  return (
    <div className={styles.groupedNodePane}>
      <PaneHeader>
        {t("nodeSearchAllNodes")}
        <span className={styles.nodeCountBadge}>{totalNodeCount}</span>
      </PaneHeader>
      <CategoryListView
        categories={categories}
        selectedCategories={emptySelectedCategories}
        onCategoryClick={handleCategoryClickNoop}
        selectedIndex={selectedNodeIndex}
        onNodeSelect={onNodeSelect}
        onNodeHover={onNodeHover}
        disabledNodeTypes={disabledNodeTypes}
        nodeIndexByType={nodeIndexByType}
        matchingNodeTypes={matchingNodeTypes}
      />
    </div>
  );
};

GroupedNodeListPane.displayName = "GroupedNodeListPane";
