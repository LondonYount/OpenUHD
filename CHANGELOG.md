# Changelog

All notable changes to **Universal Hardware Description (UHD)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-02

### Added

- Initial public release of UHD as an open-source project under Apache License 2.0.
- Three-primitive data model: **Module**, **Interface**, **Harness**.
- Protocol matching engine with role compatibility (input/output, master/slave, etc.).
- Slot composition: build complex interfaces from leaf interfaces (e.g. I2C from GPIO + pull-ups).
- Capability-based intra-module slot binding.
- Typed parameters with units, ranges, and tolerances.
- Trait system for composable behaviors.
- ASCII and HTML visualizers for module / harness topology.
- Design Rule Check (DRC) specification (see [docs/drc-spec.md](docs/drc-spec.md)).
- Domain examples under `test/fixtures/`: Arduino Nano, L298N motor driver, VL53L0X sensor, DC motor, robot car.
- Architecture documentation: [docs/architecture.md](docs/architecture.md).

### Notes

- Schemas may evolve before 1.0; pin a version if you build on it.
