# AGENTS.md

Read `CLAUDE.md` first for build commands, project structure, and key patterns.

## Getting Oriented

1. Start with `src/types.ts` and `src/constants.ts` to understand the data model
2. Read `src/lib/classify.ts` to understand how PRs are assigned to columns
3. Read `src/lib/mergeScore.ts` to understand the scoring algorithm

## Before & After Changes

- Run `npx tsc --noEmit` before and after making changes to catch type errors
- Run `yarn build` to verify the full build passes

## Code Style

- Follow existing patterns — look at neighboring code for conventions
- No `any` types — use proper typing or `unknown` with narrowing
- Use Tailwind utility classes for styling, not inline styles or CSS modules
- Default-export components, named-export hooks and lib functions

## PR Guidelines

- Keep PRs focused — one feature or fix per PR
- `yarn build` must pass before submitting
- Type-check with `npx tsc --noEmit`

## Things to Avoid

- Don't add new tooling or dependencies without discussion
- Don't change the priority chain in `classify.ts` without understanding how it affects column assignment across all PR states
- Don't bypass the bounded concurrency in `lib/github.ts` — GitHub rate limits are a real constraint
