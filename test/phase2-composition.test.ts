import { describe, it, expect } from "vitest";
import { findCompatiblePairs } from "../src/matching/compatibility.js";
import { findCompositionalMatch } from "../src/matching/composition.js";
import { deriveInferredInterface } from "../src/matching/inferred.js";
import { ArduinoNano } from "./fixtures/arduino-nano.js";
import { L298N } from "./fixtures/l298n.js";
import { VL53L0X } from "./fixtures/vl53l0x.js";

describe("Scenario 1: Explicit Protocol Match — Arduino ↔ VL53L0X I2C", () => {
  it("finds I2C master ↔ slave as a compatible pair", () => {
    const pairs = findCompatiblePairs(ArduinoNano, VL53L0X);

    const i2cPair = pairs.find(
      (p) =>
        p.interfaceA.id === "i2c" && p.interfaceB.id === "i2c",
    );

    expect(i2cPair).toBeDefined();
    expect(i2cPair!.match.compatible).toBe(true);
    expect(i2cPair!.match.confidence).toBe(1.0);
    expect(i2cPair!.match.matchedProtocol).toBe("i2c");
    expect(i2cPair!.match.roleA).toBe("master");
    expect(i2cPair!.match.roleB).toBe("slave");
  });

  it("also finds power compatible pairs", () => {
    const pairs = findCompatiblePairs(ArduinoNano, VL53L0X);

    const powerPairs = pairs.filter(
      (p) => p.match.matchedProtocol === "power",
    );

    // Arduino has power outputs (5V, 3.3V), VL53L0X has power input
    expect(powerPairs.length).toBeGreaterThan(0);
  });
});

describe("Scenario 2: Compositional Match — Arduino ↔ L298N Motor Control", () => {
  it("Arduino has no explicit motor_control interface", () => {
    const pairs = findCompatiblePairs(ArduinoNano, L298N);

    const motorPair = pairs.find(
      (p) => p.match.matchedProtocol === "motor_control",
    );

    // No explicit motor_control match — Arduino doesn't declare it
    expect(motorPair).toBeUndefined();
  });

  it("Arduino can compositionally satisfy L298N motor_control via slots", () => {
    const motorControl = L298N.interfaces.find((i) => i.id === "motor_control")!;

    const match = findCompositionalMatch(motorControl, ArduinoNano);

    expect(match.compatible).toBe(true);
    expect(match.confidence).toBe(0.8);
    expect(match.unsatisfiedSlots).toHaveLength(0);

    // Should have 3 slot fillers: en (pwm), in1 (digital), in2 (digital)
    expect(match.slotFillers).toHaveLength(3);

    // Verify the EN slot was filled by a PWM-capable pin
    const enFiller = match.slotFillers.find((f) => f.slotId === "en");
    expect(enFiller).toBeDefined();
    expect(enFiller!.matchedProtocol).toBe("pwm");
    expect(enFiller!.roleB).toBe("output"); // Arduino's PWM pin offers output

    // Verify IN1 and IN2 were filled by digital pins
    const inFillers = match.slotFillers.filter((f) => f.slotId === "in1" || f.slotId === "in2");
    expect(inFillers).toHaveLength(2);
    for (const f of inFillers) {
      expect(f.matchedProtocol).toBe("digital");
    }
  });

  it("derives an inferred motor_control interface on Arduino", () => {
    const motorControl = L298N.interfaces.find((i) => i.id === "motor_control")!;
    const match = findCompositionalMatch(motorControl, ArduinoNano);

    const inferred = deriveInferredInterface(match);

    expect(inferred).not.toBeNull();
    expect(inferred!.protocol.type).toBe("motor_control");
    expect(inferred!.protocol.role).toBe("source");
    expect(inferred!.confidence).toBe(0.8);
    expect(inferred!.composedFrom).toHaveLength(3);
    expect(inferred!.sourceInterfaceId).toBe("motor_control");
  });

  it("each slot filler uses a different Arduino pin", () => {
    const motorControl = L298N.interfaces.find((i) => i.id === "motor_control")!;
    const match = findCompositionalMatch(motorControl, ArduinoNano);

    const usedPinIds = match.slotFillers.map((f) => f.filledBy.id);
    const uniquePins = new Set(usedPinIds);

    // All 3 fillers should be different pins
    expect(uniquePins.size).toBe(3);
  });
});

describe("Compatibility Matrix — Arduino ↔ L298N", () => {
  it("finds power and digital matches but not motor_control", () => {
    const pairs = findCompatiblePairs(ArduinoNano, L298N);

    // Should find power matches (Arduino power outputs ↔ L298N power inputs)
    const powerPairs = pairs.filter((p) => p.match.matchedProtocol === "power");
    expect(powerPairs.length).toBeGreaterThan(0);

    // Should find digital/pwm matches (Arduino digital/PWM pins ↔ L298N control pins)
    // Both digital and pwm are valid — the matcher may report either since both pins
    // support both protocols. The important thing is connections exist.
    const signalPairs = pairs.filter(
      (p) => p.match.matchedProtocol === "digital" || p.match.matchedProtocol === "pwm",
    );
    expect(signalPairs.length).toBeGreaterThan(0);

    // Should NOT find motor_control (that requires compositional matching)
    const motorPairs = pairs.filter((p) => p.match.matchedProtocol === "motor_control");
    expect(motorPairs).toHaveLength(0);
  });
});
