# Google Sheets Setup

A Codex skill for securely setting up and operating Google Sheets through Google Cloud service accounts.

This skill helps Codex guide a user through the full service-account workflow: enabling the Google Sheets API, creating a Google Cloud service account, storing credentials safely, sharing a spreadsheet with the service account, configuring project environment variables, and verifying read or write access.

## What It Does

- Guides Google Cloud setup for the Google Sheets API.
- Explains service accounts in practical language.
- Keeps service account JSON keys out of project repositories.
- Defines safe environment-variable patterns for Sheet access.
- Suggests stable Sheet schemas for automation-friendly workflows.
- Provides a dependency-free Node.js helper script for verification, reading, renaming the first tab, and writing TSV data.

## When To Use This Skill

Use this skill when Codex needs to help with any of the following:

- Connect a private Google Sheet to a local project.
- Read Google Sheets data through a service account.
- Write or format Sheet data after explicit permission.
- Design a Sheet schema for operational data collection.
- Troubleshoot common Sheets API permission or range errors.
- Verify access without exposing service account credentials.

## Safety Principles

This skill is designed around credential safety.

- Never paste, print, screenshot, or commit a service account JSON key.
- Store keys outside project repositories, preferably under a private local config directory.
- Use environment variables instead of hardcoding spreadsheet IDs, ranges, or credential paths.
- Share the target Sheet with the service account email before trying to access it.
- Use Viewer access for read-only workflows and Editor access only when writes are required.
- Before mutating a live Sheet, clearly state the exact spreadsheet, tab, and range that will be changed.

## Recommended Environment Variables

Generic project pattern:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\secrets\project-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_RANGE=sheet-name!A:J
```

Project-specific names are also encouraged when they make the intent clearer:

```env
PROJECT_GOOGLE_SERVICE_ACCOUNT_KEY_FILE=C:\path\to\secrets\project-service-account.json
PROJECT_GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
PROJECT_GOOGLE_SHEETS_RANGE=pain-points!A:J
```

Real values should stay in private local config files. Public examples should use placeholders only.

## Helper Script

The skill includes a Node.js helper script:

```text
scripts/sheets-service-account.js
```

It signs a service-account JWT directly and does not require the `googleapis` package.

Example commands:

```powershell
node scripts\sheets-service-account.js verify --key-file C:\path\to\key.json --spreadsheet-id <id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js read --key-file C:\path\to\key.json --spreadsheet-id <id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js rename-first-sheet --key-file C:\path\to\key.json --spreadsheet-id <id> --title "pain-points"
node scripts\sheets-service-account.js write-tsv --key-file C:\path\to\key.json --spreadsheet-id <id> --range "pain-points!A1:J6" --tsv C:\path\to\rows.tsv
```

The script prints metadata and row counts, not credential contents.

## Suggested Sheet Schema

For team operational data collection, the skill recommends stable, automation-friendly columns such as:

```text
department	role	pain_point	current_blocker	tried_ai_tools	expected_solution	keywords	priority	owner	status
```

Recommended conventions:

- Use a stable lowercase English tab name, such as `pain-points`.
- Avoid changing column meanings after code depends on them.
- Add human notes in extra columns instead of repurposing machine-read fields.
- Use `status=enabled` and `status=disabled` instead of deleting historical rows.

## Common Errors

- `The caller does not have permission`: share the Sheet with the service account or check the spreadsheet ID.
- `Unable to parse range`: check the tab name, quotes, and range syntax.
- `invalid_grant`: check the key file, service account status, and local clock.
- `Requested entity was not found`: check whether the spreadsheet ID is wrong, deleted, or inaccessible.

## Files

```text
SKILL.md
agents/openai.yaml
scripts/sheets-service-account.js
README.md
.gitignore
AGENTS.md
```

## License

Add a license file before publishing this skill publicly if you want others to reuse it under explicit terms.
