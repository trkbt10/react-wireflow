/**
 * @file Node search menu component with multiple view modes
 */
import * as React from "react";
import type { NodeDefinition } from "../../../types/NodeDefinition";
import type { Position } from "../../../types/core";
import styles from "./NodeSearchMenu.module.css";
import { ContextMenuOverlay } from "../../layout/ContextMenuOverlay";
import { SearchHeader } from "./parts/SearchHeader";
import { SearchFooter } from "./parts/SearchFooter";
import { NoResults } from "./parts/NoResults";
import { CategoryListView } from "../../../category/components/CategoryListView";
import { SplitPaneView } from "./parts/SplitPaneView";
import { useI18n } from "../../../i18n/context";
import {
  flattenGroupedNodeDefinitions,
  groupNodeDefinitions,
  filterGroupedNodeDefinitions,
  groupNodeDefinitionsNested,
  filterNestedNodeDefinitions,
  flattenNestedNodeDefinitions,
} from "../../../category/catalog";
import type { NodeDefinitionCategory, NestedNodeDefinitionCategory } from "../../../category/types";

export type NodeSearchMenuViewMode = "list" | "split";
export type NodeSearchMenuFilterMode = "filter" | "highlight";

export type NodeSearchMenuProps = {
  position: Position;
  nodeDefinitions: NodeDefinition[];
  onCreateNode: (nodeType: string, position: Position) => void;
  onClose: () => void;
  visible: boolean;
  /** Node types that should be shown disabled due to per-flow limits */
  disabledNodeTypes?: string[];
  /** View mode: "list" (default vertical list) or "split" (split pane) */
  viewMode?: NodeSearchMenuViewMode;
  /** Filter mode: "filter" hides non-matching, "highlight" shows all with matches emphasized */
  filterMode?: NodeSearchMenuFilterMode;
  /** Minimum width of the menu in pixels */
  menuWidth?: number;
};

/**
 * NodeSearchMenu - Searchable context menu for creating nodes with multiple view modes
 */
