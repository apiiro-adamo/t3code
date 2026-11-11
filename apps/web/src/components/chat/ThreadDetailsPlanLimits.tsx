import { useAtomValue } from "@effect/atom-react";
import { minuteTick } from "@t3tools/client-runtime/clock";
import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import {
  collectLimitAccounts,
  collectLimitPools,
  formatDuration,
} from "@t3tools/shared/usageLimits";
import { useNavigate } from "@tanstack/react-router";
import { TicketIcon } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";
import { environmentPresentations } from "../../state/presentation";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { providerClients } from "../settings/providerDriverMeta";
import { barColor } from "../usage/UsageLimits";
import { ProviderInstanceIcon } from "./ProviderInstanceIcon";
import { ThreadDetailsSection } from "./ThreadDetailsSection";
import {
  PLAN_LIMIT_RESET_EXPIRY_SOON_MS,
  PLAN_LIMIT_LOW_PERCENT,
  planLimitProviders,
} from "./planLimits.logic";

/** Always-visible subscription limits above the sidebar's utility menu; opens Usage on click. */
/** Every connected provider's plan limits and reset credits; opens Usage on click. */
export function ThreadDetailsPlanLimits() {
  const navigate = useNavigate();
  const minute = useNowMinute();
  const now = Date.parse(`${minute}:00Z`);
  const presentations = useAtomValue(environmentPresentations.presentationsAtom);
  const presentationsWithProviders = useAtomValue(
    environmentPresentations.presentationsWithProvidersAtom,
  );
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });

  const refreshConnectedLimits = useEffectEvent(() => {
    for (const [environmentId, presentation] of presentations) {
      if (presentation.connection.phase !== "connected" || presentation.serverConfig === null) {
        continue;
      }
      // Automatic refreshes share the Usage page's per-environment 5 minute throttle.
      void refreshUsageLimits(
        environmentId,
        () => refreshProviders({ environmentId, input: {} }),
        true,
      );
    }
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- asks connected servers for fresh limits each minute; refreshUsageLimits throttles the actual reads
  useEffect(() => {
    refreshConnectedLimits();
    return minuteTick.subscribe(refreshConnectedLimits);
  }, []);

  const providers = planLimitProviders(
    collectLimitPools(collectLimitAccounts(presentationsWithProviders), now),
    now,
  );
  if (providers.length === 0) return null;

  return (
    <ThreadDetailsSection
      headingId="thread-details-plan-limits-heading"
      title="Plan limits"
      showHeading={false}
    >
      <button
        type="button"
        aria-label="Plan limits. Open usage"
        onClick={() => void navigate({ to: "/usage" })}
        className="flex w-full min-w-0 flex-col gap-2 rounded-md px-2.5 py-1.5 text-left outline-hidden ring-ring transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-inset"
      >
        {providers.map((provider) => {
          const label = providerClients.get(provider.driver)?.label ?? String(provider.driver);
          const color = barColor(provider.driver);
          return (
            <div key={provider.driver} className="flex min-w-0 flex-col gap-1.5">
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
                <ProviderInstanceIcon
                  driverKind={provider.driver}
                  displayName={label}
                  size="compact"
                  indicatorBackground="var(--background)"
                  className="size-3.5 shrink-0"
                />
                <span className="truncate">{label}</span>
              </span>
              {provider.windows.map((window) => {
                const low = window.remainingPercent <= PLAN_LIMIT_LOW_PERCENT;
                return (
                  <div key={window.key} className="flex min-w-0 flex-col gap-1">
                    <span className="flex min-w-0 items-baseline gap-2 text-2xs">
                      <span className="truncate text-muted-foreground">{window.label}</span>
                      <span
                        className={cn(
                          "ms-auto shrink-0 font-medium tabular-nums",
                          low ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {window.remainingPercent}% left
                      </span>
                      {window.resetsInMs !== null ? (
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {formatDuration(window.resetsInMs)}
                        </span>
                      ) : null}
                    </span>
                    <span className="relative h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${window.remainingPercent}%`, backgroundColor: color }}
                      />
                    </span>
                  </div>
                );
              })}
              {provider.resetCredits ? (
                <ResetCreditsLine
                  count={provider.resetCredits.count}
                  nextExpiresInMs={provider.resetCredits.nextExpiresInMs}
                />
              ) : null}
            </div>
          );
        })}
      </button>
    </ThreadDetailsSection>
  );
}

function ResetCreditsLine({
  count,
  nextExpiresInMs,
}: {
  readonly count: number;
  readonly nextExpiresInMs: number | null;
}) {
  const expiringSoon =
    nextExpiresInMs !== null && nextExpiresInMs <= PLAN_LIMIT_RESET_EXPIRY_SOON_MS;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
      <TicketIcon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">
        <span className="font-medium text-foreground tabular-nums">{count}</span>{" "}
        {count === 1 ? "reset" : "resets"}
        {nextExpiresInMs !== null ? (
          <>
            {" · "}
            <span className={cn("tabular-nums", expiringSoon && "text-warning")}>
              {count === 1 ? "expires" : "next expires"} in {formatDuration(nextExpiresInMs)}
            </span>
          </>
        ) : null}
      </span>
    </span>
  );
}
