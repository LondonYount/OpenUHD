import type { Parameter } from "./parameter.js";

export interface TraitDef {
  type: string;
  params?: Record<string, unknown>;
}

export interface CanBridgeTrait extends TraitDef {
  type: "can_bridge";
  params: {
    from: string[];
    to: string[];
  };
}

export interface ProvidesPowerTrait extends TraitDef {
  type: "provides_power";
  params: {
    interfaceId: string;
    voltage: Parameter;
    maxCurrent: Parameter;
  };
}

export interface IsPickableTrait extends TraitDef {
  type: "is_pickable";
  params: {
    category: string;
    matchParams: string[];
  };
}
