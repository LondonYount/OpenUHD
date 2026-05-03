import type { ModuleDef } from "../types/module.js";
import type { InterfaceDef, SlotDef } from "../types/interface.js";
import { areRolesCompatible } from "./roles.js";

export interface SlotFiller {
  slotId: string;
  filledBy: InterfaceDef;
  matchedProtocol: string;
  roleA: string; // role on the slot's protocol
  roleB: string; // role on the filler's protocol
}

export interface CompositionalMatchResult {
  compatible: boolean;
  confidence: number;
  compositeInterface: InterfaceDef;
  slotFillers: SlotFiller[];
  unsatisfiedSlots: SlotDef[];
}

/**
 * Check if a single slot can be satisfied by a candidate interface via protocol matching.
 * The slot declares { protocol, role } for cross-module matching.
 */
function matchSlotToInterface(
  slot: SlotDef,
  candidate: InterfaceDef,
): { matched: boolean; protocol: string; roleSlot: string; roleCandidate: string } | null {
  const slotProtocol = slot.match.protocol;
  const slotRole = slot.match.role;

  if (!slotProtocol) return null;

  for (const proto of candidate.protocols) {
    if (proto.type.toLowerCase() !== slotProtocol.toLowerCase()) continue;

    for (const candidateRole of proto.roles) {
      // The slot's role is from the composite interface's perspective.
      // The candidate's role must be compatible (e.g., slot wants "input", candidate offers "output").
      if (slotRole) {
        if (areRolesCompatible(slotProtocol, slotRole, candidateRole)) {
          return {
            matched: true,
            protocol: slotProtocol,
            roleSlot: slotRole,
            roleCandidate: candidateRole,
          };
        }
      } else {
        // No specific role required — any role on this protocol works
        return {
          matched: true,
          protocol: slotProtocol,
          roleSlot: "*",
          roleCandidate: candidateRole,
        };
      }
    }
  }

  return null;
}

/**
 * Try to compositionally satisfy a composite interface using another module's exposed interfaces.
 *
 * Walks each required slot on the composite interface and finds a matching
 * exposed interface on the candidate module via protocol + role matching.
 *
 * This is a greedy algorithm — it assigns the first match found for each slot.
 * A more sophisticated solver could backtrack, but greedy is sufficient for validation.
 */
export function findCompositionalMatch(
  compositeInterface: InterfaceDef,
  candidateModule: ModuleDef,
): CompositionalMatchResult {
  const slots = compositeInterface.slots ?? [];
  const exposed = candidateModule.interfaces.filter((i) => i.exposed);

  const fillers: SlotFiller[] = [];
  const unsatisfied: SlotDef[] = [];
  const usedCandidates = new Set<string>();

  for (const slot of slots) {
    const count = slot.count ?? 1;
    let filled = 0;

    for (let i = 0; i < count; i++) {
      let matched = false;

      for (const candidate of exposed) {
        if (usedCandidates.has(candidate.id)) continue;

        const result = matchSlotToInterface(slot, candidate);
        if (result) {
          fillers.push({
            slotId: slot.id,
            filledBy: candidate,
            matchedProtocol: result.protocol,
            roleA: result.roleSlot,
            roleB: result.roleCandidate,
          });
          usedCandidates.add(candidate.id);
          filled++;
          matched = true;
          break;
        }
      }

      if (!matched && slot.required) {
        unsatisfied.push(slot);
      }
    }
  }

  const requiredSlots = slots.filter((s) => s.required);
  const totalRequired = requiredSlots.reduce((sum, s) => sum + (s.count ?? 1), 0);
  const compatible = unsatisfied.length === 0 && fillers.length >= totalRequired;

  return {
    compatible,
    confidence: compatible ? 0.8 : 0,
    compositeInterface,
    slotFillers: fillers,
    unsatisfiedSlots: unsatisfied,
  };
}
