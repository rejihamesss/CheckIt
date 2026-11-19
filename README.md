# CheckIt

CheckIt is a small React app that turns your Spotify listening history into a listening report. Connect a Spotify account to view your top 10 tracks and top 10 artists for one of three periods: the last month, the last six months, or all time. You can disconnect your account from the page at any time.

The app uses Spotify's Authorization Code flow with PKCE and requests only the `user-top-read` permission. It reads your top tracks and artists from Spotify's Web API; it does not create or edit playlists.

## Requirements

- Node.js and npm
- A Spotify account and a Spotify developer app

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), create or select an app. Add the redirect URI you plan to use to that app's Redirect URIs.

3. Copy `.env.example` to `.env.local` and set the values:

   ```dotenv
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
   VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/
   ```

   The redirect URI must exactly match one configured in your Spotify app. `.env.local` is ignored by Git; do not commit credentials or tokens.

4. Start the development server:

   ```sh
   npm run dev
   ```

   Open the local URL printed by Vite. If you change the redirect URI, update it in both `.env.local` and your Spotify app settings.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot reload. |
| `npm run build` | Run TypeScript compilation and create the production bundle in `dist/`. |
| `npm run preview` | Serve the production bundle locally for review. Run `npm run build` first. |
| `npm run lint` | Run ESLint on the project TypeScript and TSX files. |

## Project structure

- `src/main.tsx` and `src/App.tsx` — application entry points.
- `src/components/MainPage.tsx` — Spotify connection, data loading, and listening report UI.
- `src/components/RecommendationPage.tsx` — placeholder recommendations page.
- `src/styles/` — CSS Modules for the main page sections; `src/App.css` and `src/index.css` contain shared styles.
- `public/` — static files served by Vite.

There is currently no automated test script configured in `package.json`.
