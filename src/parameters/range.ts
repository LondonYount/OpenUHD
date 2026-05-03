import type { Parameter } from "../types/parameter.js";

/**
 * Get the effective range of a parameter, considering value, range, and tolerance.
 * Returns [min, max] or null if no range can be determined.
 */
export function getEffectiveRange(param: Parameter): [number, number] | null {
  if (param.range) {
    return param.range;
  }

  if (param.value !== undefined) {
    if (param.tolerance === undefined) {
      // Exact value, no tolerance — treat as point range
      return [param.value, param.value];
    }

    if (typeof param.tolerance === "number") {
      // Absolute tolerance
      return [param.value - param.tolerance, param.value + param.tolerance];
    }

    if (param.tolerance.type === "absolute") {
      return [
        param.value - param.tolerance.value,
        param.value + param.tolerance.value,
      ];
    }

    if (param.tolerance.type === "percent") {
      const delta = param.value * (param.tolerance.value / 100);
      return [param.value - delta, param.value + delta];
    }
  }

  return null;
}

/**
 * Check if two numeric ranges overlap.
 */
export function rangesOverlap(
  a: [number, number],
  b: [number, number],
): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

export interface ParameterCompatibilityResult {
  compatible: boolean;
  reason?: string;
  rangeA?: [number, number];
  rangeB?: [number, number];
}

/**
 * Check if two parameters are compatible (their ranges overlap).
 * Parameters must have the same unit for comparison to be meaningful.
 */
export function parameterCompatible(
  paramA: Parameter,
  paramB: Parameter,
): ParameterCompatibilityResult {
  if (paramA.unit !== paramB.unit) {
    return {
      compatible: false,
      reason: `Unit mismatch: "${paramA.unit}" vs "${paramB.unit}"`,
    };
  }

  const rangeA = getEffectiveRange(paramA);
  const rangeB = getEffectiveRange(paramB);

  if (!rangeA || !rangeB) {
    // Can't determine range for one or both — assume compatible
    return { compatible: true };
  }

  const overlap = rangesOverlap(rangeA, rangeB);

  return {
    compatible: overlap,
    rangeA,
    rangeB,
    reason: overlap
      ? undefined
      : `Range [${rangeA[0]}, ${rangeA[1]}] does not overlap [${rangeB[0]}, ${rangeB[1]}] ${paramA.unit}`,
  };
}

/**
 * Check parameter compatibility between two interfaces by matching parameter IDs.
 */
export function checkParameterCompatibility(
  paramsA: Parameter[],
  paramsB: Parameter[],
): ParameterCompatibilityResult[] {
  const results: ParameterCompatibilityResult[] = [];

  for (const pA of paramsA) {
    const pB = paramsB.find((p) => p.id === pA.id);
    if (!pB) continue; // No matching parameter — skip

    results.push(parameterCompatible(pA, pB));
  }

  return results;
}
