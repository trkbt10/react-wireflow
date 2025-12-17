/**
 * @file Shell UI that lets developers switch between example scenarios
 */
import * as React from "react";

import { applyTheme, getStoredThemeId, listAvailableThemes } from "./themes/registry";
import type { NodeEditorThemeId } from "./themes/registry";
import { ConstrainedNodeExample } from "./demos/basic/constrained-nodes/ConstrainedNodeExample";
import { TypedNodesExample } from "./demos/basic/typed-nodes/TypedNodesExample";
import { AdvancedNodeExample } from "./demos/advanced/advanced-node/AdvancedNodeExample";
import { CustomPortRendererExample } from "./demos/custom/ports/port-playground/CustomPortRendererExample";
import { I18nPlaygroundExample } from "./demos/advanced/internationalization/i18n-playground/I18nPlaygroundExample";
import {
  DefaultLayoutExample,
  CustomInspectorWidthExample,
  CanvasOnlyExample,
  WithToolbarExample,
} from "./demos/layout/column/ColumnLayoutExample";
import { InspectorPaletteDnDExample } from "./demos/layout/inspector-palette-dnd/InspectorPaletteDnDExample";
import { AdvancedLayoutExample } from "./demos/layout/advanced/AdvancedLayoutExample";
import { ResponsiveLayoutExample } from "./demos/layout/responsive/ResponsiveLayoutExample";
import { MobileDrawerExample } from "./demos/layout/mobile-drawer/MobileDrawerExample";
import { ThreeJsExample } from "./demos/advanced/integrations/threejs/ThreeJsExample";
import CustomNodeExample from "./demos/custom/nodes/custom-node/CustomNodeExample";
import { ThemeShowcaseExample } from "./demos/design/theme-showcase/ThemeShowcaseExample";
import { AdvancedNestedEditorExample } from "./demos/advanced/nested-editors/advanced-nested-editor/AdvancedNestedEditorExample";
import { InteractionCustomizationExample } from "./demos/advanced/interaction/customization/InteractionCustomizationExample";
import { CustomConnectorExample } from "./demos/custom/connections/custom-connector/CustomConnectorExample";
import { OpalThemeExample } from "./demos/design/themes/opal/OpalThemeExample";
import { UnityThemeExample } from "./demos/design/themes/unity/UnityThemeExample";
import { AdobeThemeExample } from "./demos/design/themes/adobe/AdobeThemeExample";
import { FigmaThemeExample } from "./demos/design/themes/figma/FigmaThemeExample";
import { InspectorComponentsExample } from "./demos/design/inspector-components/InspectorComponentsExample";
import { NodeCardsExample } from "./demos/design/node-cards/NodeCardsExample";
import { InspectorPanelsExample } from "./demos/design/inspector-panels/InspectorPanelsExample";
import { TradingAnalyticsDashboard } from "./demos/advanced/analytics/trading-analytics/TradingAnalyticsDashboard";
import { DataBindingModesExample } from "./demos/data/binding-modes/DataBindingModesExample";
import { ErrorNodeFallbackExample } from "./demos/basic/error-node-fallback/ErrorNodeFallbackExample";
import { CustomLayoutDemo } from "./demos/layout/custom-core/custom-layout-demo";
import { CoreOnlyExample } from "./demos/layout/core-only/CoreOnlyExample";
import { DynamicPortPlaygroundExample } from "./demos/custom/ports/port-playground/DynamicPortPlaygroundExample";
import { AbsolutePortExample } from "./demos/custom/ports/absolute-port/AbsolutePortExample";
import { ComfyUILayoutExample } from "./demos/custom/layouts/comfyui/ComfyUILayoutExample";
import { CustomInspectorExample } from "./demos/custom/inspector/custom-inspector/CustomInspectorExample";
import { NodeSearchMenuExample } from "./demos/custom/search/node-search-menu/NodeSearchMenuExample";
import { MultiCategoryExample } from "./demos/custom/search/multi-category/MultiCategoryExample";
import { NodeAddMenuExample } from "./demos/custom/menus/node-add-menu/NodeAddMenuExample";
import { ConnectionRulesExample } from "./demos/custom/connections/connection-rules/ConnectionRulesExample";
import { GroupScopeExample } from "./demos/custom/connections/group-scope/GroupScopeExample";
import { ConnectionBehaviorExample } from "./demos/custom/connections/connection-behavior/ConnectionBehaviorExample";
import { SettingsEditorExample } from "./demos/basic/settings-editor/SettingsEditorExample";
import { FractalNodeStressTest } from "./demos/advanced/performance/FractalNodeStressTest";
import { ExampleSelector, type ExampleCategory, type ExampleEntry } from "./components/ExampleSelector";
import { ThemeSelector } from "./components/ThemeSelector";
import classes from "./ExamplePreviewApp.module.css";

