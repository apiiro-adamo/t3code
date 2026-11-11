import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import type { ThreadStatusType } from "@t3tools/contracts/settings";

import { appAtomRegistry } from "../rpc/atomRegistry";
import { readThreadShell } from "../state/entities";
import { serverEnvironment } from "../state/server";
import { resolveThreadStatus } from "../threadStatus";
import type { ThreadActionMenuState } from "./threadActionMenu.logic";

export const THREAD_STATUS_SETTINGS_LINK = {
  to: "/settings/threads",
  hash: "thread-statuses",
} as const;

/** The Status menu for a thread, from its environment's statuses, read when the menu opens. */
export function readThreadStatusMenu(threadRef: ScopedThreadRef): ThreadActionMenuState["status"] {
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
  const types = useAtomValue(serverEnvironment.settingsValueAtom(environmentId))?.threadStatusTypes;
  return types === undefined ? null : resolveThreadStatus(tags, types);
}
