# Contributing to UHD

Thanks for your interest in **Universal Hardware Description (UHD)**. UHD is meant to be a shared, multidisciplinary description language for hardware - it gets better the more eyes and use cases shape it.

## Code of conduct

Participation in this project is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to **mark@deltaroboticsinc.com**.

## Ways to contribute

- **Report bugs** - file an issue using the bug-report template.
- **Propose schema changes** - open a discussion or feature-request issue *before* opening a PR. UHD's data model is the load-bearing part of the project; changes need design conversation first.
- **Fix bugs / add tests** - small PRs welcome without prior discussion.
- **Improve docs** - clarifications, examples, and corrections in `docs/` or the README are always appreciated.
- **Add domain examples** - fixtures under `test/fixtures/` (Arduino, motors, sensors, etc.) showcase UHD across domains; new ones help.

New here? Issues labelled [`good first issue`](https://github.com/Delta-Robotics-Inc/OpenUHD/labels/good%20first%20issue) and [`help wanted`](https://github.com/Delta-Robotics-Inc/OpenUHD/labels/help%20wanted) are the best place to start. For where to ask questions, see [SUPPORT.md](.github/SUPPORT.md).

## Development setup

```bash
git clone https://github.com/Delta-Robotics-Inc/OpenUHD
cd OpenUHD
npm install
```

### Common commands

```bash
npm test            # Run the full test suite
npm run test:watch  # Watch mode
npm run type-check  # Strict TypeScript check (no emit)
npm run build       # Compile to dist/
```

All tests live under `test/` and are organized by validation phase (protocol matching, composition, binding, parameters, modules).

## Pull request process

1. Fork the repo and create a feature branch off `main`.
2. Make your changes. Keep PRs focused - one logical change per PR.
3. Add or update tests covering your change.
4. Run `npm test` and `npm run type-check` locally; both must pass (CI runs the same checks on Node 20, 22, and 24).
5. Update `CHANGELOG.md` under the `## [Unreleased]` heading.
6. Open a PR. Fill in the PR template; link any related issue.
7. A maintainer will review. Schema-affecting PRs may need iteration before merge.

## Schema changes

UHD is heading toward a stable 1.0. Until then, the data model may evolve, but each change should:

- Be motivated by a real use case (cite the example).
- Update [docs/architecture.md](docs/architecture.md) in the same PR.
- Include a migration note in `CHANGELOG.md` if it breaks existing definitions.

## Style

- TypeScript, strict mode. Match the existing voice of the codebase - domain-neutral terms (Module / Interface / Harness / Protocol / Capability), no domain-specific jargon in core types.
- Prefer adding tests over adding comments. The data model is small; readable code is preferable to documentation.
- No code formatter is currently enforced; match surrounding style.

## Reporting security or safety issues

Do not open a public issue for a vulnerability or a safety-relevant error. Follow [SECURITY.md](.github/SECURITY.md) to report it privately.

## License

By contributing, you agree your contributions will be licensed under the [Apache License 2.0](LICENSE). You retain copyright; the license is in addition.
