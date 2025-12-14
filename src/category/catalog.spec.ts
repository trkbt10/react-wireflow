/**
 * @file Tests for node definition catalog grouping helpers.
 */
import type { NodeDefinition } from "../types/NodeDefinition";
import type { CategoryInfo } from "./types";
import {
  DEFAULT_NODE_CATEGORY,
  filterGroupedNodeDefinitions,
  groupNodeDefinitions,
  groupNodeDefinitionsNested,
  filterNestedNodeDefinitions,
  flattenNestedNodeDefinitions,
  parseCategoryPath,
  normalizeCategories,
  filterPrefixCategories,
} from "./catalog";

const baseNode = (overrides: Partial<NodeDefinition>): NodeDefinition => ({
  type: "node",
  displayName: "Node",
  ...overrides,
});

describe("groupNodeDefinitions", () => {
  it("sorts nodes within each category alphabetically while keeping groups stable", () => {
    const grouped = groupNodeDefinitions([
      baseNode({ type: "b", displayName: "Beta", category: "Basic" }),
      baseNode({ type: "a", displayName: "Alpha", category: "Basic" }),
      baseNode({ type: "z", displayName: "Zeta", category: "Advanced" }),
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.name).toBe("Advanced");
    expect(grouped[1]?.name).toBe("Basic");
    expect(grouped[1]?.nodes.map((node) => node.displayName)).toEqual(["Alpha", "Beta"]);
  });

  it("prioritizes categories that define priority and uses the smallest value per category", () => {
    const grouped = groupNodeDefinitions([
      baseNode({ type: "analytics", displayName: "Analytics", category: "Data", priority: 5 }),
      baseNode({ type: "basic-node", displayName: "Basic Node", category: "Basic", priority: 1 }),
      baseNode({ type: "group-node", displayName: "Group Node", category: "Structure", priority: 10 }),
      baseNode({ type: "untagged", displayName: "Other Node" }),
      baseNode({ type: "data-secondary", displayName: "Aggregator", category: "Data", priority: 7 }),
    ]);

    expect(grouped.map((category) => category.name)).toEqual(["Basic", "Data", "Structure", DEFAULT_NODE_CATEGORY]);
    expect(grouped.map((category) => category.sortOrder)).toEqual([1, 5, 10, null]);
  });
});

describe("filterGroupedNodeDefinitions", () => {
  it("preserves category sort order metadata after filtering", () => {
    const grouped = groupNodeDefinitions([
      baseNode({ type: "alpha", displayName: "Alpha", category: "Letters", priority: 2 }),
      baseNode({ type: "beta", displayName: "Beta", category: "Letters", priority: 2 }),
      baseNode({ type: "gamma", displayName: "Gamma", category: "Greek", priority: 1 }),
    ]);

    const filtered = filterGroupedNodeDefinitions(grouped, "alp");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Letters");
    expect(filtered[0]?.sortOrder).toBe(2);
    expect(filtered[0]?.nodes.map((node) => node.displayName)).toEqual(["Alpha"]);
  });
});

describe("parseCategoryPath", () => {
  it("splits category path by separator", () => {
    expect(parseCategoryPath("Data/Transform/Filter")).toEqual(["Data", "Transform", "Filter"]);
  });

  it("handles single segment", () => {
    expect(parseCategoryPath("Basic")).toEqual(["Basic"]);
  });

  it("trims whitespace from segments", () => {
    expect(parseCategoryPath("Data / Transform / Filter")).toEqual(["Data", "Transform", "Filter"]);
  });
});

describe("groupNodeDefinitionsNested", () => {
  it("creates nested structure from slash-separated categories", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "filter", displayName: "Filter", category: "Data/Transform" }),
      baseNode({ type: "map", displayName: "Map", category: "Data/Transform" }),
      baseNode({ type: "source", displayName: "Source", category: "Data" }),
      baseNode({ type: "basic", displayName: "Basic", category: "Basic" }),
    ]);

    expect(nested).toHaveLength(2);
    expect(nested.map((c) => c.name)).toEqual(["Basic", "Data"]);

    const dataCategory = nested.find((c) => c.name === "Data");
    expect(dataCategory?.nodes).toHaveLength(1);
    expect(dataCategory?.children).toHaveLength(1);
    expect(dataCategory?.children[0]?.name).toBe("Transform");
    expect(dataCategory?.children[0]?.nodes).toHaveLength(2);
    expect(dataCategory?.totalNodeCount).toBe(3);
  });

  it("calculates total node count including all descendants", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "a", displayName: "A", category: "Root/Child/Grandchild" }),
      baseNode({ type: "b", displayName: "B", category: "Root/Child" }),
      baseNode({ type: "c", displayName: "C", category: "Root" }),
    ]);

    expect(nested).toHaveLength(1);
    const root = nested[0];
    expect(root?.totalNodeCount).toBe(3);
    expect(root?.nodes).toHaveLength(1);
    expect(root?.children[0]?.totalNodeCount).toBe(2);
  });

  it("assigns nodes without category to default category", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "orphan", displayName: "Orphan" }),
    ]);

    expect(nested).toHaveLength(1);
    expect(nested[0]?.name).toBe(DEFAULT_NODE_CATEGORY);
  });

  it("extracts icon from categoryInfo", () => {
    const dataCategory: CategoryInfo = {
      name: "Data",
      icon: "📊",
      priority: 1,
    };

    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "source", displayName: "Source", category: "Data", categoryInfo: dataCategory }),
      baseNode({ type: "filter", displayName: "Filter", category: "Data" }),
    ]);

    expect(nested).toHaveLength(1);
    expect(nested[0]?.name).toBe("Data");
    expect(nested[0]?.icon).toBe("📊");
  });

  it("uses categoryInfo.priority over definition.priority for sorting", () => {
    const highPriority: CategoryInfo = {
      name: "Important",
      priority: 1,
    };

    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "low", displayName: "Low", category: "LowPrio", priority: 10 }),
      baseNode({ type: "high", displayName: "High", category: "Important", categoryInfo: highPriority, priority: 100 }),
    ]);

    expect(nested.map((c) => c.name)).toEqual(["Important", "LowPrio"]);
    expect(nested[0]?.sortOrder).toBe(1);
    expect(nested[1]?.sortOrder).toBe(10);
  });
});

