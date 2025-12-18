# Custom Node Guide

This guide explains how to create custom node definitions in the Node Editor.

## Overview

A `NodeDefinition` describes a node type's appearance, behavior, ports, and data structure. The Node Editor uses these definitions to render nodes and validate connections.

## Basic NodeDefinition

```typescript
import type { NodeDefinition } from "react-wireflow";

const BasicNodeDefinition: NodeDefinition = {
  // Required
  type: "my-node",           // Unique identifier (used in Node.type)
  displayName: "My Node",    // Display name in UI

  // Optional metadata
  description: "A description for the node palette",
  category: "My Category",   // For grouping in palette
  icon: <MyIcon />,          // Icon in palette

  // Default values for new nodes
  defaultData: { title: "New Node", value: 0 },
  defaultSize: { width: 200, height: 100 },
  defaultResizable: true,

  // Port definitions
  ports: [
    { id: "input", type: "input", position: "left", label: "Input" },
    { id: "output", type: "output", position: "right", label: "Output" },
  ],
};
```

## Custom Node Renderer

Use `renderNode` for complete control over node appearance.

### Basic Example

```typescript
import type { NodeDefinition, NodeRendererProps } from "react-wireflow";
import { NodeResizer } from "react-wireflow";

type TaskData = {
  title: string;
  status: "todo" | "in-progress" | "done";
  assignee?: string;
};

const TaskNodeRenderer = ({
  node,
  isSelected,
  isDragging,
  isResizing,
  isEditing,
  onStartEdit,
  onUpdateNode,
}: NodeRendererProps<TaskData>) => {
  const data = node.data;

  return (
    <NodeResizer node={node} defaultWidth={220} defaultHeight={120}>
      {() => (
        <div
          className="task-node"
          data-selected={isSelected ? "true" : undefined}
          data-dragging={isDragging ? "true" : undefined}
          data-status={data.status}
          onDoubleClick={onStartEdit}
        >
          <h3>{data.title}</h3>
          <div className="task-footer">
            <span className="status">{data.status}</span>
            {data.assignee && <span>Assigned to {data.assignee}</span>}
          </div>
        </div>
      )}
    </NodeResizer>
  );
};

const TaskNodeDefinition: NodeDefinition<TaskData> = {
  type: "task",
  displayName: "Task",
  defaultData: { title: "New Task", status: "todo" },
  defaultSize: { width: 220, height: 120 },
  ports: [
    { id: "depends-on", type: "input", position: "left", label: "Depends On" },
    { id: "blocks", type: "output", position: "right", label: "Blocks" },
  ],
  renderNode: TaskNodeRenderer,
};
```

### NodeRendererProps Reference

```typescript
type NodeRendererProps<TData extends Record<string, unknown>> = {
  /** The node with typed data */
  node: Node & { data: TData };
  /** Whether the node is currently selected */
  isSelected: boolean;
  /** Whether the node is being dragged */
  isDragging: boolean;
  /** Whether the node is being resized */
  isResizing: boolean;
  /** Whether the node is in inline editing mode */
  isEditing: boolean;
  /** External data if loaded via loadExternalData */
  externalData: unknown;
  /** Loading state for external data */
  isLoadingExternalData: boolean;
  /** Error state for external data */
  externalDataError: Error | null;
  /** Callback to start inline editing */
  onStartEdit: () => void;
  /** Callback to update node properties */
  onUpdateNode: (updates: Partial<Node>) => void;
};
```

## Port Configuration

### Basic Ports

```typescript
ports: [
  { id: "in", type: "input", position: "left", label: "Input" },
  { id: "out", type: "output", position: "right", label: "Output" },
]
```

### Port Positions

Simple positions:
```typescript
position: "left" | "right" | "top" | "bottom"
```

Segmented positions (for multiple ports on same side):
```typescript
position: {
  side: "left",
  segment: "input",        // Segment name
  segmentOrder: 0,         // Order within segment
  align: "center",         // Alignment: "start" | "center" | "end"
  inset: 10,               // Inset from edge in pixels
}
```

