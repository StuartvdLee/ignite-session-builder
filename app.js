import { CATALOG_URL, matchLabels, normalizeCatalog, rankSessions } from "./catalog.mjs";
import { getQuestions } from "./questionnaire.mjs";

const scope = document.body.dataset.scope;
const isDataAI = scope === "data-ai";
const scopeLabel = isDataAI ? "Data & AI" : "Ignite 2026";
let questions = getQuestions(scope);

let currentStep = 0;
const answers = Array(questions.length).fill(null);
let sessions = [];
let catalogReady = false;
let requestVersion = 0;
let libraryLimit = 20;
let recommendationLimit = 10;

const content = document.querySelector("#quiz-content");
const homeLink = document.querySelector(".wordmark");
const nextButton = document.querySelector("#next-button");
const backButton = document.querySelector("#back-button");
const stepLabel = document.querySelector("#step-label");
const progressLabel = document.querySelector("#progress-label");
const progressFill = document.querySelector("#progress-fill");
const footerHint = document.querySelector("#footer-hint");
const results = document.querySelector("#results");
const quizShell = document.querySelector("#quiz-shell");
const library = document.querySelector("#featured-library");
const catalogStatus = document.querySelector("#catalog-status");
const catalogDetails = document.querySelector("#catalog-details");
const refreshButton = document.querySelector("#refresh-catalog");
const exploreButton = document.querySelector("#show-all-sessions");
const librarySearch = document.querySelector("#library-search");
const libraryScope = document.querySelector("#library-scope");
const moreLibraryButton = document.querySelector("#more-library");
const moreRecommendationsButton = document.querySelector("#more-recommendations");

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function updateNextButton() {
  const answer = answers[currentStep];
  nextButton.disabled = (Array.isArray(answer) ? answer.length === 0 : answer === null) ||
    (currentStep === questions.length - 1 && !catalogReady);
}

function renderQuestion() {
  const question = questions[currentStep];
  stepLabel.textContent = question.label;
  progressLabel.innerHTML = `${String(currentStep + 1).padStart(2, "0")} <span>/ ${String(questions.length).padStart(2, "0")}</span>`;
  progressFill.style.width = `${((currentStep + 1) / questions.length) * 100}%`;
  backButton.hidden = currentStep === 0;
  nextButton.innerHTML = currentStep === questions.length - 1
    ? 'Show my sessions <span aria-hidden="true">✦</span>'
    : 'Next <span aria-hidden="true">→</span>';
  footerHint.textContent = currentStep === 1
    ? "Select one or more technologies"
    : currentStep === 0
      ? "Pick the answer that feels most like you"
      : "Choose the closest fit";
  content.innerHTML = `
    <h2 id="question-title">${question.title}</h2>
    <p class="question-description">${question.description}</p>
    <div class="answer-grid" role="group" aria-labelledby="question-title">
      ${question.options.map((option, index) => `
        <button class="answer-option" type="button" data-option="${index}" aria-pressed="${Array.isArray(answers[currentStep])
          ? answers[currentStep].includes(index)
          : answers[currentStep] === index}">
          ${option.visual
            ? `<span class="answer-icon answer-visual" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><use href="/assets/technology-icons.svg#${escapeHtml(option.visual)}"></use></svg></span>`
            : `<span class="answer-icon" aria-hidden="true">${option.icon}</span>`}
          <span class="answer-copy"><strong>${option.title}</strong><small>${option.detail}</small></span>
        </button>
      `).join("")}
    </div>`;
  content.querySelectorAll(".answer-option").forEach((button) => {
    button.addEventListener("click", () => {
      const answer = Number(button.dataset.option);
      if (currentStep === 1) {
        const selected = answers[currentStep] ?? [];
        answers.fill(null, currentStep + 1);
        answers[currentStep] = selected.includes(answer)
          ? selected.filter((index) => index !== answer)
          : [...selected, answer];
      } else {
        if (answers[currentStep] !== answer) answers.fill(null, currentStep + 1);
        answers[currentStep] = answer;
      }
      questions = getQuestions(scope, answers[0]);
      content.querySelectorAll(".answer-option").forEach((option) => {
        const index = Number(option.dataset.option);
        option.setAttribute("aria-pressed", String(Array.isArray(answers[currentStep])
          ? answers[currentStep].includes(index)
          : answers[currentStep] === index));
      });
      updateNextButton();
    });
  });
  updateNextButton();
}

function getRecommendations() {
  const answerGroups = answers.map((answer, questionIndex) =>
    answer === null ? [] : (Array.isArray(answer) ? answer : [answer])
      .flatMap((answerIndex) => questions[questionIndex].options[answerIndex].tags)
  );
  // The specific technology, not the broad starting topic, needs title/product evidence.
  return rankSessions(sessions, [answerGroups[1], answerGroups[0], answerGroups[2]], scope);
}