type InternalExampleEntry = {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
  category: "basic" | "advanced" | "custom" | "layout" | "design" | "data" | "performance";
};

const examples: InternalExampleEntry[] = [
  {
    id: "trading-analytics-dashboard",
    title: "Trading Analytics Dashboard",
    description:
      "Financial analytics dashboard showing trading strategies, execution metrics, and portfolio performance.",
    component: TradingAnalyticsDashboard,
    category: "advanced",
  },
  {
    id: "threejs-integration",
    title: "Three.js Integration",
    description: "Drive a Three.js scene by connecting node outputs to a live preview.",
    component: ThreeJsExample,
    category: "advanced",
  },
  {
    id: "i18n-playground",
    title: "Internationalization Playground",
    description: "Configure locale, fallback, and message overrides to validate translations.",
    component: I18nPlaygroundExample,
    category: "advanced",
  },
  {
    id: "interaction-customization",
    title: "Interaction Customization",
    description: "Experiment with mobile-friendly panning, pinch zoom, and configurable keyboard shortcuts.",
    component: InteractionCustomizationExample,
    category: "advanced",
  },
  {
    id: "custom-node",
    title: "Custom Nodes with External Data",
    description: "Shows how to connect custom renderers to external data sources.",
    component: CustomNodeExample,
    category: "custom",
  },
  {
    id: "typed-nodes",
    title: "Typed Node Definitions",
    description: "Demonstrates strongly-typed node definitions with custom renderers.",
    component: TypedNodesExample,
    category: "basic",
  },
  {
    id: "data-binding-modes",
    title: "Data Binding Modes",
    description: "Side-by-side uncontrolled vs controlled NodeEditor usage, mirroring React input semantics.",
    component: DataBindingModesExample,
    category: "data",
  },
  {
    id: "constrained-nodes",
    title: "Constrained Node Definitions",
    description: "Highlights constraint helpers for placement and connection rules.",
    component: ConstrainedNodeExample,
    category: "basic",
  },
  {
    id: "error-node-fallback",
    title: "Error Node Fallback",
    description: "Shows how unknown node types are displayed as error nodes when fallbackDefinition is enabled.",
    component: ErrorNodeFallbackExample,
    category: "basic",
  },
  {
    id: "settings-editor",
    title: "Settings Editor",
    description: "Interactive settings panel demonstrating SettingsManager for runtime configuration.",
    component: SettingsEditorExample,
    category: "basic",
  },
  {
    id: "advanced-node",
    title: "Advanced Node Examples",
    description: "Complex nodes with Code Editor, Chart Visualization, and Form Builder.",
    component: AdvancedNodeExample,
    category: "advanced",
  },
  {
    id: "advanced-nested-editors",
    title: "Advanced Nested Editors",
    description: "Open floating sub-editors per node with live minimap previews.",
    component: AdvancedNestedEditorExample,
    category: "advanced",
  },
  {
    id: "fractal-stress-test",
    title: "Fractal Node Stress Test",
    description: "Barnsley Fern fractal pattern for testing canvas snapshot GPU optimization at low zoom levels.",
    component: FractalNodeStressTest,
    category: "performance",
  },
  {
    id: "custom-port-renderer",
    title: "Custom Port Renderer",
    description: "Customize port and connection appearance with custom renderers.",
    component: CustomPortRendererExample,
    category: "custom",
  },
  {
    id: "dynamic-port-playground",
    title: "Dynamic Port Playground",
    description: "Experiment with segmented port placement, multi-type validation, and dynamic port counts.",
    component: DynamicPortPlaygroundExample,
    category: "custom",
  },
  {
    id: "absolute-port-placement",
    title: "Absolute & Inset Ports",
    description: "Demonstrates absolute positioning (x,y coordinates) and inset ports (inside node boundary).",
    component: AbsolutePortExample,
    category: "custom",
  },
  {
    id: "comfyui-layout",
    title: "ComfyUI-Style Port Layout",
    description: "Region-based port placement with header/body areas, similar to ComfyUI's node layout.",
    component: ComfyUILayoutExample,
    category: "custom",
  },
  {
    id: "custom-connector-renderer",
    title: "Custom Connector Playground",
    description: "Render bezier connectors with live handle overlays and animated accents.",
    component: CustomConnectorExample,
    category: "custom",
  },
  {
    id: "connection-rules",
    title: "Connection Rules",
    description: "Demonstrates the 4 ways to customize port connectivity: dataType, canConnect, validateConnection, maxConnections.",
    component: ConnectionRulesExample,
    category: "custom",
  },
  {
    id: "connection-behavior",
    title: "Connection Behavior (Rounding & Overrides)",
    description: "Control 90° snapping (and alternatives) via SettingsManager, and override path/rounding via NodeEditorCore.",
    component: ConnectionBehaviorExample,
    category: "custom",
  },
  {
    id: "group-scope-connection",
    title: "Group Scope Connection",
    description: "Demonstrates canConnect overriding default dataType checking for group scope ports.",
    component: GroupScopeExample,
    category: "custom",
  },
  {
    id: "custom-inspector",
    title: "Custom Inspector Panels",
    description: "Demonstrates custom inspector tabs, settings panels, and per-node renderInspector functions.",
    component: CustomInspectorExample,
    category: "custom",
  },
  {
    id: "node-search-menu",
    title: "Node Search Menu (Split Pane)",
    description: "split pane view with nested category tree for node creation menu.",
    component: NodeSearchMenuExample,
    category: "custom",
  },
  {
    id: "multi-category",
    title: "Multi-Category Nodes",
    description: "Nodes with multiple categories, hierarchical prefix filtering, and Cmd/Ctrl+click multi-select.",
    component: MultiCategoryExample,
    category: "custom",
  },
  {
    id: "node-add-menu",
    title: "Node Add Menu (Hierarchical)",
    description: "Hierarchical submenu for adding nodes via right-click context menu.",
    component: NodeAddMenuExample,
    category: "custom",
  },
  {
    id: "layout-core-only",
    title: "Layout: Core Only (Minimal)",
    description: "Minimal setup using only NodeEditorCore + NodeCanvas without GridLayout or context menus.",
    component: CoreOnlyExample,
    category: "layout",
  },
  {
    id: "layout-custom-core",
    title: "Layout: Custom Core (Flexbox)",
    description: "Custom layout using NodeEditorCore and NodeEditorCanvas without GridLayout dependency.",
    component: CustomLayoutDemo,
    category: "layout",
  },
  {
    id: "layout-default",
    title: "Layout: Default",
    description: "Default layout with canvas and inspector.",
    component: DefaultLayoutExample,
    category: "layout",
  },
  {
    id: "layout-custom-inspector",
    title: "Layout: Custom Inspector Width",
    description: "Layout with wider, resizable inspector panel.",
    component: CustomInspectorWidthExample,
    category: "layout",
  },
  {
    id: "layout-canvas-only",
    title: "Layout: Canvas Only",
    description: "Layout with canvas only (no inspector).",
    component: CanvasOnlyExample,
    category: "layout",
  },
  {
    id: "layout-with-toolbar",
    title: "Layout: With Toolbar",
    description: "Layout with custom toolbar and inspector.",
    component: WithToolbarExample,
    category: "layout",
  },
  {
    id: "layout-inspector-palette-dnd",
    title: "Layout: Inspector Drag & Drop",
    description: "Use the floating Node Library panel to drag templates directly onto the canvas.",
    component: InspectorPaletteDnDExample,
    category: "layout",
  },
  {
    id: "layout-advanced",
    title: "Layout: Advanced (Kitchen Sink)",
    description: "Advanced layout with floating sidebar, minimap, grid toolbox, status bar, and more.",
    component: AdvancedLayoutExample,
    category: "layout",
  },
  {
    id: "layout-responsive",
    title: "Layout: Responsive (Mobile/Tablet/Desktop)",
    description: "Dynamically switches between mobile, tablet, and desktop layouts based on viewport size.",
    component: ResponsiveLayoutExample,
    category: "layout",
  },
  {
    id: "layout-mobile-drawer",
    title: "Layout: Mobile Drawer",
    description: "Mobile-friendly layout with drawer-based inspector panel for touch devices.",
    component: MobileDrawerExample,
    category: "layout",
  },
  {
    id: "design-theme-showcase",
    title: "Design: Theme Showcase",
    description: "Preview core design tokens and UI components under the active theme.",
    component: ThemeShowcaseExample,
    category: "design",
  },
  {
    id: "design-inspector-components",
    title: "Design: Inspector Components",
    description: "Interactive preview of inspector form controls: inputs, selects, button groups, and icon buttons.",
    component: InspectorComponentsExample,
    category: "design",
  },
  {
    id: "design-node-cards",
    title: "Design: Node Cards",
    description: "Preview of NodeCard component variants (list, grid, menu, compact) and states.",
    component: NodeCardsExample,
    category: "design",
  },
  {
    id: "design-inspector-panels",
    title: "Design: Inspector Panels",
    description: "Preview of all inspector panel components: NodePalette, History, GridSettings, GeneralSettings, NodeTree, InteractionHelp.",
    component: InspectorPanelsExample,
    category: "design",
  },
  {
    id: "design-opal-theme",
    title: "Design: Opal Theme",
    description: "Soft pastel aesthetic with custom connection and port renderers inspired by Opal AI.",
    component: OpalThemeExample,
    category: "design",
  },
  {
    id: "design-unity-theme",
    title: "Design: Unity Theme",
    description: "Professional dark theme inspired by Unity Editor's interface design.",
    component: UnityThemeExample,
    category: "design",
  },
  {
    id: "design-adobe-theme",
    title: "Design: Adobe Theme",
    description: "Sleek dark interface inspired by Adobe Creative Cloud applications.",
    component: AdobeThemeExample,
    category: "design",
  },
  {
    id: "design-figma-theme",
    title: "Design: Figma Theme",
    description: "Clean light interface with Figma's signature blue and minimal design language.",
    component: FigmaThemeExample,
    category: "design",
  },
];

