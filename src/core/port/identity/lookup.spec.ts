/**
 * @file Unit tests for cached port resolution
 */
import { createCachedPortResolver } from "./lookup";
import { canConnectPorts } from "../../connection/validation";
import type { Node, Port } from "../../../types/core";
import type { NodeDefinition } from "../../../types/NodeDefinition";

const createNode = (overrides: Partial<Node> = {}): Node => ({
  id: "node-1",
  type: "test",
  position: { x: 0, y: 0 },
  data: {},
  ...overrides,
});

const createDefinition = (overrides: Partial<NodeDefinition> = {}): NodeDefinition => ({
  type: "test",
  displayName: "Test",
  ...overrides,
});

const getRequiredPort = (ports: Port[], portId: string): Port => {
  const port = ports.find((candidate) => candidate.id === portId);
  if (!port) {
    throw new Error(`Expected port "${portId}" to exist`);
  }
  return port;
};

describe("createCachedPortResolver", () => {
  it("re-derives ports when the node definition reference changes (so canConnect sees updated derived fields)", () => {
    const resolver = createCachedPortResolver();

    const nodeA = createNode({ id: "node-a", data: { k: 1 } });
    const nodeB = createNode({ id: "node-b", data: { k: 1 } });

    const defV1 = createDefinition({
      ports: [
        { id: "out", type: "output", label: "Out", position: "right", dataType: "number" },
        { id: "in", type: "input", label: "In", position: "left", dataType: "string" },
      ],
    });

    const defV2 = createDefinition({
      ports: [
        { id: "out", type: "output", label: "Out", position: "right", dataType: "string" },
        {
          id: "in",
          type: "input",
          label: "In",
          position: "left",
          dataType: "string",
          canConnect: (ctx) => ctx.fromPort.dataType === "string" && ctx.toPort.dataType === "string",
        },
      ],
    });

    const portsA1 = resolver.getNodePorts(nodeA, defV1);
    const portsB1 = resolver.getNodePorts(nodeB, defV1);

    const outA1 = getRequiredPort(portsA1, "out");
    const inB1 = getRequiredPort(portsB1, "in");
    expect(canConnectPorts(outA1, inB1, defV1, defV1)).toBe(false);

    // Definition changed, but node instances and node.data references are unchanged.
    // Cached resolver must NOT reuse old derived ports, otherwise canConnect will observe stale Port.dataType.
    const portsA2 = resolver.getNodePorts(nodeA, defV2);
    const portsB2 = resolver.getNodePorts(nodeB, defV2);

    const outA2 = getRequiredPort(portsA2, "out");
    const inB2 = getRequiredPort(portsB2, "in");

    expect(outA2.dataType).toBe("string");
    expect(inB2.dataType).toBe("string");
    expect(canConnectPorts(outA2, inB2, defV2, defV2)).toBe(true);
  });
});

