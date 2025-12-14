/**
 * @file Core node definition types including render props, constraints, and external data handling
 */
import React, { type ReactNode, type ReactElement } from "react";
import type { Node, NodeId, Port, Connection, ConnectionId, NodeData, PortPlacement, AbsolutePortPlacement, Size, Position } from "./core";
import type { CategoryInfo } from "../category/types";
import type { NodeBehavior } from "./behaviors";

/**
 * External data reference for nodes
 * Supports both synchronous and asynchronous data loading
 */
export type ExternalDataReference = {
  /** Unique identifier for the external data */
  id: string;
  /** Type of the external data (e.g., "section", "plot", "layer") */
  type: string;
  /** Optional version for optimistic locking */
  version?: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Node render props for custom node visualization
 * @template TData - The node data type (defaults to Record<string, unknown>)
 */
export type NodeRendererProps<TData extends Record<string, unknown> = Record<string, unknown>> = {
  /** The node data */
  node: Node & { data: TData };
  /** Whether the node is selected */
  isSelected: boolean;
  /** Whether the node is being dragged */
  isDragging: boolean;
  /** Whether the node is being resized */
  isResizing: boolean;
  /** Whether the node is being edited inline */
  isEditing: boolean;
  /** External data if loaded */
  externalData: unknown;
  /** Loading state for external data */
  isLoadingExternalData: boolean;
  /** Error state for external data */
  externalDataError: Error | null;
  /** Callback to trigger inline editing */
  onStartEdit: () => void;
  /** Callback to update node data */
  onUpdateNode: (updates: Partial<Node>) => void;
};

/**
 * Inspector panel render props
 * @template TData - The node data type (defaults to Record<string, unknown>)
 */
export type InspectorRenderProps<TData extends Record<string, unknown> = Record<string, unknown>> = {
  /** The selected node */
  node: Node & { data: TData };
  /** External data if loaded */
  externalData: unknown;
  /** Loading state for external data */
  isLoadingExternalData: boolean;
  /** Error state for external data */
  externalDataError: Error | null;
  /** Callback to update node data */
  onUpdateNode: (updates: Partial<Node>) => void;
  /** Callback to update external data */
  onUpdateExternalData: (data: unknown) => Promise<void>;
  /** Callback to delete the node */
  onDeleteNode: () => void;
};

/**
 * Context provided to port render functions
 */
export type PortRenderContext = {
  /** The port being rendered */
  port: Port;
  /** The node that owns this port */
  node: Node;
  /** All nodes in the editor */
  allNodes: Record<NodeId, Node>;
  /** All connections in the editor */
  allConnections: Record<ConnectionId, Connection>;
  /** Whether a connection is being dragged */
  isConnecting: boolean;
  /** Whether this port can accept the current connection */
  isConnectable: boolean;
  /** Whether this port is a candidate for the current connection */
  isCandidate: boolean;
  /** Whether this port is hovered */
  isHovered: boolean;
  /** Whether this port has any connections */
  isConnected: boolean;
  /** Port position information */
  position?: {
    x: number;
    y: number;
    transform?: string;
  };
  /** Event handlers */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onPointerCancel?: (e: React.PointerEvent) => void;
  };
};

export type PortInstanceContext = {
  /** Node that owns the port instances */
  node: Node;
};

export type PortInstanceFactoryContext = PortInstanceContext & {
  /** Base port definition used for generation */
  definition: PortDefinition;
  /** Zero-based instance index */
  index: number;
  /** Total instances generated from the definition */
  total: number;
};

