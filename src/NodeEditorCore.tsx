/**
 * @file NodeEditorCore - Core provider setup without layout dependencies
 * @description
 * This component sets up all necessary contexts and providers for the node editor
 * without depending on any specific layout system (like GridLayout).
 * Use this when you want to provide your own layout while using the core editor functionality.
 */
import * as React from "react";
import { ConnectionView as DefaultConnectionView } from "./components/connection/ConnectionView";
import { PortView as DefaultPortView } from "./components/ports/PortView";
import { NodeView as DefaultNodeView } from "./components/node/NodeView";
import { EditorActionStateProvider } from "./contexts/composed/EditorActionStateContext";
import { ExternalDataProvider } from "./contexts/external-data/ExternalDataContext";
import { HistoryProvider } from "./contexts/history/context";
import { InlineEditingProvider } from "./contexts/InlineEditingContext";
import { KeyboardShortcutProvider } from "./contexts/composed/keyboard-shortcut/context";
import { NodeEditorProvider } from "./contexts/composed/node-editor/provider";
import type { NodeEditorData } from "./types/core";
import { NodeCanvasProvider } from "./contexts/composed/canvas/viewport/provider";
import { CanvasInteractionProvider } from "./contexts/composed/canvas/interaction/provider";
import { NodeDefinitionProvider } from "./contexts/node-definitions/provider";
import { RendererProvider } from "./contexts/RendererContext";
import { I18nProvider } from "./i18n/context";
import { enMessages } from "./i18n/en";
import type { I18nMessages, I18nDictionaries, Locale } from "./i18n/types";
import type { SettingsManager } from "./settings/SettingsManager";
import type { ExternalDataReference, NodeDefinition } from "./types/NodeDefinition";
import type { FallbackDefinition } from "./types/NodeDefinitionRegistry";
import type { NodeEditorRendererOverrides } from "./types/renderers";
import { InteractionSettingsProvider } from "./contexts/interaction-settings/context";
import type { NodeEditorInteractionSettingsPatch } from "./types/interaction";
import { PortPositionProvider } from "./contexts/node-ports/provider";
import type { PortPositionBehavior } from "./types/portPosition";
import { ConnectionBehaviorProvider } from "./contexts/connection-behavior/context";
import type { ConnectionBehavior } from "./types/connectionBehavior";

export type NodeEditorCoreProps = {
  /** Initial data for uncontrolled mode (like defaultValue) */
  initialData?: Partial<NodeEditorData>;
  /** Data for controlled mode (like value) */
  data?: NodeEditorData;
  onDataChange?: (data: NodeEditorData) => void;
  onSave?: (data: NodeEditorData) => void | Promise<void>;
  onLoad?: () => NodeEditorData | Promise<NodeEditorData>;
  /** Custom node definitions */
  nodeDefinitions?: NodeDefinition[];
  /** Whether to include default node definitions */
  includeDefaultDefinitions?: boolean;
  /**
   * Fallback definition for unknown node types.
   * - `true`: Use the default error node definition factory
   * - `false` or `undefined`: No fallback (returns undefined for unknown types)
   * - `NodeDefinition`: Use a fixed definition for all unknown types
   * - `(type: string) => NodeDefinition`: Use a factory function
   */
  fallbackDefinition?: FallbackDefinition | boolean;
  /** External data references for nodes */
  externalDataRefs?: Record<string, ExternalDataReference>;
  /** Settings manager instance */
  settingsManager?: SettingsManager;
  // i18n options
  locale?: Locale;
  fallbackLocale?: Locale;
  messagesOverride?: Partial<Record<Locale, Partial<I18nMessages>>>;
  /** Additional locale dictionaries to make available beyond the default English bundle */
  localeDictionaries?: I18nDictionaries;
  /** Override: enable/disable auto-save regardless of settings */
  autoSaveEnabled?: boolean;
  /** Override: auto-save interval in seconds */
  autoSaveInterval?: number;
  /** Maximum number of history entries to keep */
  historyMaxEntries?: number;
  /** Renderer overrides for core editor visuals */
  renderers?: NodeEditorRendererOverrides;
  /** Overrides for canvas interaction behavior (pan, pinch zoom, context menu) */
  interactionSettings?: NodeEditorInteractionSettingsPatch;
  /** Custom behavior for port position calculation */
  portPositionBehavior?: PortPositionBehavior;
  /** Customizable connection path calculation behavior */
  connectionBehavior?: Partial<ConnectionBehavior>;
  /** Children to render within all providers */
  children: React.ReactNode;
};

/**
 * NodeEditorCore - Sets up all necessary contexts and providers
 * without any layout system dependencies.
 *
 * Use this component when you want to build your own panel/layout system
 * while still leveraging all the core node editor functionality.
 */
export function NodeEditorCore({
  initialData,
  data,
  onDataChange,
  onSave,
  onLoad,
  nodeDefinitions,
  includeDefaultDefinitions = true,
  fallbackDefinition = true,
  externalDataRefs,
  settingsManager,
  locale,
  fallbackLocale,
  messagesOverride,
  localeDictionaries,
  autoSaveEnabled,
  autoSaveInterval,
  historyMaxEntries = 40,
  renderers,
  interactionSettings,
  portPositionBehavior,
  connectionBehavior,
  children,
}: NodeEditorCoreProps) {
  const mergedRenderers = React.useMemo(
    () => ({
      node: renderers?.node ?? DefaultNodeView,
      port: renderers?.port ?? DefaultPortView,
      connection: renderers?.connection ?? DefaultConnectionView,
    }),
    [renderers],
  );

  const dictionaries = React.useMemo<I18nDictionaries>(() => {
    return {
      en: enMessages,
      ...(localeDictionaries ?? {}),
    };
  }, [localeDictionaries]);

  return (
    <I18nProvider
      dictionaries={dictionaries}
      initialLocale={locale}
      fallbackLocale={fallbackLocale}
      messagesOverride={messagesOverride}
    >
      <RendererProvider renderers={mergedRenderers}>
        <NodeDefinitionProvider nodeDefinitions={nodeDefinitions} includeDefaults={includeDefaultDefinitions} fallbackDefinition={fallbackDefinition}>
          <ExternalDataProvider refs={externalDataRefs}>
            <NodeEditorProvider
              initialState={initialData}
              controlledData={data}
              onDataChange={onDataChange}
              onSave={onSave}
              onLoad={onLoad}
              settingsManager={settingsManager}
              autoSaveEnabled={autoSaveEnabled}
              autoSaveInterval={autoSaveInterval}
            >
              <ConnectionBehaviorProvider behavior={connectionBehavior}>
                <NodeCanvasProvider>
                  <CanvasInteractionProvider>
                    <EditorActionStateProvider>
                      <PortPositionProvider behavior={portPositionBehavior}>
                        <HistoryProvider maxEntries={historyMaxEntries}>
                          <InlineEditingProvider>
                            <KeyboardShortcutProvider>
                              <InteractionSettingsProvider value={interactionSettings}>
                                {children}
                              </InteractionSettingsProvider>
                            </KeyboardShortcutProvider>
                          </InlineEditingProvider>
                        </HistoryProvider>
                      </PortPositionProvider>
                    </EditorActionStateProvider>
                  </CanvasInteractionProvider>
                </NodeCanvasProvider>
              </ConnectionBehaviorProvider>
            </NodeEditorProvider>
          </ExternalDataProvider>
        </NodeDefinitionProvider>
      </RendererProvider>
    </I18nProvider>
  );
}
