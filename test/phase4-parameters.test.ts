import { describe, it, expect } from "vitest";
import {
  getEffectiveRange,
  rangesOverlap,
  parameterCompatible,
  checkParameterCompatibility,
} from "../src/parameters/range.js";
import { evaluateConstraints } from "../src/parameters/constraints.js";
import { ArduinoNano } from "./fixtures/arduino-nano.js";
import { VL53L0X } from "./fixtures/vl53l0x.js";
import type { InterfaceDef } from "../src/types/interface.js";

function findInterface(mod: { interfaces: InterfaceDef[] }, id: string): InterfaceDef {
  const iface = mod.interfaces.find((i) => i.id === id);
  if (!iface) throw new Error(`Interface "${id}" not found`);
  return iface;
}

describe("Parameter Range Utilities", () => {
  it("extracts range from explicit range", () => {
    expect(getEffectiveRange({ id: "v", unit: "V", range: [3.0, 3.6] }))
      .toEqual([3.0, 3.6]);
  });

  it("extracts range from value + percent tolerance", () => {
    const range = getEffectiveRange({
      id: "v", unit: "V", value: 5,
      tolerance: { type: "percent", value: 5 },
    });
    expect(range![0]).toBeCloseTo(4.75);
    expect(range![1]).toBeCloseTo(5.25);
  });

  it("extracts range from value + absolute tolerance", () => {
    const range = getEffectiveRange({
      id: "v", unit: "V", value: 3.3,
      tolerance: { type: "absolute", value: 0.2 },
    });
    expect(range![0]).toBeCloseTo(3.1);
    expect(range![1]).toBeCloseTo(3.5);
  });

  it("point range from exact value", () => {
    expect(getEffectiveRange({ id: "v", unit: "V", value: 5 }))
      .toEqual([5, 5]);
  });

  it("ranges overlap", () => {
    expect(rangesOverlap([3.0, 5.0], [4.0, 6.0])).toBe(true);
    expect(rangesOverlap([3.0, 5.0], [5.0, 6.0])).toBe(true); // touching
    expect(rangesOverlap([3.0, 5.0], [5.1, 6.0])).toBe(false);
  });
});

describe("Scenario 3: Parameter Validation — Voltage Mismatch", () => {
  it("Arduino 5V output is INCOMPATIBLE with VL53L0X power input (2.6–3.5V)", () => {
    const pwr5v = findInterface(ArduinoNano, "power_5v_out");
    const sensorPwr = findInterface(VL53L0X, "power_in");

    const results = checkParameterCompatibility(
      pwr5v.parameters!,
      sensorPwr.parameters!,
    );

    const voltageResult = results.find((r) => r.rangeA && r.rangeB);
    expect(voltageResult).toBeDefined();
    expect(voltageResult!.compatible).toBe(false);
    expect(voltageResult!.reason).toContain("does not overlap");
  });

  it("Arduino 3.3V output IS compatible with VL53L0X power input", () => {
    const pwr3v3 = findInterface(ArduinoNano, "power_3v3_out");
    const sensorPwr = findInterface(VL53L0X, "power_in");

    const results = checkParameterCompatibility(
      pwr3v3.parameters!,
      sensorPwr.parameters!,
    );

    const voltageResult = results.find((r) => r.rangeA && r.rangeB);
    expect(voltageResult).toBeDefined();
    expect(voltageResult!.compatible).toBe(true);
  });
});

describe("Constraint Expression Evaluation", () => {
  it("validates equality constraint", () => {
    const diagnostics = evaluateConstraints(
      [{ type: "equals", left: "a", right: "b" }],
      { a: 5, b: 5 },
    );
    expect(diagnostics).toHaveLength(0);
  });

  it("detects equality violation", () => {
    const diagnostics = evaluateConstraints(
      [{ type: "equals", left: "a", right: "b" }],
      { a: 5, b: 3 },
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe("error");
  });

  it("validates within constraint", () => {
    const diagnostics = evaluateConstraints(
      [{ type: "within", param: "v", min: 3, max: 40, unit: "V" }],
      { v: 12 },
    );
    expect(diagnostics).toHaveLength(0);
  });

  it("detects within violation", () => {
    const diagnostics = evaluateConstraints(
      [{ type: "within", param: "v", min: 3, max: 40, unit: "V" }],
      { v: 50 },
    );
    expect(diagnostics).toHaveLength(1);
  });

  it("validates gt constraint", () => {
    const diagnostics = evaluateConstraints(
      [{ type: "gt", left: "vin", right: "vout" }],
      { vin: 12, vout: 5 },
    );
    expect(diagnostics).toHaveLength(0);
  });

  it("detects gt violation", () => {
    const diagnostics = evaluateConstraints(
      [{ type: "gt", left: "vin", right: "vout" }],
      { vin: 3, vout: 5 },
    );
    expect(diagnostics).toHaveLength(1);
  });

  it("validates arithmetic constraint", () => {
    const diagnostics = evaluateConstraints(
      [{
        type: "arithmetic_equals",
        left: "total",
        right: { op: "add", operands: ["a", "b"] },
      }],
      { total: 10, a: 4, b: 6 },
    );
    expect(diagnostics).toHaveLength(0);
  });

  it("supports custom constraint functions", () => {
    const diagnostics = evaluateConstraints(
      [{
        type: "custom",
        validate: (params) => {
          if ((params.current ?? 0) > 0.5) {
            return [{ severity: "warning", message: "Current exceeds 500mA" }];
          }
          return [];
        },
      }],
      { current: 0.8 },
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe("warning");
  });
});
