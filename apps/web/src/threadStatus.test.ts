import { describe, expect, it } from "vite-plus/test";

import { planThreadStatusChange, resolveThreadStatus } from "./threadStatus";

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
