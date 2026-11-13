# Repository Guidelines

## Project Structure & Module Organization

This repository is a React 18 and TypeScript Spotify app built with Vite. Application entry points are `src/main.tsx` and `src/App.tsx`; page-level UI lives in `src/components/` (`MainPage.tsx`, `RecommendationPage.tsx`). Keep shared styles in `src/index.css` or `src/App.css`, and component-specific styles alongside the component or in `src/styles/`. Put imported images and other source assets in `src/assets/`; static files served as-is belong in `public/`.

## Build, Test, and Development Commands

Run `npm install` to install the dependencies declared in `package-lock.json`.

- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` runs TypeScript compilation, then creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle locally for review.
- `npm run lint` runs ESLint on TypeScript and TSX files and fails on warnings.

There is no test script configured in `package.json`; do not assume a test suite exists.

## Coding Style & Naming Conventions

Use TypeScript for application logic and TSX for React components. Follow the existing two-space indentation, double-quoted strings, and semicolon style. Name React components and their files in PascalCase (for example, `RecommendationPage.tsx`); use camelCase for variables and functions. Keep reusable component styles in CSS Modules where appropriate, following the existing `*.module.css` pattern. Run `npm run lint` before submitting changes.

## Testing Guidelines

No automated test framework or coverage threshold is configured. For changes, run `npm run build` and `npm run lint`, then manually exercise the affected page in `npm run dev` or `npm run preview`. If adding tests, introduce and document the chosen framework and npm script with the change.

## Commit & Pull Request Guidelines

The available Git history contains only the initial commit, so no commit convention is established. Use a concise imperative subject that explains the change (for example, `Add recommendation filters`). Pull requests should summarize user-visible changes, list validation commands and their results, link related issues when available, and include screenshots for visual changes.

## Security & Configuration

Do not commit Spotify credentials, access tokens, or local environment files. Keep secrets in local environment configuration, and document required variable names without publishing their values. Review changes to API or authentication handling carefully.
