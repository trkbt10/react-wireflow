/**
 * @file Unit tests for groupOperations membership helpers.
 */
import type { Node } from "../../../../types/core";
import { updateGroupMembership } from "./groupOperations";

const createNode = (overrides: Partial<Node>): Node => {
  return {
    id: "n",
    type: "label",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    data: { title: "n" },
    ...overrides,
  };
};

describe("updateGroupMembership", () => {
  it("does not emit updates when nodes have no parentId and no groups exist", () => {
    const nodes: Record<string, Node> = {
      a: createNode({ id: "a", parentId: undefined }),
      b: createNode({ id: "b", parentId: undefined, position: { x: 200, y: 0 } }),
    };

    expect(updateGroupMembership(nodes, [])).toEqual({});
  });

  it("removes a stale parentId when no group contains the node", () => {
    const nodes: Record<string, Node> = {
      a: createNode({ id: "a", parentId: "g1" }),
    };

    expect(updateGroupMembership(nodes, [])).toEqual({
      a: { parentId: undefined },
    });
  });
});
