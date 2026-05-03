import type { ModuleDef } from "../types/module.js";
import type { ModuleInstance, InterfaceInstanceState, InterfaceInstanceBinding } from "../types/instance.js";
import type { ModuleInstanceId } from "../types/ids.js";

export interface InstantiateOptions {
  id?: string;
  nickname?: string;
  position?: { x: number; y: number };
}

/**
 * Create a ModuleInstance from a ModuleDef, applying default activation rules:
 *
 * - Leaf interfaces with default_active: true → active, no bindings needed
 * - Composed interfaces: each profile's activation is profile.default_active ?? interface.default_active
 * - Active profiles with predefined bindings → auto-bound
 */
export function instantiateModule(
  def: ModuleDef,
  options: InstantiateOptions = {},
): ModuleInstance {
  const id = (options.id ?? crypto.randomUUID()) as ModuleInstanceId;
  const position = options.position ?? { x: 0, y: 0 };
  const interfaceStates: Record<string, InterfaceInstanceState> = {};

  for (const iface of def.interfaces) {
    const hasSlots = (iface.slots?.length ?? 0) > 0;
    const profiles = iface.profiles ?? [];

    if (!hasSlots || profiles.length === 0) {
      // Leaf interface or composed without profiles — no instance state needed
      // Activation is read directly from the definition's default_active
      continue;
    }

    // Composed interface with profiles — instantiate active profiles
    const instances: Record<string, InterfaceInstanceBinding> = {};
    let hasActiveInstances = false;

    for (const profile of profiles) {
      const isActive = profile.default_active ?? iface.default_active ?? false;

      if (isActive) {
        instances[profile.id] = {
          profileId: profile.id,
          bindings: { ...profile.bindings },
          active: true,
        };
        hasActiveInstances = true;
      }
    }

    if (hasActiveInstances) {
      interfaceStates[iface.id] = {
        interfaceDefId: iface.id,
        instances,
      };
    }
  }

  return {
    id,
    defId: def.id,
    defVersion: def.version,
    nickname: options.nickname,
    position,
    interfaceStates,
    childInstances: {},
    harnessStates: {},
    lastModified: Date.now(),
    stateVersion: 1,
  };
}
