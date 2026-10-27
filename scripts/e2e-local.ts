/**
 * Local end-to-end proof, no Docker and no external credentials: an embedded
 * Postgres + the served production build. Drives the real HTTP surface:
 *   join → tree renders → profile → comment → fact → question → invite → logout.
 *   npx tsx scripts/e2e-local.ts
 */

import "./lib-env.ts";
import { spawn, execSync, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PG_PORT = 5497;
const APP_PORT = 3315;
const APP = `http://localhost:${APP_PORT}`;

let step = 0;
const log = (line = "") => console.log(line);
function fail(msg: string): never {
  throw new Error(`step ${step}: ${msg}`);
}
function ok(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const dataDir = mkdtempSync(join(tmpdir(), "kin-pg-"));
let app: ChildProcess | null = null;
let pg: InstanceType<typeof EmbeddedPostgres> | null = null;

async function assertPortFree(): Promise<void> {
  const inUse = await fetch(`${APP}/`)
    .then(() => true)
    .catch(() => false);
  if (inUse) {
    throw new Error(
      `port ${APP_PORT} is already serving. A leaked server from an earlier run would make this proof read someone else's build — stop it and re-run.`,
    );
  }
}

async function main() {
  await assertPortFree();
  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "password",
    port: PG_PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("kin");
  process.env.DATABASE_URL = `postgres://postgres:password@localhost:${PG_PORT}/kin`;
  process.env.OWNER_EMAIL = "john@example.com";
  log(`[${++step}] embedded Postgres up on :${PG_PORT} (${dataDir})`);

  const schema = spawnSync("npx", ["tsx", "scripts/apply-schema.ts"], { encoding: "utf8" });
  ok(schema.stdout.includes("Applied"), `schema apply failed: ${schema.stderr}`);
  log(`[${++step}] schema applied`);

  const seed = spawnSync("npx", ["tsx", "scripts/seed.ts"], { encoding: "utf8" });
  ok(seed.stdout.includes("done."), `seed failed: ${seed.stderr}`);
  log(`[${++step}] seed loaded (${seed.stdout.trim().split("\n").join(" · ")})`);

  // Serve the production build.
  execSync("npx next build", { stdio: "inherit", env: process.env });
  app = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(APP_PORT)], {
    env: process.env,
    stdio: ["ignore", "ignore", "pipe"],
    // Own process group: `next start` forks the real server, so killing the
    // wrapper alone (as an earlier version did) leaves that child holding the
    // port. The next run's server then fails to bind, the readiness check
    // passes against the stale build, and the proof silently reads old code.
    detached: true,
  });
  const appErr: string[] = [];
  app.stderr?.on("data", (d) => appErr.push(String(d)));
  let up = false;
  for (let i = 0; i < 45 && !up; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    up = await fetch(`${APP}/`)
      .then((r) => r.ok)
      .catch(() => false);
  }
  ok(up, `app did not come up. stderr: ${appErr.join("")}`);
  log(`[${++step}] production server up on :${APP_PORT}`);

  // Unauthenticated users are redirected to /login.
  const anon = await fetch(`${APP}/`, { redirect: "manual" });
  ok(anon.status === 307 || anon.status === 302, `expected redirect for anon, got ${anon.status}`);
  log(`[${++step}] anonymous / redirects to login (${anon.headers.get("location")})`);

  // Owner claims the first invite.
  const inviteRes = await claimOwnerInvite();
  const cookie = inviteRes.cookie;
  ok(cookie.length > 0, "no session cookie after join");
  log(`[${++step}] owner joined via invite (${inviteRes.role})`);

  // Tree page renders seed content.
  const home = await fetch(`${APP}/`, { headers: { cookie } });
  ok(home.ok, `tree page failed: ${home.status}`);
  const homeHtml = await home.text();
  ok(homeHtml.includes("William H Macartney"), "seeded patriarch missing from tree page");
  ok(homeHtml.includes("Kathleen S Macartney"), "Kathleen missing from tree page");
  log(`[${++step}] tree page renders the seeded family`);

  // Henry is a separate, unlinked person record: verify it in the complete
  // people directory, not the connected-family tree visualization.
  const directory = await fetch(`${APP}/people`, { headers: { cookie } });
  ok(directory.ok, `people directory failed: ${directory.status}`);
  const directoryHtml = await directory.text();
  ok(directoryHtml.includes("Henry Macartney"), "seeded Henry missing from the people directory");
  const henryId = scrapePersonId(directoryHtml, "Henry Macartney");
  ok(henryId !== null, "Henry's seeded person profile link is missing");
  log(`[${++step}] seeded unlinked Henry person record is present (person ${henryId})`);

  // Comparison page: both sourced lines, the candidate, and the verdict —
  // and it must stay behind the login like every other page.
  const compare = await fetch(`${APP}/compare`, { headers: { cookie } });
  if (!compare.ok) {
    const body = await compare.text();
    fail(`compare page failed: ${compare.status}; server stderr: ${appErr.join("")}; response: ${body.slice(0, 1000)}`);
  }
  const compareHtml = await compare.text();
  ok(compareHtml.includes("Two Macartney lines, side by side"), "compare heading missing");
  ok(compareHtml.includes("NOT LINKED"), "compare verdict missing");
  ok(compareHtml.includes("Cromkill"), "Henry candidate missing from compare page");
  ok(compareHtml.includes("1st Earl Macartney"), "Lissanoure line missing from compare page");
  ok(
    compareHtml.includes(`href="/person/${henryId}"`),
    "compare page does not link back to Henry's profile",
  );
  ok(compareHtml.includes("Henry in the tree"), "compare page missing its Henry-in-the-tree link card");
  ok(compareHtml.includes("No birth, marriage, death or place record survives"), "compare card does not use the person's attached evidence");
  const anonCompare = await fetch(`${APP}/compare`, { redirect: "manual" });
  ok(
    anonCompare.status === 307 || anonCompare.status === 302,
    `compare page not auth-gated: ${anonCompare.status}`,
  );
  log(`[${++step}] compare page renders both lines and is auth-gated`);

  // Henry's own profile: the candidate evidence from the comparison data is
  // attached to the tree record, and it links back into the side-by-side view.
  const henryProfile = await fetch(`${APP}/person/${henryId}`, { headers: { cookie } });
  ok(henryProfile.ok, `Henry profile failed: ${henryProfile.status}`);
  const henryHtml = await henryProfile.text();
  ok(henryHtml.includes("Candidate — not a proven ancestor"), "Henry evidence heading missing");
  ok(henryHtml.includes("Cromkill"), "Henry evidence missing the Cromkill candidate");
  ok(henryHtml.includes("1835"), "Henry evidence missing the 1835 tithe gap");
  ok(henryHtml.includes("1669"), "Henry evidence missing the 1669 hearth-roll context");
  ok(henryHtml.includes("All four Henrys"), "Henry evidence missing the four-candidate set");
  ok(henryHtml.includes("Hugh"), "Henry evidence missing the Cromkill cluster names");
  ok(henryHtml.includes("No parent is recorded"), "Henry evidence missing the no-parent warning");
  ok(
    henryHtml.includes('href="/compare#comparison-heading"'),
    "Henry profile does not link to the comparison",
  );
  ok(henryHtml.includes("PRONI"), "Henry evidence missing the record that would break the wall");
  ok(henryHtml.includes("fl. 1861–1870 (born c.1810–1820?)"), "Henry profile changed the ledger's candidate dates");
  ok(henryHtml.includes("No birth, marriage, death or place record survives"), "Henry profile did not read the seeded summary");
  log(
    `[${++step}] Henry's profile shows the seeded candidate evidence; compare link resolves both ways (person ${henryId})`,
  );

  // Find Kathleen's profile id from the people API? No people API (by design);
  // scrape it from the tree page HTML links.
  const kathleenId = scrapePersonId(homeHtml, "Kathleen S Macartney");
  ok(kathleenId !== null, "could not find Kathleen's profile link");
  const profile = await fetch(`${APP}/person/${kathleenId}`, { headers: { cookie } });
  ok(profile.ok, `profile failed: ${profile.status}`);
  const profileHtml = await profile.text();
  ok(profileHtml.includes("Aylwin P Davies"), "family sidebar missing Aylwin");
  log(`[${++step}] Kathleen's profile renders family links`);

  // Ordinary edits to a person must preserve its researchEvidence payload.
  const henryEdit = await fetch(`${APP}/api/people/${henryId}`, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ nameNote: "e2e: preserve evidence metadata" }),
  });
  ok(henryEdit.ok, `Henry edit failed: ${henryEdit.status}`);
  const editedHenry = await (await fetch(`${APP}/person/${henryId}`, { headers: { cookie } })).text();
  ok(editedHenry.includes("Cromkill"), "Henry edit dropped the attached research evidence");
  ok(editedHenry.includes('href="/compare#comparison-heading"'), "Henry edit dropped the comparison cross-link");
  const compareAfterEdit = await (
    await fetch(`${APP}/compare`, { headers: { cookie } })
  ).text();
  ok(compareAfterEdit.includes("No birth, marriage, death or place record survives"), "Henry edit dropped the attached evidence from compare");
  ok(compareAfterEdit.includes(`href="/person/${henryId}"`), "compare lost its link to Henry after his edit");
  log(`[${++step}] Henry's profile and compare retain attached evidence after an ordinary edit`);

  // Comment on Kathleen.
  const comment = await postJson(
    `${APP}/api/comments`,
    { personId: kathleenId, body: "e2e: test comment from the proof run" },
    cookie,
  );
  ok(comment.ok, `comment failed: ${comment.status}`);
  const profileAfter = await (await fetch(`${APP}/person/${kathleenId}`, { headers: { cookie } })).text();
  ok(profileAfter.includes("e2e: test comment"), "comment not visible on profile");
  log(`[${++step}] comment posted and rendered`);

  // Add a fact.
  const fact = await postJson(
    `${APP}/api/facts`,
    { personId: kathleenId, kind: "birth", detail: "Q1 1902, e2e run", source: "proof", confidence: "guess" },
    cookie,
  );
  ok(fact.ok, `fact failed: ${fact.status}`);
  log(`[${++step}] fact added`);

  // Image roundtrip (Phase 3): PNG in → same bytes out → delete → 404.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const fd = new FormData();
  fd.append("file", new File([png], "registry-screengrab.png", { type: "image/png" }));
  fd.append("caption", "e2e registry screengrab");
  fd.append("source", "proof run");
  fd.append("width", "1");
  fd.append("height", "1");
  const upload = await fetch(`${APP}/api/people/${kathleenId}/images`, {
    method: "POST",
    headers: { cookie },
    body: fd,
  });
  ok(upload.ok, `image upload failed: ${upload.status}`);
  const imageId = ((await upload.json()) as { image: { id: number } }).image.id;
  const served = await fetch(`${APP}/api/images/${imageId}`, { headers: { cookie } });
  ok(served.ok, `image serve failed: ${served.status}`);
  ok(served.headers.get("content-type") === "image/png", "wrong content type on served image");
  ok(Buffer.from(await served.arrayBuffer()).equals(png), "served bytes differ from upload");
  const profileWithImage = await (
    await fetch(`${APP}/person/${kathleenId}`, { headers: { cookie } })
  ).text();
  ok(profileWithImage.includes("e2e registry screengrab"), "image caption missing from profile");
  const del = await fetch(`${APP}/api/images/${imageId}`, { method: "DELETE", headers: { cookie } });
  ok(del.ok, `image delete failed: ${del.status}`);
  ok((await fetch(`${APP}/api/images/${imageId}`, { headers: { cookie } })).status === 404, "deleted image still served");
  ok(
    (await fetch(`${APP}/api/images/${imageId}`, { redirect: "manual" })).status === 401,
    "anon image access not rejected",
  );
  log(`[${++step}] image upload → serve → delete roundtrip (incl. 401 for anon)`);

  // Raise a question.
  const question = await postJson(
    `${APP}/api/questions`,
    { personId: kathleenId, title: "e2e question?", detail: "from the proof run" },
    cookie,
  );
  ok(question.ok, `question failed: ${question.status}`);
  log(`[${++step}] question raised`);

  // Add a child of Kathleen (parent-of inverse: add child via child-of her union).
  const addPartner = await postJson(
    `${APP}/api/people`,
    { fullName: "e2e Test Relative", birthDate: "1930", link: { kind: "partner-of", personId: kathleenId } },
    cookie,
  );
  ok(addPartner.ok, `add person failed: ${addPartner.status}`);
  log(`[${++step}] new relative added via API`);

  // Activity page shows the trail.
  const activity = await (await fetch(`${APP}/activity`, { headers: { cookie } })).text();
  ok(activity.includes("e2e"), "activity log missing e2e entries");
  log(`[${++step}] activity log updated`);

  // Owner invites; a second member joins with it.
  const inv = await postJson(`${APP}/api/invites`, { note: "sister" }, cookie);
  ok(inv.ok, `invite creation failed: ${inv.status}`);
  const inviteCode = ((await inv.json()) as { code: string }).code;
  const sister = await joinWithInvite(inviteCode, "sister@example.com", "Sister");
  ok(sister.ok, `sister join failed: ${sister.status}`);
  log(`[${++step}] second member joined with a fresh invite`);

  // Logout kills the session.
  const logout = await fetch(`${APP}/api/auth/logout`, { method: "POST", headers: { cookie } });
  ok(logout.ok, "logout failed");
  const afterLogout = await fetch(`${APP}/`, { headers: { cookie }, redirect: "manual" });
  ok(afterLogout.status === 307 || afterLogout.status === 302, "session survived logout");
  log(`[${++step}] logout invalidates the session`);

  log();
  log("kin e2e: all steps passed ✅");
}

