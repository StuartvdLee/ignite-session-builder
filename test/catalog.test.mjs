import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CATALOG_PAGE, CATALOG_URL, normalizeCatalog, rankSessions } from "../catalog.mjs";
import { CATALOG_CACHE_MS, createBundledCatalogLoader, createCatalogLoader } from "../catalog-service.mjs";
import { getQuestions } from "../questionnaire.mjs";
import { createAppServer } from "../server.mjs";

// Synthetic records exercise the documented Microsoft feed schema, not real session claims.
const records = [
  {
    sessionCode: "TEST-DATA",
    title: "Unify data with Fabric and OneLake",
    description: "<p>Integration pipelines for an AI-ready lakehouse &amp; trusted analytics.</p>",
    topic: [{ displayValue: "Data & AI" }],
    product: [{ displayValue: "Microsoft Fabric" }],
    tags: [{ displayValue: "Data engineering" }],
    sessionInstanceId: "opaque-instance-123",
    langLocale: "en-US",
    speakerNames: ["Test Speaker A", "Test Speaker B"],
    sessionLevel: [{ displayValue: "(300) Advanced" }],
    sessionType: { displayValue: "Breakout" },
    location: { displayValue: "Test room" }
  },
  {
    sessionCode: "TEST-GOVERN",
    title: "Purview data governance",
    description: "Protect sensitive data with classification, privacy and compliance controls.",
    product: "Microsoft Purview",
    tags: { displayValue: "Governance" }
  },
  {
    sessionCode: "TEST-SCALE",
    title: "Operate Fabric at enterprise scale",
    description: "Monitor reliability, cost and deployment automation."
  },
  {
    sessionCode: "TEST-OTHER",
    title: "Manage endpoints",
    description: "Security and governance for device deployment.",
    topic: "Endpoint management"
  }
];

test("normalizes the documented object/array/string metadata shapes", () => {
  const { sessions, recordCount, skippedCount } = normalizeCatalog(records);
  assert.equal(recordCount, 4);
  assert.equal(sessions.length, 4);
  assert.equal(skippedCount, 0);
  assert.deepEqual(sessions[0].topics, ["Data & AI", "Microsoft Fabric", "Data engineering"]);
  assert.equal(sessions[0].description, "Integration pipelines for an AI-ready lakehouse & trusted analytics.");
  assert.equal(sessions[0].speakers, "Test Speaker A, Test Speaker B");
  assert.equal(sessions[0].level, "(300) Advanced");
  assert.equal(sessions[0].type, "Breakout");
  assert.equal(sessions[0].location, "Test room");
  assert.deepEqual(sessions.map((session) => session.isDataAI), [true, true, true, false]);
});

test("uses opaque instance IDs for session links and never guesses missing URLs", () => {
  const { sessions } = normalizeCatalog(records);
  assert.equal(sessions[0].href, "https://ignite.microsoft.com/en-US/sessions/opaque-instance-123?source=sessions");
  assert.equal(sessions[0].hasDirectLink, true);
  assert.equal(sessions[1].href, CATALOG_PAGE);
  assert.equal(sessions[1].hasDirectLink, false);
  const { sessions: unusual } = normalizeCatalog([{
    ...records[0], sessionInstanceId: '"/?x=<script>', langLocale: "en-US"
  }]);
  assert.equal(unusual[0].href, "https://ignite.microsoft.com/en-US/sessions/%22%2F%3Fx%3D%3Cscript%3E?source=sessions");
  assert.equal(normalizeCatalog([{ ...records[0], langLocale: "../" }]).sessions[0].hasDirectLink, false);
});

test("counts invalid and duplicate records, preserving distinct repeated instances", () => {
  const result = normalizeCatalog([
    ...records, records[0], null, { sessionCode: "BAD" },
    { ...records[0], sessionInstanceId: "another-instance" }
  ]);
  assert.equal(result.sessions.length, 5);
  assert.equal(result.skippedCount, 2);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.recordCount, 8);
});

test("rejects malformed or empty feeds instead of returning sample sessions", () => {
  for (const raw of [null, {}, { sessions: records }, [], [null, { title: "Missing code" }]]) {
    assert.throws(() => normalizeCatalog(raw), /catalog|sessions/i);
  }
});

