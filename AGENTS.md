# Project Agent Rules

These rules are the working default for this repository and override older task text when they conflict.

## Prototype Mode

- This project is a prototype, not a production delivery.
- Do not add, modify, or maintain CI/CD pipelines, GitHub Actions workflows, release automation, or deployment gates unless the user explicitly asks for that exact work.
- Do not add unit tests, integration tests, eval harnesses, or TDD scaffolding by default.
- Do not run `bun test` as a normal validation step for this project.

## Validation

- Validate changes with Playwright only.
- Prefer real browser checks against the running app and direct API calls from the browser context when needed.
- Summarize the Playwright scenarios you ran and what they verified.

## Scope

- Keep changes focused on prototype behavior, UX, and runtime functionality.
- Treat `INSTRUCTIONS.md` as runtime application behavior only.
- If a spec or backlog item mentions pipelines or tests, treat this file as the repo-level override unless the user explicitly re-enables that work.
