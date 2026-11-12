import type { ClientSettings } from "@t3tools/contracts";
import type { ReactNode } from "react";

import {
  getClientSettings,
  updateClientSettings,
  useClientSettings,
} from "../../hooks/useSettings";
import {
  resolveThreadDetailsVisibility,
  setThreadDetailsItem,
  THREAD_DETAILS_ITEMS,
} from "../chat/threadDetailsItems";
import { Switch } from "../ui/switch";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting, type SettingsSearchItemId } from "./settingsSearch";
import { ThreadStatusTypesRow } from "./ThreadStatusTypesSettings";

type ForkSwitchKey = {
  [Key in keyof ClientSettings]: ClientSettings[Key] extends boolean ? Key : never;
}[keyof ClientSettings];

const NESTED_ROW_CLASS_NAME = "px-0 py-2 sm:px-0";

/** Features this fork adds on top of T3 Code, each with a switch to turn it off. */
export function ForkSettingsPanel() {
  const statusesEnabled = useClientSettings((settings) => settings.threadStatusesEnabled);
  return (
    <SettingsPageContainer>
      <SettingsSection id="fork-features" title="Fork features">
        <ForkSwitchRow
          id="thread-statuses-enabled"
          settingKey="threadStatusesEnabled"
          description="Set a status on a thread from its right-click menu. The status color shows on its sidebar row."
        >
          {statusesEnabled ? (
            <div className="mt-2 mb-2 border-l-2 border-border/60 ps-3">
              <ThreadStatusTypesRow className={NESTED_ROW_CLASS_NAME} />
              <ForkSwitchRow
                id="thread-status-fills-row"
                settingKey="threadStatusFillsRow"
                className={NESTED_ROW_CLASS_NAME}
                description="Tint the whole sidebar row in its status color, instead of a bar along its left edge."
              />
              <ForkSwitchRow
                id="sidebar-group-by-status"
                settingKey="sidebarGroupByStatus"
                className={NESTED_ROW_CLASS_NAME}
                description="Split Active into a heading per status, in the order listed above, with threads without a status last. Off while project folders are on in Labs."
              />
            </div>
          ) : null}
        </ForkSwitchRow>
        <ForkSwitchRow
          id="sidebar-peek-on-hover"
          settingKey="sidebarPeekOnHover"
          description="When the sidebar is hidden, rest the pointer on the window's left edge to show it over the page."
        />
        <PlanLimitsRow />
        <ForkSwitchRow
          id="pull-request-team-filter"
          settingKey="pullRequestTeamFilterEnabled"
          description="Add a Team filter to the pull request list, showing pull requests opened by anyone on the team."
        />
        <ForkSwitchRow
          id="pull-request-team-reviewers"
          settingKey="pullRequestTeamReviewersEnabled"
          description="Offer your organization's teams, not just people, when adding reviewers to a pull request."
        />
        <ForkSwitchRow
          id="right-panel-tab-double-click"
          settingKey="rightPanelTabDoubleClickMaximizes"
          description="Double-click a tab in the right panel, such as a pull request, to fill the window with it. Double-click again to go back."
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}

function ForkSwitchRow(props: {
  id: SettingsSearchItemId;
  settingKey: ForkSwitchKey;
  description: string;
  className?: string;
  children?: ReactNode;
}) {
  const checked = useClientSettings((settings) => settings[props.settingKey]);
  const search = searchableSetting(props.id);
  return (
    <SettingsRow
      {...search}
      className={props.className}
      description={props.description}
      control={
        <Switch
          checked={checked}
          onCheckedChange={(next) => updateClientSettings({ [props.settingKey]: Boolean(next) })}
          aria-label={search.title}
        />
      }
    >
      {props.children}
    </SettingsRow>
  );
}

const PLAN_LIMITS_ITEM = THREAD_DETAILS_ITEMS.find((item) => item.id === "planLimits")!;

/** The same choice as Plan limits in the thread details card's menu. */
function PlanLimitsRow() {
  const visible = useClientSettings(
    (settings) => resolveThreadDetailsVisibility(settings).planLimits,
  );
  return (
    <SettingsRow
      {...searchableSetting("plan-limits-details")}
      description="Show every provider's plan limits and reset credits in the thread details panel."
      control={
        <Switch
          checked={visible}
          onCheckedChange={(checked) =>
            updateClientSettings({
              threadDetailsItems: setThreadDetailsItem(
                getClientSettings(),
                PLAN_LIMITS_ITEM,
                Boolean(checked),
              ),
            })
          }
          aria-label="Plan limits in thread details"
        />
      }
    />
  );
}
