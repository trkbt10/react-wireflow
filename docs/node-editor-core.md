# NodeEditorCore Guide

This guide explains how to use `NodeEditorCore` and `NodeEditorCanvas` to build custom editor layouts without depending on the built-in GridLayout system.

## Overview

| Component | Purpose |
|-----------|---------|
| `NodeEditorCore` | Sets up all contexts and providers (state, history, i18n, etc.) |
| `NodeEditorCanvas` | Handles context menus and wraps the canvas |
| `NodeCanvas` | Renders nodes, connections, and handles interactions |

Use `NodeEditorCore` when you need:
- Complete control over the layout (flexbox, CSS Grid, custom UI framework)
- Integration with existing UI components
- Minimal bundle size (import from `react-wireflow/core`)

## Basic Structure

```tsx
import {
  NodeEditorCore,
  NodeEditorCanvas,
  NodeCanvas,
  type NodeEditorData,
} from "react-wireflow/core";

function MyCustomEditor() {
  const [data, setData] = React.useState<NodeEditorData>();

  return (
    <div className="my-custom-layout">
      <NodeEditorCore
        initialData={initialData}
        onDataChange={setData}
        nodeDefinitions={myNodeDefinitions}
      >
        {/* Your custom sidebar */}
        <aside className="sidebar">
          <h3>Node Palette</h3>
          {/* Custom content */}
        </aside>

        {/* Canvas area - required */}
        <main className="canvas-area">
          <NodeEditorCanvas>
            <NodeCanvas />
          </NodeEditorCanvas>
        </main>

        {/* Your custom inspector */}
        <aside className="inspector">
          <h3>Properties</h3>
          {/* Custom content */}
        </aside>
      </NodeEditorCore>
    </div>
  );
}
```

## NodeEditorCore Props

### Data Management

| Prop | Type | Description |
|------|------|-------------|
| `initialData` | `Partial<NodeEditorData>` | Initial data (uncontrolled mode) |
| `data` | `NodeEditorData` | Controlled data |
| `onDataChange` | `(data: NodeEditorData) => void` | Called when data changes |
| `onSave` | `(data: NodeEditorData) => void \| Promise<void>` | Save callback |
| `onLoad` | `() => NodeEditorData \| Promise<NodeEditorData>` | Load callback |

### Node Definitions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodeDefinitions` | `NodeDefinition[]` | `[]` | Custom node type definitions |
| `includeDefaultDefinitions` | `boolean` | `true` | Include built-in node types |
| `fallbackDefinition` | `FallbackDefinition \| boolean` | `true` | Fallback for unknown node types |

### External Data

| Prop | Type | Description |
|------|------|-------------|
| `externalDataRefs` | `Record<string, ExternalDataReference>` | External data references per node |

### Settings & i18n

| Prop | Type | Description |
|------|------|-------------|
| `settingsManager` | `SettingsManager` | Settings manager instance |
| `locale` | `Locale` | Current locale |
| `fallbackLocale` | `Locale` | Fallback locale |
| `messagesOverride` | `Partial<Record<Locale, Partial<I18nMessages>>>` | Message overrides |
| `localeDictionaries` | `I18nDictionaries` | Additional locale dictionaries |

### Auto-Save & History

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoSaveEnabled` | `boolean` | from settings | Enable auto-save |
| `autoSaveInterval` | `number` | from settings | Auto-save interval (seconds) |
| `historyMaxEntries` | `number` | `40` | Max undo/redo steps |

### Renderers & Behavior

| Prop | Type | Description |
|------|------|-------------|
| `renderers` | `NodeEditorRendererOverrides` | Custom node/port/connection renderers |
| `interactionSettings` | `NodeEditorInteractionSettingsPatch` | Pan, zoom, context menu settings |
| `portPositionBehavior` | `PortPositionBehavior` | Custom port position calculation |
| `connectionBehavior` | `Partial<ConnectionBehavior>` | Connection path calculation behavior |

## NodeEditorCanvas Props

| Prop | Type | Description |
|------|------|-------------|
| `settingsManager` | `SettingsManager` | Override settings manager |
| `children` | `ReactNode` | Canvas content (typically `<NodeCanvas />`) |

## Accessing Editor State with Hooks

Inside `NodeEditorCore`, you can use hooks to access and modify editor state.

### useNodeEditor

Main hook for accessing editor state and actions:

```tsx
import { useNodeEditor } from "react-wireflow/core";

