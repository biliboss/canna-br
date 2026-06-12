import { describe, it, expect } from "vitest";
import {
  allManifests,
  manifestByUri,
  memberLifecycleBoardManifest,
} from "./index.js";

// MCP tool catalog (apps/mcp/src/tools/index.ts). The registry must never
// advertise an App whose primaryToolName is not a real, registered tool.
const KNOWN_TOOL_NAMES = new Set([
  "get_member_quota",
  "list_available_lots",
  "generate_traceability_report",
  "draft_dispensation",
  "request_record_dispensation",
]);

describe("@canna/ui-apps / registry", () => {
  it("ships 3 launchable MCP Apps (lifecycle board withheld — no backing tool)", () => {
    expect(allManifests).toHaveLength(3);
    const ids = allManifests.map((m) => m.id);
    expect(ids).toEqual([
      "member-quota-card",
      "traceability-timeline",
      "dispensation-form",
    ]);
  });

  it("every registered App's primaryToolName references a real MCP tool", () => {
    for (const m of allManifests) {
      expect(
        KNOWN_TOOL_NAMES.has(m.primaryToolName),
        `${m.id} primaryToolName "${m.primaryToolName}" is not a known MCP tool`,
      ).toBe(true);
    }
  });

  it("no registered App carries the __unavailable__ sentinel", () => {
    for (const m of allManifests) {
      expect(
        m.primaryToolName.startsWith("__unavailable__:"),
        `${m.id} is registered but still flagged __unavailable__`,
      ).toBe(false);
    }
  });

  it("each manifest declares a ui:// resourceUri", () => {
    for (const m of allManifests) {
      expect(m.resourceUri).toMatch(/^ui:\/\//);
      expect(m.htmlBundlePath).toMatch(/^dist\/.*\.html$/);
    }
  });

  it("resourceUris match the MCP tool catalog convention", () => {
    expect(manifestByUri("ui://member-quota-card/app.html")?.primaryToolName).toBe(
      "get_member_quota",
    );
    expect(manifestByUri("ui://traceability-timeline/app.html")?.primaryToolName).toBe(
      "generate_traceability_report",
    );
    expect(manifestByUri("ui://dispensation-form/app.html")?.primaryToolName).toBe(
      "draft_dispensation",
    );
  });

  it("DispensationForm declares secondary tools incl. request_record_dispensation (Level 3)", () => {
    const m = manifestByUri("ui://dispensation-form/app.html");
    expect(m).toBeDefined();
    expect(m?.secondaryToolNames).toContain("request_record_dispensation");
    expect(m?.riskLevel).toBe(3);
  });

  it("MemberLifecycleBoard is NOT launchable until its backing tool ships", () => {
    // Option B: the board renders an aggregate of all members by MemberStatus,
    // but no `get_member_lifecycle` tool / cross-member read-model exists yet.
    // It must not be advertised as launchable (would point at the wrong tool).
    expect(manifestByUri("ui://member-lifecycle-board/app.html")).toBeUndefined();
    expect(allManifests.map((m) => m.id)).not.toContain("member-lifecycle-board");
  });

  it("MemberLifecycleBoard manifest names no phantom tool (sentinel until backing tool ships)", () => {
    // blocker #6: the manifest is still exported (package public API) but must
    // NOT claim a tool that does not exist. Previously it pointed at
    // `get_member_quota` (wrong payload) then `get_member_lifecycle` (phantom).
    // It now carries an explicit __unavailable__ sentinel, never a real tool
    // name, so no consumer of the exported manifest calls a non-existent tool.
    const m = memberLifecycleBoardManifest;
    expect(m.id).toBe("member-lifecycle-board");
    expect(KNOWN_TOOL_NAMES.has(m.primaryToolName)).toBe(false);
    expect(m.primaryToolName.startsWith("__unavailable__:")).toBe(true);
  });

  it("unknown URI returns undefined", () => {
    expect(manifestByUri("ui://nope/app.html")).toBeUndefined();
  });
});
