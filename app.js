import { CATALOG_URL, matchLabels, normalizeCatalog, rankSessions } from "./catalog.mjs";

const questions = [
  {
    label: "YOUR STARTING POINT",
    title: "What are you hoping to unlock?",
    description: "Start with the challenge that’s taking up the most space in your head.",
    options: [
      { icon: "⛓", title: "Bring scattered data together", detail: "Make the whole estate work as one.", tags: ["unify", "integrate"] },
      { icon: "◈", title: "Protect data and earn trust", detail: "Keep sensitive information in the right hands.", tags: ["govern", "protect"] },
      { icon: "✳", title: "Make AI useful with my data", detail: "Ground AI in information I can trust.", tags: ["ai", "activate"] },
      { icon: "↗", title: "Scale what’s already working", detail: "Build a reliable, manageable platform.", tags: ["scale", "operate"] }
    ]
  },
  {
    label: "YOUR ROLE",
    title: "Where do you spend most of your time?",
    description: "No job title needed—pick the kind of work you’re closest to.",
    options: [
      { icon: "⌘", title: "Data platforms & engineering", detail: "Pipelines, platforms, architecture.", tags: ["unify", "integrate", "scale"] },
      { icon: "◎", title: "Security, privacy & compliance", detail: "Controls, classification, risk.", tags: ["govern", "protect"] },
      { icon: "⌁", title: "Analytics & business insights", detail: "Make trusted data useful to teams.", tags: ["activate", "unify"] },
      { icon: "✦", title: "AI apps, agents & copilots", detail: "Build experiences grounded in data.", tags: ["ai", "integrate"] }
    ]
  },
  {
    label: "YOUR NEXT STEP",
    title: "What would make you leave inspired?",
    description: "Think about the idea you’d like to take home with you.",
    options: [
      { icon: "◉", title: "A connected data strategy", detail: "See how the pieces fit together.", tags: ["unify", "integrate"] },
      { icon: "⛨", title: "A safer path to AI", detail: "Reduce risk without slowing down.", tags: ["govern", "protect", "ai"] },
      { icon: "✳", title: "A way to activate trusted data", detail: "Turn data into useful AI experiences.", tags: ["ai", "activate"] },
      { icon: "⚙", title: "A platform that runs at scale", detail: "Make reliability and operations repeatable.", tags: ["scale", "operate", "govern"] }
    ]
  }
];

const icebreakers = [
  "What’s one thing you wish your data could do for your AI projects today?",
  "Where does your data journey get stuck: finding it, trusting it, or putting it to work?",
  "If you could bring one idea home from Ignite, what would it help your team do?",
  "What’s a question about data or AI you hope to leave Ignite able to answer?"
];

let currentStep = 0;
const answers = Array(questions.length).fill(null);
let sessions = [];
let catalogReady = false;
let requestVersion = 0;
let libraryLimit = 20;
let recommendationLimit = 8;

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
const moderatorPanel = document.querySelector("#moderator-panel");
const modeSwitch = document.querySelector("#mode-switch");
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
  nextButton.disabled = answers[currentStep] === null ||
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
  footerHint.textContent = currentStep === 0
    ? "Pick the answer that feels most like you"
    : "Choose the closest fit";
  content.innerHTML = `
    <h2 id="question-title">${question.title}</h2>
    <p class="question-description">${question.description}</p>
    <div class="answer-grid" role="group" aria-labelledby="question-title">
      ${question.options.map((option, index) => `
        <button class="answer-option" type="button" data-option="${index}" aria-pressed="${answers[currentStep] === index}">
          <span class="answer-icon" aria-hidden="true">${option.icon}</span>
          <span class="answer-copy"><strong>${option.title}</strong><small>${option.detail}</small></span>
        </button>
      `).join("")}
    </div>`;
  content.querySelectorAll(".answer-option").forEach((button) => {
    button.addEventListener("click", () => {
      answers[currentStep] = Number(button.dataset.option);
      content.querySelectorAll(".answer-option").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
      updateNextButton();
    });
  });
  updateNextButton();
}

function getRecommendations() {
  const chosenTags = answers.flatMap((answerIndex, questionIndex) =>
    answerIndex === null ? [] : questions[questionIndex].options[answerIndex].tags
  );
  return rankSessions(sessions, chosenTags);
}

