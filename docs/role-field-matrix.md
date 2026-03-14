# Role × Field Visibility Matrix

The provider-side copilot enforces field visibility at runtime before any result is returned to the client.

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

## Rationale

- `name`, `patientIdentifier`, `organizationName`, `locationName`, `encounterLabel`, and `explanations` stay visible because they are needed to identify the de-identified encounter result and understand why it matched.
- `dob` is redacted for `admin` because operations users need routing context but not the full demographic field.
- `conditions` are hidden for `admin` to keep clinical detail out of operations-first views.
- `organizationName` and `locationName` stay visible across roles because scope resolution already constrains access to the public encounter dataset.

## Enforcement Note

This matrix is enforced server-side in `/Users/stas-studio/Developer/orc-demo-guide/src/server/lib/field-visibility.ts`. Results are redacted or stripped before the API response is returned.
