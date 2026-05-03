import { renderAscii } from "../src/visualize/ascii.js";
import { SixAxisArm, BatteryPack12V, DCMotor12V } from "../test/fixtures/six-axis-arm.js";
import { ArduinoNano } from "../test/fixtures/arduino-nano.js";
import { L298N } from "../test/fixtures/l298n.js";

const childDefs: Record<string, any> = {
  "arduino-nano": ArduinoNano,
  "l298n": L298N,
  "dc-motor-12v": DCMotor12V,
  "battery-12v": BatteryPack12V,
};

console.log(renderAscii(SixAxisArm, childDefs));
