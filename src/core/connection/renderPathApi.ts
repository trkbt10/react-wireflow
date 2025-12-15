/**
 * @file Helpers for exposing connection path calculation to custom renderers.
 */
import type { ConnectionPathCalculationContext } from "../../types/connectionBehavior";
import type { ConnectionPathCalculators, ConnectionRenderPathApi } from "../../types/NodeDefinition";

export type CreateConnectionRenderPathApiParams = {
  calculators: ConnectionPathCalculators;
  defaultContext: ConnectionPathCalculationContext;
};

export const createConnectionRenderPathApi = (
  params: CreateConnectionRenderPathApiParams,
): ConnectionRenderPathApi => {
  const { calculators, defaultContext } = params;

  return {
    calculatePath: calculators.calculatePath,
    createPathModel: calculators.createPathModel,
    calculateDefaultPath: (overrides) => calculators.calculatePath({ ...defaultContext, ...(overrides ?? {}) }),
    createDefaultPathModel: (overrides) => calculators.createPathModel({ ...defaultContext, ...(overrides ?? {}) }),
  };
};

