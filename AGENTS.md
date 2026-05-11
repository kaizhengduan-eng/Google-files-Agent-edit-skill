# Repository Rules

This repository contains the public version of the `google-workspace-service-account` Codex skill.

## Structure

- `SKILL.md`: unified skill instructions and operating workflow.
- `README.md`: public-facing overview and usage notes.
- `agents/`: agent metadata.
- `scripts/`: helper scripts used by the skill.

## Safety

- Do not commit service account JSON files, OAuth tokens, API keys, passwords, `.env` files, private Google Workspace URLs, real file IDs, Google Cloud project IDs from private projects, or user-specific local paths.
- Keep examples generic and use placeholders such as `<spreadsheet-id>`, `<document-id>`, `<presentation-id>`, `C:\path\to\...`, and `your-file-id`.
- Before publishing, scan for personal names, local usernames, private URLs, real Google file IDs, Cloud project IDs, and credential material.

## Validation

- Run syntax checks for scripts after edits.
- Re-scan the repository for sensitive strings before committing or pushing.