async function claimOwnerInvite(): Promise<{ cookie: string; role: string }> {
  // Seed an invite directly via the CLI script, then join with it.
  const created = spawnSync(
    "npx",
    ["tsx", "scripts/create-invite.ts"],
    { encoding: "utf8", env: process.env },
  );
  const match = created.stdout.match(/Invite code:\s*([a-z0-9]{8})/);
  ok(match !== null, `create-invite failed: ${created.stderr}`);
  const code = match![1];
  const res = await postJson(`${APP}/api/auth/join`, {
    code,
    email: "john@example.com",
    name: "John",
    password: "family-proof-2026",
  }, "");
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; role?: string; error?: string };
  ok(res.ok && body.ok, `owner join failed: ${res.status} ${body.error ?? ""}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  return { cookie, role: body.role ?? "member" };
}

async function joinWithInvite(code: string, email: string, name: string) {
  return await postJson(`${APP}/api/auth/join`, {
    code,
    email,
    name,
    password: "sister-password-1",
  }, "");
}

function scrapePersonId(html: string, name: string): number | null {
  const re = new RegExp(`/person/(\\d+)"[^>]*>[\\s\\S]{0,200}?${name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}`);
  const m = html.match(re);
  return m ? Number(m[1]) : null;
}

async function postJson(url: string, body: unknown, cookie: string): Promise<Response> {
  return await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

main()
  .catch((e) => {
    console.error(String(e));
    process.exit(1);
  })
  .finally(async () => {
    if (app?.pid) {
      try {
        process.kill(-app.pid, "SIGTERM"); // the whole group, not just the wrapper
      } catch {
        // already gone
      }
    }
    if (pg) await pg.stop().catch(() => {});
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // temp dir cleanup best-effort
    }
  });
