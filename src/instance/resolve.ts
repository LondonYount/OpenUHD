import type { ModuleDef } from "../types/module.js";
import type { InterfaceDef } from "../types/interface.js";
import type { ModuleInstance, InterfaceInstanceState } from "../types/instance.js";

export interface ResolvedInterfaceState {
  interfaceDef: InterfaceDef;
  active: boolean;
  /** Active profile/custom instances with their bindings */
  activeInstances: {
    instanceId: string;
    profileId?: string;
    bindings: Record<string, string | string[]>;
    implementedRole?: string;
  }[];
}

/**
 * Resolve the final state of an interface by merging definition defaults with instance overrides.
 */
export function resolveInterfaceState(
  iface: InterfaceDef,
  instanceState?: InterfaceInstanceState,
): ResolvedInterfaceState {
  const hasSlots = (iface.slots?.length ?? 0) > 0;
  const profiles = iface.profiles ?? [];

  // Leaf interface — active per definition default, no bindings
  if (!hasSlots || profiles.length === 0) {
    const active = iface.default_active ?? true;
    return {
      interfaceDef: iface,
      active,
      activeInstances: [],
    };
  }

  // Composed interface — check instance state for overrides
  if (!instanceState) {
    // No instance state — use definition defaults
    const activeInstances = profiles
      .filter((p) => p.default_active ?? iface.default_active ?? false)
      .map((p) => ({
        instanceId: p.id,
        profileId: p.id,
        bindings: p.bindings,
      }));

    return {
      interfaceDef: iface,
      active: activeInstances.length > 0,
      activeInstances,
    };
  }

  // Instance state exists — use it
  const activeInstances = Object.entries(instanceState.instances)
    .filter(([, inst]) => inst.active)
    .map(([id, inst]) => ({
      instanceId: id,
      profileId: inst.profileId,
      bindings: inst.bindings,
      implementedRole: inst.implementedRole,
    }));

  return {
    interfaceDef: iface,
    active: activeInstances.length > 0,
    activeInstances,
  };
}

/**
 * Resolve all interface states for a module instance.
 */
export function resolveAllInterfaces(
  def: ModuleDef,
  instance: ModuleInstance,
): ResolvedInterfaceState[] {
  return def.interfaces.map((iface) =>
    resolveInterfaceState(iface, instance.interfaceStates[iface.id]),
  );
}