describe("filterNestedNodeDefinitions", () => {
  it("filters nested categories by search query", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "filter", displayName: "Filter", category: "Data/Transform" }),
      baseNode({ type: "map", displayName: "Map", category: "Data/Transform" }),
      baseNode({ type: "source", displayName: "Source", category: "Data" }),
    ]);

    const filtered = filterNestedNodeDefinitions(nested, "filter");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Data");
    expect(filtered[0]?.children[0]?.nodes).toHaveLength(1);
    expect(filtered[0]?.children[0]?.nodes[0]?.displayName).toBe("Filter");
  });

  it("returns all categories when query is empty", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "a", displayName: "A", category: "Cat1" }),
      baseNode({ type: "b", displayName: "B", category: "Cat2" }),
    ]);

    const filtered = filterNestedNodeDefinitions(nested, "");
    expect(filtered).toHaveLength(2);
  });
});

describe("flattenNestedNodeDefinitions", () => {
  it("flattens nested structure into a single list", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "filter", displayName: "Filter", category: "Data/Transform" }),
      baseNode({ type: "source", displayName: "Source", category: "Data" }),
    ]);

    const flattened = flattenNestedNodeDefinitions(nested);
    expect(flattened).toHaveLength(2);
    expect(flattened.map((f) => f.node.type)).toEqual(["source", "filter"]);
    expect(flattened[1]?.categoryPath).toBe("Data/Transform");
  });
});

describe("normalizeCategories", () => {
  it("returns default category for undefined", () => {
    expect(normalizeCategories(undefined)).toEqual([DEFAULT_NODE_CATEGORY]);
  });

  it("wraps single string in array", () => {
    expect(normalizeCategories("Data")).toEqual(["Data"]);
  });

  it("returns array as-is when not empty", () => {
    expect(normalizeCategories(["Data", "UI"])).toEqual(["Data", "UI"]);
  });

  it("returns default category for empty array", () => {
    expect(normalizeCategories([])).toEqual([DEFAULT_NODE_CATEGORY]);
  });
});

