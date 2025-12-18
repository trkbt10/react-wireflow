# react-wireflow

React components for building node-based workflow editors with TypeScript support.

[![npm version](https://img.shields.io/npm/v/react-wireflow?logo=npm&label=react-wireflow)](https://www.npmjs.com/package/react-wireflow)
[![npm downloads](https://img.shields.io/npm/dm/react-wireflow?color=cb3837)](https://www.npmjs.com/package/react-wireflow)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-wireflow?logo=rollup&label=min%2Bgzip)](https://bundlephobia.com/package/react-wireflow)
[![status](https://img.shields.io/badge/status-experimental-f97316.svg)](#)

Demo: https://trkbt10.github.io/react-wireflow/

Type-safe node definitions, customizable renderers, grid-based layouts, settings persistence, undo/redo, i18n.

## Installation

Requires React `^19.2.0` (uses `useEffectEvent`).

```bash
npm install react-wireflow
```

```tsx
import "react-wireflow/style.css";
```

## Usage

```tsx
import { NodeEditor, createNodeDefinition } from "react-wireflow";

const MyNode = createNodeDefinition({
  type: "my-node",
  displayName: "My Node",
  ports: [
    { id: "in", type: "input", position: "left" },
    { id: "out", type: "output", position: "right" },
  ],
});

function App() {
  const [data, setData] = useState({ nodes: {}, connections: {} });
  return <NodeEditor data={data} onDataChange={setData} nodeDefinitions={[MyNode]} />;
}
```

## Changelog

### Unreleased

- **Breaking:** `NodeRenderProps` was removed. Use `NodeRendererProps` instead.

## Custom ports and connections

Declare `renderPort` per port definition to override the visual while keeping editor interactions. The second argument renders the default dot, which you can keep for accessibility hitboxes or replace entirely. Always forward `context.handlers` and honor `context.position` (x, y, transform) for correct anchoring.

```tsx
const CustomPorts = createNodeDefinition({
  type: "custom-ports",
  displayName: "Custom Ports",
  ports: [
    {
      id: "emit",
      type: "output",
      label: "Emit",
      position: "right",
      dataType: ["text", "html"],
      renderPort: (context, defaultRender) => {
        if (!context.position) return defaultRender();
        const { x, y, transform } = context.position;
        return (
          <div
            style={{ position: "absolute", left: x, top: y, transform: transform ?? "translate(-50%, -50%)" }}
            onPointerDown={context.handlers.onPointerDown}
            onPointerUp={context.handlers.onPointerUp}
            onPointerEnter={context.handlers.onPointerEnter}
            onPointerMove={context.handlers.onPointerMove}
            onPointerLeave={context.handlers.onPointerLeave}
            onPointerCancel={context.handlers.onPointerCancel}
            data-state={context.isConnectable ? "ready" : context.isHovered ? "hovered" : "idle"}
          >
            <span className="port-dot" />
            <span className="port-label">{context.port.label}</span>
          </div>
        );
      },
      renderConnection: (context, defaultRender) => {
        // Example: decorate connected lines; fall back to default during previews
        if (!context.connection) return defaultRender();
        return defaultRender();
      },
    },
  ],
});
```

`PortRenderContext` includes `port`, `node`, `allNodes`, `allConnections`, booleans (`isConnecting`, `isConnectable`, `isCandidate`, `isHovered`, `isConnected`), optional `position`, and pointer handlers you must preserve. `ConnectionRenderContext` provides `phase`, `fromPort`, `toPort`, their positions, selection/hover flags, and handlers for pointer/cxtmenu; use it to add badges or halos while keeping hit-testing intact. For dynamic ports, set `instances`, `createPortId`, and `createPortLabel` on the port definition (see `src/examples/demos/custom/ports/port-playground` for a complete playground).

## Panels

Use `defaultEditorGridLayers` for built-in panels (canvas, inspector, statusbar):

```tsx
import { defaultEditorGridConfig, defaultEditorGridLayers } from "react-wireflow";

<NodeEditor gridConfig={defaultEditorGridConfig} gridLayers={defaultEditorGridLayers} />
```

Or define custom layouts:

```tsx
<NodeEditor
  gridConfig={{
    areas: [["canvas", "inspector"]],
    rows: [{ size: "1fr" }],
    columns: [{ size: "1fr" }, { size: "300px", resizable: true }],
  }}
  gridLayers={[
    { id: "canvas", component: <NodeCanvas />, gridArea: "canvas" },
    { id: "inspector", component: <InspectorPanel />, gridArea: "inspector" },
  ]}
/>
```

Add floating layers:

```tsx
const layers = [
  ...defaultEditorGridLayers,
  {
    id: "minimap",
    component: <YourMinimap />,
    positionMode: "absolute",
    position: { right: 10, bottom: 10 },
    draggable: true,
  },
];
```

Drawer for mobile:

```tsx
{ id: "panel", component: <MyPanel />, drawer: { placement: "right", open: isOpen } }
```

See [examples](https://github.com/trkbt10/react-wireflow/tree/main/src/examples/demos) for complete implementations.

## Custom Inspector Panels

The Inspector panel can be customized at three levels:

### 1. Per-Node Custom Inspector (`renderInspector`)

Define `renderInspector` in your node definition to provide custom inspector content when that node type is selected:

```tsx
import {
  createNodeDefinition,
  PropertySection,
  InspectorInput,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  type InspectorRenderProps,
} from "react-wireflow";

type PersonNodeData = {
  name: string;
  email: string;
};

// Custom inspector component (function name starts with uppercase to use hooks)
function PersonInspector({ node, onUpdateNode }: InspectorRenderProps<PersonNodeData>) {
  const data = node.data ?? {};

  return (
    <PropertySection title="Person Details">
      <InspectorDefinitionList>
        <InspectorDefinitionItem label="Name">
          <InspectorInput
            value={data.name ?? ""}
            onChange={(e) => onUpdateNode({ data: { ...data, name: e.target.value } })}
          />
        </InspectorDefinitionItem>
        <InspectorDefinitionItem label="Email">
          <InspectorInput
            type="email"
            value={data.email ?? ""}
            onChange={(e) => onUpdateNode({ data: { ...data, email: e.target.value } })}
          />
        </InspectorDefinitionItem>
      </InspectorDefinitionList>
    </PropertySection>
  );
}

const PersonNode = createNodeDefinition({
  type: "person",
  displayName: "Person",
  renderInspector: PersonInspector,
});
```

`InspectorRenderProps` provides:
- `node` - The selected node with typed `data`
- `onUpdateNode(updates)` - Callback to update node properties
- `onDeleteNode()` - Callback to delete the node
- `externalData`, `isLoadingExternalData`, `externalDataError` - External data state
- `onUpdateExternalData(data)` - Callback to update external data

### 2. Custom Inspector Tabs

Replace or extend the default tabs (Layers, Properties, Settings) by passing `tabs` to `InspectorPanel`:

```tsx
import {
  InspectorPanel,
  InspectorLayersTab,
  InspectorPropertiesTab,
  InspectorSettingsTab,
  InspectorSection,
  PropertySection,
  type InspectorPanelTabConfig,
} from "react-wireflow";

// Custom tab component
const StatisticsTab = () => (
  <InspectorSection>
    <PropertySection title="Statistics">
      <p>Total nodes: 10</p>
    </PropertySection>
  </InspectorSection>
);

const customTabs: InspectorPanelTabConfig[] = [
  { id: "layers", label: "Layers", render: () => <InspectorLayersTab /> },
  { id: "properties", label: "Properties", render: () => <InspectorPropertiesTab /> },
  { id: "stats", label: "Stats", render: () => <StatisticsTab /> },
  { id: "settings", label: "Settings", render: () => <InspectorSettingsTab panels={[]} /> },
];

<InspectorPanel tabs={customTabs} />
```

### 3. Custom Settings Panels

Add panels to the Settings tab using `settingsPanels`:

```tsx
import {
  InspectorPanel,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  InspectorButton,
  type InspectorSettingsPanelConfig,
} from "react-wireflow";

const ExportPanel = () => {
  return (
    <InspectorDefinitionList>
      <InspectorDefinitionItem label="Format">
        <select><option>JSON</option><option>YAML</option></select>
      </InspectorDefinitionItem>
      <InspectorDefinitionItem label="">
        <InspectorButton onClick={() => alert("Exporting...")}>Export</InspectorButton>
      </InspectorDefinitionItem>
    </InspectorDefinitionList>
  );
};

const settingsPanels: InspectorSettingsPanelConfig[] = [
  { title: "Export Options", component: ExportPanel },
];

<InspectorPanel settingsPanels={settingsPanels} />
```

### Available Inspector UI Components

Build consistent inspector UIs with these components:

**Layout Components:**

| Component | Description |
|-----------|-------------|
| `PropertySection` | Titled section with header |
| `InspectorSection` | Basic section container |
| `InspectorSectionTitle` | Standalone section title (H4) |
| `InspectorDefinitionList` | Semantic `<dl>` wrapper |
| `InspectorDefinitionItem` | Label-value pair (`<dt>`/`<dd>`) |
| `InspectorField` | Field wrapper with label |
| `PositionInputsGrid` | Grid layout for position/size inputs |

**Form Inputs:**

| Component | Description |
|-----------|-------------|
| `InspectorInput` | Styled text input |
| `InspectorNumberInput` | Number input with label |
| `InspectorTextarea` | Multi-line text input |
| `InspectorSelect` | Styled select dropdown |
| `InspectorLabel` | Standalone form label |
| `ReadOnlyField` | Non-editable display field |

**Interactive:**

| Component | Description |
|-----------|-------------|
| `InspectorButton` | Button (variants: primary, secondary, danger) |
| `InspectorButtonGroup` | Segmented button control for options |
| `InspectorShortcutButton` | Compact button for shortcut settings |
| `InspectorShortcutBindingValue` | Keyboard/pointer shortcut display |

See the [Custom Inspector example](https://github.com/trkbt10/react-wireflow/tree/main/src/examples/demos/custom/inspector/custom-inspector) for a complete implementation.
