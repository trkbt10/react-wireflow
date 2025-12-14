/**
 * @file Helpers for grouping and filtering node definitions for palette displays.
 */
import type { ReactNode } from "react";
import type { NodeDefinition } from "../types/NodeDefinition";
import type {
  NodeDefinitionCategory,
  NestedNodeDefinitionCategory,
  FlattenedNodeDefinition,
  FlattenedNestedNodeDefinition,
} from "./types";

export const DEFAULT_NODE_CATEGORY = "Other";
export const CATEGORY_SEPARATOR = "/";

/**
 * Normalize category to an array of category strings.
 * Handles both single string and array inputs.
 */
export const normalizeCategories = (category: string | string[] | undefined): string[] => {
  if (category === undefined) {
    return [DEFAULT_NODE_CATEGORY];
  }
  if (Array.isArray(category)) {
    return category.length > 0 ? category : [DEFAULT_NODE_CATEGORY];
  }
  return [category];
};

/**
 * Filter out categories that are prefixes of other categories in the list.
 * This prevents a node from appearing in both a parent and child category.
 * e.g., ["custom", "custom/ui"] -> ["custom/ui"] (custom is filtered out)
 * e.g., ["custom/ui", "custom/hoge"] -> ["custom/ui", "custom/hoge"] (neither is a prefix of the other)
 */
export const filterPrefixCategories = (categories: string[]): string[] => {
  return categories.filter((cat) => {
    const catWithSep = cat + CATEGORY_SEPARATOR;
    // Keep this category only if no other category starts with it as a prefix
    return !categories.some((other) => other !== cat && other.startsWith(catWithSep));
  });
};

/**
 * Group node definitions by category. Categories honor the lowest provided priority
 * before falling back to alphabetical ordering for the remaining groups.
 * Supports multi-category nodes - a node with multiple categories appears in each.
 * When categories share a parent (e.g., ["custom/ui", "custom/hoge"]), the node
 * appears only in the specific categories, not in the shared parent.
 */
export const groupNodeDefinitions = (nodeDefinitions: NodeDefinition[]): NodeDefinitionCategory[] => {
  const categoryMap = new Map<string, NodeDefinition[]>();
  const categoryOrder = new Map<string, number | null>();
  const categoryIcon = new Map<string, ReactNode>();
  // Track which nodes are already added to each category to prevent duplicates
  const categoryNodeTypes = new Map<string, Set<string>>();

  nodeDefinitions.forEach((definition) => {
    const rawCategories = normalizeCategories(definition.category);
    // Filter out parent categories when child categories exist
    const categories = filterPrefixCategories(rawCategories);

    categories.forEach((category) => {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
        categoryOrder.set(category, null);
        categoryNodeTypes.set(category, new Set());
      }

      // Only add if not already present (prevent duplicates within same category)
      const nodeTypes = categoryNodeTypes.get(category)!;
      if (!nodeTypes.has(definition.type)) {
        nodeTypes.add(definition.type);
        categoryMap.get(category)!.push(definition);
      }

      // Update icon from categoryInfo (first one wins)
      if (definition.categoryInfo?.icon !== undefined && !categoryIcon.has(category)) {
        categoryIcon.set(category, definition.categoryInfo.icon);
      }

      // Update sort order (categoryInfo.priority takes precedence over definition.priority)
      const definitionOrder = definition.categoryInfo?.priority ?? definition.priority;
      if (typeof definitionOrder === "number" && Number.isFinite(definitionOrder)) {
        const current = categoryOrder.get(category) ?? null;
        if (current === null || definitionOrder < current) {
          categoryOrder.set(category, definitionOrder);
        }
      }
    });
  });

  return Array.from(categoryMap.entries())
    .map<NodeDefinitionCategory>(([name, nodes]) => ({
      name,
      nodes: [...nodes].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      sortOrder: categoryOrder.get(name) ?? null,
      icon: categoryIcon.get(name),
    }))
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
};