test("matches Data & AI interests and excludes unrelated governance content", () => {
  const { sessions } = normalizeCatalog(records);
  const governance = rankSessions(sessions, [["govern", "protect", "protect"]], "data-ai");
  assert.equal(governance[0].id, "TEST-GOVERN");
  assert.ok(governance[0].score > 0);
  assert.deepEqual(governance[0].matchedTags, ["govern", "protect"]);
  assert.ok(!governance.some((session) => session.id === "TEST-OTHER"));
  assert.equal(rankSessions(sessions, [["unify", "integrate"]])[0].id, "TEST-DATA");
  assert.equal(rankSessions(sessions, [["operate", "scale"]])[0].id, "TEST-SCALE");
  assert.deepEqual(rankSessions(sessions, []), []);
});

test("all-session questionnaire recommends non-Data & AI content; focused quiz excludes it", () => {
  const { sessions } = normalizeCatalog(records);
  const securityTags = getQuestions("all")[0].options.find((option) => option.tags.includes("security")).tags;
  const all = rankSessions(sessions, [securityTags]);
  assert.ok(all.some((session) => session.id === "TEST-OTHER"));
  assert.ok(!rankSessions(sessions, [securityTags], "data-ai").some((session) => session.id === "TEST-OTHER"));
});

test("requires every answer and a title or product match for the primary interest", () => {
  const { sessions } = normalizeCatalog([
    { sessionCode: "GOOD", title: "Secure apps with Defender", description: "Develop AI agents." },
    { sessionCode: "PRODUCT", title: "Build reliable platforms", product: "Microsoft Defender", description: "Develop AI agents." },
    { sessionCode: "ONE-ANSWER", title: "Endpoint security", description: "Manage devices." },
    { sessionCode: "INCIDENTAL", title: "AI apps with GitHub", description: "Learn about security too." },
    { sessionCode: "UMBRELLA", title: "Team collaboration", topic: "Cloud & AI", description: "Develop secure apps." }
  ]);
  const matches = rankSessions(sessions, [["security"], ["develop"], ["ai"]]);
  assert.deepEqual(matches.map((session) => session.id), ["GOOD", "PRODUCT"]);
  assert.ok(matches[0].score > matches[1].score);
  assert.deepEqual(matches[0].matchedTags.sort(), ["ai", "develop", "security"]);
  const broader = rankSessions(sessions, [["security"]]);
  assert.ok(broader.some((session) => session.id === "ONE-ANSWER"));
  assert.ok(matches.every((session) => broader.some((candidate) => candidate.key === session.key)));
  assert.deepEqual(rankSessions(sessions, [["security"], [], ["ai"]]), []);
  assert.deepEqual(rankSessions(sessions, [["cloud"], ["unify"]]), []);
});

test("normalizes answer coverage so duplicate tags cannot inflate the ranking", () => {
  const { sessions } = normalizeCatalog(records);
  assert.deepEqual(
    rankSessions(sessions, [["govern", "protect", "protect"]]),
    rankSessions(sessions, [["govern", "protect"]])
  );
});

test("bundled catalogs load offline and preserve the complete raw Data & AI subset", async () => {
  let liveCalls = 0;
  const load = createBundledCatalogLoader({ loadLiveCatalog: async ({ refresh }) => {
    assert.equal(refresh, true);
    liveCalls += 1;
    return { ...normalizeCatalog(records), sourceKind: "live" };
  } });
  const full = await load();
  const data = await load({ scope: "data-ai" });
  const raw = JSON.parse(await readFile(new URL("../data/ignite-2026-all-sessions.json", import.meta.url), "utf8"));
  const subset = JSON.parse(await readFile(new URL("../data/ignite-2026-data-ai-sessions.json", import.meta.url), "utf8"));
  assert.equal(liveCalls, 0);
  assert.equal(full.sourceKind, "bundled");
  assert.equal(full.event, "ignite-2026");
  assert.equal(full.source, CATALOG_URL);
  assert.ok(Number.isFinite(Date.parse(full.fetchedAt)));
  assert.equal(full.sessions.length, raw.length);
  assert.deepEqual(data.sessions, full.sessions.filter((session) => session.isDataAI));
  assert.deepEqual(subset, raw.filter((record) => normalizeCatalog([record]).sessions[0].isDataAI));
  for (const scope of ["all", "data-ai"]) {
    const startingQuestion = getQuestions(scope)[0];
    for (let index = 0; index < startingQuestion.options.length; index += 1) {
      for (const question of getQuestions(scope, index)) {
        for (const option of question.options) {
          assert.ok(rankSessions(full.sessions, [option.tags], scope).length > 0, option.title);
        }
      }
    }
  }
  assert.strictEqual(await load(), full);
  const refreshed = await load({ refresh: true, scope: "data-ai" });
  assert.equal(liveCalls, 1);
  assert.equal(refreshed.sourceKind, "live");
  assert.ok(refreshed.sessions.every((session) => session.isDataAI));
  assert.equal(refreshed.sessions.length, 3);
  assert.strictEqual(await load(), full);
});

