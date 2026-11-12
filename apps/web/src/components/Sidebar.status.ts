import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import type { ThreadStatusType } from "@t3tools/contracts/settings";
import { Atom } from "effect/reactivity";

import { environmentCatalog } from "~/connection/catalog";

import { getClientSettings, useClientSettings } from "../hooks/useSettings";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { readThreadShell } from "../state/entities";
import { serverEnvironment } from "../state/server";
import { resolveThreadStatus } from "../threadStatus";
import type { ThreadActionMenuState } from "./threadActionMenu.logic";

export const THREAD_STATUS_SETTINGS_LINK = {
  to: "/settings/fork",
  hash: "thread-statuses",
} as const;

/**
 * The Status menu for a thread, from its environment's statuses, read when the menu opens.
 * None while statuses are turned off in Fork features.
 */
export function readThreadStatusMenu(threadRef: ScopedThreadRef): ThreadActionMenuState["status"] {
  if (!getClientSettings().threadStatusesEnabled) return undefined;
  const types = appAtomRegistry.get(
    serverEnvironment.settingsValueAtom(threadRef.environmentId),
  )?.threadStatusTypes;
  if (types === undefined) return undefined;
  const tags = readThreadShell(threadRef)?.source.tags;
  return { types, currentId: resolveThreadStatus(tags, types)?.id ?? null };
}

/** The status a thread row shows, following edits to the environment's statuses. */
export function useThreadStatus(
  environmentId: EnvironmentId,
  tags: ReadonlyArray<string> | undefined,
): ThreadStatusType | null {
  const enabled = useClientSettings((settings) => settings.threadStatusesEnabled);
  const types = useAtomValue(serverEnvironment.settingsValueAtom(environmentId))?.threadStatusTypes;
  return !enabled || types === undefined ? null : resolveThreadStatus(tags, types);
}

const threadStatusTypesByEnvironmentAtom = Atom.make(
  (get) =>
    new Map(
      [...get(environmentCatalog.catalogValueAtom).entries.keys()].flatMap((environmentId) => {
        const types = get(serverEnvironment.settingsValueAtom(environmentId))?.threadStatusTypes;
        return types === undefined ? [] : [[environmentId, types] as const];
      }),
    ),
).pipe(Atom.withLabel("web-thread-status-types-by-environment"));

export interface ThreadStatusGrouping {
  /** Every environment's statuses, each id once, in the order Settings lists them. */
  readonly order: readonly ThreadStatusType[];
  readonly statusOf: (thread: {
    readonly environmentId: EnvironmentId;
    readonly source: { readonly tags?: ReadonlyArray<string> | undefined };
  }) => ThreadStatusType | null;
}

/** How Active groups its threads by status, or null while that is off in Fork features. */
export function useThreadStatusGrouping(): ThreadStatusGrouping | null {
  const enabled = useClientSettings(
    (settings) => settings.threadStatusesEnabled && settings.sidebarGroupByStatus,
  );
  const typesByEnvironment = useAtomValue(threadStatusTypesByEnvironmentAtom);
  if (!enabled || typesByEnvironment.size === 0) return null;
  const order = [
    ...new Map(
      [...typesByEnvironment.values()].flat().map((type) => [type.id, type] as const),
    ).values(),
  ];
  return {
    order,
    statusOf: (thread) => {
      const types = typesByEnvironment.get(thread.environmentId);
      return types === undefined ? null : resolveThreadStatus(thread.source.tags, types);
    },
  };
}
