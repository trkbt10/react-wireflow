/**
 * @file Inspector panel component
 */
import * as React from "react";
import { useEditorActionState } from "../../contexts/composed/EditorActionStateContext";
import { NodeTreeListPanel } from "./panels/NodeTreeListPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { InspectorPropertiesTab } from "./panels/InspectorPropertiesTab";
import { InspectorSection } from "./parts/InspectorSection";
import { InspectorTabbedContainer, type InspectorTabConfig } from "./parts/InspectorTabbedContainer";
import styles from "./InspectorPanel.module.css";
import { useI18n } from "../../i18n/context";
import { GeneralSettingsPanel } from "./panels/GeneralSettingsPanel";
import { GridSettingsPanel } from "./panels/GridSettingsPanel";
import { PropertySection } from "./parts/PropertySection";
import { InteractionHelpPanel } from "./panels/InteractionHelpPanel";

export type InspectorPanelTabConfig = InspectorTabConfig;

export type InspectorPanelProps = {
  tabs?: InspectorPanelTabConfig[];
  settingsPanels?: InspectorSettingsPanelConfig[];
};

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ tabs: providedTabs, settingsPanels = [] }) => {
  const { state: actionState, actions: actionActions } = useEditorActionState();
  const { t } = useI18n();

  const defaultTabs = React.useMemo<InspectorPanelTabConfig[]>(
    () => [
      {
        id: "layers",
        label: t("inspectorTabLayers") || "Layers",
        render: () => <InspectorLayersTab />,
      },
      {
        id: "properties",
        label: t("inspectorTabProperties") || "Properties",
        render: () => <InspectorPropertiesTab />,
      },
      {
        id: "settings",
        label: t("inspectorTabSettings") || "Settings",
        render: () => <InspectorSettingsTab panels={settingsPanels} />,
      },
    ],
    [t, settingsPanels],
  );

  const tabs = providedTabs ?? defaultTabs;
  const rawActiveTabIndex = actionState.inspectorActiveTab ?? 0;

  React.useEffect(() => {
    if (tabs.length === 0) {
      return;
    }
    if (rawActiveTabIndex > tabs.length - 1) {
      actionActions.setInspectorActiveTab(Math.max(tabs.length - 1, 0));
    }
  }, [tabs.length, rawActiveTabIndex, actionActions]);

  const handleTabChange = React.useCallback(
    (index: number) => {
      actionActions.setInspectorActiveTab(index);
    },
    [actionActions],
  );

  return (
    <InspectorTabbedContainer
      className={styles.inspectorPanel}
      tabs={tabs}
      activeTabIndex={rawActiveTabIndex}
      onTabChange={handleTabChange}
    />
  );
};

InspectorPanel.displayName = "InspectorPanel";

export const InspectorLayersTab: React.FC = () => {
  return (
    <InspectorSection>
      <NodeTreeListPanel />
    </InspectorSection>
  );
};

export const InspectorHistoryTab: React.FC = () => {
  return <HistoryPanel />;
};

export type InspectorSettingsPanelConfig = {
  title: string;
  component: React.ComponentType;
};

export type InspectorSettingsTabProps = {
  panels: InspectorSettingsPanelConfig[];
};

export const InspectorSettingsTab: React.FC<InspectorSettingsTabProps> = ({ panels }) => {
  const { t } = useI18n();
  // If no custom panels are provided, show default panels
  const effectivePanels = React.useMemo(() => {
    if (panels.length > 0) {
      return panels;
    }
    // Default panels
    return [
      {
        title: t("inspectorInteractionHelpTitle") || "Interaction Guide",
        component: InteractionHelpPanel,
      },
      {
        title: t("inspectorGeneralSettings") || "General Settings",
        component: GeneralSettingsPanel,
      },
      {
        title: t("inspectorGridSettings") || "Grid Settings",
        component: GridSettingsPanel,
      },
    ];
  }, [panels, t]);

  return (
    <>
      {effectivePanels.map((panel, index) => (
        <PropertySection title={panel.title} key={index}>
          <panel.component />
        </PropertySection>
      ))}
    </>
  );
};