export type PortConnectionContext = {
  /**
   * Source port for the attempted connection.
   * Always the OUTPUT port, regardless of drag direction.
   */
  fromPort: Port;
  /**
   * Target port for the attempted connection.
   * Always the INPUT port, regardless of drag direction.
   */
  toPort: Port;
  /** Node containing the source (output) port (when available) */
  fromNode?: Node;
  /** Node containing the target (input) port (when available) */
  toNode?: Node;
  /** Node definition for the source (output) side (when available) */
  fromDefinition?: NodeDefinition;
  /** Node definition for the target (input) side (when available) */
  toDefinition?: NodeDefinition;
  /** Existing connections in the editor */
  allConnections?: Record<ConnectionId, Connection>;
  /**
   * Result of the default data type compatibility check.
   * When canConnect is defined, it can use this to see the default result
   * and decide whether to override it.
   */
  dataTypeCompatible: boolean;
};

/**
 * Context provided to connection render functions
 */
export type ConnectionRenderContext = {
  /** The connection being rendered (null when previewing during drag) */
  connection: Connection | null;
  /** Rendering phase */
  phase: "connected" | "connecting" | "disconnecting";
  /** The source port (typically the output side) */
  fromPort: Port;
  /** The target port (may be undefined while previewing or when the anchor is floating) */
  toPort?: Port;
  /** The source node */
  fromNode: Node;
  /** The target node (undefined when no target is resolved yet) */
  toNode?: Node;
  /** Absolute position of the source port */
  fromPosition: { x: number; y: number };
  /** Absolute position of the target port */
  toPosition: { x: number; y: number };
  /** Whether this connection is selected */
  isSelected: boolean;
  /** Whether this connection is hovered */
  isHovered: boolean;
  /** Whether this connection touches a selected node */
  isAdjacentToSelectedNode: boolean;
  /** Whether this connection is being dragged */
  isDragging?: boolean;
  /** Drag progress (0-1) for visual feedback */
  dragProgress?: number;
  /** Pointer and context menu handlers that preserve editor behavior */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
  };
};

/**
 * Port configuration for a node type
 */
export type PortDefinition = {
  /** Port identifier */
  id: string;
  /** Port type */
  type: "input" | "output";
  /** Display label */
  label: string;
  /**
   * Position on the node.
   * - Simple: "left" | "right" | "top" | "bottom"
   * - Segmented: { side, segment?, segmentOrder?, segmentSpan?, align?, inset? }
   * - Absolute: { mode: "absolute", x, y, unit? }
   */
  position: PortPlacement | AbsolutePortPlacement | "left" | "right" | "top" | "bottom";
  /**
   * Optional data type(s) for validation. Arrays allow declaring multiple compatible types.
   * For backwards compatibility, both dataType and dataTypes are supported and merged.
   */
  dataType?: string | string[];
  /** Additional aliases for the port's acceptable data types */
  dataTypes?: string[];
  /** Whether this port is required */
  required?: boolean;
  /** Maximum number of connections (default: 1 for all ports unless set to "unlimited") */
  maxConnections?: number | "unlimited";
  /**
   * Optional predicate to determine whether a connection involving this port is allowed.
   * Executed for both ends of the connection; all predicates must pass.
   */
  canConnect?: (context: PortConnectionContext) => boolean;
  /**
   * Number of port instances generated from this definition.
   * Provide a function to derive the count from node state for dynamic ports.
   */
  instances?: number | ((context: PortInstanceContext) => number);
  /**
   * Custom id generator for each port instance.
   * When undefined and instances > 1, ids default to `${id}-${index + 1}`.
   */
  createPortId?: (context: PortInstanceFactoryContext) => string;
  /**
   * Custom label generator for each port instance.
   * When undefined and instances > 1, labels default to `${label} ${index + 1}`.
   */
  createPortLabel?: (context: PortInstanceFactoryContext) => string;

  /**
   * Custom port renderer (complete control over port appearance)
   * @param context - Rendering context with port state and editor state
   * @param defaultRender - Function to render the default port appearance
   * @returns React element to render
   */
  renderPort?: (context: PortRenderContext, defaultRender: () => ReactElement) => ReactElement;

  /**
   * Custom connection renderer (complete control over connection appearance)
   * @param context - Rendering context with connection state and editor state
   * @param defaultRender - Function to render the default connection appearance
   * @returns React element to render (should be SVG)
   */
  renderConnection?: (context: ConnectionRenderContext, defaultRender: () => ReactElement) => ReactElement;
};

