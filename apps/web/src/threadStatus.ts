import type { ThreadStatusColor, ThreadStatusType } from "@t3tools/contracts/settings";

/** Threads carry their status as one `status:<id>` tag, so renaming a status keeps its threads. */
const THREAD_STATUS_TAG_PREFIX = "status:";

function threadStatusTag(id: string): string {
  return `${THREAD_STATUS_TAG_PREFIX}${id}`;
}

/**
 * The thread's status among the defined ones. The newest tag wins should a thread carry two,
 * and a tag whose status was removed from settings shows nothing.
 */
export function resolveThreadStatus(
  tags: ReadonlyArray<string> | undefined,
  types: ReadonlyArray<ThreadStatusType>,
): ThreadStatusType | null {
  for (const tag of (tags ?? []).toReversed()) {
    if (!tag.startsWith(THREAD_STATUS_TAG_PREFIX)) continue;
    const type = types.find(
      (candidate) => candidate.id === tag.slice(THREAD_STATUS_TAG_PREFIX.length),
    );
    if (type) return type;
  }
  return null;
}

/** The tag writes that leave the thread with only `nextId`'s status, or none for null. */
export function planThreadStatusChange(
  tags: ReadonlyArray<string> | undefined,
  nextId: string | null,
): ReadonlyArray<{ readonly tag: string; readonly tagged: boolean }> {
  const next = nextId === null ? null : threadStatusTag(nextId);
  const current = (tags ?? []).filter((tag) => tag.startsWith(THREAD_STATUS_TAG_PREFIX));
  return [
    ...(next !== null && !current.includes(next) ? [{ tag: next, tagged: true }] : []),
    ...current.filter((tag) => tag !== next).map((tag) => ({ tag, tagged: false })),
  ];
}

export interface ThreadStatusGroup<Thread> {
  /** The status id, or null for threads without one. */
  readonly status: ThreadStatusType | null;
  readonly threads: readonly Thread[];
}

/** Stores a group's collapsed state; never the id of a real status. */
const NO_STATUS_GROUP_KEY = "no-status";

export function threadStatusGroupKey(group: ThreadStatusGroup<unknown>): string {
  return group.status?.id ?? NO_STATUS_GROUP_KEY;
}

/**
 * Threads under their statuses in the order Settings lists them, then those without one.
 * Threads keep their order within a group, and statuses no thread carries are left out.
 */
export function groupThreadsByStatus<Thread>(
  threads: readonly Thread[],
  statusOf: (thread: Thread) => ThreadStatusType | null,
  order: readonly ThreadStatusType[],
): ReadonlyArray<ThreadStatusGroup<Thread>> {
  const byId = new Map<string, Thread[]>();
  const none: Thread[] = [];
  for (const thread of threads) {
    const status = statusOf(thread);
    if (status === null) {
      none.push(thread);
      continue;
    }
    const list = byId.get(status.id);
    if (list) list.push(thread);
    else byId.set(status.id, [thread]);
  }
  const groups: ThreadStatusGroup<Thread>[] = [];
  for (const status of order) {
    const list = byId.get(status.id);
    if (list) groups.push({ status, threads: list });
  }
  if (none.length > 0) groups.push({ status: null, threads: none });
  return groups;
}

/** Native menus draw no colored icons, so their labels lead with a colored emoji instead. */
export const THREAD_STATUS_COLORS: Record<
  ThreadStatusColor,
  {
    readonly label: string;
    readonly emoji: string;
    readonly swatchClassName: string;
    /** Light enough that the row's text, hover and selection still read through it. */
    readonly tintClassName: string;
  }
> = {
  green: {
    label: "Green",
    emoji: "🟢",
    swatchClassName: "bg-emerald-500",
    tintClassName: "bg-emerald-500/15 dark:bg-emerald-400/15",
  },
  yellow: {
    label: "Yellow",
    emoji: "🟡",
    swatchClassName: "bg-amber-400",
    tintClassName: "bg-amber-400/20 dark:bg-amber-300/15",
  },
  orange: {
    label: "Orange",
    emoji: "🟠",
    swatchClassName: "bg-orange-500",
    tintClassName: "bg-orange-500/15 dark:bg-orange-400/15",
  },
  red: {
    label: "Red",
    emoji: "🔴",
    swatchClassName: "bg-red-500",
    tintClassName: "bg-red-500/15 dark:bg-red-400/15",
  },
  purple: {
    label: "Purple",
    emoji: "🟣",
    swatchClassName: "bg-violet-500",
    tintClassName: "bg-violet-500/15 dark:bg-violet-400/15",
  },
  blue: {
    label: "Blue",
    emoji: "🔵",
    swatchClassName: "bg-sky-500",
    tintClassName: "bg-sky-500/15 dark:bg-sky-400/15",
  },
  brown: {
    label: "Brown",
    emoji: "🟤",
    swatchClassName: "bg-amber-800 dark:bg-amber-700",
    tintClassName: "bg-amber-800/15 dark:bg-amber-600/20",
  },
  gray: {
    label: "Gray",
    emoji: "⚪",
    swatchClassName: "bg-zinc-400 dark:bg-zinc-500",
    tintClassName: "bg-zinc-500/15 dark:bg-zinc-400/15",
  },
};
