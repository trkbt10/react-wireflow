# Custom Inspector Guide

This guide explains how to create and customize inspector panels in the Node Editor.

## Overview

The inspector system provides three customization patterns:

| Pattern | Level | Use Case |
|---------|-------|----------|
| `renderInspector` | NodeDefinition | Custom inspector per node type |
| `tabs` | InspectorPanel | Custom tabs in the inspector |
| `settingsPanels` | InspectorSettingsTab | Custom panels in Settings tab |

## Pattern 1: Node-Level Inspector (`renderInspector`)

Define custom inspector content for a specific node type using the `renderInspector` property in NodeDefinition.

### Basic Example

```typescript
import type { NodeDefinition, InspectorRenderProps } from "react-wireflow";
import {
  PropertySection,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  InspectorInput,
  InspectorSelect,
  InspectorTextarea,
} from "react-wireflow";

type PersonNodeData = {
  name: string;
  email: string;
  role: "developer" | "designer" | "manager";
  bio: string;
};

function PersonInspectorRenderer({
  node,
  onUpdateNode,
}: InspectorRenderProps<PersonNodeData>): React.ReactElement {
  const data = node.data ?? ({} as PersonNodeData);

  const handleChange = <K extends keyof PersonNodeData>(
    key: K,
    value: PersonNodeData[K]
  ) => {
    onUpdateNode({ data: { ...data, [key]: value } });
  };

  return (
    <PropertySection title="Person Details">
      <InspectorDefinitionList>
        <InspectorDefinitionItem label="Name">
          <InspectorInput
            value={data.name ?? ""}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter name"
          />
        </InspectorDefinitionItem>

        <InspectorDefinitionItem label="Email">
          <InspectorInput
            type="email"
            value={data.email ?? ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="email@example.com"
          />
        </InspectorDefinitionItem>

        <InspectorDefinitionItem label="Role">
          <InspectorSelect
            value={data.role ?? "developer"}
            onChange={(e) =>
              handleChange("role", e.target.value as PersonNodeData["role"])
            }
          >
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </InspectorSelect>
        </InspectorDefinitionItem>

        <InspectorDefinitionItem label="Bio">
          <InspectorTextarea
            value={data.bio ?? ""}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={3}
          />
        </InspectorDefinitionItem>
      </InspectorDefinitionList>
    </PropertySection>
  );
}

const PersonNodeDefinition: NodeDefinition<PersonNodeData> = {
  type: "person",
  displayName: "Person",
  defaultData: {
    name: "",
    email: "",
    role: "developer",
    bio: "",
  },
  ports: [...],
  renderInspector: PersonInspectorRenderer,
};
```

### InspectorRenderProps Reference

```typescript
type InspectorRenderProps<TData extends Record<string, unknown>> = {
  /** The selected node with typed data */
  node: Node & { data: TData };
  /** External data if loaded via loadExternalData */
  externalData: unknown;
  /** Loading state for external data */
  isLoadingExternalData: boolean;
  /** Error state for external data */
  externalDataError: Error | null;
  /** Callback to update node properties */
  onUpdateNode: (updates: Partial<Node>) => void;
  /** Callback to update external data */
  onUpdateExternalData: (data: unknown) => Promise<void>;
  /** Callback to delete the node */
  onDeleteNode: () => void;
};
```

## Pattern 2: Custom Tabs (`InspectorPanel`)

Replace or extend the default tabs in the inspector panel.

### Basic Example

```typescript
import {
  InspectorPanel,
  InspectorLayersTab,
  InspectorPropertiesTab,
  InspectorSettingsTab,
  InspectorHistoryTab,
  InspectorSection,
  PropertySection,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  ReadOnlyField,
  type InspectorPanelTabConfig,
} from "react-wireflow";

// Custom tab component
const StatisticsTab: React.FC = () => (
  <InspectorSection>
    <PropertySection title="Editor Statistics">
      <InspectorDefinitionList>
        <InspectorDefinitionItem label="Total Nodes">
          <ReadOnlyField>5</ReadOnlyField>
        </InspectorDefinitionItem>
        <InspectorDefinitionItem label="Connections">
          <ReadOnlyField>3</ReadOnlyField>
        </InspectorDefinitionItem>
      </InspectorDefinitionList>
    </PropertySection>
  </InspectorSection>
);

const HelpTab: React.FC = () => (
  <InspectorSection>
    <PropertySection title="Quick Start">
      <InspectorDefinitionList>
        <InspectorDefinitionItem label="Select">
          <ReadOnlyField>Click a node to edit</ReadOnlyField>
        </InspectorDefinitionItem>
        <InspectorDefinitionItem label="Connect">
          <ReadOnlyField>Drag from ports</ReadOnlyField>
        </InspectorDefinitionItem>
      </InspectorDefinitionList>
    </PropertySection>
  </InspectorSection>
);

const CustomInspectorPanel: React.FC = () => {
  const tabs: InspectorPanelTabConfig[] = React.useMemo(
    () => [
      {
        id: "layers",
        label: "Layers",
        render: () => <InspectorLayersTab />,
      },
      {
        id: "properties",
        label: "Properties",
        render: () => <InspectorPropertiesTab />,
      },
      {
        id: "statistics",
        label: "Stats",
        render: () => <StatisticsTab />,
      },
      {
        id: "history",
        label: "History",
        render: () => <InspectorHistoryTab />,
      },
      {
        id: "settings",
        label: "Settings",
        render: () => <InspectorSettingsTab />,
      },
      {
        id: "help",
        label: "Help",
        render: () => <HelpTab />,
      },
    ],
    []
  );

  return <InspectorPanel tabs={tabs} />;
};
```

