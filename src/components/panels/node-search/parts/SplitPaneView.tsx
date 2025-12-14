/**
 * @file split pane view with category tree on left and node list on right
 */
import * as React from "react";
import type { NodeDefinition } from "../../../../types/NodeDefinition";
import type {
  NestedNodeDefinitionCategory,
  NodeDefinitionCategory,
} from "../../../../category/types";
import { useI18n } from "../../../../i18n/context";
import { CategoryTree } from "../../../../category/components/CategoryTree";
import { GroupedNodeListPane } from "./GroupedNodeListPane";
import { NodeListPane } from "./NodeListPane";
import { PaneHeader } from "./PaneHeader";
import styles from "./SplitPaneView.module.css";

export type SplitPaneViewProps = {
  categories: NestedNodeDefinitionCategory[];
  /** Flat grouped categories to display when "All Nodes" is selected */
  groupedCategories: NodeDefinitionCategory[];
  /** Selected category paths (empty set means "All Nodes") */
  selectedCategoryPaths: Set<string>;
  /**
   * Called when a category is selected.
   * @param categoryPath - The selected category path (null for "All")
   * @param multiSelect - Whether this is a multi-select action (Cmd/Ctrl+click)
   */
  onCategorySelect: (categoryPath: string | null, multiSelect: boolean) => void;
  selectedNodeIndex: number;
  onNodeSelect: (nodeType: string) => void;
  onNodeHover: (index: number) => void;
  disabledNodeTypes: Set<string>;
  nodeIndexByType: Map<string, number>;
  /** When provided, nodes NOT in this set are shown as non-matching (dimmed) */
  matchingNodeTypes?: Set<string>;
};

/**
 * Get all nodes from a category and its descendants
 */
const getAllNodesFromCategory = (category: NestedNodeDefinitionCategory): NodeDefinition[] => {
  const nodes: NodeDefinition[] = [...category.nodes];
  category.children.forEach((child) => {
    nodes.push(...getAllNodesFromCategory(child));
  });
  return nodes;
};

/**
 * Find a category by its path
 */
const findCategoryByPath = (
  categories: NestedNodeDefinitionCategory[],
  path: string,
): NestedNodeDefinitionCategory | null => {
  for (const category of categories) {
    if (category.path === path) {
      return category;
    }
    const found = findCategoryByPath(category.children, path);
    if (found) {
      return found;
    }
  }
  return null;
};

export const SplitPaneView: React.FC<SplitPaneViewProps> = ({
  categories,
  groupedCategories,
  selectedCategoryPaths,
  onCategorySelect,
  selectedNodeIndex,
  onNodeSelect,
  onNodeHover,
  disabledNodeTypes,
  nodeIndexByType,
  matchingNodeTypes,
}) => {
  const { t } = useI18n();
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(() => {
    return new Set(categories.map((c) => c.path));
  });

  const handleToggle = React.useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Find all selected categories
  const selectedCategories = React.useMemo(() => {
    if (selectedCategoryPaths.size === 0) {
      return [];
    }
    const result: NestedNodeDefinitionCategory[] = [];
    for (const path of selectedCategoryPaths) {
      const category = findCategoryByPath(categories, path);
      if (category) {
        result.push(category);
      }
    }
    return result;
  }, [categories, selectedCategoryPaths]);

  const displayNodes = React.useMemo(() => {
    if (selectedCategoryPaths.size === 0) {
      // "All" selected - show all nodes
      const allNodes: NodeDefinition[] = [];
      const collectNodes = (cats: NestedNodeDefinitionCategory[]) => {
        cats.forEach((cat) => {
          allNodes.push(...cat.nodes);
          collectNodes(cat.children);
        });
      };
      collectNodes(categories);
      return allNodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    // Collect nodes from all selected categories, deduplicating by type
    const nodesByType = new Map<string, NodeDefinition>();
    for (const category of selectedCategories) {
      const categoryNodes = getAllNodesFromCategory(category);
      for (const node of categoryNodes) {
        if (!nodesByType.has(node.type)) {
          nodesByType.set(node.type, node);
        }
      }
    }
    return Array.from(nodesByType.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [categories, selectedCategoryPaths, selectedCategories]);

  // Generate pane title based on selection
  const paneTitle = React.useMemo(() => {
    if (selectedCategoryPaths.size === 0) {
      return t("nodeSearchAllNodes");
    }
    if (selectedCategories.length === 1) {
      return selectedCategories[0]!.name;
    }
    return `${selectedCategories.length} categories`;
  }, [selectedCategoryPaths.size, selectedCategories, t]);

  const showAllNodesGrouped = selectedCategoryPaths.size === 0;

  return (
    <div className={styles.splitPane}>
      <div className={styles.categoryPane}>
        <PaneHeader>{t("nodeSearchCategoriesHeader")}</PaneHeader>
        <CategoryTree
          categories={categories}
          selectedPaths={selectedCategoryPaths}
          onSelect={onCategorySelect}
          expandedPaths={expandedPaths}
          onToggle={handleToggle}
        />
      </div>

      {showAllNodesGrouped ? (
        <GroupedNodeListPane
          categories={groupedCategories}
          selectedNodeIndex={selectedNodeIndex}
          onNodeSelect={onNodeSelect}
          onNodeHover={onNodeHover}
          disabledNodeTypes={disabledNodeTypes}
          nodeIndexByType={nodeIndexByType}
          matchingNodeTypes={matchingNodeTypes}
        />
      ) : (
        <NodeListPane
          title={paneTitle}
          nodes={displayNodes}
          selectedNodeIndex={selectedNodeIndex}
          onNodeSelect={onNodeSelect}
          onNodeHover={onNodeHover}
          disabledNodeTypes={disabledNodeTypes}
          nodeIndexByType={nodeIndexByType}
          matchingNodeTypes={matchingNodeTypes}
        />
      )}
    </div>
  );
};

SplitPaneView.displayName = "SplitPaneView";
