/**
 * @file Node Editor - Main exports
 */
import "./global.css";

// Core editor component and props
export { NodeEditor } from "./NodeEditor";
export type { NodeEditorProps } from "./NodeEditor";
export type { NodeEditorData } from "./types/core";
export type { NodeEditorRenderers, NodeEditorRendererOverrides } from "./types/renderers";

// Debug utilities (opt-in)
export { RenderLoopDetector } from "./components/debug/RenderLoopDetector";
export type { RenderLoopDetectorProps } from "./components/debug/RenderLoopDetector";

// Helper components for custom node implementations
export { NodeResizer, normalizeNodeSize, useNodeResizerContext } from "./components/node/resize/NodeResizer";
export type { NodeResizerProps } from "./components/node/resize/NodeResizer";

// Node definition helpers for custom nodes and inspectors
export { asNodeDefinition, createNodeDataUpdater, createNodeDefinition } from "./types/NodeDefinition";
export type {
  ConnectionRenderContext,
  ExternalDataReference,
  InspectorRenderProps,
  NodeDefinition,
  NodeRendererProps,
  PortDefinition,
  PortConnectionContext,
  PortInstanceContext,
  PortInstanceFactoryContext,
  PortRenderContext,
} from "./types/NodeDefinition";
export type { CategoryInfo } from "./category/types";

// Node definition registry
export { createNodeDefinitionRegistry } from "./types/NodeDefinitionRegistry";
export type { NodeDefinitionRegistry, FallbackDefinition } from "./types/NodeDefinitionRegistry";

// Error node definition for unknown types
export {
  createErrorNodeDefinition,
  defaultFallbackFactory,
  ErrorNodeRenderer,
  ERROR_NODE_TYPE_PREFIX,
  isErrorNodeType,
  getOriginalTypeFromErrorType,
} from "./node-definitions/error";
export type { ErrorNodeData } from "./node-definitions/error";

// Behavior configuration for nodes
export type {
  AppearanceBehaviorOptions,
  GroupBehaviorOptions,
  NodeBehavior,
  NodeBehaviorOptions,
  NodeBehaviorType,
  ObjectBehaviorOptions,
} from "./types/behaviors";

// Core graph types used by custom definitions
export type { Connection, ConnectionId, Node, NodeId, Port, PortId, PortPlacement } from "./types/core";

// Port positioning customization
export type {
  EditorPortPositions,
  NodePortPositions,
  PortPosition,
  PortPositionBehavior,
  PortPositionConfig,
  PortPositionNode,
} from "./types/portPosition";
export { DEFAULT_PORT_POSITION_CONFIG } from "./types/portPosition";

// Layout and panel configuration for custom panels
export type {
  EditorPanelsConfig,
  GridLayoutConfig,
  GridTrack,
  LayerDefinition,
  PanelDefinition,
  PanelPosition,
} from "./types/panels";

// Default configuration surface
export { defaultEditorGridConfig, defaultEditorGridLayers } from "./config/defaultLayout";
export { defaultSettings } from "./settings/defaultSettings";
export { SettingsManager } from "./settings/SettingsManager";
export { createLocalSettingsStorage } from "./settings/storages/LocalSettingsStorage";
export { createMemorySettingsStorage } from "./settings/storages/MemorySettingsStorage";
export type { SettingsManagerOptions } from "./settings/SettingsManager";
export type { EditorSettingKey } from "./settings/types";
export type {
  CanvasPanActivator,
  ContextMenuRequest,
  ContextMenuTarget,
  ContextMenuBehavior,
  NodeEditorInteractionSettings,
  NodeEditorInteractionSettingsPatch,
  KeyboardShortcutBehavior,
  KeyboardShortcutActionBehavior,
  NodeEditorShortcutAction,
  ShortcutBinding,
  PinchZoomSettings,
} from "./types/interaction";

// Inspector components for custom inspector composition
export {
  InspectorPanel,
  InspectorLayersTab,
  InspectorHistoryTab,
  InspectorSettingsTab,
  NodeInspector,
  NodeBehaviorInspector,
  NodeActionsBehaviorInspector,
  GroupBehaviorInspector,
  GeneralSettingsPanel,
  GridSettingsPanel,
  HistoryPanel,
  InspectorPropertiesTab,
  InteractionHelpPanel,
  NodePalettePanel,
  NodeTreeListPanel,
  InspectorSection,
  PropertySection,
  InspectorField,
  InspectorSectionTitle,
  InspectorLabel,
  InspectorInput,
  InspectorNumberInput,
  InspectorTextarea,
  InspectorButton,
  InspectorDefinitionList,
  InspectorDefinitionItem,
  InspectorShortcutButton,
  InspectorShortcutBindingValue,
  PositionInputsGrid,
  ReadOnlyField,
} from "./inspector";
export type {
  InspectorPanelProps,
  InspectorPanelTabConfig,
  InspectorSettingsPanelConfig,
  InspectorSettingsTabProps,
  NodeInspectorProps,
  InspectorSectionProps,
  PropertySectionProps,
  InspectorFieldProps,
  InspectorSectionTitleProps,
  InspectorLabelProps,
  InspectorInputProps,
  InspectorNumberInputProps,
  InspectorTextareaProps,
  InspectorButtonProps,
  InspectorDefinitionListProps,
  InspectorDefinitionItemProps,
  InspectorShortcutButtonProps,
  InspectorShortcutBindingValueProps,
  PositionInputsGridProps,
  ReadOnlyFieldProps,
} from "./inspector";