test("loads the full feed without truncation, caches, and supports forced refresh", async () => {
  let time = Date.parse("2026-11-04T22:00:00Z");
  let fetchCount = 0;
  const allRecords = Array.from({ length: 205 }, (_, i) => ({
    ...records[0], sessionCode: `TEST-${i}`, sessionInstanceId: `instance-${i}`
  }));
  const load = createCatalogLoader({
    now: () => time,
    fetchImpl: async (url, options) => {
      assert.equal(url, CATALOG_URL);
      assert.equal(options.redirect, "follow");
      assert.ok(options.signal instanceof AbortSignal);
      fetchCount += 1;
      return Response.json(allRecords);
    }
  });
  const first = await load();
  assert.equal(first.sessions.length, 205);
  assert.equal(first.source, CATALOG_URL);
  assert.equal(first.event, "ignite-2026");
  assert.equal(first.fetchedAt, "2026-11-04T22:00:00.000Z");
  assert.strictEqual(await load(), first);
  assert.equal(fetchCount, 1);
  await load({ refresh: true });
  assert.equal(fetchCount, 2);
  time += CATALOG_CACHE_MS + 1;
  await load();
  assert.equal(fetchCount, 3);
});

test("shares simultaneous catalog downloads", async () => {
  let release;
  let fetchCount = 0;
  const load = createCatalogLoader({ fetchImpl: () => {
    fetchCount += 1;
    return new Promise((resolve) => { release = resolve; });
  } });
  const first = load();
  const second = load({ refresh: true });
  release(Response.json(records));
  assert.strictEqual(await first, await second);
  assert.equal(fetchCount, 1);
});

test("exposes network failures, releases failed requests, and retries", async () => {
  let fail = true;
  const load = createCatalogLoader({ fetchImpl: async () => {
    if (fail) throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    return Response.json(records);
  } });
  await assert.rejects(load(), /ENOTFOUND/);
  fail = false;
  assert.equal((await load()).sessions.length, 4);
});

test("does not substitute stale cached data when refresh or revalidation fails", async () => {
  let time = 0;
  let fail = false;
  const load = createCatalogLoader({
    now: () => time,
    fetchImpl: async () => fail ? new Response("", { status: 503 }) : Response.json(records)
  });
  await load();
  fail = true;
  await assert.rejects(load({ refresh: true }), /HTTP 503/);
  await assert.rejects(load(), /HTTP 503/);
  time += CATALOG_CACHE_MS + 1;
  await assert.rejects(load(), /HTTP 503/);
});

test("reports upstream timeout and streaming-size failures", async () => {
  const timeoutLoad = createCatalogLoader({ fetchImpl: async () => {
    throw new DOMException("Timed out", "TimeoutError");
  } });
  await assert.rejects(timeoutLoad(), /TimeoutError/);
  const oversized = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(50 * 1024 * 1024 + 1));
      controller.close();
    }
  });
  const oversizedLoad = createCatalogLoader({ fetchImpl: async () => new Response(oversized) });
  await assert.rejects(oversizedLoad(), /50 MB/);
});

