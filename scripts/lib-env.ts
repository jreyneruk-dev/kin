/**
 * Minimal .env loader for scripts — no dependency, no surprises.
 * Precedence: real environment wins over .env.local.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

try {
  const raw = readFileSync(join(import.meta.dirname, "../.env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  // no .env.local — fine, environment must already carry what's needed
}
