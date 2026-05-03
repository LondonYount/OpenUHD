import type { DomainKind } from "./domain.js";
import type { SlotMatch } from "./interface.js";

export interface HarnessEndpointDef {
  id: string;
  label: string;
  childModuleId?: string;
  interfaceId?: string;
  profileInstanceId?: string;
  match?: SlotMatch;
}

export interface HarnessDef {
  id: string;
  name?: string;
  topology: "wire" | "bus" | "split" | "or";
  domain: DomainKind;
  endpoints: HarnessEndpointDef[];
}
