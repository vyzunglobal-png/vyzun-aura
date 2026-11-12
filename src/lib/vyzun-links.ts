/** Branded domains are never invented; links always work on the current origin. */
export function secretDropPath(username: string) {
  return `/ask/@${encodeURIComponent(username.replace(/^@/, "").toLowerCase())}`;
}

export function secretDropLink(origin: string, username: string) {
  return new URL(secretDropPath(username), origin).href;
}

export const SECRET_LIFETIME_MS = 24 * 60 * 60 * 1000;
export function secretExpiresAt(createdAt: number) {
  return createdAt + SECRET_LIFETIME_MS;
}

/** Official support inbox shown in Settings, Help and Privacy footers. */
export const SUPPORT_EMAIL = "vyzun.global@gmail.com";
export function supportMailto(subject: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Invite codes are usernames: 1–30 lowercase letters, digits or underscores. */
export function normalizeInviteCode(raw: string): string | null {
  const code = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{1,30}$/.test(code) ? code : null;
}

export function invitePath(username: string) {
  const code = normalizeInviteCode(username);
  return code ? `/invite/${code}` : "/";
}

/** Invite links stay on the running app origin until the vyzun.app domain is connected. */
export function inviteLink(origin: string, username: string) {
  return new URL(invitePath(username), origin).href;
}

export const INVITE_STORAGE_KEY = "vyzun.invite.ref";
