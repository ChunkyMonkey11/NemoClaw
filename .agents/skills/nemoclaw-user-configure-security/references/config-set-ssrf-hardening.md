<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Config-Set SSRF Hardening (April 2026)

## Why this exists

`nemoclaw <sandbox> config set` had URL validation, but it only blocked obvious private literals such as `127.0.0.1`, `10.x.x.x`, and `localhost`.

The previous logic did **not** resolve hostnames. That created a gap where a user could set a URL that looked external but resolved to an internal/private address at runtime.

This page captures the issue, the fix, and practical language maintainers can use in review notes and release communication.

## Issue summary

Before this hardening:

1. URL validation was string/prefix based.
2. Hostname DNS resolution was not performed.
3. Only a small subset of private-address cases was covered.

Security impact:

1. Hostname-based SSRF bypasses were possible through config mutation paths.
2. IPv6/private-mapped edge cases were incompletely covered.
3. Nested config payloads containing URL strings could avoid strict endpoint checks.

## Threat model context

This is a host-side hardening control. It protects operators against:

1. Mistaken unsafe endpoint configuration.
2. Socially engineered endpoint changes (for example, "set this endpoint to fix connectivity").
3. Later DNS changes that move a previously benign hostname into internal/private space.

It does **not** replace OpenShell network policy enforcement, but it reduces risky configuration before policy enforcement is even consulted.

## What changed

Code paths updated:

1. `src/lib/sandbox-config.ts`
2. `src/nemoclaw.ts`
3. `test/config-set.test.ts`

Behavioral hardening in `sandbox-config.ts`:

1. Added CIDR-based private/internal detection for IPv4 and IPv6.
2. Added IPv4-mapped IPv6 handling (for example `::ffff:127.0.0.1`).
3. Added `localhost` subdomain blocking (for example `api.localhost`).
4. Added DNS-resolution validation (`lookup(..., { all: true })`) for hostname URLs.
5. Enforced fail-closed behavior when DNS resolution fails.
6. Rejected URLs when **any** resolved address is private/internal.
7. Extended validation to scan nested object/array values for `http://` / `https://` strings.

CLI integration change:

1. `configSet` is now async and awaited by the command dispatcher.

## Validation and regression coverage

New test coverage in `test/config-set.test.ts` includes:

1. Reject hostname resolving to private IPv4.
2. Reject hostname resolving to private IPv6.
3. Reject mixed DNS answers when any address is private.
4. Allow hostnames when all answers are public.
5. Fail closed on DNS lookup errors.
6. Reject `localhost` subdomains in direct validation.

## How to talk about this change

### One-sentence PR summary

"Harden `nemoclaw config set` SSRF validation by adding DNS-aware hostname checks, full IPv4/IPv6 private-range detection, and recursive URL validation for nested config values."

### Risk statement

"This change is fail-closed for unresolved hostnames and may reject endpoints that were previously accepted when DNS is unavailable or points to internal space."

### Reviewer framing

1. Security objective: close hostname-based SSRF bypasses in config mutation flow.
2. Compatibility impact: stricter validation may block previously accepted but unsafe values.
3. Safety net: deterministic unit tests cover private/public/mixed DNS and failure cases.

### Release note framing

1. "Improved security validation for `config set` URL values."
2. "Hostnames are now DNS-resolved and blocked if they map to internal/private addresses."
3. "Added stronger IPv6 and mapped-address SSRF defenses."

## Operational notes

If a previously working endpoint is now blocked:

1. Confirm DNS resolution from the host.
2. Verify the hostname does not resolve to loopback, link-local, RFC1918/ULA, or mapped-private addresses.
3. Use a public, stable endpoint or fix the DNS target.

This is an intentional safety boundary, not a transient warning.
