const allStartingQuestion = {
  label: "YOUR STARTING POINT",
  title: "What do you want to explore at Ignite 2026?",
  description: "This questionnaire covers all of Ignite 2026, across every session area.",
  options: [
    { icon: "✦", title: "AI, agents & copilots", detail: "Put AI to work across your organization.", tags: ["ai"] },
    { icon: "⛓", title: "Data & analytics", detail: "Connect data and turn it into insights.", tags: ["unify", "integrate", "activate", "database"] },
    { icon: "⛨", title: "Security & identity", detail: "Protect people, devices and information.", tags: ["security", "protect", "govern"] },
    { icon: "↗", title: "Cloud & infrastructure", detail: "Build and run a modern platform.", tags: ["cloud", "scale", "operate"] },
    { icon: "◎", title: "Microsoft 365 & work", detail: "Help teams collaborate and get more done.", tags: ["productivity"] },
    { icon: "⌘", title: "Apps & developer tools", detail: "Build with GitHub, Azure and Power Platform.", tags: ["develop"] }
  ]
};

const dataAIStartingQuestion = {
  label: "YOUR STARTING POINT",
  title: "What are you hoping to unlock?",
  description: "Start with the challenge that’s taking up the most space in your head.",
  options: [
    { icon: "⛓", title: "Bring scattered data together", detail: "Make the whole estate work as one.", tags: ["unify", "integrate"] },
    { icon: "◈", title: "Protect data and earn trust", detail: "Keep sensitive information in the right hands.", tags: ["govern", "protect"] },
    { icon: "✳", title: "Make AI useful with my data", detail: "Ground AI in information I can trust.", tags: ["ai", "activate"] },
    { icon: "↗", title: "Scale what’s already working", detail: "Build a reliable, manageable platform.", tags: ["scale", "operate"] }
  ]
};

const focuses = {
  foundry: { icon: "✦", visual: "foundry", title: "Microsoft Foundry & Azure AI", detail: "Build and manage AI applications and agents.", tags: ["foundry"] },
  m365copilot: { icon: "◎", visual: "m365copilot", title: "Microsoft 365 Copilot", detail: "Bring Copilot into everyday work.", tags: ["m365copilot"] },
  copilotstudio: { icon: "✳", visual: "copilotstudio", title: "Copilot Studio", detail: "Create and connect low-code agents.", tags: ["copilotstudio"] },
  githubcopilot: { icon: "⌘", visual: "githubcopilot", title: "GitHub Copilot", detail: "Use AI in your coding workflow.", tags: ["githubcopilot"] },
  fabric: { icon: "⛓", visual: "fabric", title: "Microsoft Fabric & OneLake", detail: "Unify your data platform and analytics.", tags: ["fabric"] },
  powerbi: { icon: "◎", visual: "powerbi", title: "Power BI", detail: "Build semantic models and useful insights.", tags: ["powerbi"] },
  databricks: { icon: "⌘", visual: "databricks", title: "Azure Databricks", detail: "Engineer data and AI on a lakehouse.", tags: ["databricks"] },
  database: { icon: "⚙", visual: "database", title: "SQL & databases", detail: "Work with SQL, PostgreSQL and Cosmos DB.", tags: ["database"] },
  cosmos: { icon: "⚙", visual: "cosmos", title: "Azure Cosmos DB", detail: "Ground AI with operational and vector data.", tags: ["cosmos"] },
  purview: { icon: "◈", visual: "purview", title: "Microsoft Purview", detail: "Govern and protect your information.", tags: ["purview"] },
  defender: { icon: "⛨", visual: "defender", title: "Microsoft Defender & Sentinel", detail: "Detect and respond to threats.", tags: ["defender"] },
  entra: { icon: "◈", visual: "entra", title: "Microsoft Entra & identity", detail: "Control access for people and agents.", tags: ["entra"] },
  intune: { icon: "⚙", visual: "intune", title: "Microsoft Intune", detail: "Secure and manage your endpoints.", tags: ["intune"] },
  infrastructure: { icon: "↗", visual: "server-cog", title: "Compute, networking & storage", detail: "Design the infrastructure your workloads need.", tags: ["infrastructure"] },
  containers: { icon: "⌘", visual: "containers", title: "Containers & Kubernetes", detail: "Run apps on AKS and container platforms.", tags: ["containers"] },
  hybrid: { icon: "⛓", visual: "hybrid", title: "Azure Arc & hybrid cloud", detail: "Connect cloud, datacenter and edge.", tags: ["hybrid"] },
  monitor: { icon: "◎", visual: "monitor", title: "Monitoring & observability", detail: "Understand and improve workload health.", tags: ["monitor"] },
  teams: { icon: "◎", visual: "teams", title: "Microsoft Teams", detail: "Improve collaboration and communication.", tags: ["teams"] },
  sharepoint: { icon: "⛓", visual: "sharepoint", title: "SharePoint", detail: "Manage content and knowledge.", tags: ["sharepoint"] },
  windows: { icon: "⚙", visual: "windows", title: "Windows", detail: "Modernize the workplace and endpoints.", tags: ["windows"] },
  devtools: { icon: "⌘", visual: "devtools", title: "GitHub & developer tools", detail: "Improve the tools you build with.", tags: ["devtools"] },
  appplatform: { icon: "↗", visual: "appplatform", title: "Azure app platforms & .NET", detail: "Build APIs, services and applications.", tags: ["appplatform"] },
  powerplatform: { icon: "✳", visual: "powerplatform", title: "Power Platform", detail: "Build apps and automate with low code.", tags: ["powerplatform"] }
};

