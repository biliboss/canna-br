import { describe, expect, it } from "vitest";

import type { UserStats } from "./types";
import {
  ONBOARDING_TOTAL,
  isOnboardingActive,
  onboardingIndexFromStats,
} from "./user-context";

/**
 * Onboarding-complete derivation (blocker #7).
 *
 * The bug: `onboarding` was hardcoded `true`, so the coach never resolved to
 * "done" and could never retire. These cover the pure reduction the hook now
 * uses: active while stages remain, inactive once the user advances past the
 * last stage.
 */

const ZERO: UserStats = {
  launches: 0,
  distinctApps: 0,
  appsUsed: [],
  openedPalette: false,
  launchedFromPalette: false,
  openedNotifications: false,
};

const DONE: UserStats = {
  launches: 5,
  distinctApps: 3,
  appsUsed: ["a", "b", "c"],
  openedPalette: true,
  launchedFromPalette: true,
  openedNotifications: true,
};

describe("isOnboardingActive", () => {
  it("is active while a stage remains (index in range)", () => {
    expect(isOnboardingActive(0)).toBe(true);
    expect(isOnboardingActive(ONBOARDING_TOTAL - 1)).toBe(true);
  });

  it("is inactive once complete (the -1 sentinel)", () => {
    expect(isOnboardingActive(-1)).toBe(false);
  });
});

describe("onboardingIndexFromStats", () => {
  it("points at stage 0 for a fresh user", () => {
    expect(onboardingIndexFromStats(ZERO)).toBe(0);
  });

  it("returns -1 once every stage predicate is satisfied", () => {
    expect(onboardingIndexFromStats(DONE)).toBe(-1);
  });

  it("advances stage-by-stage as stats accrue", () => {
    // launched once → stage 0 cleared, now on stage 1 (palette)
    expect(onboardingIndexFromStats({ ...ZERO, launches: 1 })).toBe(1);
    // + opened palette → stage 2 (notifications)
    expect(
      onboardingIndexFromStats({ ...ZERO, launches: 1, openedPalette: true }),
    ).toBe(2);
    // + opened notifications → stage 3 (distinctApps >= 3)
    expect(
      onboardingIndexFromStats({
        ...ZERO,
        launches: 1,
        openedPalette: true,
        openedNotifications: true,
      }),
    ).toBe(3);
  });
});

describe("onboarding flag derivation (hook contract)", () => {
  it("is active for a fresh user and complete for a finished one", () => {
    expect(isOnboardingActive(onboardingIndexFromStats(ZERO))).toBe(true);
    expect(isOnboardingActive(onboardingIndexFromStats(DONE))).toBe(false);
  });
});
