import type { ModuleDef } from "../types/module.js";
import type { InterfaceDef, InterfaceProfile } from "../types/interface.js";
import { validateBinding } from "./capability-check.js";

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Find an interface definition on a module by ID.
 */
function findInterface(mod: ModuleDef, id: string): InterfaceDef | undefined {
  return mod.interfaces.find((i) => i.id === id);
}

/**
 * Validate that a profile's bindings are all valid against slot capability requirements.
 */
export function validateProfile(
  moduleDef: ModuleDef,
  interfaceDefId: string,
  profile: InterfaceProfile,
): ProfileValidationResult {
  const iface = findInterface(moduleDef, interfaceDefId);
  if (!iface) {
    return { valid: false, errors: [`Interface "${interfaceDefId}" not found`] };
  }

  const slots = iface.slots ?? [];
  const errors: string[] = [];

  for (const slot of slots) {
    const boundTo = profile.bindings[slot.id];
    if (!boundTo && slot.required) {
      errors.push(`Required slot "${slot.id}" has no binding in profile "${profile.id}"`);
      continue;
    }
    if (!boundTo) continue;

    // Handle single or array bindings
    const boundIds = Array.isArray(boundTo) ? boundTo : [boundTo];

    for (const boundId of boundIds) {
      const boundIface = findInterface(moduleDef, boundId);
      if (!boundIface) {
        errors.push(`Binding for slot "${slot.id}": interface "${boundId}" not found on module`);
        continue;
      }

      const result = validateBinding(boundIface, slot);
      if (!result.valid) {
        errors.push(`Binding for slot "${slot.id}": ${result.reason}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Apply a predefined profile and return its bindings after validation.
 */
export function applyProfile(
  moduleDef: ModuleDef,
  interfaceDefId: string,
  profileId: string,
): { bindings: Record<string, string | string[]>; validation: ProfileValidationResult } | null {
  const iface = findInterface(moduleDef, interfaceDefId);
  if (!iface) return null;

  const profile = iface.profiles?.find((p) => p.id === profileId);
  if (!profile) return null;

  const validation = validateProfile(moduleDef, interfaceDefId, profile);

  return { bindings: profile.bindings, validation };
}
