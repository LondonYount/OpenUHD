import type { InterfaceDef, ProtocolDef } from "../types/interface.js";
import { areRolesCompatible } from "./roles.js";

export interface ProtocolMatchResult {
  compatible: boolean;
  confidence: number; // 1.0 = explicit match, 0.0 = no match
  matchedProtocol?: string;
  roleA?: string;
  roleB?: string;
}

/**
 * Try to match two protocol definitions.
 * Returns the best match if any role pair is compatible.
 */
function matchProtocolDefs(a: ProtocolDef, b: ProtocolDef): ProtocolMatchResult {
  if (a.type.toLowerCase() !== b.type.toLowerCase()) {
    return { compatible: false, confidence: 0 };
  }

  // Try all role combinations
  for (const roleA of a.roles) {
    for (const roleB of b.roles) {
      if (areRolesCompatible(a.type, roleA, roleB)) {
        return {
          compatible: true,
          confidence: 1.0,
          matchedProtocol: a.type,
          roleA,
          roleB,
        };
      }
    }
  }

  return { compatible: false, confidence: 0 };
}

/**
 * Match two interfaces by finding the best protocol match.
 * Tries all protocol combinations between the two interfaces.
 */
export function matchProtocols(
  interfaceA: InterfaceDef,
  interfaceB: InterfaceDef,
): ProtocolMatchResult {
  let best: ProtocolMatchResult = { compatible: false, confidence: 0 };

  for (const protoA of interfaceA.protocols) {
    for (const protoB of interfaceB.protocols) {
      const result = matchProtocolDefs(protoA, protoB);
      if (result.compatible && result.confidence > best.confidence) {
        best = result;
      }
    }
  }

  return best;
}
