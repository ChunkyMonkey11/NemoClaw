<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Release Notes

NVIDIA NemoClaw is available in early preview starting March 16, 2026. Use the following GitHub resources to track changes.

| Resource | Description |
|---|---|
| [Releases](https://github.com/NVIDIA/NemoClaw/releases) | Versioned release notes and downloadable assets. |
| [Release comparison](https://github.com/NVIDIA/NemoClaw/compare) | Diff between any two tags or branches. |
| [Merged pull requests](https://github.com/NVIDIA/NemoClaw/pulls?q=is%3Apr+is%3Amerged) | Individual changes with review discussion. |
| [Commit history](https://github.com/NVIDIA/NemoClaw/commits/main) | Full commit log on `main`. |

## April 2026 Highlights

### Security hardening: `config set` SSRF validation

`nemoclaw <sandbox> config set` now applies stricter URL validation for configuration updates:

1. Hostnames are DNS-resolved and rejected when any answer maps to private/internal address space.
2. IPv4, IPv6, and IPv4-mapped IPv6 private ranges are blocked.
3. Nested object/array config payloads are scanned for `http://` and `https://` URL values.
4. DNS resolution failures are fail-closed for safety.

Compatibility impact:

1. Endpoints that were previously accepted may now be rejected when DNS is unavailable or resolves to internal/private ranges.
2. This validation is a host-side preflight control and complements, but does not replace, OpenShell network policy enforcement.

Operational guidance:

1. Confirm host DNS resolution for the configured endpoint.
2. Verify that no resolved address is loopback, link-local, RFC1918/ULA, or mapped-private.
3. Use a stable public endpoint when remote inference access is required.
