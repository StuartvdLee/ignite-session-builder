import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createBundledCatalogLoader } from "./catalog-service.mjs";

const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/data-ai", ["data-ai.html", "text/html; charset=utf-8"]],
  ["/data-ai/", ["data-ai.html", "text/html; charset=utf-8"]],
  ["/data-ai.html", ["data-ai.html", "text/html; charset=utf-8"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/questionnaire.mjs", ["questionnaire.mjs", "text/javascript; charset=utf-8"]],
  ["/catalog.mjs", ["catalog.mjs", "text/javascript; charset=utf-8"]],
  ["/data/ignite-2026-all-sessions.json", ["data/ignite-2026-all-sessions.json", "application/json; charset=utf-8"]],
  ["/data/ignite-2026-data-ai-sessions.json", ["data/ignite-2026-data-ai-sessions.json", "application/json; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]]
]);

export function createAppServer({ loadCatalog = createBundledCatalogLoader() } = {}) {
  return createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    let url;
    try {
      url = new URL(request.url, "http://localhost");
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Invalid request URL");
      return;
    }
    if (url.pathname === "/api/catalog") {
      const scope = url.searchParams.get("scope") ?? "all";
      if (scope !== "all" && scope !== "data-ai") {
        response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(request.method === "HEAD" ? undefined : JSON.stringify({ error: "Unknown catalog scope." }));
        return;
      }
      try {
        const catalog = await loadCatalog({ refresh: url.searchParams.get("refresh") === "1", scope });
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(request.method === "HEAD" ? undefined : JSON.stringify(catalog));
      } catch (error) {
        console.error("Unable to load the official Ignite catalog:", error);
        response.writeHead(502, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(request.method === "HEAD" ? undefined : JSON.stringify({ error: error.message }));
      }
      return;
    }

    const asset = assets.get(url.pathname);
    if (!asset) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Not found");
      return;
    }

    try {
      const body = await readFile(new URL(asset[0], import.meta.url));
      response.writeHead(200, {
        "Content-Type": asset[1],
        "Content-Length": body.length,
        "Cache-Control": "no-store"
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch (error) {
      console.error(`Unable to serve ${asset[0]}:`, error);
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Unable to load app file. See server logs.");
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be an integer between 1 and 65535.");
    process.exit(1);
  }
  const host = process.env.HOST ?? "127.0.0.1";
  const server = createAppServer();
  server.on("error", (error) => {
    console.error(`Unable to start the local server: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(`Ignite 2026 Trailfinder: http://${host}:${port}`);
    console.log("Press Ctrl+C to stop.");
  });
}