test("rejects invalid JSON, HTML sign-in pages, wrong schema, and oversized downloads", async () => {
  const responses = [
    [() => new Response("<html>sign in</html>"), /invalid JSON/],
    [() => Response.json({ sessions: records }), /JSON array/],
    [() => new Response("[]", { headers: { "content-length": String(51 * 1024 * 1024) } }), /50 MB/],
    [() => new Response(null), /empty/]
  ];
  for (const [response, expected] of responses) {
    const load = createCatalogLoader({ fetchImpl: async () => response() });
    await assert.rejects(load(), expected);
  }
});

async function serve(t, options) {
  const server = createAppServer(options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test("local server exposes the complete catalog and explicit refresh API", async (t) => {
  let refreshed = false;
  const catalog = {
    event: "ignite-2026", source: CATALOG_URL, fetchedAt: new Date().toISOString(),
    ...normalizeCatalog(records)
  };
  const base = await serve(t, { loadCatalog: async ({ refresh }) => {
    refreshed = refresh;
    return catalog;
  } });
  const response = await fetch(`${base}/api/catalog`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), catalog);
  assert.equal(refreshed, false);
  await fetch(`${base}/api/catalog?refresh=1`);
  assert.equal(refreshed, true);
  const head = await fetch(`${base}/api/catalog`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("API failures return non-success JSON and log the cause", async (t) => {
  const logged = [];
  t.mock.method(console, "error", (...args) => logged.push(args));
  const base = await serve(t, { loadCatalog: async () => { throw new Error("Catalog offline"); } });
  const response = await fetch(`${base}/api/catalog`);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Catalog offline" });
  assert.equal(logged.length, 1);
});

test("serves browser modules but not backend code, and preserves HTTP behavior", async (t) => {
  const base = await serve(t);
  for (const path of ["/", "/data-ai", "/data-ai/", "/app.js", "/styles.css", "/catalog.mjs", "/questionnaire.mjs"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 100);
  }
  for (const path of ["/server.mjs", "/catalog-service.mjs", "/package.json", "/test/catalog.test.mjs"]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  const response = await fetch(base + "/", { method: "POST" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
  assert.equal(await (await fetch(base + "/", { method: "HEAD" })).text(), "");
});

test("serves the bundled technology logos without a network", async (t) => {
  const base = await serve(t);
  const response = await fetch(`${base}/assets/technology-icons.svg`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /image\/svg\+xml/);
  assert.match(await response.text(), /<symbol id="fabric"/);
  const head = await fetch(`${base}/assets/technology-icons.svg`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("pages select distinct questionnaires and APIs load their snapshots without a network", async (t) => {
  const base = await serve(t, {
    loadCatalog: createBundledCatalogLoader({ loadLiveCatalog: async () => {
      assert.fail("Loading a bundled catalog must not contact Microsoft.");
    } })
  });
  const home = await (await fetch(base + "/")).text();
  const dataPage = await (await fetch(base + "/data-ai")).text();
  assert.match(home, /data-scope="all"/);
  assert.match(home, /questionnaire for all of Microsoft Ignite 2026/);
  assert.match(home, /href="\/data-ai"/);
  assert.match(dataPage, /data-scope="data-ai"/);
  assert.match(dataPage, /href="\/"/);
  for (const page of [home, dataPage]) {
    assert.match(page, /<\/div>\s*<button id="refresh-catalog"[^>]*>Refresh catalog<\/button>\s*<\/div>\s*<p class="catalog-note">Offline JSON:/);
  }
  const full = await (await fetch(base + "/api/catalog")).json();
  const data = await (await fetch(base + "/api/catalog?scope=data-ai")).json();
  assert.equal(full.sourceKind, "bundled");
  assert.equal(data.sourceKind, "bundled");
  assert.ok(full.sessions.some((session) => !session.isDataAI));
  assert.deepEqual(data.sessions, full.sessions.filter((session) => session.isDataAI));
  for (const file of ["all", "data-ai"]) {
    const response = await fetch(`${base}/data/ignite-2026-${file}-sessions.json`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal((await response.json()).length, file === "all" ? full.recordCount : data.recordCount);
  }
  assert.equal((await fetch(base + "/api/catalog?scope=unknown")).status, 400);
});
