export function parseAccessToken(response: unknown, now = Date.now()) {
  const token = response as {
    access_token?: unknown;
    expires_at?: unknown;
  } | null;
  const value = token?.access_token;
  const expiry = token?.expires_at;
  if (
    typeof value !== "string" ||
    !value ||
    typeof expiry !== "number" ||
    !Number.isSafeInteger(expiry)
  )
    return null;

  // GigaChat returns a Unix timestamp. Accept seconds and milliseconds.
  const expiresAt = expiry < 1_000_000_000_000 ? expiry * 1_000 : expiry;
  return expiresAt > now ? { value, expiresAt } : null;
}
