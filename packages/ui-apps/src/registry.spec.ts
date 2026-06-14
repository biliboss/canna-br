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
  "get_members_by_status",
  "list_available_lots",
  "generate_traceability_report",
  "draft_dispensation",
  "request_record_dispensation",
]);

describe("@canna/ui-apps / registry", () => {
  it("ships 4 launchable MCP Apps (incl. member-lifecycle-board)", () => {
    expect(allManifests).toHaveLength(4);
    const ids = allManifests.map((m) => m.id);
    expect(ids).toEqual([
      "member-quota-card",
      "traceability-timeline",
      "dispensation-form",
      "member-lifecycle-board",
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
    expect(manifestByUri("ui://member-lifecycle-board/app.html")?.primaryToolName).toBe(
      "get_members_by_status",
    );
  });

  it("DispensationForm declares secondary tools incl. request_record_dispensation (Level 3)", () => {
    const m = manifestByUri("ui://dispensation-form/app.html");
    expect(m).toBeDefined();
    expect(m?.secondaryToolNames).toContain("request_record_dispensation");
    expect(m?.riskLevel).toBe(3);
  });

  it("MemberLifecycleBoard is now launchable — backed by get_members_by_status", () => {
    const m = manifestByUri("ui://member-lifecycle-board/app.html");
    expect(m).toBeDefined();
    expect(m?.id).toBe("member-lifecycle-board");
    expect(m?.primaryToolName).toBe("get_members_by_status");
    expect(m?.riskLevel).toBe(1);
  });

  it("MemberLifecycleBoard manifest no longer carries the __unavailable__ sentinel", () => {
    const m = memberLifecycleBoardManifest;
    expect(m.id).toBe("member-lifecycle-board");
    expect(m.primaryToolName.startsWith("__unavailable__:")).toBe(false);
    expect(m.primaryToolName).toBe("get_members_by_status");
    expect(KNOWN_TOOL_NAMES.has(m.primaryToolName)).toBe(true);
  });

  it("unknown URI returns undefined", () => {
    expect(manifestByUri("ui://nope/app.html")).toBeUndefined();
  });
});
