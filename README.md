# Palawan Collective — Automation Agency Landing Page

A single-page landing site for **Palawan Collective**, an automation agency that takes repetitive,
every-day work off a business's plate. The page is a fully self-contained React app with a tropical,
"turtle/coconut" visual identity, scroll-reveal animations, an interactive "load a turtle" demo, a
before/after timeline, and a multi-step "postcard" contact form.

## Tech stack

| Area | Technology |
| --- | --- |
| UI framework | [React 19](https://react.dev/) (`react` + `react-dom`, `StrictMode`) |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.9 (strict mode) |
| Bundler / dev server | [Vite 7](https://vite.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) via `@tailwindcss/vite` (CSS-first config in `src/index.css`) |
| Icons / illustration | Inline SVG components (`Turtle`, `Coconut`, `Logo`, `StampBand`) — no icon library |
| Class merging | `clsx` + `tailwind-merge` (`cn()` helper) |
| Build output | `vite-plugin-singlefile` — everything inlines into one `dist/index.html` |
| Fonts | Google Fonts: Orbitron (brand), Fraunces (serif display), DM Sans (body), Caveat (handwriting) |
| Animation | CSS keyframes + `IntersectionObserver` scroll reveals (no animation library) |

## Code tree

```
automate-me/
├── index.html                 # App shell, loads /src/main.tsx, sets page title
├── package.json               # Scripts: dev / build / preview; dependencies
├── package-lock.json
├── tsconfig.json              # TS strict config, "@/*" path alias → src/*
├── vite.config.ts             # Vite config: react + tailwind + singlefile plugins, "@" alias
├── src/
│   ├── main.tsx               # Entry: mounts <App /> in StrictMode
│   ├── App.tsx                # Page composition & sections (Nav, Hero, Weight, How,
│   │                          #   Tuesday, Stories, Postcard, Footer) + reveal hook
│   ├── index.css              # Tailwind import, @theme tokens (fonts/colors), keyframes,
│   │                          #   grain overlay, stamp/reveal/slider styles
│   ├── components/
│   │   ├── Turtle.tsx         # Animated SVG turtle (swim, rotate, drift)
│   │   ├── Coconut.tsx        # Interactive coconut demo (whole → split → open phases)
│   │   ├── StampBand.tsx      # Rubber-stamp marquee band with press/ink animations
│   │   └── Logo.tsx           # Brand logo (small nav + large footer variants)
│   ├── lib/
│   │   └── shape.ts           # Seeded RNG + blob path generator for organic shapes
│   └── utils/
│       └── cn.ts              # cn() — clsx + tailwind-merge helper
└── unique-automation-agency-landing-page.zip   # Original source archive from which this page was extracted
```

> `node_modules/` and `dist/` are generated artifacts and are intentionally not committed.

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server (Vite)
npm run build      # production build → dist/index.html (single file)
npm run preview    # preview the production build locally
```


## Backend (Neon Postgres)

The site content (theme/fonts/colors/logo, header, hero, sections, FAQ, footer) is stored in a
Neon Postgres database. Backend wiring:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST/neondb?sslmode=require npm run db:migrate
```

- `db/schema.sql` — idempotent schema (safe to re-run) and seed of the current site content.
- `scripts/migrate.mjs` — applies the schema; refuses to run without `DATABASE_URL`.
- `.env.example` — template for local setup; real `.env*` files are git-ignored.
- On Vercel, `DATABASE_URL` is a sensitive env var (production + preview) and `npm run db:migrate` runs as
  part of the deploy build.

> Local dev needs network access to Neon; the Arena sandbox cannot reach it.

## Project notes

- **Path alias:** `@/*` maps to `src/*` (configured in both `vite.config.ts` and `tsconfig.json`).
- **Single-file output:** the build inlines all JS/CSS into `dist/index.html` via `vite-plugin-singlefile`,
  which keeps the landing page easy to share and deploy as one static file.
- **Accessibility:** animations respect `prefers-reduced-motion`; the mobile nav and reveal effects
  degrade gracefully.
- **Sections:** hero with turtle art, "The Weight" chore breakdown, "How it works" timeline,
  "A Tuesday" before/after, customer stories, and a multi-step contact "postcard" form, followed by the footer.