Absolute positions:
```typescript
position: {
  mode: "absolute",
  x: 0.5,                  // 0-1 fraction or pixel value
  y: 0,
  unit: "fraction",        // "fraction" or "pixel"
}
```

### Data Type Validation

```typescript
// Single type
{
  id: "number-out",
  type: "output",
  position: "right",
  label: "Number",
  dataType: "number",
}

// Multiple compatible types
{
  id: "numeric-in",
  type: "input",
  position: "left",
  label: "Numeric",
  dataTypes: ["number", "int", "float"],
}
```

Type compatibility rules:
- If neither port has a dataType, they are compatible
- If only one port has a dataType, they are compatible
- If both ports have dataTypes, at least one type must overlap

### Connection Limits

```typescript
// Input with single connection (default)
{
  id: "single-in",
  type: "input",
  position: "left",
  label: "Single",
  maxConnections: 1,
}

// Input with multiple connections
{
  id: "multi-in",
  type: "input",
  position: "left",
  label: "Multi",
  maxConnections: 5,
}

// Unlimited connections
{
  id: "unlimited-in",
  type: "input",
  position: "left",
  label: "Unlimited",
  maxConnections: "unlimited",
}
```

### Custom Connection Validation

```typescript
{
  id: "exclusive",
  type: "output",
  position: "right",
  label: "Exclusive Output",
  canConnect: (context) => {
    // context.fromPort - always OUTPUT port
    // context.toPort - always INPUT port
    // context.fromNode, context.toNode - node references
    // context.dataTypeCompatible - default type check result

    // Example: only connect to specific node types
    return context.toNode?.type === "receiver";
  },
}
```

### Dynamic Ports

Ports can be generated dynamically based on node data:

```typescript
{
  id: "item",
  type: "input",
  position: "left",
  label: "Item",
  // Number of instances (static or dynamic)
  instances: (context) => context.node.data.itemCount ?? 1,
  // Custom ID generator (default: `${id}-${index + 1}`)
  createPortId: (ctx) => `item-${ctx.index}`,
  // Custom label generator (default: `${label} ${index + 1}`)
  createPortLabel: (ctx) => `Item ${ctx.index + 1}`,
}
```

### Custom Port Renderer

```typescript
{
  id: "styled-port",
  type: "output",
  position: "right",
  label: "Styled",
  renderPort: (context, defaultRender) => {
    // context.port, context.node, context.isConnecting, etc.
    // defaultRender() renders the default port appearance
    return (
      <g className="custom-port">
        {defaultRender()}
        <circle r={8} fill={context.isConnectable ? "green" : "red"} />
      </g>
    );
  },
}
```

### Custom Connection Renderer

```typescript
{
  id: "styled-output",
  type: "output",
  position: "right",
  label: "Styled Connection",
  renderConnection: (context, defaultRender) => {
    // context.connection, context.fromPort, context.toPort
    // context.fromPosition, context.toPosition
    // context.path - path calculation utilities
    return (
      <g className="custom-connection">
        <path
          d={context.path.calculateDefaultPath()}
          stroke={context.isSelected ? "blue" : "gray"}
          strokeWidth={2}
          fill="none"
        />
      </g>
    );
  },
}
```

## External Data Integration

For nodes that load data from external sources (API, database, etc.):

```typescript
import type { ExternalDataReference } from "react-wireflow";

const ExternalNodeDefinition: NodeDefinition = {
  type: "external-task",
  displayName: "External Task",
  ports: [...],

  // Load external data when node is rendered
  loadExternalData: async (ref: ExternalDataReference) => {
    // ref.id - external data ID
    // ref.type - data type identifier
    // ref.version - optional version for optimistic locking
    const response = await fetch(`/api/tasks/${ref.id}`);
    return response.json();
  },

  // Save changes to external data
  updateExternalData: async (ref: ExternalDataReference, data: unknown) => {
    await fetch(`/api/tasks/${ref.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  renderNode: ExternalTaskRenderer,
  renderInspector: ExternalTaskInspector,
};

