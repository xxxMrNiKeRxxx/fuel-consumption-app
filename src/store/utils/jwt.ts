export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseIsModeratorFromToken(token: string): boolean {
  const p = parseJwtPayload(token);
  if (!p) return false;
  return Boolean(p.is_moderator);
}