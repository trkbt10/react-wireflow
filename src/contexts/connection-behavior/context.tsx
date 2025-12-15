/**
 * @file Connection behavior context
 * Provides configurable connection path calculation (including control point rounding).
 */
import * as React from "react";
import {
  calculateConnectionControlPointsByPortSide,
  createBezierConnectionPathModel,
  createCubicBezierPathModel,
  createStraightPathModel,
} from "../../core/connection/path";
import type {
  ConnectionBehavior,
  ConnectionPathCalculationContext,
  ConnectionPathModel,
} from "../../types/connectionBehavior";
import { defaultConnectionBehavior, resolveConnectionValue } from "../../types/connectionBehavior";
import { useNodeEditor } from "../composed/node-editor/context";

export type ConnectionBehaviorContextValue = {
  behavior: ConnectionBehavior;
  createPathModel: (ctx: ConnectionPathCalculationContext) => ConnectionPathModel;
  calculatePath: (ctx: ConnectionPathCalculationContext) => string;
};

const ConnectionBehaviorContext = React.createContext<ConnectionBehaviorContextValue | null>(null);
ConnectionBehaviorContext.displayName = "ConnectionBehaviorContext";

export type ConnectionBehaviorProviderProps = {
  behavior?: Partial<ConnectionBehavior>;
  children: React.ReactNode;
};

export const ConnectionBehaviorProvider: React.FC<ConnectionBehaviorProviderProps> = ({ behavior, children }) => {
  const { settings } = useNodeEditor();

  const baseBehavior = React.useMemo<ConnectionBehavior>(() => {
    return {
      ...defaultConnectionBehavior,
      controlPointRounding: { type: "fixed", value: settings.connectionControlPointRounding },
      handleOffset: {
        type: "fixed",
        value: { min: settings.connectionHandleOffsetMin, max: settings.connectionHandleOffsetMax },
      },
    };
  }, [settings.connectionControlPointRounding, settings.connectionHandleOffsetMin, settings.connectionHandleOffsetMax]);

  const mergedBehavior = React.useMemo<ConnectionBehavior>(() => {
    return {
      path: behavior?.path ?? baseBehavior.path,
      controlPointRounding: behavior?.controlPointRounding ?? baseBehavior.controlPointRounding,
      handleOffset: behavior?.handleOffset ?? baseBehavior.handleOffset,
    };
  }, [
    behavior?.path,
    behavior?.controlPointRounding,
    behavior?.handleOffset,
    baseBehavior.path,
    baseBehavior.controlPointRounding,
    baseBehavior.handleOffset,
  ]);

  const createPathModel = React.useCallback(
    (ctx: ConnectionPathCalculationContext): ConnectionPathModel => {
      const algorithm = resolveConnectionValue(mergedBehavior.path, ctx);

      if (algorithm.type === "straight") {
        return createStraightPathModel(ctx.outputPosition, ctx.inputPosition);
      }

      if (algorithm.type === "custom") {
        return algorithm.createPath(ctx);
      }

      const rounding = resolveConnectionValue(mergedBehavior.controlPointRounding, ctx);
      const handleOffset = resolveConnectionValue(mergedBehavior.handleOffset, ctx);
      const options = { offsetMin: handleOffset.min, offsetMax: handleOffset.max };

      if (rounding === "port-side" && ctx.outputPort && ctx.inputPort) {
        const { cp1, cp2 } = calculateConnectionControlPointsByPortSide(
          ctx.outputPosition,
          ctx.inputPosition,
          ctx.outputPort.position,
          ctx.inputPort.position,
          options,
        );
        return createCubicBezierPathModel(ctx.outputPosition, cp1, cp2, ctx.inputPosition);
      }

      return createBezierConnectionPathModel(ctx.outputPosition, ctx.inputPosition, {
        controlPointRounding: rounding,
        ...options,
      });
    },
    [mergedBehavior],
  );

  const calculatePath = React.useCallback(
    (ctx: ConnectionPathCalculationContext): string => {
      return createPathModel(ctx).toPathData();
    },
    [createPathModel],
  );

  const value = React.useMemo<ConnectionBehaviorContextValue>(
    () => ({ behavior: mergedBehavior, createPathModel, calculatePath }),
    [mergedBehavior, createPathModel, calculatePath],
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

export const useConnectionPathModelCalculator = (): ConnectionBehaviorContextValue["createPathModel"] => {
  return useConnectionBehavior().createPathModel;
};