/**
 * Filter grouped node definitions by search query. Matches on display name, description, type, or category.
 */
export const filterGroupedNodeDefinitions = (
  categories: NodeDefinitionCategory[],
  query: string,
): NodeDefinitionCategory[] => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return categories;
  }

  const lower = trimmed.toLowerCase();

  return categories
    .map<NodeDefinitionCategory | null>((category) => {
      const matchingNodes = category.nodes.filter((node) => {
        return (
          node.displayName.toLowerCase().includes(lower) ||
          node.type.toLowerCase().includes(lower) ||
          (node.description ? node.description.toLowerCase().includes(lower) : false) ||
          category.name.toLowerCase().includes(lower)
        );
      });

      if (matchingNodes.length === 0) {
        return null;
      }

      return {
        name: category.name,
        nodes: matchingNodes,
        sortOrder: category.sortOrder,
      };
    })
    .filter((category): category is NodeDefinitionCategory => Boolean(category));
};

/**
 * Create a flat list with category metadata to aid keyboard/focus navigation.
 */
export const flattenGroupedNodeDefinitions = (categories: NodeDefinitionCategory[]): FlattenedNodeDefinition[] => {
  const flattened: FlattenedNodeDefinition[] = [];
  categories.forEach((category) => {
    category.nodes.forEach((node) => {
      flattened.push({
        category: category.name,
        node,
      });
    });
  });
  return flattened;
};

/**
 * Parse a category string into path segments.
 * e.g., "Data/Transform/Filter" -> ["Data", "Transform", "Filter"]
 */
export const parseCategoryPath = (category: string): string[] => {
  return category
    .split(CATEGORY_SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean);
};

/**
 * Group node definitions into a nested hierarchy based on category paths.
 * Categories using "/" separator will be nested (e.g., "Data/Transform" creates Data -> Transform).
 * Supports multi-category nodes - a node with multiple categories appears in each.
 * When categories share a parent (e.g., ["custom/ui", "custom/hoge"]), the node
 * appears only in the specific categories, not in the shared parent.
 */
