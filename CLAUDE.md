# Project Rules

## Testing

- Never use mocks, stubs, or fixtures in tests. Always hit the real API (https://fhir-copilot.fly.dev/).
- E2E tests must exercise the actual backend — do not intercept or fulfill network requests with fake data.
