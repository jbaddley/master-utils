import ytdl from "@distube/ytdl-core";

// Cached agent — created once per process so the underlying undici connection
// pool is reused across requests. createAgent() sets up a browser-mimicking TLS
// fingerprint and UA that bypass basic bot-detection; if YOUTUBE_COOKIES is set,
// cookies from a logged-in browser session are also included (required for
// age-restricted or otherwise locked-down videos).
let _agent: ReturnType<typeof ytdl.createAgent> | null = null;

export function getYtdlAgent(): ReturnType<typeof ytdl.createAgent> {
  if (_agent) return _agent;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cookies: any[] | undefined;
  if (process.env.YOUTUBE_COOKIES) {
    try {
      cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
    } catch {
      // malformed env var — continue without cookies
    }
  }

  _agent = ytdl.createAgent(cookies);
  return _agent;
}
