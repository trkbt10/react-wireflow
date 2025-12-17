/**
 * @file Fractal Node Stress Test - Barnsley Fern pattern for performance testing
 */
import * as React from "react";
import { NodeEditorCore, createNodeDefinition, type NodeEditorData, type Node, type Connection } from "../../../../core";
import { NodeCanvas } from "../../../../components/canvas/NodeCanvas";
import { useNodeCanvasViewportScale, useNodeCanvasPanActive } from "../../../../contexts/composed/canvas/viewport/context";
import { SettingsManager } from "../../../../settings/SettingsManager";
import { createMemorySettingsStorage } from "../../../../settings/storages/MemorySettingsStorage";
import { InspectorButtonGroup, InspectorFieldRow, InspectorSection } from "../../../../inspector";
import { ExampleLayout } from "../../shared/parts/ExampleLayout";
import { ExampleWrapper } from "../../shared/parts/ExampleWrapper";
import {
  TwoSideLayout,
  TwoSideLayoutCanvasFrame,
  TwoSideLayoutMain,
  TwoSideLayoutSidebar,
  TwoSideLayoutStack,
} from "../../../layouts/TwoSideLayout";
import styles from "./FractalNodeStressTest.module.css";

type NodeCount = 100 | 500 | 1000 | 2000;

const nodeDefinitions = [
  createNodeDefinition({
    type: "fractal-node",
    displayName: "Fractal Node",
    defaultSize: { width: 80, height: 40 },
    ports: [
      { id: "in", type: "input", label: "In", position: "left" },
      { id: "out", type: "output", label: "Out", position: "right" },
    ],
  }),
];

/**
 * Barnsley Fern transformation functions
 * Each returns a new (x, y) coordinate
 */
const barnsleyTransform = (x: number, y: number): { x: number; y: number } => {
  const r = Math.random();

  if (r < 0.01) {
    // f1: stem (1% probability)
    return { x: 0, y: 0.16 * y };
  } else if (r < 0.86) {
    // f2: successively smaller leaflets (85% probability)
    return {
      x: 0.85 * x + 0.04 * y,
      y: -0.04 * x + 0.85 * y + 1.6,
    };
  } else if (r < 0.93) {
    // f3: largest left-hand leaflet (7% probability)
    return {
      x: 0.2 * x - 0.26 * y,
      y: 0.23 * x + 0.22 * y + 1.6,
    };
  } else {
    // f4: largest right-hand leaflet (7% probability)
    return {
      x: -0.15 * x + 0.28 * y,
      y: 0.26 * x + 0.24 * y + 0.44,
    };
  }
};

type FractalData = {
  nodes: Record<string, Node>;
  connections: Record<string, Connection>;
};

/**
 * Generate fractal nodes and parent-child connections using Barnsley Fern
 */
const generateFractalData = (count: NodeCount): FractalData => {
  const nodes: Record<string, Node> = {};
  const connections: Record<string, Connection> = {};

  let x = 0;
  let y = 0;

  // Scale and offset to fit canvas (fern is roughly -2.5 to 2.5 in x, 0 to 10 in y)
  // Increased scale for better spacing between nodes
  const scaleX = 400;
  const scaleY = 180;
  const offsetX = 1200;
  const offsetY = 100;

  for (let i = 0; i < count; i++) {
    const point = barnsleyTransform(x, y);
    x = point.x;
    y = point.y;

    const nodeId = `node-${i}`;
    nodes[nodeId] = {
      id: nodeId,
      type: "fractal-node",
      position: {
        x: x * scaleX + offsetX,
        y: (10 - y) * scaleY + offsetY, // Flip y-axis for canvas coordinates
      },
      data: { title: `#${i}` },
    };

    // Create parent-child connection (each node connects to previous)
    if (i > 0) {
      const connectionId = `conn-${i}`;
      connections[connectionId] = {
        id: connectionId,
        fromNodeId: `node-${i - 1}`,
        fromPortId: "out",
        toNodeId: nodeId,
        toPortId: "in",
      };
    }
  }

  return { nodes, connections };
};

const createSettingsManager = (): SettingsManager => {
  const storage = createMemorySettingsStorage();
  return new SettingsManager({ storage });
};

type ZoomIndicatorProps = {
  threshold: number;
  enabled: boolean;
};

const ZoomIndicator: React.FC<ZoomIndicatorProps> = ({ threshold, enabled }) => {
  const scale = useNodeCanvasViewportScale();
  const isPanning = useNodeCanvasPanActive();
  const isSnapshotByZoom = enabled && scale < threshold;
  const isSnapshotActive = isSnapshotByZoom || isPanning;

  const getStatusLabel = () => {
    if (isPanning) {
      return "PANNING";
    }
    if (isSnapshotByZoom) {
      return "SNAPSHOT";
    }
    return "NORMAL";
  };

  return (
    <div className={styles.zoomIndicator}>
      <span className={styles.zoomValue}>{Math.round(scale * 100)}%</span>
      <span className={isSnapshotActive ? styles.snapshotActive : styles.snapshotInactive}>
        {getStatusLabel()}
      </span>
    </div>
  );
};

