import type { ModuleDef } from "../../src/types/index.js";

export const VL53L0X: ModuleDef = {
  id: "vl53l0x",
  name: "ST VL53L0X Time-of-Flight Ranging Sensor",
  version: "1.0.0",
  manufacturer: "STMicroelectronics",
  part_number: "VL53L0X",
  tags: ["tof", "distance", "i2c", "sensor"],
  categories: ["sensor.distance"],

  interfaces: [
    {
      id: "power_in",
      name: "Power Input",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "power", roles: ["input"] }],
      parameters: [
        { id: "voltage", unit: "V", value: 2.8, range: [2.6, 3.5] },
        { id: "max_current", unit: "mA", value: 40 },
      ],
    },
    {
      id: "gnd",
      name: "Ground",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "power", roles: ["ground"] }],
      capabilities: ["ground"],
    },
    {
      id: "i2c",
      name: "I2C Target",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "i2c", roles: ["slave"] }],
      parameters: [
        { id: "clock_freq", unit: "Hz", value: 400000 },
        { id: "voltage", unit: "V", range: [2.6, 3.5] },
      ],
      // Leaf interface — no slots/profiles needed, I2C connections are fixed
    },
    {
      id: "xshut",
      name: "Shutdown Control",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "digital", roles: ["input"] }],
      capabilities: ["shutdown_ctrl"],
    },
    {
      id: "gpio1",
      name: "Interrupt Output",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "digital", roles: ["output"] }],
      capabilities: ["interrupt_out"],
    },
  ],
};
