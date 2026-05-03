import type { InterfaceDef, SlotDef } from "../types/interface.js";

/**
 * Check if a leaf interface can fill a slot based on capability matching.
 * Used for intra-module slot binding validation.
 */
export function validateBinding(
  iface: InterfaceDef,
  slot: SlotDef,
): { valid: boolean; reason?: string } {
  const requiredCapability = slot.match.capability;

  if (!requiredCapability) {
    // Slot doesn't require a specific capability — any interface works
    return { valid: true };
  }

  const ifaceCapabilities = iface.capabilities ?? [];

  if (ifaceCapabilities.includes(requiredCapability)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Interface "${iface.id}" lacks capability "${requiredCapability}". Has: [${ifaceCapabilities.join(", ")}]`,
  };
}