### Using in NodeEditor

```typescript
import { NodeEditor, NodeCanvas } from "react-wireflow";
import { defaultEditorGridConfig } from "react-wireflow/core";

function MyEditor() {
  const gridLayers = React.useMemo(
    () => [
      { id: "canvas", component: <NodeCanvas />, gridArea: "canvas" },
      {
        id: "inspector",
        component: <CustomInspectorPanel />,
        gridArea: "inspector",
      },
    ],
    []
  );

  return (
    <NodeEditor
      initialData={initialData}
      nodeDefinitions={nodeDefinitions}
      gridConfig={defaultEditorGridConfig}
      gridLayers={gridLayers}
    />
  );
}
```

## Pattern 3: Custom Settings Panels (`settingsPanels`)

Add custom panels to the Settings tab without replacing the entire tab structure.

### Basic Example

```typescript
import {
  InspectorSettingsTab,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  InspectorSelect,
  InspectorButton,
  InspectorInput,
  type InspectorSettingsPanelConfig,
} from "react-wireflow";

const ExportSettingsPanel: React.FC = () => {
  const [format, setFormat] = React.useState<"json" | "yaml">("json");
  const [filename, setFilename] = React.useState("export");

  const handleExport = () => {
    // Export logic here
    console.log(`Exporting as ${format} to ${filename}`);
  };

  return (
    <InspectorDefinitionList>
      <InspectorDefinitionItem label="Format">
        <InspectorSelect
          value={format}
          onChange={(e) => setFormat(e.target.value as "json" | "yaml")}
        >
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
        </InspectorSelect>
      </InspectorDefinitionItem>

      <InspectorDefinitionItem label="Filename">
        <InspectorInput
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
      </InspectorDefinitionItem>

      <InspectorDefinitionItem label="">
        <InspectorButton variant="primary" size="small" onClick={handleExport}>
          Export Data
        </InspectorButton>
      </InspectorDefinitionItem>
    </InspectorDefinitionList>
  );
};

const DebugSettingsPanel: React.FC = () => {
  const [debugMode, setDebugMode] = React.useState(false);

  return (
    <InspectorDefinitionList>
      <InspectorDefinitionItem label="Debug Mode">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => setDebugMode(e.target.checked)}
        />
      </InspectorDefinitionItem>
    </InspectorDefinitionList>
  );
};

// Use with InspectorSettingsTab
const CustomSettingsTab: React.FC = () => {
  const settingsPanels: InspectorSettingsPanelConfig[] = React.useMemo(
    () => [
      {
        title: "Export Options",
        component: ExportSettingsPanel,
      },
      {
        title: "Debug",
        component: DebugSettingsPanel,
      },
    ],
    []
  );

  return <InspectorSettingsTab panels={settingsPanels} />;
};
```

## Available Inspector Components

### Panel Components

