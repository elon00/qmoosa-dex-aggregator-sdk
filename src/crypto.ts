import { AdminAuthManager, AdminActionType, SignedAdminIntent } from "@qmoosa/dex-aggregator-engine";

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  return AdminAuthManager.generateKeyPair();
}

export function signAdminIntent(
  action: AdminActionType,
  params: Record<string, any>,
  nonce: number,
  deadline: number,
  domain: string,
  privateKeyPem: string
): SignedAdminIntent {
  return AdminAuthManager.signAdminIntent(action, params, nonce, deadline, domain, privateKeyPem);
}
