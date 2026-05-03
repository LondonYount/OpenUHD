export type Unit =
  // Electrical
  | "V" | "A" | "Ω" | "F" | "H" | "W" | "Hz"
  // Mechanical
  | "m" | "mm" | "kg" | "N" | "Nm" | "rad/s" | "rpm"
  // Thermal
  | "°C" | "K" | "W/mK"
  // Fluid/Pneumatic
  | "Pa" | "bar" | "L/min" | "m³/s"
  // General
  | "s" | "ms" | "dimensionless"
  // Escape hatch
  | (string & {});

export interface Parameter {
  id: string;
  name?: string;
  value?: number;
  unit: Unit;
  range?: [number, number];
  tolerance?: number | { type: "absolute" | "percent"; value: number };
}

// --- Constraint Expressions ---

export type ParameterRef = string; // dot-path: "child.interface.param_id"

export type ConstraintExpr =
  | ParameterEquality
  | ParameterComparison
  | ParameterArithmetic
  | ParameterRange
  | CustomConstraint;

export interface ParameterEquality {
  type: "equals";
  left: ParameterRef;
  right: ParameterRef;
}

export interface ParameterComparison {
  type: "lt" | "lte" | "gt" | "gte";
  left: ParameterRef;
  right: ParameterRef;
}

export interface ParameterArithmetic {
  type: "arithmetic_equals";
  left: ParameterRef;
  right: {
    op: "add" | "subtract" | "multiply" | "divide";
    operands: ParameterRef[];
  };
}

export interface ParameterRange {
  type: "within";
  param: ParameterRef;
  min: number;
  max: number;
  unit: Unit;
}

export interface CustomConstraint {
  type: "custom";
  validate: (params: ResolvedParams) => ConstraintDiagnostic[];
}

export type ResolvedParams = Record<string, number | undefined>;

export interface ConstraintDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  parameterRefs?: ParameterRef[];
}
