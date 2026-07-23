import { describe, it, expect } from "vitest";
import { canTransition, getAllowedNextStatuses, VALID_TRANSITIONS } from "./workflow";

describe("workflow", () => {
  describe("canTransition", () => {
    it("allows no-op transitions (same status)", () => {
      expect(canTransition("todo", "todo")).toBe(true);
      expect(canTransition("in_progress", "in_progress")).toBe(true);
      expect(canTransition("done", "done")).toBe(true);
    });

    it("allows valid forward transitions", () => {
      expect(canTransition("todo", "in_progress")).toBe(true);
      expect(canTransition("in_progress", "review")).toBe(true);
      expect(canTransition("review", "done")).toBe(true);
      expect(canTransition("done", "closed")).toBe(true);
    });

    it("allows valid backward transitions", () => {
      expect(canTransition("in_progress", "todo")).toBe(true);
      expect(canTransition("review", "in_progress")).toBe(true);
    });

    it("allows skip-to-closed from any non-closed status", () => {
      expect(canTransition("todo", "closed")).toBe(true);
      expect(canTransition("in_progress", "closed")).toBe(true);
      expect(canTransition("review", "closed")).toBe(true);
      expect(canTransition("done", "closed")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(canTransition("todo", "review")).toBe(false);
      expect(canTransition("todo", "done")).toBe(false);
      expect(canTransition("done", "todo")).toBe(false);
      expect(canTransition("done", "in_progress")).toBe(false);
      expect(canTransition("closed", "todo")).toBe(false);
      expect(canTransition("closed", "done")).toBe(false);
    });

    it("closed has no outgoing transitions", () => {
      expect(canTransition("closed", "todo")).toBe(false);
      expect(canTransition("closed", "in_progress")).toBe(false);
      expect(canTransition("closed", "review")).toBe(false);
      expect(canTransition("closed", "done")).toBe(false);
    });
  });

  describe("getAllowedNextStatuses", () => {
    it("returns correct next statuses for todo", () => {
      expect(getAllowedNextStatuses("todo")).toEqual(["in_progress", "closed"]);
    });

    it("returns correct next statuses for in_progress", () => {
      expect(getAllowedNextStatuses("in_progress")).toEqual(["review", "todo", "closed"]);
    });

    it("returns correct next statuses for review", () => {
      expect(getAllowedNextStatuses("review")).toEqual(["done", "in_progress", "closed"]);
    });

    it("returns correct next statuses for done", () => {
      expect(getAllowedNextStatuses("done")).toEqual(["closed"]);
    });

    it("returns empty array for closed", () => {
      expect(getAllowedNextStatuses("closed")).toEqual([]);
    });
  });

  describe("VALID_TRANSITIONS", () => {
    it("has entries for all 5 statuses", () => {
      expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(5);
      expect(VALID_TRANSITIONS).toHaveProperty("todo");
      expect(VALID_TRANSITIONS).toHaveProperty("in_progress");
      expect(VALID_TRANSITIONS).toHaveProperty("review");
      expect(VALID_TRANSITIONS).toHaveProperty("done");
      expect(VALID_TRANSITIONS).toHaveProperty("closed");
    });
  });
});
