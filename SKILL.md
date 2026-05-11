---
name: google-workspace-service-account
description: Set up and operate Google Sheets, Google Docs, and Google Slides through Google Cloud service accounts. Use when Codex needs to guide a user from enabling Workspace APIs, creating a service account and JSON key, sharing files with that account, safely storing credentials, configuring a project, or verifying read/write access to Sheets, Docs, or Slides without exposing secrets.
---

# Google Workspace Service Account

## Safety Rules

- Never ask the user to paste, screenshot, print, or commit a service account JSON key.
- Prefer storing keys outside project repositories, for example under the user's private agent/config directory.
- Treat `.env`, service account JSON, OAuth tokens, API keys, and CI/CD config as sensitive. Ask before editing them unless the user explicitly requested that exact change.
- For private Workspace files, prefer a service account over public sharing links. Public links are acceptable only for non-sensitive files.
- Before reading a live file, say the action is read-only.
- Before writing to a live file, explain the exact file type, file ID placeholder or known target, operation, tab/range/page/text, and expected result.
- Do not put real Google Cloud project IDs, Google Workspace file IDs, private URLs, or local usernames into public docs or commits.

## Supported APIs

- Google Sheets API: spreadsheets, tabs, ranges, and values.
- Google Docs API: documents, body text, insertions, and document creation.
- Google Slides API: presentations, slides, text insertion, and presentation creation.

Use the smallest API scope that fits the task:

```text
Sheets read:  https://www.googleapis.com/auth/spreadsheets.readonly
Sheets write: https://www.googleapis.com/auth/spreadsheets
Docs read:    https://www.googleapis.com/auth/documents.readonly
Docs write:   https://www.googleapis.com/auth/documents
Slides read:  https://www.googleapis.com/auth/presentations.readonly
Slides write: https://www.googleapis.com/auth/presentations
```

## User Setup Workflow

Guide the user through this sequence:

1. Open Google Cloud Console and select or create a project.
2. Enable only the APIs needed for the workflow:
   - `Google Sheets API`
   - `Google Docs API`
   - `Google Slides API`
3. Create a service account under `IAM & Admin` -> `Service Accounts`.
4. Skip optional "principals with access" unless someone else must manage the service account.
5. Open the service account -> `Keys` -> `Add key` -> `Create new key` -> `JSON`.
6. Save the JSON key outside the project repository.
7. Open the target Sheet, Doc, or Slides presentation -> `Share` -> add the service account email as `Viewer` for read-only workflows, or `Editor` when Codex must write.
8. Capture the relevant file ID from the URL:
   - Sheet: `https://docs.google.com/spreadsheets/d/<spreadsheet-id>/edit`
   - Doc: `https://docs.google.com/document/d/<document-id>/edit`
   - Slides: `https://docs.google.com/presentation/d/<presentation-id>/edit`

Use concrete language: "service account = robot user; JSON key = that robot's local key; sharing the file with the service account = granting the robot access to the file."

## Project Integration Pattern

Use environment variables rather than hardcoding credentials:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\secrets\project-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_RANGE=sheet-name!A:J
GOOGLE_DOCS_DOCUMENT_ID=your-document-id
GOOGLE_SLIDES_PRESENTATION_ID=your-presentation-id
```

For a project-specific feature, use feature-specific names when clearer:

```env
PROJECT_GOOGLE_SERVICE_ACCOUNT_KEY_FILE=C:\path\to\secrets\project-service-account.json
PROJECT_GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
PROJECT_GOOGLE_DOCS_DOCUMENT_ID=your-document-id
PROJECT_GOOGLE_SLIDES_PRESENTATION_ID=your-presentation-id
```

Document public variable names in `.env.example` and docs. Put real values only in private local config after explicit user permission.

## File Design Guidance

For Sheets:

- Use stable lowercase English tab names, such as `pain-points`.
- Keep machine-read columns stable after code depends on them.
- Use `status=enabled` and `status=disabled` instead of deleting historical rows.

For Docs:

- Use clear heading levels instead of visual-only formatting.
- Put one concept per paragraph when content will be extracted programmatically.
- Prefer stable section headings when code or prompts depend on document structure.

For Slides:

- Use stable slide layouts and placeholder text when generating decks from templates.
- Prefer replacing explicit placeholder strings over relying on fragile visual positions.
- Keep template presentations separate from generated output when possible.

## Using Helper Scripts

Use the helper scripts when dependency-free Node verification is useful. They authenticate by signing a service-account JWT directly, so no `googleapis` package is required.

Sheets:

```powershell
node scripts\sheets-service-account.js verify --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js read --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --range "Sheet1!A1:J20"
node scripts\sheets-service-account.js rename-first-sheet --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --title "pain-points"
node scripts\sheets-service-account.js write-tsv --key-file C:\path\to\key.json --spreadsheet-id <spreadsheet-id> --range "pain-points!A1:J6" --tsv C:\path\to\rows.tsv
```

Docs:

```powershell
node scripts\docs-service-account.js verify --key-file C:\path\to\key.json --document-id <document-id>
node scripts\docs-service-account.js read-text --key-file C:\path\to\key.json --document-id <document-id>
node scripts\docs-service-account.js create --key-file C:\path\to\key.json --title "Draft doc"
node scripts\docs-service-account.js append-text --key-file C:\path\to\key.json --document-id <document-id> --text "New paragraph"
```

Slides:

```powershell
node scripts\slides-service-account.js verify --key-file C:\path\to\key.json --presentation-id <presentation-id>
node scripts\slides-service-account.js create --key-file C:\path\to\key.json --title "Draft deck"
node scripts\slides-service-account.js create-slide --key-file C:\path\to\key.json --presentation-id <presentation-id>
node scripts\slides-service-account.js replace-text --key-file C:\path\to\key.json --presentation-id <presentation-id> --match "{{title}}" --replace "Quarterly Review"
```

The scripts print metadata, row counts, document text, or update counts, not credential contents.

## Validation Checklist

After setup or edits:

- Verify the target file is shared with the service account email.
- Verify the JSON key file exists without printing it.
- Run a read-only verification command first.
- For writes, re-read or re-open the target and confirm the expected change.
- Run the project's smallest relevant validation command.
- Update project docs when new variables, ranges, document IDs, presentation IDs, schemas, or templates are introduced.

Common errors:

- `The caller does not have permission`: share the file with the service account or use the correct file ID.
- `Requested entity was not found`: wrong file ID, deleted file, or no access.
- `invalid_grant`: check the key file, service account status, and local clock.
- `API has not been used`: enable the relevant Workspace API in the selected Google Cloud project.
