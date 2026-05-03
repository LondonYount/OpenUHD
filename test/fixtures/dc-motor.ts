import type { ModuleDef } from "../../src/types/index.js";

export const DCMotor: ModuleDef = {
  id: "dc-motor",
  name: "Generic DC Motor",
  version: "1.0.0",
  tags: ["motor", "dc", "actuator"],
  categories: ["actuator.motor"],

  interfaces: [
    {
      id: "power",
      name: "Motor Power",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "power", roles: ["input"] }],
      parameters: [
        { id: "voltage", unit: "V", range: [3, 12] },
        { id: "max_current", unit: "A", value: 1 },
      ],
    },
  ],
};
