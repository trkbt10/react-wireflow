/**
 * @file Category list view - vertical scrollable list with sticky category headers
 */
import * as React from "react";
import type { NodeDefinition } from "../../types/NodeDefinition";
import type { NodeDefinitionCategory } from "../types";
import { CategoryIcon } from "./CategoryIcon";
import { NodeCard } from "../../components/node/cards/NodeCard";
import styles from "./CategoryListView.module.css";

export type CategoryListViewProps = {
  categories: NodeDefinitionCategory[];
  /** Selected categories (empty set means all categories shown) */
  selectedCategories: Set<string>;
  /**
   * Called when a category is clicked.
   * @param categoryName - The clicked category name
   * @param multiSelect - Whether this is a multi-select action (Cmd/Ctrl+click)
   */
  onCategoryClick: (categoryName: string, multiSelect: boolean) => void;
  selectedIndex: number;
  onNodeSelect: (nodeType: string) => void;
  onNodeHover: (index: number) => void;
  disabledNodeTypes: Set<string>;
  nodeIndexByType: Map<string, number>;
  /** When provided, nodes NOT in this set are shown as non-matching (dimmed) */
  matchingNodeTypes?: Set<string>;
};

export const CategoryListView: React.FC<CategoryListViewProps> = ({
  categories,
  selectedCategories,
  onCategoryClick,
  selectedIndex,
  onNodeSelect,
  onNodeHover,
  disabledNodeTypes,
  nodeIndexByType,
  matchingNodeTypes,
}) => {
  const handleCategoryHeaderClick = React.useCallback(
    (e: React.MouseEvent, categoryName: string) => {
      const isMultiSelect = e.metaKey || e.ctrlKey;
      onCategoryClick(categoryName, isMultiSelect);
    },
    [onCategoryClick],
  );

  const handleNodeClick = React.useCallback(
    (node: NodeDefinition) => {
      if (!disabledNodeTypes.has(node.type)) {
        onNodeSelect(node.type);
      }
    },
    [disabledNodeTypes, onNodeSelect],
  );

  return (
    <div className={styles.categoryList}>
      {categories.map((category) => (
        <div key={category.name} className={styles.categoryGroup}>
          <div
            className={styles.categoryHeader}
            onClick={(e) => handleCategoryHeaderClick(e, category.name)}
            data-is-selected={selectedCategories.has(category.name)}
          >
            {category.icon != null && <CategoryIcon icon={category.icon} />}
            <span className={styles.categoryName}>{category.name}</span>
            <span className={styles.nodeCount}>{category.nodes.length}</span>
          </div>

          <div className={styles.nodeList}>
            {category.nodes.map((node) => {
              const globalIndex = nodeIndexByType.get(node.type) ?? -1;
              const isSelected = globalIndex === selectedIndex;
              const isDisabled = disabledNodeTypes.has(node.type);
              const isNonMatching = matchingNodeTypes !== undefined && !matchingNodeTypes.has(node.type);

              return (
                <NodeCard
                  key={node.type}
                  node={node}
                  variant="list"
                  isSelected={isSelected}
                  disabled={isDisabled}
                  isNonMatching={isNonMatching}
                  onClick={() => handleNodeClick(node)}
                  onPointerEnter={() => {
                    if (globalIndex >= 0) {
                      onNodeHover(globalIndex);
                    }
                  }}
                  role="menuitem"
                  tabIndex={-1}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

CategoryListView.displayName = "CategoryListView";