function sessionCard(session, index, recommendation = false) {
  const matchText = recommendation
    ? index === 0 ? "Best interest match" : "Matches your selected interests"
    : session.isDataAI ? "Data & AI" : "Official catalog";
  const details = [session.type, session.level, session.speakers].filter(Boolean).join(" · ");
  return `
    <article class="session-card ${recommendation && index === 0 ? "top-match" : ""}">
      <div class="session-topline">
        <span class="session-id">${escapeHtml(session.id)} · IGNITE 2026</span>
        <span class="match-label">${matchText}</span>
      </div>
      <h3>${escapeHtml(session.title)}</h3>
      <p>${escapeHtml(session.description || "No abstract is published in the catalog yet.")}</p>
      ${details ? `<p class="session-meta">${escapeHtml(details)}</p>` : ""}
      ${recommendation && session.matchedTags.length
        ? `<p class="match-reason">Matched to your answers: ${session.matchedTags.map((tag) => escapeHtml(matchLabels[tag])).join(" · ")}</p>`
        : ""}
      <div class="session-bottom">
        <div class="tag-list">${session.topics.slice(0, 5).map((topic) => `<span class="tag">${escapeHtml(topic)}</span>`).join("")}</div>
        <a class="session-link" href="${escapeHtml(session.href)}" target="_blank" rel="noreferrer">${session.hasDirectLink ? "View session" : "Find in catalog"} <span aria-hidden="true">↗</span></a>
      </div>
      ${session.hasDirectLink ? "" : '<p class="catalog-note">No direct session link is published in this record. Search the catalog using the session code above.</p>'}
    </article>`;
}

function renderRecommendations() {
  const recommendations = getRecommendations();
  const visible = recommendations.slice(0, recommendationLimit);
  document.querySelector("#results-summary").textContent = catalogReady
    ? recommendations.length
      ? `${recommendations.length} ${scopeLabel} sessions match your topic, technology and outcome, with your chosen technology in the title or products. Showing ${visible.length}, ranked by strength of evidence.`
      : `No ${scopeLabel} sessions match this topic, technology and outcome with a strong technology match. Try different answers or explore the unfiltered catalog below.`
    : "Recommendations are unavailable until a catalog is loaded. See the catalog connection above.";
  document.querySelector("#recommendation-list").innerHTML = visible.map((session, index) =>
    sessionCard(session, index, true)).join("");
  moreRecommendationsButton.hidden = !catalogReady || visible.length >= recommendations.length;
}