if (examples.length === 0) {
  throw new Error("No examples are configured for the preview app.");
}

/**
 * Get the initial example ID from URL search params
 */
function getInitialExampleId(): string {
  if (typeof window === "undefined") {
    return examples[0].id;
  }

  const params = new URLSearchParams(window.location.search);
  const exampleId = params.get("example");

  if (exampleId && examples.some((ex) => ex.id === exampleId)) {
    return exampleId;
  }

  return examples[0].id;
}

/**
 * Renders the preview shell with example selection controls.
 */
export function ExamplePreviewApp(): React.ReactElement {
  const themeOptions = React.useMemo(() => listAvailableThemes(), []);
  const [selectedThemeId, setSelectedThemeId] = React.useState<NodeEditorThemeId>(
    () => getStoredThemeId() ?? "default",
  );

  const [selectedExampleId, setSelectedExampleId] = React.useState(getInitialExampleId);

  const selectedExample = React.useMemo(
    () => examples.find((example) => example.id === selectedExampleId) ?? examples[0],
    [selectedExampleId],
  );

  const handleExampleChange = React.useCallback((newExampleId: string) => {
    setSelectedExampleId(newExampleId);

    // Update URL search params
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("example", newExampleId);
      window.history.pushState({}, "", url);
    }
  }, []);

  // Handle browser back/forward buttons
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const newExampleId = getInitialExampleId();
      setSelectedExampleId(newExampleId);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const ExampleComponent = selectedExample.component;

  React.useEffect(() => {
    applyTheme(selectedThemeId);
  }, [selectedThemeId]);

  const selectorExamples = React.useMemo<ExampleEntry[]>(() => {
    return examples.map((ex) => ({
      id: ex.id,
      title: ex.title,
      description: ex.description,
      category: ex.category,
    }));
  }, []);

  const selectorCategories = React.useMemo<ExampleCategory[]>(() => {
    const filterByCategory = (cat: string) => selectorExamples.filter((ex) => ex.category === cat);

    // Custom category with subcategories based on example id patterns
    const customExamples = filterByCategory("custom");
    const customNodes = customExamples.filter((ex) => ex.id === "custom-node");
    const customPorts = customExamples.filter((ex) =>
      ["custom-port-renderer", "dynamic-port-playground", "absolute-port-placement", "comfyui-layout"].includes(ex.id)
    );
    const customConnections = customExamples.filter((ex) =>
      ["custom-connector-renderer", "connection-rules", "connection-behavior", "group-scope-connection"].includes(ex.id)
    );
    const customUI = customExamples.filter((ex) =>
      ["custom-inspector", "node-search-menu", "multi-category", "node-add-menu"].includes(ex.id)
    );

    return [
      { id: "basic", label: "Basic", examples: filterByCategory("basic") },
      { id: "advanced", label: "Advanced", examples: filterByCategory("advanced") },
      { id: "layout", label: "Layout", examples: filterByCategory("layout") },
      { id: "design", label: "Design", examples: filterByCategory("design") },
      {
        id: "custom",
        label: "Custom",
        examples: [],
        children: [
          { id: "custom-nodes", label: "Nodes", examples: customNodes },
          { id: "custom-ports", label: "Ports", examples: customPorts },
          { id: "custom-connections", label: "Connections", examples: customConnections },
          { id: "custom-ui", label: "UI", examples: customUI },
        ],
      },
      { id: "data", label: "Data", examples: filterByCategory("data") },
      { id: "performance", label: "Performance", examples: filterByCategory("performance") },
    ];
  }, [selectorExamples]);

  return (
    <div className={classes.container}>
      <header className={classes.header}>
        <div className={classes.headerContent}>
          <h1 className={classes.title}>Node Editor Examples - {selectedExample.title}</h1>
          <span className={classes.description}>{selectedExample.description}</span>
        </div>
        <div className={classes.controls}>
          <ThemeSelector
            options={themeOptions}
            selectedId={selectedThemeId}
            onSelect={(id) => setSelectedThemeId(id as NodeEditorThemeId)}
          />
          <ExampleSelector
            examples={selectorExamples}
            categories={selectorCategories}
            selectedId={selectedExampleId}
            onSelect={handleExampleChange}
          />
        </div>
      </header>
      <main className={classes.main} key={selectedExample.id}>
        <ExampleComponent />
      </main>
    </div>
  );
}
