import { describe, it, expect } from "vitest";
import { instantiateModule } from "../src/instance/instantiate.js";
import { resolveAllInterfaces, resolveInterfaceState } from "../src/instance/resolve.js";
import { validateInterfaceGroups } from "../src/binding/groups.js";
import { getClaimedInterfaces } from "../src/binding/claims.js";
import { ArduinoNano } from "./fixtures/arduino-nano.js";
import { L298N } from "./fixtures/l298n.js";
import { RobotCar } from "./fixtures/robot-car.js";
import type { InterfaceInstanceState } from "../src/types/instance.js";

describe("Scenario 5: Interface Groups (one_of policy)", () => {
  it("Arduino with USB power active passes one_of validation", () => {
    const instance = instantiateModule(ArduinoNano);

    // USB is default_active: true, VIN is default_active: false
    // Manually set up the state to reflect this
    const resolved = resolveAllInterfaces(ArduinoNano, instance);

    const usbState = resolved.find((r) => r.interfaceDef.id === "power_usb");
    const vinState = resolved.find((r) => r.interfaceDef.id === "power_vin");

    expect(usbState?.active).toBe(true);
    expect(vinState?.active).toBe(false);

    // Validate groups — one_of should pass (USB active, VIN inactive)
    const groupResults = validateInterfaceGroups(
      ArduinoNano.interfaceGroups!,
      resolved,
    );

    const powerGroup = groupResults.find((r) => r.groupId === "power_source");
    expect(powerGroup).toBeDefined();
    expect(powerGroup!.valid).toBe(true);
  });

  it("rejects both power sources active simultaneously", () => {
    const instance = instantiateModule(ArduinoNano);

    // Simulate both active by overriding VIN to active
    // Create resolved states where both power interfaces are active
    const resolved = ArduinoNano.interfaces.map((iface) => {
      if (iface.id === "power_usb" || iface.id === "power_vin") {
        return { interfaceDef: iface, active: true, activeInstances: [] };
      }
      return resolveInterfaceState(iface, instance.interfaceStates[iface.id]);
    });

    const groupResults = validateInterfaceGroups(
      ArduinoNano.interfaceGroups!,
      resolved,
    );

    const powerGroup = groupResults.find((r) => r.groupId === "power_source");
    expect(powerGroup!.valid).toBe(false);
    expect(powerGroup!.errors[0]).toContain("2 members active");
  });
});

describe("Scenario 7 (continued): L298N Instantiation — Fully Fixed Module", () => {
  it("L298N instantiates with both motor channels auto-activated", () => {
    const instance = instantiateModule(L298N);

    // motor_control should have both profiles active
    const motorState = instance.interfaceStates["motor_control"];
    expect(motorState).toBeDefined();
    expect(motorState.instances["channel_a"]).toBeDefined();
    expect(motorState.instances["channel_a"].active).toBe(true);
    expect(motorState.instances["channel_a"].bindings).toEqual({
      en: "en_a", in1: "in1", in2: "in2",
    });

    expect(motorState.instances["channel_b"]).toBeDefined();
    expect(motorState.instances["channel_b"].active).toBe(true);
    expect(motorState.instances["channel_b"].bindings).toEqual({
      en: "en_b", in1: "in3", in2: "in4",
    });
  });

  it("L298N motor_output also auto-activates both channels", () => {
    const instance = instantiateModule(L298N);

    const outputState = instance.interfaceStates["motor_output"];
    expect(outputState).toBeDefined();
    expect(outputState.instances["output_a"]).toBeDefined();
    expect(outputState.instances["output_a"].active).toBe(true);
    expect(outputState.instances["output_b"]).toBeDefined();
    expect(outputState.instances["output_b"].active).toBe(true);
  });

  it("all L298N control interfaces are claimed on instantiation", () => {
    const instance = instantiateModule(L298N);
    const claimed = getClaimedInterfaces(instance.interfaceStates);

    // Motor control: en_a, in1, in2, en_b, in3, in4
    expect(claimed.has("en_a")).toBe(true);
    expect(claimed.has("in1")).toBe(true);
    expect(claimed.has("in2")).toBe(true);
    expect(claimed.has("en_b")).toBe(true);
    expect(claimed.has("in3")).toBe(true);
    expect(claimed.has("in4")).toBe(true);

    // Motor output: out1, out2, out3, out4
    expect(claimed.has("out1")).toBe(true);
    expect(claimed.has("out2")).toBe(true);
    expect(claimed.has("out3")).toBe(true);
    expect(claimed.has("out4")).toBe(true);
  });
});

