# CLAUDE.md

## Build & Run

```bash
yarn install              # install dependencies
yarn dev                  # start dev server (netlify dev, NOT vite dev)
yarn build                # production build (tsc -b && vite build)
npx tsc --noEmit          # type-check without emitting
```

## Project Structure

```
src/
├── App.tsx                  # Root component: auth gate + data orchestration
├── types.ts                 # All shared interfaces (ClassifiedPR, ColumnId, etc.)
├── constants.ts             # Repo owner/name, column metadata, intervals
├── index.css                # Tailwind v4 @import + @theme tokens + animations
├── components/              # React components (Board, Column, PRCard, FilterBar, etc.)
├── hooks/
│   ├── useAuth.ts           # OAuth token management
│   ├── usePullRequests.ts   # Main data-fetching hook (fetches PRs, reviews, CI, merge stats)
│   ├── useSearchParams.ts   # URL ↔ filter state sync via useSyncExternalStore
│   └── useTimelineEvents.ts # Lazy timeline event loading for PR popover
├── contexts/
│   └── TokenContext.tsx      # Auth token React context
└── lib/
    ├── github.ts            # Octokit factory + all GitHub API calls
    ├── classify.ts          # PR → column classification (priority chain: approved > changes_requested > ready/ai-approved > wip)
    ├── mergeScore.ts        # Merge likelihood score: author rate (35%), size (35%), review progress (30%) + org bonus
    ├── concurrency.ts       # mapWithConcurrency — bounded Promise.all
    ├── mergeCache.ts        # localStorage TTL cache for author merge stats
    ├── scoreColors.ts       # Score → CSS color mapping
    └── format.ts            # Date/number formatters

netlify/functions/
└── auth-callback.ts         # OAuth code→token exchange (NOT type-checked by tsc — outside src/)
```

## Key Patterns

- **GitHub API**: All calls go through `lib/github.ts` using Octokit. Bounded concurrency via `mapWithConcurrency` (default 10 concurrent requests).
- **Classification**: `classify.ts` is a pure function. The priority chain in `classifyColumn` determines column assignment — changes here affect the entire board.
- **Merge score**: `mergeScore.ts` is a pure function. Uses Bayesian smoothing on author merge rate.
- **URL-persisted filters**: `useSearchParams.ts` syncs filter state to URL search params using `useSyncExternalStore`, enabling shareable filtered views.
- **Caching**: `mergeCache.ts` caches author merge stats in localStorage with a 30-minute TTL to reduce API calls.
- **CodeRabbit detection**: Identified by login name containing "coderabbitai" (case-insensitive).

## Code Conventions

- TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- Tailwind CSS v4 for all styling (utility classes, `@theme` block for custom tokens)
- Default-export for React components, named-export for hooks and lib modules
- No external state management — React context + URL params + localStorage only
- Theme tokens defined in `src/index.css` `@theme` block (surface colors, text colors, accent, font)

## Important References

- `src/types.ts` — all shared types (start here when understanding the data model)
- `src/constants.ts` — repo config, column definitions, timing constants
- `src/index.css` — theme tokens and custom animations

## Gotchas

- `netlify/functions/auth-callback.ts` is NOT included in tsconfig (only `src/` is) — it won't be caught by `npx tsc --noEmit`
- Must use `yarn dev` (runs `netlify dev`) not `yarn vite` — the OAuth flow needs the Netlify Functions proxy
- Tailwind v4 uses `@import "tailwindcss"` syntax, not the v3 `@tailwind` directives
- CodeRabbit is detected by login name, not by any API flag
- `yarn build` requires `VITE_GITHUB_CLIENT_ID` env var to be set (referenced in constants.ts via `import.meta.env`)
