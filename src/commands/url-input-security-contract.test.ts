// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const commandsRoot = path.join(repoRoot, "src", "commands");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function commandFiles(dir = commandsRoot): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(dir, entry.name);
      return entry.isDirectory()
        ? commandFiles(absolute)
        : entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
          ? [path.relative(repoRoot, absolute)]
          : [];
    })
    .sort();
}

function exposesEndpointInput(source: string): boolean {
  return [
    "--endpoint-url",
    "--gateway-url",
    "--url ",
    "--url=",
    "--config K=V",
    "config: Flags.string",
    "SSRF validation",
  ].some((needle) => source.includes(needle));
}

describe("URL-bearing command surfaces", () => {
  // source-shape-contract: security -- URL command routing must remain bound to the reviewed validation owners that prevent endpoint input bypasses.
  it("route every command URL/config input through the owning security boundary", () => {
    const urlInputCommands = commandFiles().filter(
      (file) => !file.includes("/dashboard-url") && exposesEndpointInput(read(file)),
    );

    expect(urlInputCommands).toEqual([
      "src/commands/credentials/add.ts",
      "src/commands/inference/set.ts",
      "src/commands/internal/voice-gateway/serve.ts",
      "src/commands/sandbox/config/set.ts",
      "src/commands/sandbox/inference/set.ts",
      "src/commands/sandbox/mcp.ts",
    ]);

    expect(read("src/commands/credentials/add.ts")).toContain("runCredentialsAddAction");
    expect(read("src/lib/actions/credentials-add.ts")).toContain("assertEndpointResolvesPublic");
    expect(read("src/lib/actions/credentials-add.ts")).toContain(
      "accepts only a public IP-literal URL",
    );

    expect(read("src/commands/inference/set.ts")).toContain("runInferenceSet");
    expect(read("src/commands/sandbox/inference/set.ts")).toContain("runInferenceSet");
    expect(read("src/lib/actions/inference-set-route-containment.ts")).toContain(
      "rewriteUrlWithDnsPinning",
    );

    expect(read("src/commands/sandbox/config/set.ts")).toContain("sandboxConfig.configSet");
    expect(read("src/lib/sandbox/config.ts")).toContain("rewriteConfigUrlsWithDnsPinning");

    expect(read("src/commands/sandbox/mcp.ts")).toContain("dispatchMcpBridgeCommand");
    expect(read("src/lib/actions/sandbox/mcp-bridge-validation.ts")).toContain(
      "normalizeMcpServerUrl(rawUrl",
    );

    expect(read("src/commands/internal/voice-gateway/serve.ts")).toContain("runVoiceGatewayServe");
    expect(read("src/lib/actions/voice-gateway/serve.ts")).toContain("validateOpenClawGatewayUrl");
  });
});
