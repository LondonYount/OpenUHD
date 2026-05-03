import type { InterfaceDef } from "./interface.js";
import type { HarnessDef } from "./harness.js";
import type { ArtifactDef } from "./artifact.js";
import type { DomainMetadata } from "./domain.js";
import type { ConstraintExpr } from "./parameter.js";
import type { TraitDef } from "./trait.js";

export interface ChildModuleRef {
  id: string;
  moduleDefId: string;
  exposedInterfaces?: string[];
  overrides?: Record<string, unknown>;
}

export interface InterfaceGroup {
  id: string;
  label?: string;
  members: string[]; // interface IDs
  policy: "one_of" | "any_of" | "all_of";
}

export interface RequirementDef {
  type: "capability" | "interface" | "power";
  description: string;
  capability?: string;
  interface_protocol?: string;
  voltage_V?: number | [number, number];
  current_mA?: number;
}

export interface NodeGeometry {
  xScale?: number;
  yScale?: number;
  outline?: {
    preset?: "rectangle" | "rounded_rectangle" | "circle" | "rounded_triangle";
  };
}

export interface ModuleDef {
  id: string;
  name: string;
  description?: string;
  version?: string;

  manufacturer?: string;
  part_number?: string;
  tags?: string[];
  categories?: string[];

  interfaces: InterfaceDef[];

  children?: ChildModuleRef[];
  harnesses?: HarnessDef[];

  artifacts?: ArtifactDef[];

  interfaceGroups?: InterfaceGroup[];

  requirements?: RequirementDef[];

  domains?: DomainMetadata[];

  constraints?: ConstraintExpr[];

  traits?: TraitDef[];

  geometry?: NodeGeometry;
}
