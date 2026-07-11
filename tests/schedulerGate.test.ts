import { afterEach, describe, expect, it } from "vitest";
import { getSchedulerGateStatus, isQuietHoursAt } from "../src/server/settings.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("scheduler gate", () => {
  it("uses balanced minute buckets by default on Vercel", () => {
    process.env.VERCEL = "1";
    delete process.env.SCHEDULER_PROFILE;
    process.env.QUIET_HOURS_ENABLED = "false";

    const allowed = getSchedulerGateStatus("external-scheduler", new Date("2026-07-11T02:30:00.000Z"));
    const blocked = getSchedulerGateStatus("external-scheduler", new Date("2026-07-11T02:35:00.000Z"));

    expect(allowed.profile).toBe("balanced");
    expect(allowed.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("minute_bucket");
  });

  it("blocks scheduled runs during configured quiet hours", () => {
    process.env.SCHEDULER_PROFILE = "burst";
    process.env.QUIET_HOURS_ENABLED = "true";
    process.env.QUIET_HOURS_START = "23:30";
    process.env.QUIET_HOURS_END = "07:30";
    process.env.QUIET_HOURS_TIMEZONE = "Asia/Taipei";
    process.env.SCHEDULER_SKIP_QUIET_HOURS = "true";

    const date = new Date("2026-07-11T16:30:00.000Z");
    expect(isQuietHoursAt(date)).toBe(true);
    expect(getSchedulerGateStatus("external-scheduler", date)).toMatchObject({
      allowed: false,
      reason: "quiet_hours"
    });
  });

  it("lets manual requests bypass the scheduler gate by default", () => {
    process.env.SCHEDULER_ENABLED = "false";
    process.env.MANUAL_CHECK_BYPASS_SCHEDULER_GATE = "true";

    expect(getSchedulerGateStatus("manual", new Date("2026-07-11T00:00:00.000Z"))).toMatchObject({
      allowed: true,
      reason: "manual_bypass"
    });
  });

  it("supports custom allowed minutes", () => {
    process.env.SCHEDULER_PROFILE = "custom";
    process.env.SCHEDULER_ALLOWED_MINUTES = "5,20,50";
    process.env.QUIET_HOURS_ENABLED = "false";
    process.env.QUIET_HOURS_TIMEZONE = "UTC";

    expect(getSchedulerGateStatus("external-scheduler", new Date("2026-07-11T08:20:00.000Z")).allowed).toBe(true);
    expect(getSchedulerGateStatus("external-scheduler", new Date("2026-07-11T08:25:00.000Z")).allowed).toBe(false);
  });
});
