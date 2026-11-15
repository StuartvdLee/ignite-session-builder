# Ignite 2026 Trailfinder

A lightweight, offline-ready recommendation quiz for **all of Microsoft Ignite 2026**. No build step or dependencies are required.

The homepage's three-question quiz covers AI, data, security, cloud, Microsoft 365, developer tools and business transformation across the full catalog. **[/data-ai](http://127.0.0.1:3000/data-ai)** keeps the focused Data & AI questionnaire and explorer. Both pages rank sessions by interests inferred from official titles, abstracts, topics, and products. “I'm the MVP” opens moderator icebreakers.

On this branch, the existing questions use **strict matching**: sessions must match every answer, and the first answer needs evidence in the session title or named products, not just an abstract or a generic topic like “Cloud & AI.” Ranking favors title evidence over products and other metadata, weights earlier answers more heavily, and normalizes by the number of interests in each answer. There is no arbitrary result cap or fallback to loosely related sessions; the explorer remains unfiltered. Broad or overlapping answers can still return many genuinely matching sessions.

## Run on your computer

With [Node.js](https://nodejs.org/) 18 or newer installed, download or check out the app, open a terminal in its folder, and run:

```sh
npm start
```

Open **http://127.0.0.1:3000/** in a browser on the same computer. No `npm install` is needed. Stop the server with Ctrl+C.

Use `npm start`, not a generic static server or a direct `index.html` file: the local server provides the catalog API. **No internet connection is needed for either questionnaire or the session explorer**: the server loads the JSON snapshots committed in `data/`. Internet access is needed only for **Refresh catalog** and opening official session links. There are no external font or build dependencies.

The server must run on your own computer for that address to work locally. Starting it in a remote workspace does not expose it on your computer.

## Access a remote copy from your computer

If you have SSH access to the remote workspace host, leave `npm start` running there and run this in a terminal **on your own computer**, replacing `USER@REMOTE_HOST` with your SSH connection:

```sh
ssh -N -L 3000:127.0.0.1:3000 USER@REMOTE_HOST
```

Keep the SSH terminal open, then open **http://127.0.0.1:3000/** locally. If local port 3000 is occupied, use `-L 3001:127.0.0.1:3000` and open port 3001 instead. No public exposure is required.

## Deploy to Azure App Service (Basic B1)

The [deployment workflow](.github/workflows/deploy-app-service.yml) runs on pushes to `main` or manually from the Actions tab. It runs the tests, provisions a dedicated **Linux Basic B1** App Service plan and Node.js 22 web app using [Bicep](infra/app-service.bicep), deploys the runtime files, and checks the public HTTPS homepage. No build or dependency installation is needed.

### One-time Azure and GitHub setup

1. Create an Azure resource group in a region that supports Linux App Service B1, for example `az group create --name ignite-trailfinder --location westeurope`. The workflow uses this existing resource group.
2. Create a Microsoft Entra app registration and its service principal. Grant that identity **Contributor** on this resource group, not the entire subscription.
3. Add a federated credential to the app registration for GitHub Actions with issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`, and subject `repo:StuartvdLee/ignite-session-builder:ref:refs/heads/main`. This permits deployments from `main`, including manual runs on that branch. Adjust the owner/repository if deploying a fork.
4. In the repository's **Settings > Secrets and variables > Actions**, add the following:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `AZURE_CLIENT_ID` | Entra app registration's application (client) ID |
| Secret | `AZURE_TENANT_ID` | Azure directory (tenant) ID |
| Secret | `AZURE_SUBSCRIPTION_ID` | Subscription containing the resource group |
| Variable | `AZURE_RESOURCE_GROUP` | Existing resource group name, e.g. `ignite-trailfinder` |
| Variable | `AZURE_WEBAPP_NAME` | Globally unique web app name, e.g. `your-org-ignite-trailfinder` |

Merge the workflow to `main`, then push to `main` or run **Deploy to Azure App Service** manually with `main` selected. Azure provisions the app at `https://<AZURE_WEBAPP_NAME>.azurewebsites.net` (use the app's default hostname from Azure if it includes an additional generated suffix). Authentication uses OIDC; no publish profile or long-lived client secret is needed.

The template creates `<AZURE_WEBAPP_NAME>-plan` with one B1 instance and Always On enabled. **Basic B1 is a paid tier**, charged while the plan exists, even without traffic. Use a new app name and a dedicated plan; every deployment reapplies B1 and the template's app settings, so do not point this at an unrelated existing app or shared plan. To stop charges permanently, delete the app and its plan, or delete the resource group if it contains only this deployment.

App Service supplies `PORT`; the template sets `HOST=0.0.0.0` so Azure can reach the server. Local runs still bind only to `127.0.0.1` by default. The deployment package includes both pages and the offline snapshots. Outbound HTTPS access to Microsoft is needed only for catalog refreshes.

## Official catalog connection

The bundled snapshot was downloaded from **https://aka.ms/ignite2026-session-info** on **2026-11-15 at 00:37 UTC** (November 14 Pacific time). Microsoft's redirect resolves to its `ignite2026-prod` full-session JSON feed. There is no account sign-in or API key.

- [`data/ignite-2026-all-sessions.json`](data/ignite-2026-all-sessions.json) contains all **1,512** original feed records; [`data/ignite-2026-data-ai-sessions.json`](data/ignite-2026-data-ai-sessions.json) contains the **524** records matching the existing Data & AI rules. Both are importable JSON arrays, not synthetic examples. Source URLs and timestamps are recorded in [`data/catalog-info.json`](data/catalog-info.json).
- `/api/catalog` loads the bundled full catalog; `/api/catalog?scope=data-ai` loads the bundled subset. Neither contacts Microsoft. **Refresh catalog** explicitly requests a new live download with `refresh=1`, following redirects and loading the complete array before applying the page's scope. Reloading the page returns to the bundled snapshot.
- The UI labels bundled data as an offline snapshot and displays its download time, loaded count, and Data & AI count. Missing session codes/titles and duplicate records are counted explicitly.
- Data & AI classification and interest matching use catalog metadata plus keyword rules in `catalog.mjs`; they are app-generated recommendations, not Microsoft's official track assignments. The homepage explorer searches the full catalog; the Data & AI page stays within its subset.
- Recommendations show ten matches initially, with **Show more matches** for the rest. The explorer pages through all matching sessions in groups of twenty.
- Direct session links use the catalog's `langLocale` and opaque `sessionInstanceId`. If either is missing, the UI links to the official catalog and tells the attendee to search by session code instead of inventing a URL.
- Fetches time out after 30 seconds; downloads and imports are limited to 50 MB. Network, upstream, and malformed-feed errors are surfaced in the UI and server logs. A failed refresh does not silently serve stale or example sessions.

### Restricted networks

The bundled snapshots work immediately on restricted networks. To use a newer snapshot, open **Network restricted? Import the official catalog JSON**, then select a JSON file downloaded from the official feed on a connected machine. Imports are labeled as snapshots and stay in the current browser tab's memory; they are not uploaded or persisted. The Data & AI page filters imports to its subset. The app cannot independently verify a selected file's provenance or event year; use only the official 2026 feed.

## Checks

Run `npm test` for normalization, complete-catalog loading, caching, refresh/failure handling, interest ranking, and local API tests. Tests do not require internet access. Recommendations are interest matches, not a time-aware schedule; always confirm availability in the [official catalog](https://ignite.microsoft.com/en-US/sessions).
