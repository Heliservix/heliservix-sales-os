# Shared Package

This package will contain shared domain contracts for the platform once implementation begins.

Expected contents:

- Entity type definitions.
- Validation schemas.
- Permission constants.
- Event names.
- API request and response contracts.
- Shared formatting and normalization utilities.

Business rules that protect tenant isolation, contract integrity, campaign approval, or aircraft readiness should still be enforced by the API even when shared client-side helpers exist.
