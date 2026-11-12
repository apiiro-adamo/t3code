import { describe, expect, it } from "vite-plus/test";

import { groupThreadsByStatus, planThreadStatusChange, resolveThreadStatus } from "./threadStatus";

const types = [
  { id: "in-progress", name: "In progress", color: "green" },
  { id: "in-review", name: "In review", color: "yellow" },
] as const;

describe("resolveThreadStatus", () => {
  it("reads the newest status tag a defined status matches", () => {
    expect(resolveThreadStatus(["status:in-progress", "pr", "status:in-review"], types)?.id).toBe(
      "in-review",
    );
    expect(resolveThreadStatus(["status:in-progress", "status:removed"], types)?.id).toBe(
      "in-progress",
    );
  });

  it("shows nothing for untagged threads or a status removed from settings", () => {
    expect(resolveThreadStatus(undefined, types)).toBeNull();
    expect(resolveThreadStatus(["status:removed", "other"], types)).toBeNull();
  });
});

describe("planThreadStatusChange", () => {
  it("adds the new status before taking every other one off", () => {
    expect(
      planThreadStatusChange(["status:in-progress", "keep", "status:removed"], "in-review"),
    ).toEqual([
      { tag: "status:in-review", tagged: true },
      { tag: "status:in-progress", tagged: false },
      { tag: "status:removed", tagged: false },
    ]);
  });

  it("writes nothing when the thread already has only that status", () => {
    expect(planThreadStatusChange(["status:in-review", "keep"], "in-review")).toEqual([]);
  });

  it("clears every status tag and leaves the rest", () => {
    expect(planThreadStatusChange(["keep", "status:in-review"], null)).toEqual([
      { tag: "status:in-review", tagged: false },
    ]);
  });
});

describe("groupThreadsByStatus", () => {
  it("orders groups as Settings lists the statuses, then threads without one", () => {
    const threads = [
      { id: "a", status: types[1] },
      { id: "b", status: null },
      { id: "c", status: types[0] },
      { id: "d", status: types[1] },
    ];
    const groups = groupThreadsByStatus(threads, (thread) => thread.status, types);
    expect(
      groups.map((group) => [group.status?.id ?? null, group.threads.map((thread) => thread.id)]),
    ).toEqual([
      ["in-progress", ["c"]],
      ["in-review", ["a", "d"]],
      [null, ["b"]],
    ]);
  });

  it("leaves out statuses no thread carries", () => {
    const groups = groupThreadsByStatus([{ status: null }], (thread) => thread.status, types);
    expect(groups.map((group) => group.status)).toEqual([null]);
  });
});
