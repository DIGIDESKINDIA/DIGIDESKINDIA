// Node-runtime auth helpers for route handlers. Re-exports the edge-safe
// core and adds a helper that reads the session cookie via `next/headers`.
// Never import this module from a client component or from middleware
// (middleware must import from `./core`).
import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "./core";

export {
  AUTH_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from "./core";

export async function isAuthenticated(): Promise<boolean> {
  try {
    const store = await cookies();
    return await verifySessionToken(store.get(AUTH_COOKIE_NAME)?.value);
  } catch {
    return false;
  }
}
