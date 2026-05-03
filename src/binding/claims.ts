import type { InterfaceInstanceState } from "../types/instance.js";

/**
 * Get all leaf interface IDs claimed by active interface bindings.
 * Walks all active instances across all interface states and collects bound interface IDs.
 */
export function getClaimedInterfaces(
  interfaceStates: Record<string, InterfaceInstanceState>,
): Set<string> {
  const claimed = new Set<string>();

  for (const state of Object.values(interfaceStates)) {
    for (const instance of Object.values(state.instances)) {
      if (!instance.active) continue;

      for (const boundTo of Object.values(instance.bindings)) {
        const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
        for (const id of ids) {
          claimed.add(id);
        }
      }
    }
  }

  return claimed;
}

/**
 * Check if a leaf interface is available (not claimed by any active binding).
 */
export function isInterfaceAvailable(
  interfaceId: string,
  interfaceStates: Record<string, InterfaceInstanceState>,
): boolean {
  const claimed = getClaimedInterfaces(interfaceStates);
  return !claimed.has(interfaceId);
}

/**
 * Check if adding a new binding would conflict with existing claims.
 * Returns the list of interface IDs that are already claimed.
 */
export function findClaimConflicts(
  newBindings: Record<string, string | string[]>,
  existingStates: Record<string, InterfaceInstanceState>,
  excludeInstanceKey?: { interfaceDefId: string; instanceId: string },
): string[] {
  const claimed = new Set<string>();

  for (const [ifaceId, state] of Object.entries(existingStates)) {
    for (const [instId, instance] of Object.entries(state.instances)) {
      if (!instance.active) continue;

      // Skip the instance we're updating (so it doesn't conflict with itself)
      if (
        excludeInstanceKey &&
        ifaceId === excludeInstanceKey.interfaceDefId &&
        instId === excludeInstanceKey.instanceId
      ) {
        continue;
      }

      for (const boundTo of Object.values(instance.bindings)) {
        const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
        for (const id of ids) {
          claimed.add(id);
        }
      }
    }
  }

  const conflicts: string[] = [];
  for (const boundTo of Object.values(newBindings)) {
    const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
    for (const id of ids) {
      if (claimed.has(id)) conflicts.push(id);
    }
  }

  return conflicts;
}
