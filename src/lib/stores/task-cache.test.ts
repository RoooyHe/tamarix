import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTaskCache } from "./task-cache";
import type { Task } from "$lib/matrix/task-types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    roomId: "!task:example.com",
    title: "Test Task",
    status: "todo",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("createTaskCache", () => {
  let cache: ReturnType<typeof createTaskCache>;

  beforeEach(() => {
    cache = createTaskCache();
  });

  describe("upsert and getTasks", () => {
    it("adds a task and retrieves it", () => {
      const task = makeTask({ roomId: "!task1:example.com" });
      cache.upsert(task);
      expect(cache.getTasks()).toEqual([task]);
    });

    it("updates an existing task", () => {
      const task = makeTask({ roomId: "!task1:example.com", title: "Original" });
      cache.upsert(task);
      cache.upsert({ ...task, title: "Updated" });
      expect(cache.getTasks()).toHaveLength(1);
      expect(cache.getTasks()[0].title).toBe("Updated");
    });

    it("maintains insertion order", () => {
      cache.upsert(makeTask({ roomId: "!task1:example.com" }));
      cache.upsert(makeTask({ roomId: "!task2:example.com" }));
      cache.upsert(makeTask({ roomId: "!task3:example.com" }));
      const ids = cache.getTasks().map(t => t.roomId);
      expect(ids).toEqual(["!task1:example.com", "!task2:example.com", "!task3:example.com"]);
    });
  });

  describe("remove", () => {
    it("removes a task", () => {
      cache.upsert(makeTask({ roomId: "!task1:example.com" }));
      cache.upsert(makeTask({ roomId: "!task2:example.com" }));
      cache.remove("!task1:example.com");
      expect(cache.getTasks()).toHaveLength(1);
      expect(cache.getTasks()[0].roomId).toBe("!task2:example.com");
    });

    it("removes task from project index", () => {
      const task = makeTask({ roomId: "!task1:example.com", projectRoomId: "!project:example.com" });
      cache.upsert(task);
      expect(cache.getByProject("!project:example.com")).toHaveLength(1);
      cache.remove("!task1:example.com");
      expect(cache.getByProject("!project:example.com")).toHaveLength(0);
    });

    it("no-op when removing non-existent task", () => {
      cache.upsert(makeTask({ roomId: "!task1:example.com" }));
      cache.remove("!nonexistent:example.com");
      expect(cache.getTasks()).toHaveLength(1);
    });
  });

  describe("getByRoomId", () => {
    it("returns task by room ID", () => {
      const task = makeTask({ roomId: "!task1:example.com" });
      cache.upsert(task);
      expect(cache.getByRoomId("!task1:example.com")).toEqual(task);
    });

    it("returns undefined for unknown room ID", () => {
      expect(cache.getByRoomId("!unknown:example.com")).toBeUndefined();
    });
  });

  describe("getByProject", () => {
    it("returns tasks for a project", () => {
      cache.upsert(makeTask({ roomId: "!t1:example.com", projectRoomId: "!proj:example.com" }));
      cache.upsert(makeTask({ roomId: "!t2:example.com", projectRoomId: "!proj:example.com" }));
      cache.upsert(makeTask({ roomId: "!t3:example.com", projectRoomId: "!other:example.com" }));
      expect(cache.getByProject("!proj:example.com")).toHaveLength(2);
    });

    it("returns empty array for unknown project", () => {
      expect(cache.getByProject("!unknown:example.com")).toEqual([]);
    });
  });

  describe("getById", () => {
    it("finds by ticket ID", () => {
      const task = makeTask({ roomId: "!task1:example.com", ticketId: "TAM-42" });
      cache.upsert(task);
      expect(cache.getById("TAM-42")).toEqual(task);
    });

    it("falls back to room ID", () => {
      const task = makeTask({ roomId: "!task1:example.com" });
      cache.upsert(task);
      expect(cache.getById("!task1:example.com")).toEqual(task);
    });

    it("returns undefined for unknown ID", () => {
      expect(cache.getById("UNKNOWN")).toBeUndefined();
    });
  });

  describe("project index management", () => {
    it("indexes tasks by project", () => {
      cache.upsert(makeTask({ roomId: "!t1:example.com", projectRoomId: "!proj:example.com" }));
      cache.upsert(makeTask({ roomId: "!t2:example.com", projectRoomId: "!proj:example.com" }));
      expect(cache.getByProject("!proj:example.com")).toHaveLength(2);
    });

    it("reindexes when project changes", () => {
      const task = makeTask({ roomId: "!t1:example.com", projectRoomId: "!proj1:example.com" });
      cache.upsert(task);
      expect(cache.getByProject("!proj1:example.com")).toHaveLength(1);
      expect(cache.getByProject("!proj2:example.com")).toHaveLength(0);

      cache.upsert({ ...task, projectRoomId: "!proj2:example.com" });
      expect(cache.getByProject("!proj1:example.com")).toHaveLength(0);
      expect(cache.getByProject("!proj2:example.com")).toHaveLength(1);
    });

    it("removes from old project when task moves", () => {
      cache.upsert(makeTask({ roomId: "!t1:example.com", projectRoomId: "!proj1:example.com" }));
      cache.upsert(makeTask({ roomId: "!t1:example.com", projectRoomId: "!proj2:example.com" }));
      expect(cache.getByProject("!proj1:example.com")).toHaveLength(0);
      expect(cache.getByProject("!proj2:example.com")).toHaveLength(1);
    });
  });
});
