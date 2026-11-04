# Data + AI Trailfinder

A lightweight recommendation quiz for a Microsoft Ignite 2026 Data & AI conversation, connected to Microsoft's full session catalog. No build step or dependencies are required.

The three-question quiz ranks Data & AI sessions by interests inferred from the official titles, abstracts, topics, and products. “I'm the MVP” opens moderator icebreakers and a searchable catalog with Data & AI and full-catalog views.

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
