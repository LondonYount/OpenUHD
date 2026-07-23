# Security Policy

## Supported versions

UHD is pre-1.0 and released from a single line of development. Security fixes
land on the latest published `0.x` release and on `main`. Older `0.x` versions
are not patched separately - upgrade to the latest to receive fixes.

| Version | Supported |
|---------|-----------|
| latest `0.x` | Yes |
| older `0.x`  | No  |

## Reporting a vulnerability

Please report vulnerabilities privately, not in a public issue:

- Use GitHub's "Report a vulnerability" button on the repository's
  **Security** tab (Private vulnerability reporting), or
- Email **mark@deltaroboticsinc.com** with the subject "UHD security report".

Include the affected version, a description of the issue, and a minimal
reproduction if you have one. We will acknowledge within a few days, work with
you on a fix, and credit you in the release notes unless you prefer otherwise.

## Scope

UHD is a dependency-free TypeScript data model and validation library. The most
relevant classes of issue are: crashes or unbounded resource use when parsing or
validating untrusted UHD definitions, and logic errors in the Design Rule Check
engine that could cause an unsafe hardware design to pass validation. Reports in
those areas are especially welcome.
