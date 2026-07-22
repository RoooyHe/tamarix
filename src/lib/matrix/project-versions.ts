import type { Room, MatrixClient } from "matrix-js-sdk";
import type { VersionInfo } from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";
import { sendStateEvent } from "./state-primitives";

export function getVersions(room: Room): VersionInfo[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.VERSION as any);
  return events.map(e => {
    const content = e.getContent();
    return {
      name: content.name ?? e.getStateKey() ?? "",
      description: content.description ?? undefined,
      releaseDate: content.release_date ?? undefined,
      status: content.status ?? "planned"
    } as VersionInfo;
  });
}

export async function setVersion(
  client: MatrixClient,
  spaceRoomId: string,
  versionKey: string,
  version: VersionInfo
): Promise<void> {
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.VERSION, {
    name: version.name,
    description: version.description ?? "",
    release_date: version.releaseDate ?? "",
    status: version.status
  }, versionKey);
}
