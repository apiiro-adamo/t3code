import { useState } from "react";
import {
  MAX_THREAD_STATUS_NAME_LENGTH,
  MAX_THREAD_STATUS_TYPES,
  ThreadStatusColor,
  type ThreadStatusType,
} from "@t3tools/contracts/settings";
import * as Equal from "effect/Equal";
import * as Schema from "effect/Schema";
import { PlusIcon, XIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { THREAD_STATUS_COLORS } from "../../threadStatus";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

const COLOR_LABELS = Object.fromEntries(
  ThreadStatusColor.literals.map((color) => [color, THREAD_STATUS_COLORS[color].label]),
) as Record<ThreadStatusColor, string>;
const isThreadStatusColor = Schema.is(ThreadStatusColor);

function newStatus(types: ReadonlyArray<ThreadStatusType>): ThreadStatusType {
  const usedColors = new Set(types.map((type) => type.color));
  const usedIds = new Set(types.map((type) => type.id));
  // Threads keep the id in their tag, so it never changes once made, whatever the name becomes.
  // A number past every earlier one also keeps a removed status's threads from picking up a new one.
  const taken = types.flatMap((type) => {
    const match = /^status-(\d+)$/.exec(type.id);
    return match ? [Number(match[1])] : [];
  });
  let next = Math.max(0, ...taken) + 1;
  while (usedIds.has(`status-${next}`)) next += 1;
  return {
    id: `status-${next}`,
    name: "New status",
    color: ThreadStatusColor.literals.find((color) => !usedColors.has(color)) ?? "blue",
  };
}

/** Edits the statuses offered in every thread's Status menu. */
export function ThreadStatusTypesRow(props: { className?: string }) {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const saved = settings.threadStatusTypes;
  // Edits build on a local copy, so a second edit before the first save echoes back keeps both.
  const [types, setTypes] = useState(saved);
  const [savedSource, setSavedSource] = useState<ReadonlyArray<ThreadStatusType> | null>(saved);
  // Environments disagree, so equal-looking edits and Reset must still write to all of them.
  const mixed = useScopedSettingsMixed(["threadStatusTypes"]);
  if (!Equal.equals(savedSource, saved)) {
    setSavedSource(saved);
    setTypes(saved);
  }
  const save = (threadStatusTypes: ReadonlyArray<ThreadStatusType>) => {
    if (!mixed && Equal.equals(threadStatusTypes, types)) return;
    setTypes(threadStatusTypes);
    // Null forces the next render to adopt the saved value again.
    updateSettings({ threadStatusTypes }, { onFailed: () => setSavedSource(null) });
  };
  const replaceAt = (index: number, next: ThreadStatusType) =>
    save(types.map((type, candidate) => (candidate === index ? next : type)));

  return (
    <SettingsRow
      serverScoped
      className={props.className}
      settingKeys={["threadStatusTypes"]}
      {...searchableSetting("thread-statuses")}
      description="Choices in every thread's Status menu. A thread with a status shows its color along the sidebar row's edge."
    >
      <div className="flex flex-col gap-1.5 pt-3 pb-2">
        {types.map((type, index) => (
          <div
            key={type.id}
            role="group"
            aria-label={`Status ${index + 1}`}
            className="flex items-center gap-2"
          >
            <Select
              value={type.color}
              items={COLOR_LABELS}
              onValueChange={(value) => {
                if (isThreadStatusColor(value)) replaceAt(index, { ...type, color: value });
              }}
            >
              <SelectTrigger size="sm" className="w-32" aria-label="Color">
                <ColorSwatch color={type.color} />
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {ThreadStatusColor.literals.map((color) => (
                  <SelectItem hideIndicator key={color} value={color}>
                    <span className="inline-flex items-center gap-2">
                      <ColorSwatch color={color} />
                      {COLOR_LABELS[color]}
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <StatusNameInput
              name={type.name}
              onCommit={(name) => replaceAt(index, { ...type, name })}
            />
            <Button
              variant="ghost-muted"
              size="icon-sm"
              aria-label={`Remove status ${type.name}`}
              onClick={() => save(types.filter((_, candidate) => candidate !== index))}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        {types.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No statuses yet. Add one, pick its color, and it shows in every thread's Status menu.
          </p>
        ) : null}
        <div>
          <Button
            variant="ghost-muted"
            size="compact"
            disabled={types.length >= MAX_THREAD_STATUS_TYPES}
            onClick={() => save([...types, newStatus(types)])}
          >
            <PlusIcon />
            Add status
          </Button>
          {types.length >= MAX_THREAD_STATUS_TYPES ? (
            <span className="ps-2 text-xs text-muted-foreground">
              Up to {MAX_THREAD_STATUS_TYPES} statuses
            </span>
          ) : null}
        </div>
      </div>
    </SettingsRow>
  );
}

function ColorSwatch(props: { color: ThreadStatusColor }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        THREAD_STATUS_COLORS[props.color].swatchClassName,
      )}
    />
  );
}

function StatusNameInput(props: { name: string; onCommit: (name: string) => void }) {
  // Typing stays local until the field commits (blur or Enter), so half-typed names never
  // reach the server, and an emptied name goes back to the saved one.
  const [draft, setDraft] = useState(props.name);
  const [draftSource, setDraftSource] = useState(props.name);
  if (draftSource !== props.name) {
    setDraftSource(props.name);
    setDraft(props.name);
  }
  const commit = () => {
    const name = draft.trim();
    if (name.length === 0) {
      setDraft(props.name);
      return;
    }
    if (name !== props.name) props.onCommit(name);
  };
  return (
    <Input
      nativeInput
      size="sm"
      className="min-w-0 flex-1"
      aria-label="Status name"
      maxLength={MAX_THREAD_STATUS_NAME_LENGTH}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(props.name);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
