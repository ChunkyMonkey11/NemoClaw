// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AgentDefinition } from "../agent/defs";

function openclawAgent(expectedVersion: string): AgentDefinition {
  return {
    name: "openclaw",
    expectedVersion,
  } as AgentDefinition;
}

describe("sandbox registry metadata", () => {
  const originalHome = process.env.HOME;
  let tmpDir: string | null = null;

  afterEach(() => {
    process.env.HOME = originalHome;
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
    vi.resetModules();
  });

  it("preserves the recorded agent version when reusing an existing sandbox", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "nemoclaw-reuse-metadata-"));
    process.env.HOME = tmpDir;
    vi.resetModules();
    vi.doMock("../agent/defs", () => ({
      loadAgent: () => openclawAgent("2026.5.22"),
    }));
    vi.doMock("../runner", () => ({
      validateName: (value: string) => value,
    }));

    const registry = await import("../state/registry");
    const { createSandboxRegistryMetadataHelpers } = await import("./sandbox-registry-metadata");

    registry.registerSandbox({
      name: "alpha",
      model: "old-model",
      provider: "old-provider",
      agentVersion: "2026.5.18",
    });

    const helpers = createSandboxRegistryMetadataHelpers({
      isLinuxDockerDriverGatewayEnabled: () => true,
      getInstalledOpenshellVersion: () => "0.0.44",
      runCaptureOpenshell: () => "openshell 0.0.44",
    });

    helpers.updateReusedSandboxMetadata(
      "alpha",
      openclawAgent("2026.5.22"),
      "new-model",
      "nvidia-prod",
      18789,
    );

    expect(registry.getSandbox("alpha")).toEqual(
      expect.objectContaining({
        model: "new-model",
        provider: "nvidia-prod",
        agentVersion: "2026.5.18",
      }),
    );
  });
});
