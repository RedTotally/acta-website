const JOIN_PATH = /^\/join\/[A-Za-z0-9_-]+$/;
const GROUP_PATH = /^\/groups\/[A-Za-z0-9_-]+$/;

export function safeNext(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > 200) {
    return null;
  }
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(input, "http://acta.local");
  } catch {
    return null;
  }

  if (url.origin !== "http://acta.local" || url.username || url.password) {
    return null;
  }

  const path = url.pathname;
  if (JOIN_PATH.test(path) || GROUP_PATH.test(path)) {
    return path;
  }
  return null;
}

export function joinUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/join/${token}`;
}