| Component | Description |
|-----------|-------------|
| `InspectorPanel` | Main container with tab support |
| `InspectorLayersTab` | Built-in layers/tree view tab |
| `InspectorPropertiesTab` | Built-in properties tab (uses node's `renderInspector`) |
| `InspectorSettingsTab` | Built-in settings tab with extensible panels |
| `InspectorHistoryTab` | Built-in undo/redo history tab |
| `NodeInspector` | Node properties renderer |
| `NodeBehaviorInspector` | Standard node behavior inspector |
| `GroupBehaviorInspector` | Group node behavior inspector |
| `GeneralSettingsPanel` | General settings panel |
| `GridSettingsPanel` | Grid settings panel |
| `HistoryPanel` | History panel |
| `InteractionHelpPanel` | Keyboard shortcuts help |
| `NodePalettePanel` | Node palette for adding nodes |
| `NodeTreeListPanel` | Hierarchical node list |

### Layout Components

| Component | Description |
|-----------|-------------|
| `InspectorSection` | Basic section wrapper with padding |
| `PropertySection` | Collapsible section with title |
| `InspectorField` | Vertical field layout (label above input) |
| `InspectorFieldRow` | Horizontal field layout |
| `InspectorSectionTitle` | Standalone section title |
| `InspectorDefinitionList` | Definition list container |
| `InspectorDefinitionItem` | Label-value pair row |
| `PositionInputsGrid` | Grid layout for X/Y coordinate inputs |
| `InspectorTabbedContainer` | Nested tabs within inspector |

### Input Components

| Component | Description |
|-----------|-------------|
| `InspectorInput` | Text input field |
| `InspectorNumberInput` | Number input with label |
| `InspectorTextarea` | Multi-line text input |
| `InspectorSelect` | Dropdown select |
| `InspectorButton` | Button (variants: `primary`, `danger`, `default`) |
| `InspectorIconButton` | Icon-only button |
| `InspectorButtonGroup` | Segmented button group (radio-style selection) |
| `InspectorToggleGroup` | Toggle button group (checkbox-style, multi-select) |
| `InspectorLabel` | Form label |
| `ReadOnlyField` | Non-editable display field |
| `InspectorShortcutButton` | Keyboard shortcut binding button |
| `InspectorShortcutBindingValue` | Shortcut binding display |

## Component Usage Examples

### PropertySection (Collapsible)

```typescript
<PropertySection title="Node Info" defaultOpen={true}>
  <InspectorDefinitionList>
    <InspectorDefinitionItem label="ID">
      <ReadOnlyField>{node.id}</ReadOnlyField>
    </InspectorDefinitionItem>
  </InspectorDefinitionList>
</PropertySection>
```

### InspectorButtonGroup (Radio-style)

```typescript
const priorityOptions: InspectorButtonGroupOption<"low" | "medium" | "high">[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

<InspectorButtonGroup
  options={priorityOptions}
  value={data.priority}
  onChange={(value) => handleChange("priority", value)}
  aria-label="Select priority"
/>
```

### InspectorToggleGroup (Multi-select)

```typescript
const tagOptions: InspectorToggleGroupOption<string>[] = [
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
  { value: "review", label: "Review" },
];

<InspectorToggleGroup
  options={tagOptions}
  value={data.tags}
  onChange={(values) => handleChange("tags", values)}
  aria-label="Select tags"
/>
```

### PositionInputsGrid

```typescript
<PositionInputsGrid>
  <InspectorNumberInput
    label="X"
    value={node.position.x}
    onChange={(value) => onUpdateNode({ position: { ...node.position, x: value } })}
  />
  <InspectorNumberInput
    label="Y"
    value={node.position.y}
    onChange={(value) => onUpdateNode({ position: { ...node.position, y: value } })}
  />
</PositionInputsGrid>
```

### InspectorField (Vertical Layout)

```typescript
<InspectorSection>
  <InspectorField label={<InspectorLabel>Description</InspectorLabel>}>
    <InspectorTextarea
      value={data.description}
      onChange={(e) => handleChange("description", e.target.value)}
      rows={4}
    />
  </InspectorField>
</InspectorSection>
```

## Best Practices

1. **Always use inspector components** for consistent theming across light/dark modes
2. **Use `PropertySection`** for collapsible groups of related fields
3. **Use `InspectorDefinitionList`** for label-value pairs in a compact format
4. **Use `InspectorButtonGroup`** for mutually exclusive options (replaces radio buttons)
5. **Use `InspectorToggleGroup`** for multi-select options (replaces checkboxes)
6. **Keep inspector content scrollable** - avoid fixed heights that break overflow
7. **Use `ReadOnlyField`** for non-editable data display
8. **Memoize tab configurations** to prevent unnecessary re-renders

## Type Definitions

### InspectorPanelTabConfig

```typescript
type InspectorPanelTabConfig = {
  id: string;
  label: string;
  render: () => React.ReactElement;
};
```

### InspectorSettingsPanelConfig

```typescript
type InspectorSettingsPanelConfig = {
  title: string;
  component: React.ComponentType;
};
```

## Related Files

- `src/inspector/index.ts` - Public exports
- `src/components/inspector/InspectorPanel.tsx` - Main panel component
- `src/components/inspector/parts/` - Individual UI components
- `src/examples/demos/custom/inspector/custom-inspector/CustomInspectorExample.tsx` - Complete example
