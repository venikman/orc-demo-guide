# Role × Field Visibility Matrix

The provider-side copilot enforces field visibility at runtime before any result is returned to the client.

| Field | admin | nurse | provider |
|---|---|---|---|
| name | visible | visible | visible |
| dob | redacted | visible | visible |
| mrn | visible | visible | visible |
| conditions | hidden | visible | visible |
| payer | visible | redacted | visible |
| appointmentLabel | visible | visible | visible |
| provider | visible | visible | visible |
| explanations | visible | visible | visible |

## Rationale

- `name`, `mrn`, `appointmentLabel`, `provider`, and `explanations` stay visible because they are needed to identify the deterministic cohort result and understand why the result matched.
- `dob` is redacted for `admin` because operations users need routing context but not the full demographic field.
- `conditions` are hidden for `admin` to keep clinical detail out of operations-first views.
- `payer` is redacted for `nurse` because treatment workflows need the cohort but not full coverage detail in the default card payload.
- `provider` keeps full visibility across roles because panel and clinic scope resolution already constrain access.

## Enforcement Note

This matrix is enforced server-side in `src/server/lib/field-visibility.ts`. Results are redacted or stripped before the API response is returned.
