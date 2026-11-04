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

const sessions = [
  {
    id: "BRK346",
    title: "Protect data and accelerate AI adoption with Microsoft Purview",
    description: "Explore how Purview helps identify risk, protect sensitive data across Microsoft 365 and Copilot, and accelerate investigations for secure AI adoption.",
    tags: ["govern", "protect", "ai"],
    topics: ["Data protection", "Governance", "AI readiness"],
    href: "https://ignite.microsoft.com/en-US/sessions/BRK346"
  },
  {
    id: "BRK364",
    title: "Powering AI with Azure Databricks, Foundry, Fabric, and Copilot",
    description: "See how Databricks and Microsoft integrations connect OneLake, Fabric, Foundry, and Copilot Studio to activate trusted data in a governed, open estate.",
    tags: ["unify", "integrate", "ai", "activate"],
    topics: ["Microsoft Fabric", "Azure Databricks", "AI"],
    href: "https://ignite.microsoft.com/en-US/sessions/BRK364"
  },
  {
    id: "BRK352",
    title: "Microsoft Fabric at scale: How we engineer reliability and security",
    description: "Learn how Microsoft approaches Fabric development workflows, observability, governance, security, cost management, and reliability at scale.",
    tags: ["scale", "operate", "govern"],
    topics: ["Microsoft Fabric", "Reliability", "Operations"],
    href: "https://ignite.microsoft.com/en-US/sessions/BRK352"
  }
];

const matchLabels = {
  unify: "Unified data",
  integrate: "Integration",
  govern: "Governance",
  protect: "Data protection",
  ai: "AI",
  activate: "AI-ready data",
  scale: "Scale",
  operate: "Operations"
};

const icebreakers = [
  "What’s one thing you wish your data could do for your AI projects today?",
  "Where does your data journey get stuck: finding it, trusting it, or putting it to work?",
  "If you could bring one idea home from Ignite, what would it help your team do?",
  "What’s a question about data or AI you hope to leave Ignite able to answer?"
];

let currentStep = 0;
const answers = Array(questions.length).fill(null);

const content = document.querySelector("#quiz-content");
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
      nextButton.disabled = false;
    });
  });
  nextButton.disabled = answers[currentStep] === null;
}

function getRecommendations() {
  const chosenTags = answers.flatMap((answerIndex, questionIndex) =>
    answerIndex === null ? [] : questions[questionIndex].options[answerIndex].tags
  );
  const scores = sessions.map((session) => ({
    ...session,
    score: session.tags.reduce((total, tag) => total + chosenTags.filter((chosen) => chosen === tag).length, 0),
    matchedTags: session.tags.filter((tag) => chosenTags.includes(tag))
  }));
  return scores.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function sessionCard(session, index, recommendation = false) {
  const matchText = recommendation
    ? index === 0 ? "Best fit" : session.score ? `${session.score} match signals` : "Related session"
    : "Featured session";
  return `
    <article class="session-card ${recommendation && index === 0 ? "top-match" : ""}">
      <div class="session-topline">
        <span class="session-id">${session.id} · IGNITE 2026</span>
        <span class="match-label">${matchText}</span>
      </div>
      <h3>${session.title}</h3>
      <p>${session.description}</p>
      ${recommendation && session.matchedTags.length
        ? `<p class="match-reason">Matched to your answers: ${session.matchedTags.map((tag) => matchLabels[tag]).join(" · ")}</p>`
        : ""}
      <div class="session-bottom">
        <div class="tag-list">${session.topics.map((topic) => `<span class="tag">${topic}</span>`).join("")}</div>
        <a class="session-link" href="${session.href}" target="_blank" rel="noreferrer">View in catalog <span aria-hidden="true">↗</span></a>
      </div>
    </article>`;
}

function showResults() {
  const recommendations = getRecommendations();
  const top = recommendations[0];
  const summaryBySession = {
    BRK346: "Your picks point toward trustworthy AI and data protection.",
    BRK364: "Your picks point toward connecting data platforms and activating trusted data with AI.",
    BRK352: "Your picks point toward reliable, secure operations at scale."
  };
  document.querySelector("#results-summary").textContent = summaryBySession[top.id];
  document.querySelector("#recommendation-list").innerHTML =
    recommendations.map((session, index) => sessionCard(session, index, true)).join("");
  quizShell.hidden = true;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
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

document.querySelector("#retake-button").addEventListener("click", () => {
  currentStep = 0;
  answers.fill(null);
  results.hidden = true;
  quizShell.hidden = false;
  renderQuestion();
  quizShell.scrollIntoView({ behavior: "smooth", block: "start" });
});

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

document.querySelector("#show-all-sessions").addEventListener("click", () => {
  document.querySelector("#library-list").innerHTML = sessions.map((session, index) =>
    sessionCard(session, index)
  ).join("");
  library.hidden = false;
  library.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#hide-library").addEventListener("click", () => {
  library.hidden = true;
});

document.querySelector("#back-to-quiz").addEventListener("click", () => {
  modeSwitch.setAttribute("aria-pressed", "false");
  moderatorPanel.hidden = true;
  quizShell.scrollIntoView({ behavior: "smooth", block: "start" });
});

renderQuestion();
