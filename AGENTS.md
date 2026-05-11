# Repository Rules

This repository contains the public version of the `google-sheets-setup` Codex skill.

## Structure

- `SKILL.md`: skill instructions and operating workflow.
- `README.md`: public-facing overview and usage notes.
- `agents/`: agent metadata.
- `scripts/`: helper scripts used by the skill.

## Safety

- Do not commit service account JSON files, OAuth tokens, API keys, passwords, `.env` files, spreadsheet IDs from private projects, or user-specific local paths.
- Keep examples generic and use placeholders such as `<id>`, `C:\path\to\...`, and `your-spreadsheet-id`.
- Before publishing, scan for personal names, local usernames, private URLs, real spreadsheet IDs, and credential material.

## Validation

- Run a syntax check for scripts after edits.
- Re-scan the repository for sensitive strings before committing or pushing.
