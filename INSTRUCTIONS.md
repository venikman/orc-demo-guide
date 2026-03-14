# AI Provider Encounter Search Copilot — Runtime Rules

This file defines runtime application behavior only.

It does **not** define:
- development workflow
- testing strategy
- CI/CD or release process
- backlog waves or implementation order
- branching or review process

## Mission

Provide a provider-side copilot for authorized `admin`, `nurse`, and `provider` users to search de-identified encounter cohorts with natural language and receive explainable, policy-filtered results.

Phase 1 is read-only only.

## Non-Goals

- Autonomous diagnosis or treatment recommendations
- Chart write-back or any mutation
- Direct payer submission
- Real PHI in development artifacts

## Runtime Scope

- One front-door manager agent orchestrates all search requests.
- The LLM compiles natural language into typed plans.
- The LLM never decides cohort membership.
- Retrieval is deterministic only and uses set intersection.
- Every returned result must include evidence and an explanation artifact.
- Typed contracts are enforced at runtime at all external boundaries.
- Access is deny-by-default.

## Runtime Safety Rules

- No PHI in logs, screenshots, error messages, or generated dataset artifacts.
- Runtime retrieval uses only the checked-in de-identified public FHIR snapshot unless explicitly replaced with a real integration.
- Safety modules must short-circuit before or after the LLM when present.
- No write-back paths in v1.
- No scope expansion without an explicit recorded decision.
- Gemini 3.x models only.

## Runtime Access Model

Supported roles:
- `admin`
- `nurse`
- `provider`

Supported purposes of use:
- `treatment`
- `operations`

The runtime must enforce trusted requester context, purpose of use, effective scope, and field visibility before returning results.

## Runtime Response Rules

- Search responses resolve to one of: `success`, `clarify`, or `deny`.
- Every response must include a typed `policyDecision`.
- No result may be returned without an explicit policy allow.
- Clarification responses return no results.
- Denial responses return no results.
- Explanations must use source-backed evidence labels.

## Runtime Field Visibility

| Field | admin | nurse | provider |
|---|---|---|---|
| name | visible | visible | visible |
| dob | redacted | visible | visible |
| patientIdentifier | visible | visible | visible |
| conditions | hidden | visible | visible |
| organizationName | visible | visible | visible |
| locationName | visible | visible | visible |
| encounterLabel | visible | visible | visible |
| explanations | visible | visible | visible |

Runtime behavior:
- `redacted` fields return `***`
- `hidden` fields are omitted from the response payload

## Runtime Data Rules

- The prototype runtime reads from a versioned local snapshot of the public de-identified MIMIC-IV FHIR demo dataset.
- No real PHI may be introduced into the snapshot, logs, screenshots, or error output.
- Search requests do not fetch external clinical data at runtime; retrieval executes against the local normalized index only.