// Provide external data references to NodeEditor
<NodeEditor
  initialData={editorData}
  nodeDefinitions={[ExternalNodeDefinition]}
  externalDataRefs={{
    "node-1": { id: "task-123", type: "task" },
    "node-2": { id: "task-456", type: "task" },
  }}
/>
```

## Node-Level Connection Validation

Validate connections at the node level (applies to all ports):

```typescript
const ValidatedNodeDefinition: NodeDefinition = {
  type: "validated",
  displayName: "Validated Node",
  ports: [...],

  validateConnection: (fromPort, toPort) => {
    // fromPort is always OUTPUT, toPort is always INPUT
    // Return true to allow, false to reject
    console.log(`Validating: ${fromPort.nodeId}:${fromPort.id} -> ${toPort.nodeId}:${toPort.id}`);

    // Example: prevent connections from same node type
    // (Note: fromPort and toPort include nodeId but not node type,
    //  so you may need additional context)
    return true;
  },
};
```

## Node Constraints

Define constraints that validate node operations:

```typescript
import type { NodeConstraint, ConstraintContext, ConstraintValidationResult } from "react-wireflow";

const maxConnectionsConstraint: NodeConstraint = {
  id: "max-total-connections",
  name: "Maximum Total Connections",
  description: "Limit total connections to this node",
  blocking: true,  // Block operation if violated
  appliesTo: ["connect"],  // Only apply on connect operations

  validate: (context: ConstraintContext): ConstraintValidationResult => {
    const nodeConnections = Object.values(context.allConnections).filter(
      (c) => c.fromNodeId === context.node.id || c.toNodeId === context.node.id
    );

    if (nodeConnections.length >= 10) {
      return {
        isValid: false,
        violations: [{
          type: "max-connections",
          message: "Maximum 10 connections per node",
          severity: "error",
          nodeIds: [context.node.id],
        }],
      };
    }

    return { isValid: true, violations: [] };
  },
};

const LimitedNodeDefinition: NodeDefinition = {
  type: "limited",
  displayName: "Limited Node",
  ports: [...],
  constraints: [maxConnectionsConstraint],
};
```

### Built-in Limit: maxPerFlow

```typescript
const SingletonNodeDefinition: NodeDefinition = {
  type: "singleton",
  displayName: "Singleton Node",
  maxPerFlow: 1,  // Only one instance allowed per editor
  ports: [...],
};
```

## Custom Port Positions

Override default port positioning with `computePortPositions`:

```typescript
const CustomLayoutNodeDefinition: NodeDefinition = {
  type: "custom-layout",
  displayName: "Custom Layout",
  ports: [
    { id: "top-center", type: "input", position: "top", label: "Top" },
    { id: "bottom-center", type: "output", position: "bottom", label: "Bottom" },
  ],

  computePortPositions: (context) => {
    const { node, ports, nodeSize, defaultCompute } = context;

    // Start with default positions
    const positions = defaultCompute(ports);

    // Override specific port
    positions.set("top-center", {
      renderPosition: {
        x: nodeSize.width / 2,
        y: 0,
        transform: "translate(-50%, -50%)",
      },
      connectionPoint: {
        x: node.position.x + nodeSize.width / 2,
        y: node.position.y,
      },
    });

    return positions;
  },
};
```

## Node Behaviors

Control how the node behaves in the editor:

```typescript
// Standard node (default)
behaviors: ["node"]

// Group container (can contain other nodes)
behaviors: ["group"]

// Custom appearance with standard node behavior
behaviors: ["appearance", "node"]
```

### Disable Default Outline

When using custom selection styling:

```typescript
const CustomStyledNodeDefinition: NodeDefinition = {
  type: "custom-styled",
  displayName: "Custom Styled",
  disableOutline: true,  // Disable framework selection outline
  renderNode: CustomRenderer,
};
```

### Interactive Nodes

Nodes that contain interactive elements:

```typescript
const InteractiveNodeDefinition: NodeDefinition = {
  type: "interactive",
  displayName: "Interactive Node",
  interactive: true,  // Only draggable by title or when multi-selected
  renderNode: InteractiveRenderer,
};
```

## Visual State

Set a visual state for the node:

```typescript
const StatusNodeDefinition: NodeDefinition = {
  type: "status",
  displayName: "Status Node",
  visualState: "error",  // "info" | "success" | "warning" | "error" | "disabled"
};
```

## Categories

Organize nodes in the palette:

```typescript
// Single category
category: "Math"

