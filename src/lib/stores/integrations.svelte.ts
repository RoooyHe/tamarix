import { getContext, setContext } from "svelte";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationConnection,
  type IntegrationProvider
} from "$lib/integrations/types";
import { asFetch } from "$lib/matrix/as-client";

const INTEGRATIONS_CONTEXT_KEY = "tamarix:integrations";

interface OAuthStartResponse {
  url?: string;
  authorization_url?: string;
  error?: string;
}

function createIntegrationsStore() {
  let connections = $state<IntegrationConnection[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function loadConnections(asUrl: string) {
    if (!asUrl) {
      connections = [];
      return;
    }

    isLoading = true;
    error = null;
    try {
      const data = await asFetch<{ connections?: IntegrationConnection[] }>(asUrl, "/api/integrations");
      connections = data.connections ?? [];
    } catch (e) {
      connections = [];
      error = e instanceof Error ? e.message : "Failed to load integrations";
    } finally {
      isLoading = false;
    }
  }

  async function startOAuth(asUrl: string, provider: IntegrationProvider, redirectTo?: string) {
    if (!asUrl) {
      error = "Application Service URL is required";
      return null;
    }

    error = null;
    try {
      const data = await asFetch<OAuthStartResponse>(
        asUrl,
        `/api/integrations/${provider}/oauth/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirect_to: redirectTo ?? window.location.href })
        }
      );
      return data.authorization_url ?? data.url ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to start OAuth";
      return null;
    }
  }

  function getConnection(provider: IntegrationProvider) {
    return connections.find(connection => connection.provider === provider) ?? null;
  }

  return {
    providers: INTEGRATION_PROVIDERS,
    get connections() { return connections; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    loadConnections,
    startOAuth,
    getConnection
  };
}

export type IntegrationsStore = ReturnType<typeof createIntegrationsStore>;

export function setIntegrationsContext() {
  const integrations = createIntegrationsStore();
  setContext(INTEGRATIONS_CONTEXT_KEY, integrations);
  return integrations;
}

export function getIntegrationsContext(): IntegrationsStore {
  return getContext<IntegrationsStore>(INTEGRATIONS_CONTEXT_KEY);
}