function showResults() {
  if (!catalogReady) return;
  recommendationLimit = 10;
  renderRecommendations();
  quizShell.hidden = true;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startNewQuestionnaire() {
  currentStep = 0;
  answers.fill(null);
  questions = getQuestions(scope);
  results.hidden = true;
  quizShell.hidden = false;
  library.hidden = true;
  renderQuestion();
  quizShell.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLibrary() {
  const query = librarySearch.value.trim().toLowerCase();
  const matching = sessions.filter((session) =>
    (libraryScope.value === "all" || session.isDataAI) &&
    [session.id, session.title, session.description, session.speakers, ...session.topics]
      .join(" ").toLowerCase().includes(query)
  );
  const visible = matching.slice(0, libraryLimit);
  document.querySelector("#library-count").textContent = catalogReady
    ? `${matching.length} sessions found · showing ${visible.length} of ${sessions.length} catalog sessions`
    : "Load a catalog to explore sessions.";
  document.querySelector("#library-list").innerHTML = visible.length
    ? visible.map((session, index) => sessionCard(session, index)).join("")
    : catalogReady ? '<p class="empty-state">No sessions match these filters. Try another search or choose the full catalog.</p>' : "";
  moreLibraryButton.hidden = !catalogReady || visible.length >= matching.length;
}

function resetCatalogViews() {
  sessions = [];
  catalogReady = false;
  moreRecommendationsButton.hidden = true;
  exploreButton.disabled = true;
  updateNextButton();
  if (!results.hidden) renderRecommendations();
  if (!library.hidden) renderLibrary();
}

function applyCatalog(catalog, importedName = null) {
  sessions = catalog.sessions;
  catalogReady = true;
  catalogStatus.textContent = importedName
    ? `Imported ${sessions.length} sessions from ${importedName}. This is a local snapshot, not a live connection.`
    : catalog.sourceKind === "bundled"
      ? `Loaded the bundled Ignite 2026 ${isDataAI ? "Data & AI" : "full-catalog"} snapshot · ${sessions.length} sessions. Works offline.`
      : `Connected to the official Ignite 2026 catalog · ${sessions.length} sessions`;
  const dataCount = sessions.filter((session) => session.isDataAI).length;
  const checkedAt = importedName ? "Imported" : catalog.sourceKind === "bundled" ? "Snapshot downloaded" : "Fetched";
  catalogDetails.textContent = `${dataCount} identified as Data & AI by catalog metadata and keywords. ${checkedAt} ${new Date(catalog.fetchedAt).toLocaleString()}.` +
    (catalog.skippedCount ? ` ${catalog.skippedCount} records without a session code or title were excluded.` : "") +
    (catalog.duplicateCount ? ` ${catalog.duplicateCount} duplicate records were removed.` : "");
  document.querySelector("#catalog-connection").dataset.state = importedName || catalog.sourceKind === "bundled" ? "imported" : "connected";
  refreshButton.disabled = false;
  exploreButton.disabled = false;
  updateNextButton();
  libraryLimit = 20;
  recommendationLimit = 10;
  if (!results.hidden) renderRecommendations();
  if (!library.hidden) renderLibrary();
}

function showCatalogError(error) {
  console.error("Ignite catalog loading failed:", error);
  resetCatalogViews();
  catalogStatus.textContent = `Catalog unavailable: ${error.message}`;
  catalogDetails.textContent = "Reload this page to use the bundled offline snapshot, retry, or import an official JSON catalog below.";
  document.querySelector("#catalog-connection").dataset.state = "error";
  refreshButton.disabled = false;
}

async function loadCatalog(refresh = false) {
  const version = ++requestVersion;
  resetCatalogViews();
  catalogStatus.textContent = refresh ? "Refreshing from Microsoft's Ignite 2026 session catalog..." : "Loading the bundled offline session catalog...";
  catalogDetails.textContent = "You can answer the quiz while the catalog loads.";
  document.querySelector("#catalog-connection").dataset.state = "loading";
  refreshButton.disabled = true;
  try {
    const response = await fetch(`/api/catalog?scope=${scope}${refresh ? "&refresh=1" : ""}`, {
      signal: AbortSignal.timeout(35_000)
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("The catalog API is unavailable. Run this app with npm start, not a generic static server.");
    }
    const catalog = await response.json();
    if (!response.ok) throw new Error(catalog.error || `Catalog request failed (HTTP ${response.status}).`);
    if (catalog.event !== "ignite-2026" || catalog.source !== CATALOG_URL ||
        !Array.isArray(catalog.sessions) || !catalog.sessions.length ||
        !Number.isFinite(Date.parse(catalog.fetchedAt))) {
      throw new Error("The server returned an invalid Ignite 2026 catalog.");
    }
    if (version === requestVersion) applyCatalog(catalog);
  } catch (error) {
    if (version === requestVersion) showCatalogError(error);
  }
}

nextButton.addEventListener("click", () => {
  if (answers[currentStep] === null) return;
  if (currentStep < questions.length - 1) {
    currentStep += 1;
    renderQuestion();
  } else {
    showResults();
  }
});

backButton.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep -= 1;
    renderQuestion();
  }
});

homeLink.addEventListener("click", (event) => {
  if (isDataAI) return;
  event.preventDefault();
  startNewQuestionnaire();
});

document.querySelector("#retake-button").addEventListener("click", startNewQuestionnaire);

exploreButton.addEventListener("click", () => {
  libraryLimit = 20;
  renderLibrary();
  library.hidden = false;
  library.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#hide-library").addEventListener("click", () => {
  library.hidden = true;
});

refreshButton.addEventListener("click", () => loadCatalog(true));

document.querySelector("#catalog-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const version = ++requestVersion;
  resetCatalogViews();
  refreshButton.disabled = true;
  document.querySelector("#catalog-connection").dataset.state = "loading";
  catalogStatus.textContent = "Reading catalog file...";
  catalogDetails.textContent = "";
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error("The catalog file must be smaller than 50 MB.");
    const catalog = normalizeCatalog(JSON.parse(await file.text()));
    if (isDataAI) catalog.sessions = catalog.sessions.filter((session) => session.isDataAI);
    if (version === requestVersion) {
      applyCatalog({ ...catalog, fetchedAt: new Date().toISOString() }, file.name);
    }
  } catch (error) {
    if (version === requestVersion) showCatalogError(error);
  } finally {
    event.target.value = "";
  }
});

for (const filter of [librarySearch, libraryScope]) {
  filter.addEventListener("input", () => {
    libraryLimit = 20;
    renderLibrary();
  });
}
moreLibraryButton.addEventListener("click", () => {
  libraryLimit += 20;
  renderLibrary();
});
moreRecommendationsButton.addEventListener("click", () => {
  recommendationLimit += 20;
  renderRecommendations();
});

renderQuestion();
loadCatalog();
