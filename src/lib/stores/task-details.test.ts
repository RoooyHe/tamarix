import { describe, it, expect, vi, beforeEach } from "vitest";
import { TAMARIX_EVENT_TYPES } from "$lib/matrix/event-types";
import { createTaskDetailsState } from "./task-details";
import type { Task, Comment, ApprovalState } from "$lib/matrix/task-types";

// ─── Mocks ───────────────────────────────────────────────────────

function mockStateEvent(content: Record<string, unknown>, stateKey = "") {
  return {
    getContent: () => content,
    getStateKey: () => stateKey,
    getId: () => `$event_${stateKey || "default"}`,
    getTs: () => Date.now(),
    getType: () => "m.room.message",
    getSender: () => "@user:example.com",
  };
}

function mockRoom(stateEvents: Record<string, Array<{ content: Record<string, unknown>; stateKey?: string }>> = {}) {
  return {
    roomId: "!task:example.com",
    currentState: {
      getStateEvents: (eventType: string, stateKey?: string) => {
        const events = stateEvents[eventType] ?? [];
        if (stateKey !== undefined) {
          return events.find((e) => (e.stateKey ?? "") === stateKey)
            ? mockStateEvent(
                events.find((e) => (e.stateKey ?? "") === stateKey)!.content,
                stateKey
              )
            : null;
        }
        return events.map((e) => mockStateEvent(e.content, e.stateKey ?? ""));
      },
    },
    getLiveTimeline: () => ({
      getEvents: () => [],
    }),
  };
}

function mockClient(rooms: Record<string, ReturnType<typeof mockRoom>> = {}) {
  return {
    getRoom: (roomId: string) => rooms[roomId] ?? null,
    sendStateEvent: vi.fn().mockResolvedValue(undefined),
    getUserId: () => "@user:example.com",
    on: vi.fn(),
    removeListener: vi.fn(),
  } as any;
}

