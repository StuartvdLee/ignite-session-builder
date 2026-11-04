# Data + AI Trailfinder

A lightweight, static recommendation quiz for a Microsoft Ignite 2026 Data & AI conversation. It runs locally by opening `index.html`; no build step or dependencies are required.

The three-question quiz scores answers against a small set of relevant Ignite sessions. “I'm the MVP” opens a moderator view with icebreakers and the complete featured-session list.

## Run on your computer

Download or check out these app files onto your computer, then either:

- Open `index.html` directly in your browser. No installation or server is needed.
- With [Node.js](https://nodejs.org/) 18 or newer installed, open a terminal in the app folder and run:

  ```sh
  npm start
  ```

  Open **http://127.0.0.1:3000/** in a browser on the same computer. No `npm install` is needed. Stop the server with Ctrl+C.

The server must run on your own computer for that address to work locally. Starting it in a remote workspace does not expose it on your computer. The app has no external font, API, or build dependencies; only the official catalog links need an internet connection.

## Access a remote copy from your computer

If you have SSH access to the remote workspace host, leave `npm start` running there and run this in a terminal **on your own computer**, replacing `USER@REMOTE_HOST` with your SSH connection:

```sh
ssh -N -L 3000:127.0.0.1:3000 USER@REMOTE_HOST
```

Keep the SSH terminal open, then open **http://127.0.0.1:3000/** locally. If local port 3000 is occupied, use `-L 3001:127.0.0.1:3000` and open port 3001 instead. No public exposure is required.

## Catalog snapshot

Session titles, IDs, summaries, and links are based on publicly indexed Ignite catalog entries checked November 4, 2026. The live catalog was not accessible from the implementation environment, so confirm session details and schedule availability in the [official catalog](https://ignite.microsoft.com/en-US/sessions) before sharing recommendations. Results are interest matches, not a time-aware schedule.
