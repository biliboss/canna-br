import { describe, it, expect } from "vitest";
import { allManifests, manifestByUri } from "./index.js";

describe("@canna/ui-apps / registry", () => {
  it("ships 4 MCP Apps", () => {
    expect(allManifests).toHaveLength(4);
    const ids = allManifests.map((m) => m.id);
    expect(ids).toEqual([
      "member-quota-card",
      "traceability-timeline",
      "dispensation-form",
      "member-lifecycle-board",
    ]);
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

  it("MemberLifecycleBoard manifest is resolvable by URI", () => {
    const m = manifestByUri("ui://member-lifecycle-board/app.html");
    expect(m).toBeDefined();
    expect(m?.id).toBe("member-lifecycle-board");
    expect(m?.category).toBe("dashboard");
    expect(m?.riskLevel).toBe(1);
  });

  it("unknown URI returns undefined", () => {
    expect(manifestByUri("ui://nope/app.html")).toBeUndefined();
  });
});
