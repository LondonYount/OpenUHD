import { generateVisualization } from "../src/visualize/cli.js";
import { RobotCar } from "../test/fixtures/robot-car.js";
import { ArduinoNano } from "../test/fixtures/arduino-nano.js";
import { L298N } from "../test/fixtures/l298n.js";
import { VL53L0X } from "../test/fixtures/vl53l0x.js";
import { DCMotor } from "../test/fixtures/dc-motor.js";

const childDefs = {
  "arduino-nano": ArduinoNano,
  "l298n": L298N,
  "vl53l0x": VL53L0X,
  "dc-motor": DCMotor,
};

const outputPath = new URL("../output/robot-car.html", import.meta.url).pathname;

// Ensure output directory exists
import { mkdirSync } from "fs";
mkdirSync(new URL("../output", import.meta.url).pathname, { recursive: true });

generateVisualization(RobotCar, childDefs, outputPath);
console.log(`Visualization written to: ${outputPath}`);
