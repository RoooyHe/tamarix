import type { MatrixClient } from "matrix-js-sdk";
import { Preset, RoomCreateTypeField, RoomType, EventType } from "matrix-js-sdk";

export type ProjectTemplate = "basic" | "kanban" | "scrum";

const TEMPLATE_ROOMS: Record<string, string[]> = {
  kanban: ["Backlog", "Selected", "In Progress", "Done"],
  scrum: ["Todo", "In Progress", "Review", "Done"]
};

const ENCRYPTION_EVENT = {
  type: EventType.RoomEncryption,
  state_key: "",
  content: { algorithm: "m.megolm.v1.aes-sha2" }
} as const;

export async function createProjectRoom(
  client: MatrixClient,
  name: string,
  description?: string,
  template: ProjectTemplate = "basic",
  encrypted?: boolean
): Promise<string | undefined> {
  const result = await client.createRoom({
    name,
    topic: description,
    preset: Preset.PrivateChat,
    creation_content: {
      [RoomCreateTypeField]: RoomType.Space
    },
    initial_state: encrypted
      ? [{ type: EventType.RoomEncryption, state_key: "", content: { algorithm: "m.megolm.v1.aes-sha2" } }]
      : []
  });

  const spaceRoomId = result.room_id;
  const domain = client.getDomain();

  const rooms = TEMPLATE_ROOMS[template];
  if (rooms) {
    for (const roomName of rooms) {
      const initial_state: Record<string, unknown>[] = [
        { type: EventType.SpaceParent, state_key: spaceRoomId!, content: { via: [domain!] } }
      ];
      if (encrypted) {
        initial_state.push({ ...ENCRYPTION_EVENT });
      }
      const roomResult = await client.createRoom({
        name: roomName,
        preset: Preset.PrivateChat,
        initial_state: initial_state as any
      });
      await client.sendStateEvent(
        spaceRoomId!,
        EventType.SpaceChild,
        { via: [domain!], order: String(rooms.indexOf(roomName)).padStart(3, "0") },
        roomResult.room_id!
      );
    }
  }

  return spaceRoomId;
}

export async function updateProjectRoom(
  client: MatrixClient,
  roomId: string,
  options: { name?: string; topic?: string }
): Promise<void> {
  if (options.name) {
    await client.setRoomName(roomId, options.name);
  }
  if (options.topic !== undefined) {
    await client.setRoomTopic(roomId, options.topic);
  }
}

export async function archiveProjectRoom(
  client: MatrixClient,
  roomId: string,
  currentDescription?: string
): Promise<void> {
  await client.setRoomTopic(roomId, `[archived] ${currentDescription ?? ""}`);
}
