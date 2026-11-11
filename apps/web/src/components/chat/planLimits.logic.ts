import type { ServerProvider } from "@t3tools/contracts";
import {
  displayLimitWindows,
  type LimitPool,
  type LimitPoolWindow,
} from "@t3tools/shared/usageLimits";

export interface PlanLimitWindow {
  readonly key: string;
  readonly label: string;
  readonly remainingPercent: number;
  /** Milliseconds until the next reset that refills this window, or null when none is known. */
  readonly resetsInMs: number | null;
}

export interface PlanLimitResetCredits {
  readonly count: number;
  /** Milliseconds until the soonest banked credit expires, or null when no expiry is reported. */
  readonly nextExpiresInMs: number | null;
}

export interface PlanLimitProvider {
  readonly driver: ServerProvider["driver"];
  readonly windows: readonly PlanLimitWindow[];
  /** Banked reset credits across the provider's accounts; null when none are banked. */
  readonly resetCredits: PlanLimitResetCredits | null;
}

/** Below this share left, the card flags a window so it stands out at a glance. */
export const PLAN_LIMIT_LOW_PERCENT = 15;

/** A banked reset credit this close to expiring is flagged so it gets used rather than lost. */
export const PLAN_LIMIT_RESET_EXPIRY_SOON_MS = 24 * 60 * 60 * 1000;

export function planLimitProviders(
  pools: readonly LimitPool[],
  now: number,
): readonly PlanLimitProvider[] {
  return pools.flatMap((pool) => {
    const windows = displayLimitWindows(pool)
      .filter((window) => !isCodexCreditLimit(pool, window))
      .map((window) => {
        const nextReset = window.resets
          .map((reset) => reset.at)
          .filter((at) => at > now)
          .reduce((earliest, at) => Math.min(earliest, at), Number.POSITIVE_INFINITY);
        return {
          key: `${window.kind}:${window.id}`,
          label: window.label,
          remainingPercent: window.remainingPercent,
          resetsInMs: Number.isFinite(nextReset) ? nextReset - now : null,
        };
      });
    return windows.length === 0
      ? []
      : [{ driver: pool.driver, windows, resetCredits: poolResetCredits(pool, now) }];
  });
}

/**
 * Codex's "Monthly credit limit" tracks a separate credits allowance that reads 0% on plans
 * without one, so the card leaves it to the Usage page. Codex pools windows by kind, so match
 * the reported window id rather than the pooled one, which also names Free/Go monthly limits.
 */
function isCodexCreditLimit(pool: LimitPool, window: LimitPoolWindow): boolean {
  return (
    pool.driver === "codex" &&
    window.members.length > 0 &&
    window.members.every((member) => member.window.id === "individual")
  );
}

function poolResetCredits(pool: LimitPool, now: number): PlanLimitResetCredits | null {
  let count = 0;
  let nextExpiresAt = Number.POSITIVE_INFINITY;
  for (const account of pool.accounts) {
    const credits = account.limits.resetCredits;
    if (!credits || credits.availableCount === 0) continue;
    count += credits.availableCount;
    const expiresAt = credits.nextExpiresAt ? Date.parse(credits.nextExpiresAt) : Number.NaN;
    if (expiresAt > now) nextExpiresAt = Math.min(nextExpiresAt, expiresAt);
  }
  if (count === 0) return null;
  return {
    count,
    nextExpiresInMs: Number.isFinite(nextExpiresAt) ? nextExpiresAt - now : null,
  };
}