// Multiple categories (node appears in both)
category: ["Math", "Utilities"]

// Hierarchical category (nested in palette)
category: "custom/ui/buttons"

// With category metadata
categoryInfo: {
  icon: <CategoryIcon />,
  priority: 10,  // Lower = higher in list
}
```

## Type-Safe Helpers

```typescript
import { createNodeDefinition, asNodeDefinition } from "react-wireflow";

// Type-safe creation with generic
const TypedNode = createNodeDefinition<MyDataType>({
  type: "typed",
  displayName: "Typed Node",
  defaultData: { value: 0, name: "" },
  ports: [],
});

// Convert typed definition to base type for arrays
const definitions: NodeDefinition[] = [
  asNodeDefinition(TypedNode),
  asNodeDefinition(AnotherTypedNode),
];
```

## Complete Example

```typescript
import type { NodeDefinition, NodeRendererProps, InspectorRenderProps } from "react-wireflow";
import { NodeResizer, PropertySection, InspectorDefinitionList, InspectorDefinitionItem, InspectorInput } from "react-wireflow";

type CounterData = {
  label: string;
  count: number;
  max: number;
};

const CounterRenderer = ({ node, isSelected, onUpdateNode }: NodeRendererProps<CounterData>) => {
  const { label, count, max } = node.data;

  return (
    <NodeResizer node={node} defaultWidth={180} defaultHeight={80}>
      {() => (
        <div className="counter-node" data-selected={isSelected}>
          <div className="label">{label}</div>
          <div className="count">{count} / {max}</div>
          <div className="buttons">
            <button onClick={() => onUpdateNode({ data: { ...node.data, count: count - 1 } })}>-</button>
            <button onClick={() => onUpdateNode({ data: { ...node.data, count: count + 1 } })}>+</button>
          </div>
        </div>
      )}
    </NodeResizer>
  );
};

const CounterInspector = ({ node, onUpdateNode }: InspectorRenderProps<CounterData>) => {
  const data = node.data;
  const handleChange = (key: keyof CounterData, value: CounterData[typeof key]) => {
    onUpdateNode({ data: { ...data, [key]: value } });
  };

  return (
    <PropertySection title="Counter Settings">
      <InspectorDefinitionList>
        <InspectorDefinitionItem label="Label">
          <InspectorInput value={data.label} onChange={(e) => handleChange("label", e.target.value)} />
        </InspectorDefinitionItem>
        <InspectorDefinitionItem label="Max">
          <InspectorInput type="number" value={data.max} onChange={(e) => handleChange("max", parseInt(e.target.value))} />
        </InspectorDefinitionItem>
      </InspectorDefinitionList>
    </PropertySection>
  );
};

const CounterNodeDefinition: NodeDefinition<CounterData> = {
  type: "counter",
  displayName: "Counter",
  description: "A simple counter with increment/decrement buttons",
  category: "Interactive",
  defaultData: { label: "Counter", count: 0, max: 100 },
  defaultSize: { width: 180, height: 80 },
  interactive: true,
  ports: [
    { id: "value-out", type: "output", position: "right", label: "Value", dataType: "number" },
    { id: "reset", type: "input", position: "left", label: "Reset" },
  ],
  renderNode: CounterRenderer,
  renderInspector: CounterInspector,
};
```

## Related Files

- `src/types/NodeDefinition.ts` - Type definitions
- `src/examples/demos/custom/nodes/custom-node/CustomNodeExample.tsx` - Basic example
- `src/examples/demos/advanced/advanced-node/` - Advanced node examples
- `src/examples/demos/custom/connections/connection-rules/` - Connection validation examples
- `src/examples/demos/basic/constrained-nodes/` - Constraint examples
- `src/examples/demos/custom/ports/` - Port customization examples