function MyComponent() {
  const { state, actions, settingsManager } = useNodeEditor();

  // Access nodes and connections
  const nodes = state.nodes;
  const connections = state.connections;
  const selectedNodeIds = state.selectedNodeIds;

  // Perform actions
  const handleAddNode = () => {
    actions.addNode({
      id: `node-${Date.now()}`,
      type: "my-node",
      position: { x: 100, y: 100 },
      data: {},
    });
  };

  const handleDeleteSelected = () => {
    actions.deleteNodes(selectedNodeIds);
  };

  return (/* ... */);
}
```

### useNodeEditorActions

Access only actions (stable reference):

```tsx
import { useNodeEditorActions } from "react-wireflow/core";

function MyToolbar() {
  const actions = useNodeEditorActions();

  return (
    <div>
      <button onClick={() => actions.undo()}>Undo</button>
      <button onClick={() => actions.redo()}>Redo</button>
      <button onClick={() => actions.selectAll()}>Select All</button>
      <button onClick={() => actions.clearSelection()}>Clear Selection</button>
    </div>
  );
}
```

### useNodeEditorState

Access only state (reactive):

```tsx
import { useNodeEditorState } from "react-wireflow/core";

function MyStatusBar() {
  const state = useNodeEditorState();

  return (
    <div>
      Nodes: {Object.keys(state.nodes).length} |
      Connections: {Object.keys(state.connections).length} |
      Selected: {state.selectedNodeIds.length}
    </div>
  );
}
```

### useNodeEditorSelector

Optimized selector for specific state slices:

```tsx
import { useNodeEditorSelector } from "react-wireflow/core";

function MyNodeCount() {
  const nodeCount = useNodeEditorSelector(
    (state) => Object.keys(state.nodes).length
  );

  return <span>Nodes: {nodeCount}</span>;
}
```

### useSettings

Access settings reactively:

```tsx
import { useSettings } from "react-wireflow/core";

function MyThemeToggle({ settingsManager }) {
  const settings = useSettings(settingsManager);

  return (
    <button onClick={() => {
      settingsManager.setValue(
        "appearance.theme",
        settings.theme === "dark" ? "light" : "dark"
      );
    }}>
      Theme: {settings.theme}
    </button>
  );
}
```

## Available Actions

The `actions` object from `useNodeEditor` provides:

### Node Operations

```typescript
actions.addNode(node: Node): void
actions.updateNode(id: NodeId, updates: Partial<Node>): void
actions.deleteNode(id: NodeId): void
actions.deleteNodes(ids: NodeId[]): void
actions.duplicateNodes(ids: NodeId[]): void
```

### Connection Operations

```typescript
actions.addConnection(connection: Connection): void
actions.deleteConnection(id: ConnectionId): void
actions.deleteConnections(ids: ConnectionId[]): void
```

### Selection

```typescript
actions.selectNode(id: NodeId): void
actions.selectNodes(ids: NodeId[]): void
actions.toggleNodeSelection(id: NodeId): void
actions.clearSelection(): void
actions.selectAll(): void
```

### History

```typescript
actions.undo(): void
actions.redo(): void
```

### Validation

```typescript
actions.pruneInvalidConnections(): void
```

## Complete Example: Flexbox Layout

```tsx
import * as React from "react";
import {
  NodeEditorCore,
  NodeEditorCanvas,
  NodeCanvas,
  SettingsManager,
  createNodeDefinition,
  useNodeEditor,
  useSettings,
  type NodeEditorData,
} from "react-wireflow/core";
import {
  InspectorPanel,
  InspectorSection,
  InspectorSectionTitle,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  ReadOnlyField,
} from "react-wireflow/inspector";
import styles from "./MyEditor.module.css";

// Node definitions
const nodeDefinitions = [
  createNodeDefinition({
    type: "input",
    displayName: "Input",
    ports: [{ id: "out", type: "output", position: "right", label: "Output" }],
  }),
  createNodeDefinition({
    type: "process",
    displayName: "Process",
    ports: [
      { id: "in", type: "input", position: "left", label: "Input" },
      { id: "out", type: "output", position: "right", label: "Output" },
    ],
  }),
  createNodeDefinition({
    type: "output",
    displayName: "Output",
    ports: [{ id: "in", type: "input", position: "left", label: "Input" }],
  }),
];

// Custom sidebar component
function Sidebar() {
  const { state } = useNodeEditor();

  return (
    <aside className={styles.sidebar}>
      <InspectorSection>
        <InspectorSectionTitle>Statistics</InspectorSectionTitle>
        <InspectorDefinitionList>
          <InspectorDefinitionItem label="Nodes">
            <ReadOnlyField>{Object.keys(state.nodes).length}</ReadOnlyField>
          </InspectorDefinitionItem>
          <InspectorDefinitionItem label="Connections">
            <ReadOnlyField>{Object.keys(state.connections).length}</ReadOnlyField>
          </InspectorDefinitionItem>
          <InspectorDefinitionItem label="Selected">
            <ReadOnlyField>{state.selectedNodeIds.length}</ReadOnlyField>
          </InspectorDefinitionItem>
        </InspectorDefinitionList>
      </InspectorSection>
    </aside>
  );
}

