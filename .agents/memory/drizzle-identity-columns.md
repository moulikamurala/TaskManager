---
name: Drizzle identity columns
description: A schema-generation compatibility note for Drizzle identity fields and drizzle-zod.
---

When a Drizzle table uses a generated identity primary key, `createInsertSchema` can omit that field automatically; passing the identity key again to `.omit()` can fail with an unrecognized-key error.

**Why:** The insert schema shape is derived from column insertability, not always from every table column.

**How to apply:** If `createInsertSchema(...).omit()` rejects a generated primary-key name, remove that key from the omit list and only omit fields that remain in the derived insert shape.