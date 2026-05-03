import type { InterfaceDef } from "../types/interface.js";
import type { CompositionalMatchResult } from "./composition.js";

export interface InferredInterface {
  protocol: { type: string; role: string };
  composedFrom: { slotId: string; interfaceId: string }[];
  sourceInterfaceId: string;
  confidence: number;
}

/**
 * Derive an inferred interface on the provider module when a compositional match is established.
 *
 * When an Arduino compositionally satisfies an L298N motor_control interface,
 * the Arduino gains an inferred motor_control interface showing it is acting
 * as a motor controller source.
 */
export function deriveInferredInterface(
  match: CompositionalMatchResult,
): InferredInterface | null {
  if (!match.compatible) return null;

  const compositeProto = match.compositeInterface.protocols[0];
  if (!compositeProto) return null;

  // The inferred role is the complement of the composite's role.
  // If the composite is motor_control.target, the provider is implicitly motor_control.controller/source.
  const inferredRole = compositeProto.roles[0] === "target" ? "source" : "target";

  return {
    protocol: {
      type: compositeProto.type,
      role: inferredRole,
    },
    composedFrom: match.slotFillers.map((f) => ({
      slotId: f.slotId,
      interfaceId: f.filledBy.id,
    })),
    sourceInterfaceId: match.compositeInterface.id,
    confidence: match.confidence,
  };
}
