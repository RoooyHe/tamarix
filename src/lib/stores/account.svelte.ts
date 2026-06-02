import type { MatrixClient } from "matrix-js-sdk";
import type { IThreepid } from "matrix-js-sdk/lib/@types/threepids";
import {
  addThreePid,
  getThreePids,
  requestEmailThreePidToken,
  unbindThreePid,
  type ThreePidBindSession
} from "$lib/matrix/account";
import { formatMatrixError } from "$lib/matrix/errors";

function createAccountStore() {
  let threePids = $state<IThreepid[]>([]);
  let pendingEmailSession = $state<ThreePidBindSession | null>(null);
  let isLoading = $state(false);
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  async function loadThreePids(client: MatrixClient) {
    isLoading = true;
    error = null;
    try {
      threePids = await getThreePids(client);
    } catch (e) {
      error = formatMatrixError(e, "Failed to load account identifiers");
    } finally {
      isLoading = false;
    }
  }

  async function requestEmailBind(client: MatrixClient, email: string) {
    isSaving = true;
    error = null;
    try {
      pendingEmailSession = await requestEmailThreePidToken(client, email);
      return pendingEmailSession;
    } catch (e) {
      error = formatMatrixError(e, "Failed to send verification email");
      return null;
    } finally {
      isSaving = false;
    }
  }

  async function confirmEmailBind(client: MatrixClient) {
    if (!pendingEmailSession) return false;

    isSaving = true;
    error = null;
    try {
      await addThreePid(client, pendingEmailSession);
      pendingEmailSession = null;
      await loadThreePids(client);
      return true;
    } catch (e) {
      error = formatMatrixError(e, "Failed to bind email");
      return false;
    } finally {
      isSaving = false;
    }
  }

  async function removeThreePid(client: MatrixClient, medium: "email" | "msisdn", address: string) {
    isSaving = true;
    error = null;
    try {
      await unbindThreePid(client, medium, address);
      threePids = threePids.filter(item => item.medium !== medium || item.address !== address);
      return true;
    } catch (e) {
      error = formatMatrixError(e, "Failed to unbind identifier");
      return false;
    } finally {
      isSaving = false;
    }
  }

  function clearPendingEmail() {
    pendingEmailSession = null;
  }

  return {
    get threePids() { return threePids; },
    get pendingEmailSession() { return pendingEmailSession; },
    get isLoading() { return isLoading; },
    get isSaving() { return isSaving; },
    get error() { return error; },
    loadThreePids,
    requestEmailBind,
    confirmEmailBind,
    removeThreePid,
    clearPendingEmail
  };
}

let accountStore: ReturnType<typeof createAccountStore> | null = null;

export function getAccountStore() {
  accountStore ??= createAccountStore();
  return accountStore;
}
