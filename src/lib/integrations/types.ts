export type IntegrationProvider = "github" | "gitlab" | "feishu" | "dingtalk" | "wechat_work" | "webhook";
export type IntegrationStatus = "available" | "connected" | "needs_as" | "error";

export interface IntegrationProviderInfo {
  id: IntegrationProvider;
  name: string;
  category: "code" | "chat" | "webhook";
  descriptionKey: string;
  requiresAs: boolean;
}

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationStatus;
  scopes: string[];
  createdAt?: string;
  createdBy?: string;
  lastSyncAt?: string;
  error?: string;
}

export const INTEGRATION_PROVIDERS: IntegrationProviderInfo[] = [
  {
    id: "github",
    name: "GitHub",
    category: "code",
    descriptionKey: "integrations.github_desc",
    requiresAs: true
  },
  {
    id: "gitlab",
    name: "GitLab",
    category: "code",
    descriptionKey: "integrations.gitlab_desc",
    requiresAs: true
  },
  {
    id: "feishu",
    name: "Feishu",
    category: "chat",
    descriptionKey: "integrations.feishu_desc",
    requiresAs: true
  },
  {
    id: "dingtalk",
    name: "DingTalk",
    category: "chat",
    descriptionKey: "integrations.dingtalk_desc",
    requiresAs: true
  },
  {
    id: "wechat_work",
    name: "WeCom",
    category: "chat",
    descriptionKey: "integrations.wechat_work_desc",
    requiresAs: true
  },
  {
    id: "webhook",
    name: "Webhook",
    category: "webhook",
    descriptionKey: "integrations.webhook_desc",
    requiresAs: true
  }
];
