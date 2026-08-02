/// <reference types="@cloudflare/workers-types" />
//
// Cloudflare Access verification for the admin API (issue #8).
//
// THIS IS THE DEFENCE, NOT DEFENCE IN DEPTH. An Access application sits on
// academy.nczoning.net, but the SAME Pages Functions are also served from
// nczoning-academy.pages.dev and from every per-deployment preview URL, which
// no Access application covers. A write endpoint trusting the edge to have
// authenticated the caller would be wide open on those hostnames. So the
// Function verifies the token itself, and rejects anything unsigned.
//
// Two gates, both required:
//
//   1. A valid `Cf-Access-Jwt-Assertion`, signature checked against the team's
//      published JWKS, with iss/aud/exp/nbf all matching.
//   2. The request Host is the expected admin hostname.
//
// Everything fails CLOSED. Missing configuration is a 503, never an allow. The
// one bypass is for local development and requires the deployment to have no
// Access configuration at all; see DEV_BYPASS_KEY.

export interface Identity {
  /** The verified `email` claim: who to attribute a write to. */
  email: string;
}

export interface AccessEnv {
  /** Also the local-development opt-in; see DEV_BYPASS_KEY. */
  MESSAGES?: KVNamespace;
  /** `https://<team>.cloudflareaccess.com`. Unset => the endpoint is 503. */
  ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's AUD tag. Unset => the endpoint is 503. */
  ACCESS_AUD?: string;
  /** The hostname the admin surface is served from. Unset => the endpoint is 503. */
  ADMIN_HOST?: string;
}

/**
 * The local-development opt-in, as a KV key rather than an environment variable.
 *
 * NOT a style choice. `wrangler pages dev` 4.118 lists `.dev.vars` secrets and
 * `--binding` values in its startup binding table but does NOT put them in the
 * Function's `env`; KV and ASSETS bindings arrive, plain text vars do not.
 * Reproduced with `.dev.vars`, with `--binding`, with top-level `vars` in a
 * wrangler config, and with `env.preview.vars`. So the bypass is keyed off the
 * one binding that does work locally.
 *
 * Write it with:
 *   npx wrangler kv key put admin:dev-bypass 1 --namespace-id MESSAGES --local
 */
const DEV_BYPASS_KEY = 'admin:dev-bypass';

/** A refusal, ready to return. `null` from `authorize` means allowed. */
export type Refusal = Response;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

// ---- JWKS ----
// Module scope survives between requests in the same isolate, so a warm isolate
// verifies without a round trip. Cold isolates refetch; that is the cost of not
// having anywhere else to cache.
interface Jwks { keys: JsonWebKey[] }
let jwksCache: { teamDomain: string; keys: Map<string, CryptoKey>; expires: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const now = Date.now();
  if (jwksCache && jwksCache.teamDomain === teamDomain && jwksCache.expires > now) {
    return jwksCache.keys;
  }
  const r = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`JWKS fetch failed: ${r.status}`);
  const { keys: jwks } = (await r.json()) as Jwks;

  const keys = new Map<string, CryptoKey>();
  for (const jwk of jwks) {
    const kid = (jwk as JsonWebKey & { kid?: string }).kid;
    if (!kid) continue;
    keys.set(
      kid,
      await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    );
  }
  if (keys.size === 0) throw new Error('JWKS contained no usable keys');

  jwksCache = { teamDomain, keys, expires: now + JWKS_TTL_MS };
  return keys;
}

// ---- JWT ----

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const b64urlToJson = (s: string): unknown =>
  JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

interface Claims {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
  email?: string;
}

/**
 * Verify an Access JWT. Returns the identity, or throws.
 *
 * Anything unexpected is a throw rather than a falsy return: there is no
 * "probably fine" branch on an auth path, and a caller that forgets to check a
 * boolean should not be able to proceed.
 */
async function verifyToken(token: string, teamDomain: string, aud: string): Promise<Identity> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const [rawHeader, rawPayload, rawSignature] = parts;

  const header = b64urlToJson(rawHeader) as { alg?: string; kid?: string };
  // Pin the algorithm. Accepting whatever the token declares is how `alg: none`
  // and HMAC-with-the-public-key forgeries get in.
  if (header.alg !== 'RS256') throw new Error(`unexpected alg: ${header.alg}`);
  if (!header.kid) throw new Error('token has no kid');

  const keys = await getKeys(teamDomain);
  const key = keys.get(header.kid);
  if (!key) throw new Error('token signed by an unknown key');

  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(rawSignature),
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
  );
  if (!ok) throw new Error('signature does not verify');

  const claims = b64urlToJson(rawPayload) as Claims;
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (!audiences.includes(aud)) throw new Error('aud does not match this application');
  if (claims.iss !== teamDomain) throw new Error('iss is not this team');

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= nowSec) throw new Error('token expired');
  if (typeof claims.nbf === 'number' && claims.nbf > nowSec) throw new Error('token not yet valid');

  if (!claims.email) throw new Error('token carries no email');
  return { email: claims.email };
}

/**
 * Gate a request. Returns an `Identity` when allowed, or a `Response` to return
 * as-is when not. Written as a union so a caller cannot accidentally continue on
 * the refusal branch: there is nothing to destructure until it is checked.
 */
export async function authorize(
  request: Request,
  env: AccessEnv,
): Promise<Identity | Refusal> {
  const hostname = new URL(request.url).hostname;
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.replace(/\/+$/, '');
  const aud = env.ACCESS_AUD;
  const adminHost = env.ADMIN_HOST;
  const configured = !!(teamDomain && aud && adminHost);

  // The local-development bypass. THREE conditions, all required:
  //
  //   1. Access is not configured at all. A deployed environment sets the three
  //      variables, so this branch is dead there no matter what else is true.
  //   2. The request Host is loopback.
  //   3. An explicit opt-in key exists in KV.
  //
  // Condition 1 is what makes the other two safe to rely on. The Host header is
  // caller-supplied, so loopback alone would be a forgeable bypass; gating on
  // "this deployment has no Access configuration" means the branch cannot be
  // reached on a deployment that has any.
  if (
    !configured &&
    LOOPBACK.has(hostname) &&
    env.MESSAGES &&
    (await env.MESSAGES.get(DEV_BYPASS_KEY)) === '1'
  ) {
    return { email: 'dev@localhost' };
  }

  if (!configured) {
    // Unconfigured is not "allow" and not "forbidden": it is this endpoint being
    // unable to make a decision, and it should be loud enough to notice.
    return json({ error: 'admin API is not configured' }, 503);
  }

  // Gate 2, cheap, so run it first: the preview and *.pages.dev hostnames serve
  // these same Functions and no Access application covers them.
  if (hostname !== adminHost) {
    return json({ error: 'admin API is not served from this hostname' }, 403);
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return json({ error: 'missing Access token' }, 401);

  try {
    return await verifyToken(token, teamDomain, aud);
  } catch {
    // Deliberately opaque. The reason is useful to an attacker and useless to an
    // administrator, who either has a session or does not.
    return json({ error: 'Access token rejected' }, 403);
  }
}

/** Narrowing helper, so call sites read as one line. */
export const refused = (r: Identity | Refusal): r is Refusal => r instanceof Response;