/**
 * Constraint violation information
 */
export type ConstraintViolation = {
  /** Type of constraint that was violated */
  type: string;
  /** Human-readable description of the violation */
  message: string;
  /** Severity level */
  severity: "error" | "warning" | "info";
  /** Related node IDs */
  nodeIds?: NodeId[];
  /** Related port IDs */
  portIds?: string[];
  /** Related connection IDs */
  connectionIds?: string[];
};

/**
 * Constraint validation context
 */
export type ConstraintContext = {
  /** Current node being validated */
  node: Node;
  /** All nodes in the editor */
  allNodes: Record<NodeId, Node>;
  /** All connections in the editor */
  allConnections: Record<string, Connection>;
  /** Node definition for the current node */
  nodeDefinition: NodeDefinition;
  /** Operation being performed */
  operation: "create" | "update" | "delete" | "connect" | "disconnect" | "move";
  /** Additional context data */
  context?: Record<string, unknown>;
};

/**
 * Constraint validation result
 */
export type ConstraintValidationResult = {
  /** Whether the constraint is satisfied */
  isValid: boolean;
  /** List of violations (if any) */
  violations: ConstraintViolation[];
};

/**
 * Node constraint definition
 */
export type NodeConstraint = {
  /** Unique identifier for the constraint */
  id: string;
  /** Display name for the constraint */
  name: string;
  /** Description of what the constraint does */
  description?: string;
  /** Constraint validation function */
  validate: (context: ConstraintContext) => ConstraintValidationResult;
  /** Whether this constraint should block operations when violated */
  blocking?: boolean;
  /** Operations this constraint applies to */
  appliesTo?: ("create" | "update" | "delete" | "connect" | "disconnect" | "move")[];
};

/**
 * Position information for a single port
 */
export type ComputedPortPosition = {
  /** Position relative to node for rendering the port element */
  renderPosition: Position & { transform?: string };
  /** Absolute canvas position where connections should attach */
  connectionPoint: Position;
};

/**
 * Context provided to the custom port position computation function
 */
export type ComputePortPositionsContext = {
  /** The node for which ports are being positioned */
  node: Node;
  /** The ports to position */
  ports: Port[];
  /** The effective size of the node */
  nodeSize: Size;
  /** Default computation function for fallback or delegation */
  defaultCompute: (ports: Port[]) => Map<string, ComputedPortPosition>;
};

/**
 * Result of custom port position computation
 */
export type ComputePortPositionsResult = Map<string, ComputedPortPosition>;

/**
 * Node type definition
 * @template TData - The node data type (defaults to Record<string, unknown>)
 */
