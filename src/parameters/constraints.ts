import type {
  ConstraintExpr,
  ConstraintDiagnostic,
  ResolvedParams,
} from "../types/parameter.js";

/**
 * Evaluate a single constraint expression against resolved parameter values.
 */
function evaluateOne(
  expr: ConstraintExpr,
  params: ResolvedParams,
): ConstraintDiagnostic[] {
  switch (expr.type) {
    case "equals": {
      const left = params[expr.left];
      const right = params[expr.right];
      if (left === undefined || right === undefined) return [];
      if (left !== right) {
        return [{
          severity: "error",
          message: `${expr.left} (${left}) != ${expr.right} (${right})`,
          parameterRefs: [expr.left, expr.right],
        }];
      }
      return [];
    }

    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const left = params[expr.left];
      const right = params[expr.right];
      if (left === undefined || right === undefined) return [];

      let pass = false;
      switch (expr.type) {
        case "lt": pass = left < right; break;
        case "lte": pass = left <= right; break;
        case "gt": pass = left > right; break;
        case "gte": pass = left >= right; break;
      }

      if (!pass) {
        return [{
          severity: "error",
          message: `${expr.left} (${left}) is not ${expr.type} ${expr.right} (${right})`,
          parameterRefs: [expr.left, expr.right],
        }];
      }
      return [];
    }

    case "within": {
      const val = params[expr.param];
      if (val === undefined) return [];
      if (val < expr.min || val > expr.max) {
        return [{
          severity: "error",
          message: `${expr.param} (${val}) not within [${expr.min}, ${expr.max}] ${expr.unit}`,
          parameterRefs: [expr.param],
        }];
      }
      return [];
    }

    case "arithmetic_equals": {
      const left = params[expr.left];
      if (left === undefined) return [];

      const operandValues = expr.right.operands.map((ref) => params[ref]);
      if (operandValues.some((v) => v === undefined)) return [];

      let computed: number;
      const vals = operandValues as number[];
      switch (expr.right.op) {
        case "add": computed = vals.reduce((a, b) => a + b, 0); break;
        case "subtract": computed = vals[0] - vals.slice(1).reduce((a, b) => a + b, 0); break;
        case "multiply": computed = vals.reduce((a, b) => a * b, 1); break;
        case "divide": computed = vals[0] / vals.slice(1).reduce((a, b) => a * b, 1); break;
      }

      if (Math.abs(left - computed) > 1e-9) {
        return [{
          severity: "error",
          message: `${expr.left} (${left}) != ${expr.right.op}(${expr.right.operands.join(", ")}) = ${computed}`,
          parameterRefs: [expr.left, ...expr.right.operands],
        }];
      }
      return [];
    }

    case "custom": {
      return expr.validate(params);
    }
  }
}

/**
 * Evaluate all constraint expressions against resolved parameter values.
 */
export function evaluateConstraints(
  constraints: ConstraintExpr[],
  params: ResolvedParams,
): ConstraintDiagnostic[] {
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const expr of constraints) {
    diagnostics.push(...evaluateOne(expr, params));
  }

  return diagnostics;
}
