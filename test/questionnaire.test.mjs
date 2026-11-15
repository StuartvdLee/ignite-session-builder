import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { CATALOG_URL, matchLabels, normalizeCatalog, rankSessions } from "../catalog.mjs";
import { getQuestions } from "../questionnaire.mjs";

const source = (await readFile(new URL("../app.js", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "");

function element(hidden = false) {
  const listeners = new Map();
  const attributes = new Map();
  return {
    hidden, dataset: {}, style: {}, value: "", buttons: [],
    addEventListener(name, listener) { listeners.set(name, listener); },
    async emit(name, event = {}) { await listeners.get(name)?.(event); },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); },
    scrollIntoView() {},
    querySelectorAll() { return this.buttons; },
    set innerHTML(value) {
      this.html = value;
      this.buttons = [...value.matchAll(/data-option="(\d+)"/g)].map((match) => {
        const button = element();
        button.dataset.option = match[1];
        return button;
      });
    },
    get innerHTML() { return this.html; }
  };
}

async function openQuiz(scope) {
  const elements = new Map();
  const document = {
    body: { dataset: { scope } },
    querySelector(selector) {
      if (!elements.has(selector)) {
        elements.set(selector, element(["#results", "#featured-library", "#moderator-panel"].includes(selector)));
      }
      return elements.get(selector);
    }
  };
  document.querySelector("#library-scope").value = scope;
  const records = [
    { sessionCode: "ENDPOINT", title: "Endpoint security with Intune", description: "Protect device identity and manage deployment." },
    { sessionCode: "DATA", title: "Purview data governance", description: "Protect sensitive data with compliance controls." }
  ];
  const catalog = {
    event: "ignite-2026", source: CATALOG_URL, sourceKind: "bundled",
    fetchedAt: "2026-11-15T00:37:49Z", ...normalizeCatalog(records)
  };
  if (scope === "data-ai") catalog.sessions = catalog.sessions.filter((session) => session.isDataAI);
  const requests = [];
  let loaded;
  const ready = new Promise((resolve) => { loaded = resolve; });
  vm.runInNewContext(source, {
    document, CATALOG_URL, matchLabels, normalizeCatalog, rankSessions,
    getQuestions, console, AbortSignal,
    fetch: async (url) => {
      requests.push(url);
      return {
        ok: true, headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          // Resolve after the app's catalog application microtask.
          setImmediate(loaded);
          return catalog;
        }
      };
    }
  });
  await ready;
  return { get: (selector) => document.querySelector(selector), requests };
}

for (const scope of ["all", "data-ai"]) {
  test(`${scope} page runs its questionnaire and ranks sessions within its scope`, async () => {
    const { get, requests } = await openQuiz(scope);
    assert.deepEqual(requests, [`/api/catalog?scope=${scope}`]);
    assert.match(get("#catalog-status").textContent, /snapshot.*Works offline/);
    assert.equal(get("#quiz-content").buttons.length, scope === "all" ? 6 : 4);
    const choices = scope === "all" ? [2, 3, 1] : [1, 0, 1];
    for (const choice of choices) {
      await get("#quiz-content").buttons[choice].emit("click");
      assert.equal(get("#next-button").disabled, false);
      await get("#next-button").emit("click");
    }
    assert.equal(get("#results").hidden, false);
    assert.equal(get("#quiz-shell").hidden, true);
    if (scope === "all") {
      assert.match(get("#recommendation-list").innerHTML, /Endpoint security with Intune/);
      assert.doesNotMatch(get("#recommendation-list").innerHTML, /Purview data governance/);
      assert.match(get("#results-summary").textContent, /Ignite 2026 sessions/);
    } else {
      assert.match(get("#recommendation-list").innerHTML, /Purview data governance/);
      assert.doesNotMatch(get("#recommendation-list").innerHTML, /Endpoint security with Intune/);
      assert.match(get("#results-summary").textContent, /Data & AI sessions/);
    }

    await get("#retake-button").emit("click");
    assert.equal(get("#results").hidden, true);
    assert.equal(get("#quiz-shell").hidden, false);
    assert.equal(get("#next-button").disabled, true);
  });
}

test("changing topic replaces follow-ups and clears stale answers, but reselecting it preserves them", async () => {
  const { get } = await openQuiz("all");
  await get("#quiz-content").buttons[2].emit("click");
  await get("#next-button").emit("click");
  assert.match(get("#quiz-content").innerHTML, /Microsoft Intune/);
  await get("#quiz-content").buttons[3].emit("click");
  await get("#next-button").emit("click");
  await get("#quiz-content").buttons[1].emit("click");
  await get("#back-button").emit("click");
  await get("#back-button").emit("click");
  await get("#quiz-content").buttons[2].emit("click");
  await get("#next-button").emit("click");
  assert.equal(get("#next-button").disabled, false);
  await get("#back-button").emit("click");
  await get("#quiz-content").buttons[0].emit("click");
  await get("#next-button").emit("click");
  assert.match(get("#quiz-content").innerHTML, /GitHub Copilot/);
  assert.doesNotMatch(get("#quiz-content").innerHTML, /Microsoft Intune/);
  assert.equal(get("#next-button").disabled, true);
  await get("#quiz-content").buttons[0].emit("click");
  await get("#next-button").emit("click");
  assert.equal(get("#next-button").disabled, true);
});

test("specific product evidence excludes sessions that mention the focus only in passing", () => {
  const { sessions } = normalizeCatalog([
    { sessionCode: "FOCUSED", title: "Build agents with Copilot Studio", description: "Develop AI apps." },
    { sessionCode: "PASSING", title: "Build AI apps", description: "Develop solutions with examples including Copilot Studio." },
    { sessionCode: "NO-OUTCOME", title: "Copilot Studio overview", description: "Learn about AI agents." }
  ]);
  const questions = getQuestions("all", 0);
  const primary = questions[0].options[0].tags;
  const focus = questions[1].options[2].tags;
  const outcome = questions[2].options[0].tags;
  assert.deepEqual(
    rankSessions(sessions, [focus, primary, outcome]).map((session) => session.id),
    ["FOCUSED"]
  );
});
