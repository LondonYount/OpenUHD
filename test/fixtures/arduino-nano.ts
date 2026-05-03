import type { ModuleDef, InterfaceDef } from "../../src/types/index.js";

// Helper to create a digital pin
function digitalPin(
  id: string,
  name: string,
  extras: {
    pwm?: boolean;
    interrupt?: boolean;
    uart_rx?: boolean;
    uart_tx?: boolean;
    spi_mosi?: boolean;
    spi_miso?: boolean;
    spi_sck?: boolean;
    spi_ss?: boolean;
    analog_in?: boolean;
    i2c_sda?: boolean;
    i2c_scl?: boolean;
  } = {},
): InterfaceDef {
  const protocols: InterfaceDef["protocols"] = [
    { type: "digital", roles: ["input", "output", "bidirectional"] },
  ];
  const capabilities: string[] = ["digital_io"];

  if (extras.pwm) {
    protocols.push({ type: "pwm", roles: ["output"] });
    capabilities.push("pwm_out");
  }
  if (extras.interrupt) {
    protocols.push({ type: "interrupt", roles: ["input"] });
    capabilities.push("interrupt");
  }
  if (extras.uart_rx) {
    protocols.push({ type: "uart", roles: ["receiver"] });
    capabilities.push("uart_rx");
  }
  if (extras.uart_tx) {
    protocols.push({ type: "uart", roles: ["transmitter"] });
    capabilities.push("uart_tx");
  }
  if (extras.spi_mosi) capabilities.push("spi_mosi");
  if (extras.spi_miso) capabilities.push("spi_miso");
  if (extras.spi_sck) capabilities.push("spi_sck");
  if (extras.spi_ss) capabilities.push("spi_ss");
  if (extras.analog_in) {
    protocols.push({ type: "analog", roles: ["input"] });
    capabilities.push("analog_in");
  }
  if (extras.i2c_sda) capabilities.push("i2c_sda");
  if (extras.i2c_scl) capabilities.push("i2c_scl");

  return {
    id,
    name,
    domain: "electrical",
    exposed: true,
    default_active: true,
    protocols,
    capabilities,
    parameters: [
      { id: "voltage", unit: "V", value: 5 },
      { id: "drive_current", unit: "mA", value: 40 },
    ],
  };
}

