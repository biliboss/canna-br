import { describe, it, expect } from "vitest";
import { allManifests, manifestByUri } from "./index.js";

describe("@canna/ui-apps / registry", () => {
  it("ships 3 v0.2.1 MCP Apps", () => {
    expect(allManifests).toHaveLength(3);
    const ids = allManifests.map((m) => m.id);
    expect(ids).toEqual([
      "member-quota-card",
      "traceability-timeline",
      "dispensation-form",
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

  it("unknown URI returns undefined", () => {
    expect(manifestByUri("ui://nope/app.html")).toBeUndefined();
  });
});