const TASK: Task = {
  roomId: "!task:example.com",
  title: "Test Task",
  status: "todo",
  tags: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const PROJECT_ID = "!project:example.com";

// ─── Tests ───────────────────────────────────────────────────────

describe("createTaskDetailsState", () => {
  let state: ReturnType<typeof createTaskDetailsState>;

  beforeEach(() => {
    state = createTaskDetailsState();
  });

  describe("load", () => {
    it("loads approval state from task room", () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.APPROVAL]: [
          { content: { status: "pending", required_approvals: 2, current_approvals: 1 } },
        ],
      });
      const projectRoom = mockRoom();
      const client = mockClient({
        "!task:example.com": taskRoom,
        "!project:example.com": projectRoom,
      });

      state.load(client, TASK, PROJECT_ID);

      expect(state.approvalState).toEqual({
        status: "pending",
        requiredApprovals: 2,
        currentApprovals: 1,
      });
    });

    it("loads approval config from project room", () => {
      const taskRoom = mockRoom();
      const projectRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.APPROVAL_CONFIG]: [
          { content: { enabled: true, required_approvals: 3 } },
        ],
      });
      const client = mockClient({
        "!task:example.com": taskRoom,
        "!project:example.com": projectRoom,
      });

      state.load(client, TASK, PROJECT_ID);

      expect(state.approvalConfig).toEqual({
        enabled: true,
        requiredApprovals: 3,
      });
    });

    it("loads custom field definitions from project room", () => {
      const taskRoom = mockRoom();
      const projectRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.CUSTOM_FIELD]: [
          { content: { label: "Story Points", type: "number", required: true }, stateKey: "story_points" },
          { content: { label: "Severity", type: "select", options: ["low", "high"] }, stateKey: "severity" },
        ],
      });
      const client = mockClient({
        "!task:example.com": taskRoom,
        "!project:example.com": projectRoom,
      });

      state.load(client, TASK, PROJECT_ID);

      expect(state.customFieldDefs.size).toBe(2);
      expect(state.customFieldDefs.get("story_points")).toEqual({
        label: "Story Points",
        type: "number",
        required: true,
      });
      expect(state.customFieldDefs.get("severity")).toEqual({
        label: "Severity",
        type: "select",
        options: ["low", "high"],
      });
    });

    it("loads custom field values from task room", () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE]: [
          { content: { value: 5 }, stateKey: "story_points" },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });

      state.load(client, TASK, PROJECT_ID);

      expect(state.customFieldValues.get("story_points")).toEqual({ value: 5 });
    });

    it("loads external links from task room", () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.EXTERNAL_LINK]: [
          { content: { url: "https://github.com/org/repo", label: "Repo" }, stateKey: "repo_123" },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });

      state.load(client, TASK, PROJECT_ID);

      expect(state.externalLinks).toEqual([
        { url: "https://github.com/org/repo", label: "Repo", stateKey: "repo_123" },
      ]);
    });

    it("loads task version from task room", () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.TASK_VERSION]: [
          { content: { version: "v1.0" } },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });

      state.load(client, TASK, PROJECT_ID);

      expect(state.currentVersion).toBe("v1.0");
    });

    it("handles missing rooms gracefully", () => {
      const client = mockClient({});

      state.load(client, TASK, PROJECT_ID);

      expect(state.approvalState).toBeNull();
      expect(state.approvalConfig).toEqual({ enabled: false, requiredApprovals: 1 });
      expect(state.customFieldDefs.size).toBe(0);
      expect(state.customFieldValues.size).toBe(0);
      expect(state.externalLinks).toEqual([]);
      expect(state.currentVersion).toBeNull();
    });
  });

  describe("setComments", () => {
    it("derives commit links from GitHub commit notices", () => {
      const comments: Comment[] = [
        {
          eventId: "$evt1",
          sender: "@user:example.com",
          content: "[GitHub] org/repo@main: abc1234 - Fix login bug",
          timestamp: 1000,
        },
        {
          eventId: "$evt2",
          sender: "@user:example.com",
          content: "This is a regular comment, not a commit",
          timestamp: 2000,
        },
        {
          eventId: "$evt3",
          sender: "@user:example.com",
          content: "[GitLab] org/project@develop: def5678 - Add tests",
          timestamp: 3000,
        },
      ];

      state.setComments(comments);

      expect(state.commitLinks).toHaveLength(2);
      expect(state.commitLinks[0]).toEqual({
        eventId: "$evt1",
        timestamp: 1000,
        provider: "GitHub",
        repo: "org/repo",
        branch: "main",
        hash: "abc1234",
        message: "Fix login bug",
      });
      expect(state.commitLinks[1]).toEqual({
        eventId: "$evt3",
        timestamp: 3000,
        provider: "GitLab",
        repo: "org/project",
        branch: "develop",
        hash: "def5678",
        message: "Add tests",
      });
    });

    it("returns empty array for no commit comments", () => {
      state.setComments([
        { eventId: "$1", sender: "@u:x", content: "Regular comment", timestamp: 1 },
      ]);
      expect(state.commitLinks).toEqual([]);
    });
  });

  describe("handleAddExternalLink", () => {
    it("adds a valid external link", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.EXTERNAL_LINK]: [
          { content: { url: "https://example.com", label: "Example" }, stateKey: "example_1" },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });

      state.load(client, TASK, PROJECT_ID);
      const result = await state.handleAddExternalLink("https://new.com", "New Link");

      expect(result).toEqual({});
      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.EXTERNAL_LINK,
        { url: "https://new.com", label: "New Link" },
        expect.any(String)
      );
    });

    it("rejects invalid URLs", async () => {
      const client = mockClient({});
      state.load(client, TASK, PROJECT_ID);

      const result = await state.handleAddExternalLink("not-a-url", "Bad Link");
      expect(result.error).toBe("Invalid URL");
    });

    it("sanitizes URLs without protocol", async () => {
      const client = mockClient({ "!task:example.com": mockRoom() });
      state.load(client, TASK, PROJECT_ID);

      await state.handleAddExternalLink("example.com", "Example");

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.EXTERNAL_LINK,
        { url: "https://example.com", label: "Example" },
        expect.any(String)
      );
    });
  });

  describe("handleRemoveExternalLink", () => {
    it("removes an external link by state key", async () => {
      const client = mockClient({ "!task:example.com": mockRoom() });
      state.load(client, TASK, PROJECT_ID);

      await state.handleRemoveExternalLink("link_123");

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.EXTERNAL_LINK,
        {},
        "link_123"
      );
    });
  });

  describe("handleCustomFieldChange", () => {
    it("sets a custom field value and refreshes", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE]: [
          { content: { value: 8 }, stateKey: "story_points" },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });
      state.load(client, TASK, PROJECT_ID);

      await state.handleCustomFieldChange("story_points", 8);

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE,
        { value: 8 },
        "story_points"
      );
      expect(state.customFieldValues.get("story_points")).toEqual({ value: 8 });
    });
  });

  describe("handleVersionChange", () => {
    it("sets a version", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.TASK_VERSION]: [{ content: { version: "v2.0" } }],
      });
      const client = mockClient({ "!task:example.com": taskRoom });
      state.load(client, TASK, PROJECT_ID);

      await state.handleVersionChange("v2.0");

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.TASK_VERSION,
        { version: "v2.0" },
        ""
      );
      expect(state.currentVersion).toBe("v2.0");
    });

    it("clears version when null", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.TASK_VERSION]: [{ content: { version: "" } }],
      });
      const client = mockClient({ "!task:example.com": taskRoom });
      state.load(client, TASK, PROJECT_ID);

      await state.handleVersionChange(null);

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.TASK_VERSION,
        { version: "" },
        ""
      );
    });
  });

  describe("handleRequestApproval", () => {
    it("requests approval with configured count", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.APPROVAL]: [
          { content: { status: "pending", required_approvals: 2, current_approvals: 0 } },
        ],
      });
      const projectRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.APPROVAL_CONFIG]: [
          { content: { enabled: true, required_approvals: 2 } },
        ],
      });
      const client = mockClient({
        "!task:example.com": taskRoom,
        "!project:example.com": projectRoom,
      });
      state.load(client, TASK, PROJECT_ID);

      await state.handleRequestApproval();

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.APPROVAL,
        { status: "pending", required_approvals: 2, current_approvals: 0 },
        ""
      );
    });
  });

  describe("handleApprove", () => {
    it("increments approval count", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.APPROVAL]: [
          { content: { status: "pending", required_approvals: 2, current_approvals: 1 } },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });
      state.load(client, TASK, PROJECT_ID);

      await state.handleApprove();

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.APPROVAL,
        { status: "approved", required_approvals: 2, current_approvals: 2 },
        ""
      );
    });
  });

  describe("handleReject", () => {
    it("sets status to rejected", async () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.APPROVAL]: [
          { content: { status: "pending", required_approvals: 2, current_approvals: 1 } },
        ],
      });
      const client = mockClient({ "!task:example.com": taskRoom });
      state.load(client, TASK, PROJECT_ID);

      await state.handleReject();

      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        TAMARIX_EVENT_TYPES.APPROVAL,
        { status: "rejected", required_approvals: 2, current_approvals: 1 },
        ""
      );
    });
  });

  describe("refresh", () => {
    it("re-reads room state", () => {
      const taskRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.TASK_VERSION]: [{ content: { version: "v1.0" } }],
      });
      const client = mockClient({ "!task:example.com": taskRoom });
      state.load(client, TASK, PROJECT_ID);
      expect(state.currentVersion).toBe("v1.0");

      // Simulate version change in room
      const updatedRoom = mockRoom({
        [TAMARIX_EVENT_TYPES.TASK_VERSION]: [{ content: { version: "v2.0" } }],
      });
      const updatedClient = mockClient({ "!task:example.com": updatedRoom });

      state.refresh(updatedClient, TASK, PROJECT_ID);
      expect(state.currentVersion).toBe("v2.0");
    });
  });
});
