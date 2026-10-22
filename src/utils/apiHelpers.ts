/**
 * Safe JSON fetching utility that prevents "Unexpected token '<', <!doctype ... is not valid JSON"
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return null;

    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
