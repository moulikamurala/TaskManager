---
name: Generated client browser types
description: A TypeScript compatibility note for generated browser API clients in this workspace.
---

The generated React API client uses `Headers.entries()`, so the composite client package must include both `dom` and `dom.iterable` in its TypeScript `lib` settings.

**Why:** The generated client can compile in the app package but fail the workspace library build when iterable DOM types are absent.

**How to apply:** If codegen succeeds but `typecheck:libs` reports that `Headers.entries` is missing, check the client library's `lib` list before changing generated files.