// Main editor component
export function MyEditor() {
  const [data, setData] = React.useState<NodeEditorData>();

  const settingsManager = React.useMemo(() => {
    const manager = new SettingsManager();
    manager.setValue("behavior.nodeSearchViewMode", "split");
    return manager;
  }, []);

  const initialData: Partial<NodeEditorData> = {
    nodes: {
      "node-1": { id: "node-1", type: "input", position: { x: 100, y: 100 }, data: {} },
      "node-2": { id: "node-2", type: "process", position: { x: 350, y: 100 }, data: {} },
      "node-3": { id: "node-3", type: "output", position: { x: 600, y: 100 }, data: {} },
    },
    connections: {
      "conn-1": { id: "conn-1", fromNodeId: "node-1", fromPortId: "out", toNodeId: "node-2", toPortId: "in" },
      "conn-2": { id: "conn-2", fromNodeId: "node-2", fromPortId: "out", toNodeId: "node-3", toPortId: "in" },
    },
  };

  return (
    <div className={styles.container}>
      <NodeEditorCore
        initialData={initialData}
        onDataChange={setData}
        nodeDefinitions={nodeDefinitions}
        includeDefaultDefinitions={false}
        settingsManager={settingsManager}
        autoSaveEnabled={false}
      >
        <div className={styles.layout}>
          <Sidebar />

          <main className={styles.canvasArea}>
            <NodeEditorCanvas>
              <NodeCanvas />
            </NodeEditorCanvas>
          </main>

          <aside className={styles.inspector}>
            <InspectorPanel />
          </aside>
        </div>
      </NodeEditorCore>
    </div>
  );
}
```

```css
/* MyEditor.module.css */
.container {
  width: 100%;
  height: 100vh;
}

.layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 250px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.canvasArea {
  flex: 1;
  position: relative;
}

.inspector {
  width: 300px;
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}
```

## Using with Custom UI Frameworks

### With Shadcn/ui

```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { NodeEditorCore, NodeEditorCanvas, NodeCanvas } from "react-wireflow/core";

function ShadcnEditor() {
  return (
    <NodeEditorCore initialData={data} nodeDefinitions={definitions}>
      <div className="flex h-screen">
        <Card className="w-64 rounded-none">
          <CardHeader>Palette</CardHeader>
          <CardContent>{/* Node palette */}</CardContent>
        </Card>

        <div className="flex-1">
          <NodeEditorCanvas>
            <NodeCanvas />
          </NodeEditorCanvas>
        </div>

        <Card className="w-80 rounded-none">
          <CardHeader>Inspector</CardHeader>
          <CardContent>{/* Inspector content */}</CardContent>
        </Card>
      </div>
    </NodeEditorCore>
  );
}
```

### With Ant Design

```tsx
import { Layout, Menu } from "antd";
import { NodeEditorCore, NodeEditorCanvas, NodeCanvas } from "react-wireflow/core";

const { Sider, Content } = Layout;

function AntdEditor() {
  return (
    <NodeEditorCore initialData={data} nodeDefinitions={definitions}>
      <Layout style={{ height: "100vh" }}>
        <Sider width={250}>
          <Menu>{/* Node palette menu */}</Menu>
        </Sider>

        <Content>
          <NodeEditorCanvas>
            <NodeCanvas />
          </NodeEditorCanvas>
        </Content>

        <Sider width={300}>
          {/* Inspector content */}
        </Sider>
      </Layout>
    </NodeEditorCore>
  );
}
```

## Comparison: NodeEditor vs NodeEditorCore

| Feature | `NodeEditor` | `NodeEditorCore` |
|---------|--------------|------------------|
| Built-in GridLayout | Yes | No |
| Resizable panels | Yes | Manual |
| Floating layers | Yes | Manual |
| Drawer support | Yes | Manual |
| Bundle size | Larger | Smaller |
| Layout flexibility | Medium | Maximum |
| Setup complexity | Low | Medium |

Use `NodeEditor` when:
- You want quick setup with standard layouts
- You need resizable panels, floating layers, or drawers
- The GridLayout system meets your needs

Use `NodeEditorCore` when:
- You need complete layout control
- You're integrating with an existing UI framework
- You want to minimize bundle size
- You're building a highly custom UI

## Related Files

- `src/NodeEditorCore.tsx` - Core provider component
- `src/components/canvas/NodeEditorCanvas.tsx` - Canvas wrapper
- `src/components/canvas/NodeCanvas.tsx` - Canvas renderer
- `src/core.ts` - Core exports (use `react-wireflow/core`)
- `src/examples/demos/layout/custom-core/custom-layout-demo.tsx` - Example