export const NodeSearchMenu: React.FC<NodeSearchMenuProps> = ({
  position,
  nodeDefinitions,
  onCreateNode,
  onClose,
  visible,
  disabledNodeTypes = [],
  viewMode = "list",
  filterMode = "filter",
  menuWidth,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(() => new Set());
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Group node definitions based on view mode
  const groupedDefinitions = React.useMemo<NodeDefinitionCategory[]>(() => {
    return groupNodeDefinitions(nodeDefinitions);
  }, [nodeDefinitions]);

  const nestedDefinitions = React.useMemo<NestedNodeDefinitionCategory[]>(() => {
    return groupNodeDefinitionsNested(nodeDefinitions);
  }, [nodeDefinitions]);

  // Get matching node types for highlight mode
  const matchingNodeTypes = React.useMemo<Set<string>>(() => {
    if (!searchQuery.trim()) {
      return new Set<string>();
    }
    const filtered = filterGroupedNodeDefinitions(groupedDefinitions, searchQuery);
    const matchedTypes = new Set<string>();
    for (const category of filtered) {
      for (const node of category.nodes) {
        matchedTypes.add(node.type);
      }
    }
    return matchedTypes;
  }, [groupedDefinitions, searchQuery]);

  // Filter nodes based on search query, view mode, and filter mode
  const filteredListResults = React.useMemo<NodeDefinitionCategory[]>(() => {
    let results = groupedDefinitions;

    // Apply search filter first (only in filter mode)
    if (searchQuery.trim() && filterMode === "filter") {
      results = filterGroupedNodeDefinitions(results, searchQuery);
    }

    // Then apply category filter for list mode
    if (viewMode === "list" && selectedCategories.size > 0) {
      results = results.filter((category) => selectedCategories.has(category.name));
    }

    return results;
  }, [groupedDefinitions, searchQuery, selectedCategories, viewMode, filterMode]);

  const filteredNestedResults = React.useMemo<NestedNodeDefinitionCategory[]>(() => {
    if (!searchQuery.trim()) {
      return nestedDefinitions;
    }
    // In highlight mode, show all nodes
    if (filterMode === "highlight") {
      return nestedDefinitions;
    }
    return filterNestedNodeDefinitions(nestedDefinitions, searchQuery);
  }, [nestedDefinitions, searchQuery, filterMode]);

  // Get all nodes in flat list for keyboard navigation
  const allNodes = React.useMemo(() => {
    if (viewMode === "split") {
      // When "All Nodes" is selected (no categories), use grouped order to match CategoryListView display
      if (selectedCategories.size === 0) {
        return flattenGroupedNodeDefinitions(filteredListResults);
      }
      return flattenNestedNodeDefinitions(filteredNestedResults).map((item) => ({
        category: item.categoryName,
        node: item.node,
      }));
    }
    return flattenGroupedNodeDefinitions(filteredListResults);
  }, [viewMode, filteredListResults, filteredNestedResults, selectedCategories.size]);

  const nodeIndexByType = React.useMemo(() => {
    return allNodes.reduce<Map<string, number>>((map, entry, index) => {
      map.set(entry.node.type, index);
      return map;
    }, new Map());
  }, [allNodes]);

  // Focus search input when menu becomes visible
  React.useEffect(() => {
    if (visible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [visible]);

  // Reset state when menu becomes visible
  React.useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setSelectedIndex(0);
      setSelectedCategories(new Set());
    }
  }, [visible, position]);

  const disabledSet = React.useMemo(() => new Set(disabledNodeTypes), [disabledNodeTypes]);

  /**
   * Handle category selection with multi-select support.
   * - Normal click: single select (clears others)
   * - Cmd/Ctrl+click: toggle selection (add/remove from set)
   * - Clicking "All" (null): clears all selections
   */
  const handleCategorySelect = React.useCallback(
    (categoryPath: string | null, multiSelect: boolean) => {
      if (categoryPath === null) {
        // "All" clicked - clear all selections
        setSelectedCategories(new Set());
        setSelectedIndex(0);
        return;
      }

      setSelectedCategories((prev) => {
        if (multiSelect) {
          // Toggle selection
          const next = new Set(prev);
          if (next.has(categoryPath)) {
            next.delete(categoryPath);
          } else {
            next.add(categoryPath);
          }
          return next;
        }
        // Single select - replace with just this category
        // If already selected alone, toggle off
        if (prev.size === 1 && prev.has(categoryPath)) {
          return new Set();
        }
        return new Set([categoryPath]);
      });
      setSelectedIndex(0);
    },
    [],
  );

  const handleCategoryClick = React.useCallback(
    (categoryName: string, multiSelect: boolean) => {
      handleCategorySelect(categoryName, multiSelect);
    },
    [handleCategorySelect],
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, allNodes.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (allNodes[selectedIndex]) {
            const selectedNode = allNodes[selectedIndex].node;
            if (!disabledSet.has(selectedNode.type)) {
              onCreateNode(selectedNode.type, position);
              onClose();
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab": {
          e.preventDefault();
          if (viewMode === "list") {
            // Cycle through categories in list mode (single select behavior)
            const categoryNames = groupedDefinitions.map((cat) => cat.name);
            const currentSelected = selectedCategories.size === 1 ? [...selectedCategories][0] : null;
            const currentIndex = currentSelected ? categoryNames.indexOf(currentSelected) : -1;
            const nextIndex = (currentIndex + 1) % categoryNames.length;
            const nextCategory = categoryNames[nextIndex];
            if (nextCategory) {
              setSelectedCategories(new Set([nextCategory]));
              setSelectedIndex(0);
            }
          }
          break;
        }
      }
    },
    [allNodes, selectedIndex, onCreateNode, position, onClose, groupedDefinitions, selectedCategories, disabledSet, viewMode],
  );

  // Handle node selection
  const handleNodeSelect = React.useCallback(
    (nodeType: string) => {
      if (disabledSet.has(nodeType)) {
        return;
      }
      onCreateNode(nodeType, position);
      onClose();
    },
    [onCreateNode, position, onClose, disabledSet],
  );

  const handleNodeHover = React.useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Build custom style for menu width (must be before early return to maintain hook order)
  const menuStyle = React.useMemo(() => {
    if (menuWidth === undefined) {
      return undefined;
    }
    return { "--_menu-width-override": `${menuWidth}px` } as React.CSSProperties;
  }, [menuWidth]);

  if (!visible) {
    return null;
  }

  const hasResults = viewMode === "split" ? filteredNestedResults.length > 0 : filteredListResults.length > 0;
  const categoryCount = viewMode === "split" ? filteredNestedResults.length : filteredListResults.length;
  // In highlight mode, show no results only if there are no matching nodes
  const showNoResults =
    filterMode === "filter"
      ? !hasResults && searchQuery.trim()
      : searchQuery.trim() && matchingNodeTypes.size === 0;

  return (
    <ContextMenuOverlay
      anchor={position}
      visible={visible}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      dataAttributes={{ "node-search-menu": true }}
    >
      <div className={styles.nodeSearchMenu} data-view-mode={viewMode} style={menuStyle}>
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          inputRef={searchInputRef}
          placeholder={t("nodeSearchPlaceholder")}
          ariaLabel={t("nodeSearchAriaLabel")}
        />

        <div className={styles.searchResults}>
          {showNoResults ? (
            <NoResults searchQuery={searchQuery} />
          ) : viewMode === "split" ? (
            <SplitPaneView
              categories={filteredNestedResults}
              groupedCategories={filteredListResults}
              selectedCategoryPaths={selectedCategories}
              onCategorySelect={handleCategorySelect}
              selectedNodeIndex={selectedIndex}
              onNodeSelect={handleNodeSelect}
              onNodeHover={handleNodeHover}
              disabledNodeTypes={disabledSet}
              nodeIndexByType={nodeIndexByType}
              matchingNodeTypes={searchQuery.trim() ? matchingNodeTypes : undefined}
            />
          ) : (
            <CategoryListView
              categories={filteredListResults}
              selectedCategories={selectedCategories}
              onCategoryClick={handleCategoryClick}
              selectedIndex={selectedIndex}
              onNodeSelect={handleNodeSelect}
              onNodeHover={handleNodeHover}
              disabledNodeTypes={disabledSet}
              nodeIndexByType={nodeIndexByType}
              matchingNodeTypes={searchQuery.trim() ? matchingNodeTypes : undefined}
            />
          )}
        </div>

        <SearchFooter selectedIndex={selectedIndex} totalCount={allNodes.length} categoryCount={categoryCount} />
      </div>
    </ContextMenuOverlay>
  );
};

NodeSearchMenu.displayName = "NodeSearchMenu";
