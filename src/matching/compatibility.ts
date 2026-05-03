import type { ModuleDef } from "../types/module.js";
import type { InterfaceDef } from "../types/interface.js";
import { matchProtocols, type ProtocolMatchResult } from "./protocol-match.js";

export interface CompatiblePair {
  interfaceA: InterfaceDef;
  interfaceB: InterfaceDef;
  match: ProtocolMatchResult;
}

/**
 * Find all compatible interface pairs between two modules via explicit protocol matching.
 * Only considers exposed interfaces.
 */
export function findCompatiblePairs(
  moduleA: ModuleDef,
  moduleB: ModuleDef,
): CompatiblePair[] {
  const pairs: CompatiblePair[] = [];

  const exposedA = moduleA.interfaces.filter((i) => i.exposed);
  const exposedB = moduleB.interfaces.filter((i) => i.exposed);

  for (const ifaceA of exposedA) {
    for (const ifaceB of exposedB) {
      const match = matchProtocols(ifaceA, ifaceB);
      if (match.compatible) {
        pairs.push({ interfaceA: ifaceA, interfaceB: ifaceB, match });
      }
    }
  }

  return pairs;
}