export type NodeDefinition<TData extends Record<string, unknown> = Record<string, unknown>> = {
  /** Unique type identifier */
  type: string;
  /** Display name for the node type */
  displayName: string;
  /** Description of the node type */
  description?: string;
  /** Icon or visual identifier */
  icon?: ReactNode;
  /**
   * Category for grouping in UI.
   * Can be a single category string or an array of categories for multi-category membership.
   * Supports hierarchical paths using "/" separator (e.g., "custom/ui").
   * When multiple categories share a common ancestor, the node appears once per specific category
   * and only once in shared parent categories.
   */
  category?: string | string[];
  /**
   * Reference to shared category metadata (icon, priority, etc.).
   * When provided, takes precedence over individual priority field for category ordering.
   */
  categoryInfo?: CategoryInfo;
  /**
   * Optional priority hint for the node's category when rendered in palettes/menus.
   * Lower numbers appear first. When multiple nodes share a category, the lowest
   * value among them determines the category position. Categories without a
   * priority fall back to alphabetical ordering after the prioritized groups.
   */
  priority?: number;
  /**
   * Maximum number of nodes of this type allowed within a single flow/editor.
   * If undefined, no limit is enforced.
   */
  maxPerFlow?: number;
  /** Default data when creating a new node */
  defaultData?: TData;
  /** Default size for new nodes */
  defaultSize?: { width: number; height: number };
  /** Default resizable state for new nodes (defaults to true if not specified) */
  defaultResizable?: boolean;
  /** Port definitions */
  ports?: PortDefinition[];
  /** Behaviors that this node exhibits (appearance/node/group). Defaults to ['node'] */
  behaviors?: NodeBehavior[];
  /** When true, node can only be moved by dragging title or when multi-selected */
  interactive?: boolean;
  /**
   * Custom render function for the node.
   * If the function name starts with an uppercase letter (React component convention),
   * it will be invoked as a JSX component, allowing the use of React hooks.
   * Otherwise, it will be called as a regular function for backwards compatibility.
   */
  renderNode?: (props: NodeRendererProps<TData>) => ReactElement;
  /**
   * Custom render function for the inspector panel.
   * If the function name starts with an uppercase letter (React component convention),
   * it will be invoked as a JSX component, allowing the use of React hooks.
   * Otherwise, it will be called as a regular function for backwards compatibility.
   */
  renderInspector?: (props: InspectorRenderProps<TData>) => ReactElement;
  /** External data loader */
  loadExternalData?: (ref: ExternalDataReference) => unknown | Promise<unknown>;
  /** External data updater */
  updateExternalData?: (ref: ExternalDataReference, data: unknown) => void | Promise<void>;
  /**
   * Validation function for connections.
   * Called to determine if a connection between two ports is allowed.
   *
   * @param fromPort - Always the OUTPUT port (connection source), regardless of drag direction
   * @param toPort - Always the INPUT port (connection target), regardless of drag direction
   * @returns true if the connection is allowed, false otherwise
   */
  validateConnection?: (fromPort: Port, toPort: Port) => boolean;
  /** Custom color or visual state */
  visualState?: "info" | "success" | "warning" | "error" | "disabled";
  /** Node constraints */
  constraints?: NodeConstraint[];
  /**
   * Custom port position computation function.
   * When provided, this function is called to compute the positions of all ports
   * for nodes of this type, giving full control over port placement.
   *
   * @param context - Contains node, ports, and size information
   * @returns Map of port ID to position information
   */
  computePortPositions?: (context: ComputePortPositionsContext) => ComputePortPositionsResult;
  /**
   * When true, disables framework-provided selection outline, shadows, and borders.
   * Use this when renderNode handles its own selection styling.
   * Defaults to false.
   */
  disableOutline?: boolean;
};

/**
 * Helper function to create a type-safe node definition
 * @template TData - The node data type
 */
export function createNodeDefinition<TData extends Record<string, unknown> = Record<string, unknown>>(
  definition: NodeDefinition<TData>,
): NodeDefinition<TData> {
  return definition;
}

/**
 * Helper function to create a type-safe node data updater
 * @template TData - The node data type
 */
export function createNodeDataUpdater<TData extends Record<string, unknown> = Record<string, unknown>>(
  onUpdateNode: (updates: Partial<Node>) => void,
) {
  return (data: Partial<TData>) => {
    onUpdateNode({ data: data as NodeData });
  };
}

/**
 * Convert a typed NodeDefinition to the base NodeDefinition type.
 * Use this when passing typed definitions to components that expect NodeDefinition[].
 */
export function asNodeDefinition<TData extends Record<string, unknown> = Record<string, unknown>>(
  def: NodeDefinition<TData>,
): NodeDefinition {
  return def as NodeDefinition<Record<string, unknown>>;
}

/**
 * debug-notes:
 * - Re-read while enabling customizable context menu behavior to ensure ConnectionRenderContext stays compatible with new handlers.
 */
