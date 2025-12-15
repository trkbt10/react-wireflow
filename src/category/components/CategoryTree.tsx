/**
 * @file Category tree component for hierarchical category navigation
 */
import * as React from "react";
import type { NestedNodeDefinitionCategory } from "../types";
import { CategoryIcon } from "./CategoryIcon";
import styles from "./CategoryTree.module.css";

export type CategoryTreeProps = {
  categories: NestedNodeDefinitionCategory[];
  /** Selected category paths (empty set means "All" is selected) */
  selectedPaths: Set<string>;
  /**
   * Called when a category is clicked.
   * @param path - The clicked category path (null for "All")
   * @param multiSelect - Whether this is a multi-select action (Cmd/Ctrl+click)
   */
  onSelect: (path: string | null, multiSelect: boolean) => void;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
};

type CategoryTreeItemProps = {
  category: NestedNodeDefinitionCategory;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (path: string, multiSelect: boolean) => void;
  onToggle: (path: string) => void;
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
};

const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({
  category,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  selectedPaths,
  expandedPaths,
}) => {
  const hasChildren = category.children.length > 0;

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      const isMultiSelect = e.metaKey || e.ctrlKey;
      onSelect(category.path, isMultiSelect);
    },
    [category.path, onSelect],
  );

  const handleToggle = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(category.path);
    },
    [category.path, onToggle],
  );

  return (
    <div className={styles.treeItem}>
      <div
        className={styles.treeItemHeader}
        data-is-selected={isSelected}
        data-depth={category.depth}
        onClick={handleClick}
        style={{ paddingLeft: `calc(var(--node-editor-space-md) * ${category.depth})` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.expandButton}
            onClick={handleToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <span className={styles.expandIcon} data-expanded={isExpanded}>
              ▶
            </span>
          </button>
        ) : (
          <span className={styles.expandPlaceholder} />
        )}
        {category.icon != null && <CategoryIcon icon={category.icon} />}
        <span className={styles.categoryLabel}>{category.name}</span>
        <span className={styles.categoryCount}>{category.totalNodeCount}</span>
      </div>

      {hasChildren && isExpanded ? (
        <div className={styles.treeChildren}>
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child.path}
              category={child}
              isSelected={selectedPaths.has(child.path)}
              isExpanded={expandedPaths.has(child.path)}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedPaths={selectedPaths}
              expandedPaths={expandedPaths}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

CategoryTreeItem.displayName = "CategoryTreeItem";

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedPaths,
  onSelect,
  expandedPaths,
  onToggle,
}) => {
  const totalNodeCount = React.useMemo(() => {
    return categories.reduce((sum, c) => sum + c.totalNodeCount, 0);
  }, [categories]);

  const handleAllClick = React.useCallback(
    (e: React.MouseEvent) => {
      const isMultiSelect = e.metaKey || e.ctrlKey;
      onSelect(null, isMultiSelect);
    },
    [onSelect],
  );

  const handleCategorySelect = React.useCallback(
    (path: string, multiSelect: boolean) => {
      onSelect(path, multiSelect);
    },
    [onSelect],
  );

  // "All" is selected when no specific categories are selected
  const isAllSelected = selectedPaths.size === 0;

  return (
    <div className={styles.categoryTree}>
      <div
        className={styles.treeItemHeader}
        data-is-selected={isAllSelected}
        data-depth={0}
        onClick={handleAllClick}
        style={{ paddingLeft: "calc(var(--node-editor-space-md) * 0)" }}
      >
        <span className={styles.expandPlaceholder} />
        <span className={styles.categoryLabel}>All</span>
        <span className={styles.categoryCount}>{totalNodeCount}</span>
      </div>
      {categories.map((category) => (
        <CategoryTreeItem
          key={category.path}
          category={category}
          isSelected={selectedPaths.has(category.path)}
          isExpanded={expandedPaths.has(category.path)}
          onSelect={handleCategorySelect}
          onToggle={onToggle}
          selectedPaths={selectedPaths}
          expandedPaths={expandedPaths}
        />
      ))}
    </div>
  );
};

CategoryTree.displayName = "CategoryTree";