export const ArduinoNano: ModuleDef = {
  id: "arduino-nano",
  name: "Arduino Nano",
  version: "1.0.0",
  manufacturer: "Arduino",
  part_number: "A000005",
  tags: ["mcu", "arduino", "atmega328p", "5v"],
  categories: ["microcontroller.arduino"],

  interfaces: [
    // --- Power ---
    {
      id: "power_usb",
      name: "USB Power",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "power", roles: ["input"] }],
      parameters: [
        { id: "voltage", unit: "V", value: 5, tolerance: { type: "percent", value: 5 } },
        { id: "max_current", unit: "A", value: 0.5 },
      ],
    },
    {
      id: "power_vin",
      name: "VIN Power",
      domain: "electrical",
      exposed: true,
      default_active: false,
      protocols: [{ type: "power", roles: ["input"] }],
      parameters: [{ id: "voltage", unit: "V", range: [7, 12] }],
    },
    {
      id: "power_5v_out",
      name: "5V Output",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "power", roles: ["output"] }],
      parameters: [
        { id: "voltage", unit: "V", value: 5, range: [4.8, 5.2] },
        { id: "max_current", unit: "A", value: 0.8 },
      ],
    },
    {
      id: "power_3v3_out",
      name: "3.3V Output",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "power", roles: ["output"] }],
      parameters: [
        { id: "voltage", unit: "V", value: 3.3, range: [3.1, 3.5] },
        { id: "max_current", unit: "A", value: 0.05 },
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

    // --- Digital Pins ---
    digitalPin("d0", "D0", { uart_rx: true }),
    digitalPin("d1", "D1", { uart_tx: true }),
    digitalPin("d2", "D2", { interrupt: true }),
    digitalPin("d3", "D3", { pwm: true, interrupt: true }),
    digitalPin("d4", "D4"),
    digitalPin("d5", "D5", { pwm: true }),
    digitalPin("d6", "D6", { pwm: true }),
    digitalPin("d7", "D7"),
    digitalPin("d8", "D8"),
    digitalPin("d9", "D9", { pwm: true }),
    digitalPin("d10", "D10", { pwm: true, spi_ss: true }),
    digitalPin("d11", "D11", { pwm: true, spi_mosi: true }),
    digitalPin("d12", "D12", { spi_miso: true }),
    digitalPin("d13", "D13", { spi_sck: true }),

    // --- Analog Pins ---
    digitalPin("a0", "A0", { analog_in: true }),
    digitalPin("a1", "A1", { analog_in: true }),
    digitalPin("a2", "A2", { analog_in: true }),
    digitalPin("a3", "A3", { analog_in: true }),
    digitalPin("a4", "A4/SDA", { analog_in: true, i2c_sda: true }),
    digitalPin("a5", "A5/SCL", { analog_in: true, i2c_scl: true }),
    {
      id: "a6",
      name: "A6",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "analog", roles: ["input"] }],
      capabilities: ["analog_in"],
    },
    {
      id: "a7",
      name: "A7",
      domain: "electrical",
      exposed: true,
      default_active: true,
      protocols: [{ type: "analog", roles: ["input"] }],
      capabilities: ["analog_in"],
    },

    // --- Composed Protocol Interfaces ---
    {
      id: "i2c",
      name: "I2C",
      domain: "electrical",
      exposed: true,
      default_active: false,
      protocols: [{ type: "i2c", roles: ["master", "slave"] }],
      parameters: [
        { id: "clock_freq", unit: "Hz", value: 400000 },
        { id: "voltage", unit: "V", value: 5 },
      ],
      slots: [
        { id: "sda", required: true, match: { protocol: "i2c", role: "data", capability: "i2c_sda" } },
        { id: "scl", required: true, match: { protocol: "i2c", role: "clock", capability: "i2c_scl" } },
      ],
      profiles: [
        { id: "i2c_0", label: "I2C (A4/A5)", bindings: { sda: "a4", scl: "a5" } },
      ],
    },
    {
      id: "spi",
      name: "SPI",
      domain: "electrical",
      exposed: true,
      default_active: false,
      protocols: [{ type: "spi", roles: ["master", "slave"] }],
      parameters: [{ id: "clock_freq", unit: "Hz", range: [125000, 8000000] }],
      slots: [
        { id: "mosi", required: true, match: { protocol: "spi", role: "data_out", capability: "spi_mosi" } },
        { id: "miso", required: true, match: { protocol: "spi", role: "data_in", capability: "spi_miso" } },
        { id: "sck", required: true, match: { protocol: "spi", role: "clock", capability: "spi_sck" } },
        { id: "ss", required: false, match: { protocol: "spi", role: "select", capability: "spi_ss" } },
      ],
      profiles: [
        { id: "spi_0", label: "SPI Bus 0 (D10-D13)", bindings: { mosi: "d11", miso: "d12", sck: "d13", ss: "d10" } },
      ],
    },
    {
      id: "uart",
      name: "UART/Serial",
      domain: "electrical",
      exposed: true,
      default_active: false,
      protocols: [{ type: "uart", roles: ["host", "device"] }],
      parameters: [{ id: "baud_rate", unit: "Hz", range: [300, 115200] }],
      slots: [
        { id: "rx", required: true, match: { protocol: "uart", role: "receiver", capability: "uart_rx" } },
        { id: "tx", required: true, match: { protocol: "uart", role: "transmitter", capability: "uart_tx" } },
      ],
      profiles: [
        { id: "uart_0", label: "UART (D0/D1)", bindings: { rx: "d0", tx: "d1" } },
      ],
    },
  ],

  interfaceGroups: [
    {
      id: "power_source",
      label: "Power Source",
      members: ["power_usb", "power_vin"],
      policy: "one_of",
    },
  ],

  traits: [
    { type: "can_bridge", params: { from: ["power_usb", "power_vin"], to: ["power_5v_out", "power_3v3_out"] } },
  ],

  domains: [
    {
      domain: "electrical",
      power_domains: [
        { id: "vin", nominal_voltage_V: 9, voltage_range_V: [7, 12] },
        { id: "usb_5v", nominal_voltage_V: 5, voltage_range_V: [4.75, 5.25] },
        { id: "regulated_5v", nominal_voltage_V: 5, voltage_range_V: [4.8, 5.2] },
        { id: "regulated_3v3", nominal_voltage_V: 3.3, voltage_range_V: [3.1, 3.5] },
      ],
    },
  ],
};
