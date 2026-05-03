import { renderAscii } from "../src/visualize/ascii.js";
import { RobotCar } from "../test/fixtures/robot-car.js";
import { ArduinoNano } from "../test/fixtures/arduino-nano.js";
import { L298N } from "../test/fixtures/l298n.js";
import { VL53L0X } from "../test/fixtures/vl53l0x.js";
import { DCMotor } from "../test/fixtures/dc-motor.js";

const childDefs: Record<string, any> = {
  "arduino-nano": ArduinoNano,
  "l298n": L298N,
  "vl53l0x": VL53L0X,
  "dc-motor": DCMotor,
};

console.log(renderAscii(RobotCar, childDefs));