export const groupNodeDefinitionsNested = (nodeDefinitions: NodeDefinition[]): NestedNodeDefinitionCategory[] => {
  const rootMap = new Map<string, NestedNodeDefinitionCategory>();
  // Cache for quick lookup by full path
  const categoryByPath = new Map<string, NestedNodeDefinitionCategory>();
  // Track which nodes are already added to each category path to prevent duplicates
  const categoryNodeTypes = new Map<string, Set<string>>();

  const getOrCreateCategory = (segments: string[]): NestedNodeDefinitionCategory => {
    const fullPath = segments.join(CATEGORY_SEPARATOR);

    // Return cached category if exists
    if (categoryByPath.has(fullPath)) {
      return categoryByPath.get(fullPath)!;
    }

    const name = segments[segments.length - 1]!;
    const depth = segments.length - 1;

    const category: NestedNodeDefinitionCategory = {
      name,
      path: fullPath,
      depth,
      nodes: [],
      children: [],
      totalNodeCount: 0,
      sortOrder: null,
    };

    categoryByPath.set(fullPath, category);
    categoryNodeTypes.set(fullPath, new Set());

    if (segments.length === 1) {
      // Root level category
      rootMap.set(name, category);
    } else {
      // Ensure parent exists and add as child
      const parentSegments = segments.slice(0, -1);
      const parent = getOrCreateCategory(parentSegments);
      if (!parent.children.find((c) => c.name === name)) {
        parent.children.push(category);
      }
    }

    return category;
  };

  // First pass: create structure and assign nodes
  nodeDefinitions.forEach((definition) => {
    const rawCategories = normalizeCategories(definition.category);
    // Filter out parent categories when child categories exist
    const categories = filterPrefixCategories(rawCategories);

    categories.forEach((categoryString) => {
      const segments = parseCategoryPath(categoryString);
      const category = getOrCreateCategory(segments);

      // Only add if not already present (prevent duplicates within same category)
      const nodeTypes = categoryNodeTypes.get(category.path)!;
      if (!nodeTypes.has(definition.type)) {
        nodeTypes.add(definition.type);
        category.nodes.push(definition);
      }

      // Update icon from categoryInfo (first one wins)
      if (definition.categoryInfo?.icon !== undefined && category.icon === undefined) {
        category.icon = definition.categoryInfo.icon;
      }

      // Update sort order (categoryInfo.priority takes precedence over definition.priority)
      const definitionOrder = definition.categoryInfo?.priority ?? definition.priority;
      if (typeof definitionOrder === "number" && Number.isFinite(definitionOrder)) {
        if (category.sortOrder === null || definitionOrder < category.sortOrder) {
          category.sortOrder = definitionOrder;
        }
      }
    });
  });

  // Second pass: sort nodes and calculate totals
  const processCategory = (category: NestedNodeDefinitionCategory): void => {
    // Sort nodes alphabetically
    category.nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Process children recursively
    category.children.forEach(processCategory);

    // Sort children by sortOrder then name
    category.children.sort((a, b) => {
      const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate total node count
    category.totalNodeCount =
      category.nodes.length + category.children.reduce((sum, child) => sum + child.totalNodeCount, 0);

    // Propagate minimum sort order from children
    category.children.forEach((child) => {
      if (child.sortOrder !== null) {
        if (category.sortOrder === null || child.sortOrder < category.sortOrder) {
          category.sortOrder = child.sortOrder;
        }
      }
    });
  };

  rootMap.forEach(processCategory);

  // Convert to array and sort
  return Array.from(rootMap.values()).sort((a, b) => {
    const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name);
  });
};

/**
 * Filter nested categories by search query.
 * Returns categories that have matching nodes or matching category names.
 */
export const filterNestedNodeDefinitions = (
  categories: NestedNodeDefinitionCategory[],
  query: string,
): NestedNodeDefinitionCategory[] => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return categories;
  }

  const lower = trimmed.toLowerCase();

  const filterCategory = (category: NestedNodeDefinitionCategory): NestedNodeDefinitionCategory | null => {
    const categoryNameMatches = category.name.toLowerCase().includes(lower);

    // Filter nodes
    const matchingNodes = category.nodes.filter((node) => {
      return (
        node.displayName.toLowerCase().includes(lower) ||
        node.type.toLowerCase().includes(lower) ||
        (node.description ? node.description.toLowerCase().includes(lower) : false) ||
        categoryNameMatches
      );
    });

    // Filter children recursively
    const matchingChildren = category.children
      .map(filterCategory)
      .filter((child): child is NestedNodeDefinitionCategory => child !== null);

    // Include category if it has matching nodes or matching children
    if (matchingNodes.length === 0 && matchingChildren.length === 0) {
      return null;
    }

    return {
      ...category,
      nodes: matchingNodes,
      children: matchingChildren,
      totalNodeCount: matchingNodes.length + matchingChildren.reduce((sum, child) => sum + child.totalNodeCount, 0),
    };
  };

  return categories
    .map(filterCategory)
    .filter((category): category is NestedNodeDefinitionCategory => category !== null);
};

/**
 * Flatten nested categories into a single list for keyboard navigation.
 */
export const flattenNestedNodeDefinitions = (
  categories: NestedNodeDefinitionCategory[],
): FlattenedNestedNodeDefinition[] => {
  const flattened: FlattenedNestedNodeDefinition[] = [];

  const processCategory = (category: NestedNodeDefinitionCategory): void => {
    category.nodes.forEach((node) => {
      flattened.push({
        categoryPath: category.path,
        categoryName: category.name,
        node,
      });
    });
    category.children.forEach(processCategory);
  };

  categories.forEach(processCategory);
  return flattened;
};
