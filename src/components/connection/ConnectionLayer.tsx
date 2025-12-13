/**
 * @file ConnectionLayer component
 * Renders all connections and handles connection interactions.
 */
import * as React from "react";
import { useNodeEditor } from "../../contexts/composed/node-editor/context";
import { ConnectionRenderer } from "./ConnectionRenderer";
import { DragConnection } from "./DragConnection";
import styles from "./ConnectionLayer.module.css";

export type ConnectionLayerProps = {
  className?: string;
};

/**
 * ConnectionLayer - Renders all connections and the drag connection preview.
 * Each ConnectionRenderer derives its own interaction state from context.
 */
const ConnectionLayerComponent: React.FC<ConnectionLayerProps> = ({ className }) => {
  const { state: nodeEditorState } = useNodeEditor();

  return (
    <svg className={className ? `${styles.root} ${className}` : styles.root} data-connection-layer="root">
      {Object.values(nodeEditorState.connections).map((connection) => (
        <ConnectionRenderer key={connection.id} connection={connection} />
      ))}
      <DragConnection />
    </svg>
  );
};

export const ConnectionLayer = React.memo(ConnectionLayerComponent);

ConnectionLayer.displayName = "ConnectionLayer";