describe("Scenario 8: Module-of-Modules — Robot Car", () => {
  it("Robot Car defines 5 children", () => {
    expect(RobotCar.children).toHaveLength(5);
    expect(RobotCar.children!.map((c) => c.id)).toEqual([
      "arduino", "l298n", "vl53l0x", "motor_left", "motor_right",
    ]);
  });

  it("Robot Car defines harnesses with various topologies", () => {
    expect(RobotCar.harnesses).toBeDefined();
    const harnesses = RobotCar.harnesses!;

    const topologies = harnesses.map((h) => h.topology);
    expect(topologies).toContain("bus");
    expect(topologies).toContain("wire");
  });

  it("sensor_bus harness targets Arduino I2C profile i2c_0", () => {
    const sensorBus = RobotCar.harnesses!.find((h) => h.id === "sensor_bus")!;
    const arduinoEndpoint = sensorBus.endpoints.find((e) => e.childModuleId === "arduino")!;

    expect(arduinoEndpoint.interfaceId).toBe("i2c");
    expect(arduinoEndpoint.profileInstanceId).toBe("i2c_0");
  });

  it("motor_ctrl_a targets L298N motor_control channel_a", () => {
    const motorA = RobotCar.harnesses!.find((h) => h.id === "motor_ctrl_a")!;
    const l298nEndpoint = motorA.endpoints.find((e) => e.childModuleId === "l298n")!;

    expect(l298nEndpoint.interfaceId).toBe("motor_control");
    expect(l298nEndpoint.profileInstanceId).toBe("channel_a");
  });

  it("motor_ctrl_b targets L298N motor_control channel_b (different channel)", () => {
    const motorB = RobotCar.harnesses!.find((h) => h.id === "motor_ctrl_b")!;
    const l298nEndpoint = motorB.endpoints.find((e) => e.childModuleId === "l298n")!;

    expect(l298nEndpoint.interfaceId).toBe("motor_control");
    expect(l298nEndpoint.profileInstanceId).toBe("channel_b");
  });

  it("has an artifact", () => {
    expect(RobotCar.artifacts).toHaveLength(1);
    expect(RobotCar.artifacts![0].type).toBe("documentation");
  });
});

describe("Scenario 9: Prefab/Override — Multiple Instances", () => {
  it("two Arduino instances from the same def have independent state", () => {
    const instance1 = instantiateModule(ArduinoNano, {
      id: "arduino-1",
      nickname: "sensor_mcu",
    });
    const instance2 = instantiateModule(ArduinoNano, {
      id: "arduino-2",
      nickname: "motor_mcu",
    });

    expect(instance1.defId).toBe(instance2.defId);
    expect(instance1.id).not.toBe(instance2.id);
    expect(instance1.nickname).toBe("sensor_mcu");
    expect(instance2.nickname).toBe("motor_mcu");
  });

  it("activating I2C on instance 1 does not affect instance 2", () => {
    const instance1 = instantiateModule(ArduinoNano, { id: "arduino-1" });
    const instance2 = instantiateModule(ArduinoNano, { id: "arduino-2" });

    // Activate I2C on instance 1
    instance1.interfaceStates["i2c"] = {
      interfaceDefId: "i2c",
      instances: {
        i2c_0: {
          profileId: "i2c_0",
          bindings: { sda: "a4", scl: "a5" },
          implementedRole: "master",
          active: true,
        },
      },
    };

    // Activate SPI on instance 2
    instance2.interfaceStates["spi"] = {
      interfaceDefId: "spi",
      instances: {
        spi_0: {
          profileId: "spi_0",
          bindings: { mosi: "d11", miso: "d12", sck: "d13", ss: "d10" },
          implementedRole: "master",
          active: true,
        },
      },
    };

    // Instance 1: A4/A5 claimed, D11/D12/D13/D10 free
    const claimed1 = getClaimedInterfaces(instance1.interfaceStates);
    expect(claimed1.has("a4")).toBe(true);
    expect(claimed1.has("a5")).toBe(true);
    expect(claimed1.has("d11")).toBe(false);

    // Instance 2: D10-D13 claimed, A4/A5 free
    const claimed2 = getClaimedInterfaces(instance2.interfaceStates);
    expect(claimed2.has("d11")).toBe(true);
    expect(claimed2.has("d13")).toBe(true);
    expect(claimed2.has("a4")).toBe(false);
  });

  it("both instances resolve correctly against the same definition", () => {
    const instance1 = instantiateModule(ArduinoNano, { id: "arduino-1" });
    instance1.interfaceStates["i2c"] = {
      interfaceDefId: "i2c",
      instances: {
        i2c_0: { profileId: "i2c_0", bindings: { sda: "a4", scl: "a5" }, active: true },
      },
    };

    const resolved1 = resolveAllInterfaces(ArduinoNano, instance1);
    const i2cResolved = resolved1.find((r) => r.interfaceDef.id === "i2c");

    expect(i2cResolved?.active).toBe(true);
    expect(i2cResolved?.activeInstances).toHaveLength(1);
    expect(i2cResolved?.activeInstances[0].profileId).toBe("i2c_0");
  });
});
