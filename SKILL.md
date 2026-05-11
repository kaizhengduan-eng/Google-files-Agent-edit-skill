---
name: google-sheets-setup
description: Set up and operate Google Sheets through Google Cloud service accounts. Use when Codex needs to guide a user from creating/enabling Google Sheets API access, creating a service account and JSON key, sharing a Sheet with that account, designing a Sheet schema, safely storing credentials, configuring a project, or verifying read/write access to Google Sheets without exposing secrets.
---

# Google Sheets Setup

## Safety Rules

- Never ask the user to paste, screenshot, print, or commit a service account JSON key.
- Prefer storing keys outside project repositories, for example under the user's private agent/config directory.
- Treat `.env`, service account JSON, OAuth tokens, API keys, and CI/CD config as sensitive. Ask before editing them unless the user explicitly requested that exact change.
- For private Sheets, prefer a service account over a public CSV link. Public CSV is acceptable only for non-sensitive data.
- Before reading or writing a live Sheet, say whether the action is read-only or mutating. For mutating actions, explain the exact range/sheet being changed.

## User Setup Workflow

Guide the user through this sequence:

1. Open Google Cloud Console and select or create a project.
2. Enable `Google Sheets API`.
3. Create a service account under `IAM & Admin` -> `Service Accounts`.
4. Skip optional "principals with access" unless someone else must manage the service account.
5. Open the service account -> `Keys` -> `Add key` -> `Create new key` -> `JSON`.
6. Save the JSON key outside the project repository.
7. Open the Google Sheet -> `Share` -> add the service account email as `Viewer` for read-only workflows, or `Editor` when Codex must write/format/rename sheets.
8. Capture the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/<spreadsheet-id>/edit`.
9. Capture the tab name and range, for example `pain-points!A:J`.

Use concrete language: "service account = robot user; JSON key = that robot's local key; sharing the Sheet with the service account = granting the robot access to the file."

## Project Integration Pattern

Use environment variables rather than hardcoding credentials:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\secrets\project-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_RANGE=sheet-name!A:J
```

For a project-specific feature, use feature-specific names when clearer, such as:

```env
PROJECT_GOOGLE_SERVICE_ACCOUNT_KEY_FILE=C:\path\to\secrets\project-service-account.json
PROJECT_GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
PROJECT_GOOGLE_SHEETS_RANGE=pain-points!A:J
```

Document public variable names in `.env.example` and docs. Put real values only in private local config after explicit user permission.

## Sheet Design

When creating a team-operational Sheet, choose columns that support both human entry and automation:

```text
department	role	pain_point	current_blocker	tried_ai_tools	expected_solution	keywords	priority	owner	status
```

Practical conventions:

- Use a stable lowercase English tab name, such as `pain-points`.
- Keep machine-read columns stable after code depends on them.
- Put human-friendly notes in extra columns instead of changing existing column meaning.
- Use comma-separated `keywords` for simple matching.
- Use `status=enabled` and `status=disabled` instead of deleting historical rows.

## Using The Helper Script

Use `scripts/sheets-service-account.js` when a dependency-free Node helper is useful. It authenticates by signing a service-account JWT directly, so no `googleapis` package is required.

Basic commands:

```powershell
node scripts\sheets-service-account.js verify --key-file C:\path\to\key.json --spreadsheet-id <id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js read --key-file C:\path\to\key.json --spreadsheet-id <id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js rename-first-sheet --key-file C:\path\to\key.json --spreadsheet-id <id> --title "pain-points"
node scripts\sheets-service-account.js write-tsv --key-file C:\path\to\key.json --spreadsheet-id <id> --range "pain-points!A1:J6" --tsv C:\path\to\rows.tsv
```

The script prints metadata and row counts, not credential contents.

## Validation Checklist

After setup or edits:

- Verify the Sheet is shared with the service account email.
- Verify the JSON key file exists without printing it.
- Run a read-only `verify` or `read` command against the expected range.
- For writes, re-read the written range and confirm headers/row count.
- Run the project's smallest relevant validation command.
- Update the project's docs when new Sheet variables, ranges, or schemas are introduced.

Common errors:

- `The caller does not have permission`: share the Sheet with the service account or use the correct spreadsheet ID.
- `Unable to parse range`: check tab name, quotes, and range syntax.
- `invalid_grant`: check the key file, service account status, and local clock.
- `Requested entity was not found`: wrong spreadsheet ID, deleted Sheet, or no access.
