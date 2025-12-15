/**
 * @file Unit test: keep the "All" row padding consistent with depth=0 category rows.
 */
import { render, screen } from "@testing-library/react";
import type { NestedNodeDefinitionCategory } from "../types";
import { CategoryTree } from "./CategoryTree";

describe("CategoryTree", () => {
  it("keeps the All row paddingLeft consistent with depth=0 rows", () => {
    const categories: NestedNodeDefinitionCategory[] = [
      {
        name: "Root",
        path: "Root",
        depth: 0,
        nodes: [],
        children: [],
        totalNodeCount: 1,
        sortOrder: null,
        icon: undefined,
      },
    ];

    const onSelect = (_path: string | null, _multiSelect: boolean) => undefined;
    const onToggle = (_path: string) => undefined;

    render(
      <CategoryTree
        categories={categories}
        selectedPaths={new Set<string>()}
        onSelect={onSelect}
        expandedPaths={new Set<string>()}
        onToggle={onToggle}
      />,
    );

    const allHeader = screen.getByText("All").closest("div");
    const rootHeader = screen.getByText("Root").closest("div");

    expect(allHeader).not.toBeNull();
    expect(rootHeader).not.toBeNull();

    expect(allHeader?.style.paddingLeft).toBe(rootHeader?.style.paddingLeft);
  });
});
