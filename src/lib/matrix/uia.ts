import { AuthType, type IAuthData, type UIAFlow } from "matrix-js-sdk";

export type SupportedUiaStage =
  | AuthType.Dummy
  | AuthType.Terms
  | AuthType.RegistrationToken
  | AuthType.Email
  | AuthType.Msisdn
  | AuthType.Recaptcha;

export interface UiaSession {
  session?: string;
  flows: UIAFlow[];
  completed: string[];
  params: Record<string, Record<string, unknown>>;
}

export interface UiaStep {
  type: string;
  supported: boolean;
  completed: boolean;
}

const SUPPORTED_STAGES = new Set<string>([
  AuthType.Dummy,
  AuthType.Terms,
  AuthType.RegistrationToken,
  "org.matrix.msc3231.login.registration_token",
  AuthType.Email,
  AuthType.Msisdn,
  AuthType.Recaptcha
]);

export function parseUiaSession(data: IAuthData | null | undefined): UiaSession | null {
  if (!data?.flows?.length) return null;

  return {
    session: data.session,
    flows: data.flows,
    completed: data.completed ?? [],
    params: data.params ?? {}
  };
}

export function chooseUiaFlow(session: UiaSession): UIAFlow | null {
  const supportedFlows = session.flows
    .filter(flow => flow.stages.every(stage => session.completed.includes(stage) || SUPPORTED_STAGES.has(stage)))
    .sort((a, b) => a.stages.length - b.stages.length);

  return supportedFlows[0] ?? session.flows[0] ?? null;
}

export function getCurrentUiaStep(session: UiaSession): UiaStep | null {
  const flow = chooseUiaFlow(session);
  if (!flow) return null;

  const stage = flow.stages.find(item => !session.completed.includes(item));
  if (!stage) return null;

  return {
    type: stage,
    supported: SUPPORTED_STAGES.has(stage),
    completed: false
  };
}

export function getUiaSteps(session: UiaSession): UiaStep[] {
  const flow = chooseUiaFlow(session);
  if (!flow) return [];

  return flow.stages.map(stage => ({
    type: stage,
    supported: SUPPORTED_STAGES.has(stage),
    completed: session.completed.includes(stage)
  }));
}

export function getStageLabel(stage: string): string {
  if (stage === AuthType.Dummy) return "Dummy";
  if (stage === AuthType.Terms) return "Terms";
  if (stage === AuthType.RegistrationToken || stage === "org.matrix.msc3231.login.registration_token") {
    return "Registration token";
  }
  if (stage === AuthType.Email) return "Email";
  if (stage === AuthType.Msisdn) return "Phone";
  if (stage === AuthType.Recaptcha) return "Captcha";
  return stage;
}

export function createAuthDict(type: string, session?: string, extra: Record<string, unknown> = {}) {
  return {
    type,
    ...(session ? { session } : {}),
    ...extra
  };
}