describe("filterPrefixCategories", () => {
  it("filters out parent categories when child categories exist", () => {
    expect(filterPrefixCategories(["custom", "custom/ui"])).toEqual(["custom/ui"]);
  });

  it("keeps all categories when they are not prefixes of each other", () => {
    expect(filterPrefixCategories(["custom/ui", "custom/hoge"])).toEqual(["custom/ui", "custom/hoge"]);
  });

  it("filters multiple levels of parents", () => {
    expect(filterPrefixCategories(["a", "a/b", "a/b/c"])).toEqual(["a/b/c"]);
  });

  it("handles independent categories", () => {
    expect(filterPrefixCategories(["custom", "data"])).toEqual(["custom", "data"]);
  });

  it("handles single category", () => {
    expect(filterPrefixCategories(["custom"])).toEqual(["custom"]);
  });
});

describe("groupNodeDefinitions with multi-category", () => {
  it("places node in multiple categories", () => {
    const grouped = groupNodeDefinitions([
      baseNode({ type: "multi", displayName: "Multi Node", category: ["Data", "UI"] }),
      baseNode({ type: "single", displayName: "Single Node", category: "Data" }),
    ]);

    const dataCategory = grouped.find((c) => c.name === "Data");
    const uiCategory = grouped.find((c) => c.name === "UI");

    expect(dataCategory?.nodes).toHaveLength(2);
    expect(uiCategory?.nodes).toHaveLength(1);
    expect(uiCategory?.nodes[0]?.type).toBe("multi");
  });

  it("filters out parent categories when child categories exist", () => {
    const grouped = groupNodeDefinitions([
      baseNode({ type: "nested", displayName: "Nested Node", category: ["custom", "custom/ui"] }),
    ]);

    // Should only appear in custom/ui, not in custom
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.name).toBe("custom/ui");
    expect(grouped[0]?.nodes).toHaveLength(1);
  });

  it("does not duplicate node within same category", () => {
    const grouped = groupNodeDefinitions([
      baseNode({ type: "dupe", displayName: "Dupe Node", category: ["Data", "Data"] }),
    ]);

    const dataCategory = grouped.find((c) => c.name === "Data");
    expect(dataCategory?.nodes).toHaveLength(1);
  });
});

describe("groupNodeDefinitionsNested with multi-category", () => {
  it("places node in multiple hierarchical categories", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "multi", displayName: "Multi Node", category: ["Data/Transform", "UI/Controls"] }),
    ]);

    const dataCategory = nested.find((c) => c.name === "Data");
    const uiCategory = nested.find((c) => c.name === "UI");

    expect(dataCategory?.children[0]?.nodes).toHaveLength(1);
    expect(uiCategory?.children[0]?.nodes).toHaveLength(1);
  });

  it("prevents duplicate in shared parent when multiple child categories specified", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "shared", displayName: "Shared Node", category: ["custom/ui", "custom/hoge"] }),
    ]);

    const customCategory = nested.find((c) => c.name === "custom");
    // Node should appear in custom/ui and custom/hoge, but NOT directly in custom
    expect(customCategory?.nodes).toHaveLength(0);
    expect(customCategory?.children).toHaveLength(2);
    expect(customCategory?.children.find((c) => c.name === "ui")?.nodes).toHaveLength(1);
    expect(customCategory?.children.find((c) => c.name === "hoge")?.nodes).toHaveLength(1);
    expect(customCategory?.totalNodeCount).toBe(2); // Counts the node twice (once per category)
  });

  it("filters out parent when both parent and child are specified", () => {
    const nested = groupNodeDefinitionsNested([
      baseNode({ type: "child-only", displayName: "Child Only", category: ["custom", "custom/ui"] }),
    ]);

    const customCategory = nested.find((c) => c.name === "custom");
    // Should only appear in custom/ui, not directly in custom
    expect(customCategory?.nodes).toHaveLength(0);
    expect(customCategory?.children[0]?.name).toBe("ui");
    expect(customCategory?.children[0]?.nodes).toHaveLength(1);
  });
});
