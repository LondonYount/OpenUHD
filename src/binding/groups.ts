import type { InterfaceGroup } from "../types/module.js";
import type { ResolvedInterfaceState } from "../instance/resolve.js";

export interface GroupValidationResult {
  valid: boolean;
  groupId: string;
  policy: string;
  errors: string[];
}

/**
 * Validate interface group policies against resolved interface states.
 */
export function validateInterfaceGroups(
  groups: InterfaceGroup[],
  resolvedStates: ResolvedInterfaceState[],
): GroupValidationResult[] {
  const results: GroupValidationResult[] = [];

  for (const group of groups) {
    const memberStates = group.members
      .map((id) => resolvedStates.find((s) => s.interfaceDef.id === id))
      .filter((s): s is ResolvedInterfaceState => s !== undefined);

    const activeMembers = memberStates.filter((s) => s.active);
    const errors: string[] = [];

    switch (group.policy) {
      case "one_of":
        if (activeMembers.length > 1) {
          errors.push(
            `Group "${group.label ?? group.id}" (one_of): ${activeMembers.length} members active, expected exactly 1. Active: ${activeMembers.map((s) => s.interfaceDef.id).join(", ")}`,
          );
        }
        if (activeMembers.length === 0) {
          errors.push(
            `Group "${group.label ?? group.id}" (one_of): no members active, expected exactly 1`,
          );
        }
        break;

      case "any_of":
        if (activeMembers.length === 0) {
          errors.push(
            `Group "${group.label ?? group.id}" (any_of): no members active, expected at least 1`,
          );
        }
        break;

      case "all_of":
        if (activeMembers.length !== memberStates.length) {
          const inactive = memberStates
            .filter((s) => !s.active)
            .map((s) => s.interfaceDef.id);
          errors.push(
            `Group "${group.label ?? group.id}" (all_of): members not all active. Inactive: ${inactive.join(", ")}`,
          );
        }
        break;
    }

    results.push({
      valid: errors.length === 0,
      groupId: group.id,
      policy: group.policy,
      errors,
    });
  }

  return results;
}
