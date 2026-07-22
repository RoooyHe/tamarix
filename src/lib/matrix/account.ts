import type { MatrixClient } from "matrix-js-sdk";
import type { IThreepid } from "matrix-js-sdk/lib/@types/threepids";
import { generateRandomHex } from "$lib/utils/crypto";

export interface ThreePidBindSession {
  medium: "email" | "msisdn";
  address: string;
  clientSecret: string;
  sid: string;
}

export function generateClientSecret(): string {
  return generateRandomHex(16);
}

export async function getThreePids(client: MatrixClient): Promise<IThreepid[]> {
  const response = await client.getThreePids();
  return response.threepids;
}

export async function requestEmailThreePidToken(
  client: MatrixClient,
  email: string,
  nextLink?: string
): Promise<ThreePidBindSession> {
  const clientSecret = generateClientSecret();
  const response = await client.requestAdd3pidEmailToken(email, clientSecret, 1, nextLink);

  return {
    medium: "email",
    address: email,
    clientSecret,
    sid: response.sid
  };
}

export async function addThreePid(client: MatrixClient, session: ThreePidBindSession): Promise<void> {
  await client.addThreePidOnly({
    client_secret: session.clientSecret,
    sid: session.sid
  });
}

export async function unbindThreePid(
  client: MatrixClient,
  medium: "email" | "msisdn",
  address: string
): Promise<void> {
  await client.unbindThreePid(medium, address);
}
