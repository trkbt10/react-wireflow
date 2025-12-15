/**
 * @file Connection behavior context
 * Provides configurable connection path calculation (including control point rounding).
 */
import * as React from "react";
import { calculateConnectionPath, calculateConnectionPathByPortSide, type ConnectionPathOptions } from "../../core/connection/path";
import type {
  ConnectionBehavior,
  ConnectionPathAlgorithm,
  ConnectionPathCalculationContext,
} from "../../types/connectionBehavior";
import { defaultConnectionBehavior, resolveConnectionValue } from "../../types/connectionBehavior";
import { useNodeEditor } from "../composed/node-editor/context";

export type ConnectionBehaviorContextValue = {
  behavior: ConnectionBehavior;
  calculatePath: (ctx: ConnectionPathCalculationContext) => string;
};

const ConnectionBehaviorContext = React.createContext<ConnectionBehaviorContextValue | null>(null);
ConnectionBehaviorContext.displayName = "ConnectionBehaviorContext";

export type ConnectionBehaviorProviderProps = {
  behavior?: Partial<ConnectionBehavior>;
  children: React.ReactNode;
};

const calculateStraightPath = (ctx: ConnectionPathCalculationContext): string => {
  const from = ctx.outputPosition;
  const to = ctx.inputPosition;
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
};

const calculateBezierPath = (ctx: ConnectionPathCalculationContext, options?: ConnectionPathOptions): string => {
  return calculateConnectionPath(ctx.outputPosition, ctx.inputPosition, options);
};

const resolveAlgorithm = (algorithm: ConnectionPathAlgorithm, ctx: ConnectionPathCalculationContext): string => {
  switch (algorithm.type) {
    case "custom": {
      return algorithm.calculatePath(ctx);
    }
    case "straight": {
      return calculateStraightPath(ctx);
    }
    case "bezier": {
      return calculateBezierPath(ctx);
    }
  }
};

export const ConnectionBehaviorProvider: React.FC<ConnectionBehaviorProviderProps> = ({ behavior, children }) => {
  const { settings } = useNodeEditor();

  const baseBehavior = React.useMemo<ConnectionBehavior>(() => {
    return {
      ...defaultConnectionBehavior,
      controlPointRounding: { type: "fixed", value: settings.connectionControlPointRounding },
    };
  }, [settings.connectionControlPointRounding]);

  const mergedBehavior = React.useMemo<ConnectionBehavior>(() => {
    return {
      path: behavior?.path ?? baseBehavior.path,
      controlPointRounding: behavior?.controlPointRounding ?? baseBehavior.controlPointRounding,
    };
  }, [behavior?.path, behavior?.controlPointRounding, baseBehavior.path, baseBehavior.controlPointRounding]);

  const calculatePath = React.useCallback(
    (ctx: ConnectionPathCalculationContext): string => {
      const algorithm = resolveConnectionValue(mergedBehavior.path, ctx);
      if (algorithm.type !== "bezier") {
        return resolveAlgorithm(algorithm, ctx);
      }

      const rounding = resolveConnectionValue(mergedBehavior.controlPointRounding, ctx);
      if (rounding === "port-side" && ctx.outputPort && ctx.inputPort) {
        return calculateConnectionPathByPortSide(
          ctx.outputPosition,
          ctx.inputPosition,
          ctx.outputPort.position,
          ctx.inputPort.position,
        );
      }
      return calculateBezierPath(ctx, { controlPointRounding: rounding });
    },
    [mergedBehavior],
  );

  const value = React.useMemo<ConnectionBehaviorContextValue>(
    () => ({ behavior: mergedBehavior, calculatePath }),
    [mergedBehavior, calculatePath],
  );

  return <ConnectionBehaviorContext.Provider value={value}>{children}</ConnectionBehaviorContext.Provider>;
};

export const useConnectionBehavior = (): ConnectionBehaviorContextValue => {
  const ctx = React.useContext(ConnectionBehaviorContext);
  if (!ctx) {
    throw new Error("useConnectionBehavior must be used within a ConnectionBehaviorProvider");
  }
  return ctx;
};

export const useConnectionPathCalculator = (): ConnectionBehaviorContextValue["calculatePath"] => {
  return useConnectionBehavior().calculatePath;
};
