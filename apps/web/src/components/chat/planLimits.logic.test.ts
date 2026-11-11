import { ProviderDriverKind } from "@t3tools/contracts";
import type { LimitAccount, LimitPool, LimitPoolWindow } from "@t3tools/shared/usageLimits";
import { describe, expect, it } from "vite-plus/test";

import { planLimitProviders } from "./planLimits.logic";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function poolWindow(
  overrides: Partial<LimitPoolWindow> & Pick<LimitPoolWindow, "id" | "kind">,
): LimitPoolWindow {
  return {
    label: overrides.id,
    members: [],
    columns: [],
    remainingPercent: 50,
    usedPercent: 50,
    pace: null,
    resets: [],
    ...overrides,
  };
}

function account(resetCredits: LimitAccount["limits"]["resetCredits"]): LimitAccount {
  return {
    key: "account",
    driver: ProviderDriverKind.make("codex"),
    displayName: null,
    email: undefined,
    plan: undefined,
    accentColor: undefined,
    environments: [],
    sourceLabel: null,
    redeem: null,
    limits: {
      checkedAt: new Date(NOW).toISOString(),
      windows: [],
      ...(resetCredits ? { resetCredits } : {}),
    } as LimitAccount["limits"],
  };
}

function resetAt(at: number): LimitPoolWindow["resets"][number] {
  return { member: {} as LimitPoolWindow["resets"][number]["member"], at, restoresPercent: 100 };
}

describe("planLimitProviders", () => {
  it("reports each window's share left and the soonest upcoming reset", () => {
    const pool: LimitPool = {
      driver: ProviderDriverKind.make("claudeAgent"),
      accounts: [],
      windows: [
        poolWindow({
          id: "five_hour",
          kind: "session",
          label: "Session",
          remainingPercent: 72,
          resets: [resetAt(NOW - HOUR), resetAt(NOW + 3 * HOUR), resetAt(NOW + 2 * HOUR)],
        }),
        poolWindow({ id: "seven_day", kind: "weekly", label: "Weekly", remainingPercent: 18 }),
      ],
    };

    expect(planLimitProviders([pool], NOW)).toEqual([
      {
        driver: ProviderDriverKind.make("claudeAgent"),
        windows: [
          {
            key: "session:five_hour",
            label: "Session",
            remainingPercent: 72,
            resetsInMs: 2 * HOUR,
          },
          { key: "weekly:seven_day", label: "Weekly", remainingPercent: 18, resetsInMs: null },
        ],
        resetCredits: null,
      },
    ]);
  });

  it("totals banked reset credits and reports the soonest upcoming expiry", () => {
    const pool: LimitPool = {
      driver: ProviderDriverKind.make("codex"),
      accounts: [
        account({ availableCount: 2, nextExpiresAt: new Date(NOW + 5 * DAY).toISOString() }),
        account({ availableCount: 1, nextExpiresAt: new Date(NOW + 2 * DAY).toISOString() }),
        account({ availableCount: 0, nextExpiresAt: new Date(NOW + DAY).toISOString() }),
        account(undefined),
      ],
      windows: [poolWindow({ id: "primary", kind: "session" })],
    };

    expect(planLimitProviders([pool], NOW)[0]?.resetCredits).toEqual({
      count: 3,
      nextExpiresInMs: 2 * DAY,
    });
  });

  it("hides Codex's monthly credit limit but keeps a Free/Go monthly limit", () => {
    const member = (id: string) => ({ window: { id } }) as LimitPoolWindow["members"][number];
    const pool: LimitPool = {
      driver: ProviderDriverKind.make("codex"),
      accounts: [],
      windows: [
        poolWindow({ id: "session", kind: "session", members: [member("primary")] }),
        poolWindow({ id: "monthly", kind: "monthly", members: [member("individual")] }),
      ],
    };
    const freePlan: LimitPool = {
      ...pool,
      windows: [poolWindow({ id: "monthly", kind: "monthly", members: [member("primary")] })],
    };

    expect(planLimitProviders([pool], NOW)[0]?.windows.map((window) => window.key)).toEqual([
      "session:session",
    ]);
    expect(planLimitProviders([freePlan], NOW)[0]?.windows.map((window) => window.key)).toEqual([
      "monthly:monthly",
    ]);
  });

  it("omits reset credits when none are banked", () => {
    const pool: LimitPool = {
      driver: ProviderDriverKind.make("codex"),
      accounts: [account({ availableCount: 0 })],
      windows: [poolWindow({ id: "primary", kind: "session" })],
    };

    expect(planLimitProviders([pool], NOW)[0]?.resetCredits).toBeNull();
  });

  it("drops providers that report no windows", () => {
    expect(
      planLimitProviders(
        [{ driver: ProviderDriverKind.make("codex"), accounts: [], windows: [] }],
        NOW,
      ),
    ).toEqual([]);
  });
});