function sessionCard(session, index, recommendation = false) {
  const matchText = recommendation
    ? index === 0 ? "Best interest match" : `${session.score} match signals`
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
        ? `<p class="match-reason">Matched to your answers: ${session.matchedTags.map((tag) => matchLabels[tag]).join(" · ")}</p>`
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
      ? `${recommendations.length} Data & AI sessions match your answers. Showing ${visible.length}, ranked by topic overlap with your interests.`
      : "No Data & AI sessions match these answers in the loaded catalog. Try different answers or explore the full catalog below."
    : "Recommendations are unavailable until a catalog is loaded. See the catalog connection above.";
  document.querySelector("#recommendation-list").innerHTML = visible.map((session, index) =>
    sessionCard(session, index, true)).join("");
  moreRecommendationsButton.hidden = !catalogReady || visible.length >= recommendations.length;
}

function showResults() {
  if (!catalogReady) return;
  recommendationLimit = 8;
  renderRecommendations();
  quizShell.hidden = true;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startNewQuestionnaire() {
  currentStep = 0;
  answers.fill(null);
  results.hidden = true;
  quizShell.hidden = false;
  library.hidden = true;
  modeSwitch.setAttribute("aria-pressed", "false");
  moderatorPanel.hidden = true;
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
    : `Connected to the official Ignite 2026 catalog · ${sessions.length} sessions`;
  const dataCount = sessions.filter((session) => session.isDataAI).length;
  const checkedAt = importedName ? "Imported" : "Fetched";
  catalogDetails.textContent = `${dataCount} identified as Data & AI by catalog metadata and keywords. ${checkedAt} ${new Date(catalog.fetchedAt).toLocaleString()}.` +
    (catalog.skippedCount ? ` ${catalog.skippedCount} records without a session code or title were excluded.` : "") +
    (catalog.duplicateCount ? ` ${catalog.duplicateCount} duplicate records were removed.` : "");
  document.querySelector("#catalog-connection").dataset.state = importedName ? "imported" : "connected";
  refreshButton.disabled = false;
  exploreButton.disabled = false;
  updateNextButton();
  libraryLimit = 20;
  recommendationLimit = 8;
  if (!results.hidden) renderRecommendations();
  if (!library.hidden) renderLibrary();
}

function showCatalogError(error) {
  console.error("Ignite catalog loading failed:", error);
  resetCatalogViews();
  catalogStatus.textContent = `Catalog unavailable: ${error.message}`;
  catalogDetails.textContent = "No sample sessions are being substituted. Retry, or download the official JSON catalog and import it below.";
  document.querySelector("#catalog-connection").dataset.state = "error";
  refreshButton.disabled = false;
}

async function loadCatalog(refresh = false) {
  const version = ++requestVersion;
  resetCatalogViews();
  catalogStatus.textContent = "Connecting to Microsoft's full Ignite 2026 session catalog...";
  catalogDetails.textContent = "You can answer the quiz while the catalog loads.";
  document.querySelector("#catalog-connection").dataset.state = "loading";
  refreshButton.disabled = true;
  try {
    const response = await fetch(`/api/catalog${refresh ? "?refresh=1" : ""}`, {
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
  event.preventDefault();
  startNewQuestionnaire();
});

document.querySelector("#retake-button").addEventListener("click", startNewQuestionnaire);

modeSwitch.addEventListener("click", () => {
  const isActive = modeSwitch.getAttribute("aria-pressed") !== "true";
  modeSwitch.setAttribute("aria-pressed", String(isActive));
  moderatorPanel.hidden = !isActive;
  if (isActive) moderatorPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

let promptIndex = 0;
document.querySelector("#shuffle-prompt").addEventListener("click", () => {
  promptIndex = (promptIndex + 1) % icebreakers.length;
  document.querySelector("#icebreaker").textContent = icebreakers[promptIndex];
});

exploreButton.addEventListener("click", () => {
  libraryLimit = 20;
  renderLibrary();
  library.hidden = false;
  library.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#hide-library").addEventListener("click", () => {
  library.hidden = true;
});

document.querySelector("#back-to-quiz").addEventListener("click", () => {
  modeSwitch.setAttribute("aria-pressed", "false");
  moderatorPanel.hidden = true;
  (quizShell.hidden ? results : quizShell).scrollIntoView({ behavior: "smooth", block: "start" });
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
  recommendationLimit += 8;
  renderRecommendations();
});

renderQuestion();
loadCatalog();
