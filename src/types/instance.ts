import type { ModuleInstanceId } from "./ids.js";
import type { ArtifactDef } from "./artifact.js";

export interface InterfaceInstanceBinding {
  /** If based on a predefined profile, reference it. Absent = custom binding. */
  profileId?: string;
  /** The actual slot bindings */
  bindings: Record<string, string | string[]>;
  /** Which protocol role this instance is using */
  implementedRole?: string;
  active: boolean;
  customOverrides?: Record<string, unknown>;
}

export interface InterfaceInstanceState {
  interfaceDefId: string;
  /** Each active instance keyed by instance ID (profile ID or generated ID) */
  instances: Record<string, InterfaceInstanceBinding>;
}

export interface HarnessInstanceState {
  harnessDefId: string;
  endpointBindings: Record<
    string,
    {
      childModuleId: string;
      interfaceId: string;
      profileInstanceId?: string;
    }
  >;
  selectedEndpointId?: string;
}

export interface ModuleInstance {
  id: ModuleInstanceId;
  defId: string;
  defVersion?: string;

  nickname?: string;
  position: { x: number; y: number };

  interfaceStates: Record<string, InterfaceInstanceState>;

  childInstances: Record<string, ModuleInstance>;

  harnessStates: Record<string, HarnessInstanceState>;

  artifactOverrides?: ArtifactDef[];

  customOverrides?: Record<string, unknown>;

  lastModified: number;
  stateVersion: number;
}