const outcomes = {
  build: { icon: "⌘", title: "Build a solution", detail: "Learn application and agent development.", tags: ["develop"] },
  secure: { icon: "⛨", title: "Secure and govern it", detail: "Apply protection, controls and governance.", tags: ["security", "protect", "govern"] },
  operate: { icon: "⚙", title: "Run it reliably at scale", detail: "Improve deployment, operations and performance.", tags: ["operate", "scale"] },
  adopt: { icon: "↗", title: "Drive adoption and business value", detail: "Help people and organizations put it to work.", tags: ["business", "productivity"] },
  integrate: { icon: "⛓", title: "Connect and move data", detail: "Build pipelines, ingestion and integration.", tags: ["integrate"] },
  insights: { icon: "◎", title: "Turn data into insights", detail: "Deliver analytics and trusted AI grounding.", tags: ["activate"] },
  govern: { icon: "◈", title: "Govern data and reduce risk", detail: "Apply governance, privacy and protection.", tags: ["govern", "protect"] },
  detect: { icon: "⛨", title: "Detect and respond to threats", detail: "Improve detection, investigation and response.", tags: ["detect"] },
  identity: { icon: "◈", title: "Control identity and access", detail: "Secure authentication and authorization.", tags: ["entra"] },
  cost: { icon: "↗", title: "Optimize costs", detail: "Apply cost management and FinOps.", tags: ["cost"] },
  deploy: { icon: "⚙", title: "Deploy and manage it", detail: "Improve deployment, automation and operations.", tags: ["operate"] },
  collaborate: { icon: "◎", title: "Improve productivity", detail: "Help teams collaborate and use AI.", tags: ["productivity", "ai"] },
  automate: { icon: "⛓", title: "Connect and automate workflows", detail: "Build integrations and useful apps.", tags: ["integrate", "develop"] },
  scale: { icon: "↗", title: "Improve performance and scale", detail: "Build capacity, reliability and resilience.", tags: ["scale"] },
  unify: { icon: "⛓", title: "Unify the data estate", detail: "Connect lakehouses, warehouses and platforms.", tags: ["unify"] },
  ai: { icon: "✦", title: "Activate data for AI", detail: "Ground agents and AI in trusted information.", tags: ["ai", "activate"] }
};

const allPaths = [
  { focuses: ["foundry", "m365copilot", "copilotstudio", "githubcopilot"], outcomes: ["build", "secure", "operate", "adopt"] },
  { focuses: ["fabric", "powerbi", "databricks", "database"], outcomes: ["integrate", "insights", "govern", "operate"] },
  { focuses: ["defender", "entra", "purview", "intune"], outcomes: ["detect", "identity", "govern", "operate"] },
  { focuses: ["infrastructure", "containers", "hybrid", "monitor"], outcomes: ["scale", "deploy", "secure", "cost"] },
  { focuses: ["m365copilot", "teams", "sharepoint", "windows"], outcomes: ["collaborate", "secure", "deploy", "automate"] },
  { focuses: ["devtools", "appplatform", "powerplatform", "foundry"], outcomes: ["build", "deploy", "secure", "scale"] }
];

const dataAIPaths = [
  { focuses: ["fabric", "databricks", "database", "powerbi"], outcomes: ["integrate", "unify", "insights", "govern"] },
  { focuses: ["purview", "fabric", "database", "foundry"], outcomes: ["govern", "secure", "ai", "deploy"] },
  { focuses: ["foundry", "cosmos", "powerbi", "copilotstudio"], outcomes: ["build", "insights", "govern", "operate"] },
  { focuses: ["fabric", "database", "foundry", "databricks"], outcomes: ["scale", "deploy", "govern", "integrate"] }
];

export function getQuestions(scope, firstAnswer = null) {
  const startingQuestion = scope === "data-ai" ? dataAIStartingQuestion : allStartingQuestion;
  const paths = scope === "data-ai" ? dataAIPaths : allPaths;
  const path = paths[firstAnswer ?? 0];
  return [
    startingQuestion,
    {
      label: "YOUR FOCUS",
      title: "Which technologies would you like to focus on?",
      description: "Choose one or more specific technologies within your starting topic. Matches can focus on any technology you select.",
      options: path.focuses.map((key) => focuses[key])
    },
    {
      label: "YOUR NEXT STEP",
      title: "What do you want to do with it?",
      description: "Your shortlist must match this outcome as well as your chosen technology.",
      options: path.outcomes.map((key) => outcomes[key])
    }
  ];
}
