# Connection Rules

This guide explains the 4 ways to customize port connectivity in the Node Editor. Each method addresses different use cases for controlling which ports can connect to each other.

## Overview

The Node Editor provides four extension points for connection validation:

| Method | Level | Use Case |
|--------|-------|----------|
| `dataType` | Port Definition | Type-based compatibility (e.g., number, string) |
| `canConnect` | Port Definition | Custom predicate function |
| `validateConnection` | Node Definition | Node-level validation logic |
| `maxConnections` | Port Definition | Capacity limits |

## 1. Data Type Compatibility (`dataType`)

The simplest way to control connectivity is through data types. Ports with incompatible types cannot connect.

### Single Type

```typescript
const NumberSourceDefinition: NodeDefinition = {
  type: "number-source",
  displayName: "Number Source",
  ports: [
    {
      id: "value",
      type: "output",
      label: "Number",
      position: "right",
      dataType: "number", // Only connects to ports accepting "number"
    },
  ],
};

const NumberConsumerDefinition: NodeDefinition = {
  type: "number-consumer",
  displayName: "Number Consumer",
  ports: [
    {
      id: "input",
      type: "input",
      label: "Number",
      position: "left",
      dataType: "number", // Only accepts "number" type
    },
  ],
};
```

### Multiple Types

Use `dataTypes` array to accept multiple types:

```typescript
const AnyConsumerDefinition: NodeDefinition = {
  type: "any-consumer",
  displayName: "Any Consumer",
  ports: [
    {
      id: "input",
      type: "input",
      label: "Any",
      position: "left",
      dataTypes: ["number", "string", "boolean"], // Accepts any of these types
    },
  ],
};
```

### Type Compatibility Rules

- If neither port has a dataType, they are compatible
- If only one port has a dataType, they are compatible
- If both ports have dataTypes, at least one type must overlap

## 2. Port-Level Predicate (`canConnect`)

For more complex logic, use the `canConnect` function on port definitions. This function receives context about the connection attempt.

### Example: Exclusive Connections

```typescript
const ExclusiveSourceDefinition: NodeDefinition = {
  type: "exclusive-source",
  displayName: "Exclusive Source",
  ports: [
    {
      id: "premium",
      type: "output",
      label: "Premium Only",
      position: "right",
      canConnect: (context: PortConnectionContext) => {
        // Only allow connections to premium-consumer nodes
        return context.toNode?.type === "premium-consumer";
      },
    },
  ],
};
```

### Example: Prevent Self-Connection

```typescript
const SelfAwareNodeDefinition: NodeDefinition = {
  type: "self-aware",
  displayName: "Self-Aware Node",
  ports: [
    {
      id: "output",
      type: "output",
      label: "Output",
      position: "right",
      canConnect: (context: PortConnectionContext) => {
        // Prevent connecting to nodes of the same type
        return context.toNode?.type !== "self-aware";
      },
    },
  ],
};
```

### PortConnectionContext

The `canConnect` function receives a context object with:

```typescript
type PortConnectionContext = {
  fromPort: Port;           // The output port
  toPort: Port;             // The input port
  fromNode?: Node;          // The source node
  toNode?: Node;            // The target node
  fromDefinition?: NodeDefinition;
  toDefinition?: NodeDefinition;
  allConnections?: Record<string, Connection>;
  dataTypeCompatible: boolean;  // Result of default data type check
};
```

The `dataTypeCompatible` field allows your `canConnect` function to use the default data type check as a baseline and only override it when needed:

```typescript
canConnect: (context: PortConnectionContext) => {
  // Use default data type check, but also require matching metadata
  return context.dataTypeCompatible &&
         context.fromNode?.data.category === context.toNode?.data.category;
}
```

## 3. Node-Level Validation (`validateConnection`)

For validation that depends on the entire node state, use `validateConnection` on the node definition.

### Example: Total Connection Limit

```typescript
const ValidatedHubDefinition: NodeDefinition = {
  type: "validated-hub",
  displayName: "Validated Hub",
  ports: [
    { id: "in1", type: "input", label: "Input 1", position: "left" },
    { id: "in2", type: "input", label: "Input 2", position: "left" },
    { id: "out", type: "output", label: "Output", position: "right" },
  ],
  validateConnection: (fromPort, toPort) => {
    // Custom validation logic
    // Called for both ends of the connection
    console.log(`Validating: ${fromPort.nodeId}:${fromPort.id} -> ${toPort.nodeId}:${toPort.id}`);
    return true; // Return false to reject the connection
  },
};
```

### When to Use

- Cross-port validation (e.g., limiting total connections across all ports)
- Validation that requires access to node data
- Complex business logic that spans multiple ports

## 4. Capacity Limits (`maxConnections`)

Control how many connections a port can have.

### Single Connection (Default)

```typescript
{
  id: "input",
  type: "input",
  label: "Single",
  position: "left",
  maxConnections: 1, // Default for input ports
}
```

### Limited Connections

```typescript
{
  id: "input",
  type: "input",
  label: "Max 3",
  position: "left",
  maxConnections: 3, // Accepts up to 3 connections
}
```

### Unlimited Connections

```typescript
{
  id: "input",
  type: "input",
  label: "Unlimited",
  position: "left",
  maxConnections: "unlimited", // No limit
}
```

## Validation Order

When a connection is attempted, validation occurs in this order:

1. **Basic checks**: Same node? Same port type (input-input/output-output)?
2. **Duplicate check**: Does this exact connection already exist?
3. **validateConnection**: Node-level validation callbacks
4. **dataType / canConnect**: Type compatibility or custom predicate
   - If `canConnect` is defined on either port, it **completely overrides** the data type check
   - If no `canConnect` is defined, the default data type compatibility check is used
   - `canConnect` receives `dataTypeCompatible` in context so it can reference the default result if needed
5. **maxConnections**: Capacity limit check

If any check fails, the connection is rejected.

## Pruning Invalid Connections

The Node Editor provides an action to automatically remove invalid connections:

```typescript
// Via useNodeEditor hook
const { actions } = useNodeEditor();
actions.pruneInvalidConnections();
```

This is useful when:
- Node definitions change after data is loaded
- External data import may contain invalid connections
- Migrating between versions with different rules

The prune action is also available in the Inspector panel under General Settings.

## Example: Connection Rules Demo

See the complete example at:
```
src/examples/demos/custom/connections/connection-rules/
```

This demo includes:
- All 4 connection rule types with visual badges
- Pre-configured valid connections
- An "abnormal" section showing invalid connections (highlighted in red)

## Best Practices

1. **Use `dataType` for simple type matching** - It's declarative and easy to understand

2. **Use `canConnect` for relationship rules** - When the connection depends on node types or other metadata

3. **Use `validateConnection` sparingly** - It's called for every connection attempt and can impact performance

4. **Set appropriate `maxConnections`** - Input ports typically accept 1 connection; output ports are often unlimited

5. **Combine methods when needed** - You can use multiple methods together (e.g., `dataType` + `maxConnections`)

6. **Provide visual feedback** - Use custom port renderers to show what rules apply to each port
