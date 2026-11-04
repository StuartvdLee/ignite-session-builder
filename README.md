# Data + AI Trailfinder

A lightweight recommendation quiz for a Microsoft Ignite 2026 Data & AI conversation, connected to Microsoft's full session catalog. No build step or dependencies are required.

The three-question quiz ranks Data & AI sessions by interests inferred from the official titles, abstracts, topics, and products. “I'm the MVP” opens moderator icebreakers; the catalog connection provides a searchable catalog with Data & AI and full-catalog views.

## Run on your computer

With [Node.js](https://nodejs.org/) 18 or newer installed, download or check out the app, open a terminal in its folder, and run:

```sh
npm start
```

Open **http://127.0.0.1:3000/** in a browser on the same computer. No `npm install` is needed. Stop the server with Ctrl+C.

Use `npm start`, not a generic static server or a direct `index.html` file: the local server provides the catalog API and avoids browser cross-origin restrictions. Your server needs internet access to Microsoft to fetch the catalog. There are no external font or build dependencies.

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

App Service supplies `PORT`; the template sets `HOST=0.0.0.0` so Azure can reach the server. Local runs still bind only to `127.0.0.1` by default. The deployed server needs outbound HTTPS access to Microsoft for the catalog. The deployment check verifies the homepage, not upstream catalog availability.

## Official catalog connection

The server downloads **https://aka.ms/ignite2026-session-info**, the Ignite 2026 JSON endpoint configured in [Microsoft's events CLI](https://github.com/microsoft/Build-CLI/blob/main/cli/src/config.ts). It follows Microsoft's redirects and loads the full array rather than a hardcoded selection or one search-results page. There is no account sign-in or API key.

- A successful download is cached in memory for 15 minutes. **Refresh catalog** bypasses the cache. Restarting the server clears it.
- The UI displays the total loaded sessions, the Data & AI subset count, and the fetch time. Missing session codes/titles and duplicate records are counted explicitly.
- Data & AI classification and interest matching use catalog metadata plus keyword rules in `catalog.mjs`; they are app-generated recommendations, not Microsoft's official track assignments. The explorer can search the full catalog, including sessions outside this subset.
- Recommendations show eight matches initially, with **Show more matches** for the rest. The explorer pages through all matching sessions in groups of twenty; nothing is limited to the original three sessions.
- Direct session links use the catalog's `langLocale` and opaque `sessionInstanceId`. If either is missing, the UI links to the official catalog and tells the attendee to search by session code instead of inventing a URL.
- Fetches time out after 30 seconds; downloads and imports are limited to 50 MB. Network, upstream, and malformed-feed errors are surfaced in the UI and server logs. A failed refresh does not silently serve stale or example sessions.

### Restricted networks

If Microsoft is blocked on the machine running the server, open **Network restricted? Import the official catalog JSON** in the app. Download the feed above from a machine that can reach it, and select the JSON file. The same normalizer and matching logic handle the entire import, which is labeled as an **imported snapshot**, not a live connection. The app cannot independently verify a selected file's provenance or event year; use only the official 2026 feed. Imports stay in the current browser tab's memory and are not uploaded or persisted.

The implementation environment could not resolve Microsoft's catalog hosts, including the official short link, so a live upstream download could not be verified there. The endpoint and schema were confirmed against Microsoft's published integration, and tests cover catalog processing and the API using representative synthetic records, not a purported live snapshot.

## Checks

Run `npm test` for normalization, complete-catalog loading, caching, refresh/failure handling, interest ranking, and local API tests. Tests do not require internet access. Recommendations are interest matches, not a time-aware schedule; always confirm availability in the [official catalog](https://ignite.microsoft.com/en-US/sessions).