export const FractalNodeStressTest: React.FC = () => {
  const [settingsManager] = React.useState<SettingsManager>(() => createSettingsManager());
  const [nodeCount, setNodeCount] = React.useState<NodeCount>(500);
  const [snapshotEnabled, setSnapshotEnabled] = React.useState(true);
  const [snapshotThreshold, setSnapshotThreshold] = React.useState<number>(0.3);
  const [dataKey, setDataKey] = React.useState(0);

  // Sync snapshot threshold to settings
  // When disabled, use minimum value (0.01) which effectively disables snapshot mode
  React.useEffect(() => {
    settingsManager.setValue("appearance.canvasSnapshotThreshold", snapshotEnabled ? snapshotThreshold : 0.01);
  }, [settingsManager, snapshotEnabled, snapshotThreshold]);

  // Also hide grid and labels at low zoom for performance
  React.useEffect(() => {
    settingsManager.setValue("appearance.gridVisibilityThreshold", 0.3);
    settingsManager.setValue("appearance.portLabelVisibilityThreshold", 0.5);
  }, [settingsManager]);

  // Generate initial data with fractal pattern and connections
  const initialData = React.useMemo<Partial<NodeEditorData>>(() => {
    return generateFractalData(nodeCount);
  }, [nodeCount, dataKey]);

  const handleNodeCountChange = (value: string) => {
    setNodeCount(Number(value) as NodeCount);
    setDataKey((prev) => prev + 1); // Force re-generate
  };

  const handleRegenerate = () => {
    setDataKey((prev) => prev + 1);
  };

  return (
    <ExampleLayout>
      <ExampleWrapper>
        <TwoSideLayout>
          <TwoSideLayoutSidebar>
            <TwoSideLayoutStack>
              <InspectorSection>
                <InspectorFieldRow label="Node Count">
                  <InspectorButtonGroup
                    options={[
                      { value: "100", label: "100" },
                      { value: "500", label: "500" },
                      { value: "1000", label: "1K" },
                      { value: "2000", label: "2K" },
                    ]}
                    value={String(nodeCount)}
                    onChange={handleNodeCountChange}
                    aria-label="Node count"
                  />
                </InspectorFieldRow>
                <InspectorFieldRow label="Snapshot Mode">
                  <InspectorButtonGroup
                    options={[
                      { value: "on", label: "On" },
                      { value: "off", label: "Off" },
                    ]}
                    value={snapshotEnabled ? "on" : "off"}
                    onChange={(v) => setSnapshotEnabled(v === "on")}
                    aria-label="Snapshot mode"
                  />
                </InspectorFieldRow>
                <InspectorFieldRow label="Threshold">
                  <InspectorButtonGroup
                    options={[
                      { value: "0.2", label: "20%" },
                      { value: "0.3", label: "30%" },
                      { value: "0.5", label: "50%" },
                      { value: "0.7", label: "70%" },
                    ]}
                    value={String(snapshotThreshold)}
                    onChange={(v) => setSnapshotThreshold(Number(v))}
                    disabled={!snapshotEnabled}
                    aria-label="Snapshot threshold"
                    size="compact"
                  />
                </InspectorFieldRow>
                <InspectorFieldRow label="Regenerate">
                  <button className={styles.regenerateButton} onClick={handleRegenerate}>
                    Regenerate Fern
                  </button>
                </InspectorFieldRow>
              </InspectorSection>
              <div className={styles.hint}>
                <p>Zoom out to below {Math.round(snapshotThreshold * 100)}% to activate snapshot mode.</p>
                <p>With snapshot ON, the canvas is GPU-rasterized for smoother panning at low zoom.</p>
              </div>
            </TwoSideLayoutStack>
          </TwoSideLayoutSidebar>
          <TwoSideLayoutMain>
            <TwoSideLayoutCanvasFrame className={styles.canvas}>
              <NodeEditorCore
                key={dataKey}
                initialData={initialData}
                nodeDefinitions={nodeDefinitions}
                includeDefaultDefinitions={false}
                autoSaveEnabled={false}
                settingsManager={settingsManager}
              >
                <NodeCanvas />
                <ZoomIndicator threshold={snapshotThreshold} enabled={snapshotEnabled} />
              </NodeEditorCore>
            </TwoSideLayoutCanvasFrame>
          </TwoSideLayoutMain>
        </TwoSideLayout>
      </ExampleWrapper>
    </ExampleLayout>
  );
};

export default FractalNodeStressTest;
