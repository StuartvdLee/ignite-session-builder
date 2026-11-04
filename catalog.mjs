export const CATALOG_URL = "https://aka.ms/ignite2026-session-info";
export const CATALOG_PAGE = "https://ignite.microsoft.com/en-US/sessions";

export const matchLabels = {
  unify: "Unified data",
  integrate: "Integration",
  govern: "Governance",
  protect: "Data protection",
  ai: "AI",
  activate: "AI-ready data",
  scale: "Scale",
  operate: "Operations"
};

const interestPatterns = {
  unify: /\b(onelake|one lake|fabric|lakehouse|data estate|data warehouse|unif(?:y|ied|ication)|data silos?)\b/i,
  integrate: /\b(integrat\w*|pipelines?|data factory|etl|elt|ingestion|interoperab\w*|connectors?|databricks|mirroring)\b/i,
  govern: /\b(governan\w*|govern\w*|purview|lineage|compliance|catalog|responsible ai|data quality)\b/i,
  protect: /\b(secur\w*|protect\w*|privacy|sensitive|permissions?|access control|risk|classification)\b/i,
  ai: /\b(ai|artificial intelligence|agents?|copilots?|foundry|machine learning|rag|llms?)\b/i,
  activate: /\b(analytics|insights?|power bi|semantic|ground\w*|rag|retrieval|vector|ai.ready|business intelligence)\b/i,
  scale: /\b(scal\w*|enterprise|performance|capacity|optimi[sz]\w*|reliability|resilien\w*)\b/i,
  operate: /\b(operat\w*|monitor\w*|observab\w*|deployment|devops|ci\/cd|automation|cost|finops|lifecycle)\b/i
};

const dataAIPattern = /\b(data\s*(?:&|and)\s*ai|fabric|onelake|one lake|databricks|purview|foundry|sql|cosmos db|postgresql|databases?|lakehouse|data warehouse|data estate|data governance|data integration|data factory|data engineering|data science|data quality|analytics|power bi|machine learning|rag|retrieval.augmented|vector search|semantic model|ground(?:ing|ed))\b/i;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function plainText(value) {
  if (typeof value !== "string") return "";
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name) => {
      if (!name.startsWith("#")) return entities[name.toLowerCase()];
      const code = name[1].toLowerCase() === "x"
        ? Number.parseInt(name.slice(2), 16)
        : Number.parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function displayValues(value) {
  if (Array.isArray(value)) return value.flatMap(displayValues);
  const text = plainText(isRecord(value) ? value.displayValue : value);
  return text ? [text] : [];
}

export function normalizeCatalog(raw) {
  if (!Array.isArray(raw)) {
    throw new Error("The Ignite catalog must be a JSON array of session records.");
  }
  if (raw.length === 0) throw new Error("The official Ignite catalog contains no sessions.");

  const sessions = [];
  const seen = new Set();
  let skippedCount = 0;
  let duplicateCount = 0;

  for (const record of raw) {
    if (!isRecord(record)) {
      skippedCount += 1;
      continue;
    }
    const id = plainText(record.sessionCode);
    const title = plainText(record.title);
    if (!id || !title) {
      skippedCount += 1;
      continue;
    }

    const description = plainText(record.description);
    const topics = [...new Set([
      ...displayValues(record.topic),
      ...displayValues(record.solutionArea),
      ...displayValues(record.product),
      ...displayValues(record.tags)
    ])];
    const locale = typeof record.langLocale === "string" ? record.langLocale.trim() : "";
    const instanceId = typeof record.sessionInstanceId === "string" ? record.sessionInstanceId.trim() : "";
    const hasDirectLink = Boolean(instanceId && /^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(locale));
    const key = JSON.stringify([instanceId || id, locale]);
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    const searchText = [title, description, ...topics].join(" ");
    const tags = Object.entries(interestPatterns)
      .filter(([, pattern]) => pattern.test(searchText))
      .map(([tag]) => tag);

    sessions.push({
      key,
      id,
      title,
      description,
      topics,
      tags,
      isDataAI: dataAIPattern.test(searchText),
      speakers: displayValues(record.speakerNames).join(", "),
      level: displayValues(record.sessionLevel).join(", "),
      type: displayValues(record.sessionType).join(", "),
      location: displayValues(record.location).join(", "),
      timeSlot: plainText(record.TimeSlot),
      href: hasDirectLink
        ? `https://ignite.microsoft.com/${encodeURIComponent(locale)}/sessions/${encodeURIComponent(instanceId)}?source=sessions`
        : CATALOG_PAGE,
      hasDirectLink
    });
  }

  if (sessions.length === 0) {
    throw new Error("No usable Ignite sessions were found. Expected sessionCode and title fields.");
  }
  return { sessions, recordCount: raw.length, skippedCount, duplicateCount };
}

export function rankSessions(sessions, chosenTags) {
  return sessions
    .filter((session) => session.isDataAI)
    .map((session) => ({
      ...session,
      score: session.tags.reduce((total, tag) =>
        total + chosenTags.filter((chosen) => chosen === tag).length, 0),
      matchedTags: session.tags.filter((tag) => chosenTags.includes(tag))
    }))
    .filter((session) => session.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id) || a.key.localeCompare(b.key));
}
