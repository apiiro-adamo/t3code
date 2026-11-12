import type { ThreadStatusType } from "@t3tools/contracts/settings";
import { memo } from "react";

import { cn } from "~/lib/utils";
import { THREAD_STATUS_COLORS } from "../../threadStatus";
import { CollapsibleSectionHeader } from "../ui/collapsible-section-header";

/** The status group's sidebar tree row; its thread rows name it as their parent. */
export function sidebarStatusGroupRowId(groupKey: string) {
  return `status-group:${groupKey}`;
}

/** A status's heading inside Active, read like a shelf header with its thread count. */
export const SidebarStatusGroupHeader = memo(function SidebarStatusGroupHeader(props: {
  groupKey: string;
  status: ThreadStatusType | null;
  count: number;
  collapsed: boolean;
  onToggle: (groupKey: string) => void;
}) {
  return (
    <li data-testid="sidebar-status-group" className="relative mx-0.5 mt-1 list-none first:mt-0">
      <CollapsibleSectionHeader
        data-sidebar-row={sidebarStatusGroupRowId(props.groupKey)}
        expanded={!props.collapsed}
        onClick={() => props.onToggle(props.groupKey)}
        accessory={<span className="font-normal tabular-nums">{props.count}</span>}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              props.status === null
                ? "border border-sidebar-muted-foreground/60"
                : THREAD_STATUS_COLORS[props.status.color].swatchClassName,
            )}
          />
          <span className="truncate">{props.status?.name ?? "No status"}</span>
        </span>
      </CollapsibleSectionHeader>
    </li>
  );
});
