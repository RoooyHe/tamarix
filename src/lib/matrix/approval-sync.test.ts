import { describe, it, expect, vi } from "vitest";
import {
  countApprovalReactions,
  computeApprovalStatus,
  syncApprovalFromReactions,
  requestApproval,
  approve,
  reject,
} from "./approval-sync";
import type { ApprovalState } from "./task-types";

function mockReaction(key: string, sender: string) {
  return {
    getType: () => "m.reaction",
    getSender: () => sender,
    getId: () => `$evt_${sender}`,
    getContent: () => ({ "m.relates_to": { key } }),
  };
}

function mockNonReaction() {
  return {
    getType: () => "m.room.message",
    getSender: () => "@user:example.com",
    getId: () => "$evt_msg",
    getContent: () => ({ body: "hello" }),
  };
}

function mockRoom(events: any[] = []) {
  const state: Record<string, any> = {};
  return {
    roomId: "!task:example.com",
    _state: state,
    getLiveTimeline: () => ({
      getEvents: () => events,
    }),
    currentState: {
      getStateEvents: vi.fn((eventType: string, stateKey: string = "") => {
        const key = `${eventType}:${stateKey}`;
        return state[key] ?? null;
      }),
    },
  } as any;
}

function mockClient(rooms: Record<string, any> = {}) {
  return {
    getRoom: vi.fn((roomId: string) => rooms[roomId] ?? null),
    sendStateEvent: vi.fn().mockImplementation(
      (roomId: string, eventType: string, content: any, stateKey: string = "") => {
        const room = rooms[roomId];
        if (room?._state) {
          room._state[`${eventType}:${stateKey}`] = { getContent: () => content };
        }
        return Promise.resolve();
      }
    ),
  } as any;
}

describe("approval-sync", () => {
  describe("countApprovalReactions", () => {
    it("counts approval reactions (+1)", () => {
      const room = mockRoom([
        mockReaction("+1", "@alice:example.com"),
        mockReaction("+1", "@bob:example.com"),
      ]);
      const result = countApprovalReactions(room);
      expect(result).toEqual({ approvals: 2, rejections: 0 });
    });

    it("counts rejection reactions (-1)", () => {
      const room = mockRoom([
        mockReaction("-1", "@alice:example.com"),
        mockReaction("-1", "@bob:example.com"),
      ]);
      const result = countApprovalReactions(room);
      expect(result).toEqual({ approvals: 0, rejections: 2 });
    });

    it("counts thumbs up/down emoji reactions", () => {
      const room = mockRoom([
        mockReaction("👍", "@alice:example.com"),
        mockReaction("👍️", "@bob:example.com"),
        mockReaction("👎", "@charlie:example.com"),
      ]);
      const result = countApprovalReactions(room);
      expect(result).toEqual({ approvals: 2, rejections: 1 });
    });

    it("deduplicates by sender", () => {
      const room = mockRoom([
        mockReaction("+1", "@alice:example.com"),
        mockReaction("+1", "@alice:example.com"), // duplicate
        mockReaction("👍", "@alice:example.com"), // same sender, different key
      ]);
      const result = countApprovalReactions(room);
      expect(result).toEqual({ approvals: 1, rejections: 0 });
    });

    it("ignores non-reaction events", () => {
      const room = mockRoom([
        mockNonReaction(),
        mockReaction("+1", "@alice:example.com"),
      ]);
      const result = countApprovalReactions(room);
      expect(result).toEqual({ approvals: 1, rejections: 0 });
    });

    it("returns zeros for empty timeline", () => {
      const room = mockRoom([]);
      const result = countApprovalReactions(room);
      expect(result).toEqual({ approvals: 0, rejections: 0 });
    });
  });

  describe("computeApprovalStatus", () => {
    it("returns rejected if any rejections", () => {
      expect(computeApprovalStatus({ approvals: 5, rejections: 1 }, 3)).toBe("rejected");
    });

    it("returns approved if approvals meet threshold", () => {
      expect(computeApprovalStatus({ approvals: 3, rejections: 0 }, 3)).toBe("approved");
    });

    it("returns approved if approvals exceed threshold", () => {
      expect(computeApprovalStatus({ approvals: 5, rejections: 0 }, 3)).toBe("approved");
    });

    it("returns pending if approvals below threshold", () => {
      expect(computeApprovalStatus({ approvals: 1, rejections: 0 }, 3)).toBe("pending");
    });

    it("returns pending if no reactions", () => {
      expect(computeApprovalStatus({ approvals: 0, rejections: 0 }, 1)).toBe("pending");
    });
  });

  describe("syncApprovalFromReactions", () => {
    it("returns null when no reactions found", async () => {
      const room = mockRoom([]);
      const client = mockClient({ "!task:example.com": room });
      const current: ApprovalState = { status: "pending", requiredApprovals: 2, currentApprovals: 0 };
      const result = await syncApprovalFromReactions(client, "!task:example.com", current);
      expect(result).toBeNull();
    });

    it("returns null when room not found", async () => {
      const client = mockClient({});
      const current: ApprovalState = { status: "pending", requiredApprovals: 2, currentApprovals: 0 };
      const result = await syncApprovalFromReactions(client, "!task:example.com", current);
      expect(result).toBeNull();
    });

    it("returns null when state unchanged", async () => {
      const room = mockRoom([mockReaction("+1", "@alice:example.com")]);
      const client = mockClient({ "!task:example.com": room });
      const current: ApprovalState = { status: "pending", requiredApprovals: 2, currentApprovals: 1 };
      const result = await syncApprovalFromReactions(client, "!task:example.com", current);
      expect(result).toBeNull();
    });
  });

  describe("requestApproval", () => {
    it("sets approval to pending with 0 approvals", async () => {
      const client = mockClient({ "!task:example.com": mockRoom([]) });
      await requestApproval(client, "!task:example.com", 2);
      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        expect.any(String),
        expect.objectContaining({ status: "pending", current_approvals: 0, required_approvals: 2 }),
        ""
      );
    });

    it("enforces minimum of 1 required approval", async () => {
      const client = mockClient({ "!task:example.com": mockRoom([]) });
      await requestApproval(client, "!task:example.com", 0);
      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        expect.any(String),
        expect.objectContaining({ required_approvals: 1 }),
        ""
      );
    });
  });

  describe("approve", () => {
    it("increments approval count", async () => {
      const client = mockClient({ "!task:example.com": mockRoom([]) });
      const current: ApprovalState = { status: "pending", requiredApprovals: 2, currentApprovals: 1 };
      await approve(client, "!task:example.com", current);
      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        expect.any(String),
        expect.objectContaining({ status: "approved", current_approvals: 2 }),
        ""
      );
    });

    it("stays pending when below threshold", async () => {
      const client = mockClient({ "!task:example.com": mockRoom([]) });
      const current: ApprovalState = { status: "pending", requiredApprovals: 3, currentApprovals: 1 };
      await approve(client, "!task:example.com", current);
      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        expect.any(String),
        expect.objectContaining({ status: "pending", current_approvals: 2 }),
        ""
      );
    });
  });

  describe("reject", () => {
    it("sets status to rejected", async () => {
      const client = mockClient({ "!task:example.com": mockRoom([]) });
      const current: ApprovalState = { status: "pending", requiredApprovals: 2, currentApprovals: 1 };
      await reject(client, "!task:example.com", current);
      expect(client.sendStateEvent).toHaveBeenCalledWith(
        "!task:example.com",
        expect.any(String),
        expect.objectContaining({ status: "rejected" }),
        ""
      );
    });
  });
});
