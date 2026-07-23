import type { MatrixClient } from "matrix-js-sdk";
import type {
  Task,
  ApprovalState,
  ApprovalConfig,
  CustomFieldDefinition,
  CustomFieldValue,
  ExternalLink,
  Comment,
} from "$lib/matrix/task-types";
import { TAMARIX_EVENT_TYPES } from "$lib/matrix/event-types";
import { getApproval, getApprovalConfig } from "$lib/matrix/approvals";
import {
  syncApprovalFromReactions,
  requestApproval,
  approve,
  reject,
} from "$lib/matrix/approval-sync";
import {
  getCustomFieldDefinitions,
  getCustomFieldValues,
  setCustomFieldValue,
} from "$lib/matrix/custom-fields";
import {
  getExternalLinks,
  addExternalLink,
  removeExternalLink,
} from "$lib/matrix/external-links";
import { getTaskVersion, setTaskVersion } from "$lib/matrix/task-versions";
import { sendStateEvent } from "$lib/matrix/state-primitives";
import { onTimelineEvent } from "$lib/matrix/timeline-bus";
import { isValidUrl, sanitizeUrl } from "$lib/utils/url";

export interface CommitLink {
  eventId: string;
  timestamp: number;
  provider: string;
  repo: string;
  branch: string;
  hash: string;
  message: string;
}

function parseCommitNotice(
  content: string
): Omit<CommitLink, "eventId" | "timestamp"> | null {
  const match = content.match(
    /^\[(GitHub|GitLab)\]\s+(.+?)@(.+?):\s+([a-f0-9]{7,40})\s+-\s+(.+?)(?:\s+\(|$)/i
  );
  if (!match) return null;
  return {
    provider: match[1],
    repo: match[2],
    branch: match[3],
    hash: match[4],
    message: match[5],
  };
}

function deriveCommitLinks(comments: Comment[]): CommitLink[] {
  const links: CommitLink[] = [];
  for (const comment of comments) {
    const parsed = parseCommitNotice(comment.content);
    if (parsed) {
      links.push({
        eventId: comment.eventId,
        timestamp: comment.timestamp,
        ...parsed,
      });
    }
  }
  return links;
}

export interface TaskDetailsState {
  // Read state
  approvalState: ApprovalState | null;
  approvalConfig: ApprovalConfig;
  customFieldDefs: Map<string, CustomFieldDefinition>;
  customFieldValues: Map<string, CustomFieldValue>;
  externalLinks: ExternalLink[];
  currentVersion: string | null;
  commitLinks: CommitLink[];

  // Write handlers
  handleRequestApproval: () => Promise<void>;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleCustomFieldChange: (fieldName: string, value: string | number) => Promise<void>;
  handleAddExternalLink: (url: string, label: string) => Promise<{ error?: string }>;
  handleRemoveExternalLink: (stateKey: string) => Promise<void>;
  handleVersionChange: (versionKey: string | null) => Promise<void>;

  // Lifecycle
  load: (client: MatrixClient, task: Task, projectId: string) => void;
  subscribe: (client: MatrixClient, task: Task) => () => void;
  refresh: (client: MatrixClient, task: Task, projectId: string) => void;
  setComments: (comments: Comment[]) => void;
}

export function createTaskDetailsState(): TaskDetailsState {
  let _client: MatrixClient | null = null;
  let _task: Task | null = null;
  let _projectId: string = "";
  let _unsubscribe: (() => void) | null = null;

  const state: TaskDetailsState = {
    approvalState: null,
    approvalConfig: { enabled: false, requiredApprovals: 1 },
    customFieldDefs: new Map(),
    customFieldValues: new Map(),
    externalLinks: [],
    currentVersion: null,
    commitLinks: [],

    async handleRequestApproval() {
      if (!_client || !_task) return;
      const updated = await requestApproval(
        _client,
        _task.roomId,
        state.approvalConfig.requiredApprovals
      );
      if (updated) state.approvalState = updated;
    },

    async handleApprove() {
      if (!_client || !_task || !state.approvalState) return;
      const updated = await approve(_client, _task.roomId, state.approvalState);
      if (updated) state.approvalState = updated;
    },

    async handleReject() {
      if (!_client || !_task || !state.approvalState) return;
      const updated = await reject(_client, _task.roomId, state.approvalState);
      if (updated) state.approvalState = updated;
    },

    async handleCustomFieldChange(fieldName: string, value: string | number) {
      if (!_client || !_task) return;
      await setCustomFieldValue(_client, _task.roomId, fieldName, value);
      const room = _client.getRoom(_task.roomId);
      if (room) state.customFieldValues = getCustomFieldValues(room);
    },

    async handleAddExternalLink(url: string, label: string) {
      if (!_client || !_task) return { error: "No client" };
      const sanitized = sanitizeUrl(url.trim());
      if (!isValidUrl(sanitized)) {
        return { error: "Invalid URL" };
      }
      await addExternalLink(_client, _task.roomId, {
        url: sanitized,
        label: label.trim(),
      });
      const room = _client.getRoom(_task.roomId);
      if (room) state.externalLinks = getExternalLinks(room);
      return {};
    },

    async handleRemoveExternalLink(stateKey: string) {
      if (!_client || !_task) return;
      await removeExternalLink(_client, _task.roomId, stateKey);
      const room = _client.getRoom(_task.roomId);
      if (room) state.externalLinks = getExternalLinks(room);
    },

    async handleVersionChange(versionKey: string | null) {
      if (!_client || !_task) return;
      if (versionKey) {
        await setTaskVersion(_client, _task.roomId, versionKey);
      } else {
        await sendStateEvent(
          _client,
          _task.roomId,
          TAMARIX_EVENT_TYPES.TASK_VERSION,
          { version: "" }
        );
      }
      const room = _client.getRoom(_task.roomId);
      if (room) state.currentVersion = getTaskVersion(room);
    },

    load(client: MatrixClient, task: Task, projectId: string) {
      _client = client;
      _task = task;
      _projectId = projectId;

      const room = client.getRoom(task.roomId);
      if (!room) return;

      state.approvalState = getApproval(room);
      state.externalLinks = getExternalLinks(room);
      state.customFieldValues = getCustomFieldValues(room);
      state.currentVersion = getTaskVersion(room);

      const projectRoom = client.getRoom(projectId);
      if (projectRoom) {
        state.customFieldDefs = getCustomFieldDefinitions(projectRoom);
        state.approvalConfig = getApprovalConfig(projectRoom);
      }
    },

    subscribe(client: MatrixClient, task: Task): () => void {
      if (_unsubscribe) _unsubscribe();

      const unsub = onTimelineEvent((event, room) => {
        if (
          !room ||
          room.roomId !== task.roomId ||
          event.getType() !== "m.reaction"
        )
          return;
        if (!state.approvalState) return;
        void syncApprovalFromReactions(
          client,
          task.roomId,
          state.approvalState
        ).then((updated) => {
          if (updated) state.approvalState = updated;
        });
      });

      // Initial sync
      if (state.approvalState) {
        void syncApprovalFromReactions(
          client,
          task.roomId,
          state.approvalState
        ).then((updated) => {
          if (updated) state.approvalState = updated;
        });
      }

      _unsubscribe = unsub;
      return unsub;
    },

    refresh(client: MatrixClient, task: Task, projectId: string) {
      state.load(client, task, projectId);
    },

    setComments(comments: Comment[]) {
      state.commitLinks = deriveCommitLinks(comments);
    },
  };

  return state;
}

export type { TaskDetailsState as TaskDetails };
