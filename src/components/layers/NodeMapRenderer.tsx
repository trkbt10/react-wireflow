/**
 * @file Node map renderer component
 */
import * as React from "react";
import type { Node, Connection } from "../../types/core";
import type { NodeDefinition } from "../../types/NodeDefinition";
import { nodeHasGroupBehavior } from "../../types/behaviors";
import styles from "./NodeMapRenderer.module.css";

type NodeMapNode = Pick<Node, "id" | "type" | "position" | "size" | "visible" | "data">;

export type NodeMapRendererProps = {
  nodes: Record<string, NodeMapNode>;
  connections: Record<string, Connection>;
  width: number;
  height: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  filterHidden?: boolean;
  className?: string;
  nodeDefinitions?: NodeDefinition[];
};

export const NodeMapRenderer: React.FC<NodeMapRendererProps> = ({
  nodes,
  connections,
  width,
  height,
  padding = 10,
  filterHidden = true,
  className,
  nodeDefinitions = [],
}) => {
  const pad = React.useMemo(() => {
    if (typeof padding === "number") {
      return { top: padding, right: padding, bottom: padding, left: padding };
    }
    return { top: padding.top ?? 0, right: padding.right ?? 0, bottom: padding.bottom ?? 0, left: padding.left ?? 0 };
  }, [padding]);

  const visibleNodes = React.useMemo(() => {
    const list = Object.values(nodes);
    return filterHidden ? list.filter((n) => n.visible !== false) : list;
  }, [nodes, filterHidden]);

  const bounds = React.useMemo(() => {
    if (visibleNodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    visibleNodes.forEach((n) => {
      const w = n.size?.width || 150;
      const h = n.size?.height || 100;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    });
    return { minX, minY, maxX, maxY };
  }, [visibleNodes]);

  const scale = React.useMemo(() => {
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const sx = Math.max(0.0001, (width - pad.left - pad.right) / (bw || 1));
    const sy = Math.max(0.0001, (height - pad.top - pad.bottom) / (bh || 1));
    return Math.min(sx, sy);
  }, [bounds, width, height, pad.left, pad.right, pad.top, pad.bottom]);

  const worldToView = React.useCallback(
    (x: number, y: number) => ({
      x: (x - bounds.minX) * scale + pad.left,
      y: (y - bounds.minY) * scale + pad.top,
    }),
    [bounds.minX, bounds.minY, scale, pad.left, pad.top],
  );

  return (
    <div className={className} style={{ position: "relative", width, height }}>
      <svg className={styles.minimapConnections} viewBox={`0 0 ${width} ${height}`}>
        {Object.values(connections).map((c) => {
          const from = nodes[c.fromNodeId];
          const to = nodes[c.toNodeId];
          if (!from || !to) {
            return null;
          }
          if (filterHidden && (from.visible === false || to.visible === false)) {
            return null;
          }
          const fromPt = worldToView(
            from.position.x + (from.size?.width || 150) / 2,
            from.position.y + (from.size?.height || 100) / 2,
          );
          const toPt = worldToView(
            to.position.x + (to.size?.width || 150) / 2,
            to.position.y + (to.size?.height || 100) / 2,
          );
          return (
            <line key={c.id} x1={fromPt.x} y1={fromPt.y} x2={toPt.x} y2={toPt.y} className={styles.minimapConnection} />
          );
        })}
      </svg>
      {visibleNodes.map((n) => {
        const p = worldToView(n.position.x, n.position.y);
        const w = Math.max(2, (n.size?.width || 150) * scale);
        const h = Math.max(2, (n.size?.height || 100) * scale);
        const isGroup = nodeHasGroupBehavior(n, nodeDefinitions);
        const className = `${styles.minimapNode} ${isGroup ? styles.minimapGroupNode : ""}`;
        return <div key={n.id} className={className} style={{ left: p.x, top: p.y, width: w, height: h }} />;
      })}
    </div>
  );
};

NodeMapRenderer.displayName = "NodeMapRenderer";
